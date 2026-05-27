package logger

import (
	"log/slog"
	"os"
	"strings"

	"savoria/backend/internal/config"
)

func New(cfg config.Config) *slog.Logger {
	level := new(slog.LevelVar)
	level.Set(parseLevel(cfg.LogLevel))

	options := &slog.HandlerOptions{Level: level}
	if strings.EqualFold(cfg.LogFormat, "json") {
		return slog.New(slog.NewJSONHandler(os.Stdout, options))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, options))
}

func parseLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
