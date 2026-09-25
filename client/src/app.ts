/**
 * Pengendali alur aplikasi.
 *
 * Menghubungkan layar (DOM), viewport permainan (Phaser), pencatat log, dan API
 * backend. Seluruh event siswa mengalir melalui berkas ini menuju logger,
 * sehingga hanya ada satu tempat yang perlu diperiksa untuk memastikan tidak
 * ada bukti yang luput dicatat.
 */

import { api, ApiError } from './api/client.js';
import type { DistractorResponse, SubmitResponse, TaskDto } from './api/types.js';
import { logger } from './logging/logger.js';
import { el } from './ui/dom.js';
import { renderLandingScreen, type LandingHandle } from './ui/LandingScreen.js';
import { renderLoginScreen } from './ui/LoginScreen.js';
import { PlayScreen } from './ui/PlayScreen.js';
import { renderFinishScreen, renderResultScreen, type RiwayatLevel } from './ui/ResultScreen.js';
import { TutorialScreen, type HasilTutorial } from './ui/TutorialScreen.js';

/** Level yang dikerjakan berurutan dalam satu sesi. */
const LEVELS = [1, 2, 3, 4] as const;

export class App {
  private sessionId = '';
  private studentName = '';
  private levelIndex = 0;
  private attemptId: string | null = null;
  private task: TaskDto | null = null;
  private play: PlayScreen | null = null;
  private landing: LandingHandle | null = null;
  private riwayat: RiwayatLevel[] = [];
  private sessionComposite: number | null = null;
  /** Menandai fase pengerjaan pada payload attempt_submit (Level 4). */
  private distractorSudahMuncul = false;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    this.tampilkanHalamanDepan();
  }

  /**
   * Halaman depan dengan dua pintu masuk.
   *
   * Portal guru dibuka lewat `guru.html` - halaman statis terpisah pada bundel
   * yang sama, sehingga tidak menarik Phaser maupun kode permainan ke dalamnya.
   */
  private tampilkanHalamanDepan(): void {
    this.play?.destroy();
    this.play = null;
    this.landing?.destroy();

    this.landing = renderLandingScreen(this.root, {
      onMasukSiswa: () => this.tampilkanMasukSiswa(),
      onPortalGuru: () => {
        window.location.href = 'guru.html';
      },
    });
  }

  private tampilkanMasukSiswa(): void {
    this.landing?.destroy();
    this.landing = null;

    renderLoginScreen(
      this.root,
      async (data) => {
        const sesi = await api.createSession(data);
        this.sessionId = sesi.sessionId;
        this.studentName = sesi.studentName;
        this.mulaiTutorial();
      },
      () => this.tampilkanHalamanDepan(),
    );
  }

  private get levelSaatIni(): number {
    return LEVELS[this.levelIndex]!;
  }

  /**
   * Tutorial antarmuka, dijalankan SEBELUM Level 1.
   *
   * Tidak memanggil `logger` dan tidak meminta task ke server, sehingga tidak
   * satu pun event tutorial masuk ke data penelitian. Yang dikirim hanyalah
   * ringkasannya sebagai kovariat: peneliti dapat memeriksa apakah siswa yang
   * melewati tutorial atau banyak salah langkah cenderung berskor lebih rendah
   * - yaitu memeriksa apakah antarmuka masih menyumbang varians.
   *
   * Kegagalan mengirim ringkasan TIDAK boleh menghalangi siswa masuk Level 1:
   * tutorial adalah alat bantu, bukan gerbang.
   */
  private mulaiTutorial(): void {
    this.root.replaceChildren();
    const tutorial = new TutorialScreen(this.root, this.studentName, (hasil: HasilTutorial) => {
      void api.recordTutorial(this.sessionId, hasil).catch(() => undefined);
      void this.mulaiLevel();
    });
    tutorial.render();
  }

  private async mulaiLevel(): Promise<void> {
    this.tampilkanMemuat(`Menyiapkan Level ${this.levelSaatIni}...`);

    try {
      const res = await api.getTask(this.levelSaatIni, this.sessionId);
      this.attemptId = res.attemptId;
      this.task = res.task;
      this.distractorSudahMuncul = false;

      logger.start(this.sessionId, res.task.id);

      this.play?.destroy();
      this.root.replaceChildren();
      this.play = new PlayScreen(
        this.root,
        {
          studentName: this.studentName,
          level: this.levelSaatIni,
          totalLevels: LEVELS.length,
          task: res.task,
        },
        this.buatCallbacks(),
      );
      this.play.render();
    } catch (err) {
      this.tampilkanError(err, () => void this.mulaiLevel());
    }
  }

  private buatCallbacks() {
    return {
      onIdentifyVariable: (variable: 'x' | 'y', optionId: string): void => {
        logger.record('identify_variable', { variable, optionId }, true);
      },

      onSelectObjective: (optionId: string): void => {
        logger.record('select_objective', { optionId }, true);
      },

      onWriteConstraint: (slot: number, a: number, b: number, op: string, c: number, text: string): void => {
        logger.record('write_constraint', { slot, a, b, op, c, constraint_text: text }, true);
      },

      onMoveSlider: (x: number, y: number, valid: boolean): void => {
        logger.record('move_slider', { x, y }, valid);
      },

      onCheckCorner: (x: number, y: number, z: number | null): void => {
        logger.record('check_corner_point', z === null ? { x, y } : { x, y, z }, true);
      },

      onAttemptSubmit: (x: number, y: number, valid: boolean): void => {
        logger.record(
          'attempt_submit',
          { x, y, phase: this.distractorSudahMuncul ? 'post_event' : 'initial' },
          valid,
        );
      },

      onRejectBySystem: (x: number, y: number, violated: string[]): void => {
        logger.record('reject_by_system', { x, y, violated }, false);
      },

      onReviseAfterEvent: (x: number, y: number, valid: boolean): void => {
        logger.record('revise_after_event', { x, y }, valid);
      },

      /**
       * Pemindahan pusat zona.
       *
       * Dicatat sebagai data proses, TIDAK dipakai rubrik mana pun - letak zona
       * adalah pilihan tata kota dan tidak memengaruhi nilai x maupun y.
       */
      onSetZoneCenter: (variable: 'x' | 'y', col: number, row: number): void => {
        logger.record('set_zone_center', { variable, col, row }, true);
      },

      /**
       * Pemicu event distraktor.
       *
       * Log dikirim lebih dulu supaya urutan waktu di server benar: seluruh aksi
       * SEBELUM event harus sudah tersimpan sebelum baris distractor_shown
       * ditulis, karena penilaian K4 memisahkan aksi berdasarkan penanda itu.
       */
      onRequestDistractor: async (x: number, y: number): Promise<DistractorResponse | null> => {
        if (!this.attemptId) return null;
        await logger.flush();
        try {
          const ev = await api.triggerDistractor(this.attemptId, { x, y, elapsedMs: logger.elapsedMs() });
          this.distractorSudahMuncul = true;
          return ev;
        } catch (err) {
          // Event gagal dimunculkan (mis. server menilai solusi belum valid):
          // pengerjaan tetap dilanjutkan agar siswa tidak terhenti.
          if (err instanceof ApiError && err.status === 409) return null;
          return null;
        }
      },

      onFinish: async (data: {
        finalX: number;
        finalY: number;
        reflectionClosedOptionId?: string;
        reflectionOpenText?: string;
      }): Promise<void> => {
        if (data.reflectionClosedOptionId || data.reflectionOpenText) {
          logger.record(
            'reflection_response',
            { closedOptionId: data.reflectionClosedOptionId, openText: data.reflectionOpenText },
            true,
          );
        }
        // Pastikan seluruh log sampai SEBELUM skoring dijalankan di server.
        await logger.flush();

        const adaLevelBerikutnya = this.levelIndex < LEVELS.length - 1;
        const hasil = await api.submit({
          sessionId: this.sessionId,
          taskId: this.task!.id,
          finalX: data.finalX,
          finalY: data.finalY,
          reflectionClosedOptionId: data.reflectionClosedOptionId,
          reflectionOpenText: data.reflectionOpenText,
          finishSession: !adaLevelBerikutnya,
        });

        this.tampilkanHasil(hasil, adaLevelBerikutnya);
      },
    };
  }

  private tampilkanHasil(hasil: SubmitResponse, adaLevelBerikutnya: boolean): void {
    this.riwayat.push({ level: this.levelSaatIni, rawSum: hasil.rawSum, feedback: hasil.feedback });
    this.sessionComposite = hasil.sessionComposite;

    const task = this.task!;
    this.play?.destroy();
    this.play = null;

    renderResultScreen(
      this.root,
      { hasil, task, level: this.levelSaatIni, totalLevels: LEVELS.length, adaLevelBerikutnya },
      () => {
        if (adaLevelBerikutnya) {
          this.levelIndex++;
          void this.mulaiLevel();
        } else {
          logger.stop();
          renderFinishScreen(this.root, {
            studentName: this.studentName,
            sessionComposite: this.sessionComposite,
            riwayat: this.riwayat,
          });
        }
      },
    );
  }

  private tampilkanMemuat(teks: string): void {
    this.root.replaceChildren(
      el(
        'div',
        { class: 'screen-center' },
        el(
          'div',
          { class: 'plate card' },
          el('div', { class: 'brand' }, el('div', { class: 'brand-badge' }, 'MEMUAT'), el('h1', { class: 'brand-title' }, 'ECOMATH')),
          el('p', { class: 'prose' }, teks),
        ),
      ),
    );
  }

  private tampilkanError(err: unknown, coba: () => void): void {
    const pesan = err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga.';
    const tombol = el('button', { class: 'btn btn-primary btn-block' }, 'Coba lagi');
    tombol.addEventListener('click', coba);

    this.root.replaceChildren(
      el(
        'div',
        { class: 'screen-center' },
        el(
          'div',
          { class: 'plate card' },
          el('div', { class: 'brand-badge' }, 'KONEKSI'),
          el('h2', {}, 'GAGAL MEMUAT'),
          el('p', { class: 'form-error' }, pesan),
          el('p', { class: 'note' }, 'Jawabanmu yang sudah terkirim tetap tersimpan. Periksa koneksi lalu coba lagi.'),
          tombol,
        ),
      ),
    );
  }
}
