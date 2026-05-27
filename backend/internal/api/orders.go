package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type checkoutItem struct {
	MenuID   int64 `json:"menu_id"`
	Quantity int   `json:"quantity"`
}

type checkoutInput struct {
	ClientOrderID string         `json:"client_order_id"`
	Items         []checkoutItem `json:"items"`
	PaymentType   string         `json:"payment_type"`
	Paid          *float64       `json:"paid"`
}

type checkoutResult struct {
	OrderID       string  `json:"order_id"`
	InvoiceNumber string  `json:"invoice_number"`
	TotalAmount   float64 `json:"total_amount"`
	Changes       float64 `json:"changes"`
	Status        string  `json:"status"`
}

func (s *Server) checkout(w http.ResponseWriter, r *http.Request) {
	var input checkoutInput
	if !decodeJSON(w, r, &input) || input.ClientOrderID == "" || len(input.Items) == 0 ||
		(input.PaymentType != "cash" && input.PaymentType != "qris") {
		writeError(w, http.StatusBadRequest, "checkout tidak valid")
		return
	}
	tx, err := s.DB.BeginTx(r.Context(), pgx.TxOptions{})
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer tx.Rollback(r.Context())

	// Serialize retries for the same client request before checking idempotency.
	_, err = tx.Exec(r.Context(), `select pg_advisory_xact_lock(hashtext($1))`, input.ClientOrderID)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	var existing checkoutResult
	err = tx.QueryRow(r.Context(), `select id,invoice_number,total_amount,changes,status from orders where client_order_id=$1`, input.ClientOrderID).
		Scan(&existing.OrderID, &existing.InvoiceNumber, &existing.TotalAmount, &existing.Changes, &existing.Status)
	if err == nil {
		writeJSON(w, http.StatusOK, existing)
		return
	}
	type priced struct {
		MenuID    int64
		Quantity  int
		UnitPrice float64
	}
	lines := make([]priced, 0, len(input.Items))
	totalItems := 0
	totalAmount := 0.0
	for _, requested := range input.Items {
		if requested.Quantity <= 0 {
			writeError(w, http.StatusBadRequest, "jumlah item tidak valid")
			return
		}
		var name string
		var price float64
		var stock int
		err = tx.QueryRow(r.Context(), `select name_menu,
			case when promo and promo_price is not null and current_date between promo_start and promo_end then promo_price else price end,
			stock from menus where id=$1 and is_deleted=false and is_archive=false for update`, requested.MenuID).
			Scan(&name, &price, &stock)
		if err != nil {
			writeError(w, http.StatusConflict, "menu tidak tersedia")
			return
		}
		if stock < requested.Quantity {
			writeError(w, http.StatusConflict, fmt.Sprintf("stok %s tidak cukup", name))
			return
		}
		totalItems += requested.Quantity
		totalAmount += price * float64(requested.Quantity)
		lines = append(lines, priced{MenuID: requested.MenuID, Quantity: requested.Quantity, UnitPrice: price})
	}
	changes := 0.0
	if input.PaymentType == "cash" {
		if input.Paid == nil || *input.Paid < totalAmount {
			writeError(w, http.StatusBadRequest, "pembayaran tidak mencukupi")
			return
		}
		changes = *input.Paid - totalAmount
	}

	dateKey := time.Now().Format("20060102")
	_, err = tx.Exec(r.Context(), `select pg_advisory_xact_lock(hashtext($1))`, dateKey)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	var sequence int
	_ = tx.QueryRow(r.Context(), `select count(*)+1 from orders where created_at >= current_date and created_at < current_date + interval '1 day'`).Scan(&sequence)
	invoice := fmt.Sprintf("INV-%s-%04d", dateKey, sequence)
	var orderID string
	err = tx.QueryRow(r.Context(), `insert into orders(client_order_id,invoice_number,total,total_amount,paid,changes,user_id,payment_type,status)
		values($1,$2,$3,$4,$5,$6,$7,$8,'completed') returning id`,
		input.ClientOrderID, invoice, totalItems, totalAmount, input.Paid, changes, currentUser(r).UserID, input.PaymentType).Scan(&orderID)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	for _, line := range lines {
		if _, err = tx.Exec(r.Context(), `insert into order_items(order_id,menu_id,quantity,price,subtotal) values($1,$2,$3,$4,$5)`,
			orderID, line.MenuID, line.Quantity, line.UnitPrice, line.UnitPrice*float64(line.Quantity)); err != nil {
			conflictOrServer(w, err)
			return
		}
		if _, err = tx.Exec(r.Context(), `update menus set stock=stock-$1,updated_at=now() where id=$2`, line.Quantity, line.MenuID); err != nil {
			conflictOrServer(w, err)
			return
		}
	}
	if err = tx.Commit(r.Context()); err != nil {
		conflictOrServer(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, checkoutResult{OrderID: orderID, InvoiceNumber: invoice, TotalAmount: totalAmount, Changes: changes, Status: "completed"})
}

func (s *Server) listOrders(w http.ResponseWriter, r *http.Request) {
	limit := parseBoundedInt(r.URL.Query().Get("limit"), 500, 1, 500)
	offset := parseBoundedInt(r.URL.Query().Get("offset"), 0, 0, 1000000)
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))

	where := ""
	args := []any{limit, offset}
	if month >= 1 && month <= 12 && year >= 2000 && year <= 2100 {
		start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
		end := start.AddDate(0, 1, 0)
		where = "where o.created_at >= $3 and o.created_at < $4"
		args = append(args, start, end)
	}

	rows, err := s.DB.Query(r.Context(), fmt.Sprintf(`select o.id,o.created_at,o.invoice_number,o.total,o.total_amount,o.payment_type,o.status,o.user_id,u.full_name
		from orders o join users u on u.id=o.user_id %s order by o.created_at desc limit $1 offset $2`, where), args...)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer rows.Close()
	result := []map[string]any{}
	for rows.Next() {
		var id, invoice, payment, status, userID, fullName string
		var created time.Time
		var total int
		var amount float64
		_ = rows.Scan(&id, &created, &invoice, &total, &amount, &payment, &status, &userID, &fullName)
		result = append(result, map[string]any{"id": id, "created_at": created, "invoice_number": invoice,
			"total": total, "total_amount": amount, "payment_type": payment, "status": status, "user_id": userID,
			"user": map[string]string{"full_name": fullName}})
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) orderStats(w http.ResponseWriter, r *http.Request) {
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	now := time.Now()
	if month < 1 || month > 12 {
		month = int(now.Month())
	}
	if year < 2000 || year > 2100 {
		year = now.Year()
	}

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	todayEnd := todayStart.AddDate(0, 0, 1)
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	monthEnd := monthStart.AddDate(0, 1, 0)
	yearStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.Local)
	yearEnd := yearStart.AddDate(1, 0, 0)

	var todayOrders int
	var todayRevenue, monthlyRevenue, yearlyRevenue float64
	err := s.DB.QueryRow(r.Context(), `select count(*), coalesce(sum(total_amount),0)
		from orders where created_at >= $1 and created_at < $2 and lower(status) <> 'cancelled'`, todayStart, todayEnd).
		Scan(&todayOrders, &todayRevenue)
	if err != nil {
		conflictOrServer(w, err)
		return
	}

	if currentUser(r).Role == "Owner" {
		err = s.DB.QueryRow(r.Context(), `select coalesce(sum(total_amount),0)
			from orders where created_at >= $1 and created_at < $2 and lower(status) <> 'cancelled'`, monthStart, monthEnd).
			Scan(&monthlyRevenue)
		if err != nil {
			conflictOrServer(w, err)
			return
		}
		err = s.DB.QueryRow(r.Context(), `select coalesce(sum(total_amount),0)
			from orders where created_at >= $1 and created_at < $2 and lower(status) <> 'cancelled'`, yearStart, yearEnd).
			Scan(&yearlyRevenue)
		if err != nil {
			conflictOrServer(w, err)
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"today_orders":    todayOrders,
		"today_revenue":   todayRevenue,
		"monthly_revenue": monthlyRevenue,
		"yearly_revenue":  yearlyRevenue,
	})
}

func parseBoundedInt(value string, fallback int, min int, max int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if parsed < min {
		return min
	}
	if parsed > max {
		return max
	}
	return parsed
}

func (s *Server) getOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var order map[string]any
	var orderID, invoice, payment, status, userID, fullName string
	var created time.Time
	var total int
	var amount, paid, changes float64
	err := s.DB.QueryRow(r.Context(), `select o.id,o.created_at,o.invoice_number,o.total,o.total_amount,coalesce(o.paid,0),o.changes,o.payment_type,o.status,o.user_id,u.full_name
		from orders o join users u on u.id=o.user_id where o.id=$1`, id).
		Scan(&orderID, &created, &invoice, &total, &amount, &paid, &changes, &payment, &status, &userID, &fullName)
	if err != nil {
		writeError(w, http.StatusNotFound, "order tidak ditemukan")
		return
	}
	itemsRows, err := s.DB.Query(r.Context(), `select oi.id,oi.menu_id,oi.quantity,oi.price,oi.subtotal,m.name_menu,m.image_url from order_items oi join menus m on m.id=oi.menu_id where oi.order_id=$1`, id)
	if err != nil {
		conflictOrServer(w, err)
		return
	}
	defer itemsRows.Close()
	items := []map[string]any{}
	for itemsRows.Next() {
		var itemID, name, image string
		var menuID int64
		var quantity int
		var price, subtotal float64
		_ = itemsRows.Scan(&itemID, &menuID, &quantity, &price, &subtotal, &name, &image)
		items = append(items, map[string]any{"id": itemID, "menu_id": menuID, "quantity": quantity, "price": price, "subtotal": subtotal, "menu": map[string]any{"id": menuID, "name_menu": name, "images": image}})
	}
	order = map[string]any{"id": orderID, "created_at": created, "invoice_number": invoice, "total": total,
		"total_amount": amount, "paid": paid, "changes": changes, "payment_type": payment, "status": status,
		"user_id": userID, "user": map[string]string{"full_name": fullName}, "items": items}
	writeJSON(w, http.StatusOK, order)
}
