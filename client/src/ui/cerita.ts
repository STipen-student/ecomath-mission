/**
 * Cerita yang menyambungkan seluruh misi: prolog, satu babak sebelum tiap
 * level, dan epilog.
 *
 * BATAS TERHADAP INSTRUMEN:
 *   - Teks soal (narasi task) TIDAK diubah. Cerita hanya membingkai, dan judul
 *     soal disebut apa adanya.
 *   - Layar cerita tampil SEBELUM layar target belajar, saat pencatat log belum
 *     berjalan, jadi waktu membaca cerita tidak terhitung pada observable mana pun.
 *   - Cerita tidak memberi petunjuk isi kendala atau jawaban.
 */

import type { TaskDto } from '../api/types.js';
import { el } from './dom.js';

const MENTOR = 'Bu Laras';
const WILAYAH = 'Kepulauan Nusa Lestari';

export interface Adegan {
  babak: string;
  judul: string;
  paragraf: string[];
  tombol: string;
}

export function prolog(nama: string): Adegan {
  return {
    babak: 'PROLOG',
    judul: 'Surat dari Dewan Wilayah',
    paragraf: [
      `${WILAYAH} sedang tumbuh cepat. Kota-kotanya butuh rumah, jalan, dan ruang hijau, tetapi lahan dan anggaran terbatas, dan iklim makin tidak menentu.`,
      `Dewan Wilayah menunjukmu, ${nama}, sebagai perencana kota muda. Tugasmu: menata empat kota agar tetap layak huni dan ramah lingkungan.`,
      `${MENTOR}, Kepala Badan Perencanaan, akan mendampingimu. "Setiap keputusan kota punya batas," katanya. "Tugas kita bukan melanggar batas itu, tapi menemukan pilihan terbaik di dalamnya."`,
    ],
    tombol: '▶  TERIMA TUGAS',
  };
}

/**
 * Cerita khusus untuk setiap soal (12 kasus), dalam satu alur besar: perjalanan
 * perencana kota mengelilingi Kepulauan Nusa Lestari bersama Bu Laras.
 *
 * Cerita hanya membingkai suasana dan tokoh. Cerita TIDAK menyebut angka,
 * hubungan antarvariabel, atau kendala, karena itu bagian dari soal yang harus
 * diterjemahkan siswa sendiri (K1).
 */
const CERITA: Record<string, { judul: string; paragraf: string[] }> = {
  'L1-SDG11-A': {
    judul: 'Ecoville yang sesak',
    paragraf: [
      'Kapal merapat di Ecoville, kota kecil yang lahannya tinggal sepetak. Anak-anak bermain bola di pinggir jalan karena taman sudah lama berubah jadi deretan rumah.',
      'Pak Wiryo, ketua RT, menyambutmu. "Kami butuh rumah baru, tapi kami juga rindu pohon," katanya. Bu Laras menyerahkan berkas pertamamu: rencana ruang hijau dan permukiman.',
    ],
  },
  'L1-SDG13-A': {
    judul: 'Asap di terminal Ecoville',
    paragraf: [
      'Pagi di terminal Ecoville selalu berbau solar. Pak Darto, sopir bus paling senior, batuk sambil memanaskan mesin bus tuanya.',
      '"Katanya bus listrik itu senyap dan bersih," ujarnya. "Tapi garasi kita sempit." Bu Laras tersenyum. "Itulah tugasmu: atur armada baru kota ini."',
    ],
  },
  'L1-SDG11&13-A': {
    judul: 'Jalan untuk siapa?',
    paragraf: [
      'Satu ruas jalan di pusat Ecoville jadi rebutan. Pemilik toko ingin tempat parkir, sementara Mbak Sari dan teman-teman pesepedanya ingin lajur yang aman.',
      '"Lebar jalan tidak bisa ditambah," kata Bu Laras sambil menunjuk peta. "Kita harus membaginya dengan adil."',
    ],
  },
  'L2-SDG11-A': {
    judul: 'Rumah untuk keluarga muda',
    paragraf: [
      'Di Greenhaven, antrean rumah subsidi makin panjang. Bu Maya, guru SD, sudah tiga tahun menunggu rumah untuk keluarganya.',
      'Dua tipe rumah sudah dirancang, lengkap dengan biaya dan kebutuhan lahannya. "Anggaran kota ada batasnya," kata Bu Laras. "Baca tabelnya pelan-pelan."',
    ],
  },
  'L2-SDG13-A': {
    judul: 'Listrik dari langit dan angin',
    paragraf: [
      'Greenhaven masih bergantung pada pembangkit diesel tua. Saat badai, listrik padam berjam-jam dan rumah sakit memakai genset.',
      'Pak Rendra dari perusahaan listrik kota membawa dua pilihan: panel surya komunal dan turbin angin mini. "Dana dan ruangnya terbatas," katanya. "Pilih komposisinya dengan cermat."',
    ],
  },
  'L2-SDG11&13-A': {
    judul: 'Pabrik di sebelah taman',
    paragraf: [
      'Greenhaven ingin lapangan kerja baru dari zona industri rendah emisi, tetapi warga takut kehilangan ruang hijau mereka.',
      'Di balai kota, warga dan pengusaha berdebat sampai malam. Bu Laras menengahi: "Keduanya bisa ada, asal aturannya ditulis dengan jelas."',
    ],
  },
  'L3-SDG11-A': {
    judul: 'Kota yang nyaman dijalani',
    paragraf: [
      'Distrik baru di Meridian masih berupa tanah lapang. Survei warga menunjukkan satu keinginan: kota yang nyaman untuk berjalan dan bersantai.',
      '"Kali ini Dewan meminta hasil terbaik, bukan sekadar yang boleh," kata Bu Laras. "Ada banyak pilihan yang sah, dan tugasmu menemukan yang paling menguntungkan warga."',
    ],
  },
  'L3-SDG13-A': {
    judul: 'Gunungan sampah Meridian',
    paragraf: [
      'Tempat pembuangan sampah Meridian hampir penuh. Setiap hari truk mengangkut sampah, dan baunya sampai ke pasar.',
      'Bu Nita, pengelola bank sampah, menawarkan dua cara: pengomposan dan daur ulang. "Keduanya punya biaya dan jejak karbon berbeda," katanya. Dewan ingin cara yang paling hemat.',
    ],
  },
  'L3-SDG11&13-A': {
    judul: 'Menumbuhkan kota ke atas',
    paragraf: [
      'Meridian terus melebar dan menelan sawah di pinggirnya. Arsitek kota, Pak Hadi, mengusulkan hunian vertikal yang hemat energi, diselingi koridor hijau yang menyerap karbon.',
      '"Kita cari indeks keberlanjutan setinggi mungkin," kata Bu Laras. "Tapi ingat, setiap pilihan punya harga."',
    ],
  },
  'L4-SDG11-A': {
    judul: 'Krisis lahan Meridian Utara',
    paragraf: [
      'Ribuan keluarga di Meridian Utara tinggal di rumah sewa yang sempit. Mereka butuh perumahan terjangkau, secepatnya.',
      'Namun kota ini juga terikat standar kota sehat, dan aturannya tidak tertulis langsung dalam angka. "Baca baik-baik," pesan Bu Laras. "Dan bersiaplah, kebijakan bisa berubah di tengah jalan."',
    ],
  },
  'L4-SDG13-A': {
    judul: 'Transisi energi mendadak',
    paragraf: [
      'Kawasan industri Meridian Selatan masih menderu dengan mesin-mesin fosil. Kabut tipis selalu menggantung di atas pabrik.',
      'Bu Ratna, pemilik pabrik terbesar, khawatir biaya membengkak bila beralih ke mesin listrik. "Peraturan emisi daerah juga harus dipatuhi," kata Bu Laras. "Dan kabarnya akan ada aturan baru."',
    ],
  },
  'L4-SDG11&13-A': {
    judul: 'Rencana induk Solantis',
    paragraf: [
      'Perjalananmu berakhir di Solantis, kota baru yang belum berpenghuni. Semua yang kamu pelajari diuji di sini: hunian, ruang hijau, dan ketahanan iklim.',
      'Hujan tropis di wilayah ini sangat deras, dan studi lingkungan memberi syarat yang harus kamu simpulkan sendiri. "Ini kota terakhirmu," kata Bu Laras. "Buat rencana yang bisa dibanggakan, dan siap direvisi bila keadaan berubah."',
    ],
  },
};

/** Cerita sebelum sebuah soal. Teks soal tetap di layar misi dan tidak diubah. */
export function babak(level: number, task: TaskDto): Adegan {
  const c = CERITA[task.id] ?? { judul: task.title, paragraf: [`Berkas berikutnya dari Bu Laras: "${task.title}".`] };
  return {
    babak: `PERJALANAN ${level} DARI 4`,
    judul: c.judul,
    paragraf: c.paragraf,
    tombol: `▶  LANJUT KE LEVEL ${level}`,
  };
}

export function epilog(nama: string, kota: string[]): Adegan {
  const daftar = kota.length > 0 ? kota.map((k) => `"${k}"`).join(', ') : 'kota-kota yang kamu kunjungi';
  return {
    babak: 'EPILOG',
    judul: 'Nusa Lestari menyala',
    paragraf: [
      `Malam turun di ${WILAYAH}. Dari atas kapal, kamu melihat lampu kota menyala satu per satu: ${daftar}.`,
      `Warga yang kamu temui sepanjang perjalanan kini punya kota yang lebih layak huni. "Kamu tidak hanya membangun kota, ${nama}," kata ${MENTOR}. "Kamu belajar menilai keputusanmu sendiri. Itu yang membuat perencana terus berkembang."`,
      'Lihat kembali kota-kotamu di Peta Wilayah, atau bermain bebas di Kota Bebas.',
    ],
    tombol: '▶  LIHAT RINGKASAN',
  };
}

/**
 * Ilustrasi cerita. Diketuk tiga kali = misi tersembunyi "Tiket jalan pintas".
 * Hanya CustomEvent ke jendela; tidak ada event log dan tidak ada skor.
 */
function ilustrasiRahasia(): HTMLElement {
  let ketuk = 0;
  const gambar = el('div', { class: 'cerita-ilustrasi', ariaLabel: 'Ilustrasi kota' }, '🏝️🏘️🌳');
  gambar.addEventListener('click', () => {
    ketuk++;
    if (ketuk === 3) window.dispatchEvent(new CustomEvent('ecomath:rahasia', { detail: 'tiket-jalan-pintas' }));
  });
  return gambar;
}

/** Layar satu adegan cerita. */
export function renderAdegan(root: HTMLElement, a: Adegan, onLanjut: () => void): void {
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, a.tombol);
  tombol.addEventListener('click', onLanjut);
  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card cerita' },
        el('div', { class: 'brand-badge' }, a.babak),
        el('h2', { class: 'cerita-judul' }, a.judul),
        ilustrasiRahasia(),
        ...a.paragraf.map((p) => el('p', { class: 'prose cerita-paragraf' }, p)),
        tombol,
      ),
    ),
  );
}
