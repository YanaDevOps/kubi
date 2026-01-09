package api

import (
	"fmt"
	"net/http"
	"time"

	discoveryv1 "k8s.io/api/discovery/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type EndpointSliceItem struct {
	Name       string    `json:"name"`
	Namespace  string    `json:"namespace"`
	Addresses  int       `json:"addresses"`
	ReadyCount int       `json:"readyCount"`
	Ports      []string  `json:"ports"`
	CreatedAt  time.Time `json:"createdAt"`
}

type EndpointSliceList struct {
	Items    []EndpointSliceItem `json:"items"`
	Continue string              `json:"continue"`
}

func EndpointSlicesHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.DiscoveryV1().EndpointSlices(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]EndpointSliceItem, 0, len(list.Items))
		for _, slice := range list.Items {
			items = append(items, mapEndpointSlice(slice))
		}

		respondJSON(w, http.StatusOK, EndpointSliceList{Items: items, Continue: list.Continue})
	}
}

func mapEndpointSlice(slice discoveryv1.EndpointSlice) EndpointSliceItem {
	addressCount := 0
	readyCount := 0
	for _, endpoint := range slice.Endpoints {
		addressCount += len(endpoint.Addresses)
		if endpoint.Conditions.Ready != nil && *endpoint.Conditions.Ready {
			readyCount += len(endpoint.Addresses)
		}
	}

	ports := []string{}
	for _, port := range slice.Ports {
		if port.Port != nil {
			protocol := "TCP"
			if port.Protocol != nil {
				protocol = string(*port.Protocol)
			}
			ports = append(ports, fmt.Sprintf("%d/%s", *port.Port, protocol))
		}
	}

	return EndpointSliceItem{
		Name:       slice.Name,
		Namespace:  slice.Namespace,
		Addresses:  addressCount,
		ReadyCount: readyCount,
		Ports:      ports,
		CreatedAt:  slice.CreationTimestamp.Time,
	}
}
