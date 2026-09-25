PANDUAN DEPLOYMENT LENGKAP
Ecomath Mission: Sustainable City Challenge
Dari nol sampai sistem bisa diakses siswa via link — untuk pengambilan data skripsi
# 0. Peta Besar: Apa yang Akan Kita Bangun
Dokumen ini mengasumsikan kamu memakai Claude Code untuk menghasilkan kode (sesuai prompt terpisah), dan tugasmu di sini adalah men-deploy hasilnya supaya bisa diakses siswa dari HP/laptop lewat sebuah link, tanpa perlu instalasi apa pun di sisi siswa.
Tiga layanan online gratis/murah yang akan kita pakai (semuanya punya tier gratis yang cukup untuk skala penelitian skripsi):
[TABLE]
Layanan | Fungsi | Kenapa dipilih
Vercel | Meng-host tampilan game (front-end) | Gratis, deploy otomatis dari GitHub, sangat mudah untuk pemula
Railway | Meng-host server (backend) dan database | Satu platform untuk backend + PostgreSQL sekaligus, tidak perlu setup terpisah
GitHub | Menyimpan kode sumber | Jembatan antara komputer kamu dan Vercel/Railway; deploy terjadi otomatis saat kode di-push
[/TABLE]

Alur singkatnya: kode di komputer kamu → di-push ke GitHub → Railway dan Vercel otomatis mengambil kode itu dan menjalankannya di server mereka → kamu dapat link (misal https://ecomath-mission.vercel.app) yang bisa dibagikan ke siswa.

# 1. Checklist Sebelum Mulai
Siapkan hal-hal berikut sebelum mengikuti langkah selanjutnya. Semua gratis.
Akun GitHub (daftar di github.com jika belum punya)
Akun Railway (daftar di railway.app, bisa langsung pakai akun GitHub)
Akun Vercel (daftar di vercel.com, bisa langsung pakai akun GitHub)
Akun Anthropic Console dengan akses Claude Code (jika belum, lihat docs.claude.com untuk cara mengaktifkan)
Laptop/PC dengan sistem operasi Windows, macOS, atau Linux, koneksi internet stabil
Waktu luang sekitar 2-3 jam untuk sesi setup pertama (setelah itu update berikutnya jauh lebih cepat)
# 2. Instalasi Tools di Komputer Lokal
## 2.1 Install Node.js
Node.js dibutuhkan untuk menjalankan kode JavaScript/TypeScript di komputer kamu.
Buka nodejs.org
Unduh versi LTS (Long Term Support) — pilih yang direkomendasikan, bukan versi paling baru/experimental
Jalankan installer, ikuti instruksi default (klik Next/Continue terus)
Setelah selesai, buka Terminal (macOS/Linux) atau Command Prompt/PowerShell (Windows), ketik perintah berikut untuk memastikan berhasil:
node --version
npm --version
Jika muncul nomor versi (misal v20.11.0), instalasi berhasil.
## 2.2 Install Git
Git dibutuhkan untuk mengirim kode ke GitHub.
Buka git-scm.com/downloads
Unduh sesuai sistem operasimu, install dengan pengaturan default
Cek dengan perintah:
git --version
## 2.3 Install Claude Code
Buka terminal, jalankan:
npm install -g @anthropic-ai/claude-code
Setelah selesai, jalankan perintah berikut untuk login/autentikasi (ikuti instruksi yang muncul di layar, biasanya membuka browser untuk login):
claude
Jika kamu tidak yakin proses instalasi Claude Code masih sesuai versi terbaru, cek panduan resminya di docs.claude.com karena langkah instalasi bisa berubah dari waktu ke waktu.

# 3. Menjalankan Claude Code untuk Membangun Project
Buat folder baru khusus untuk project ini, misalnya di Desktop, beri nama ecomath-mission
Buka terminal, arahkan ke folder tersebut:
cd Desktop/ecomath-mission
Buat folder docs/ di dalamnya, lalu salin file EcomathMission_ECD_Framework.docx ke dalam folder docs/ tersebut
Jalankan Claude Code di folder ini:
claude
Tempelkan seluruh isi dari dokumen "Prompt untuk Claude Code" (dokumen terpisah yang sudah disiapkan) sebagai pesan pertama
Claude Code akan membaca dokumen ECD, memberi ringkasan pemahaman, lalu mengusulkan struktur folder. Baca usulan itu — jika masuk akal, balas "lanjutkan" atau "ya, silakan"
Ikuti instruksi Claude Code selanjutnya secara bertahap. Ia mungkin akan bertanya beberapa hal (misalnya nilai ambang batas tertentu) — jawab sesuai konteks penelitianmu, atau minta rekomendasi jika ragu
Proses ini bisa memakan waktu cukup lama (bisa 30-60 menit tergantung kompleksitas) karena membangun backend, database, dan front-end sekaligus
Catatan penting: Claude Code akan menuliskan banyak file kode ke folder project ini secara otomatis. Ini normal dan diharapkan — itulah fungsinya.
# 4. Menjalankan dan Menguji Secara Lokal
Setelah Claude Code selesai membangun project, uji dulu di komputer sendiri sebelum deploy ke internet.
## 4.1 Menjalankan database lokal
Claude Code kemungkinan akan menyertakan instruksi spesifik di README.md yang dihasilkannya — ikuti itu sebagai prioritas. Umumnya langkahnya:
Masuk ke folder server:
cd server
Install semua dependency:
npm install
Salin file .env.example menjadi .env, lalu isi nilai-nilai yang dibutuhkan (untuk lokal, biasanya database SQLite tidak butuh konfigurasi rumit)
Jalankan migrasi database:
npx prisma migrate dev
Jalankan seed data (mengisi bank skenario):
npx prisma db seed
Jalankan server backend:
npm run dev
Biarkan terminal ini tetap terbuka dan berjalan.
## 4.2 Menjalankan front-end
Buka terminal BARU (jangan tutup yang sebelumnya), masuk ke folder client:
cd client
Install dependency:
npm install
Jalankan:
npm run dev
Buka browser, akses alamat yang muncul di terminal (biasanya http://localhost:5173)
Coba mainkan alur lengkap: mulai sesi, kerjakan satu skenario, submit, lihat apakah skor muncul
Jika ada error, salin pesan errornya dan tanyakan ke Claude Code (jalankan claude lagi di folder yang sama, tempel pesan errornya) — ini adalah cara normal debugging, jangan panik.

# 5. Mengunggah Kode ke GitHub
Setelah versi lokal berjalan baik, unggah kode ke GitHub supaya Railway dan Vercel bisa mengaksesnya.
Buat repository baru di github.com (klik tombol New repository), beri nama misalnya ecomath-mission, biarkan kosong (jangan centang "add README")
Di terminal, dari folder root project (folder ecomath-mission tadi):
git init
git add .
git commit -m "Initial commit: Ecomath Mission"
git branch -M main
git remote add origin https://github.com/USERNAME/ecomath-mission.git
git push -u origin main
Ganti USERNAME dengan username GitHub kamu. Alamat lengkapnya bisa disalin dari halaman repository yang baru dibuat.
PENTING: pastikan file .env (yang berisi kredensial asli) TIDAK ikut ter-upload. Claude Code seharusnya sudah membuatkan file .gitignore yang mengecualikan .env secara otomatis — cek isi file .gitignore untuk memastikan baris ".env" ada di dalamnya sebelum melakukan git push.
# 6. Deploy Database dan Backend ke Railway
Buka railway.app, login dengan akun GitHub
Klik "New Project" → pilih "Deploy from GitHub repo" → pilih repository ecomath-mission
Railway akan mendeteksi ada folder server/ — jika diminta root directory, arahkan ke folder server
Tambahkan database: di dalam project yang sama, klik "New" → "Database" → "Add PostgreSQL"
Railway otomatis membuat environment variable DATABASE_URL — kamu perlu menghubungkan variable ini ke service backend: buka tab Variables pada service backend, tambahkan DATABASE_URL dengan merujuk ke variable dari service database (Railway biasanya menyediakan tombol "reference" untuk ini)
Tambahkan environment variable lain sesuai isi file .env.example (misalnya ADMIN_API_KEY) lewat tab Variables
Jalankan migrasi database di lingkungan production. Railway menyediakan terminal/shell akses lewat menu service — jalankan:
npx prisma migrate deploy
npx prisma db seed
Setelah deploy selesai (biasanya beberapa menit), Railway memberi kamu sebuah URL publik untuk backend, misalnya https://ecomath-backend-production.up.railway.app — catat URL ini, akan dipakai di langkah 7
# 7. Deploy Front-end ke Vercel
Buka vercel.com, login dengan akun GitHub
Klik "Add New" → "Project" → pilih repository ecomath-mission
Pada pengaturan project, set "Root Directory" ke folder client
Tambahkan environment variable untuk URL backend, misalnya VITE_API_URL, isi dengan URL Railway dari langkah sebelumnya (https://ecomath-backend-production.up.railway.app)
Klik Deploy
Setelah selesai (biasanya 1-3 menit), Vercel memberi link publik, misalnya https://ecomath-mission.vercel.app — INILAH link yang akan dibagikan ke siswa

# 8. Menghubungkan Semuanya dan Konfigurasi CORS
Backend perlu diberi tahu bahwa permintaan dari alamat Vercel itu diizinkan (CORS).
Buka kembali dashboard Railway, masuk ke service backend, tab Variables
Tambahkan/pastikan ada variable seperti ALLOWED_ORIGIN atau CORS_ORIGIN, isi dengan URL Vercel kamu (https://ecomath-mission.vercel.app)
Jika backend belum otomatis membaca variable ini untuk konfigurasi CORS, minta Claude Code menyesuaikan kode agar CORS mengizinkan origin dari environment variable tersebut, lalu push ulang perubahan ke GitHub (Railway dan Vercel akan otomatis redeploy ketika ada push baru)
# 9. Uji End-to-End Setelah Deploy
Sebelum dipakai ke siswa sungguhan, uji sendiri dulu dari perangkat berbeda (misalnya HP kamu, bukan cuma laptop yang dipakai develop):
Buka link Vercel dari HP, pastikan tampilan game muncul dengan benar
Coba selesaikan satu skenario penuh sampai submit
Cek di dashboard Railway (tab database atau lewat endpoint admin) apakah data log dan skor benar-benar tersimpan
Uji dari 2-3 perangkat berbeda secara bersamaan untuk memastikan sistem tidak error saat diakses banyak orang sekaligus (mensimulasikan kondisi kelas)
Minta 1-2 teman/rekan untuk mencoba sebagai uji coba independen sebelum dipakai ke sampel penelitian sungguhan
# 10. Saat Pengambilan Data Berlangsung
Siapkan kode kelas/identifier unik untuk tiap kelas atau sesi pengambilan data, agar data mudah dipilah saat analisis
Pastikan koneksi internet di lokasi pengambilan data (sekolah) memadai untuk mengakses link tersebut secara bersamaan
Siapkan rencana cadangan: jika server bermasalah di tengah sesi (jarang terjadi tapi mungkin), siapkan versi cadangan berupa lembar kerja fisik/PDF dari skenario yang sama sebagai fallback, supaya sesi tidak batal total
Railway tier gratis punya batas jam pemakaian bulanan — cek dashboard Railway untuk memastikan kuota masih cukup selama masa pengambilan data; jika mepet, pertimbangkan upgrade ke tier berbayar (biasanya sangat murah, beberapa dolar) khusus selama masa pengambilan data
# 11. Mengekspor Data untuk Analisis Skripsi
Akses endpoint admin yang sudah dibuat Claude Code (misalnya https://ecomath-backend-production.up.railway.app/api/admin/results), sertakan API key admin sesuai instruksi README
Unduh hasilnya dalam format CSV (atau minta Claude Code menambahkan tombol unduh CSV langsung di endpoint tersebut jika belum ada)
Buka file CSV tersebut di Excel/Google Sheets untuk pemeriksaan awal, pastikan tidak ada data yang hilang/rusak
Impor ke SPSS/R/Jamovi sesuai kebutuhan analisis (uji validitas item, reliabilitas Cronbach's alpha, atau analisis lain sesuai BAB III/IV skripsimu)

# 12. Troubleshooting Umum
[TABLE]
Gejala | Kemungkinan Penyebab | Solusi
Halaman blank/putih saat dibuka | VITE_API_URL salah atau backend belum jalan | Cek environment variable di Vercel, cek status service di Railway
Error CORS di console browser | Backend belum mengizinkan origin dari Vercel | Ulangi langkah 8, pastikan ALLOWED_ORIGIN sesuai persis (termasuk https://)
Data tidak tersimpan ke database | Migrasi belum dijalankan di production, atau DATABASE_URL salah | Jalankan ulang npx prisma migrate deploy di shell Railway
Railway bilang kuota/jam habis | Tier gratis terlampaui | Upgrade ke tier berbayar sementara, atau tunggu reset bulanan
npm install gagal di lokal | Versi Node.js tidak cocok | Cek README untuk versi Node.js yang direkomendasikan, install ulang versi tersebut
Perubahan kode tidak muncul di link publik | Lupa git push, atau deploy belum selesai | Cek riwayat deploy di dashboard Railway/Vercel, pastikan status Success
[/TABLE]

Untuk error yang tidak tercantum di tabel ini: salin pesan error lengkap (jangan diringkas), jalankan claude di folder project, dan tempelkan pesan tersebut sambil menjelaskan langkah apa yang sedang kamu lakukan saat error muncul.
# 13. Checklist Keamanan dan Etika Data Siswa
Karena ini instrumen penelitian yang melibatkan data siswa (kemungkinan di bawah umur), perhatikan hal berikut sebelum pengambilan data:
Pastikan sudah mendapat persetujuan etik penelitian (ethical clearance) dari kampus/institusi sesuai prosedur yang berlaku, termasuk persetujuan orang tua/wali jika disyaratkan untuk subjek di bawah umur
Jangan menyimpan data pengenal langsung yang tidak perlu (nama lengkap, alamat) — gunakan kode/inisial siswa jika memungkinkan sesuai desain penelitianmu
Cek kebijakan privasi Railway dan Vercel sebagai pemroses data pihak ketiga, dan sertakan informasi ini dalam bagian metodologi/etik skripsimu bila diperlukan oleh institusi
Setelah masa penelitian selesai dan data sudah diekspor dengan aman, pertimbangkan menghapus data dari server (dan/atau mematikan deployment) untuk meminimalkan risiko kebocoran data jangka panjang
Simpan salinan cadangan data hasil ekspor CSV di tempat yang aman (Google Drive/hard drive terenkripsi) segera setelah pengambilan data selesai, sebelum melakukan langkah pembersihan di atas
