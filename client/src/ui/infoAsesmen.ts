/**
 * Bagian halaman depan yang menjelaskan kepada siswa, SEBELUM mulai bermain,
 * apa tujuan pembelajarannya dan bagaimana mereka dinilai. Transparansi ini
 * bagian dari Assessment as Learning: siswa memahami kriteria sejak awal,
 * sehingga target dan penilaian dirinya punya pijakan yang jelas.
 */

import { el } from './dom.js';

const TUJUAN = [
  'Menentukan arti variabel x dan y beserta satuannya dari masalah tata kota.',
  'Menyusun sistem pertidaksamaan linear dua variabel dari cerita dan tabel data.',
  'Menggambar grafik pertidaksamaan dan menentukan daerah himpunan penyelesaiannya.',
  'Menentukan nilai optimum fungsi tujuan dengan membandingkan titik pojok (Level 3 dan 4).',
  'Memeriksa dan merevisi penyelesaian saat aturan kota berubah, lalu mengaitkannya dengan SDG 11 (kota berkelanjutan) dan SDG 13 (penanganan perubahan iklim).',
];

const TAHAP = [
  { kode: 'K1', nama: 'Memahami masalah', isi: 'Kamu menetapkan arti x dan y dengan tepat.' },
  { kode: 'K2', nama: 'Menyusun rencana', isi: 'Kamu memilih tujuan dan menulis semua pertidaksamaan, lalu mencoba titik sebelum mengajukan.' },
  { kode: 'K3', nama: 'Menjalankan rencana', isi: 'Jawabanmu memenuhi semua batasan, dan optimal bila soal memintanya.' },
  { kode: 'K4', nama: 'Memeriksa kembali', isi: 'Kamu menjelaskan alasanmu dan merevisi rencana saat keadaan berubah.' },
];

export function infoAsesmen(): HTMLElement {
  return el(
    'section',
    { class: 'plate info-asesmen' },
    el('h2', {}, '🎯 Tujuan pembelajaran'),
    el('p', {}, 'Setelah menyelesaikan keempat level, kamu diharapkan dapat:'),
    el('ol', { class: 'info-asesmen-daftar' }, ...TUJUAN.map((t) => el('li', {}, t))),

    el('h2', {}, '📋 Bagaimana kamu dinilai'),
    el(
      'p',
      {},
      'Game ini memakai Assessment as Learning: penilaian adalah bagian dari belajarmu, bukan hanya angka di akhir. Sistem mencatat cara kerjamu langkah demi langkah, jadi yang dinilai bukan hanya jawaban akhir.',
    ),
    el(
      'div',
      { class: 'info-asesmen-tahap' },
      ...TAHAP.map((t) =>
        el('div', { class: 'info-asesmen-kartu' }, el('strong', {}, `${t.kode} · ${t.nama}`), el('span', {}, t.isi)),
      ),
    ),
    el('p', {}, 'Setiap tahap diberi skor 0 sampai 3, jadi skor maksimal satu level adalah 12.'),

    el('h3', {}, 'Alurnya di setiap level'),
    el(
      'ol',
      { class: 'info-asesmen-daftar' },
      el('li', {}, el('strong', {}, 'Tetapkan target: '), 'pilih satu tahap yang ingin kamu tingkatkan.'),
      el('li', {}, el('strong', {}, 'Kerjakan misinya: '), 'semua langkahmu tercatat otomatis.'),
      el('li', {}, el('strong', {}, 'Nilai dirimu dulu: '), 'beri skor 0–3 untuk tiap tahap SEBELUM melihat skor dari sistem.'),
      el('li', {}, el('strong', {}, 'Bandingkan dan refleksikan: '), 'lihat selisih penilaianmu dengan sistem, lalu tentukan target berikutnya.'),
    ),

    el(
      'p',
      { class: 'hint' },
      'Yang TIDAK memengaruhi skor: penilaian dirimu, koin, misi, Kotak Kejutan, hiasan kota, dan tanggapan protes warga. Jadi nilailah dirimu dengan jujur. Datamu (nama atau inisial dan kode kelas) hanya dipakai untuk pembelajaran dan penelitian.',
    ),
  );
}
