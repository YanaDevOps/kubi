package server

import (
	"net/http"
	"time"

	"github.com/YanaDevOps/kubi/backend/api"
	"github.com/YanaDevOps/kubi/backend/config"
	"github.com/YanaDevOps/kubi/backend/kube"
	"github.com/YanaDevOps/kubi/backend/middleware"
	apiextclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
)

func NewRouter(cfg config.Config, version string, started time.Time, store *kube.Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", Healthz)

	apiMux := http.NewServeMux()
	apiMux.HandleFunc("/kubeconfig", api.KubeconfigSaveHandler(store))
	apiMux.HandleFunc("/kubeconfig/contexts", api.KubeconfigContextsHandler(store))
	apiMux.HandleFunc("/kubeconfig/test", api.KubeconfigTestHandler(store))

	readonlyMux := http.NewServeMux()
	readonlyMux.HandleFunc("/health", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.HealthHandler(version, started, client.Info.Namespace, client.Info.Context)
	}))
	readonlyMux.HandleFunc("/overview", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.OverviewHandler(version, client.Info.Namespace, client.Info.Context, client.Info.ClusterURL, true)
	}))
	readonlyMux.HandleFunc("/version", api.VersionHandler(version))
	readonlyMux.HandleFunc("/namespaces", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.NamespacesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/nodes", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.NodesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/topology", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.TopologyHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/workloads", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.WorkloadsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/pods", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.PodsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/ports", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.PortsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/services", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.ServicesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/endpointslices", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.EndpointSlicesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/roles", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.RolesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/rolebindings", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.RoleBindingsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/clusterroles", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.ClusterRolesHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/clusterrolebindings", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.ClusterRoleBindingsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/serviceaccounts", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.ServiceAccountsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/rbac/effective", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.EffectivePermissionsHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/storage", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.StorageHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/validation", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.ValidationHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/inventory", withClientExt(store, func(client *kube.Client, extClient apiextclient.Interface) http.HandlerFunc {
		return api.InventoryHandler(client.Clientset, extClient)
	}))
	readonlyMux.HandleFunc("/crds/objects", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.CRDObjectsHandler(client.Rest)
	}))
	readonlyMux.HandleFunc("/traffic", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.TrafficHandler(client.Clientset)
	}))
	readonlyMux.HandleFunc("/metrics", withClient(store, func(client *kube.Client) http.HandlerFunc {
		return api.MetricsHandler(client.Rest)
	}))

	apiMux.Handle("/", middleware.Readonly(readonlyMux))

	mux.Handle("/api/", http.StripPrefix("/api", apiMux))

	mux.Handle("/", StaticHandler())

	return mux
}

func withClient(store *kube.Store, handler func(*kube.Client) http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := store.Client()
		if err != nil {
			api.WriteError(w, http.StatusServiceUnavailable, err)
			return
		}
		handler(client)(w, r)
	}
}

func withClientExt(store *kube.Store, handler func(*kube.Client, apiextclient.Interface) http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := store.Client()
		if err != nil {
			api.WriteError(w, http.StatusServiceUnavailable, err)
			return
		}
		ext, err := store.ExtClient()
		if err != nil {
			api.WriteError(w, http.StatusServiceUnavailable, err)
			return
		}
		handler(client, ext)(w, r)
	}
}
