package api

import (
	"net/http"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type WorkloadItem struct {
	Name              string    `json:"name"`
	Namespace         string    `json:"namespace"`
	DesiredReplicas   int32     `json:"desiredReplicas"`
	ReadyReplicas     int32     `json:"readyReplicas"`
	UpdatedReplicas   int32     `json:"updatedReplicas"`
	AvailableReplicas int32     `json:"availableReplicas"`
	CreatedAt         time.Time `json:"createdAt"`
}

type WorkloadsResponse struct {
	Deployments  []WorkloadItem `json:"deployments"`
	StatefulSets []WorkloadItem `json:"statefulSets"`
	DaemonSets   []WorkloadItem `json:"daemonSets"`
}

func WorkloadsHandler(client kubernetes.Interface) http.HandlerFunc {
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

		deployments, err := client.AppsV1().Deployments(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		statefulSets, err := client.AppsV1().StatefulSets(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		daemonSets, err := client.AppsV1().DaemonSets(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := WorkloadsResponse{
			Deployments:  mapWorkloadsDeployments(deployments.Items),
			StatefulSets: mapWorkloadsStateful(statefulSets.Items),
			DaemonSets:   mapWorkloadsDaemon(daemonSets.Items),
		}

		respondJSON(w, http.StatusOK, response)
	}
}

func mapWorkloadsDeployments(items []appsv1.Deployment) []WorkloadItem {
	result := make([]WorkloadItem, 0, len(items))
	for _, item := range items {
		desired := int32(0)
		if item.Spec.Replicas != nil {
			desired = *item.Spec.Replicas
		}
		result = append(result, WorkloadItem{
			Name:              item.Name,
			Namespace:         item.Namespace,
			DesiredReplicas:   desired,
			ReadyReplicas:     item.Status.ReadyReplicas,
			UpdatedReplicas:   item.Status.UpdatedReplicas,
			AvailableReplicas: item.Status.AvailableReplicas,
			CreatedAt:         item.CreationTimestamp.Time,
		})
	}
	return result
}

func mapWorkloadsStateful(items []appsv1.StatefulSet) []WorkloadItem {
	result := make([]WorkloadItem, 0, len(items))
	for _, item := range items {
		desired := int32(0)
		if item.Spec.Replicas != nil {
			desired = *item.Spec.Replicas
		}
		result = append(result, WorkloadItem{
			Name:              item.Name,
			Namespace:         item.Namespace,
			DesiredReplicas:   desired,
			ReadyReplicas:     item.Status.ReadyReplicas,
			UpdatedReplicas:   item.Status.UpdatedReplicas,
			AvailableReplicas: item.Status.AvailableReplicas,
			CreatedAt:         item.CreationTimestamp.Time,
		})
	}
	return result
}

func mapWorkloadsDaemon(items []appsv1.DaemonSet) []WorkloadItem {
	result := make([]WorkloadItem, 0, len(items))
	for _, item := range items {
		result = append(result, WorkloadItem{
			Name:              item.Name,
			Namespace:         item.Namespace,
			DesiredReplicas:   item.Status.DesiredNumberScheduled,
			ReadyReplicas:     item.Status.NumberReady,
			UpdatedReplicas:   item.Status.UpdatedNumberScheduled,
			AvailableReplicas: item.Status.NumberAvailable,
			CreatedAt:         item.CreationTimestamp.Time,
		})
	}
	return result
}
