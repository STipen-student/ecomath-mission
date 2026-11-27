/**
 * Identitas penelitian yang ditampilkan di layar persetujuan siswa.
 *
 * WAJIB DIISI PENELITI sebelum pengambilan data. Teks persetujuan diberi versi:
 * bila isinya diubah, naikkan VERSI_PERSETUJUAN agar siswa diminta menyetujui
 * ulang dan versi yang disetujui tercatat di Session.persetujuanVersi.
 */

export const VERSI_PERSETUJUAN = '1';

/** Nama peneliti dan program studi, mis. "Nama Lengkap, Magister Pendidikan Matematika FKIP UNS". */
export const PENELITI = 'Nurul Huda Satriyanto (NIM S852508014), Magister Pendidikan Matematika FKIP UNS';

/** Kontak yang bisa dihubungi siswa/wali, mis. alamat surel kampus atau nomor yang disetujui pembimbing. */
export const KONTAK_PENELITI = 'Nurul Huda Satriyanto, WhatsApp +62 896-3006-3941';

/** Lama data identitas disimpan sebelum dihapus, mis. "sampai analisis selesai, paling lama 1 tahun". */
export const LAMA_PENYIMPANAN = 'selama 6 bulan; setelah itu nama dan NIS diganti dengan nomor absen';
