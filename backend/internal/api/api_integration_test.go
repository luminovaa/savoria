package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"savoria/backend/internal/config"
	"savoria/backend/internal/security"
)

type integrationFixture struct {
	server *Server
	token  string
	kasir  string
	menuID int64
}

func fixture(t *testing.T, stock int) integrationFixture {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL tidak diset")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	sql, err := os.ReadFile(filepath.Join("..", "..", "migrations", "000001_init.up.sql"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, string(sql)); err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `truncate table order_items,orders,refresh_tokens,menus,categories,shops,users restart identity cascade`); err != nil {
		t.Fatal(err)
	}
	ownerHash, _ := security.HashPassword("password-owner")
	kasirHash, _ := security.HashPassword("password-kasir")
	var menuID int64
	_, err = pool.Exec(ctx, `insert into users(email,password_hash,first_name,role_id) values
		('owner@savoria.test',$1,'Owner',1),('kasir@savoria.test',$2,'Kasir',2)`, ownerHash, kasirHash)
	if err != nil {
		t.Fatal(err)
	}
	err = pool.QueryRow(ctx, `insert into menus(name_menu,price,stock) values('Kopi',10000,$1) returning id`, stock).Scan(&menuID)
	if err != nil {
		t.Fatal(err)
	}
	s := &Server{
		DB: pool, Config: config.Config{CORSOrigin: "*"},
		Tokens: security.NewManager("integration-test-secret-yang-panjang", time.Hour, time.Hour),
	}
	return integrationFixture{server: s, token: loginToken(t, s, "owner@savoria.test", "password-owner"), kasir: loginToken(t, s, "kasir@savoria.test", "password-kasir"), menuID: menuID}
}

func loginToken(t *testing.T, server *Server, email, password string) string {
	t.Helper()
	res := call(server, http.MethodPost, "/v1/auth/login", "", map[string]any{"email": email, "password": password})
	if res.Code != http.StatusOK {
		t.Fatalf("login gagal: %d %s", res.Code, res.Body.String())
	}
	var response authResponse
	_ = json.NewDecoder(res.Body).Decode(&response)
	return response.AccessToken
}

func call(server *Server, method, path, token string, body any) *httptest.ResponseRecorder {
	var buffer bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buffer).Encode(body)
	}
	request := httptest.NewRequest(method, path, &buffer)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	server.Router().ServeHTTP(response, request)
	return response
}

func checkoutBody(id string, menuID int64, quantity int, paid float64) map[string]any {
	return map[string]any{
		"client_order_id": id, "items": []map[string]any{{"menu_id": menuID, "quantity": quantity}},
		"payment_type": "cash", "paid": paid,
	}
}

func TestRoleAuthorization(t *testing.T) {
	f := fixture(t, 3)
	if got := call(f.server, http.MethodGet, "/v1/menus", "", nil).Code; got != http.StatusUnauthorized {
		t.Fatalf("anon menus = %d, want 401", got)
	}
	if got := call(f.server, http.MethodGet, "/v1/menus", f.kasir, nil).Code; got != http.StatusOK {
		t.Fatalf("kasir menus = %d, want 200", got)
	}
	if got := call(f.server, http.MethodPost, "/v1/menus", f.kasir, map[string]any{"name_menu": "X", "price": 1, "stock": 1}).Code; got != http.StatusForbidden {
		t.Fatalf("kasir create menu = %d, want 403", got)
	}
}

func TestCheckoutIdempotentAndValidatesPayment(t *testing.T) {
	f := fixture(t, 3)
	body := checkoutBody("same-order", f.menuID, 2, 50000)
	if got := call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, body).Code; got != http.StatusCreated {
		t.Fatalf("checkout = %d, want 201", got)
	}
	if got := call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, body).Code; got != http.StatusOK {
		t.Fatalf("retry = %d, want 200", got)
	}
	var stock, count int
	_ = f.server.DB.QueryRow(context.Background(), `select stock from menus where id=$1`, f.menuID).Scan(&stock)
	_ = f.server.DB.QueryRow(context.Background(), `select count(*) from orders`).Scan(&count)
	if stock != 1 || count != 1 {
		t.Fatalf("stock/order sesudah retry = %d/%d, want 1/1", stock, count)
	}
	if got := call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, checkoutBody("low-pay", f.menuID, 1, 1)).Code; got != http.StatusBadRequest {
		t.Fatalf("pembayaran kurang = %d, want 400", got)
	}
}

func TestConcurrentCheckoutDoesNotOversell(t *testing.T) {
	f := fixture(t, 1)
	codes := make(chan int, 2)
	var wait sync.WaitGroup
	for _, id := range []string{"parallel-a", "parallel-b"} {
		wait.Add(1)
		go func(clientID string) {
			defer wait.Done()
			codes <- call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, checkoutBody(clientID, f.menuID, 1, 10000)).Code
		}(id)
	}
	wait.Wait()
	close(codes)
	success, conflict := 0, 0
	for code := range codes {
		if code == http.StatusCreated {
			success++
		}
		if code == http.StatusConflict {
			conflict++
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatalf("parallel results success/conflict = %d/%d", success, conflict)
	}
}

func TestInactiveKasirActivatesOnlyAfterPasswordReset(t *testing.T) {
	f := fixture(t, 1)
	var id string
	if err := f.server.DB.QueryRow(context.Background(), `update users set active=false,must_change_password=true where email='kasir@savoria.test' returning id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	editOnly := map[string]any{"email": "kasir@savoria.test", "first_name": "Kasir Baru", "last_name": "", "role_id": 2}
	if got := call(f.server, http.MethodPatch, "/v1/users/"+id, f.token, editOnly).Code; got != http.StatusOK {
		t.Fatalf("edit kasir = %d, want 200", got)
	}
	var active bool
	_ = f.server.DB.QueryRow(context.Background(), `select active from users where id=$1`, id).Scan(&active)
	if active {
		t.Fatal("kasir nonaktif menjadi aktif tanpa reset password")
	}
	editOnly["password"] = "password-baru"
	if got := call(f.server, http.MethodPatch, "/v1/users/"+id, f.token, editOnly).Code; got != http.StatusOK {
		t.Fatalf("reset kasir = %d, want 200", got)
	}
	_ = f.server.DB.QueryRow(context.Background(), `select active from users where id=$1`, id).Scan(&active)
	if !active {
		t.Fatal("kasir belum aktif sesudah password ditetapkan Owner")
	}
}
