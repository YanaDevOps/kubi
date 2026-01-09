package api

import (
	"net/http"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

type NodeItem struct {
	Name           string    `json:"name"`
	Ready          bool      `json:"ready"`
	Roles          []string  `json:"roles"`
	KubeletVersion string    `json:"kubeletVersion"`
	CreatedAt      time.Time `json:"createdAt"`
}

type NodeList struct {
	Items    []NodeItem `json:"items"`
	Continue string     `json:"continue"`
}

func NodesHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		list, err := client.CoreV1().Nodes().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]NodeItem, 0, len(list.Items))
		for _, node := range list.Items {
			items = append(items, NodeItem{
				Name:           node.Name,
				Ready:          nodeReady(node.Status.Conditions),
				Roles:          nodeRoles(node.Labels),
				KubeletVersion: node.Status.NodeInfo.KubeletVersion,
				CreatedAt:      node.CreationTimestamp.Time,
			})
		}

		respondJSON(w, http.StatusOK, NodeList{Items: items, Continue: list.Continue})
	}
}

func nodeReady(conditions []corev1.NodeCondition) bool {
	for _, condition := range conditions {
		if condition.Type == corev1.NodeReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

func nodeRoles(labels map[string]string) []string {
	roles := []string{}
	for key := range labels {
		if strings.HasPrefix(key, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(key, "node-role.kubernetes.io/")
			if role == "" {
				role = "control-plane"
			}
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}
	return roles
}
