package api

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}
		slog.InfoContext(r.Context(), "http_request",
			"request_id", middleware.GetReqID(r.Context()),
			"method", r.Method,
			"path", r.URL.Path,
			"query", r.URL.RawQuery,
			"status", status,
			"duration_ms", time.Since(started).Milliseconds(),
			"remote_ip", r.RemoteAddr,
			"user_agent", r.UserAgent(),
			"bytes_written", ww.BytesWritten(),
		)
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if value := recover(); value != nil {
				slog.ErrorContext(r.Context(), "panic",
					"request_id", middleware.GetReqID(r.Context()),
					"method", r.Method,
					"path", r.URL.Path,
					"panic", value,
					"stack", string(debug.Stack()),
				)
				writeError(w, http.StatusInternalServerError, "server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
