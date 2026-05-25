package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"savoria/backend/internal/api"
	"savoria/backend/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	server, err := api.New(context.Background(), cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer server.DB.Close()
	httpServer := &http.Server{Addr: cfg.HTTPAddr, Handler: server.Router(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Printf("savoria api listening on %s", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
}
