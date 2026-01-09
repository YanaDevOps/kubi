package api

import (
	"net/http"
	"sort"

	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type RuleSummary struct {
	Verbs           []string `json:"verbs"`
	Resources       []string `json:"resources"`
	APIGroups       []string `json:"apiGroups"`
	ResourceNames   []string `json:"resourceNames"`
	NonResourceURLs []string `json:"nonResourceUrls"`
}

type RoleItem struct {
	Name      string        `json:"name"`
	Namespace string        `json:"namespace"`
	Rules     []RuleSummary `json:"rules"`
}

type RoleList struct {
	Items    []RoleItem `json:"items"`
	Continue string     `json:"continue"`
}

type BindingSubject struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type RoleBindingItem struct {
	Name      string           `json:"name"`
	Namespace string           `json:"namespace"`
	RoleRef   string           `json:"roleRef"`
	RoleKind  string           `json:"roleKind"`
	Subjects  []BindingSubject `json:"subjects"`
	RoleRefNS string           `json:"roleRefNamespace,omitempty"`
}

type RoleBindingList struct {
	Items    []RoleBindingItem `json:"items"`
	Continue string            `json:"continue"`
}

type ServiceAccountItem struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type ServiceAccountList struct {
	Items    []ServiceAccountItem `json:"items"`
	Continue string               `json:"continue"`
}

type EffectivePermissions struct {
	Namespace      string        `json:"namespace"`
	ServiceAccount string        `json:"serviceAccount"`
	Rules          []RuleSummary `json:"rules"`
}

func RolesHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.RbacV1().Roles(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]RoleItem, 0, len(list.Items))
		for _, role := range list.Items {
			items = append(items, RoleItem{
				Name:      role.Name,
				Namespace: role.Namespace,
				Rules:     mapRules(role.Rules),
			})
		}

		respondJSON(w, http.StatusOK, RoleList{Items: items, Continue: list.Continue})
	}
}

func ClusterRolesHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		list, err := client.RbacV1().ClusterRoles().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]RoleItem, 0, len(list.Items))
		for _, role := range list.Items {
			items = append(items, RoleItem{
				Name:      role.Name,
				Namespace: "",
				Rules:     mapRules(role.Rules),
			})
		}

		respondJSON(w, http.StatusOK, RoleList{Items: items, Continue: list.Continue})
	}
}

func RoleBindingsHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.RbacV1().RoleBindings(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]RoleBindingItem, 0, len(list.Items))
		for _, binding := range list.Items {
			items = append(items, RoleBindingItem{
				Name:      binding.Name,
				Namespace: binding.Namespace,
				RoleRef:   binding.RoleRef.Name,
				RoleKind:  binding.RoleRef.Kind,
				Subjects:  mapSubjects(binding.Subjects),
			})
		}

		respondJSON(w, http.StatusOK, RoleBindingList{Items: items, Continue: list.Continue})
	}
}

func ClusterRoleBindingsHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		list, err := client.RbacV1().ClusterRoleBindings().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]RoleBindingItem, 0, len(list.Items))
		for _, binding := range list.Items {
			items = append(items, RoleBindingItem{
				Name:      binding.Name,
				Namespace: "",
				RoleRef:   binding.RoleRef.Name,
				RoleKind:  binding.RoleRef.Kind,
				Subjects:  mapSubjects(binding.Subjects),
			})
		}

		respondJSON(w, http.StatusOK, RoleBindingList{Items: items, Continue: list.Continue})
	}
}

func ServiceAccountsHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.CoreV1().ServiceAccounts(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]ServiceAccountItem, 0, len(list.Items))
		for _, sa := range list.Items {
			items = append(items, ServiceAccountItem{
				Name:      sa.Name,
				Namespace: sa.Namespace,
			})
		}

		respondJSON(w, http.StatusOK, ServiceAccountList{Items: items, Continue: list.Continue})
	}
}

func EffectivePermissionsHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		namespace := r.URL.Query().Get("ns")
		serviceAccount := r.URL.Query().Get("sa")
		if namespace == "" || serviceAccount == "" {
			respondError(w, http.StatusBadRequest, "ns and sa are required")
			return
		}

		roleBindings, err := client.RbacV1().RoleBindings(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		clusterRoleBindings, err := client.RbacV1().ClusterRoleBindings().List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		roles, err := client.RbacV1().Roles(namespace).List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		clusterRoles, err := client.RbacV1().ClusterRoles().List(ctx, v1.ListOptions{})
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		roleRules := map[string][]RuleSummary{}
		for _, role := range roles.Items {
			roleRules[role.Name] = mapRules(role.Rules)
		}

		clusterRoleRules := map[string][]RuleSummary{}
		for _, role := range clusterRoles.Items {
			clusterRoleRules[role.Name] = mapRules(role.Rules)
		}

		rules := []RuleSummary{}
		for _, binding := range roleBindings.Items {
			if !bindingApplies(binding.Subjects, namespace, serviceAccount) {
				continue
			}
			switch binding.RoleRef.Kind {
			case "Role":
				rules = append(rules, roleRules[binding.RoleRef.Name]...)
			case "ClusterRole":
				rules = append(rules, clusterRoleRules[binding.RoleRef.Name]...)
			}
		}

		for _, binding := range clusterRoleBindings.Items {
			if !bindingApplies(binding.Subjects, namespace, serviceAccount) {
				continue
			}
			if binding.RoleRef.Kind == "ClusterRole" {
				rules = append(rules, clusterRoleRules[binding.RoleRef.Name]...)
			}
		}

		sort.Slice(rules, func(i, j int) bool {
			left := ""
			right := ""
			if len(rules[i].Verbs) > 0 {
				left = rules[i].Verbs[0]
			}
			if len(rules[j].Verbs) > 0 {
				right = rules[j].Verbs[0]
			}
			return left < right
		})

		respondJSON(w, http.StatusOK, EffectivePermissions{
			Namespace:      namespace,
			ServiceAccount: serviceAccount,
			Rules:          rules,
		})
	}
}

func mapRules(rules []rbacv1.PolicyRule) []RuleSummary {
	items := make([]RuleSummary, 0, len(rules))
	for _, rule := range rules {
		items = append(items, RuleSummary{
			Verbs:           rule.Verbs,
			Resources:       rule.Resources,
			APIGroups:       rule.APIGroups,
			ResourceNames:   rule.ResourceNames,
			NonResourceURLs: rule.NonResourceURLs,
		})
	}
	return items
}

func mapSubjects(subjects []rbacv1.Subject) []BindingSubject {
	items := make([]BindingSubject, 0, len(subjects))
	for _, subject := range subjects {
		items = append(items, BindingSubject{
			Kind:      subject.Kind,
			Name:      subject.Name,
			Namespace: subject.Namespace,
		})
	}
	return items
}

func bindingApplies(subjects []rbacv1.Subject, namespace, serviceAccount string) bool {
	for _, subject := range subjects {
		if subject.Kind != "ServiceAccount" {
			continue
		}
		if subject.Name != serviceAccount {
			continue
		}
		if subject.Namespace != "" && subject.Namespace != namespace {
			continue
		}
		return true
	}
	return false
}
