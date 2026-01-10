package kube

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"

	"github.com/YanaDevOps/kubi/backend/config"
	apiextclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type Store struct {
	mu       sync.RWMutex
	cfg      config.Config
	rawBytes []byte
	context  string
	hash     string
	client   *Client
	ext      apiextclient.Interface
}

func NewStore(cfg config.Config) *Store {
	return &Store{cfg: cfg}
}

func (s *Store) SetKubeconfig(raw []byte, context string) ([]string, string, error) {
	parsed, err := clientcmd.Load(raw)
	if err != nil {
		return nil, "", fmt.Errorf("parse kubeconfig: %w", err)
	}
	contexts := sortedContexts(parsed)
	if context == "" {
		context = parsed.CurrentContext
	}
	if context == "" {
		return nil, "", fmt.Errorf("kubeconfig has no current context")
	}
	if _, ok := parsed.Contexts[context]; !ok {
		return nil, "", fmt.Errorf("context %q not found in kubeconfig", context)
	}

	s.mu.Lock()
	s.rawBytes = raw
	s.context = context
	s.hash = ""
	s.client = nil
	s.ext = nil
	s.mu.Unlock()

	return contexts, context, nil
}

func (s *Store) SetContext(context string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.rawBytes) == 0 {
		return fmt.Errorf("no kubeconfig loaded")
	}
	parsed, err := clientcmd.Load(s.rawBytes)
	if err != nil {
		return fmt.Errorf("parse kubeconfig: %w", err)
	}
	if _, ok := parsed.Contexts[context]; !ok {
		return fmt.Errorf("context %q not found in kubeconfig", context)
	}
	s.context = context
	s.hash = ""
	s.client = nil
	s.ext = nil
	return nil
}

func (s *Store) Contexts() ([]string, string, error) {
	s.mu.RLock()
	raw := s.rawBytes
	current := s.context
	cfg := s.cfg
	s.mu.RUnlock()

	if len(raw) > 0 {
		parsed, err := clientcmd.Load(raw)
		if err != nil {
			return nil, "", fmt.Errorf("parse kubeconfig: %w", err)
		}
		if current == "" {
			current = parsed.CurrentContext
		}
		return sortedContexts(parsed), current, nil
	}

	if cfg.Kubeconfig == "" {
		return nil, "", nil
	}

	parsed, err := clientcmd.LoadFromFile(cfg.Kubeconfig)
	if err != nil {
		return nil, "", fmt.Errorf("load kubeconfig: %w", err)
	}

	if current == "" {
		current = parsed.CurrentContext
	}

	return sortedContexts(parsed), current, nil
}

func (s *Store) Client() (*Client, error) {
	s.mu.RLock()
	hash := s.hash
	raw := s.rawBytes
	context := s.context
	client := s.client
	s.mu.RUnlock()

	currentHash := configHash(raw, context)
	if client != nil && hash == currentHash {
		return client, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.client != nil && s.hash == currentHash {
		return s.client, nil
	}

	var newClient *Client
	var err error
	if len(s.rawBytes) > 0 {
		newClient, err = NewFromRaw(s.rawBytes, s.context)
	} else {
		newClient, err = New(s.cfg)
	}
	if err != nil {
		return nil, err
	}

	s.client = newClient
	s.ext = nil
	s.hash = currentHash

	return newClient, nil
}

func (s *Store) ExtClient() (apiextclient.Interface, error) {
	client, err := s.Client()
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	if s.ext != nil {
		ext := s.ext
		s.mu.RUnlock()
		return ext, nil
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ext != nil {
		return s.ext, nil
	}

	extClient, err := apiextclient.NewForConfig(client.Rest)
	if err != nil {
		return nil, fmt.Errorf("apiext client: %w", err)
	}
	s.ext = extClient
	return extClient, nil
}

func configHash(raw []byte, context string) string {
	sum := sha256.Sum256(append(raw, []byte(context)...))
	return hex.EncodeToString(sum[:])
}

func sortedContexts(cfg *api.Config) []string {
	if cfg == nil {
		return nil
	}
	contexts := make([]string, 0, len(cfg.Contexts))
	for name := range cfg.Contexts {
		contexts = append(contexts, name)
	}
	sort.Strings(contexts)
	return contexts
}
