# Rubrik Misi Kota Hijau (KH1–KH4)

Versi rubrik: **KH-1.0.0**. Kode penskoran: `server/src/kotaHijau/skor.ts`.
Model misi: `server/src/kotaHijau/model.ts`.

## Kedudukan terhadap K1–K4

Misi Kota Hijau adalah **tugas kinerja kedua** untuk kemampuan pemecahan masalah
matematis (KPMM), dikerjakan setelah Level 4.

- Skornya **dilaporkan terpisah**: tidak dijumlahkan ke K1–K4, komposit sesi,
  maupun pemilihan soal adaptif. Rubrik K1–K4 yang sudah divalidasi tidak berubah.
- K1–K4 mengukur KPMM pada soal program linear yang tersusun rapi; KH1–KH4
  mengukur KPMM pada masalah anggaran terbuka di konteks kota. Keduanya dapat
  dikorelasikan sebagai bukti validitas konvergen.
- Kota gabungan (Peta Wilayah) **tidak dinilai**: isinya berbeda untuk tiap siswa
  (bergantung jawaban level dan koin hasil keberuntungan), jadi tidak adil
  dijadikan soal penilaian.

## Tugas yang dikerjakan siswa

Semua siswa mendapat kondisi yang **sama persis**:

| Kota awal | Jumlah |
|---|---|
| Rumah | 12 |
| Bus konvensional (emisi) | 2 |
| Mesin fosil (emisi) | 1 |
| Pohon | 3 |
| Taman rusak | 2 |
| Anggaran Dewan | 150 koin |

Indeks hijau awal 26,1%. **Target:** indeks hijau ≥ 55%, tidak ada sumber emisi,
tidak ada fasilitas rusak, dan biaya tidak melebihi anggaran.

Indeks hijau = hijau ÷ (hijau + lainnya + emisi), dengan bobot pohon dan taman
terawat = 2, bus listrik dan panel surya = 1; rumah dan fasilitas rusak masuk
"lainnya" (bobot 1); bus konvensional dan mesin fosil masuk "emisi" (bobot 1).

| Tindakan | Biaya (koin) |
|---|---|
| Ganti bus konvensional ke bus listrik | 40 |
| Ganti mesin fosil ke panel surya | 35 |
| Rawat taman yang rusak | 10 |
| Rawat pohon yang rusak (setelah badai) | 8 |
| Tanam pohon baru | 10 |
| Bangun taman baru | 25 |
| Bangun panel surya baru | 35 |

**Alur:**
1. **Pemahaman:** siswa memilih syarat-syarat misi dari daftar yang memuat
   pengecoh ("semua bus harus dijual", "harus membangun panel surya baru").
2. **Rencana (fase 1):** siswa mengisi banyaknya tiap tindakan, boleh menekan
   **Hitung perkiraan** (biaya, indeks, emisi, fasilitas rusak) sebanyak apa pun,
   lalu **Jalankan rencana**. Rencana di atas anggaran ditolak dan dicatat.
   Siswa boleh menjalankan beberapa rencana, lalu melapor ke Dewan.
3. **Badai (fase 2):** 2 pohon rusak dan Dewan menambah 25 koin. Siswa merevisi
   rencana dengan sisa anggaran.
4. **Refleksi:** satu pertanyaan tertutup (mutu 0–3) dan satu jawaban terbuka.
5. **Penilaian diri** KH1–KH4 (0–3) sebelum melihat skor; tidak memengaruhi skor.

Uji `server/tests/kotaHijauModel.test.ts` membuktikan secara menyeluruh bahwa
target hanya tercapai oleh rencana yang menghapus semua emisi, merawat taman
yang rusak, dan menanam minimal satu pohon; membangun taman baru alih-alih
merawat yang rusak tidak lulus. Contoh rencana yang lulus: ganti 2 bus, ganti
mesin fosil, rawat 2 taman, tanam 1 pohon (145 koin, indeks 55,6%).

## Rubrik

| Skor | KH1 Memahami masalah | KH2 Menyusun rencana | KH3 Melaksanakan rencana | KH4 Memeriksa kembali |
|---|---|---|---|---|
| **3** | Memilih keempat syarat misi (indeks, emisi, fasilitas rusak, anggaran) tanpa pengecoh | Menghitung perkiraan sebelum menjalankan, dan rencana pertama sah, dalam anggaran, serta memenuhi ketiga target | Akhir fase 1 memenuhi ketiga target dalam anggaran | Setelah badai, revisi memulihkan ketiga target **dan** refleksi bermutu ≥ 2 |
| **2** | ≥ 3 syarat benar dan paling banyak 1 pengecoh | Rencana pertama sah dan memenuhi ≥ 2 target (tanpa menghitung dulu, atau target belum lengkap) | Memenuhi 2 dari 3 target | Revisi memulihkan ketiga target, **atau** kota membaik dengan refleksi bermutu ≥ 2 |
| **1** | ≥ 2 syarat benar | Rencana pertama sah tetapi memenuhi < 2 target | Memenuhi 1 target | Ada revisi yang dijalankan, atau refleksi bermutu ≥ 1 |
| **0** | < 2 syarat benar | Tidak ada rencana, atau rencana pertama melebihi anggaran / tidak sah | Tidak memenuhi target apa pun | Tidak ada revisi dan refleksi tidak bermutu |

**Total** KH = KH1 + KH2 + KH3 + KH4 (maksimal 12).

### Pilihan refleksi (KH4)

Pertanyaan: *"Mengapa rencanamu berhasil (atau belum berhasil) memenuhi target?"*

| Kode | Pilihan | Mutu |
|---|---|---|
| r0 | Tidak tahu / saya mencoba-coba | 0 |
| r1 | Karena saya membangun sebanyak mungkin bangunan baru | 1 |
| r2 | Karena saya memeriksa indeks, emisi, dan fasilitas rusak sebelum melapor | 2 |
| r3 | Karena merawat fasilitas yang rusak lebih murah daripada membangun baru, sehingga sisa anggaran cukup untuk menghapus semua sumber emisi | 3 |

## Data yang disimpan

Tabel `KotaHijau` (satu baris per sesi): skor KH1–KH4, total, versi rubrik,
serta data mentah (syarat yang dipilih, setiap perkiraan dan rencana yang
dijalankan atau ditolak, refleksi, dan penilaian diri). Keadaan kota dihitung
ulang di server dari tindakan siswa, sehingga skor tidak bergantung pada angka
yang dikirim perangkat.

## Batasan dan validasi yang diperlukan

- Rubrik ini **belum divalidasi ahli**. Sebelum dipakai untuk kesimpulan
  penelitian, perlu validasi isi (misalnya oleh dosen pembimbing atau validator)
  dan uji coba untuk reliabilitas.
- Hanya ada satu skenario, sehingga KH1–KH4 masing-masing bertumpu pada sedikit
  bukti. Untuk penelitian, laporkan KH sebagai data pendamping K1–K4.
- Perubahan angka misi atau rubrik wajib menaikkan `VERSI_KOTA_HIJAU`.
