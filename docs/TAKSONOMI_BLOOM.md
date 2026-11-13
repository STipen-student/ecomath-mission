# Pemetaan Bank Soal ke Taksonomi Bloom

Dokumen ini memetakan 12 skenario Ecomath Mission ke jenjang kognitif
**Taksonomi Bloom revisi** (Anderson & Krathwohl, 2001):

| Kode | Jenjang | Contoh kata kerja operasional (KKO) |
|---|---|---|
| C1 | Mengingat | menyebutkan, mengenali |
| C2 | Memahami | menjelaskan arti, menafsirkan, mengidentifikasi |
| C3 | Menerapkan | menuliskan model, menghitung, menerapkan prosedur |
| C4 | Menganalisis | membandingkan, menyimpulkan yang tersirat, menentukan yang paling membatasi |
| C5 | Mengevaluasi | menilai, menjustifikasi, memeriksa dan merevisi terhadap kriteria baru |
| C6 | Mencipta | merancang, merumuskan model/kebijakan baru |

Klasifikasi tersimpan sebagai data pada field `bloom` setiap task
(`server/src/tasks/level1-4.ts`) dan ikut keluar pada Item-Claim Blueprint
(`GET /api/admin/blueprint`, kolom `bloom_*`, `kata_kerja_operasional`,
`indikator_soal`). Field ini **metadata kisi-kisi**: tidak dibaca rubrik dan
tidak dikirim ke halaman siswa.

---

## 1. Dua jenjang per soal

Setiap soal diklasifikasikan **dua kali**, karena perintah utama dan pertanyaan
refleksinya menuntut proses berpikir yang berbeda:

- **Tugas utama**: perintah pada narasi ("Tuliskan pertidaksamaan…",
  "Tentukan kombinasi yang memaksimumkan…").
- **Refleksi**: pertanyaan terbuka di akhir level, sumber bukti K4.

Jenjang soal = jenjang tertinggi dari keduanya.

## 2. Tahap pemecahan masalah (Polya) dan jenjang Bloom

| Klaim | Tahap | Perilaku yang dinilai | Jenjang |
|---|---|---|---|
| K1 | Memahami masalah | Mengidentifikasi makna x dan y (C2), menerjemahkan narasi ke pertidaksamaan (C3) | C2–C3 |
| K2 | Menyusun rencana | Memilih fungsi tujuan, melengkapi kendala, memutuskan mengecek titik pojok | C3–C4 |
| K3 | Menjalankan rencana | Menemukan titik layak/optimum dan menghitung nilai Z | C3 (C4 bila ada fungsi tujuan) |
| K4 | Memeriksa kembali | Menganalisis trade-off (C4); merevisi setelah kebijakan berubah dan menilai solusi (C5) | C4–C5 |

---

## 3. Klasifikasi tiap soal

| Kode | Tugas utama | Refleksi | **Jenjang soal** | Alasan singkat |
|---|---|---|---|---|
| L1-SDG11-A | C3 | C4 | **C4** | Menyusun 2 pertidaksamaan langsung dari narasi; refleksi menanyakan apa yang dikorbankan |
| L1-SDG13-A | C3 | C4 | **C4** | Sama, termasuk pertidaksamaan ketat (>) |
| L1-SDG11&13-A | C3 | C4 | **C4** | Sama, rasio "paling sedikit sama dengan" |
| L2-SDG11-A | C3 | C4 | **C4** | Menyusun sistem dari narasi + tabel, bilangan desimal; refleksi membandingkan kendala pembatas |
| L2-SDG13-A | C3 | C4 | **C4** | Sama, bilangan besar |
| L2-SDG11&13-A | C3 | C4 | **C4** | Tiga kendala termasuk rasio; refleksi menentukan kendala paling membatasi (narasi direvisi, R3) |
| L3-SDG11-A | C4 | C4 | **C4** | Optimasi: membandingkan nilai Z di titik pojok |
| L3-SDG13-A | C4 | C4 | **C4** | Minimasi; refleksi menganalisis mengapa solusi termurah tidak layak |
| L3-SDG11&13-A | C4 | C4 | **C4** | Maksimasi dengan kendala rasio; refleksi menganalisis konsekuensi |
| L4-SDG11-A | C4 | **C5** | **C5** | Menyimpulkan kendala tersirat (30% × 120); refleksi menilai apakah kenaikan standar RTH sepadan dengan KK yang hilang (R1) |
| L4-SDG13-A | C4 | **C5** | **C5** | Menyimpulkan batas emisi tersirat; refleksi menilai apakah tarif karbon layak dipertahankan (R2) |
| L4-SDG11&13-A | C4 | **C5** | **C5** | Refleksi meminta **menilai** kebijakan mana yang lebih penting dan memberi alasan |

**Ringkasnya:**
- **Level 1–2: C3.** Siswa menyusun model pertidaksamaan. Pertanyaan refleksinya baru menyentuh C4.
- **Level 3: C4.** Siswa mengoptimasi dengan membandingkan titik pojok.
- **Level 4: C5.** Siswa menyimpulkan kendala tersirat, merevisi solusi setelah kebijakan berubah, lalu menilai kebijakan itu. Ketiga varian kini setara.
- **Tidak ada soal C1, C2, maupun C6.** C1 dan C2 tidak muncul sebagai soal tersendiri; C2 hanya ada sebagai langkah di dalam K1.

---

## 4. Temuan

1. **Level 1 dan Level 2 berada di jenjang yang sama (C3).** Level 2 lebih
   *sulit*: lebih banyak kendala, ada tabel, dan bilangannya desimal atau besar.
   Tetapi proses berpikirnya tetap menyusun model. Kenaikan dari L1 ke L2 adalah
   kenaikan kompleksitas, bukan kenaikan jenjang kognitif. Ini dapat diterima
   karena keduanya menjadi pijakan, tetapi perlu ditulis demikian di BAB III.

2. **[Diselesaikan dengan R1 dan R2] Tingkat C5 semula hanya tercapai pada satu dari tiga soal Level 4.** Tahap K4
   (memeriksa kembali) idealnya menuntut menilai solusi (C5). Refleksi
   L4-SDG11-A dan L4-SDG13-A masih meminta *menjelaskan sebab-akibat* (C4),
   bukan *menilai* keputusan. Akibatnya varian Level 4 tidak setara secara
   kognitif. Siswa yang mendapat varian C sedang mengerjakan soal yang lebih
   tinggi jenjangnya daripada temannya.

3. **Tidak ada soal C6.** Instrumen pemecahan masalah tidak wajib memuat C6,
   tetapi bila kisi-kisi mengklaim mengukur HOTS secara utuh (C4–C6), klaim itu
   belum didukung soal.

4. **[Diselesaikan dengan R3] Ketidakkonsistenan isi pada L2-SDG11&13-A.** Narasi menyebut zona
   industri *menghasilkan retribusi* Rp 25 juta/hektar, yaitu pemasukan. Namun
   tabel dan kunci jawaban memperlakukan angka itu sebagai *biaya
   operasional* (`15x + 25y ≤ 900`). Siswa yang membaca narasi dengan cermat
   dapat menyusun model yang berbeda dan dinilai salah. Ini cacat butir,
   bukan soal jenjang Bloom, dan sebaiknya diperbaiki sebelum pengambilan data.

---

## 5. Penyesuaian

**R1–R3 sudah diterapkan** pada `server/src/tasks/level2.ts` dan
`level4.ts`, dan field `bloom` serta tabel di atas sudah diperbarui.
R4 belum diterapkan. Karena teks soal berubah, **paket validasi untuk dosen
ahli perlu memakai teks yang baru**.

| # | Soal | Saat ini | Usulan | Jenjang |
|---|---|---|---|---|
| R1 | L4-SDG11-A (refleksi) | "…berapa kepala keluarga yang harus dikorbankan akibat kebijakan baru ini, dan mengapa hal itu terjadi?" | "Hitung berapa kepala keluarga yang dikorbankan akibat kebijakan baru ini. Menurutmu, apakah kenaikan standar RTH itu sepadan? Berikan alasan berdasarkan hasil perhitunganmu." | C4 → **C5** |
| R2 | L4-SDG13-A (refleksi) | "…mengapa kebijakan tarif karbon dapat mengubah jawaban yang tadinya sudah paling optimal?" | "Jelaskan mengapa tarif karbon mengubah komposisi mesin termurah. Apakah kota sebaiknya tetap memberlakukan tarif itu walaupun biaya operasional naik? Nilai keputusan itu berdasarkan perubahan biaya dan emisi pada hasilmu." | C4 → **C5** |
| R3 | L2-SDG11&13-A (narasi) | "…setiap hektar zona industri **menghasilkan retribusi** Rp 25 juta per tahun…" | "…setiap hektar zona industri **membutuhkan biaya operasional** Rp 25 juta per tahun…" | perbaikan butir |
| R4 | (opsional) Level 2 | – | Tambahkan satu data pengecoh yang tidak relevan pada tabel, sehingga siswa harus *memilah* informasi (C4). | C3 → C4 |

R1 dan R2 menyetarakan ketiga varian Level 4 pada C5. Kedua usulan tetap
meminta siswa menyebut trade-off dan alasannya ("karena"), sehingga heuristik
K4 (`scoring/k4.ts`) dan `expectedTerms` tidak perlu diubah.

R4 bersifat opsional. Data pengecoh menambah beban membaca, jadi perlu
ditimbang terhadap prinsip §7.7 bahwa instrumen tidak boleh berubah menjadi
pengukur kemampuan membaca.

C6 sengaja tidak diusulkan sebagai butir yang diskor. Merancang kebijakan
atau model baru menghasilkan jawaban terbuka yang tidak dapat diskor otomatis
secara andal. Bila diperlukan, tempatkan sebagai pertanyaan refleksi akhir
sesi yang tidak diskor.
