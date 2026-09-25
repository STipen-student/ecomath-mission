# Ecomath Mission: Sustainable City Challenge

Instrumen asesmen berbasis permainan untuk mengukur **kemampuan pemecahan masalah
matematis** siswa SMA pada materi **Sistem Pertidaksamaan Linear Dua Variabel
(SPtLDV)**, dalam konteks **SDG 11** (Kota dan Permukiman Berkelanjutan) dan
**SDG 13** (Penanganan Perubahan Iklim).

Sistem dibangun mengikuti kerangka **Evidence-Centered Design (ECD)**: setiap
interaksi siswa dicatat sebagai log terstruktur, lalu diskor otomatis dengan rubrik
0–3 pada empat klaim kompetensi — **K1** Memahami Masalah, **K2** Merencanakan
Penyelesaian, **K3** Melaksanakan Rencana, **K4** Memeriksa Kembali.

---

## Isi repositori

```
.
├── client/                 Front-end: Phaser 3 + TypeScript + Vite
│   ├── index.html            halaman depan + permainan siswa
│   └── guru.html             laporan kelas untuk guru
├── server/                 Back-end: Express + TypeScript + Prisma
├── docs/
│   ├── EcomathMission_ECD_Framework.docx     dokumen kerangka ECD (sumber)
│   ├── Panduan_Deployment_EcomathMission.docx panduan deployment (sumber)
│   ├── ECD_Framework.md                       versi teks dokumen ECD
│   ├── SCORING_SPEC.md      ← pemetaan rubrik → kode, seluruh ambang batas
│   ├── DEPLOY.md            ← langkah deploy, dapat diikuti sambil mengerjakan
│   └── EXPORT/
│       └── export_to_csv.ts  ekspor data ke CSV untuk SPSS/R/Jamovi
└── README.md
```

**Baca `docs/SCORING_SPEC.md` sebelum pengambilan data.** Dokumen itu memuat setiap
angka ambang batas, setiap keputusan operasional, dan setiap penyimpangan terhadap
dokumen ECD asli — termasuk perbaikan satu item yang aslinya tidak punya solusi.

---

## Prasyarat

| Kebutuhan | Versi | Cara memeriksa |
|---|---|---|
| Node.js | 20 LTS atau lebih baru | `node --version` |
| npm | ikut Node.js | `npm --version` |
| Git | apa saja | `git --version` |

Database **tidak perlu dipasang** untuk pengembangan lokal — SQLite dipakai sebagai
berkas biasa. PostgreSQL baru diperlukan saat deployment.

---

## Menjalankan secara lokal

Butuh **dua terminal**: satu untuk backend, satu untuk front-end.

### Terminal 1 — Backend

```bash
cd server
npm install
```

Salin berkas konfigurasi lalu isi nilainya:

```bash
cp .env.example .env
```

Buka `server/.env` dan isi **`ADMIN_API_KEY`** dengan nilai acak minimal 16 karakter.
Cara membuat nilai acak:

```bash
openssl rand -base64 24
```

Di Windows PowerShell:

```bash
powershell -Command "[Convert]::ToBase64String((1..24|%{Get-Random -Max 256}))"
```

Siapkan database dan jalankan server:

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Backend berjalan di `http://localhost:4000`. **Biarkan terminal ini tetap terbuka.**

Saat start, server memverifikasi seluruh 12 skenario — assembly rule dan daerah
penyelesaian tidak kosong. Bila ada task yang cacat, server **menolak start** dan
menyebutkan task mana yang bermasalah, bukan menunggu sampai siswa menemukannya.

### Terminal 2 — Front-end

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173` di peramban.

Berkas `client/.env` sudah menunjuk ke `http://localhost:4000` secara bawaan.
Ubah `VITE_API_URL` hanya bila backend Anda berjalan di alamat lain.

---

## Menguji

```bash
cd server
npm test
```

253 uji: rubrik K1–K4, umpan balik siswa, mesin matematis, integritas bank skenario, pemilihan soal adaptif, isolasi tutorial, dan alur HTTP
penuh. Uji rubrik memakai log sintetis dari tiga arketipe siswa — "sempurna",
"trial-error", dan "gagal total".

```bash
npm run typecheck    # server
cd ../client && npm run typecheck
```

---

## Perintah yang tersedia

### `server/`

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Jalankan backend dengan reload otomatis |
| `npm test` | Jalankan seluruh uji |
| `npm run build` | Kompilasi TypeScript ke `dist/` |
| `npm start` | Jalankan hasil build (dipakai di produksi) |
| `npm run db:migrate` | Buat dan terapkan migrasi (lokal) |
| `npm run db:deploy` | Terapkan migrasi tanpa membuat yang baru (produksi) |
| `npm run db:seed` | Verifikasi bank skenario; `-- --with-demo` menambah data contoh |
| `npm run db:studio` | Buka penjelajah database di peramban |
| `npm run db:reset` | **Hapus seluruh data** dan bangun ulang database |
| `npm run db:use-postgres` | Ubah provider Prisma ke PostgreSQL |
| `npm run db:use-sqlite` | Kembalikan provider ke SQLite |
| `npm run export:csv` | Ekspor data penelitian ke CSV |

### `client/`

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan Vite |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Pratinjau hasil build |

---

## API

| Metode | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/session` | Buat sesi siswa baru |
| `GET` | `/api/session/:id` | Status sesi (untuk memulihkan sesi terputus) |
| `GET` | `/api/task/:level` | Ambil task sesuai assembly rule level tersebut |
| `POST` | `/api/task/:attemptId/distractor` | Picu event kebijakan Level 4 |
| `POST` | `/api/log` | Terima satu event atau array event |
| `POST` | `/api/submit` | Submission akhir, menjalankan mesin skoring |
| `GET` | `/api/admin/summary` | Rekap kelas untuk halaman guru |
| `GET` | `/api/admin/student/:sessionId` | Laporan satu siswa: skor tiap level, profil K1–K4, kesimpulan |
| `GET` | `/api/admin/attempt/:id` | Rincian satu percobaan (jejak audit, refleksi, log) |
| `GET` | `/api/admin/results` | Rekap skor (`?format=csv`) |
| `GET` | `/api/admin/events` | Log mentah (`?format=csv`) |
| `GET` | `/api/admin/blueprint` | Item-Claim Blueprint bank soal |
| `POST` | `/api/admin/k4-override` | Koreksi manual skor K4 oleh rater kedua |
| `GET` | `/health` | Pemeriksaan kesehatan + versi rubrik |

Endpoint `/api/admin/*` memerlukan header `x-admin-key` berisi `ADMIN_API_KEY`.

Contoh mengunduh rekap skor:

```bash
curl -H "x-admin-key: KUNCI_ANDA" "http://localhost:4000/api/admin/results?format=csv" -o skor.csv
```

Kunci jawaban — titik optimum, nilai Z, opsi yang benar, dan isi event distraktor —
**tidak pernah** dikirim ke client. Hal ini dikunci oleh uji
`api.integration.test.ts` → *"TIDAK PERNAH mengirim kunci jawaban ke client"*.

---

## Umpan balik

### Untuk siswa

Setiap kali menyelesaikan satu level, siswa menerima profil empat klaim beserta
dua kalimat per klaim: **apa yang terjadi** pada pekerjaannya dan **langkah
berikutnya** yang konkret. Kalimatnya disusun `server/src/scoring/feedback.ts`
dari bukti nyata pekerjaan siswa, sehingga menyebut angka dan nama zona miliknya
sendiri — bukan template.

Deskriptor rubrik asli sengaja **tidak** ditampilkan ke siswa. Kalimat seperti
"boundary_violation_count sesuai ambang level" ditulis untuk peneliti dan tidak
dapat ditindaklanjuti siswa SMA. Deskriptor tetap dikirim server pada field
`rubric` dan dibaca guru di halaman laporan.

Di akhir sesi, siswa melihat profil rata-rata tiap tahap pemecahan masalah
lintas seluruh level, beserta tahap terkuat dan yang paling perlu dilatih.

### Untuk guru

Halaman terpisah pada alamat yang sama: **`/guru.html`**
(mis. `https://ecomath-mission.vercel.app/guru.html`). Halaman ini tidak
ditautkan dari halaman siswa; alamatnya diketik guru, dan isinya baru tampil
setelah kunci `ADMIN_API_KEY` dimasukkan.

Isinya:

| Bagian | Kegunaan |
|---|---|
| Kartu angka | Jumlah siswa, sesi selesai, level dikerjakan, berapa yang perlu tinjau K4 |
| Rata-rata per klaim | Beserta **sebaran** skor 0–3 — rata-rata sama bisa berarti dua kelas yang sangat berbeda |
| Rata-rata per level | K1–K4 dan jumlah skor tiap level |
| Tingkat kemudahan per soal | Diurutkan dari yang tersulit bagi kelas ini |
| Tabel pekerjaan siswa | Satu baris per siswa, satu sel per level, berwarna sesuai capaian |
| **Laporan per siswa** | Pilih nama dari dropdown atau klik namanya di tabel — skor tiap level, profil K1–K4, dan **satu kalimat kesimpulan** |
| Rincian per pekerjaan | Klik sel level atau tombol "Lihat rincian": jejak audit rubrik, jawaban refleksi siswa, pola kerja |
| Peninjauan K4 | Baca tulisan siswa, koreksi skor K4, beri catatan |
| Unduh CSV | Skor dan log yang sudah diterjemahkan, langsung dari peramban |

**Laporan per siswa** merangkum seluruh level yang dikerjakan satu siswa dalam
satu tampilan — bukan sekadar menumpuk skor tiap level, tetapi merata-ratakan
tiap klaim (K1–K4) lintas level dan menyimpulkannya dalam satu kalimat, mis.
*"Paling konsisten kuat pada memahami masalah (rata-rata 3,0 dari 3). Paling
perlu dilatih: menjalankan rencana (rata-rata 2,3 dari 3)."* Kesimpulan ini
disusun `server/src/scoring/feedback.ts` → `buildSessionConclusion()`, terpisah
dari kalimat penutup per level yang dilihat siswa sendiri (`buildOverallMessage()`)
— ditulis orang ketiga karena pembacanya guru, bukan siswa yang bersangkutan.
Dari laporan ini, tombol "Lihat rincian" tetap membuka jejak audit lengkap satu
level tanpa meninggalkan laporan (modal bertumpuk).

**Peninjauan K4 adalah bagian terpenting.** Skor K4 dihitung otomatis dari
penanda bahasa pada jawaban terbuka, dan heuristik itu dapat keliru menilai
penalaran. Halaman ini menampilkan tulisan siswa apa adanya agar guru dapat
mengoreksi. Skor otomatis **tidak ditimpa** — tersimpan terpisah — sehingga
selisih skor mesin dan skor guru dapat dihitung sebagai bukti reliabilitas
antar-penilai pada laporan penelitian.

> Kunci admin **tidak pernah** dibundel ke berkas JavaScript. Kunci diketik guru
> dan hanya disimpan di `sessionStorage` — hilang begitu tab ditutup. Jangan
> menaruhnya di variabel `VITE_*`: seluruh variabel berawalan `VITE_` ikut
> terkompilasi ke berkas yang dapat dibaca siapa pun, termasuk siswa.

---

## Mengekspor data untuk analisis

```bash
cd server
npm run export:csv -- --out ../exports
```

Argumen tambahan: `--class XI-IPA-1` untuk menyaring satu kelas, `--trace` untuk
menyertakan jejak audit rubrik.

Empat berkas dihasilkan:

| Berkas | Isi | Dipakai untuk |
|---|---|---|
| `sessions.csv` | Satu baris per siswa | Statistik deskriptif, durasi pengerjaan |
| `scores_long.csv` | Satu baris per siswa × level | Analisis butir, korelasi item-total, Rasch/IRT |
| `scores_wide.csv` | Satu baris per siswa, kolom `K1_L1`…`K4_L4` | Cronbach's alpha di SPSS/Jamovi |
| `events.csv` | Seluruh log, sudah diterjemahkan | Analisis proses, pola trial-error |

Sel kosong pada `scores_wide.csv` berarti level tersebut **tidak dikerjakan**
(*missing value*), **bukan** skor nol. Setel sebagai missing di SPSS sebelum
menghitung reliabilitas — bila tidak, rata-rata dan alpha akan tertarik turun.

**`events.csv` bukan berkas hasil/skor** — isinya jejak proses, satu baris per
interaksi siswa (menggeser slider, menyusun kendala, dst). Untuk melihat nilai,
pakai `scores_long.csv`/`scores_wide.csv` di atas, endpoint `/api/admin/results`,
atau halaman guru. Tiap baris `events.csv` punya kolom **`keterangan`** berisi
kalimat berbahasa Indonesia (mis. *"Menetapkan variabel x = Ruang Terbuka Hijau
(RTH)"*), plus kolom terurai (`x`, `y`, `a`, `b`, `operator`, `c`, `pilihan_teks`)
— sehingga tidak perlu membongkar payload JSON untuk membacanya. Kolom
`payload_json` di ujung tetap menyimpan data mentah untuk pemrosesan ulang
terprogram. Lihat `server/src/lib/eventNarrator.ts`.

---

## Tampilan

Antarmuka bergaya *city-builder* pixel-art isometrik. Peta kota mengisi layar
sebagai latar, dengan HUD di atas, kartu alokasi dan bilah alat di bawah, serta
panel rinci berupa lembar geser — sehingga peta tetap terlihat saat panel terbuka
dan hubungan antara angka slider dan kota yang tumbuh tidak pernah terputus.

Beberapa hal yang perlu diketahui bila nanti Anda mengubah tampilannya:

- **Seluruh aset digambar per-piksel saat aplikasi dimulai** (`client/src/game/pixel/textures.ts`),
  bukan dimuat sebagai berkas gambar. Tidak ada aset yang perlu diunduh siswa,
  dan warna zona dapat diganti tanpa membuat berkas gambar baru.
- **Font pixel hanya dipakai untuk chrome antarmuka** — HUD, tombol, angka.
  Teks soal memakai font baca biasa; memaksakan font pixel pada narasi SPtLDV
  berbahasa Indonesia akan mengubah instrumen menjadi pengukur kemampuan membaca.
- **Slider menentukan BERAPA, peta menentukan DI MANA.** Siswa dapat memindahkan
  titik pusat tiap zona dengan mengetuk peta, tetapi jumlahnya tetap dari slider.
  Bila jumlah zona ikut ditentukan banyaknya ubin, nilai x dan y akan terkunci
  pada kelipatan satu petak dan titik optimum jadi tak terjangkau — lihat
  `docs/SCORING_SPEC.md` §7.2.
- **Warna zona mengikuti makna variabel, bukan sumbu x/y.** Setiap variabel punya
  field `visual` (`nature` / `clean` / `housing` / `neutral`) pada data task.
  Lihat `docs/SCORING_SPEC.md` §7.7 untuk alasannya.
- **Font dibundel dari npm**, bukan diambil dari CDN Google Fonts — wifi sekolah
  kerap memblokir atau memperlambat CDN.

## Bank skenario

12 skenario: 3 varian konteks SDG untuk masing-masing Level 1–4.

| Level | Kendala | Distraktor | Fokus bukti |
|---|---|---|---|
| 1 | 2 eksplisit | tidak | K1 |
| 2 | 2–3 eksplisit | tidak | K1–K2 |
| 3 | 2–3 + fungsi tujuan | tidak | K2–K3 |
| 4 | 3 termasuk 1 implisit | **wajib** | K3–K4 (K4 dibobot 0,40) |

Skenario disimpan sebagai **data terstruktur** di `server/src/tasks/level1-4.ts`,
bukan di dalam logika endpoint maupun kode client. Menambah varian cukup dengan
menambah satu objek pada berkas level yang sesuai — tidak ada kode endpoint atau
kode game yang perlu diubah. Uji `taskbank.test.ts` otomatis memeriksa varian baru
terhadap assembly rule, kelengkapan opsi, dan daerah penyelesaian tidak kosong.

`L2-SDG11&13-A` ditandai sebagai **anchor item** penyetaraan Level 2 ↔ Level 3,
sesuai catatan pada §10 dokumen ECD.

---

## Keamanan dan etika data siswa

Sudah diterapkan pada kode:

- Seluruh masukan API divalidasi dengan Zod sebelum menyentuh database.
- CORS memakai daftar putih eksplisit; server **menolak start** di produksi bila
  `CORS_ORIGIN` kosong atau berisi `*`.
- Pembatasan laju pada endpoint submit dan log, **dikunci berdasarkan sesi siswa,
  bukan alamat IP** — satu kelas di balik satu jaringan sekolah tidak akan saling
  memblokir.
- Endpoint admin memakai perbandingan waktu-konstan (`timingSafeEqual`).
- `helmet` untuk header keamanan HTTP, batas ukuran body 512 kB.
- `.gitignore` mengecualikan `.env`, berkas database, dan seluruh `*.csv`.

Yang perlu **Anda** lakukan sebelum pengambilan data:

- Dapatkan persetujuan etik penelitian dari institusi, termasuk persetujuan orang
  tua/wali bila subjek di bawah umur.
- Gunakan **inisial atau kode siswa**, bukan nama lengkap, bila desain penelitian
  memungkinkan. Kolom NIS bersifat opsional dan boleh dikosongkan.
- Jalankan `npm run db:reset` sebelum sesi sungguhan agar data uji coba tidak
  tercampur dengan data penelitian.
- Setelah data diekspor dan dicadangkan dengan aman, hapus data dari server dan
  matikan deployment.

---

## Deployment

Sistem ini terdiri dari **dua bagian yang di-deploy terpisah**:

| Bagian | Isinya | Butuh apa |
|---|---|---|
| `client/` | Halaman siswa + halaman guru | Host **statis** (berkas HTML/JS/CSS) |
| `server/` | API, mesin skoring, database | Host yang menjalankan **Node.js** + database |

Halaman guru **tidak menambah kebutuhan server baru** — ia hanya satu berkas HTML
lagi di host statis yang sama, memanggil endpoint admin yang sudah ada.

**Langkah demi langkah ada di [`docs/DEPLOY.md`](docs/DEPLOY.md)** — panduan yang
bisa diikuti sambil duduk di depan komputer, sekitar 30–45 menit untuk pertama kali.

Ringkasan pilihannya:

### Pilihan 1 — Vercel + Railway

Tanpa perubahan kode sama sekali. Catatan khusus untuk kode ini:

1. Sebelum deploy ke PostgreSQL, jalankan dari folder `server/`:

   ```bash
   npm run db:use-postgres
   ```

   Perintah ini menukar satu baris `provider` pada `prisma/schema.prisma`. Skema
   sengaja ditulis pada subset yang didukung SQLite maupun PostgreSQL — tanpa
   `enum` dan tanpa tipe `Json` — sehingga tidak ada model yang perlu diubah.

2. Setel **Custom Start Command** di Railway menjadi `npm run start:prod`.
   Perintah itu menyiapkan tabel database lebih dulu, baru menjalankan server.

   > **Jangan memakai `prisma migrate deploy` di produksi.** Berkas migrasi di
   > repositori ini dihasilkan untuk SQLite dan memuat tipe `DATETIME` serta
   > `REAL` yang tidak dikenal PostgreSQL — perintah itu akan gagal.
   > `npm run start:prod` memakai `prisma db push`, yang menyusun tabel langsung
   > dari `schema.prisma` sehingga cocok untuk kedua provider.

3. Variabel lingkungan di **Railway** (backend): `DATABASE_URL`, `ADMIN_API_KEY`,
   `CORS_ORIGIN` (URL halaman Anda, **tanpa** garis miring di akhir), `NODE_ENV=production`.

4. Variabel lingkungan di **Vercel** (front-end): `VITE_API_URL` (URL Railway Anda).
   Root Directory disetel ke `client`. Nilai `VITE_*` dibaca saat **build** —
   mengubahnya menuntut deploy ulang halaman.

> **Jangan menaruh kredensial apa pun di `client/.env`.** Seluruh variabel berawalan
> `VITE_` ikut terbundel ke berkas JavaScript yang dapat dibaca siapa pun.

### Pilihan 2 — Cloudflare Pages untuk client, backend tetap di Railway

**Ini pilihan Cloudflare yang paling masuk akal untuk skripsi**, dan tetap tanpa
perubahan kode.

Cloudflare Pages hanya menggantikan Vercel sebagai host statis:

1. Buka `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, pilih repositorimu.
2. Build settings:
   - Framework preset: **None**
   - Root directory: `client`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Environment variables → tambahkan `VITE_API_URL` berisi URL Railway.
4. Deploy. Kamu mendapat `https://namaproyek.pages.dev`; halaman guru ada di
   `https://namaproyek.pages.dev/guru.html`.
5. Di Railway, isi `CORS_ORIGIN` dengan alamat `.pages.dev` tersebut.

**Nilai tambah khusus Cloudflare:** halaman guru dapat dikunci dengan
**Cloudflare Access** (Zero Trust, gratis sampai 50 pengguna). Buat aplikasi
Access dengan path `/guru.html`, lalu izinkan hanya alamat surel gurumu. Dengan
begitu halaman laporan terlindungi dua lapis: login Cloudflare di depan, kunci
admin di belakang.

### Pilihan 3 — Seluruhnya di Cloudflare (Pages + Workers + D1)

Bisa, tetapi **menuntut migrasi kode backend** — Cloudflare Workers bukan
Node.js, melainkan runtime berbasis V8 dengan API mirip peramban.

Yang harus berubah:

| Bagian | Status | Perkiraan kerja |
|---|---|---|
| Mesin skoring (`src/scoring/`, `src/domain/`) | **Pindah apa adanya** — TypeScript murni tanpa API Node | tidak ada |
| Bank skenario (`src/tasks/`) | **Pindah apa adanya** — data terstruktur | tidak ada |
| Routing Express | Ditulis ulang ke **Hono** (API-nya mirip, `app.get`/`app.post`) | ~½ hari |
| Prisma + SQLite/Postgres | Ganti ke **D1** lewat `@prisma/adapter-d1`, atau Postgres lewat Hyperdrive | ~½ hari |
| Migrasi database | `prisma migrate` diganti `wrangler d1 migrations` | ~2 jam |
| `helmet`, `express-rate-limit` | Keduanya khusus Express; ditulis ulang sebagai middleware Hono | ~2 jam |
| Uji integrasi (`supertest`) | Ditulis ulang berbasis `fetch` ke `app.request()` milik Hono | ~½ hari |

Totalnya realistis **1–2 hari kerja terfokus, ditambah pengujian ulang penuh**.

Sisi baiknya nyata: kuota gratis Workers (100.000 permintaan/hari) dan D1 jauh
di atas kebutuhan satu penelitian, dan tidak ada layanan yang "tidur" seperti
tier gratis Railway.

**Rekomendasi saya: jangan lakukan migrasi ini sebelum pengambilan data.**
Untuk sebuah instrumen penelitian, "sudah teruji dan berjalan" lebih berharga
daripada "lebih murah". Pilihan 2 sudah memberi hampir seluruh manfaat
Cloudflare tanpa satu pun risiko itu. Migrasi penuh cocok dikerjakan **setelah**
data terkumpul, bila sistem ini hendak dipakai ulang jangka panjang.

---

## Arsitektur singkat

**Skoring adalah fungsi murni.** `scoreAttempt(task, events)` tidak menyentuh
database, jaringan, maupun jam sistem. Konsekuensinya: log yang sama selalu
menghasilkan skor yang sama, dan seluruh skor dapat dihitung ulang dari tabel
`EventLog` bila ambang batas direvisi setelah uji coba — tanpa pengambilan data ulang.

**Server adalah satu-satunya sumber kebenaran.** Client memvalidasi konfigurasi
secara real-time hanya untuk umpan balik visual; kelayakan dan skor pada saat submit
selalu dihitung ulang di server dari log tersimpan, tidak pernah dari nilai yang
dikirim client.

**Setiap skor membawa jejak audit.** Kolom `Score.trace` menyimpan deskriptor rubrik
yang cocok, alasannya dalam bahasa manusia, dan observable yang menentukannya untuk
keempat klaim — sehingga mesin skoring dapat dipertanggungjawabkan sebagai instrumen,
bukan diperlakukan sebagai kotak hitam.

**Log tahan gangguan jaringan.** Event diantre di memori, dikirim berkelompok tiap
2 detik, disangga di `localStorage` bila pengiriman gagal, dan sisa antrean dikirim
dengan `sendBeacon` saat halaman ditutup.
