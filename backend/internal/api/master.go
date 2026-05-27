package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id tidak valid")
		return 0, false
	}
	return id, true
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `select id,name_category,created_at,updated_at from categories order by name_category`)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer rows.Close()
	result := []map[string]any{}
	for rows.Next() {
		var id int64
		var name string
		var created, updated any
		_ = rows.Scan(&id, &name, &created, &updated)
		result = append(result, map[string]any{"id": id, "name_category": name, "created_at": created, "updated_at": updated})
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) listRoles(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `select id,name from roles order by name`)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer rows.Close()
	result := []map[string]any{}
	for rows.Next() {
		var id int16
		var name string
		_ = rows.Scan(&id, &name)
		result = append(result, map[string]any{"id": id, "name": name})
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) getProfile(w http.ResponseWriter, r *http.Request) {
	var id, fullName, role string
	var roleID int16
	err := s.DB.QueryRow(r.Context(), `select u.id,u.full_name,u.role_id,roles.name from users u join roles on roles.id=u.role_id where u.id=$1`, chi.URLParam(r, "id")).
		Scan(&id, &fullName, &roleID, &role)
	if err != nil {
		writeError(w, http.StatusNotFound, "profil tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "full_name": fullName, "role_id": roleID, "role": map[string]string{"name": role}})
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name_category"`
	}
	if !decodeJSON(w, r, &input) || input.Name == "" {
		return
	}
	var id int64
	err := s.DB.QueryRow(r.Context(), `insert into categories(name_category) values($1) returning id`, input.Name).Scan(&id)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "name_category": input.Name})
}

func (s *Server) updateCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var input struct {
		Name string `json:"name_category"`
	}
	if !decodeJSON(w, r, &input) || input.Name == "" {
		return
	}
	tag, err := s.DB.Exec(r.Context(), `update categories set name_category=$1,updated_at=now() where id=$2`, input.Name, id)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "kategori tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "name_category": input.Name})
}

func (s *Server) deleteCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if _, err := s.DB.Exec(r.Context(), `delete from categories where id=$1`, id); err != nil {
		writeError(w, http.StatusConflict, "kategori masih digunakan")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type menu struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name_menu"`
	Description   *string  `json:"description"`
	Price         float64  `json:"price"`
	CategoryID    *int64   `json:"category_id"`
	Images        string   `json:"images"`
	ImagePublicID *string  `json:"image_public_id"`
	Promo         bool     `json:"promo"`
	Stock         int      `json:"stock"`
	PromoPrice    *float64 `json:"promo_price"`
	PromoStart    *string  `json:"promo_start"`
	PromoEnd      *string  `json:"promo_end"`
	IsDeleted     bool     `json:"is_deleted"`
	IsArchive     bool     `json:"is_archive"`
}

func scanMenu(row interface{ Scan(...any) error }) (menu, error) {
	var m menu
	err := row.Scan(&m.ID, &m.Name, &m.Description, &m.Price, &m.CategoryID, &m.Images,
		&m.ImagePublicID, &m.Promo, &m.Stock, &m.PromoPrice, &m.PromoStart, &m.PromoEnd,
		&m.IsDeleted, &m.IsArchive)
	return m, err
}

const menuColumns = `id,name_menu,description,price,category_id,image_url,image_public_id,promo,stock,promo_price,promo_start::text,promo_end::text,is_deleted,is_archive`

func (s *Server) listMenus(w http.ResponseWriter, r *http.Request) {
	showArchived := r.URL.Query().Get("archived") == "true"
	where := `where is_deleted=false and is_archive=false`
	if showArchived {
		where = `where is_deleted=false and is_archive=true`
	}
	args := []any{}
	if category := r.URL.Query().Get("category_id"); category != "" {
		where += ` and category_id=$1`
		args = append(args, category)
	}
	rows, err := s.DB.Query(r.Context(), `select `+menuColumns+` from menus `+where+` order by created_at desc`, args...)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer rows.Close()
	result := []menu{}
	for rows.Next() {
		item, err := scanMenu(rows)
		if err == nil {
			result = append(result, item)
		}
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) getMenu(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	item, err := scanMenu(s.DB.QueryRow(r.Context(), `select `+menuColumns+` from menus where id=$1`, id))
	if err != nil {
		writeError(w, http.StatusNotFound, "menu tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

type menuInput struct {
	Name          string   `json:"name_menu"`
	Description   *string  `json:"description"`
	Price         float64  `json:"price"`
	CategoryID    *int64   `json:"category_id"`
	Promo         bool     `json:"promo"`
	Stock         int      `json:"stock"`
	PromoPrice    *float64 `json:"promo_price"`
	PromoStart    *string  `json:"promo_start"`
	PromoEnd      *string  `json:"promo_end"`
	IsArchive     bool     `json:"is_archive"`
	Images        string   `json:"images"`
	ImagePublicID *string  `json:"image_public_id"`
}

func (s *Server) createMenu(w http.ResponseWriter, r *http.Request) {
	var input menuInput
	if !decodeJSON(w, r, &input) || input.Name == "" || input.Price < 0 || input.Stock < 0 {
		return
	}
	item, err := scanMenu(s.DB.QueryRow(r.Context(), `insert into menus
		(name_menu,description,price,category_id,promo,stock,promo_price,promo_start,promo_end,is_archive,image_url,image_public_id)
		values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning `+menuColumns,
		input.Name, input.Description, input.Price, input.CategoryID, input.Promo, input.Stock,
		input.PromoPrice, input.PromoStart, input.PromoEnd, input.IsArchive, input.Images, input.ImagePublicID))
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) updateMenu(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var input menuInput
	if !decodeJSON(w, r, &input) || input.Name == "" || input.Price < 0 || input.Stock < 0 {
		return
	}
	item, err := scanMenu(s.DB.QueryRow(r.Context(), `update menus set
		name_menu=$1,description=$2,price=$3,category_id=$4,promo=$5,stock=$6,
		promo_price=$7,promo_start=$8,promo_end=$9,is_archive=$10,image_url=coalesce(nullif($11,''),image_url),
		image_public_id=coalesce($12,image_public_id),updated_at=now()
		where id=$13 and is_deleted=false returning `+menuColumns,
		input.Name, input.Description, input.Price, input.CategoryID, input.Promo, input.Stock,
		input.PromoPrice, input.PromoStart, input.PromoEnd, input.IsArchive, input.Images, input.ImagePublicID, id))
	if err != nil {
		writeError(w, http.StatusNotFound, "menu tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) deleteMenu(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	_, err := s.DB.Exec(r.Context(), `update menus set is_deleted=true,updated_at=now() where id=$1`, id)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) uploadMenuImage(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file gambar diperlukan")
		return
	}
	defer file.Close()
	asset, err := s.Cloudinary.Upload(r.Context(), header.Filename, file, fmt.Sprintf("savoria/menu/%d", id))
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	_, err = s.DB.Exec(r.Context(), `update menus set image_public_id=$1,image_url=$2,updated_at=now() where id=$3`, asset.PublicID, asset.SecureURL, id)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"image_public_id": asset.PublicID, "images": asset.SecureURL})
}

func (s *Server) uploadLooseMenuImage(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file gambar diperlukan")
		return
	}
	defer file.Close()
	publicID := r.URL.Query().Get("public_id")
	if publicID == "" {
		writeError(w, http.StatusBadRequest, "public_id diperlukan")
		return
	}
	asset, err := s.Cloudinary.Upload(r.Context(), header.Filename, file, "savoria/menu/"+publicID)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"image_public_id": asset.PublicID, "publicUrl": asset.SecureURL})
}
