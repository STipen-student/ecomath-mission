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
