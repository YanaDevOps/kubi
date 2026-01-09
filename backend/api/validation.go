package api

import (
	"fmt"
	"net/http"
	"sort"
	"strings"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type ValidationItem struct {
	ID       string   `json:"id"`
	Severity string   `json:"severity"`
	Title    string   `json:"title"`
	Details  string   `json:"details"`
	Objects  []string `json:"objects"`
}

type ValidationResponse struct {
	Items []ValidationItem `json:"items"`
}

func ValidationHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		namespace := r.URL.Query().Get("ns")
		if namespace == "" {
			namespace = v1.NamespaceAll
		}

		services, err := client.CoreV1().Services(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pods, err := client.CoreV1().Pods(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		slices, err := client.DiscoveryV1().EndpointSlices(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		ingresses, err := client.NetworkingV1().Ingresses(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		nodes, err := client.CoreV1().Nodes().List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pvcs, err := client.CoreV1().PersistentVolumeClaims(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		roles, _ := client.RbacV1().Roles(namespace).List(ctx, v1.ListOptions{})
		clusterRoles, _ := client.RbacV1().ClusterRoles().List(ctx, v1.ListOptions{})
		roleBindings, _ := client.RbacV1().RoleBindings(namespace).List(ctx, v1.ListOptions{})
		clusterRoleBindings, _ := client.RbacV1().ClusterRoleBindings().List(ctx, v1.ListOptions{})

		items := []ValidationItem{}

		items = append(items, validateServicesWithoutEndpoints(services.Items, slices.Items)...)
		items = append(items, validatePodsNotReadyBehindService(services.Items, pods.Items)...)
		items = append(items, validateIngressMissingService(services.Items, ingresses.Items)...)
		items = append(items, validateEndpointSlicesWithoutService(services.Items, slices.Items)...)
		items = append(items, validateNodePressure(nodes.Items)...)
		items = append(items, validatePVCPending(pvcs.Items)...)
		items = append(items, validateRBACRisky(roles.Items, clusterRoles.Items, roleBindings.Items, clusterRoleBindings.Items)...)

		sort.Slice(items, func(i, j int) bool {
			if items[i].Severity == items[j].Severity {
				return items[i].Title < items[j].Title
			}
			return items[i].Severity < items[j].Severity
		})

		respondJSON(w, http.StatusOK, ValidationResponse{Items: items})
	}
}

func validateServicesWithoutEndpoints(services []corev1.Service, slices []discoveryv1.EndpointSlice) []ValidationItem {
	serviceHasEndpoints := map[string]bool{}
	for _, slice := range slices {
		name := slice.Labels[discoveryv1.LabelServiceName]
		if name == "" {
			continue
		}
		if countEndpoints(slice) > 0 {
			serviceHasEndpoints[slice.Namespace+"/"+name] = true
		}
	}

	missing := []string{}
	for _, svc := range services {
		key := svc.Namespace + "/" + svc.Name
		if svc.Spec.Type == corev1.ServiceTypeExternalName {
			continue
		}
		if !serviceHasEndpoints[key] {
			missing = append(missing, key)
		}
	}

	if len(missing) == 0 {
		return nil
	}

	return []ValidationItem{{
		ID:       "services-no-endpoints",
		Severity: "warning",
		Title:    "Services without endpoints",
		Details:  "Services have no ready endpoints in EndpointSlices.",
		Objects:  missing,
	}}
}

func validatePodsNotReadyBehindService(services []corev1.Service, pods []corev1.Pod) []ValidationItem {
	items := []ValidationItem{}
	for _, svc := range services {
		if len(svc.Spec.Selector) == 0 {
			continue
		}
		matching := []corev1.Pod{}
		for _, pod := range pods {
			if pod.Namespace != svc.Namespace {
				continue
			}
			if selectorMatches(svc.Spec.Selector, pod.Labels) {
				matching = append(matching, pod)
			}
		}
		if len(matching) == 0 {
			continue
		}
		notReady := []string{}
		for _, pod := range matching {
			if !podReady(pod.Status.Conditions) {
				notReady = append(notReady, pod.Namespace+"/"+pod.Name)
			}
		}
		if len(notReady) > 0 {
			items = append(items, ValidationItem{
				ID:       "pods-not-ready-" + svc.Namespace + "-" + svc.Name,
				Severity: "warning",
				Title:    "Pods not Ready behind Service",
				Details:  fmt.Sprintf("Service %s/%s has pods that are not Ready.", svc.Namespace, svc.Name),
				Objects:  notReady,
			})
		}
	}
	return items
}

func validateIngressMissingService(services []corev1.Service, ingresses []networkingv1.Ingress) []ValidationItem {
	serviceSet := map[string]bool{}
	for _, svc := range services {
		serviceSet[svc.Namespace+"/"+svc.Name] = true
	}
	missing := []string{}
	for _, ing := range ingresses {
		for _, backend := range ingressBackends(ing) {
			key := ing.Namespace + "/" + backend.ServiceName
			if !serviceSet[key] {
				missing = append(missing, ing.Namespace+"/"+ing.Name+" -> "+backend.ServiceName)
			}
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return []ValidationItem{{
		ID:       "ingress-missing-service",
		Severity: "warning",
		Title:    "Ingress points to missing Service",
		Details:  "Ingress backend references a Service that does not exist.",
		Objects:  missing,
	}}
}

func validateEndpointSlicesWithoutService(services []corev1.Service, slices []discoveryv1.EndpointSlice) []ValidationItem {
	serviceSet := map[string]bool{}
	for _, svc := range services {
		serviceSet[svc.Namespace+"/"+svc.Name] = true
	}
	missing := []string{}
	for _, slice := range slices {
		name := slice.Labels[discoveryv1.LabelServiceName]
		if name == "" {
			continue
		}
		key := slice.Namespace + "/" + name
		if !serviceSet[key] {
			missing = append(missing, slice.Namespace+"/"+slice.Name)
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return []ValidationItem{{
		ID:       "endpointslice-missing-service",
		Severity: "warning",
		Title:    "EndpointSlice without Service",
		Details:  "EndpointSlices reference a Service that is missing.",
		Objects:  missing,
	}}
}

func validateNodePressure(nodes []corev1.Node) []ValidationItem {
	issues := []string{}
	for _, node := range nodes {
		for _, condition := range node.Status.Conditions {
			if condition.Status != corev1.ConditionTrue {
				continue
			}
			switch condition.Type {
			case corev1.NodeMemoryPressure, corev1.NodeDiskPressure, corev1.NodePIDPressure, corev1.NodeNetworkUnavailable:
				issues = append(issues, node.Name+" ("+string(condition.Type)+")")
			}
		}
	}
	if len(issues) == 0 {
		return nil
	}
	return []ValidationItem{{
		ID:       "node-pressure",
		Severity: "critical",
		Title:    "Node pressure conditions",
		Details:  "Nodes report pressure conditions or network unavailable.",
		Objects:  issues,
	}}
}

func validatePVCPending(pvcs []corev1.PersistentVolumeClaim) []ValidationItem {
	pending := []string{}
	for _, pvc := range pvcs {
		if pvc.Status.Phase == corev1.ClaimPending {
			pending = append(pending, pvc.Namespace+"/"+pvc.Name)
		}
	}
	if len(pending) == 0 {
		return nil
	}
	return []ValidationItem{{
		ID:       "pvc-pending",
		Severity: "warning",
		Title:    "PVCs stuck Pending",
		Details:  "Some PersistentVolumeClaims are not bound.",
		Objects:  pending,
	}}
}

func validateRBACRisky(roles []rbacv1.Role, clusterRoles []rbacv1.ClusterRole, roleBindings []rbacv1.RoleBinding, clusterRoleBindings []rbacv1.ClusterRoleBinding) []ValidationItem {
	items := []ValidationItem{}

	clusterAdminBindings := []string{}
	for _, binding := range clusterRoleBindings {
		if strings.EqualFold(binding.RoleRef.Name, "cluster-admin") {
			clusterAdminBindings = append(clusterAdminBindings, binding.Name)
		}
	}
	if len(clusterAdminBindings) > 0 {
		items = append(items, ValidationItem{
			ID:       "rbac-cluster-admin",
			Severity: "warning",
			Title:    "Cluster-admin bindings",
			Details:  "ClusterRoleBindings grant cluster-admin privileges.",
			Objects:  clusterAdminBindings,
		})
	}

	wildcards := []string{}
	for _, role := range roles {
		if hasWildcardRule(role.Rules) {
			wildcards = append(wildcards, role.Namespace+"/"+role.Name)
		}
	}
	for _, role := range clusterRoles {
		if hasWildcardRule(role.Rules) {
			wildcards = append(wildcards, role.Name)
		}
	}
	if len(wildcards) > 0 {
		items = append(items, ValidationItem{
			ID:       "rbac-wildcards",
			Severity: "warning",
			Title:    "RBAC wildcard permissions",
			Details:  "Roles contain wildcard verbs or resources.",
			Objects:  wildcards,
		})
	}

	_ = roleBindings
	return items
}

func countEndpoints(slice discoveryv1.EndpointSlice) int {
	count := 0
	for _, endpoint := range slice.Endpoints {
		count += len(endpoint.Addresses)
	}
	return count
}

func selectorMatches(selector, labels map[string]string) bool {
	for key, value := range selector {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func hasWildcardRule(rules []rbacv1.PolicyRule) bool {
	for _, rule := range rules {
		if containsWildcard(rule.Verbs) || containsWildcard(rule.Resources) {
			return true
		}
	}
	return false
}

func containsWildcard(items []string) bool {
	for _, item := range items {
		if item == "*" {
			return true
		}
	}
	return false
}
