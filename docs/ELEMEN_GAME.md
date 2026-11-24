# Elemen permainan: hadiah, perlengkapan, misi, misi tersembunyi, tantangan kilat

Branch: `cloudflare-workers`. Kode: `client/src/game/progres.ts`,
`client/src/ui/panelHadiah.ts`, dan sambungannya di `app.ts`, `ResultScreen.ts`,
`PlayScreen.ts`, dan `kota/KotaScreen.ts`.

## Isi

| Elemen | Bentuk | Di mana |
|---|---|---|
| **Hadiah** | Koin 🪙 dari misi yang selesai | Spanduk di layar hasil, pemberitahuan melayang |
| **Perlengkapan** | Hiasan (air mancur, lampu kota, bendera) dan alat (Subsidi hijau, Panel efisien) | Toko di layar akhir sesi; efek alat hanya di Kota Bebas |
| **Misi** | Wali kota pemula, Perencana tangguh, Selalu punya rencana, Kota hijau, Kota ramai, Gesit tapi bijak | Daftar misi yang bisa dibuka-tutup |
| **Misi tersembunyi** | Arsitek rahasia (ketuk lencana level 5 kali), Kota tanpa asap (20 warga tanpa pabrik di Kota Bebas), Penjelajah (buka daftar misi 3 kali) | Tampil sebagai "???" sampai ditemukan |
| **Tantangan berbatas waktu** | Tantangan Kilat: 25 warga dan kebahagiaan 55% dalam 90 detik | Hanya di Kota Bebas |

## Batas agar pengukuran dan AaL tidak terganggu

1. **Hadiah tidak bergantung pada skor, bintang, atau kalibrasi.** Siswa tidak
   punya alasan menilai diri lebih tinggi atau lebih rendah demi koin. Panel
   misi menuliskannya: "Hadiah tidak bergantung pada skor atau penilaian dirimu."
2. **Misi di level hanya untuk hal yang sudah wajib**: menyelesaikan level dan
   menetapkan target. Tidak ada misi untuk perilaku yang dinilai rubrik, seperti
   mengecek titik pojok atau menulis refleksi panjang, karena itu akan membuat
   bukti K2 dan K4 terkumpul demi hadiah, bukan demi strategi.
3. **Batas waktu hanya di Kota Bebas.** Level yang dinilai tetap tanpa tekanan
   waktu, karena kecepatan bukan bagian dari konstruk.
4. **Efek alat hanya di Kota Bebas.** Potongan biaya tidak menyentuh soal SPtLDV.
5. **Urutan layar hasil dijaga.** Cermin diri (kalibrasi) dan umpan balik tampil
   lebih dulu; hadiah dan misi di paling bawah. Toko tidak muncul di layar hasil
   level, hanya di akhir sesi.
6. **Tanpa event dan tanpa server.** Progres disimpan per sesi di perangkat
   (localStorage). Akibatnya, keterlibatan dengan elemen ini **tidak terekam**
   untuk penelitian. Bila ingin diukur, perlu event baru yang disaring dari skor.

## Status uji (browser lokal, Worker + D1)

- Misi tersembunyi "Arsitek rahasia" muncul setelah lencana diketuk 5 kali.
- Setelah Level 1: spanduk "+50 🪙 Wali kota pemula" tampil setelah cermin diri,
  umpan balik, dan kunci jawaban; toko tidak tampil.
- Kota Bebas: membeli Subsidi hijau menurunkan harga taman 60 → 48; Tantangan
  Kilat berjalan dengan hitung mundur di HUD.
- **Belum diuji**: misi Kota hijau, Kota ramai, Kota tanpa asap, kemenangan
  Tantangan Kilat, misi "semua level" dan "selalu punya rencana" (butuh 4 level),
  serta tampilan di HP.

## Tambahan: pemandangan, perpustakaan, dan bangun dengan koin

| Elemen | Keterangan |
|---|---|
| **Pencakar langit dan perpustakaan** | Pusat kota di tengah Peta Wilayah gabungan, pada petak yang masih kosong. Dekorasi saja, tidak masuk indeks hijau. |
| **Awan** | Melayang pelan di peta yang punya penduduk (Peta Wilayah, Kota Bebas). Tidak muncul di level yang dinilai. |
| **Misi tersembunyi "Sahabat perpustakaan"** | Terbuka bila **skor rubrik** satu level minimal 10/12. Siswa merapikan rak buku Bu Rani (mengurutkan nomor rak). Kegiatan ini tidak dinilai dan tidak dicatat. |
| **Bangun dengan koin** | Di Peta Wilayah gabungan, koin bisa dipakai membeli pohon, taman, toko, panel surya, kincir angin, dan pabrik ramah lingkungan (atap panel surya, tanpa cerobong), lalu menaruhnya di petak kosong. Bangunan disimpan bersama progres dan ikut dihitung dalam indeks hijau. |

### Pengecualian terhadap batas no. 1

Misi perpustakaan adalah **satu-satunya** hadiah yang bergantung pada skor.
Batas yang tetap dijaga:

- Syaratnya skor rubrik, bukan penilaian diri. Penilaian diri diisi sebelum skor
  tampil dan tidak pernah memengaruhi hadiah, jadi kalibrasi AaL tidak terdorong.
- Teks di panel misi kini menyebutkan pengecualian ini secara terbuka.
- **Risiko yang perlu ditimbang:** hadiah berbasis skor bisa sedikit menaikkan
  motivasi di level berikutnya. Itu bukan kecurangan, tetapi menjadi kondisi
  pengambilan data yang sebaiknya dilaporkan.

## Tanggapan protes warga sebagai instrumen AaL

Saat warga berdemo di Peta Wilayah (lihat `client/src/game/standarSdg.ts`), siswa
bisa menekan **"Tanggapi protes warga"** dan mengisi empat bagian:

1. **Diagnosis**: mengapa warga berdemo (SDG 13 emisi, SDG 11 ruang hijau, atau pengecoh).
2. **Rencana perbaikan**: satu dari empat pilihan, dua di antaranya keliru.
3. **Kaitan dengan kendala soal**: jawaban terbuka, misalnya kendala garasi yang
   membatasi penggantian bus.
4. **Keyakinan diri 0–3**, diisi **sebelum** hasil pemeriksaan tampil.

Lalu siswa melihat hasil pemeriksaan (diagnosis tepat atau belum, rencana sesuai
atau belum) dan cermin keyakinannya (terkalibrasi bila yakin dan benar, atau ragu
dan keliru). Polanya sama dengan penilaian diri di akhir level.

**Pencatatan.** Jawaban dikirim sebagai event `aal_tanggapan_protes` pada
percobaan level terakhir, dan event ini termasuk `NON_EVIDENCE_EVENTS`, jadi
disaring dari mesin skoring. Uji `assessmentAsLearning.test.ts` memastikan skor
K1–K4 identik dengan atau tanpa event ini. Guru melihatnya di laporan siswa
(bagian "Tanggapan protes warga (AaL)"), dan ekspor `events.csv` memuat
narasinya.

**Batas.** Kegiatan ini opsional dan hanya muncul bila ada protes, jadi tidak
semua siswa mengerjakannya. Datanya cocok untuk analisis deskriptif kemandirian
belajar, bukan untuk dibandingkan antarsiswa seperti skor K1–K4.

## Kotak Kejutan (gacha)

Di panel Misi & Hadiah ada **Kotak Kejutan**. Sekali buka memakai 1 tiket atau
40 koin, dan hasilnya acak dengan peluang yang ditampilkan ke siswa: 10 koin
(35%), 25 koin (20%), 60 koin (5%), kartu warga biasa (30%), atau kartu warga
langka (10%). Kartu ganda ditukar 15 koin. Ada 8 kartu warga untuk dikoleksi.

**Tiket** didapat setiap kali siswa **mengikuti** kegiatan AaL: penilaian diri
di akhir level, tanggapan protes warga, dan refleksi akhir sesi. Isi jawaban
tidak dibaca sama sekali, jadi tidak ada insentif menilai diri lebih tinggi atau
lebih rendah, dan data kalibrasi AaL tetap jujur.

**Batas.** Tidak ada uang sungguhan. Hasil gacha hanya koin dan kartu koleksi,
disimpan di perangkat (localStorage), tidak dikirim ke server, dan tidak
memengaruhi skor K1–K4, pemilihan soal, atau event yang dinilai.

## Menggambar grafik pertidaksamaan (Level 1)

Pada soal pertidaksamaan linear tanpa fungsi tujuan, grafik tidak lagi digambar
otomatis. Di panel Simulasi, siswa menggambar sendiri dari kendala yang ia tulis:

1. Untuk tiap pertidaksamaan, ketuk **dua titik** yang dilalui garis batasnya
   (titik ditempel ke kisi satuan). Bila salah, siswa diberi petunjuk mencari
   titik potong sumbu dan mencoba lagi.
2. Ketuk **satu titik di sisi yang memenuhi** pertidaksamaan. Bila salah,
   siswa diminta menyubstitusikan titiknya.
3. Setelah semua garis dan sisi benar, daerah himpunan penyelesaian diarsir.

Setiap garis dan sisi dicatat sebagai event `gambar_grafik` (slot, tahap,
titik, benar/belum). Event ini masuk `NON_EVIDENCE_EVENTS`, jadi **belum**
memengaruhi skor K1–K4 dan rubrik yang sudah divalidasi tidak berubah. Uji
titik lewat kolom x dan y tetap tersedia sejak awal, karena rubrik K2 membaca
kegiatan uji titik dan kesulitan menggambar tidak boleh menurunkannya.

Bila kemampuan menggambar grafik hendak dinilai (misalnya bagian dari K3 di
Level 1), rubrik dan `SCORING_VERSION` perlu diubah dan divalidasi ulang.

## Kas kota (koin bertambah di kota)

Di Peta Wilayah gabungan ada **Kas kota**. Koin bertambah setiap menit, lalu
siswa mengambilnya dengan tombol **Ambil kas**:

| Sumber | Koin per menit |
|---|---|
| Pendapatan dasar | 1 |
| Bonus warga puas (tidak ada protes) | 2 |
| Tiap toko | 3 |
| Tiap pabrik ramah lingkungan | 4 |
| Tiap panel surya atau kincir angin | 1 |

Kas menampung paling banyak 60 menit pendapatan, jadi koin tidak menumpuk tanpa
batas. Mekanisme ini mendorong siswa membangun kota yang hijau dan membuat
warga puas. Seperti koin lainnya, kas kota disimpan di perangkat dan tidak
memengaruhi skor K1–K4 maupun data AaL.

## Perawatan sarana-prasarana (indeks hijau bisa turun)

Bangunan yang dibeli dengan koin di Peta Wilayah gabungan mengalami aus:
kondisinya turun **2% per menit** sejak terakhir dibangun atau dirawat. Di bawah
**40%** fasilitas dianggap rusak:

- tampil kusam di peta;
- tidak dihitung sebagai ruang hijau, sehingga **indeks hijau turun**;
- toko dan pabrik ramah lingkungan tidak menghasilkan kas kota;
- warga mengeluh di Kabar Warga.

Tombol **🔧 Rawat semua** mengembalikan semua fasilitas ke 100%. Biayanya 30%
dari harga beli dikali tingkat kerusakan. Bangunan hasil level (rancangan siswa)
tidak aus, karena itu adalah jawaban yang dinilai.

## Protes warga di Kota Bebas

Kota Bebas memakai aturan protes yang sama dengan Peta Wilayah: pabrik berasap
memicu protes SDG 13, dan permukiman tanpa cukup taman memicu protes SDG 11.
Demo tampil di peta, dan alasannya ditulis di panel agar siswa tahu cara
mengatasinya. Hanya tampilan; tidak mengubah ekonomi Kota Bebas maupun skor.
