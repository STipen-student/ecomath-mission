/**
 * Identitas penelitian yang ditampilkan di layar persetujuan siswa.
 *
 * WAJIB DIISI PENELITI sebelum pengambilan data. Teks persetujuan diberi versi:
 * bila isinya diubah, naikkan VERSI_PERSETUJUAN agar siswa diminta menyetujui
 * ulang dan versi yang disetujui tercatat di Session.persetujuanVersi.
 */

export const VERSI_PERSETUJUAN = '1';

/** Nama peneliti dan program studi, mis. "Nama Lengkap, Magister Pendidikan Matematika FKIP UNS". */
export const PENELITI = '[isi nama peneliti dan program studi]';

/** Kontak yang bisa dihubungi siswa/wali, mis. alamat surel kampus atau nomor yang disetujui pembimbing. */
export const KONTAK_PENELITI = '[isi kontak peneliti]';

/** Lama data identitas disimpan sebelum dihapus, mis. "sampai analisis selesai, paling lama 1 tahun". */
export const LAMA_PENYIMPANAN = 'sampai analisis tesis selesai; setelah itu nama dan NIS dihapus dan hanya data tanpa identitas yang disimpan';
