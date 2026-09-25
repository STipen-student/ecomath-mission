# Panduan Deploy — Ecomath Mission

Panduan yang bisa diikuti sambil duduk di depan komputer. Selesai dalam sekitar
30–45 menit untuk pertama kali.

Sistem ini terdiri dari **dua bagian yang di-deploy terpisah**:

| Bagian | Isinya | Butuh apa |
|---|---|---|
| `client/` | Halaman depan, halaman siswa, halaman guru | Host **statis** |
| `server/` | API, mesin skoring, database | Host **Node.js** + PostgreSQL |

Halaman guru tidak menambah kebutuhan server baru — ia hanya satu berkas HTML
lagi di host statis yang sama.

---

## Sebelum mulai

Siapkan tiga akun gratis (semuanya bisa mendaftar dengan akun GitHub):

- **GitHub** — menyimpan kode
- **Railway** — menjalankan backend + PostgreSQL
- **Vercel** *atau* **Cloudflare Pages** — menyajikan halaman

Lalu unggah kode ke GitHub:

```bash
git init
git add .
git commit -m "Ecomath Mission"
git branch -M main
git remote add origin https://github.com/USERNAME/ecomath-mission.git
git push -u origin main
```

> **Periksa dulu** bahwa berkas `.env` TIDAK ikut ter-push. Jalankan
> `git status --porcelain | findstr .env` (Windows) — bila `.env` muncul,
> berhenti dan periksa `.gitignore`.

---

## Bagian 1 — Backend di Railway

### 1.1 Ganti provider database ke PostgreSQL

Kerjakan ini di komputermu **sebelum** deploy, lalu commit hasilnya:

```bash
cd server
npm run db:use-postgres
git add prisma/schema.prisma
git commit -m "Pakai PostgreSQL untuk produksi"
git push
```

Perintah itu hanya menukar satu baris `provider` pada `prisma/schema.prisma`.
Skema sengaja ditulis pada subset yang didukung SQLite maupun PostgreSQL, jadi
tidak ada model yang perlu diubah.

### 1.2 Buat proyek dan database

1. Buka `railway.app` → **New Project** → **Deploy from GitHub repo** → pilih repositorimu.
2. Pada service yang terbuat, buka **Settings** → **Root Directory** → isi `server`.
3. Kembali ke halaman proyek → **New** → **Database** → **Add PostgreSQL**.

### 1.3 Isi environment variable

Buka service backend → tab **Variables**, lalu tambahkan:

| Nama | Nilai |
|---|---|
| `DATABASE_URL` | Klik **Add a Variable Reference** → pilih `DATABASE_URL` dari service Postgres |
| `ADMIN_API_KEY` | Nilai acak minimal 16 karakter (cara membuatnya di bawah) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Kosongkan dulu — diisi setelah Bagian 2 |

Membuat kunci acak:

```bash
openssl rand -base64 24
```

Di Windows PowerShell:

```bash
powershell -Command "[Convert]::ToBase64String((1..24|%{Get-Random -Max 256}))"
```

> Simpan kunci ini baik-baik. Inilah yang dipakai membuka halaman guru.

### 1.4 Atur perintah start

Buka **Settings** → **Deploy** → **Custom Start Command**, isi dengan:

```bash
npm run start:prod
```

**Ini langkah paling penting dan paling mudah terlewat.** Perintah itu menyiapkan
tabel database lebih dulu, baru menjalankan server.

> **Mengapa tidak `prisma migrate deploy`?** Berkas migrasi di repositori ini
> dihasilkan untuk SQLite dan memuat tipe `DATETIME` serta `REAL` yang tidak
> dikenal PostgreSQL — perintah itu akan gagal. `npm run start:prod` memakai
> `prisma db push`, yang menyusun tabel langsung dari `schema.prisma` sehingga
> cocok untuk kedua provider. Pada deploy berikutnya, bila skema tidak berubah,
> perintah ini selesai seketika tanpa menyentuh data.

### 1.5 Deploy dan uji

Railway akan membangun otomatis. Setelah selesai, buka **Settings** →
**Networking** → **Generate Domain**. Catat alamatnya, misalnya
`https://ecomath-production.up.railway.app`.

Uji:

```bash
curl https://ALAMAT-RAILWAY-MU/health
```

Harus menjawab `{"status":"ok","scoringVersion":"1.0.0","env":"production"}`.

Kalau gagal, buka tab **Deployments** → **View Logs**. Server sengaja menolak
start dengan pesan jelas bila ada environment variable yang salah, jadi
pesannya biasanya langsung menunjuk penyebabnya.

---

## Bagian 2 — Halaman di Vercel atau Cloudflare Pages

Pilih **salah satu**. Keduanya gratis dan hasilnya sama.

### Opsi A — Vercel

1. Buka `vercel.com` → **Add New** → **Project** → pilih repositorimu.
2. **Root Directory**: `client`
3. **Framework Preset**: Vite (biasanya terdeteksi otomatis)
4. **Environment Variables**: tambahkan `VITE_API_URL` berisi alamat Railway
   (tanpa garis miring di akhir).
5. **Deploy**.

### Opsi B — Cloudflare Pages

1. Buka `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pilih repositorimu.
2. Isi pengaturan build:
   - **Framework preset**: None
   - **Root directory**: `client`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. **Environment variables** → tambahkan `VITE_API_URL` berisi alamat Railway.
4. **Save and Deploy**.

> **`VITE_API_URL` dibaca saat BUILD, bukan saat halaman dibuka.** Kalau kamu
> mengubahnya nanti, kamu harus men-deploy ulang halaman — mengubah variabel
> saja tidak cukup.

> **Jangan pernah menaruh `ADMIN_API_KEY` di sini.** Seluruh variabel berawalan
> `VITE_` ikut terkompilasi ke berkas JavaScript yang dapat dibaca siapa pun,
> termasuk siswa.

---

## Bagian 3 — Sambungkan keduanya (CORS)

Kembali ke Railway → service backend → **Variables**, isi `CORS_ORIGIN` dengan
alamat halamanmu, **persis** termasuk `https://` dan tanpa garis miring di akhir:

```
https://ecomath-mission.vercel.app
```

Railway akan men-deploy ulang otomatis.

Server sengaja **menolak start** di production bila `CORS_ORIGIN` kosong atau
berisi `*`. Ini disengaja: backend yang menerima permintaan dari mana saja akan
membiarkan siapa pun mengirim data palsu ke dalam data penelitianmu.

---

## Bagian 4 — Uji dari ujung ke ujung

Lakukan ini **sebelum** dipakai ke siswa sungguhan:

1. Buka alamat halamanmu dari **HP**, bukan hanya laptop yang dipakai membangun.
2. Klik **MASUK SISWA**, kerjakan satu level penuh sampai muncul skor.
3. Buka `ALAMAT-MU/guru.html`, masukkan `ADMIN_API_KEY`, pastikan pekerjaan tadi
   muncul di tabel.
4. Klik sel level tersebut — pastikan jejak penilaian dan jawaban refleksi terbaca.
5. Coba **Unduh skor (CSV)**, buka berkasnya di Excel.
6. Minta 1–2 rekan mencoba bersamaan untuk mensimulasikan kondisi kelas.

---

## Bagian 5 — Melindungi halaman guru (opsional, khusus Cloudflare)

Halaman `/guru.html` adalah berkas statis: siapa pun yang tahu alamatnya bisa
membukanya, meski isinya tetap terkunci kunci admin.

Bila memakai Cloudflare Pages, kamu bisa menambah lapisan kedua secara gratis:

1. **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. **Application domain**: domain Pages-mu, **Path**: `guru.html`
3. **Policy**: Action **Allow**, Include → **Emails** → masukkan alamat surelmu
4. Simpan.

Setelah itu halaman guru meminta login Cloudflare lebih dulu, baru kunci admin.

---

## Saat pengambilan data

- **Bersihkan data uji coba lebih dulu.** Di komputermu: `cd server && npm run db:reset`.
  Untuk database produksi, cara paling aman adalah menghapus service PostgreSQL di
  Railway lalu membuatnya lagi sebelum sesi pertama.
- Siapkan **kode kelas berbeda** untuk tiap kelas atau sesi, supaya data mudah dipilah.
- Railway tier gratis punya batas jam pemakaian bulanan — periksa dashboard sebelum
  masa pengambilan data, dan pertimbangkan upgrade sementara bila mepet.
- Siapkan cadangan luring (lembar soal cetak) bila internet sekolah bermasalah.

## Setelah selesai

1. Unduh CSV lewat halaman guru, atau jalankan `npm run export:csv` dari komputermu.
2. Periksa berkasnya di Excel — pastikan tidak ada baris yang hilang.
3. Simpan salinan di tempat aman (Drive terenkripsi / hard disk).
4. **Baru setelah itu** hapus data dari server dan matikan deployment, sesuai
   Checklist Keamanan dan Etika pada Panduan Deployment.

---

## Bila ada masalah

| Gejala | Penyebab yang paling sering | Yang harus diperiksa |
|---|---|---|
| Halaman putih | `VITE_API_URL` salah atau belum di-set saat build | Set variabelnya, lalu **deploy ulang** halaman |
| Error CORS di konsol peramban | `CORS_ORIGIN` tidak sama persis | Harus termasuk `https://`, tanpa garis miring di akhir |
| Backend gagal start | Environment variable kurang | Baca log Railway — pesannya menyebut variabel mana |
| Data tidak tersimpan | Tabel belum dibuat | Pastikan Custom Start Command `npm run start:prod` |
| Halaman guru menolak kunci | Kunci berbeda dari yang di Railway | Salin ulang dari tab Variables |
| `prisma migrate deploy` gagal | Migrasi dibuat untuk SQLite | Jangan pakai perintah itu — pakai `npm run start:prod` |

Untuk error yang tidak ada di tabel: salin pesan error **lengkap** (jangan
diringkas), lalu jalankan `claude` di folder proyek dan tempelkan sambil
menjelaskan langkah apa yang sedang kamu lakukan.
