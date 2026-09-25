/**
 * Tutorial antarmuka berpemandu.
 *
 * ────────────────────────────────────────────────────────────────────────
 * TUJUAN VALIDITAS
 * ────────────────────────────────────────────────────────────────────────
 * Menghilangkan *construct-irrelevant variance* yang bersumber dari
 * antarmuka. Instrumen ini mengklaim mengukur pemecahan masalah matematis;
 * setiap poin yang hilang karena siswa tidak menemukan sebuah tombol adalah
 * ancaman langsung terhadap klaim itu. Setelah tutorial, kesulitan yang
 * tersisa dapat diatribusikan pada kemampuan siswa, bukan pada aplikasinya.
 *
 * ────────────────────────────────────────────────────────────────────────
 * MEMAKAI PLAYSCREEN YANG SAMA, BUKAN TIRUANNYA
 * ────────────────────────────────────────────────────────────────────────
 * Tutorial memuat `PlayScreen` yang identik dengan yang dipakai keempat level,
 * hanya dengan task latihan. Tutorial yang menampilkan tiruan antarmuka akan
 * melatih hal yang berbeda dari yang nanti dihadapi siswa - dan justru
 * menambah kebingungan yang hendak dihapusnya.
 *
 * Panduan langkah TIDAK memaksa urutan pengerjaan: ia mendeteksi aksi siswa
 * lewat callback yang sama dengan yang dipakai pencatat log, lalu mencentang
 * langkah yang bersangkutan. Siswa bebas menjelajah panel mana pun lebih dulu.
 * Ini sengaja - memaksa urutan di tutorial akan menanamkan kebiasaan berurutan
 * yang tidak berlaku pada level sungguhan (lihat SCORING_SPEC §7.9).
 *
 * ────────────────────────────────────────────────────────────────────────
 * TIDAK ADA SATU PUN EVENT YANG DICATAT
 * ────────────────────────────────────────────────────────────────────────
 * Seluruh callback di sini berakhir di dalam berkas ini. `logger` tidak pernah
 * dipanggil, tidak ada `TaskAttempt` dibuat, dan tidak ada permintaan ke
 * `/api/task`. Yang dikirim ke server hanya RINGKASAN hasil tutorial (selesai/
 * dilewati, durasi, jumlah salah langkah) sebagai kovariat penelitian - bukan
 * sebagai bukti atas klaim apa pun tentang siswa.
 */

import { PlayScreen } from './PlayScreen.js';
import { JAWABAN_LATIHAN, KENDALA_LATIHAN, TUTORIAL_TASK } from './tutorialTask.js';
import { el } from './dom.js';

/** Hasil tutorial yang dilaporkan ke server sebagai kovariat. */
export interface HasilTutorial {
  status: 'completed' | 'skipped';
  durationMs: number;
  /** Aksi yang tidak cocok dengan langkah mana pun yang belum selesai. */
  missteps: number;
  stepsCompleted: number;
  stepsTotal: number;
}

interface Langkah {
  id: string;
  judul: string;
  instruksi: string;
  selesai: boolean;
}

const LANGKAH: Array<Omit<Langkah, 'selesai'>> = [
  {
    id: 'slider',
    judul: 'Geser jumlah bangunan',
    instruksi:
      'Di kiri bawah ada dua penggeser. Geser salah satunya. Angka di sebelahnya berubah, dan kota di peta ikut berubah.',
  },
  {
    id: 'variabel',
    judul: 'Buka panel VARIABEL',
    instruksi:
      'Tekan tombol VARIABEL di bilah bawah. Pilih "Banyaknya pot bunga" untuk x, dan "Banyaknya bangku taman" untuk y.',
  },
  {
    id: 'tujuan',
    judul: 'Buka panel TUJUAN',
    instruksi: 'Tekan TUJUAN, lalu pilih "Memaksimumkan skor keasrian taman".',
  },
  {
    id: 'kendala',
    judul: 'Buka panel KENDALA',
    instruksi:
      'Tekan KENDALA. Isi kotaknya persis seperti ini: angka 1, lalu 1, tanda ≤, lalu 10. Tekan SIMPAN. (Pada level sungguhan, angka inilah yang harus kamu susun sendiri dari cerita.)',
  },
  {
    id: 'pojok',
    judul: 'Buka panel TITIK POJOK',
    instruksi: 'Tekan TITIK POJOK, lalu tekan HITUNG pada salah satu titik untuk melihat nilai Z-nya.',
  },
  {
    id: 'kirim',
    judul: 'Kirim jawaban',
    instruksi:
      'Tekan KIRIM di kanan bawah, isi pertanyaan refleksi seadanya, lalu tekan "Selesaikan level ini".',
  },
];

export class TutorialScreen {
  private play: PlayScreen | null = null;
  private langkah: Langkah[] = LANGKAH.map((l) => ({ ...l, selesai: false }));
  private missteps = 0;
  private mulaiMs = Date.now();
  private panduan!: HTMLElement;
  private selesaiDipanggil = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly studentName: string,
    private readonly onSelesai: (hasil: HasilTutorial) => void,
  ) {}

  render(): void {
    this.mulaiMs = Date.now();

    this.play = new PlayScreen(
      this.root,
      { studentName: this.studentName, level: 1, totalLevels: 4, task: TUTORIAL_TASK },
      {
        onIdentifyVariable: (variabel, optionId) => {
          const benar =
            (variabel === 'x' && optionId === JAWABAN_LATIHAN.variabelX) ||
            (variabel === 'y' && optionId === JAWABAN_LATIHAN.variabelY);
          // Kedua variabel harus ditetapkan benar sebelum langkah tercentang.
          if (benar) {
            this.tandaiVariabel(variabel);
          } else {
            this.salahLangkah('Belum tepat — cocokkan dengan tulisan pada panduan di kanan.');
          }
        },
        onSelectObjective: (optionId) => {
          if (optionId === JAWABAN_LATIHAN.tujuan) this.tandai('tujuan');
          else this.salahLangkah('Pilih rumusan tujuan yang tertulis pada panduan.');
        },
        onWriteConstraint: (_slot, a, b, op, c) => {
          const cocok =
            a === KENDALA_LATIHAN.a && b === KENDALA_LATIHAN.b && op === KENDALA_LATIHAN.op && c === KENDALA_LATIHAN.c;
          if (cocok) this.tandai('kendala');
          else this.salahLangkah('Angkanya belum sama. Salin persis: 1, 1, ≤, 10.');
        },
        onMoveSlider: () => this.tandai('slider'),
        onCheckCorner: () => this.tandai('pojok'),
        onAttemptSubmit: () => {
          /* Diselesaikan lewat onFinish. */
        },
        onRejectBySystem: () => {
          this.salahLangkah('Kombinasimu melebihi ruang taman — geser sedikit ke bawah lalu coba lagi.');
        },
        onReviseAfterEvent: () => {},
        onSetZoneCenter: () => {},
        onRequestDistractor: async () => null,
        onFinish: async () => {
          this.tandai('kirim');
          this.tuntas('completed');
        },
      },
    );

    this.play.render();
    // Menandai mode tutorial supaya panel soal menyediakan ruang bagi panduan
    // yang melayang di atasnya (lihat .is-tutorial pada style.css).
    this.root.classList.add('is-tutorial');
    this.pasangPanduan();
  }

  /* ---------------------------------------------------------------- */

  private variabelBenar = new Set<'x' | 'y'>();

  private tandaiVariabel(variabel: 'x' | 'y'): void {
    this.variabelBenar.add(variabel);
    if (this.variabelBenar.size === 2) this.tandai('variabel');
    else this.gambarPanduan();
  }

  private tandai(id: string): void {
    const l = this.langkah.find((x) => x.id === id);
    if (!l || l.selesai) return;
    l.selesai = true;
    this.gambarPanduan();
  }

  private salahLangkah(pesan: string): void {
    this.missteps++;
    this.gambarPanduan(pesan);
  }

  private get jumlahSelesai(): number {
    return this.langkah.filter((l) => l.selesai).length;
  }

  private tuntas(status: HasilTutorial['status']): void {
    if (this.selesaiDipanggil) return;
    this.selesaiDipanggil = true;

    const hasil: HasilTutorial = {
      status,
      durationMs: Date.now() - this.mulaiMs,
      missteps: this.missteps,
      stepsCompleted: this.jumlahSelesai,
      stepsTotal: this.langkah.length,
    };

    this.destroy();
    this.onSelesai(hasil);
  }

  destroy(): void {
    this.play?.destroy();
    this.play = null;
    this.panduan?.remove();
    this.root.classList.remove('is-tutorial');
  }

  /* ---------------------------------------------------------------- */
  /* Panduan                                                           */
  /* ---------------------------------------------------------------- */

  private pasangPanduan(): void {
    this.panduan = el('aside', { class: 'coach' });
    this.root.append(this.panduan);
    this.gambarPanduan();
  }

  private gambarPanduan(pesan?: string): void {
    const berikutnya = this.langkah.find((l) => !l.selesai);
    const semua = this.jumlahSelesai === this.langkah.length;

    const lewati = el('button', { class: 'btn btn-tiny btn-ghost' }, 'Lewati tutorial');
    lewati.addEventListener('click', () => this.tuntas('skipped'));

    const daftar = el('ol', { class: 'coach-steps' });
    for (const l of this.langkah) {
      const aktif = !l.selesai && l === berikutnya;
      daftar.append(
        el(
          'li',
          { class: `coach-step${l.selesai ? ' is-done' : ''}${aktif ? ' is-active' : ''}` },
          el('span', { class: 'coach-mark' }, l.selesai ? '✓' : aktif ? '▶' : ''),
          el('span', {}, l.judul),
        ),
      );
    }

    const isi: Node[] = [
      el(
        'div',
        { class: 'coach-head' },
        el('span', { class: 'coach-badge' }, 'LATIHAN'),
        el('strong', {}, `${this.jumlahSelesai}/${this.langkah.length}`),
      ),
      el(
        'p',
        { class: 'coach-note' },
        'Ini bukan penilaian. Tidak ada skor yang dicatat di layar ini — cobalah dengan santai.',
      ),
      daftar,
      berikutnya
        ? el('p', { class: 'coach-instruction' }, berikutnya.instruksi)
        : el('p', { class: 'coach-instruction is-done' }, 'Semua langkah selesai. Tekan tombol di bawah untuk mulai.'),
    ];

    if (pesan) isi.push(el('p', { class: 'coach-warn' }, pesan));

    if (semua) {
      const mulai = el('button', { class: 'btn btn-primary btn-block' }, '▶  MULAI MISI SUNGGUHAN');
      mulai.addEventListener('click', () => this.tuntas('completed'));
      isi.push(mulai);
    } else {
      isi.push(lewati);
    }

    this.panduan.replaceChildren(...isi);
  }
}
