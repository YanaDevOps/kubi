package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/YanaDevOps/kubi/backend/config"
)

type Server struct {
	cfg    config.Config
	logger *slog.Logger
	http   *http.Server
}

func New(cfg config.Config, logger *slog.Logger, handler http.Handler) *Server {
	return &Server{
		cfg:    cfg,
		logger: logger,
		http: &http.Server{
			Addr:              cfg.Address(),
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      30 * time.Second,
			IdleTimeout:       60 * time.Second,
		},
	}
}

func (s *Server) Start() error {
	s.logger.Info("starting server", "addr", s.cfg.Address())
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("shutting down server")
	return s.http.Shutdown(ctx)
}

func Healthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func Addr(cfg config.Config) string {
	return fmt.Sprintf("http://%s", cfg.Address())
}
