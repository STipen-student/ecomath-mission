# Bentuk paralel soal (angka berbeda, kesulitan sama)

Kode: `server/src/tasks/bentukParalel.ts`. Uji: `server/tests/bentukParalel.test.ts`.
Mulai **instrumen 1.2.0**.

## Tujuannya

Siswa sekelas mendapat soal dengan **angka berbeda** tetapi **struktur dan
tingkat kesulitan yang sama**, sehingga jawaban tidak bisa disalin dari teman.
Rubrik K1–K4 dan cara penskoran tidak berubah.

## Cara membuat bentuk B dan C

Bentuk A adalah soal asli. Bentuk B/C dibuat dengan **mengalikan semua ruas
kanan kendala** (dan nilai baru pada kebijakan Level 4) dengan satu faktor yang
sama. Koefisien (harga per unit, poin, emisi per unit) dan persentase tidak
diubah.

Akibatnya daerah penyelesaian hanya membesar atau mengecil: kendala yang
membatasi, letak titik optimum, dan langkah penyelesaian tetap sama. Teks soal
diganti frasa demi frasa secara eksplisit, sehingga setiap bentuk bisa dibaca
dan divalidasi seperti soal biasa.

| Soal | Bentuk B | Bentuk C |
|---|---|---|
| L1-SDG11-A (lahan 40 ha) | ×0,75 → 30 ha | ×1,25 → 50 ha |
| L1-SDG13-A (garasi 24 unit) | ×0,75 → 18 unit | ×1,25 → 30 unit |
| L1-SDG11&13-A (jalan 30 m) | ×0,8 → 24 m | ×1,2 → 36 m |
| L2-SDG11-A (Rp 900 juta; 60 ha) | ×0,8 | ×1,2 |
| L2-SDG13-A (Rp 1,2 miliar; 500 m²) | ×0,8 | ×1,2 |
| L2-SDG11&13-A (50 ha; Rp 900 juta) | ×0,8 | ×1,2 |
| L3-SDG11-A (80 ha; Rp 2,4 miliar; 10 ha) | ×0,5 | ×1,5 |
| L3-SDG13-A (50 ton; 19 kg CO2) | ×0,5 | ×1,5 |
| L3-SDG11&13-A (100 ha; Rp 5 miliar) | ×0,8 | ×1,2 |
| L4-SDG11-A (120 ha; Rp 3,6 miliar; 30%→40%) | ×0,5 | ×1,5 |
| L4-SDG13-A (60 unit; Rp 1.080 juta; 800 kg) | ×2 | – |
| L4-SDG11&13-A (200 ha; Rp 8 miliar; 35%→45%) | ×0,5 | ×1,5 |

L4-SDG13-A hanya punya satu bentuk tambahan, karena hanya faktor ×2 yang
menjaga optimumnya tetap bilangan bulat. Soal ini berdomain bilangan bulat,
sehingga optimum bentuk B adalah (43, 77), bukan tepat 2 × (21, 39); teks
refleksinya ditulis sesuai angka itu.

## Yang diperiksa otomatis untuk setiap bentuk

- Koefisien, arah pertidaksamaan, dan fungsi tujuan sama dengan bentuk A.
- Titik optimum (juga setelah kebijakan Level 4) bulat, di dalam batas slider,
  dan setara dengan bentuk A; kendala yang mengikat di titik optimum sama.
- Beban permukaan (dipakai pemilihan adaptif) sama dengan bentuk A.
- Tidak ada frasa angka lama yang tertinggal di narasi, tabel, opsi, refleksi,
  atau kebijakan; angka ruas kanan baru disebut di teks.

## Cara pemberiannya

- Untuk siswa, bentuk **diundi merata** saat level dimulai dan disimpan di
  `TaskAttempt.bentuk`; memuat ulang halaman memberi bentuk yang sama.
- Skoring, event kebijakan Level 4, laporan guru, Peta Wilayah, dan narasi
  ekspor CSV memakai bentuk yang tersimpan.
- Kolom `bentuk` ikut di ekspor skor dan event, sehingga analisis bisa
  memeriksa apakah skor berbeda antarbentuk.
- Peneliti dapat memaksa soal tertentu lewat `?taskId=...` (memakai bentuk A)
  atau bentuk tertentu lewat `?bentuk=B`.

## Validasi yang diperlukan

Bentuk paralel adalah butir baru dari sudut pandang validitas isi. Sebelum dipakai
untuk pengambilan data, mintalah validator memeriksa narasi tiap bentuk (bisa
ditampilkan lewat `?taskId=...&bentuk=B`) dan, setelah uji coba, periksa apakah
rata-rata skor antarbentuk setara.
