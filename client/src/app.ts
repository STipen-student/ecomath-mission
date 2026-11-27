/**
 * Pengendali alur aplikasi.
 *
 * Menghubungkan layar (DOM), viewport permainan (Phaser), pencatat log, dan API
 * backend. Seluruh event siswa mengalir melalui berkas ini menuju logger,
 * sehingga hanya ada satu tempat yang perlu diperiksa untuk memastikan tidak
 * ada bukti yang luput dicatat.
 */

import { jagaLayarPenuh, layarPenuhDidukung, pastikanLayarPenuh } from './ui/layarPenuh.js';
import { api, ApiError } from './api/client.js';
import type { DistractorResponse, Klaim, LoginResponse, SkorKlaim, SubmitResponse, TargetBelajar, TaskDto } from './api/types.js';
import { logger } from './logging/logger.js';
import { el } from './ui/dom.js';
import { renderLayarTarget, type LevelSebelumnya } from './ui/asesmenDiri.js';
import { progresUntuk, type IdRahasia, type Progres, type SnapshotKota } from './game/progres.js';
import { umumkanHadiah } from './ui/panelHadiah.js';
import { babak, epilog, prolog, renderAdegan } from './ui/cerita.js';
import type { KotaLevel } from './ui/petaWilayah.js';
import type { TanggapanProtes } from './ui/tanggapanProtes.js';
import { renderLandingScreen, type LandingHandle } from './ui/LandingScreen.js';
import { renderLoginScreen } from './ui/LoginScreen.js';
import { PlayScreen, type GambarGrafikEvent } from './ui/PlayScreen.js';
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
  /** Kota hasil tiap level untuk Peta Wilayah (tampilan saja). */
  private kotaHasil: KotaLevel[] = [];
  /** Nilai x dan y yang terakhir diajukan, untuk Peta Wilayah. */
  private akhirXY = { x: 0, y: 0 };
  /**
   * Tanggapan protes warga (AaL) dicatat pada percobaan level terakhir, sama
   * seperti refleksi belajar. Disaring dari skoring di server.
   */
  private async catatTanggapanProtes(t: TanggapanProtes): Promise<void> {
    logger.record('aal_tanggapan_protes', { ...t }, true);
    this.progres?.beriTiket();
    await logger.flush();
  }

  /**
   * Kirim keadaan kota (kota_snapshot) lewat /api/log pada percobaan level
   * terakhir. Event ini non-evidence: disaring dari skoring di server.
   */
  private kirimKota(snap: SnapshotKota): void {
    const taskId = this.kasusTerakhir()?.taskId;
    if (!taskId || !this.sessionId) return;
    void api
      .sendLogs([
        {
          session_id: this.sessionId,
          task_id: taskId,
          // Snapshot terjadi setelah level selesai; waktunya ditandai di batas
          // atas skema agar tidak tercampur dengan urutan event pengerjaan.
          timestamp_ms: 24 * 60 * 60 * 1000,
          event_type: 'kota_snapshot',
          payload: { ...snap },
          is_valid_at_time: true,
          duration_since_last_event_ms: 0,
        },
      ])
      .catch(() => undefined);
  }

  /** Kasus yang terakhir selesai, untuk menyambung cerita ke kasus berikutnya. */
  private kasusTerakhir(): { taskId: string; judul: string; layak: boolean } | null {
    const k = this.kotaHasil[this.kotaHasil.length - 1];
    return k ? { taskId: k.taskId, judul: k.judul, layak: k.layak } : null;
  }

  /** Prolog cerita hanya ditampilkan sekali per sesi. */
  private prologTampil = false;
  /** Elemen permainan per sesi (koin, misi, perlengkapan). Tidak dikirim ke server. */
  private progres: Progres | null = null;
  /** Refleksi akhir sesi sudah tercatat; formulirnya tidak ditampilkan dua kali. */
  private refleksiTercatat = false;
  /** Berapa kali siswa memindahkan pusat zona pada level ini (U8, tampilan saja). */
  private jumlahPusatDipindah = 0;
  private sessionComposite: number | null = null;
  /** Target belajar yang ditetapkan siswa untuk level yang sedang berjalan. */
  private target: TargetBelajar | null = null;
  /** Hasil level terakhir - bahan penetapan target level berikutnya. */
  private sebelumnya: LevelSebelumnya | null = null;
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
        const sesi = await api.login(data);
        this.sessionId = sesi.sessionId;
        this.studentName = sesi.studentName;
        this.progres = progresUntuk(sesi.sessionId);
        const lanjut = sesi.lanjutan;
        // Progres permainan dari server (mis. login di perangkat lain), lalu
        // setiap perubahan dikirim balik agar tidak hilang.
        if (lanjut.progres) this.progres.impor(lanjut.progres);
        this.progres.dengarSimpan((json) => this.simpanProgres(json));
        // Kirim keadaan kota ke server setiap kali berubah, agar guru dapat
        // melihat kota yang dibangun siswa. Gagal kirim tidak mengganggu siswa.
        this.progres.dengarKota((snap) => this.kirimKota(snap));
        // Misi tersembunyi dari dalam permainan (mis. lencana level diketuk lima kali).
        window.addEventListener('ecomath:rahasia', (ev) => {
          const id = (ev as CustomEvent<IdRahasia>).detail;
          if (this.progres) umumkanHadiah(this.progres.selesaikan(id));
        });
        this.lepasPenjagaLayar?.();
        this.lepasPenjagaLayar = jagaLayarPenuh(
          () => this.play !== null || this.misiAktif,
          (aksi) => {
            // Data proses (event non-bukti): hanya tercatat saat level berjalan.
            if (this.play) logger.record('layar_penuh', { aksi }, true);
          },
        );
        this.lanjutkanDari(sesi.baru, lanjut);
      },
      () => this.tampilkanHalamanDepan(),
    );
  }

  private lepasPenjagaLayar: (() => void) | null = null;
  /** Misi Kota Hijau sedang dikerjakan (penjaga layar penuh ikut aktif). */
  private misiAktif = false;

  /** Misi Kota Hijau sudah dikerjakan pada sesi ini (satu kali per sesi). */
  private kotaHijauSelesai = false;

  /**
   * Misi Kota Hijau: tugas kinerja KPMM kedua, dinilai dengan rubrik KH1-KH4
   * secara terpisah dari K1-K4. Dilewati bila sudah dikerjakan.
   */
  private mulaiMisiKotaHijau(lalu: () => void): void {
    if (this.kotaHijauSelesai) {
      lalu();
      return;
    }
    this.play?.destroy();
    this.play = null;
    this.tampilkanMemuat('Menyiapkan Misi Kota Hijau...');
    void import('./kotaHijau/MisiKotaHijau.js').then((m) =>
      pastikanLayarPenuh(() => {
        this.misiAktif = true;
        m.mountMisiKotaHijau(this.root, {
          sessionId: this.sessionId,
          studentName: this.studentName,
          selesai: () => {
            this.misiAktif = false;
            this.kotaHijauSelesai = true;
            lalu();
          },
        });
      }),
    );
  }

  /** Kirim progres ke server, ditunda sebentar agar tidak setiap klik. */
  private tundaProgres: number | null = null;
  private simpanProgres(json: string): void {
    if (!this.sessionId) return;
    if (this.tundaProgres !== null) window.clearTimeout(this.tundaProgres);
    this.tundaProgres = window.setTimeout(() => {
      void api.simpanProgres(this.sessionId, json).catch(() => undefined);
    }, 1500);
  }

  /**
   * Setelah login: mulai dari awal (siswa baru) atau lanjutkan dari level
   * pertama yang belum dinilai. Level yang sudah dinilai tidak diulang (satu
   * percobaan per level); riwayat skor, target berikutnya, dan kotanya
   * dipulihkan dari server.
   */
  private lanjutkanDari(baru: boolean, lanjut: LoginResponse['lanjutan']): void {
    this.riwayat = lanjut.levelSelesai.map((l) => ({
      level: l.level,
      rawSum: l.rawSum,
      feedback: l.feedback,
      aal: l.assessmentAsLearning ?? undefined,
    }));
    const terakhir = lanjut.levelSelesai[lanjut.levelSelesai.length - 1];
    this.sebelumnya = terakhir
      ? {
          level: terakhir.level,
          scores: terakhir.scores,
          feedback: terakhir.feedback,
          suggestedNextFocus: terakhir.assessmentAsLearning?.suggestedNextFocus ?? 'K1',
        }
      : null;
    this.kotaHasil = lanjut.kota as unknown as KotaLevel[];
    if (lanjut.sessionComposite !== null) this.sessionComposite = lanjut.sessionComposite;

    const selesai = new Set(lanjut.levelSelesai.map((l) => l.level));
    const berikut = LEVELS.findIndex((lv) => !selesai.has(lv));
    if (berikut === -1) {
      // Semua level sudah dikerjakan: langsung ke ringkasan akhir.
      this.levelIndex = LEVELS.length - 1;
      this.refleksiTercatat = lanjut.refleksiSelesai;
      const taskTerakhir = terakhir?.taskId;
      if (!this.refleksiTercatat && taskTerakhir) logger.start(this.sessionId, taskTerakhir);
      this.kotaHijauSelesai = lanjut.kotaHijauSelesai;
      this.mulaiMisiKotaHijau(() => this.tampilkanSelesai());
      return;
    }
    this.levelIndex = berikut;
    if (baru || (!lanjut.tutorialSelesai && berikut === 0)) {
      this.mulaiTutorial();
    } else {
      // Prolog hanya untuk siswa yang belum pernah memulai.
      this.prologTampil = berikut > 0;
      void this.mulaiLevel();
    }
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

      this.play?.destroy();
      this.play = null;

      // Cerita tampil SEBELUM layar target, saat pencatat log belum berjalan,
      // jadi waktu membaca cerita tidak terhitung. Teks soal tidak diubah.
      const keTarget = (): void =>
        renderLayarTarget(
          this.root,
          { level: this.levelSaatIni, totalLevels: LEVELS.length, task: res.task, sebelumnya: this.sebelumnya },
          (target, disarankan) => this.mulaiBermain(res.task, target, disarankan),
        );
      // Tiket jalan pintas (misi tersembunyi): layar cerita dilewati, level tetap utuh.
      const lewatiCerita = this.progres?.sudah('tiket-jalan-pintas') ?? false;
      const keBabak = (): void =>
        lewatiCerita
          ? keTarget()
          : renderAdegan(this.root, babak(this.levelSaatIni, res.task, this.kasusTerakhir()), keTarget);
      if (lewatiCerita) {
        keTarget();
      } else if (!this.prologTampil) {
        this.prologTampil = true;
        renderAdegan(this.root, prolog(this.studentName), keBabak);
      } else {
        keBabak();
      }
    } catch (err) {
      this.tampilkanError(err, () => void this.mulaiLevel());
    }
  }

  /**
   * Mulai mengerjakan setelah siswa menetapkan target.
   *
   * Pencatat log baru dijalankan DI SINI, bukan saat task dimuat: waktu yang
   * dipakai siswa menimbang target tidak boleh terhitung sebagai waktu
   * perencanaan pada observable K2. goal_set menjadi event pertama (t = 0).
   */
  private mulaiBermain(task: TaskDto, target: TargetBelajar, disarankan: Klaim | null): void {
    // Pengerjaan hanya dimulai dalam layar penuh (lihat ui/layarPenuh.ts).
    pastikanLayarPenuh(() => this.mulaiBermainLayarPenuh(task, target, disarankan));
  }

  private mulaiBermainLayarPenuh(task: TaskDto, target: TargetBelajar, disarankan: Klaim | null): void {
    this.target = target;
    this.jumlahPusatDipindah = 0;
    logger.start(this.sessionId, task.id);
    logger.record('goal_set', { ...target, suggestedClaim: disarankan }, true);
    if (!layarPenuhDidukung()) logger.record('layar_penuh', { aksi: 'tidak-didukung' }, true);

    this.root.replaceChildren();
    this.play = new PlayScreen(
      this.root,
      {
        studentName: this.studentName,
        level: this.levelSaatIni,
        totalLevels: LEVELS.length,
        task,
        target,
      },
      this.buatCallbacks(),
    );
    this.play.render();
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
      onGambarGrafik: (data: GambarGrafikEvent): void => {
        logger.record('gambar_grafik', { ...data }, data.benar);
      },
      onSetZoneCenter: (variable: 'x' | 'y', col: number, row: number): void => {
        logger.record('set_zone_center', { variable, col, row }, true);
        this.jumlahPusatDipindah++;
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
        selfAssessment?: SkorKlaim;
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
        this.akhirXY = { x: data.finalX, y: data.finalY };

        const adaLevelBerikutnya = this.levelIndex < LEVELS.length - 1;
        const hasil = await api.submit({
          sessionId: this.sessionId,
          taskId: this.task!.id,
          finalX: data.finalX,
          finalY: data.finalY,
          reflectionClosedOptionId: data.reflectionClosedOptionId,
          reflectionOpenText: data.reflectionOpenText,
          selfAssessment: data.selfAssessment,
          finishSession: !adaLevelBerikutnya,
        });

        this.tampilkanHasil(hasil, adaLevelBerikutnya);
      },
    };
  }

  private tampilkanHasil(hasil: SubmitResponse, adaLevelBerikutnya: boolean): void {
    this.riwayat.push({
      level: this.levelSaatIni,
      rawSum: hasil.rawSum,
      feedback: hasil.feedback,
      aal: hasil.assessmentAsLearning,
    });
    this.sebelumnya = {
      level: this.levelSaatIni,
      scores: hasil.scores,
      feedback: hasil.feedback,
      suggestedNextFocus: hasil.assessmentAsLearning?.suggestedNextFocus ?? 'K1',
    };
    this.sessionComposite = hasil.sessionComposite;

    const task = this.task!;
    this.kotaHasil = [
      ...this.kotaHasil.filter((k) => k.level !== this.levelSaatIni),
      {
        level: this.levelSaatIni,
        taskId: task.id,
        judul: task.title,
        x: this.akhirXY.x,
        y: this.akhirXY.y,
        xMax: task.variables.x.max,
        yMax: task.variables.y.max,
        labelX: task.variables.x.label,
        labelY: task.variables.y.label,
        unitX: task.variables.x.unit,
        unitY: task.variables.y.unit,
        visualX: task.variables.x.visual,
        visualY: task.variables.y.visual,
        spriteX: task.variables.x.sprite,
        spriteY: task.variables.y.sprite,
        layak: hasil.finalPositionValid,
      },
    ];
    this.play?.destroy();
    this.play = null;

    renderResultScreen(
      this.root,
      {
        hasil,
        task,
        level: this.levelSaatIni,
        totalLevels: LEVELS.length,
        adaLevelBerikutnya,
        jumlahPusatDipindah: this.jumlahPusatDipindah,
        // Hadiah dihitung dari selesainya level dan adanya target, BUKAN dari skor.
        hadiah: this.progres?.levelSelesai(this.levelSaatIni, LEVELS.length, this.target !== null),
        // Pengecualian tunggal: skor rubrik >= 10/12 membuka misi perpustakaan.
        perpustakaanBaru: this.progres?.catatSkorLevel(hasil.rawSum) ?? false,
        progres: this.progres ?? undefined,
        kota: this.kotaHasil,
        onTanggapanProtes: (t) => this.catatTanggapanProtes(t),
      },
      () => {
        if (adaLevelBerikutnya) {
          this.levelIndex++;
          void this.mulaiLevel();
        } else {
          const keRingkasan = (): void => renderFinishScreen(
            this.root,
            {
              studentName: this.studentName,
              sessionComposite: this.sessionComposite,
              riwayat: this.riwayat,
              kota: this.kotaHasil,
              onTanggapanProtes: (t) => this.catatTanggapanProtes(t),
            },
            // Refleksi akhir sesi dicatat pada percobaan level terakhir - pencatat
            // log masih menunjuk ke task itu. Disaring dari skoring di server.
            async (refleksi) => {
              logger.record('learning_reflection', { ...refleksi }, true);
              this.progres?.beriTiket();
              await logger.flush();
              logger.stop();
              this.refleksiTercatat = true;
            },
            () => this.mulaiKotaBebas(),
            false,
            this.progres ?? undefined,
          );
          const keEpilog = (): void => {
            if (this.progres?.sudah('tiket-jalan-pintas')) keRingkasan();
            else renderAdegan(this.root, epilog(this.studentName, this.kotaHasil.map((k) => k.judul), this.kotaHasil), keRingkasan);
          };
          // Misi Kota Hijau (KPMM kedua, rubrik KH1-KH4) dikerjakan setelah Level 4.
          this.mulaiMisiKotaHijau(keEpilog);
        }
      },
    );
  }

  /**
   * Kota Bebas (U9): eksperimen tanpa skor setelah sesi selesai.
   *
   * Memakai PlayScreen dengan task latihan dan SEMUA callback kosong, sehingga
   * tidak ada event yang dicatat, tidak ada permintaan ke server, dan tidak ada
   * skor. Ini sengaja tidak menambah jenis event baru agar instrumen tidak berubah.
   */
  private mulaiKotaBebas(): void {
    this.play?.destroy();
    this.play = null;
    this.root.replaceChildren();
    // Kota Bebas memakai layar Kota dengan ekonomi, tanpa mengirim data apa pun.
    void import('./kota/KotaScreen.js').then((m) =>
      m.mountKotaScreen(this.root, { simpan: false, onKeluar: () => this.tampilkanSelesai(), progres: this.progres ?? undefined }),
    );
  }

  /** Kembali ke layar ringkasan akhir sesi (dipakai setelah Kota Bebas). */
  private tampilkanSelesai(): void {
    renderFinishScreen(
      this.root,
      {
        studentName: this.studentName,
        sessionComposite: this.sessionComposite,
        riwayat: this.riwayat,
        kota: this.kotaHasil,
        onTanggapanProtes: (t) => this.catatTanggapanProtes(t),
      },
      this.refleksiTercatat
        ? async () => undefined
        : async (refleksi) => {
            logger.record('learning_reflection', { ...refleksi }, true);
            this.progres?.beriTiket();
            await logger.flush();
            logger.stop();
            this.refleksiTercatat = true;
          },
      () => this.mulaiKotaBebas(),
      this.refleksiTercatat,
      this.progres ?? undefined,
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
