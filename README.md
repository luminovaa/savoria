# Savoria POS

Savoria adalah aplikasi POS Android online-only dengan aplikasi Expo di `mobile/` dan API Go di `backend/`. PostgreSQL menyimpan transaksi dan Cloudinary menyimpan gambar menu. Supabase hosted lama hanya menjadi sumber migrasi satu kali, bukan runtime aplikasi baru.

## Struktur

```text
mobile/                  Expo app dan native Android project
backend/                 Go API, SQL migrations, dan import tool
deploy/compose.api.yml   API container production tanpa membuat database
```

## Aturan Operasional

- Kasir harus terhubung ke API untuk login, melihat data, checkout, dan mencetak transaksi baru.
- Checkout sah hanya sesudah backend mengonfirmasi order. Kegagalan jaringan tidak menghasilkan transaksi atau struk sukses.
- TanStack Query hanya menyimpan cache memory selama aplikasi berjalan.
- Token aplikasi disimpan di `expo-secure-store`; credential database, JWT secret, dan Cloudinary secret hanya berada di backend.

## Backend Lokal

Prasyarat: PostgreSQL 17 lokal, Go 1.23+, dan akun Cloudinary bila menguji upload gambar.

```powershell
Copy-Item backend/.env.example backend/.env
# Isi DATABASE_URL, ACCESS_TOKEN_SECRET, dan konfigurasi Cloudinary di backend/.env.
cd backend
go run ./cmd/migrate
go run ./cmd/api
```

API penting:

```text
POST /v1/auth/login        POST /v1/auth/refresh       GET /v1/auth/me
GET/POST/PATCH/DELETE /v1/users                       Owner only
GET/POST/PATCH/DELETE /v1/categories|menus            write Owner only
PUT /v1/shop               POST /v1/menus/{id}/image   Owner only
POST /v1/orders/checkout   GET /v1/orders/{id}
```

`POST /v1/orders/checkout` menerima `client_order_id`, `items`, `payment_type`, dan `paid`. Backend menghitung harga, mengunci stok, membuat invoice dan items, serta mengurangi stok dalam satu transaksi. Request dengan `client_order_id` yang sama mengembalikan order yang sama.

## Mobile Lokal

```powershell
Copy-Item mobile/.env.example mobile/.env
# Android emulator memakai EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
cd mobile
yarn install
npx tsc --noEmit
yarn start
```

Build production Android menggunakan profile release:

```powershell
cd mobile
eas build --platform android --profile production
```

Set `EXPO_PUBLIC_API_URL` ke URL HTTPS production pada environment EAS. Tidak ada Supabase URL/key pada build baru.

## Production VPS

PostgreSQL production diasumsikan sudah berjalan sebagai container existing. Compose berikut hanya menjalankan API Go dan bergabung ke Docker network database tersebut:

```powershell
Copy-Item backend/.env.example backend/.env
$env:POSTGRES_DOCKER_NETWORK="network_postgres_existing"
docker compose -f deploy/compose.api.yml build
docker compose -f deploy/compose.api.yml up -d
```

`PUBLIC_API_URL` harus berupa URL HTTPS di balik reverse proxy TLS. Batasi port API ke localhost/reverse proxy, atur firewall, monitor disk/database, simpan backup di lokasi terpisah, dan uji restore sebelum operasional.

## Migrasi Dari Supabase Hosted

Credential sumber hanya dimasukkan ke environment lokal atau host cutover, tidak ke repo:

```powershell
$env:SOURCE_DATABASE_URL="postgresql://..."
$env:DATABASE_URL="postgresql://..."
cd backend
go run ./cmd/import-supabase --dry-run

$env:IMPORT_OWNER_PASSWORD="password-awal-owner-yang-kuat"
$env:CLOUDINARY_CLOUD_NAME="..."
$env:CLOUDINARY_API_KEY="..."
$env:CLOUDINARY_API_SECRET="..."
go run ./cmd/import-supabase --apply
```

Importer mempertahankan UUID dan histori order, mengunggah ulang gambar menu ke Cloudinary dengan public ID stabil `savoria/menu/<id>`, menetapkan password awal Owner, dan menonaktifkan login Kasir sampai Owner mengatur password baru.

Prosedur cutover:

1. Backup Supabase hosted dan PostgreSQL target; verifikasi restore.
2. Hentikan transaksi pada aplikasi lama.
3. Jalankan migration SQL dan import final ke PostgreSQL VPS.
4. Validasi jumlah baris, total nilai order, stok, akun Owner, dan URL gambar Cloudinary.
5. Deploy API, build/release mobile dengan URL HTTPS baru.
6. Rotate/revoke key Supabase lama yang pernah ada di source/client.

## Verifikasi

```powershell
cd backend
go test ./...
docker build -t savoria-api:verify .

cd ..\mobile
npx tsc --noEmit
yarn lint
```

Uji role Owner/Kasir, kegagalan jaringan pada checkout, idempotensi `client_order_id`, stok paralel, upload gambar, dan cetak ulang hanya dari order yang telah tersimpan sebelum rilis.

Dokumentasi limit Cloudinary: [Pricing](https://cloudinary.com/pricing) dan [Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
