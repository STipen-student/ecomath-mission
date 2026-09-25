/**
 * Ekspor data penelitian Ecomath Mission ke CSV.
 *
 * CARA MENJALANKAN (dari folder server/):
 *
 *     npm run export:csv
 *     npm run export:csv -- --out ../exports --class XI-IPA-1
 *     npm run export:csv -- --trace
 *
 * Argumen:
 *     --out <folder>   folder tujuan berkas CSV (bawaan: server/exports)
 *     --class <kode>   hanya ekspor satu kode kelas
 *     --trace          sertakan kolom jejak audit rubrik (berisi JSON, berukuran besar)
 *
 * Berkas yang dihasilkan:
 *     sessions.csv      satu baris per siswa
 *     scores_long.csv   satu baris per percobaan (siswa x level) - untuk analisis butir/Rasch
 *     scores_wide.csv   satu baris per siswa, kolom K1_L1..K4_L4 - untuk Cronbach's alpha
 *     events.csv        seluruh log mentah - untuk analisis proses
 *
 * Berkas ini sengaja hanya menjadi titik masuk. Logikanya berada di
 * server/src/export/exportCsv.ts supaya dapat memakai Prisma Client dan modul
 * skoring yang sama persis dengan yang dipakai server - sehingga skor pada CSV
 * tidak mungkin berbeda dari skor di database.
 *
 * PERINGATAN ETIKA: berkas hasil ekspor memuat data siswa. Simpan di tempat
 * yang aman, jangan di-commit ke repositori (folder exports/ dan *.csv sudah
 * dikecualikan .gitignore), dan hapus dari server setelah pengambilan data
 * selesai sesuai Checklist Keamanan pada Panduan Deployment.
 */

import { main } from '../../server/src/export/exportCsv.js';

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error('Ekspor gagal:', err);
  process.exit(1);
});
