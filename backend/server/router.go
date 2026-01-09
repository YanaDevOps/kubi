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

func NewRouter(cfg config.Config, version string, started time.Time, client *kube.Client, extClient apiextclient.Interface) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", Healthz)

	apiMux := http.NewServeMux()
	apiMux.HandleFunc("/health", api.HealthHandler(version, started, client.Info.Namespace, client.Info.Context))
	apiMux.HandleFunc("/overview", api.OverviewHandler(version, client.Info.Namespace, client.Info.Context, client.Info.ClusterURL, true))
	apiMux.HandleFunc("/version", api.VersionHandler(version))
	apiMux.HandleFunc("/namespaces", api.NamespacesHandler(client.Clientset))
	apiMux.HandleFunc("/nodes", api.NodesHandler(client.Clientset))
	apiMux.HandleFunc("/topology", api.TopologyHandler(client.Clientset))
	apiMux.HandleFunc("/workloads", api.WorkloadsHandler(client.Clientset))
	apiMux.HandleFunc("/pods", api.PodsHandler(client.Clientset))
	apiMux.HandleFunc("/ports", api.PortsHandler(client.Clientset))
	apiMux.HandleFunc("/services", api.ServicesHandler(client.Clientset))
	apiMux.HandleFunc("/endpointslices", api.EndpointSlicesHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/roles", api.RolesHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/rolebindings", api.RoleBindingsHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/clusterroles", api.ClusterRolesHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/clusterrolebindings", api.ClusterRoleBindingsHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/serviceaccounts", api.ServiceAccountsHandler(client.Clientset))
	apiMux.HandleFunc("/rbac/effective", api.EffectivePermissionsHandler(client.Clientset))
	apiMux.HandleFunc("/storage", api.StorageHandler(client.Clientset))
	apiMux.HandleFunc("/validation", api.ValidationHandler(client.Clientset))
	apiMux.HandleFunc("/inventory", api.InventoryHandler(client.Clientset, extClient))
	apiMux.HandleFunc("/crds/objects", api.CRDObjectsHandler(client.Rest))
	apiMux.HandleFunc("/traffic", api.TrafficHandler(client.Clientset))
	apiMux.HandleFunc("/metrics", api.MetricsHandler(client.Rest))

	apiHandler := http.Handler(apiMux)
	apiHandler = middleware.Readonly(apiHandler)

	mux.Handle("/api/", http.StripPrefix("/api", apiHandler))

	mux.Handle("/", StaticHandler())

	return mux
}
