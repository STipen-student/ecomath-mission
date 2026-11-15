# Deploy ke Cloudflare (Workers + D1 + Pages)

Branch: `cloudflare-workers`. Biaya: tier gratis Cloudflare (Workers, D1, Pages).
Cek ulang batas tier gratis di halaman harga Cloudflare sebelum dipakai.

## Cara kerjanya

- **Backend** tetap aplikasi Express yang sama (`server/src/app.ts`), dijalankan
  di Cloudflare Workers lewat `httpServerHandler` (`server/src/worker.ts`).
- **Database** memakai D1 (SQLite milik Cloudflare). Prisma terhubung lewat
  `@prisma/adapter-d1`; tidak ada `DATABASE_URL`.
- **Frontend** di Cloudflare Pages, sama seperti sebelumnya.
- Mesin skoring, bank soal, Assessment as Learning, dan seluruh uji tidak berubah.

## Langkah deploy (dikerjakan sendiri, perlu akun Cloudflare)

Semua perintah dijalankan dari folder `server/`.

### 1. Login dan buat database

```bash
npx wrangler login
```

```bash
npx wrangler d1 create ecomath
```

Salin `database_id` dari hasil perintah itu ke `server/wrangler.jsonc`, ganti
`GANTI-DENGAN-ID-D1`.

### 2. Buat tabel di D1

```bash
npm run worker:migrate:remote
```

### 3. Isi kunci admin (rahasia)

```bash
npx wrangler secret put ADMIN_API_KEY
```

Masukkan nilai acak minimal 16 karakter. Jangan pernah menaruhnya di `vars` atau
di variabel `VITE_*`.

### 4. Deploy backend

```bash
npm run worker:deploy
```

Catat URL yang muncul, misalnya `https://ecomath-mission-api.<akun>.workers.dev`.
Buka `URL/health`; harus menjawab `{"status":"ok", ...}`.

### 5. Deploy frontend (Cloudflare Pages)

Di dashboard Cloudflare: Workers & Pages → Create → Pages → Connect to Git.

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = URL Worker dari langkah 4
- Branch produksi: pilih branch yang ingin dipakai siswa

### 6. Sambungkan keduanya

Ubah `CORS_ORIGIN` di `server/wrangler.jsonc` menjadi URL Pages (tanpa garis miring
di akhir), lalu jalankan `npm run worker:deploy` lagi.

## Uji lokal sebelum deploy

```bash
npm run worker:migrate:local
```

```bash
npm run worker:dev
```

Worker lokal berjalan di `http://localhost:8788`. Isi `server/.dev.vars`
(tidak di-commit) dengan `ADMIN_API_KEY=...` dan, bila perlu,
`CORS_ORIGIN=http://localhost:5173`.

## Perubahan tabel di masa depan

Prisma Migrate tidak dipakai untuk D1. Setelah `schema.prisma` berubah:

```bash
npx prisma migrate diff --from-local-d1 --to-schema-datamodel prisma/schema.prisma --script --output migrations-d1/0002_nama_perubahan.sql
```

Lalu terapkan dengan `npm run worker:migrate:local` dan `npm run worker:migrate:remote`.

## Yang perlu diketahui

- **Transaksi tidak didukung D1.** Kode saat ini tidak memakai `$transaction`,
  tetapi jangan menambahkannya tanpa memeriksa ulang.
- **Pembatas laju per isolat.** `express-rate-limit` menyimpan hitungan di memori
  satu isolat Workers, jadi batasnya lebih longgar daripada di satu server Node.
- **Skema ini memakai provider `sqlite`** (diperlukan D1). Untuk kembali ke Node +
  PostgreSQL, jalankan `npm run db:use-postgres` dan hapus `previewFeatures`.
- **Ekspor data** tetap lewat halaman guru (unduh CSV). Skrip `npm run export:csv`
  membaca database Node, bukan D1.
- Yang sudah diuji lokal (`wrangler dev`): `/health`, membuat sesi, mengambil soal,
  mengirim log, submit beserta skor dan kalibrasi AaL, ringkasan kelas, rekap skor,
  blueprint, dan penolakan tanpa kunci admin. **Belum** diuji di Cloudflare
  sungguhan dan belum diuji bersama frontend.
