package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/YanaDevOps/kubi/backend/config"
	"github.com/YanaDevOps/kubi/backend/kube"
	"github.com/YanaDevOps/kubi/backend/server"
)

const version = "dev"

func main() {
	cfg, err := config.Parse()
	if err != nil {
		config.ExitWithError(err)
	}

	logger := newLogger(cfg.LogLevel)
	started := time.Now().UTC()

	store := kube.NewStore(cfg)
	handler := server.NewRouter(cfg, version, started, store)
	srv := server.New(cfg, logger, handler)

	go func() {
		if err := srv.Start(); err != nil {
			logger.Error("server stopped", "err", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", "err", err)
	}
}

func newLogger(level string) *slog.Logger {
	var slogLevel slog.Level
	switch level {
	case "debug":
		slogLevel = slog.LevelDebug
	case "warn":
		slogLevel = slog.LevelWarn
	case "error":
		slogLevel = slog.LevelError
	default:
		slogLevel = slog.LevelInfo
	}

	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slogLevel})
	return slog.New(handler)
}
