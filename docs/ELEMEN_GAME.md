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
