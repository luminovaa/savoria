package config

import (
	"errors"
	"os"
	"time"
)

type Config struct {
	AppEnv              string
	HTTPAddr            string
	PublicAPIURL        string
	DatabaseURL         string
	AccessTokenSecret   string
	AccessTokenTTL      time.Duration
	RefreshTokenTTL     time.Duration
	CORSOrigin          string
	LogLevel            string
	LogFormat           string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:              value("APP_ENV", "development"),
		HTTPAddr:            value("HTTP_ADDR", ":8080"),
		PublicAPIURL:        value("PUBLIC_API_URL", "http://localhost:8080"),
		DatabaseURL:         os.Getenv("DATABASE_URL"),
		AccessTokenSecret:   os.Getenv("ACCESS_TOKEN_SECRET"),
		CORSOrigin:          value("CORS_ORIGIN", "*"),
		LogLevel:            value("LOG_LEVEL", "info"),
		CloudinaryCloudName: os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:    os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret: os.Getenv("CLOUDINARY_API_SECRET"),
	}
	cfg.LogFormat = value("LOG_FORMAT", defaultLogFormat(cfg.AppEnv))
	if cfg.DatabaseURL == "" {
		return cfg, errors.New("DATABASE_URL is required")
	}
	if len(cfg.AccessTokenSecret) < 32 {
		return cfg, errors.New("ACCESS_TOKEN_SECRET must contain at least 32 characters")
	}
	var err error
	cfg.AccessTokenTTL, err = time.ParseDuration(value("ACCESS_TOKEN_TTL", "15m"))
	if err != nil {
		return cfg, errors.New("invalid ACCESS_TOKEN_TTL")
	}
	cfg.RefreshTokenTTL, err = time.ParseDuration(value("REFRESH_TOKEN_TTL", "720h"))
	if err != nil {
		return cfg, errors.New("invalid REFRESH_TOKEN_TTL")
	}
	return cfg, nil
}

func value(name, fallback string) string {
	if current := os.Getenv(name); current != "" {
		return current
	}
	return fallback
}

func defaultLogFormat(appEnv string) string {
	if appEnv == "production" {
		return "json"
	}
	return "text"
}
