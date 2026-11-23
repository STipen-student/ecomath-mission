# Login siswa dan penyimpanan pekerjaan

Siswa masuk dengan **NIS + kode kelas + PIN 4–6 angka**.

## Alurnya

- **Login pertama:** siswa mengisi NIS, kode kelas, PIN baru, dan nama atau
  inisial. Sesi baru dibuat dan PIN disimpan sebagai hash PBKDF2 bergaram
  (`server/src/lib/pin.ts`), tidak pernah sebagai teks.
- **Login berikutnya:** NIS, kode kelas, dan PIN yang sama. Siswa melanjutkan
  sesi yang sama dari **level pertama yang belum dinilai**. Tutorial dan prolog
  dilewati, dan riwayat skor, saran target berikutnya, kota tiap level, serta
  koin, misi, dan bangunannya dipulihkan dari server.
- **Semua level selesai:** siswa langsung ke ringkasan akhir. Refleksi akhir
  masih bisa diisi bila belum pernah.
- **Kode kelas** disimpan dalam huruf besar, jadi `xi-ipa-1` dan `XI-IPA-1`
  dianggap kelas yang sama.

## Aturan yang menjaga data penelitian

- **Satu percobaan per level** tetap berlaku. Level yang sudah dinilai tidak bisa
  diulang, sehingga login ulang tidak menghasilkan skor ganda.
- **Satu siswa = satu sesi.** Login ulang tidak membuat sesi baru, sehingga data
  tidak terpecah menjadi beberapa sesi per siswa.
- **Sesi lama tanpa PIN** (dibuat sebelum fitur ini) tidak bisa diklaim lewat
  login, agar tidak ada yang mengambil alih pekerjaan orang lain hanya dengan
  mengetahui NIS-nya.
- **Pembatas percobaan:** paling banyak 8 percobaan login per NIS + kelas tiap
  10 menit. Dihitung per siswa, bukan per IP, karena satu sekolah sering keluar
  lewat satu alamat IP.

## Lupa PIN

Di Portal Guru, buka laporan siswa lalu tekan **🔑 Reset PIN**. Pada login
berikutnya, PIN yang diketik siswa menjadi PIN barunya, dan pekerjaannya tetap
dilanjutkan.

## Progres permainan

Koin, misi, bangunan, dan kas kota disimpan di perangkat dan juga dikirim ke
server (`PUT /api/session/:id/progres`) setiap kali berubah, sehingga ikut ke
perangkat lain. Data ini hanya ekonomi permainan dan tidak dibaca mesin skoring.

## Perubahan database

Migrasi `server/migrations-d1/0002_login_pin.sql` menambah kolom `pinHash` dan
`progres` pada tabel `Session`. Terapkan sebelum men-deploy backend:

```bash
npm run worker:migrate:remote
```
