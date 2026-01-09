package server

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
)

//go:embed static/*
var staticFS embed.FS

func StaticHandler() http.Handler {
	content, err := fs.Sub(staticFS, "static")
	if err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("static assets unavailable"))
		})
	}

	fileServer := http.FileServer(http.FS(content))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "" {
			r.URL.Path = "/index.html"
			fileServer.ServeHTTP(w, r)
			return
		}

		if _, err := fs.Stat(content, path.Clean(r.URL.Path)); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})
}
