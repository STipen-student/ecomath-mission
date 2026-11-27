/**
 * Versi tampilan dan mekanik instrumen (docs/SCORING_SPEC.md §7.22).
 *
 * Dikirim ke server saat sesi dibuat dan disimpan pada Session.instrumentVersion,
 * lalu ikut diekspor ke sessions.csv dan scores_long.csv.
 *
 * BERBEDA dari SCORING_VERSION di server. Versi rubrik hanya naik bila aturan
 * skor berubah, sedangkan versi ini naik setiap kali yang DILIHAT atau DAPAT
 * DILAKUKAN siswa berubah - misalnya sumber rona peta atau bidang perencanaan.
 * Perubahan semacam itu tidak menyentuh rubrik, tetapi dapat mengubah kondisi
 * munculnya bukti, sehingga data dari dua versi tidak boleh digabung tanpa dicek.
 *
 * Riwayat:
 *   1.0.0  sebelum penanda ini ada (kolom kosong pada data lama)
 *   1.1.0  rona peta Level 2-4 dari tulisan siswa (§7.20); bidang perencanaan
 *          Level 3 (§7.21); penanda versi ini (§7.22)
 *   1.2.0  bentuk paralel: angka soal diundi per siswa (A/B/C, kolom
 *          TaskAttempt.bentuk); siswa menggambar grafik SPtLDV sendiri; Misi
 *          Kota Hijau (KH1-KH4) setelah Level 4. Rubrik K1-K4 tidak berubah.
 *   2.0.0  soal program linear Level 3-4 dikeluarkan (bukan materi kelas X)
 *          dan diganti enam soal SPtLDV baru tanpa fungsi tujuan (id -B).
 *          Data Level 3-4 versi 1.x dan 2.x mengukur soal berbeda.
 */
export const INSTRUMENT_VERSION = '2.0.0';
