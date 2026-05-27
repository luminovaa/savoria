package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
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
	_, err = pool.Exec(ctx, `insert into users(email,password_hash,full_name,role_id) values
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
		"payment_type": "cash", "paid": paid, "customer": "Budi",
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
	createMenu := call(f.server, http.MethodPost, "/v1/menus", f.kasir, map[string]any{"name_menu": "X", "price": 1, "stock": 1})
	if got := createMenu.Code; got != http.StatusCreated {
		t.Fatalf("kasir create menu = %d, want 201", got)
	}
	var created menu
	_ = json.NewDecoder(createMenu.Body).Decode(&created)
	if got := call(f.server, http.MethodPatch, "/v1/menus/"+strconv.FormatInt(created.ID, 10), f.kasir, map[string]any{"name_menu": "X Update", "price": 2, "stock": 2}).Code; got != http.StatusOK {
		t.Fatalf("kasir update menu = %d, want 200", got)
	}
	stockUpdate := call(f.server, http.MethodPatch, "/v1/menus/"+strconv.FormatInt(created.ID, 10)+"/stock", f.kasir, map[string]any{"operation": "add", "quantity": 3})
	if got := stockUpdate.Code; got != http.StatusOK {
		t.Fatalf("kasir add stock = %d, want 200", got)
	}
	stockUpdate = call(f.server, http.MethodPatch, "/v1/menus/"+strconv.FormatInt(created.ID, 10)+"/stock", f.kasir, map[string]any{"operation": "subtract", "quantity": 2})
	if got := stockUpdate.Code; got != http.StatusOK {
		t.Fatalf("kasir subtract stock = %d, want 200", got)
	}
	if got := call(f.server, http.MethodPatch, "/v1/menus/"+strconv.FormatInt(created.ID, 10)+"/stock", f.kasir, map[string]any{"operation": "subtract", "quantity": 999}).Code; got != http.StatusConflict {
		t.Fatalf("kasir over subtract stock = %d, want 409", got)
	}
	if got := call(f.server, http.MethodDelete, "/v1/menus/"+strconv.FormatInt(created.ID, 10), f.kasir, nil).Code; got != http.StatusNoContent {
		t.Fatalf("kasir delete menu = %d, want 204", got)
	}
	if got := call(f.server, http.MethodGet, "/v1/users", f.kasir, nil).Code; got != http.StatusOK {
		t.Fatalf("kasir list users = %d, want 200", got)
	}
	if got := call(f.server, http.MethodPost, "/v1/users", f.kasir, map[string]any{"email": "new@savoria.test", "full_name": "Kasir Baru", "password": "password-baru", "role_id": 2}).Code; got != http.StatusForbidden {
		t.Fatalf("kasir create user = %d, want 403", got)
	}
	if got := call(f.server, http.MethodGet, "/v1/users/00000000-0000-0000-0000-000000000000", f.kasir, nil).Code; got != http.StatusForbidden {
		t.Fatalf("kasir get user detail = %d, want 403", got)
	}
}

func TestListMenusSortsInBackend(t *testing.T) {
	f := fixture(t, 10)
	ctx := context.Background()
	var ownerID string
	if err := f.server.DB.QueryRow(ctx, `select id from users where email='owner@savoria.test'`).Scan(&ownerID); err != nil {
		t.Fatal(err)
	}

	var alphaID, zuluID int64
	if err := f.server.DB.QueryRow(ctx, `insert into menus(name_menu,price,stock,created_at) values('Alpha',10000,10,now() - interval '2 days') returning id`).Scan(&alphaID); err != nil {
		t.Fatal(err)
	}
	if err := f.server.DB.QueryRow(ctx, `insert into menus(name_menu,price,stock,created_at) values('Zulu',10000,10,now() - interval '1 day') returning id`).Scan(&zuluID); err != nil {
		t.Fatal(err)
	}

	az := call(f.server, http.MethodGet, "/v1/menus?sort=az", f.token, nil)
	if got := az.Code; got != http.StatusOK {
		t.Fatalf("sort az = %d, want 200", got)
	}
	var menus []menu
	_ = json.NewDecoder(az.Body).Decode(&menus)
	if len(menus) == 0 || menus[0].ID != alphaID {
		t.Fatalf("sort az first = %+v, want id %d", menus, alphaID)
	}

	za := call(f.server, http.MethodGet, "/v1/menus?sort=za", f.token, nil)
	if got := za.Code; got != http.StatusOK {
		t.Fatalf("sort za = %d, want 200", got)
	}
	menus = nil
	_ = json.NewDecoder(za.Body).Decode(&menus)
	if len(menus) == 0 || menus[0].ID != zuluID {
		t.Fatalf("sort za first = %+v, want id %d", menus, zuluID)
	}

	var completedOrderID, cancelledOrderID string
	if err := f.server.DB.QueryRow(ctx, `insert into orders(client_order_id,invoice_number,total,total_amount,user_id,payment_type,status) values('sort-completed','SORT-COMPLETED',5,50000,$1,'cash','completed') returning id`, ownerID).Scan(&completedOrderID); err != nil {
		t.Fatal(err)
	}
	if err := f.server.DB.QueryRow(ctx, `insert into orders(client_order_id,invoice_number,total,total_amount,user_id,payment_type,status) values('sort-cancelled','SORT-CANCELLED',99,990000,$1,'cash','cancelled') returning id`, ownerID).Scan(&cancelledOrderID); err != nil {
		t.Fatal(err)
	}
	if _, err := f.server.DB.Exec(ctx, `insert into order_items(order_id,menu_id,quantity,subtotal,price) values($1,$2,5,50000,10000),($3,$4,99,990000,10000)`, completedOrderID, alphaID, cancelledOrderID, zuluID); err != nil {
		t.Fatal(err)
	}

	best := call(f.server, http.MethodGet, "/v1/menus?sort=bestseller", f.token, nil)
	if got := best.Code; got != http.StatusOK {
		t.Fatalf("sort bestseller = %d, want 200", got)
	}
	menus = nil
	_ = json.NewDecoder(best.Body).Decode(&menus)
	if len(menus) == 0 || menus[0].ID != alphaID {
		t.Fatalf("sort bestseller first = %+v, want id %d", menus, alphaID)
	}
}

func TestCheckoutIdempotentAndValidatesPayment(t *testing.T) {
	f := fixture(t, 3)
	body := checkoutBody("same-order", f.menuID, 2, 50000)
	if got := call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, body).Code; got != http.StatusCreated {
		t.Fatalf("checkout = %d, want 201", got)
	}
	retry := call(f.server, http.MethodPost, "/v1/orders/checkout", f.token, body)
	if got := retry.Code; got != http.StatusOK {
		t.Fatalf("retry = %d, want 200", got)
	}
	var result checkoutResult
	_ = json.NewDecoder(retry.Body).Decode(&result)
	if result.Customer != "Budi" {
		t.Fatalf("retry customer = %q, want Budi", result.Customer)
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
	editOnly := map[string]any{"email": "kasir@savoria.test", "full_name": "Kasir Baru", "role_id": 2}
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
