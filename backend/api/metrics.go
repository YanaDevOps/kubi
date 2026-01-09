package api

import (
	"net/http"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

type MetricSample struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	CPU       string `json:"cpu"`
	Memory    string `json:"memory"`
}

type MetricsResponse struct {
	Available bool           `json:"available"`
	Message   string         `json:"message"`
	Nodes     []MetricSample `json:"nodes"`
	Pods      []MetricSample `json:"pods"`
}

func MetricsHandler(restCfg *rest.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		namespace := r.URL.Query().Get("ns")
		if namespace == "" {
			namespace = v1.NamespaceAll
		}

		dyn, err := dynamic.NewForConfig(restCfg)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		result := MetricsResponse{Available: true}
		nodes, nodeErr := dyn.Resource(schema.GroupVersionResource{Group: "metrics.k8s.io", Version: "v1beta1", Resource: "nodes"}).List(ctx, v1.ListOptions{})
		if nodeErr != nil {
			result.Available = false
			result.Message = "Metrics API not available"
			respondJSON(w, http.StatusOK, result)
			return
		}
		result.Nodes = mapMetricList(nodes.Items)

		podsResource := dyn.Resource(schema.GroupVersionResource{Group: "metrics.k8s.io", Version: "v1beta1", Resource: "pods"})
		var pods *unstructured.UnstructuredList
		if namespace == v1.NamespaceAll {
			pods, err = podsResource.List(ctx, v1.ListOptions{})
		} else {
			pods, err = podsResource.Namespace(namespace).List(ctx, v1.ListOptions{})
		}
		if err != nil {
			result.Available = false
			result.Message = "Metrics API not available"
			respondJSON(w, http.StatusOK, result)
			return
		}

		result.Pods = mapMetricList(pods.Items)
		respondJSON(w, http.StatusOK, result)
	}
}

func mapMetricList(items []unstructured.Unstructured) []MetricSample {
	result := []MetricSample{}
	for _, item := range items {
		sample := MetricSample{Name: item.GetName(), Namespace: item.GetNamespace()}
		if usage, ok := findUsage(item.Object); ok {
			sample.CPU = usage["cpu"]
			sample.Memory = usage["memory"]
		}
		result = append(result, sample)
	}
	return result
}

func findUsage(obj map[string]any) (map[string]string, bool) {
	status, ok := obj["usage"].(map[string]any)
	if ok {
		return toStringMap(status), true
	}
	containers, ok := obj["containers"].([]any)
	if !ok {
		return nil, false
	}
	usage := map[string]string{}
	for _, container := range containers {
		containerMap, ok := container.(map[string]any)
		if !ok {
			continue
		}
		containerUsage, ok := containerMap["usage"].(map[string]any)
		if !ok {
			continue
		}
		for key, value := range toStringMap(containerUsage) {
			usage[key] = value
		}
	}
	if len(usage) == 0 {
		return nil, false
	}
	return usage, true
}

func toStringMap(input map[string]any) map[string]string {
	out := map[string]string{}
	for key, value := range input {
		if str, ok := value.(string); ok {
			out[key] = str
		}
	}
	return out
}
