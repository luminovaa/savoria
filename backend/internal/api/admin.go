package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"savoria/backend/internal/security"
)

func (s *Server) listUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `select u.id,u.email,u.full_name,u.role_id,roles.name,u.active,u.must_change_password from users u join roles on roles.id=u.role_id order by u.created_at`)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer rows.Close()
	users := []userResponse{}
	for rows.Next() {
		var u userResponse
		if rows.Scan(&u.ID, &u.Email, &u.FullName, &u.RoleID, &u.Role, &u.Active, &u.MustChangePassword) == nil {
			users = append(users, u)
		}
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *Server) getUser(w http.ResponseWriter, r *http.Request) {
	var u userResponse
	err := s.DB.QueryRow(r.Context(), `select u.id,u.email,u.full_name,u.role_id,roles.name,u.active,u.must_change_password from users u join roles on roles.id=u.role_id where u.id=$1`, chi.URLParam(r, "id")).
		Scan(&u.ID, &u.Email, &u.FullName, &u.RoleID, &u.Role, &u.Active, &u.MustChangePassword)
	if err != nil {
		writeError(w, http.StatusNotFound, "user tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type userInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	RoleID   int16  `json:"role_id"`
	Active   *bool  `json:"active"`
}

func (s *Server) createUser(w http.ResponseWriter, r *http.Request) {
	var input userInput
	if !decodeJSON(w, r, &input) || input.Email == "" || input.FullName == "" || len(input.Password) < 8 || input.RoleID < 1 || input.RoleID > 2 {
		return
	}
	input.FullName = strings.TrimSpace(input.FullName)
	if input.FullName == "" {
		writeError(w, http.StatusBadRequest, "nama wajib diisi")
		return
	}
	hash, err := security.HashPassword(input.Password)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}
	var u userResponse
	err = s.DB.QueryRow(r.Context(), `insert into users(email,password_hash,full_name,role_id,active) values($1,$2,$3,$4,$5)
		returning id,email,full_name,role_id,(select name from roles where id=$4),active,must_change_password`,
		input.Email, hash, input.FullName, input.RoleID, active).
		Scan(&u.ID, &u.Email, &u.FullName, &u.RoleID, &u.Role, &u.Active, &u.MustChangePassword)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

func (s *Server) updateUser(w http.ResponseWriter, r *http.Request) {
	var input userInput
	if !decodeJSON(w, r, &input) || input.Email == "" || strings.TrimSpace(input.FullName) == "" || input.RoleID < 1 || input.RoleID > 2 {
		return
	}
	input.FullName = strings.TrimSpace(input.FullName)
	passwordReset := input.Password != ""
	if input.Password != "" {
		if len(input.Password) < 8 {
			writeError(w, http.StatusBadRequest, "password minimal 8 karakter")
			return
		}
		hash, err := security.HashPassword(input.Password)
		if err != nil {
			conflictOrServer(w, err)
			return
		}
		_, err = s.DB.Exec(r.Context(), `update users set password_hash=$1,must_change_password=false where id=$2`, hash, chi.URLParam(r, "id"))
		if err != nil {
			conflictOrServer(w, err)
			return
		}
	}
	tag, err := s.DB.Exec(r.Context(), `update users set email=$1,full_name=$2,role_id=$3,
		active=case when $4::boolean is not null then $4 when $6 then true else active end,updated_at=now() where id=$5`,
		input.Email, input.FullName, input.RoleID, input.Active, chi.URLParam(r, "id"), passwordReset)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user tidak ditemukan")
		return
	}
	s.getUser(w, r)
}

func (s *Server) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == currentUser(r).UserID {
		writeError(w, http.StatusConflict, "owner aktif tidak dapat menghapus dirinya")
		return
	}
	tag, err := s.DB.Exec(r.Context(), `update users set active=false,updated_at=now() where id=$1`, id)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user tidak ditemukan")
		return
	}
	_, _ = s.DB.Exec(r.Context(), `update refresh_tokens set revoked_at=now() where user_id=$1 and revoked_at is null`, id)
	w.WriteHeader(http.StatusNoContent)
}

type shopInput struct {
	Name         string `json:"name"`
	Address      string `json:"address"`
	Phone        string `json:"phone"`
	WifiName     string `json:"wifi_name"`
	WifiPassword string `json:"wifi_password"`
}

func (s *Server) getShop(w http.ResponseWriter, r *http.Request) {
	var id int64
	var input shopInput
	err := s.DB.QueryRow(r.Context(), `select id,name,coalesce(address,''),coalesce(phone,''),coalesce(wifi_name,''),coalesce(wifi_password,'') from shops order by id limit 1`).
		Scan(&id, &input.Name, &input.Address, &input.Phone, &input.WifiName, &input.WifiPassword)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "name": input.Name, "address": input.Address, "phone": input.Phone, "wifi_name": input.WifiName, "wifi_password": input.WifiPassword})
}

func (s *Server) upsertShop(w http.ResponseWriter, r *http.Request) {
	var input shopInput
	if !decodeJSON(w, r, &input) || input.Name == "" {
		return
	}
	var id int64
	err := s.DB.QueryRow(r.Context(), `insert into shops(id,name,address,phone,wifi_name,wifi_password)
		values(1,$1,$2,$3,$4,$5) on conflict(id) do update set name=excluded.name,address=excluded.address,
		phone=excluded.phone,wifi_name=excluded.wifi_name,wifi_password=excluded.wifi_password,updated_at=now()
		returning id`, input.Name, input.Address, input.Phone, input.WifiName, input.WifiPassword).Scan(&id)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id})
}
