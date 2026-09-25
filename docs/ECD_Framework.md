ECOMATH MISSION: SUSTAINABLE CITY CHALLENGE
Dokumen Kerangka Evidence-Centered Design (ECD): Student Model, Evidence Model, Task Model, Log Rubrik, dan Bank Skenario Level 1-4
Instrumen asesmen berbasis permainan untuk mengukur kemampuan pemecahan masalah matematis pada materi Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV) dalam konteks SDG 11 (Kota dan Permukiman Berkelanjutan) dan SDG 13 (Penanganan Perubahan Iklim)
# 1. Kerangka Evidence-Centered Design (ECD)
Evidence-Centered Design (Mislevy, Steinberg, & Almond) menyusun asesmen sebagai argumen berbasis bukti: mulai dari apa yang ingin diklaim tentang kemampuan siswa (Student Model), diturunkan menjadi perilaku/respons apa yang menjadi bukti sah atas klaim tersebut (Evidence Model), lalu situasi/tugas apa yang harus dirancang agar bukti tersebut dapat muncul (Task Model). Ketiga model ini menjadi kerangka bab metodologi dan menjamin bahwa validitas konstruk instrumen dapat dipertanggungjawabkan secara eksplisit, bukan diklaim secara post-hoc setelah game selesai dibangun.
Alur logis dokumen ini: (1) Student Model mendefinisikan klaim kompetensi yang diukur; (2) Evidence Model mendefinisikan variabel yang diobservasi dari log permainan dan aturan penskoran yang menghubungkan observasi ke klaim; (3) Task Model mendefinisikan fitur-fitur skenario yang dapat dikombinasikan sistem untuk memunculkan bukti tersebut, disertai bank skenario konkret Level 1 sampai 4.
# 2. Student Model (Model Kompetensi)
Kemampuan pemecahan masalah matematis didekomposisi menjadi empat klaim (K) mengacu pada tahapan Polya, masing-masing diukur pada skala 0-3 (rubrik lengkap pada Bagian 5). Skor total siswa adalah profil multidimensi atas empat klaim ini, bukan skor tunggal.
[TABLE]
Klaim | Nama | Deskripsi Kompetensi yang Diklaim
K1 | Memahami Masalah | Mampu mengidentifikasi variabel, besaran diketahui, dan menerjemahkan pernyataan verbal konteks SDG menjadi model pertidaksamaan linear dua variabel yang benar.
K2 | Merencanakan Penyelesaian | Mampu menyusun sistem pertidaksamaan secara lengkap (termasuk syarat non-negatif bila relevan) dan memilih strategi penyelesaian (grafik/uji titik pojok) yang sesuai dengan fungsi tujuan.
K3 | Melaksanakan Rencana | Mampu menentukan daerah penyelesaian (irisan himpunan penyelesaian) secara akurat dan menghitung/menentukan titik optimum yang memenuhi seluruh kendala.
K4 | Memeriksa Kembali | Mampu mengevaluasi kewajaran solusi terhadap konteks nyata (SDG 11/13), mengidentifikasi trade-off antar kendala, dan merevisi solusi bila terjadi pelanggaran kendala tersembunyi/implisit.
[/TABLE]

Catatan desain: K4 sengaja dibobot lebih besar pada Level 4 karena merupakan pembeda utama antara siswa yang menyelesaikan soal secara prosedural dan siswa yang benar-benar bernalar dalam konteks keberlanjutan (misalnya menyadari solusi matematis valid tetapi secara kontekstual tidak masuk akal, seperti luas RTH negatif atau melebihi luas kota).
# 3. Evidence Model
Evidence Model menjembatani Student Model dan Task Model melalui dua komponen: (a) Observable Variables — variabel yang dapat diekstraksi langsung dari log interaksi siswa dengan sistem; (b) Scoring Rule — fungsi yang memetakan kombinasi observable variables menjadi skor 0-3 pada tiap klaim. Rincian skema log dan rubrik skor lengkap disajikan di Bagian 5. Ringkasan keterkaitan klaim-observasi disajikan berikut.
[TABLE]
Klaim | Observable Variable (dari log) | Contoh Indikator Perilaku
K1 | identify_variables_action, misconception_flag_translate | Siswa menetapkan label variabel x/y sesuai konteks sebelum menggeser slider; tidak menukar peran kendala anggaran dengan kendala lahan.
K2 | constraint_count_written, objective_function_selected, planning_time_ms | Jumlah kendala yang dituliskan/dipilih siswa sebelum mulai membangun sesuai jumlah kendala pada task; fungsi tujuan (maksimum/minimum indeks SDG) dipilih secara eksplisit di awal, bukan trial-error.
K3 | final_position_xy, boundary_violation_count, corner_point_check_action | Posisi akhir zona (x,y) berada tepat di dalam/pada batas daerah penyelesaian; jumlah kali sistem menolak konfigurasi karena melanggar kendala; siswa mengecek nilai fungsi tujuan pada lebih dari satu titik pojok sebelum submit.
K4 | post_solution_edit_count, tradeoff_acknowledgement_action, feasibility_reflection_response | Setelah solusi awal valid, siswa tetap melakukan penyesuaian saat diberi kendala tambahan mendadak (event SDG); siswa memilih/menulis alasan trade-off pada pertanyaan reflektif tertutup di akhir skenario.
[/TABLE]

# 4. Task Model
Task Model mendefinisikan fitur-fitur skenario (task features) yang dapat dikombinasikan secara sistematis oleh sistem untuk menghasilkan variasi soal tanpa mengubah konstruk yang diukur. Kombinasi fitur inilah yang membuat bank skenario bersifat generatif/kombinatorial, bukan sekadar empat soal tetap.
## 4.1 Task Features (dimensi yang dapat dikombinasikan)
[TABLE]
Fitur | Nilai yang Mungkin | Efek terhadap Task
Konteks SDG | SDG 11 dominan / SDG 13 dominan / SDG 11 & 13 berimbang | Mengubah narasi dan variabel (RTH vs kawasan industri; transportasi publik vs kendaraan pribadi; energi terbarukan vs energi fosil)
Jumlah kendala | 1 (Level 1) / 2 (Level 2) / 2-3 (Level 3) / 3-4 dengan 1 kendala implisit (Level 4) | Menentukan kompleksitas sistem pertidaksamaan yang harus disusun
Jenis bilangan | Bilangan bulat sederhana / bilangan bulat besar / pecahan-desimal (mis. rasio persentase) | Mengontrol tingkat kesulitan komputasi tanpa mengubah struktur konsep
Bentuk fungsi tujuan | Memaksimumkan 1 indikator / meminimumkan biaya / memaksimumkan indeks gabungan (2 indikator berbobot) | Mengontrol kompleksitas tahap K2-K3
Distraktor/perubahan mendadak | Tidak ada / ada event kebijakan baru di tengah skenario (mis. subsidi berubah, kuota emisi diperketat) | Memicu munculnya bukti K4 (evaluasi ulang & revisi)
Representasi awal | Cerita naratif murni / cerita + tabel data / cerita + grafik parsial | Mengontrol beban literasi vs beban translasi matematis
[/TABLE]

## 4.2 Aturan Kombinasi per Level (Assembly Rule)
Sistem memilih task secara acak berstrata atau adaptif dari bank skenario dengan batasan berikut, sehingga tiap siswa dapat memperoleh permukaan soal berbeda tanpa mengubah tingkat kesulitan konstruknya:
Level 1: 1 kendala, bilangan bulat sederhana, tanpa distraktor, representasi naratif murni. Fokus bukti: K1 dominan.
Level 2: 2 kendala, bilangan bulat sederhana/besar, tanpa distraktor, boleh + tabel data. Fokus bukti: K1-K2.
Level 3: 2-3 kendala, bilangan campuran, fungsi tujuan gabungan diperbolehkan, tanpa distraktor. Fokus bukti: K2-K3.
Level 4: 3-4 kendala termasuk 1 implisit, WAJIB ada distraktor/event kebijakan, representasi naratif + grafik parsial. Fokus bukti: K3-K4, dengan bobot K4 diperbesar.
Setiap kombinasi fitur pada satu level menghasilkan varian skenario berbeda (lihat Bagian 6-9) namun tetap disetarakan (equated) melalui expert judgment agar tingkat kesukaran antar-varian dalam level yang sama relatif setara — ini penting untuk validitas isi dan untuk analisis butir (item-total correlation) pada tahap uji coba instrumen.

# 5. Log Rubrik
## 5.1 Skema Log (Format Data Mentah)
Setiap keputusan siswa dicatat sebagai satu baris log terstruktur (disarankan disimpan sebagai JSON per event, kemudian diagregasi per sesi task). Struktur field wajib:
[TABLE]
Field | Tipe | Keterangan
session_id | string | ID unik sesi pengerjaan siswa
task_id | string | ID skenario (lihat kode task pada Bagian 6-9, mis. L1-SDG11-A)
timestamp_ms | integer | Waktu event sejak task dimulai
event_type | enum | identify_variable | write_constraint | select_objective | move_slider | check_corner_point | attempt_submit | reject_by_system | reflection_response | revise_after_event
payload | object | Detail event, mis. {x:120,y:80} untuk move_slider, atau {constraint_text:'...'} untuk write_constraint
is_valid_at_time | boolean | Apakah state saat event terjadi memenuhi seluruh kendala task
duration_since_last_event_ms | integer | Digunakan untuk mendeteksi pola planning vs trial-error
[/TABLE]

Dari log mentah ini diturunkan variabel agregat per sesi yang menjadi input rubrik: jumlah_revisi, waktu_perencanaan_awal, jumlah_pelanggaran_kendala, jumlah_titik_pojok_dicek, ada_tidaknya_respons_reflektif, dan konsistensi_setelah_event_distraktor.
## 5.2 Rubrik Penskoran (0-3) per Klaim
Rubrik berikut berlaku umum lintas level; deskriptor disesuaikan intensitasnya mengikuti kompleksitas task (jumlah kendala) pada level terkait. Skor 0-3 mengikuti prinsip skala Likert performa: 0 tidak muncul, 1 muncul sebagian dengan kesalahan signifikan, 2 muncul dengan kesalahan minor, 3 muncul lengkap dan tepat.
### K1 - Memahami Masalah
[TABLE]
Skor | Deskriptor Berbasis Log
0 | identify_variable_action tidak muncul atau variabel yang ditetapkan tidak sesuai konteks (mis. menukar x dan y tanpa mempengaruhi konsistensi solusi akhir)
1 | Variabel diidentifikasi namun write_constraint pertama menunjukkan miskonsepsi besaran (mis. salah tanda pertidaksamaan yang mengubah arah kendala secara fundamental)
2 | Variabel dan minimal satu kendala utama diterjemahkan benar, namun ada kekeliruan kecil (mis. lupa satuan/skala) yang terdeteksi dari revisi berikutnya
3 | Seluruh variabel dan kendala pada narasi diterjemahkan tepat pada percobaan pertama tanpa revisi struktural
[/TABLE]

### K2 - Merencanakan Penyelesaian
[TABLE]
Skor | Deskriptor Berbasis Log
0 | select_objective tidak dilakukan sebelum siswa mulai memindah slider/zona (indikasi trial-error tanpa rencana)
1 | Fungsi tujuan dipilih tetapi jumlah kendala yang dituliskan/disusun tidak lengkap dibanding task_id (kurang dari jumlah kendala yang diminta)
2 | Seluruh kendala disusun dan fungsi tujuan dipilih, tetapi strategi penyelesaian yang tersirat dari urutan aksi tidak efisien (mis. tidak mengecek titik pojok sama sekali sebelum submit pertama)
3 | Seluruh kendala tersusun lengkap, fungsi tujuan dipilih di awal, dan check_corner_point_action muncul sebelum attempt_submit pertama
[/TABLE]

### K3 - Melaksanakan Rencana
[TABLE]
Skor | Deskriptor Berbasis Log
0 | final_position_xy berada di luar daerah penyelesaian pada submit terakhir (reject_by_system > 0 tanpa perbaikan)
1 | Posisi akhir valid tetapi bukan pada/dekat titik optimum (nilai fungsi tujuan jauh dari nilai optimal, > toleransi yang ditetapkan per task)
2 | Posisi akhir berada pada titik optimum yang benar, namun proses menunjukkan banyak percobaan gagal (boundary_violation_count tinggi) sebelum tercapai
3 | Posisi akhir tepat pada titik optimum dengan proses yang efisien (boundary_violation_count minimal, sesuai ambang batas per level)
[/TABLE]

### K4 - Memeriksa Kembali
[TABLE]
Skor | Deskriptor Berbasis Log
0 | Tidak ada revise_after_event meskipun terjadi event distraktor (khusus Level 4); reflection_response tidak dijawab atau asal pilih
1 | Ada upaya revisi setelah event distraktor tetapi solusi baru tetap melanggar kendala baru
2 | Revisi berhasil memenuhi kendala baru, tetapi reflection_response menunjukkan pemahaman trade-off yang tidak lengkap (mis. tidak menyebut kendala mana yang dikorbankan)
3 | Revisi berhasil dan reflection_response secara eksplisit mengidentifikasi trade-off antar-kendala/SDG serta memberi justifikasi kewajaran solusi akhir
[/TABLE]

Catatan: pada Level 1-3 yang tidak memiliki event distraktor wajib, K4 tetap dapat diukur melalui reflection_response berupa pertanyaan tertutup singkat di akhir task (mis. "Apakah solusimu masih dapat diperbaiki agar lebih ramah lingkungan tanpa melebihi anggaran?"), namun bobotnya lebih kecil terhadap skor komposit dibanding Level 4.

# 6. Bank Skenario Level 1
Karakteristik Level 1: 1 kendala eksplisit, bilangan bulat sederhana, tanpa distraktor, representasi naratif murni. Fokus bukti dominan: K1. Setiap varian di bawah dapat dikombinasikan sistem secara acak berdasarkan fitur Konteks SDG.
### Varian L1-SDG11-A: Ruang Terbuka Hijau
Sebuah kota kecil bernama Ecoville memiliki total lahan kosong seluas 40 hektar yang akan dibagi untuk dua peruntukan: Ruang Terbuka Hijau (RTH) seluas x hektar dan kawasan permukiman baru seluas y hektar. Sesuai target SDG 11, luas RTH minimal harus 2 kali luas kawasan permukiman baru. Tuliskan pertidaksamaan yang menggambarkan hubungan antara x dan y, serta pertidaksamaan yang menggambarkan total lahan yang tersedia.
Model matematis inti: x + y ≤ 40; x ≥ 2y; x ≥ 0, y ≥ 0
Tugas siswa dalam game: menggeser dua slider zona (RTH dan permukiman) pada peta kota; sistem menandai merah bila kombinasi melanggar salah satu kendala
### Varian L1-SDG13-A: Kendaraan Rendah Emisi
Dinas Perhubungan kota Ecoville akan menambah armada transportasi umum sebanyak x unit bus listrik dan y unit bus konvensional, dengan total penambahan tidak lebih dari 24 unit karena keterbatasan garasi. Sesuai komitmen SDG 13, jumlah bus listrik yang ditambahkan harus lebih dari jumlah bus konvensional. Tuliskan pertidaksamaan-pertidaksamaan yang menggambarkan situasi tersebut.
Model matematis inti: x + y ≤ 24; x > y; x ≥ 0, y ≥ 0
Tugas siswa dalam game: menempatkan unit bus di depo melalui drag-and-drop yang direpresentasikan sebagai dua tumpukan (stack) counter, sistem menampilkan sisa kapasitas garasi secara real-time
### Varian L1-SDG11&13-A: Lahan Parkir vs Jalur Sepeda
Pemerintah kota akan merenovasi satu ruas jalan sepanjang total 30 meter lebar efektif menjadi dua peruntukan: lahan parkir selebar x meter dan jalur sepeda selebar y meter. Untuk mendukung mobilitas rendah emisi, lebar jalur sepeda harus paling sedikit sama dengan lebar lahan parkir. Tuliskan pertidaksamaan yang menggambarkan situasi ini.
Model matematis inti: x + y ≤ 30; y ≥ x; x ≥ 0, y ≥ 0
Tugas siswa dalam game: mengatur dua segmen jalan pada tampilan potongan melintang (cross-section) jalan kota
Varian bilangan lain (bilangan bulat besar, mis. total lahan 400 hektar/skala kota besar) dapat digenerate otomatis oleh sistem dari template yang sama dengan mengganti konstanta tanpa mengubah struktur soal.
# 7. Bank Skenario Level 2
Karakteristik Level 2: 2 kendala eksplisit, bilangan bulat sederhana/besar, tanpa distraktor, representasi naratif + tabel data. Fokus bukti dominan: K1-K2.
### Varian L2-SDG11-A: Anggaran dan Lahan Perumahan Terjangkau
Pemerintah kota Greenhaven berencana membangun rumah subsidi tipe A seluas x unit dan rumah subsidi tipe B seluas y unit pada lahan seluas 60 hektar. Anggaran yang tersedia adalah Rp 900 juta, dengan biaya pembangunan tiap unit tipe A Rp 30 juta dan tipe B Rp 20 juta. Setiap unit tipe A membutuhkan lahan 0,04 hektar dan tipe B membutuhkan 0,03 hektar. Tentukan sistem pertidaksamaan yang menggambarkan kendala anggaran dan kendala lahan.

[TABLE]
Jenis Rumah | Biaya per unit | Lahan per unit
Tipe A (x) | Rp 30 juta | 0,04 hektar
Tipe B (y) | Rp 20 juta | 0,03 hektar
[/TABLE]

Model matematis inti: 30x + 20y ≤ 900 (dalam juta rupiah); 0,04x + 0,03y ≤ 60; x ≥ 0, y ≥ 0
Tugas siswa dalam game: mengalokasikan dua tipe rumah pada blok perumahan; dashboard menampilkan sisa anggaran dan sisa lahan secara live sebagai dua progress bar
### Varian L2-SDG13-A: Sumber Energi Kota
Perusahaan listrik kota Greenhaven merencanakan pembangkit tambahan berupa x unit panel surya komunal dan y unit turbin angin mini untuk memenuhi target bauran energi bersih. Total dana investasi tidak melebihi Rp 1,2 miliar, dengan biaya per unit panel surya Rp 40 juta dan turbin angin Rp 60 juta. Luas lahan atap/ruang terbuka yang tersedia adalah 500 meter persegi, dengan kebutuhan ruang tiap panel surya 8 meter persegi dan tiap turbin angin 20 meter persegi. Susun sistem pertidaksamaannya.
Model matematis inti: 40x + 60y ≤ 1200 (juta rupiah); 8x + 20y ≤ 500; x ≥ 0, y ≥ 0
Tugas siswa dalam game: menempatkan ikon panel surya/turbin pada atap gedung kota dan lahan kosong yang telah disediakan dalam viewport isometrik
### Varian L2-SDG11&13-A: Ruang Hijau vs Zona Industri Rendah Emisi
Kota Greenhaven memiliki kawasan pengembangan seluas 50 hektar yang akan dibagi menjadi Ruang Terbuka Hijau seluas x hektar dan Zona Industri Rendah Emisi seluas y hektar. Setiap hektar RTH membutuhkan biaya perawatan Rp 15 juta per tahun dan setiap hektar zona industri menghasilkan retribusi Rp 25 juta per tahun, dengan biaya operasional kota tidak melebihi Rp 900 juta per tahun untuk kedua area ini. Selain itu, luas zona industri tidak boleh melebihi luas RTH. Tentukan sistem pertidaksamaannya.
Model matematis inti: x + y ≤ 50; 15x + 25y ≤ 900; y ≤ x; x ≥ 0, y ≥ 0 (catatan: pada varian ini kendala berjumlah 3 karena menggabungkan lahan+biaya+rasio — dapat digunakan sebagai varian transisi ke Level 3 bila diperlukan penyetaraan kesulitan)

# 8. Bank Skenario Level 3
Karakteristik Level 3: 2-3 kendala, bilangan campuran (termasuk desimal/persentase), fungsi tujuan eksplisit (maksimum/minimum), tanpa distraktor. Fokus bukti dominan: K2-K3.
### Varian L3-SDG11-A: Optimasi Indeks Kenyamanan Kota
Distrik baru kota Meridian memiliki lahan pengembangan seluas 80 hektar untuk dibagi menjadi Taman Kota seluas x hektar dan Trotoar/Ruang Pejalan Kaki seluas y hektar. Anggaran pembangunan sebesar Rp 2,4 miliar, dengan biaya taman Rp 25 juta/hektar dan trotoar Rp 40 juta/hektar. Untuk memenuhi standar aksesibilitas, luas trotoar minimal 10 hektar. Setiap hektar taman memberi skor kenyamanan warga sebesar 8 poin dan setiap hektar trotoar memberi 5 poin. Tentukan kombinasi x dan y yang memaksimumkan total skor kenyamanan warga.
Model matematis inti: x + y ≤ 80; 25x + 40y ≤ 2400; y ≥ 10; x ≥ 0
Fungsi tujuan: Maksimumkan Z = 8x + 5y
Tugas siswa dalam game: setelah menentukan alokasi lahan, sistem meminta siswa memilih salah satu dari beberapa titik pojok yang disorot pada peta sebagai kandidat solusi optimum, lalu memverifikasi dengan menghitung nilai Z
### Varian L3-SDG13-A: Minimisasi Biaya Pengelolaan Sampah dengan Batas Emisi
Kota Meridian mengelola sampah melalui dua metode: pengomposan sebanyak x ton/hari dan daur ulang sebanyak y ton/hari, dengan total kapasitas pengolahan minimal 50 ton/hari untuk memenuhi kebutuhan kota. Emisi karbon dari pengomposan adalah 0,5 kg CO2/ton dan dari daur ulang 0,2 kg CO2/ton, dengan batas emisi total tidak lebih dari 20 kg CO2/hari. Biaya pengomposan Rp 150 ribu/ton dan daur ulang Rp 220 ribu/ton. Tentukan kombinasi x dan y yang meminimumkan biaya total.
Model matematis inti: x + y ≥ 50; 0,5x + 0,2y ≤ 20; x ≥ 0, y ≥ 0
Fungsi tujuan: Minimumkan Z = 150x + 220y (ribu rupiah)
Tugas siswa dalam game: mengatur dua jalur konveyor fasilitas pengolahan sampah kota; sistem menampilkan grafik daerah penyelesaian yang otomatis ter-render dari input siswa sebagai overlay pada peta
### Varian L3-SDG11&13-A: Indeks Kota Berkelanjutan Gabungan
Kota Meridian mengembangkan kawasan campuran seluas 100 hektar untuk Hunian Vertikal Hemat Energi seluas x hektar dan Koridor Hijau seluas y hektar. Total investasi tidak melebihi Rp 5 miliar, dengan biaya hunian vertikal Rp 60 juta/hektar dan koridor hijau Rp 20 juta/hektar. Untuk menjaga kualitas udara, luas koridor hijau tidak boleh kurang dari seperempat luas hunian vertikal. Indeks keberlanjutan kota dihitung dari kontribusi hunian vertikal (mengurangi urban sprawl) sebesar 6 poin/hektar dan koridor hijau (menyerap karbon) sebesar 9 poin/hektar. Tentukan kombinasi yang memaksimumkan indeks keberlanjutan.
Model matematis inti: x + y ≤ 100; 60x + 20y ≤ 5000 (juta rupiah); y ≥ 0,25x; x ≥ 0, y ≥ 0
Fungsi tujuan: Maksimumkan Z = 6x + 9y

# 9. Bank Skenario Level 4
Karakteristik Level 4: 3-4 kendala termasuk 1 kendala implisit (tidak dinyatakan langsung, harus disimpulkan siswa dari narasi), WAJIB terdapat event distraktor/perubahan kebijakan di tengah pengerjaan, representasi naratif + grafik parsial. Fokus bukti dominan: K3-K4 dengan bobot K4 diperbesar.
### Varian L4-SDG11-A: Krisis Lahan Kota Meridian Utara
Distrik Meridian Utara memiliki lahan pengembangan 120 hektar untuk Perumahan Padat Terjangkau seluas x hektar dan Ruang Terbuka Hijau seluas y hektar. Anggaran tersedia Rp 3,6 miliar dengan biaya perumahan Rp 25 juta/hektar dan RTH Rp 18 juta/hektar. Standar kota sehat versi WHO yang diadopsi kota ini mensyaratkan RTH minimal 30% dari luas total kawasan (kendala implisit: y ≥ 0,3 × 120 = 36, harus disimpulkan siswa, tidak dituliskan sebagai angka eksplisit dalam kalimat soal). Tiap hektar perumahan menampung 40 kepala keluarga. Tentukan kombinasi yang memaksimumkan jumlah kepala keluarga tertampung.
Model matematis inti (setelah kendala implisit diuraikan): x + y ≤ 120; 25x + 18y ≤ 3600; y ≥ 36; x ≥ 0
Fungsi tujuan: Maksimumkan Z = 40x
EVENT DISTRAKTOR (muncul setelah siswa submit solusi awal yang valid): "Pemerintah pusat baru saja menaikkan standar minimum RTH kota sehat menjadi 40% dari luas total kawasan akibat revisi kebijakan SDG 11 nasional." Sistem meminta siswa merevisi alokasi lahan dan menjelaskan dampaknya terhadap jumlah kepala keluarga yang dapat tertampung.
Bukti K4 yang diharapkan: siswa menyadari kendala y ≥ 36 berubah menjadi y ≥ 48, merevisi solusi, dan pada reflection_response mampu menjelaskan bahwa kapasitas hunian akan menurun sebagai konsekuensi memenuhi target lingkungan yang lebih ketat (trade-off eksplisit)
### Varian L4-SDG13-A: Transisi Energi Mendadak Distrik Industri
Kawasan industri kota Meridian Selatan mengoperasikan x unit mesin produksi bertenaga fosil dan y unit mesin produksi bertenaga listrik. Kapasitas produksi total dibutuhkan minimal 60 unit mesin untuk memenuhi permintaan pasar. Biaya operasional mesin fosil Rp 12 juta/bulan dan mesin listrik Rp 18 juta/bulan, dengan anggaran operasional maksimal Rp 900 juta/bulan. Kendala implisit: peraturan daerah yang berlaku menyatakan bahwa "emisi kawasan industri tidak boleh melebihi separuh dari total emisi maksimum kota yang diizinkan sebesar 800 kg CO2/bulan" — sehingga batas emisi kawasan ini adalah 400 kg CO2/bulan, dengan emisi mesin fosil 15 kg CO2/unit/bulan dan mesin listrik 2 kg CO2/unit/bulan (siswa harus mengekstraksi angka 400 dari kalimat "separuh dari 800", bukan diberi langsung). Tentukan kombinasi yang meminimumkan biaya operasional.
Model matematis inti: x + y ≥ 60; 12x + 18y ≤ 900; 15x + 2y ≤ 400; x ≥ 0, y ≥ 0
Fungsi tujuan: Minimumkan Z = 12x + 18y (juta rupiah)
EVENT DISTRAKTOR: "Terjadi kenaikan tarif karbon nasional. Kini setiap unit mesin fosil dikenai biaya tambahan Rp 4 juta/bulan." Siswa harus mengevaluasi apakah solusi optimum sebelumnya (kemungkinan besar bertumpu pada mesin fosil bila lebih murah) masih optimum setelah struktur biaya berubah.
Bukti K4 yang diharapkan: siswa mendeteksi bahwa titik optimum bergeser ke arah komposisi mesin listrik lebih tinggi, dan mampu mengartikulasikan bahwa kebijakan karbon mengubah insentif ekonomi yang mendasari solusi optimal sebelumnya
### Varian L4-SDG11&13-A: Skenario Terintegrasi - Rencana Induk Kota Baru
Kota baru bernama Solantis sedang menyusun rencana induk untuk kawasan seluas 200 hektar, dibagi menjadi Zona Hunian Rendah Karbon seluas x hektar dan Zona Hijau Multifungsi (RTH + jalur sepeda + resapan air) seluas y hektar. Total anggaran pembangunan tahap pertama adalah Rp 8 miliar, dengan biaya zona hunian Rp 45 juta/hektar dan zona hijau Rp 22 juta/hektar. Studi kelayakan lingkungan mensyaratkan kapasitas resapan air kota harus mampu menampung debit hujan wilayah tropis, yang menurut standar teknis berarti zona hijau harus mencakup minimal 35% dari total kawasan (kendala implisit lain: y ≥ 0,35 × 200 = 70). Setiap hektar zona hunian menampung setara 500 poin kapasitas penduduk, dan setiap hektar zona hijau berkontribusi 300 poin indeks ketahanan iklim. Tentukan kombinasi yang memaksimumkan total skor gabungan kapasitas penduduk dan ketahanan iklim dengan bobot yang setara.
Model matematis inti: x + y ≤ 200; 45x + 22y ≤ 8000 (juta rupiah); y ≥ 70; x ≥ 0
Fungsi tujuan: Maksimumkan Z = 500x + 300y
EVENT DISTRAKTOR: "Badan Meteorologi merilis proyeksi baru: intensitas hujan ekstrem meningkat 20%, sehingga standar minimum zona hijau direvisi menjadi 45% dari total kawasan." Siswa diminta merevisi solusi dan menjawab pertanyaan reflektif: "Kebijakan mana yang menurutmu lebih penting dipertahankan pada situasi ini: kapasitas penduduk maksimum atau ketahanan terhadap iklim ekstrem? Jelaskan alasanmu berdasarkan hasil optimasimu."
Bukti K4 yang diharapkan: ini adalah item dengan tuntutan penalaran tertinggi dalam bank soal — siswa harus mengintegrasikan hasil kuantitatif (pergeseran nilai Z) dengan argumentasi kualitatif bernuansa (tidak ada jawaban "benar" tunggal untuk pertanyaan reflektif, sehingga penskoran menggunakan rubrik kualitas argumentasi, bukan pencocokan kunci jawaban)

# 10. Tabel Spesifikasi Task (Ringkasan Assembly Model)
Tabel berikut merangkum keterkaitan tiap kode task dengan klaim yang diukur, untuk memudahkan penyusunan Item-Claim Blueprint pada instrumen penelitian dan analisis butir pada tahap uji coba.
[TABLE]
Kode Task | Level | Konteks SDG | Jml Kendala | Klaim Dominan
L1-SDG11-A | 1 | SDG 11 | 1 | K1
L1-SDG13-A | 1 | SDG 13 | 1 | K1
L1-SDG11&13-A | 1 | SDG 11 & 13 | 1 | K1
L2-SDG11-A | 2 | SDG 11 | 2 | K1, K2
L2-SDG13-A | 2 | SDG 13 | 2 | K1, K2
L2-SDG11&13-A | 2 | SDG 11 & 13 | 3* | K1, K2
L3-SDG11-A | 3 | SDG 11 | 3 | K2, K3
L3-SDG13-A | 3 | SDG 13 | 2 | K2, K3
L3-SDG11&13-A | 3 | SDG 11 & 13 | 3 | K2, K3
L4-SDG11-A | 4 | SDG 11 | 3 (1 implisit) + event | K3, K4
L4-SDG13-A | 4 | SDG 13 | 3 (1 implisit) + event | K3, K4
L4-SDG11&13-A | 4 | SDG 11 & 13 | 3 (1 implisit) + event | K3, K4
[/TABLE]

*Varian L2-SDG11&13-A memiliki 3 kendala dan dapat difungsikan sebagai jangkar penyetaraan (anchor item) antara Level 2 dan Level 3 apabila hasil uji coba menunjukkan tingkat kesukaran yang lebih tinggi dari varian Level 2 lainnya.
Sistem generatif dapat memperluas bank ini dengan menggandakan tiap kode task menjadi beberapa varian bilangan (mengganti konstanta numerik pada template yang sama) tanpa mengubah struktur kendala maupun klaim yang diukur, sehingga total pool item dapat diperbesar sesuai kebutuhan uji coba (misalnya untuk keperluan Rasch/IRT yang membutuhkan jumlah item memadai per level kesulitan).
