# Draf Instrumen 2B: Kota berbasis matematika (SPtLDV)

Status: **DRAF desain**. Belum divalidasi. Berlaku hanya di branch `theotown-ui`.

## Inti gagasan

Kendala tetap berupa pertidaksamaan linear dua variabel yang disusun siswa dari
narasi, seperti pada instrumen 1.1.0. Yang berubah hanya **cara siswa mengatur
nilai x dan y**: bukan lagi dengan penggeser, melainkan dengan **menaruh ubin
di peta kota**.

- Setiap ubin RTH (taman) menambah **x**, dan setiap ubin permukiman (rumah)
  menambah **y**. Jumlah ubin = nilai variabel (satuan sesuai soal).
- Peta isometrik dari `CityScene` menggambar ubin sesuai jumlahnya.
- Tujuan optimasi (Z) dan kendala tetap dihitung dari x dan y yang sama seperti
  sekarang, sehingga rubrik K1–K4 dan mesin skoring 1.1.0 dapat dipakai tanpa
  perubahan.

Dengan begitu, yang berubah hanya **antarmuka pengaturan nilai**, bukan
konstruk. Ini berbeda dari draf 2, yang mengganti kendala dengan ekonomi dan
karena itu mengganti apa yang diukur.

## Pemetaan ke ECD

| Komponen ECD | Isi |
|---|---|
| Student Model | Tetap K1–K4 (SPtLDV), sesuai ECD Bagian 2 |
| Task Model | Tetap narasi, kendala, dan tujuan dari bank 1.1.0 |
| Evidence Model | Tetap log 1.1.0. Aksi penempatan dicatat sebagai `move_slider` dengan nilai x dan y yang sama, sehingga rubrik tidak berubah |

## Pemetaan ke Bloom dan Pólya

Tidak ada perubahan. Klasifikasi di `docs/TAKSONOMI_BLOOM.md` tetap berlaku,
karena yang dituntut tetap menyusun model dan menganalisis trade-off.

## Yang perlu kamu putuskan

1. **Skala ubin.** Satu ubin = 1 satuan, atau satu ubin = k satuan (mis. 5 hektar)?
   Ini menentukan apakah nilai optimum (mis. x=84, y=36) bisa dicapai persis.
   Jika tidak, nilai x dan y harus dibulatkan dan kebenaran jawaban berubah.
2. **Ubin pecahan.** Kendala seperti `0,04x + 0,03y ≤ 60` memerlukan nilai tidak
   bulat. Apakah dibatasi ke bilangan bulat (ubah soal) atau dibiarkan lewat
   penggeser halus di luar peta?
3. **Peta sebagai bukti.** Ubin yang diletakkan di koordinat tertentu tidak
   mengubah x dan y. Lokasi ubin (`set_zone_center`) tetap non-bukti, seperti
   sekarang.
4. **Keterbandingan.** Versi 2B hanya boleh dibandingkan dengan 1.1.0 bila
   perbedaannya hanya antarmuka. Itu perlu diuji dengan siswa sebelum dipakai.

## Yang tidak ikut

Ekonomi, kebahagiaan, dan mode Kota Bebas dari draf 2 tidak dipakai di versi
ini, karena tidak berkaitan dengan SPtLDV.

## Keputusan skala (14 Nov 2026)

**Satu ubin = 1 satuan untuk semua soal.** Peta diperbesar agar muat lahan
terbesar (L4-SDG11&13-A, 200 hektar). Dengan begitu angka soal tidak diubah,
dan nilai optimum tetap bisa dicapai persis.

Konsekuensi yang harus diuji sebelum dipakai:
- Jumlah petak naik dari 100 menjadi sekitar 300 (perlu pengukuran).
- Performa di HP perlu diuji, karena peta lebih besar dan jumlah sprite naik.
- `GRID` pada `isoGrid.ts` dan `CityScene.ts` diubah **hanya di branch
  `theotown-ui`**. Branch `main` dan instrumen 1.1.0 tidak boleh terpengaruh.

## Status penerapan (14 Nov 2026)

Diterapkan di `client/src/ui/PlayScreen.ts` pada branch `theotown-ui`:

- Ketuk atau seret di peta memasang ubin zona terpilih; ketuk ubin sendiri
  mencabutnya. Jumlah ubin x langkah variabel = nilai x atau y.
- Nilai ditulis ke penggeser lalu melewati `geser()`, sehingga event tetap
  `move_slider` (atau `revise_after_event` setelah event kebijakan) dengan
  x dan y. Mesin skoring tidak diubah.
- Penggeser tetap ada dan sinkron dua arah. Ini disengaja: memasang 84 ubin
  satu per satu tidak praktis, jadi penggeser menjadi jalur cepat.
- Rona kelayakan peta tetap mengikuti sumber per level (§7.20).

Penyimpangan dan batasan yang belum diselesaikan:

1. **Langkah 0,5.** Pada dua variabel dengan langkah 0,5, satu ubin bernilai
   0,5 satuan, bukan 1.
2. **Batas petak.** Peta punya 256 petak. Pada L4-SDG11&13-A batas penggeser
   210 + 210, sehingga kombinasi di atas 256 ubin tidak bisa dibuat lewat peta.
   Kombinasi itu memang tidak layak, tetapi ruang coba-coba siswa jadi berbeda
   dari versi 1.1.0.
3. **Pusat zona dihapus.** Tombol "Atur pusat" diganti "Pasang ubin", jadi
   event `set_zone_center` tidak lagi muncul di versi ini.
4. **Jumlah event `move_slider` dapat naik**, karena setiap ketukan memicu satu
   perubahan nilai (di-debounce 400 ms). Observable yang menghitung perpindahan
   penggeser perlu diperiksa sebelum skor dibandingkan dengan 1.1.0.
5. **Belum diuji**: sinkron dari penggeser ke ubin, kuas zona Y, Level 2–4,
   tutorial, dan HP sungguhan. Yang sudah dicek di browser hanya memasang ubin
   zona X di Level 1.
