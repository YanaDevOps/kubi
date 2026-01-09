package api

import (
	"context"
	"net/http"
	"time"

	"k8s.io/client-go/kubernetes"
)

type NamespaceItem struct {
	Name      string            `json:"name"`
	Status    string            `json:"status"`
	CreatedAt time.Time         `json:"createdAt"`
	Labels    map[string]string `json:"labels"`
}

type NamespaceList struct {
	Items    []NamespaceItem `json:"items"`
	Continue string          `json:"continue"`
}

func NamespacesHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		list, err := client.CoreV1().Namespaces().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]NamespaceItem, 0, len(list.Items))
		for _, ns := range list.Items {
			items = append(items, NamespaceItem{
				Name:      ns.Name,
				Status:    string(ns.Status.Phase),
				CreatedAt: ns.CreationTimestamp.Time,
				Labels:    ns.Labels,
			})
		}

		respondJSON(w, http.StatusOK, NamespaceList{Items: items, Continue: list.Continue})
	}
}

func contextWithTimeout(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(r.Context(), 10*time.Second)
}
