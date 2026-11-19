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

/** Babak sebelum tiap level. Hanya membingkai; isi soal tetap di layar misi. */
export function babak(level: number, task: TaskDto): Adegan {
  const judulSoal = task.title;
  const isi: Record<number, Omit<Adegan, 'tombol'>> = {
    1: {
      babak: 'BABAK 1',
      judul: 'Kota pertama',
      paragraf: [
        `Kapal merapat di dermaga. ${MENTOR} menyerahkan berkas pertamamu: "${judulSoal}".`,
        `"Mulailah dengan memahami batasnya," katanya. "Kota yang baik lahir dari aturan yang ditulis dengan benar."`,
      ],
    },
    2: {
      babak: 'BABAK 2',
      judul: 'Angka mulai bicara',
      paragraf: [
        `Kabar keberhasilanmu sampai ke pulau berikutnya. Warga di sana menunggu rencana untuk "${judulSoal}".`,
        `"Kali ini ada tabel biaya dan kebutuhan lahan," kata ${MENTOR}. "Batasnya lebih dari satu. Susun semuanya sebelum membangun."`,
      ],
    },
    3: {
      babak: 'BABAK 3',
      judul: 'Mencari yang terbaik',
      paragraf: [
        `Dewan Wilayah tidak lagi puas dengan rencana yang sekadar layak. Untuk "${judulSoal}", mereka meminta hasil yang paling menguntungkan warga.`,
        `"Tidak semua pilihan yang sah sama baiknya," kata ${MENTOR}. "Bandingkan dulu, baru putuskan."`,
      ],
    },
    4: {
      babak: 'BABAK 4',
      judul: 'Badai kebijakan',
      paragraf: [
        `Kota terakhir adalah yang paling sulit: "${judulSoal}". Ada aturan yang tidak tertulis langsung, dan kabarnya kebijakan bisa berubah kapan saja.`,
        `"Perencana sejati siap merevisi," kata ${MENTOR}. "Kalau keadaan berubah, periksa lagi rencanamu dan jelaskan apa yang harus dikorbankan."`,
      ],
    },
  };
  const a = isi[level] ?? { babak: `BABAK ${level}`, judul: judulSoal, paragraf: [`Berkas berikutnya: "${judulSoal}".`] };
  return { ...a, tombol: `▶  LANJUT KE LEVEL ${level}` };
}

export function epilog(nama: string, levelSelesai: number): Adegan {
  return {
    babak: 'EPILOG',
    judul: 'Nusa Lestari menyala',
    paragraf: [
      `Malam turun di ${WILAYAH}. Lampu-lampu kota yang kamu rancang mulai menyala satu per satu: ${levelSelesai} kota kini punya rencana yang bisa dipertanggungjawabkan.`,
      `"Kamu tidak hanya membangun kota, ${nama}," kata ${MENTOR}. "Kamu belajar menilai keputusanmu sendiri. Itu yang membuat perencana terus berkembang."`,
      'Lihat kembali kota-kotamu di Peta Wilayah, atau bermain bebas di Kota Bebas.',
    ],
    tombol: '▶  LIHAT RINGKASAN',
  };
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
        el('div', { class: 'cerita-ilustrasi', ariaLabel: 'Ilustrasi kota' }, '🏝️🏘️🌳'),
        ...a.paragraf.map((p) => el('p', { class: 'prose cerita-paragraf' }, p)),
        tombol,
      ),
    ),
  );
}
