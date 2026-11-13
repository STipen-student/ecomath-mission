/**
 * Konsekuensi di kota ketika Dewan Kota menolak rancangan (docs/Draf_Perbaikan_Mekanik_Game.md, U4).
 *
 * Teks ini HANYA tampilan. Ia tidak mencatat event dan tidak dibaca rubrik.
 * Kendala tersirat sengaja TIDAK disebut jenisnya (prinsip 3): ia tampil sebagai
 * "inspeksi tidak lolos" yang umum, agar pemain tidak mendapat petunjuk baru.
 */

/** Konsekuensi kota untuk tiap kendala eksplisit, dicocokkan dari id kendala. */
const KONSEKUENSI: Record<string, string> = {
  k_anggaran: 'Derek berhenti di tengah jalan. Bangunan setengah jadi dan dana habis.',
  k_dana: 'Investasi tertahan. Proyek pembangkit ditunda sampai dana cukup.',
  k_investasi: 'Investasi melebihi plafon. Kontrak pembangunan dibatalkan.',
  k_operasional: 'Biaya operasional membengkak. Layanan kota dikurangi.',
  k_lahan: 'Bangunan meluber ke area pantai dan melanggar garis sempadan.',
  k_kawasan: 'Rencana melampaui batas kawasan. Pembebasan lahan tertunda.',
  k_lebar: 'Potongan jalan tidak muat. Jalur dipersempit dan dikerjakan ulang.',
  k_ruang: 'Ruang atap dan lahan tidak cukup. Sebagian unit tidak bisa dipasang.',
  k_garasi: 'Garasi kelebihan kendaraan. Armada baru harus menunggu.',
  k_rasio: 'Ruang hijau terlalu sedikit. Kawasan menjadi panas dan warga mengeluh.',
  k_rth_who: 'Ruang hijau di bawah standar kota sehat. Izin kawasan ditahan.',
  k_aksesibilitas: 'Trotoar kurang dari standar. Warga pejalan kaki tidak terlayani.',
  k_udara: 'Koridor hijau terlalu kecil. Kualitas udara turun.',
  k_resapan: 'Resapan air tidak cukup. Genangan muncul saat hujan.',
  k_emisi: 'Emisi melampaui batas. Kabut asap menutup kawasan.',
  k_listrik: 'Bauran energi tidak bersih. Target komitmen iklim tidak tercapai.',
  k_sepeda: 'Jalur sepeda lebih sempit dari lahan parkir. Pesepeda dipindah ke trotoar.',
};

/** Konsekuensi umum untuk kendala tersirat, tanpa menyebut jenisnya. */
export const KONSEKUENSI_TERSIRAT = 'Inspeksi tidak lolos. Dewan meminta tinjauan ulang menyeluruh.';

/** Konsekuensi untuk satu kendala eksplisit yang dilanggar. */
export function konsekuensiKendala(id: string): string {
  return KONSEKUENSI[id] ?? 'Rencana ini bertentangan dengan ketentuan kota.';
}

/** Kalimat penutup bila rancangan diterima: warga pindah dan lampu kota menyala. */
export const KONSEKUENSI_DITERIMA = 'Rancangan disahkan. Warga mulai pindah dan lampu kota menyala.';
