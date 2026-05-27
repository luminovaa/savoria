package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"savoria/backend/internal/api"
	"savoria/backend/internal/config"
	"savoria/backend/internal/logger"
)

func main() {
	cfg, err := config.Load()
	appLogger := logger.New(cfg)
	slog.SetDefault(appLogger)
	if err != nil {
		slog.Error("config_error", "error", err)
		os.Exit(1)
	}
	server, err := api.New(context.Background(), cfg)
	if err != nil {
		slog.Error("database_error", "error", err)
		os.Exit(1)
	}
	defer server.DB.Close()
	httpServer := &http.Server{Addr: cfg.HTTPAddr, Handler: server.Router(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		slog.Info("server_starting", "addr", cfg.HTTPAddr, "env", cfg.AppEnv)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server_error", "error", err)
			os.Exit(1)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		slog.Error("server_error", "error", err)
		os.Exit(1)
	}
	slog.Info("server_stopped")
}
