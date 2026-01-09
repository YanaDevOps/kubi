package api

import (
	"net/http"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type ServiceIntent struct {
	Namespace string   `json:"namespace"`
	Service   string   `json:"service"`
	Selector  string   `json:"selector"`
	Pods      []string `json:"pods"`
}

type IngressIntent struct {
	Namespace string `json:"namespace"`
	Ingress   string `json:"ingress"`
	Host      string `json:"host"`
	Path      string `json:"path"`
	Service   string `json:"service"`
	Port      string `json:"port"`
}

type NetworkPolicySummary struct {
	Namespace    string   `json:"namespace"`
	Name         string   `json:"name"`
	Types        []string `json:"types"`
	PodSelector  string   `json:"podSelector"`
	IngressRules int      `json:"ingressRules"`
	EgressRules  int      `json:"egressRules"`
}

type TrafficResponse struct {
	ServiceIntents  []ServiceIntent        `json:"serviceIntents"`
	IngressIntents  []IngressIntent        `json:"ingressIntents"`
	NetworkPolicies []NetworkPolicySummary `json:"networkPolicies"`
}

func TrafficHandler(client kubernetes.Interface) http.HandlerFunc {
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

		services, err := client.CoreV1().Services(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pods, err := client.CoreV1().Pods(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		ingresses, err := client.NetworkingV1().Ingresses(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		policies, err := client.NetworkingV1().NetworkPolicies(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := TrafficResponse{
			ServiceIntents:  mapServiceIntents(services.Items, pods.Items),
			IngressIntents:  mapIngressIntents(ingresses.Items),
			NetworkPolicies: mapNetworkPolicies(policies.Items),
		}

		respondJSON(w, http.StatusOK, response)
	}
}

func mapServiceIntents(services []corev1.Service, pods []corev1.Pod) []ServiceIntent {
	items := []ServiceIntent{}
	for _, svc := range services {
		selector := selectorString(svc.Spec.Selector)
		if selector == "" {
			items = append(items, ServiceIntent{
				Namespace: svc.Namespace,
				Service:   svc.Name,
				Selector:  "(none)",
				Pods:      []string{},
			})
			continue
		}
		matches := []string{}
		for _, pod := range pods {
			if pod.Namespace != svc.Namespace {
				continue
			}
			if selectorMatches(svc.Spec.Selector, pod.Labels) {
				matches = append(matches, pod.Name)
			}
		}
		items = append(items, ServiceIntent{
			Namespace: svc.Namespace,
			Service:   svc.Name,
			Selector:  selector,
			Pods:      matches,
		})
	}
	return items
}

func mapIngressIntents(ingresses []networkingv1.Ingress) []IngressIntent {
	items := []IngressIntent{}
	for _, ing := range ingresses {
		if ing.Spec.DefaultBackend != nil && ing.Spec.DefaultBackend.Service != nil {
			backend := ing.Spec.DefaultBackend.Service
			items = append(items, IngressIntent{
				Namespace: ing.Namespace,
				Ingress:   ing.Name,
				Host:      "*",
				Path:      "*",
				Service:   backend.Name,
				Port:      backendPortString(backend.Port),
			})
		}
		for _, rule := range ing.Spec.Rules {
			if rule.HTTP == nil {
				continue
			}
			for _, path := range rule.HTTP.Paths {
				if path.Backend.Service == nil {
					continue
				}
				items = append(items, IngressIntent{
					Namespace: ing.Namespace,
					Ingress:   ing.Name,
					Host:      rule.Host,
					Path:      path.Path,
					Service:   path.Backend.Service.Name,
					Port:      backendPortString(path.Backend.Service.Port),
				})
			}
		}
	}
	return items
}

func mapNetworkPolicies(policies []networkingv1.NetworkPolicy) []NetworkPolicySummary {
	items := []NetworkPolicySummary{}
	for _, policy := range policies {
		types := []string{}
		for _, t := range policy.Spec.PolicyTypes {
			types = append(types, string(t))
		}
		items = append(items, NetworkPolicySummary{
			Namespace:    policy.Namespace,
			Name:         policy.Name,
			Types:        types,
			PodSelector:  selectorString(policy.Spec.PodSelector.MatchLabels),
			IngressRules: len(policy.Spec.Ingress),
			EgressRules:  len(policy.Spec.Egress),
		})
	}
	return items
}
