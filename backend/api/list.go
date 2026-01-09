package api

import (
	"fmt"
	"net/http"
	"strconv"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func parseListOptions(r *http.Request) (v1.ListOptions, error) {
	query := r.URL.Query()
	opts := v1.ListOptions{}

	if limit := query.Get("limit"); limit != "" {
		parsed, err := strconv.ParseInt(limit, 10, 64)
		if err != nil || parsed < 0 {
			return opts, fmt.Errorf("invalid limit")
		}
		opts.Limit = parsed
	}

	if cont := query.Get("continue"); cont != "" {
		opts.Continue = cont
	}

	if labelSelector := query.Get("labelSelector"); labelSelector != "" {
		opts.LabelSelector = labelSelector
	}

	return opts, nil
}
