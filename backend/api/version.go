package api

import (
	"encoding/json"
	"net/http"
)

type Version struct {
	Version string `json:"version"`
}

func VersionHandler(version string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := Version{Version: version}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}
