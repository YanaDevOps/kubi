package api

import (
	"net/http"
	"sort"
	"strconv"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"
)

type ServicePortMapping struct {
	Namespace    string   `json:"namespace"`
	Service      string   `json:"service"`
	Type         string   `json:"type"`
	Port         int32    `json:"port"`
	TargetPort   string   `json:"targetPort"`
	Protocol     string   `json:"protocol"`
	NodePort     int32    `json:"nodePort"`
	ExternalIPs  []string `json:"externalIps"`
	PodEndpoints []string `json:"podEndpoints"`
}

type ContainerPortMapping struct {
	Namespace string `json:"namespace"`
	Pod       string `json:"pod"`
	Container string `json:"container"`
	Port      int32  `json:"port"`
	Protocol  string `json:"protocol"`
	HostPort  int32  `json:"hostPort"`
}

type IngressPortMapping struct {
	Namespace string `json:"namespace"`
	Ingress   string `json:"ingress"`
	Host      string `json:"host"`
	Path      string `json:"path"`
	Service   string `json:"service"`
	Port      string `json:"port"`
}

type PortsResponse struct {
	Services   []ServicePortMapping   `json:"services"`
	Containers []ContainerPortMapping `json:"containers"`
	Ingresses  []IngressPortMapping   `json:"ingresses"`
}

func PortsHandler(client kubernetes.Interface) http.HandlerFunc {
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

		slices, err := client.DiscoveryV1().EndpointSlices(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		ingresses, err := client.NetworkingV1().Ingresses(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := buildPorts(pods.Items, services.Items, slices.Items, ingresses.Items)
		respondJSON(w, http.StatusOK, response)
	}
}

func buildPorts(
	pods []corev1.Pod,
	services []corev1.Service,
	slices []discoveryv1.EndpointSlice,
	ingresses []networkingv1.Ingress,
) PortsResponse {
	containerPorts := []ContainerPortMapping{}
	for _, pod := range pods {
		for _, container := range pod.Spec.Containers {
			for _, port := range container.Ports {
				containerPorts = append(containerPorts, ContainerPortMapping{
					Namespace: pod.Namespace,
					Pod:       pod.Name,
					Container: container.Name,
					Port:      port.ContainerPort,
					Protocol:  string(port.Protocol),
					HostPort:  port.HostPort,
				})
			}
		}
	}

	serviceSlices := map[string][]discoveryv1.EndpointSlice{}
	for _, slice := range slices {
		serviceName := slice.Labels[discoveryv1.LabelServiceName]
		if serviceName == "" {
			continue
		}
		key := slice.Namespace + "/" + serviceName
		serviceSlices[key] = append(serviceSlices[key], slice)
	}

	servicePorts := []ServicePortMapping{}
	for _, svc := range services {
		key := svc.Namespace + "/" + svc.Name
		relatedSlices := serviceSlices[key]
		external := serviceExternalIPs(&svc)

		for _, port := range svc.Spec.Ports {
			servicePorts = append(servicePorts, ServicePortMapping{
				Namespace:    svc.Namespace,
				Service:      svc.Name,
				Type:         string(svc.Spec.Type),
				Port:         port.Port,
				TargetPort:   targetPortString(port.TargetPort),
				Protocol:     string(port.Protocol),
				NodePort:     port.NodePort,
				ExternalIPs:  external,
				PodEndpoints: serviceEndpointsForPort(port, relatedSlices),
			})
		}
	}

	ingressPorts := []IngressPortMapping{}
	for _, ingress := range ingresses {
		if ingress.Spec.DefaultBackend != nil && ingress.Spec.DefaultBackend.Service != nil {
			backend := ingress.Spec.DefaultBackend.Service
			ingressPorts = append(ingressPorts, IngressPortMapping{
				Namespace: ingress.Namespace,
				Ingress:   ingress.Name,
				Host:      "*",
				Path:      "*",
				Service:   backend.Name,
				Port:      backendPortString(backend.Port),
			})
		}

		for _, rule := range ingress.Spec.Rules {
			if rule.HTTP == nil {
				continue
			}
			for _, path := range rule.HTTP.Paths {
				if path.Backend.Service == nil {
					continue
				}
				ingressPorts = append(ingressPorts, IngressPortMapping{
					Namespace: ingress.Namespace,
					Ingress:   ingress.Name,
					Host:      rule.Host,
					Path:      path.Path,
					Service:   path.Backend.Service.Name,
					Port:      backendPortString(path.Backend.Service.Port),
				})
			}
		}
	}

	sort.Slice(servicePorts, func(i, j int) bool {
		if servicePorts[i].Namespace == servicePorts[j].Namespace {
			return servicePorts[i].Service < servicePorts[j].Service
		}
		return servicePorts[i].Namespace < servicePorts[j].Namespace
	})
	return PortsResponse{Services: servicePorts, Containers: containerPorts, Ingresses: ingressPorts}
}

func serviceEndpointsForPort(port corev1.ServicePort, slices []discoveryv1.EndpointSlice) []string {
	endpoints := []string{}
	for _, slice := range slices {
		for _, slicePort := range slice.Ports {
			if slicePort.Port == nil {
				continue
			}
			if !servicePortMatches(port, slicePort) {
				continue
			}
			protocol := "TCP"
			if slicePort.Protocol != nil {
				protocol = string(*slicePort.Protocol)
			}
			for _, endpoint := range slice.Endpoints {
				for _, address := range endpoint.Addresses {
					endpoints = append(endpoints, address+":"+itoa(int(*slicePort.Port))+"/"+protocol)
				}
			}
		}
	}
	return endpoints
}

func servicePortMatches(port corev1.ServicePort, slicePort discoveryv1.EndpointPort) bool {
	if port.Name != "" && slicePort.Name != nil {
		return port.Name == *slicePort.Name
	}
	if port.TargetPort.Type == intstr.Int && slicePort.Port != nil {
		return port.TargetPort.IntVal == *slicePort.Port
	}
	return port.Port != 0 && slicePort.Port != nil && port.Port == *slicePort.Port
}

func targetPortString(target intstr.IntOrString) string {
	if target.Type == intstr.Int {
		return itoa(int(target.IntVal))
	}
	return target.String()
}

func backendPortString(port networkingv1.ServiceBackendPort) string {
	if port.Number > 0 {
		return strconv.Itoa(int(port.Number))
	}
	return port.Name
}

func itoa(value int) string {
	return strconv.Itoa(value)
}
