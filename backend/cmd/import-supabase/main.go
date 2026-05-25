package main

import (
	"context"
	"crypto/rand"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"

	"savoria/backend/internal/media"
	"savoria/backend/internal/security"
)

type importer struct {
	source     *pgx.Conn
	target     *pgx.Conn
	cloudinary media.Cloudinary
	apply      bool
	ownerPass  string
}

func main() {
	apply := flag.Bool("apply", false, "write imported records to target database")
	dryRun := flag.Bool("dry-run", false, "inspect counts and validate source without writes")
	flag.Parse()
	if *apply == *dryRun {
		log.Fatal("choose exactly one of --dry-run or --apply")
	}
	sourceURL, targetURL := os.Getenv("SOURCE_DATABASE_URL"), os.Getenv("DATABASE_URL")
	if sourceURL == "" || targetURL == "" {
		log.Fatal("SOURCE_DATABASE_URL and DATABASE_URL are required")
	}
	if *apply && len(os.Getenv("IMPORT_OWNER_PASSWORD")) < 8 {
		log.Fatal("IMPORT_OWNER_PASSWORD minimal 8 karakter untuk --apply")
	}
	ctx := context.Background()
	source, err := pgx.Connect(ctx, sourceURL)
	if err != nil {
		log.Fatal(err)
	}
	defer source.Close(ctx)
	target, err := pgx.Connect(ctx, targetURL)
	if err != nil {
		log.Fatal(err)
	}
	defer target.Close(ctx)
	run := importer{
		source: source, target: target, apply: *apply, ownerPass: os.Getenv("IMPORT_OWNER_PASSWORD"),
		cloudinary: media.Cloudinary{CloudName: os.Getenv("CLOUDINARY_CLOUD_NAME"), APIKey: os.Getenv("CLOUDINARY_API_KEY"), APISecret: os.Getenv("CLOUDINARY_API_SECRET")},
	}
	if err := run.execute(ctx); err != nil {
		log.Fatal(err)
	}
}

func (i importer) execute(ctx context.Context) error {
	sourceTables := []string{"role", "profiles", "category", "menu", "shop", "orders", "order_items"}
	fmt.Println("Supabase source audit")
	for _, table := range sourceTables {
		var count int64
		if err := i.source.QueryRow(ctx, `select count(*) from public.`+table).Scan(&count); err != nil {
			return fmt.Errorf("read %s: %w", table, err)
		}
		fmt.Printf("  %-14s %d\n", table, count)
	}
	var sourceOrders int64
	var sourceTotal float64
	if err := i.source.QueryRow(ctx, `select count(*),coalesce(sum(total_amount),0) from public.orders`).Scan(&sourceOrders, &sourceTotal); err != nil {
		return fmt.Errorf("read source totals: %w", err)
	}
	fmt.Printf("  order_total     rows=%d amount=%.2f\n", sourceOrders, sourceTotal)
	var brokenItems, brokenOrders int64
	_ = i.source.QueryRow(ctx, `select count(*) from public.order_items oi left join public.orders o on o.id=oi.order_id left join public.menu m on m.id=oi.menu_id where o.id is null or m.id is null`).Scan(&brokenItems)
	_ = i.source.QueryRow(ctx, `select count(*) from public.orders o left join public.profiles p on p.id=o.user_id where p.id is null`).Scan(&brokenOrders)
	fmt.Printf("  invalid_items  %d\n  invalid_orders %d\n", brokenItems, brokenOrders)
	if brokenItems > 0 || brokenOrders > 0 {
		return fmt.Errorf("relasi source tidak valid; import dihentikan")
	}
	if !i.apply {
		fmt.Println("dry-run selesai; tidak ada perubahan target")
		return nil
	}
	if !i.cloudinary.Ready() {
		return fmt.Errorf("Cloudinary credentials diperlukan untuk migrasi gambar")
	}
	tx, err := i.target.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = i.importUsers(ctx, tx); err != nil {
		return err
	}
	if err = i.importCategories(ctx, tx); err != nil {
		return err
	}
	if err = i.importMenus(ctx, tx); err != nil {
		return err
	}
	if err = i.copySimple(ctx, tx); err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	var targetOrders int64
	var targetTotal float64
	if err := i.target.QueryRow(ctx, `select count(*),coalesce(sum(total_amount),0) from orders`).Scan(&targetOrders, &targetTotal); err != nil {
		return err
	}
	fmt.Printf("target order_total rows=%d amount=%.2f\n", targetOrders, targetTotal)
	if targetOrders != sourceOrders || targetTotal != sourceTotal {
		return fmt.Errorf("validasi order target tidak sama dengan source")
	}
	fmt.Println("apply selesai; validasi order cocok, lanjutkan cek stok/gambar dan login Owner")
	return nil
}

func (i importer) importUsers(ctx context.Context, tx pgx.Tx) error {
	rows, err := i.source.Query(ctx, `select p.id,u.email,coalesce(p.first_name,''),coalesce(p.last_name,''),p.role_id,u.created_at from public.profiles p join auth.users u on u.id=p.id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, email, first, last string
		var role int16
		var created any
		if err := rows.Scan(&id, &email, &first, &last, &role, &created); err != nil {
			return err
		}
		password := i.ownerPass
		active, mustChange := role == 1, role != 1
		if role != 1 {
			buffer := make([]byte, 32)
			_, _ = rand.Read(buffer)
			password = fmt.Sprintf("%x", buffer)
		}
		hash, err := security.HashPassword(password)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `insert into users(id,email,password_hash,first_name,last_name,role_id,active,must_change_password,created_at)
			values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(id) do update set email=excluded.email,first_name=excluded.first_name,last_name=excluded.last_name,role_id=excluded.role_id`,
			id, email, hash, first, last, role, active, mustChange, created)
		if err != nil {
			return err
		}
	}
	return rows.Err()
}

func (i importer) importCategories(ctx context.Context, tx pgx.Tx) error {
	rows, err := i.source.Query(ctx, `select id,name_category,created_at,updated_at from public.category`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var name string
		var created, updated any
		if err := rows.Scan(&id, &name, &created, &updated); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `insert into categories(id,name_category,created_at,updated_at) values($1,$2,$3,$4) on conflict(id) do update set name_category=excluded.name_category`, id, name, created, updated); err != nil {
			return err
		}
	}
	return nil
}

func (i importer) importMenus(ctx context.Context, tx pgx.Tx) error {
	rows, err := i.source.Query(ctx, `select id,name_menu,description,price,category_id,coalesce(images,''),promo,stock,promo_price,promo_start,promo_end,is_deleted,is_archive,created_at,updated_at from public.menu`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var name string
		var description, imageURL, promoStart, promoEnd *string
		var price float64
		var categoryID *int64
		var promo, deleted, archived bool
		var stock int
		var promoPrice *float64
		var created, updated any
		if err := rows.Scan(&id, &name, &description, &price, &categoryID, &imageURL, &promo, &stock, &promoPrice, &promoStart, &promoEnd, &deleted, &archived, &created, &updated); err != nil {
			return err
		}
		finalURL, publicID := "", ""
		if imageURL != nil && strings.TrimSpace(*imageURL) != "" {
			response, err := http.Get(*imageURL)
			if err != nil || response.StatusCode >= 300 {
				return fmt.Errorf("download gambar menu %d gagal", id)
			}
			asset, err := i.cloudinary.Upload(ctx, fmt.Sprintf("menu-%d", id), io.LimitReader(response.Body, 20<<20), fmt.Sprintf("savoria/menu/%d", id))
			response.Body.Close()
			if err != nil {
				return fmt.Errorf("upload gambar menu %d: %w", id, err)
			}
			finalURL, publicID = asset.SecureURL, asset.PublicID
		}
		_, err := tx.Exec(ctx, `insert into menus(id,name_menu,description,price,category_id,image_public_id,image_url,promo,stock,promo_price,promo_start,promo_end,is_deleted,is_archive,created_at,updated_at)
			values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) on conflict(id) do update set image_public_id=excluded.image_public_id,image_url=excluded.image_url`,
			id, name, description, price, categoryID, nullable(publicID), finalURL, promo, stock, promoPrice, promoStart, promoEnd, deleted, archived, created, updated)
		if err != nil {
			return err
		}
	}
	return nil
}

func (i importer) copySimple(ctx context.Context, tx pgx.Tx) error {
	statements := []struct {
		query  string
		insert string
	}{
		{`select id,name,address,phone,wifi_name,wifi_password,created_at,updated_at from public.shop`, `insert into shops(id,name,address,phone,wifi_name,wifi_password,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing`},
		{`select id,'import-' || id::text,invoice_number,total,total_amount,paid,changes,user_id,payment_type,status,created_at from public.orders`, `insert into orders(id,client_order_id,invoice_number,total,total_amount,paid,changes,user_id,payment_type,status,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict(id) do nothing`},
		{`select id,order_id,menu_id,quantity,subtotal,price,created_at from public.order_items`, `insert into order_items(id,order_id,menu_id,quantity,subtotal,price,created_at) values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do nothing`},
	}
	for _, task := range statements {
		rows, err := i.source.Query(ctx, task.query)
		if err != nil {
			return err
		}
		for rows.Next() {
			values, err := rows.Values()
			if err != nil {
				rows.Close()
				return err
			}
			if _, err = tx.Exec(ctx, task.insert, values...); err != nil {
				rows.Close()
				return err
			}
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
	}
	_, _ = tx.Exec(ctx, `select setval(pg_get_serial_sequence('categories','id'), coalesce((select max(id) from categories),1), true)`)
	_, _ = tx.Exec(ctx, `select setval(pg_get_serial_sequence('menus','id'), coalesce((select max(id) from menus),1), true)`)
	return nil
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}
