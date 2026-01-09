package api

import (
	"encoding/json"
	"net/http"
	"time"
)

type Health struct {
	OK            bool      `json:"ok"`
	Timestamp     time.Time `json:"timestamp"`
	Version       string    `json:"version"`
	UptimeSeconds int64     `json:"uptimeSeconds"`
	Context       string    `json:"context"`
	Namespace     string    `json:"namespace"`
}

func HealthHandler(version string, started time.Time, namespace, context string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := Health{
			OK:            true,
			Timestamp:     time.Now().UTC(),
			Version:       version,
			UptimeSeconds: int64(time.Since(started).Seconds()),
			Context:       context,
			Namespace:     namespace,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}
