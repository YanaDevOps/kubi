package api

import (
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type PodItem struct {
	Name      string    `json:"name"`
	Namespace string    `json:"namespace"`
	Phase     string    `json:"phase"`
	Ready     bool      `json:"ready"`
	Restarts  int32     `json:"restarts"`
	Node      string    `json:"node"`
	PodIP     string    `json:"podIp"`
	Images    []string  `json:"images"`
	CreatedAt time.Time `json:"createdAt"`
}

type PodList struct {
	Items    []PodItem `json:"items"`
	Continue string    `json:"continue"`
}

func PodsHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.CoreV1().Pods(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]PodItem, 0, len(list.Items))
		for _, pod := range list.Items {
			items = append(items, PodItem{
				Name:      pod.Name,
				Namespace: pod.Namespace,
				Phase:     string(pod.Status.Phase),
				Ready:     podReady(pod.Status.Conditions),
				Restarts:  podRestarts(pod.Status.ContainerStatuses),
				Node:      pod.Spec.NodeName,
				PodIP:     pod.Status.PodIP,
				Images:    podImages(pod.Spec.Containers),
				CreatedAt: pod.CreationTimestamp.Time,
			})
		}

		respondJSON(w, http.StatusOK, PodList{Items: items, Continue: list.Continue})
	}
}

func podReady(conditions []corev1.PodCondition) bool {
	for _, condition := range conditions {
		if condition.Type == corev1.PodReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

func podRestarts(statuses []corev1.ContainerStatus) int32 {
	var total int32
	for _, status := range statuses {
		total += status.RestartCount
	}
	return total
}

func podImages(containers []corev1.Container) []string {
	images := make([]string, 0, len(containers))
	for _, container := range containers {
		if container.Image != "" {
			images = append(images, container.Image)
		}
	}
	return images
}
