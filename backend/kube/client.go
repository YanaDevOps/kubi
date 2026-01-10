package kube

import (
	"fmt"

	"github.com/YanaDevOps/kubi/backend/config"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type Info struct {
	Context    string
	Namespace  string
	ClusterURL string
}

type Client struct {
	Clientset kubernetes.Interface
	Rest      *rest.Config
	Info      Info
}

func New(cfg config.Config) (*Client, error) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	if cfg.Kubeconfig != "" {
		loadingRules.ExplicitPath = cfg.Kubeconfig
	}

	overrides := &clientcmd.ConfigOverrides{}
	if cfg.Context != "" {
		overrides.CurrentContext = cfg.Context
	}

	clientConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, overrides)
	restConfig, err := clientConfig.ClientConfig()
	info := Info{}

	if err != nil {
		if cfg.Kubeconfig != "" {
			return nil, fmt.Errorf("kubeconfig: %w", err)
		}
		restConfig, err = rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("in-cluster config: %w", err)
		}
		info.Context = "in-cluster"
		info.ClusterURL = restConfig.Host
	} else {
		raw, rawErr := clientConfig.RawConfig()
		if rawErr == nil {
			contextName := cfg.Context
			if contextName == "" {
				contextName = raw.CurrentContext
			}
			info.Context = contextName
			if ctx, ok := raw.Contexts[contextName]; ok {
				if cluster, ok := raw.Clusters[ctx.Cluster]; ok {
					info.ClusterURL = cluster.Server
				}
			}
		}
	}

	if cfg.Namespace != "" {
		info.Namespace = cfg.Namespace
	} else {
		if ns, _, nsErr := clientConfig.Namespace(); nsErr == nil && ns != "" {
			info.Namespace = ns
		}
	}

	if info.Namespace == "" {
		info.Namespace = "all"
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("clientset: %w", err)
	}

	return &Client{Clientset: clientset, Rest: restConfig, Info: info}, nil
}

func NewFromRaw(rawBytes []byte, context string) (*Client, error) {
	raw, err := clientcmd.Load(rawBytes)
	if err != nil {
		return nil, fmt.Errorf("kubeconfig: %w", err)
	}

	if context == "" {
		context = raw.CurrentContext
	}
	if context == "" {
		return nil, fmt.Errorf("kubeconfig has no current context")
	}

	overrides := &clientcmd.ConfigOverrides{CurrentContext: context}
	clientConfig := clientcmd.NewNonInteractiveClientConfig(*raw, context, overrides, nil)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("kubeconfig: %w", err)
	}

	info := Info{Context: context}
	if ctx, ok := raw.Contexts[context]; ok {
		if cluster, ok := raw.Clusters[ctx.Cluster]; ok {
			info.ClusterURL = cluster.Server
		}
	}

	if ns, _, nsErr := clientConfig.Namespace(); nsErr == nil && ns != "" {
		info.Namespace = ns
	}
	if info.Namespace == "" {
		info.Namespace = "all"
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("clientset: %w", err)
	}

	return &Client{Clientset: clientset, Rest: restConfig, Info: info}, nil
}
