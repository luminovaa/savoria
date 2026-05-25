package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"savoria/backend/internal/security"
)

type userResponse struct {
	ID                 string `json:"id"`
	Email              string `json:"email"`
	FirstName          string `json:"first_name"`
	LastName           string `json:"last_name"`
	RoleID             int16  `json:"role_id"`
	Role               string `json:"role"`
	Active             bool   `json:"active"`
	MustChangePassword bool   `json:"must_change_password"`
}

type authResponse struct {
	User         userResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresAt    time.Time    `json:"expires_at"`
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	var user userResponse
	var passwordHash string
	err := s.DB.QueryRow(r.Context(), `
		select u.id, u.email, u.password_hash, u.first_name, u.last_name,
		       u.role_id, roles.name, u.active, u.must_change_password
		  from users u join roles on roles.id = u.role_id
		 where lower(u.email) = lower($1)`, strings.TrimSpace(input.Email)).
		Scan(&user.ID, &user.Email, &passwordHash, &user.FirstName, &user.LastName,
			&user.RoleID, &user.Role, &user.Active, &user.MustChangePassword)
	if err != nil || !user.Active || !security.VerifyPassword(input.Password, passwordHash) {
		writeError(w, http.StatusUnauthorized, "email atau password salah")
		return
	}
	response, err := s.newSession(r, user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "gagal membuat sesi")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) newSession(r *http.Request, user userResponse) (authResponse, error) {
	access, expires, err := s.Tokens.Access(user.ID, user.Role)
	if err != nil {
		return authResponse{}, err
	}
	refresh, hash, refreshExpires, err := s.Tokens.NewRefreshToken()
	if err != nil {
		return authResponse{}, err
	}
	_, err = s.DB.Exec(r.Context(), `insert into refresh_tokens (user_id, token_hash, expires_at) values ($1,$2,$3)`,
		user.ID, hash, refreshExpires)
	return authResponse{User: user, AccessToken: access, RefreshToken: refresh, ExpiresAt: expires}, err
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeJSON(w, r, &input) || input.RefreshToken == "" {
		return
	}
	hash := security.HashToken(input.RefreshToken)
	var tokenID uuid.UUID
	var user userResponse
	err := s.DB.QueryRow(r.Context(), `
		select rt.id, u.id, u.email, u.first_name, u.last_name, u.role_id, roles.name,
		       u.active, u.must_change_password
		  from refresh_tokens rt join users u on u.id=rt.user_id join roles on roles.id=u.role_id
		 where rt.token_hash=$1 and rt.revoked_at is null and rt.expires_at > now() and u.active`, hash).
		Scan(&tokenID, &user.ID, &user.Email, &user.FirstName, &user.LastName, &user.RoleID,
			&user.Role, &user.Active, &user.MustChangePassword)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "refresh token tidak berlaku")
		return
	}
	_, _ = s.DB.Exec(r.Context(), `update refresh_tokens set revoked_at=now() where id=$1`, tokenID)
	response, err := s.newSession(r, user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "gagal memperbarui sesi")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	_, _ = s.DB.Exec(r.Context(), `update refresh_tokens set revoked_at=now() where token_hash=$1 and user_id=$2`,
		security.HashToken(input.RefreshToken), currentUser(r).UserID)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	var user userResponse
	err := s.DB.QueryRow(r.Context(), `
		select u.id, u.email, u.first_name, u.last_name, u.role_id, roles.name, u.active, u.must_change_password
		from users u join roles on roles.id=u.role_id where u.id=$1`, currentUser(r).UserID).
		Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.RoleID, &user.Role, &user.Active, &user.MustChangePassword)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, user)
}
