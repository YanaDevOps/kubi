package api

import (
	"encoding/json"
	"net/http"

	"github.com/YanaDevOps/kubi/backend/kube"
)

type KubeconfigRequest struct {
	Kubeconfig string `json:"kubeconfig"`
	Context    string `json:"context"`
}

type KubeconfigResponse struct {
	Contexts       []string `json:"contexts"`
	CurrentContext string   `json:"currentContext"`
}

type KubeconfigTestResponse struct {
	OK            bool   `json:"ok"`
	Context       string `json:"context"`
	ClusterURL    string `json:"clusterUrl,omitempty"`
	ServerVersion string `json:"serverVersion,omitempty"`
	Error         string `json:"error,omitempty"`
}

func KubeconfigSaveHandler(store *kube.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, errMethodNotAllowed())
			return
		}

		var req KubeconfigRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}
		if req.Kubeconfig == "" {
			WriteError(w, http.StatusBadRequest, errMissingField("kubeconfig"))
			return
		}

		contexts, current, err := store.SetKubeconfig([]byte(req.Kubeconfig), req.Context)
		if err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}

		payload := KubeconfigResponse{Contexts: contexts, CurrentContext: current}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func KubeconfigContextsHandler(store *kube.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, http.StatusMethodNotAllowed, errMethodNotAllowed())
			return
		}

		contexts, current, err := store.Contexts()
		if err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}

		payload := KubeconfigResponse{Contexts: contexts, CurrentContext: current}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func KubeconfigTestHandler(store *kube.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, errMethodNotAllowed())
			return
		}

		var req KubeconfigRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			if req.Context != "" {
				if err := store.SetContext(req.Context); err != nil {
					WriteError(w, http.StatusBadRequest, err)
					return
				}
			}
		}

		client, err := store.Client()
		if err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}

		version, err := client.Clientset.Discovery().ServerVersion()
		if err != nil {
			payload := KubeconfigTestResponse{
				OK:      false,
				Context: client.Info.Context,
				Error:   err.Error(),
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(payload)
			return
		}

		payload := KubeconfigTestResponse{
			OK:            true,
			Context:       client.Info.Context,
			ClusterURL:    client.Info.ClusterURL,
			ServerVersion: version.String(),
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func errMethodNotAllowed() error {
	return &apiError{msg: "method not allowed"}
}

func errMissingField(field string) error {
	return &apiError{msg: "missing field: " + field}
}

type apiError struct {
	msg string
}

func (e *apiError) Error() string {
	return e.msg
}
