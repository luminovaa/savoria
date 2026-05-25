package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	dir := "migrations"
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}
	files, err := filepath.Glob(filepath.Join(dir, "*.up.sql"))
	if err != nil {
		log.Fatal(err)
	}
	sort.Strings(files)
	conn, err := pgx.Connect(context.Background(), databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close(context.Background())
	if _, err = conn.Exec(context.Background(), `create table if not exists schema_migrations(version text primary key, applied_at timestamptz not null default now())`); err != nil {
		log.Fatal(err)
	}
	for _, path := range files {
		version := filepath.Base(path)
		var exists bool
		_ = conn.QueryRow(context.Background(), `select exists(select 1 from schema_migrations where version=$1)`, version).Scan(&exists)
		if exists {
			continue
		}
		sql, err := os.ReadFile(path)
		if err != nil {
			log.Fatal(err)
		}
		tx, err := conn.Begin(context.Background())
		if err != nil {
			log.Fatal(err)
		}
		if _, err = tx.Exec(context.Background(), string(sql)); err == nil {
			_, err = tx.Exec(context.Background(), `insert into schema_migrations(version) values($1)`, version)
		}
		if err != nil {
			_ = tx.Rollback(context.Background())
			log.Fatal(err)
		}
		if err = tx.Commit(context.Background()); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("applied %s\n", version)
	}
}
