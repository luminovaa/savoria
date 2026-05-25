# Savoria Context

## Architecture

- `mobile/` is the Expo Android POS application. Its native project is `mobile/android/`.
- `backend/` is the Go HTTP API built with `chi` and `pgx/v5`.
- PostgreSQL is the only transactional database. Development uses native PostgreSQL 17; production connects to the existing PostgreSQL Docker service on the VPS.
- Cloudinary stores menu images. Upload and migration happen through the Go backend only.
- Supabase is a migration source only. It is no longer an application runtime or deployment target.

## Domain Rules

- Savoria is online-only. Never create an offline sale, local order queue, SQLite transaction cache, or sync status.
- A checkout is successful only after `POST /v1/orders/checkout` commits in PostgreSQL.
- `client_order_id` is mandatory and idempotent. Retrying it must not subtract stock twice.
- The server computes price, validates payment, locks stock rows, creates the invoice, stores items, and reduces stock inside one transaction.
- `Owner` manages users, catalog, shop data, reports, and images.
- `Kasir` can log in, read required POS data, checkout, read orders, and reprint confirmed receipts.
- No authenticated token means no POS data access.

## Security

- Never put `DATABASE_URL`, JWT secrets, Cloudinary API secret, Supabase database credentials, or any service-role key in `mobile/`.
- Mobile may receive only `EXPO_PUBLIC_API_URL`; access and refresh tokens are stored with `expo-secure-store`.
- Keep `.env` files local; commit only `.env.example` templates.
- Rotate/revoke old Supabase keys after final cutover because historic client env files contained a privileged key.

## Development Commands

```powershell
# Backend setup and migrations
Copy-Item backend/.env.example backend/.env
cd backend
go run ./cmd/migrate
go run ./cmd/api

# Mobile
Copy-Item mobile/.env.example mobile/.env
cd mobile
yarn install
yarn tsc --noEmit
yarn start

# Backend verification
cd backend
go test ./...
docker build -t savoria-api:local .
```

## Migration And Deployment

- Run `backend/cmd/import-supabase --dry-run` against a restored/local PostgreSQL target before any production cutover.
- Final cutover order: back up source and target, stop writes in the legacy app, migrate schema, run importer with `--apply`, compare counts/order totals/stock/images, deploy API, release mobile with the HTTPS API URL, then rotate Supabase credentials.
- Imported users keep UUID, email, role, and order ownership. Password hashes are never imported. Owner receives `IMPORT_OWNER_PASSWORD`; Kasir accounts are inactive until Owner assigns a new password.
- `deploy/compose.api.yml` runs only the Go API and joins the already existing PostgreSQL Docker network. It must not add or replace production database volumes.

## Agent Guidance

- Keep changes inside the new architecture; do not reintroduce Supabase SDK, RLS, Edge Functions, self-hosted Supabase, or offline sale infrastructure.
- Prefer versioned SQL migrations and integration tests for any schema or checkout behavior change.
