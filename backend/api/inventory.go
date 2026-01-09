package api

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"

	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apiextclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type CRDItem struct {
	Name     string `json:"name"`
	Resource string `json:"resource"`
	Group    string `json:"group"`
	Version  string `json:"version"`
	Kind     string `json:"kind"`
	Scope    string `json:"scope"`
}

type CRDObjectItem struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type CRDObjectsResponse struct {
	CRD     CRDItem         `json:"crd"`
	Objects []CRDObjectItem `json:"objects"`
}

type ComponentDetection struct {
	Name     string   `json:"name"`
	Status   string   `json:"status"`
	Evidence []string `json:"evidence"`
}

type InventoryResponse struct {
	CRDs       []CRDItem            `json:"crds"`
	Components []ComponentDetection `json:"components"`
}

func InventoryHandler(client kubernetes.Interface, extClient apiextclient.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		crds, err := extClient.ApiextensionsV1().CustomResourceDefinitions().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		components, err := detectComponents(ctx, client)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := InventoryResponse{
			CRDs:       mapCRDs(crds.Items),
			Components: components,
		}

		respondJSON(w, http.StatusOK, response)
	}
}

func CRDObjectsHandler(restCfg *rest.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		group := r.URL.Query().Get("group")
		version := r.URL.Query().Get("version")
		resourceName := r.URL.Query().Get("resource")
		kind := r.URL.Query().Get("kind")
		if group == "" || version == "" || resourceName == "" {
			respondError(w, http.StatusBadRequest, "group, version, resource are required")
			return
		}

		namespace := r.URL.Query().Get("ns")
		if namespace == "" {
			namespace = v1.NamespaceAll
		}

		dynamicClient, err := dynamic.NewForConfig(restCfg)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		gvr := schema.GroupVersionResource{Group: group, Version: version, Resource: resourceName}
		resource := dynamicClient.Resource(gvr)
		var list *unstructured.UnstructuredList
		if namespace == v1.NamespaceAll {
			list, err = resource.List(ctx, v1.ListOptions{})
		} else {
			list, err = resource.Namespace(namespace).List(ctx, v1.ListOptions{})
		}
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]CRDObjectItem, 0, len(list.Items))
		for _, item := range list.Items {
			items = append(items, CRDObjectItem{
				Name:      item.GetName(),
				Namespace: item.GetNamespace(),
			})
		}

		response := CRDObjectsResponse{
			CRD: CRDItem{
				Name:     resourceName,
				Resource: resourceName,
				Group:    group,
				Version:  version,
				Kind:     kind,
				Scope:    "",
			},
			Objects: items,
		}

		respondJSON(w, http.StatusOK, response)
	}
}

func mapCRDs(items []apiextv1.CustomResourceDefinition) []CRDItem {
	out := make([]CRDItem, 0, len(items))
	for _, crd := range items {
		version := ""
		for _, v := range crd.Spec.Versions {
			if v.Served {
				version = v.Name
				break
			}
		}
		if version == "" && len(crd.Spec.Versions) > 0 {
			version = crd.Spec.Versions[0].Name
		}
		out = append(out, CRDItem{
			Name:     crd.Name,
			Resource: crd.Spec.Names.Plural,
			Group:    crd.Spec.Group,
			Version:  version,
			Kind:     crd.Spec.Names.Kind,
			Scope:    string(crd.Spec.Scope),
		})
	}
	return out
}

type componentSpec struct {
	name    string
	matches []componentMatch
}

type componentMatch struct {
	kind      string
	namespace string
	labels    map[string]string
}

func detectComponents(ctx context.Context, client kubernetes.Interface) ([]ComponentDetection, error) {
	components := []componentSpec{
		{
			name: "ingress-nginx",
			matches: []componentMatch{{
				kind:      "Deployment",
				namespace: "ingress-nginx",
				labels:    map[string]string{"app.kubernetes.io/name": "ingress-nginx"},
			}},
		},
		{
			name: "traefik",
			matches: []componentMatch{{
				kind:      "Deployment",
				namespace: "traefik",
				labels:    map[string]string{"app.kubernetes.io/name": "traefik"},
			}},
		},
		{
			name: "cilium",
			matches: []componentMatch{{
				kind:      "DaemonSet",
				namespace: "kube-system",
				labels:    map[string]string{"k8s-app": "cilium"},
			}},
		},
		{
			name: "calico",
			matches: []componentMatch{{
				kind:      "DaemonSet",
				namespace: "kube-system",
				labels:    map[string]string{"k8s-app": "calico-node"},
			}},
		},
		{
			name: "kube-proxy",
			matches: []componentMatch{{
				kind:      "DaemonSet",
				namespace: "kube-system",
				labels:    map[string]string{"k8s-app": "kube-proxy"},
			}},
		},
		{
			name: "metrics-server",
			matches: []componentMatch{{
				kind:      "Deployment",
				namespace: "kube-system",
				labels:    map[string]string{"k8s-app": "metrics-server"},
			}},
		},
		{
			name: "cert-manager",
			matches: []componentMatch{{
				kind:      "Deployment",
				namespace: "cert-manager",
				labels:    map[string]string{"app.kubernetes.io/name": "cert-manager"},
			}},
		},
		{
			name: "external-dns",
			matches: []componentMatch{{
				kind:      "Deployment",
				namespace: "external-dns",
				labels:    map[string]string{"app.kubernetes.io/name": "external-dns"},
			}},
		},
	}

	detections := []ComponentDetection{}
	for _, component := range components {
		evidence := []string{}
		for _, match := range component.matches {
			found := queryMatch(ctx, client, match)
			if found != "" {
				evidence = append(evidence, found)
			}
		}

		status := "not_detected"
		if len(evidence) > 0 {
			status = "detected"
		}

		detections = append(detections, ComponentDetection{
			Name:     component.name,
			Status:   status,
			Evidence: evidence,
		})
	}

	sort.Slice(detections, func(i, j int) bool {
		return detections[i].Name < detections[j].Name
	})

	return detections, nil
}

func queryMatch(ctx context.Context, client kubernetes.Interface, match componentMatch) string {
	switch match.kind {
	case "Deployment":
		items, err := client.AppsV1().Deployments(match.namespace).List(ctx, v1.ListOptions{LabelSelector: selectorString(match.labels)})
		if err == nil && len(items.Items) > 0 {
			return fmt.Sprintf("Deployment %s/%s", match.namespace, items.Items[0].Name)
		}
	case "DaemonSet":
		items, err := client.AppsV1().DaemonSets(match.namespace).List(ctx, v1.ListOptions{LabelSelector: selectorString(match.labels)})
		if err == nil && len(items.Items) > 0 {
			return fmt.Sprintf("DaemonSet %s/%s", match.namespace, items.Items[0].Name)
		}
	}
	return ""
}

func selectorString(labels map[string]string) string {
	pairs := []string{}
	for key, value := range labels {
		pairs = append(pairs, key+"="+value)
	}
	sort.Strings(pairs)
	return strings.Join(pairs, ",")
}
