package api

import (
	"net/http"
	"sort"
	"strconv"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type TopologyNode struct {
	ID        string            `json:"id"`
	Kind      string            `json:"kind"`
	Name      string            `json:"name"`
	Namespace string            `json:"namespace,omitempty"`
	Status    string            `json:"status,omitempty"`
	Labels    map[string]string `json:"labels,omitempty"`
}

type TopologyEdge struct {
	ID   string `json:"id"`
	From string `json:"from"`
	To   string `json:"to"`
	Kind string `json:"kind"`
}

type TopologyResponse struct {
	Nodes []TopologyNode `json:"nodes"`
	Edges []TopologyEdge `json:"edges"`
}

func TopologyHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		namespace := r.URL.Query().Get("ns")
		if namespace == "" {
			namespace = v1.NamespaceAll
		}

		nodes, err := client.CoreV1().Nodes().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pods, err := client.CoreV1().Pods(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		services, err := client.CoreV1().Services(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		ingresses, err := client.NetworkingV1().Ingresses(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		slices, err := client.DiscoveryV1().EndpointSlices(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := buildTopology(nodes.Items, pods.Items, services.Items, ingresses.Items, slices.Items)
		respondJSON(w, http.StatusOK, response)
	}
}

func buildTopology(
	nodes []corev1.Node,
	pods []corev1.Pod,
	services []corev1.Service,
	ingresses []networkingv1.Ingress,
	slices []discoveryv1.EndpointSlice,
) TopologyResponse {
	result := TopologyResponse{}

	podByIP := map[string]string{}
	for _, pod := range pods {
		id := podID(pod.Namespace, pod.Name)
		result.Nodes = append(result.Nodes, TopologyNode{
			ID:        id,
			Kind:      "Pod",
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Status:    string(pod.Status.Phase),
			Labels:    pod.Labels,
		})
		if pod.Status.PodIP != "" {
			podByIP[pod.Status.PodIP] = id
		}
	}

	for _, node := range nodes {
		result.Nodes = append(result.Nodes, TopologyNode{
			ID:     nodeID(node.Name),
			Kind:   "Node",
			Name:   node.Name,
			Status: nodeReadyStatus(node.Status.Conditions),
			Labels: node.Labels,
		})
	}

	serviceIDs := map[string]string{}
	for _, svc := range services {
		id := serviceID(svc.Namespace, svc.Name)
		serviceIDs[svc.Namespace+"/"+svc.Name] = id
		result.Nodes = append(result.Nodes, TopologyNode{
			ID:        id,
			Kind:      "Service",
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Status:    string(svc.Spec.Type),
			Labels:    svc.Labels,
		})
	}

	sliceIDs := map[string]string{}
	for _, slice := range slices {
		id := endpointSliceID(slice.Namespace, slice.Name)
		sliceIDs[slice.Namespace+"/"+slice.Name] = id
		result.Nodes = append(result.Nodes, TopologyNode{
			ID:        id,
			Kind:      "EndpointSlice",
			Name:      slice.Name,
			Namespace: slice.Namespace,
			Status:    endpointSliceStatus(slice),
			Labels:    slice.Labels,
		})
	}

	ingressIDs := map[string]string{}
	for _, ingress := range ingresses {
		id := ingressID(ingress.Namespace, ingress.Name)
		ingressIDs[ingress.Namespace+"/"+ingress.Name] = id
		result.Nodes = append(result.Nodes, TopologyNode{
			ID:        id,
			Kind:      "Ingress",
			Name:      ingress.Name,
			Namespace: ingress.Namespace,
			Status:    ingressClassName(ingress),
			Labels:    ingress.Labels,
		})
	}

	for _, slice := range slices {
		svcName := slice.Labels[discoveryv1.LabelServiceName]
		if svcName == "" {
			continue
		}
		serviceKey := slice.Namespace + "/" + svcName
		svcID, ok := serviceIDs[serviceKey]
		if !ok {
			continue
		}
		sliceID := sliceIDs[slice.Namespace+"/"+slice.Name]
		result.Edges = append(result.Edges, TopologyEdge{
			ID:   svcID + "->" + sliceID,
			From: svcID,
			To:   sliceID,
			Kind: "ServiceToEndpointSlice",
		})

		for _, endpoint := range slice.Endpoints {
			for _, address := range endpoint.Addresses {
				if podID, ok := podByIP[address]; ok {
					result.Edges = append(result.Edges, TopologyEdge{
						ID:   sliceID + "->" + podID,
						From: sliceID,
						To:   podID,
						Kind: "EndpointSliceToPod",
					})
				}
			}
		}
	}

	for _, ingress := range ingresses {
		ingressID := ingressIDs[ingress.Namespace+"/"+ingress.Name]
		for _, backend := range ingressBackends(ingress) {
			serviceKey := ingress.Namespace + "/" + backend.ServiceName
			if svcID, ok := serviceIDs[serviceKey]; ok {
				result.Edges = append(result.Edges, TopologyEdge{
					ID:   ingressID + "->" + svcID + ":" + backend.ServiceName,
					From: ingressID,
					To:   svcID,
					Kind: "IngressToService",
				})
			}
		}
	}

	sort.Slice(result.Nodes, func(i, j int) bool {
		if result.Nodes[i].Kind == result.Nodes[j].Kind {
			return result.Nodes[i].Name < result.Nodes[j].Name
		}
		return result.Nodes[i].Kind < result.Nodes[j].Kind
	})

	return result
}

func nodeID(name string) string {
	return "node:" + name
}

func podID(namespace, name string) string {
	return "pod:" + namespace + "/" + name
}

func serviceID(namespace, name string) string {
	return "service:" + namespace + "/" + name
}

func endpointSliceID(namespace, name string) string {
	return "endpointslice:" + namespace + "/" + name
}

func ingressID(namespace, name string) string {
	return "ingress:" + namespace + "/" + name
}

func nodeReadyStatus(conditions []corev1.NodeCondition) string {
	for _, condition := range conditions {
		if condition.Type == corev1.NodeReady {
			if condition.Status == corev1.ConditionTrue {
				return "Ready"
			}
			return "NotReady"
		}
	}
	return "Unknown"
}

func endpointSliceStatus(slice discoveryv1.EndpointSlice) string {
	ready := 0
	addresses := 0
	for _, endpoint := range slice.Endpoints {
		addresses += len(endpoint.Addresses)
		if endpoint.Conditions.Ready != nil && *endpoint.Conditions.Ready {
			ready += len(endpoint.Addresses)
		}
	}
	return "Ready " + strconv.Itoa(ready) + "/" + strconv.Itoa(addresses)
}

func ingressClassName(ingress networkingv1.Ingress) string {
	if ingress.Spec.IngressClassName != nil {
		return *ingress.Spec.IngressClassName
	}
	return ""
}

type ingressBackend struct {
	ServiceName string
}

func ingressBackends(ingress networkingv1.Ingress) []ingressBackend {
	backends := []ingressBackend{}
	if ingress.Spec.DefaultBackend != nil && ingress.Spec.DefaultBackend.Service != nil {
		backends = append(backends, ingressBackend{ServiceName: ingress.Spec.DefaultBackend.Service.Name})
	}
	for _, rule := range ingress.Spec.Rules {
		if rule.HTTP == nil {
			continue
		}
		for _, path := range rule.HTTP.Paths {
			if path.Backend.Service != nil {
				backends = append(backends, ingressBackend{ServiceName: path.Backend.Service.Name})
			}
		}
	}
	return backends
}
