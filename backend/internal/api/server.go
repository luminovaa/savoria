package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"savoria/backend/internal/config"
	"savoria/backend/internal/media"
	"savoria/backend/internal/security"
)

type principal struct {
	UserID string
	Role   string
}

type contextKey string

const principalKey contextKey = "principal"

type Server struct {
	DB         *pgxpool.Pool
	Config     config.Config
	Tokens     security.Manager
	Cloudinary media.Cloudinary
}

func New(ctx context.Context, cfg config.Config) (*Server, error) {
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Server{
		DB:     pool,
		Config: cfg,
		Tokens: security.NewManager(cfg.AccessTokenSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL),
		Cloudinary: media.Cloudinary{
			CloudName: cfg.CloudinaryCloudName,
			APIKey:    cfg.CloudinaryAPIKey, APISecret: cfg.CloudinaryAPISecret,
		},
	}, nil
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, s.requestLogger, s.recoverer)
	r.Use(s.cors)
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Route("/v1", func(r chi.Router) {
		r.Post("/auth/login", s.login)
		r.Post("/auth/refresh", s.refresh)
		r.Group(func(r chi.Router) {
			r.Use(s.authenticate)
			r.Get("/auth/me", s.me)
			r.Post("/auth/logout", s.logout)
			r.Get("/categories", s.listCategories)
			r.Get("/roles", s.listRoles)
			r.Get("/profiles/{id}", s.getProfile)
			r.Get("/menus", s.listMenus)
			r.Get("/menus/{id}", s.getMenu)
			r.Get("/shop", s.getShop)
			r.Get("/orders", s.listOrders)
			r.Get("/orders/stats", s.orderStats)
			r.Get("/orders/{id}", s.getOrder)
			r.Post("/orders/checkout", s.checkout)
			r.Group(func(r chi.Router) {
				r.Use(s.ownerOnly)
				r.Route("/users", func(r chi.Router) {
					r.Get("/", s.listUsers)
					r.Post("/", s.createUser)
					r.Get("/{id}", s.getUser)
					r.Patch("/{id}", s.updateUser)
					r.Delete("/{id}", s.deleteUser)
				})
				r.Post("/categories", s.createCategory)
				r.Patch("/categories/{id}", s.updateCategory)
				r.Delete("/categories/{id}", s.deleteCategory)
				r.Post("/menus", s.createMenu)
				r.Patch("/menus/{id}", s.updateMenu)
				r.Delete("/menus/{id}", s.deleteMenu)
				r.Post("/menus/{id}/image", s.uploadMenuImage)
				r.Post("/uploads/menu", s.uploadLooseMenuImage)
				r.Put("/shop", s.upsertShop)
			})
		})
	})
	return r
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.Config.CORSOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		value := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if value == "" {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		claims, err := s.Tokens.Parse(value)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid session")
			return
		}
		p := principal{UserID: claims.Subject, Role: claims.Role}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), principalKey, p)))
	})
}

func (s *Server) ownerOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if currentUser(r).Role != "Owner" {
			writeError(w, http.StatusForbidden, "owner access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func currentUser(r *http.Request) principal {
	p, _ := r.Context().Value(principalKey).(principal)
	return p
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("encode_response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func conflictOrServer(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	if strings.Contains(err.Error(), "duplicate key") {
		writeError(w, http.StatusConflict, "record already exists")
		return
	}
	writeError(w, http.StatusInternalServerError, "server error")
}

func nowPtr() *time.Time {
	value := time.Now()
	return &value
}

var errNotFound = errors.New("not found")
