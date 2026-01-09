package api

import (
	"encoding/json"
	"net/http"
	"runtime"
	"time"
)

type Overview struct {
	App        string    `json:"app"`
	Version    string    `json:"version"`
	Timestamp  time.Time `json:"timestamp"`
	GoVersion  string    `json:"goVersion"`
	Readonly   bool      `json:"readonly"`
	Namespace  string    `json:"namespace"`
	Context    string    `json:"context"`
	ClusterURL string    `json:"clusterUrl"`
}

func OverviewHandler(version, namespace, context, clusterURL string, readonly bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := Overview{
			App:        "kubi",
			Version:    version,
			Timestamp:  time.Now().UTC(),
			GoVersion:  runtime.Version(),
			Readonly:   readonly,
			Namespace:  namespace,
			Context:    context,
			ClusterURL: clusterURL,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}
