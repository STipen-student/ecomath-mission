# Draf Instrumen 2 (TheoTown): pemetaan event ke bukti

Status: **DRAF**. Belum divalidasi. Berlaku hanya di branch `theotown-ui`.
Tidak boleh dipakai untuk pengambilan data sebelum ada persetujuan tertulis.

## Perbedaan utama dari instrumen 1.1.0

Pemain membangun bangunan di peta dengan dana terbatas. Penggeser diganti
dengan penempatan bangunan. Jumlah bangunan kini ditentukan oleh dana, bukan
oleh penggeser. Ini mengubah bukti secara mendasar, karena keputusan yang
dulu terlihat sebagai nilai x dan y kini terlihat sebagai pilihan jenis dan
jumlah bangunan.

## Pemetaan aksi ke bukti

| Aksi pemain | Event baru | Bukti | Catatan |
|---|---|---|---|
| Memilih jenis bangunan dari palet | `pilih_bangunan` | K2 | Menunjukkan rencana sebelum bertindak |
| Menaruh bangunan di petak | `tempatkan_bangunan` (jenis, petak, dana sisa) | K1, K2, K3 | Bukti utama translasi kendala ke tindakan |
| Membongkar bangunan | `bongkar_bangunan` | K3, K4 | Revisi setelah umpan balik |
| Melihat keadaan kota (hari berjalan) | `tick_kota` (keadaan ringkas) | K3 | Deskriptif, tidak dipakai rubrik langsung |
| Mengajukan rancangan | `attempt_submit` | K3, K4 | Tetap ada |
| Dewan menolak | `reject_by_system` | K3 | Tetap ada |
| Refleksi dan penilaian diri | `reflection_response`, `self_assessment` | K4, AaL | Tetap, dan tetap disaring dari skor |

## Yang belum diputuskan (perlu dibahas dosen)

1. **Apa yang dihitung sebagai "kendala".** Dalam versi 1.1.0, kendala adalah
   pertidaksamaan. Dalam versi TheoTown, kendala berupa anggaran, hunian, dan
   kebahagiaan. Rubrik K1 harus ditulis ulang untuk ini.
2. **Ekonomi sebagai bukti.** Apakah pemain yang membangun pabrik demi pajak
   lalu menanggung polusi menunjukkan K3 atau K4? Ini belum jelas.
3. **Tujuan.** Versi prototipe memakai 120 warga dalam 40 hari. Ini belum
   dihubungkan dengan konstruk pemecahan masalah matematis SPtLDV, sehingga
   versi ini mungkin tidak lagi mengukur matematika.
4. **Kesetaraan dengan instrumen 1.1.0.** Tidak ada cara membandingkan skor
   kedua versi secara langsung. Data kelas harus dipisahkan berdasarkan
   `instrumentVersion`.

## Kesimpulan awal

Versi TheoTown berisiko besar kehilangan konstruk matematisnya. Tanpa keputusan
dosen atas poin 1 dan 3, pengembangan UI tidak boleh dilanjutkan sampai ke
pengambilan data.
