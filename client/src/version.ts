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
 */
export const INSTRUMENT_VERSION = '1.1.0';
