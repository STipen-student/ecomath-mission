/**
 * Layar pengerjaan satu task, bergaya antarmuka city-builder.
 *
 * TATA LETAK. Peta kota mengisi seluruh layar sebagai latar; seluruh kendali
 * mengambang di atasnya - HUD di atas, kartu zona dan bilah alat di bawah, dan
 * panel rinci muncul sebagai lembar geser. Bentuk ini dipilih karena siswa
 * mengakses lewat HP: peta tetap terlihat saat panel terbuka, sehingga hubungan
 * antara angka pada slider dan kota yang tumbuh tidak pernah terputus.
 *
 * KEPUTUSAN DESAIN PENTING - urutan pengerjaan tidak dipaksakan.
 * Seluruh alat pada bilah bawah dapat dibuka kapan saja. Bila urutan dipaksakan
 * (variabel -> tujuan -> kendala -> slider), event select_objective mustahil
 * terjadi setelah move_slider, sehingga deskriptor K2 skor 0 ("trial-error tanpa
 * rencana") tidak akan pernah muncul pada data mana pun dan rubrik kehilangan
 * daya pembedanya. Tanda centang pada alat hanya menginformasikan apa yang sudah
 * dikerjakan, bukan mengunci langkah berikutnya.
 *
 * KETERBACAAN NARASI. Font pixel dipakai untuk chrome antarmuka - HUD, tombol,
 * angka - tetapi TIDAK untuk teks soal. Narasi SPtLDV berbahasa Indonesia cukup
 * panjang, dan memaksakan font pixel pada teks itu akan mengubah instrumen ini
 * menjadi pengukur kemampuan membaca, bukan kemampuan matematis.
 */

import { mountCity, type CityHandle } from '../game/mountCity.js';
import { GRID, plotTiles } from '../game/iso/isoGrid.js';
import { cornerCandidates, evaluate, objectiveValue } from '../game/geometry.js';
import type { ConstraintDto, DistractorResponse, SkorKlaim, TargetBelajar, TaskDto } from '../api/types.js';
import { clear, el, jam, num } from './dom.js';
import { formPenilaianDiri } from './asesmenDiri.js';
import { aturBisu, bunyikan, sedangBisu } from '../game/suara.js';
import { progresAktif } from '../game/progres.js';
import { KONSEKUENSI_DITERIMA, KONSEKUENSI_TERSIRAT, konsekuensiKendala } from '../game/konsekuensi.js';
import { BidangPerencanaan } from './bidangPerencanaan.js';

export interface GambarGrafikEvent {
  slot: number;
  tahap: 'garis' | 'arsir';
  titik: Array<[number, number]>;
  benar: boolean;
}

export interface PlayCallbacks {
  onIdentifyVariable: (variable: 'x' | 'y', optionId: string) => void;
  onSelectObjective: (optionId: string) => void;
  onWriteConstraint: (slot: number, a: number, b: number, op: string, c: number, text: string) => void;
  onMoveSlider: (x: number, y: number, valid: boolean) => void;
  onCheckCorner: (x: number, y: number, z: number | null) => void;
  onAttemptSubmit: (x: number, y: number, valid: boolean) => void;
  onRejectBySystem: (x: number, y: number, violated: string[]) => void;
  onReviseAfterEvent: (x: number, y: number, valid: boolean) => void;
  onSetZoneCenter: (variable: 'x' | 'y', col: number, row: number) => void;
  /** Siswa menggambar garis batas atau memilih sisi arsiran (data proses, tidak dinilai). */
  onGambarGrafik?: (data: GambarGrafikEvent) => void;
  onRequestDistractor: (x: number, y: number) => Promise<DistractorResponse | null>;
  onFinish: (data: {
    finalX: number;
    finalY: number;
    reflectionClosedOptionId?: string;
    reflectionOpenText?: string;
    /** Penilaian diri 0-3 per tahap (Assessment as Learning). */
    selfAssessment?: SkorKlaim;
  }) => Promise<void>;
}

export interface PlayContext {
  studentName: string;
  level: number;
  totalLevels: number;
  task: TaskDto;
  /** Buka panel Misi otomatis saat level dimulai (bawaan: ya; tutorial: tidak). */
  bukaMisiOtomatis?: boolean;
  /** Target belajar yang ditetapkan siswa sebelum level; null di tutorial. */
  target?: TargetBelajar | null;
}

const OPERATOR = [
  { nilai: '<=', label: '≤' },
  { nilai: '>=', label: '≥' },
  { nilai: '<', label: '<' },
  { nilai: '>', label: '>' },
] as const;

const LABEL_KUAS = 'Pasang ubin';

/** Petak bangun pada kisi, urut seed: dipakai menyinkronkan ubin dengan nilai x dan y. */
const PETAK_BANGUN: number[] = plotTiles().map((t) => t.seed);

/** Satu pertidaksamaan yang ditulis siswa sendiri di panel "Kendala". */
interface TulisanKendala {
  slot: number;
  a: number;
  b: number;
  op: ConstraintDto['op'];
  c: number;
  text: string;
}

interface Laci {
  id: string;
  ikon: string;
  label: string;
  judul: string;
  isi: HTMLElement;
  tombol: HTMLButtonElement;
  selesai: boolean;
}

export class PlayScreen {
  private kota: CityHandle | null = null;

  private constraints: ConstraintDto[];
  private objective: TaskDto['objective'];
  private readonly kendalaTerbuka = new Set<string>();

  /**
   * Kendala seperti yang DITULIS SISWA di panel "Kendala" - satu slot per
   * pertidaksamaan yang diminta task, null bila slot itu belum diisi.
   *
   * KEPUTUSAN DESAIN PENTING. Meter kendala di HUD dan panel "Titik Pojok"
   * dihitung dari array INI, bukan dari `this.constraints` (kunci jawaban
   * asli). Sebelum perubahan ini, kedua panel selalu menampilkan kelayakan
   * terhadap kendala yang BENAR sejak awal - siswa bisa menggeser slider
   * sampai meter hijau tanpa pernah menerjemahkan soal sendiri, sehingga K3
   * (melaksanakan rencana) dapat "lolos" murni dengan membaca meter, terlepas
   * dari K1/K2. Sekarang umpan balik hanya mencerminkan hipotesis siswa
   * sendiri - bila tulisannya salah, meter akan salah juga, dan barulah saat
   * submit (yang SELALU diperiksa terhadap `this.constraints`) mereka tahu
   * yang sebenarnya. Ketidaksesuaian itu justru bukti K4 yang berharga.
   *
   * `this.constraints` (kunci jawaban) tetap dipakai apa adanya untuk
   * kelayakan submit/reject dan revisi setelah event distraktor - keduanya
   * tetap harus memakai kebenaran asli demi validitas skor. Warna peta memakai
   * kunci hanya bila fitur task `feedback.feasibilityFeedback` = 'answer_key'
   * (Level 1); lihat kelayakanUntukRona() dan SCORING_SPEC §7.20.
   */
  private tulisanKendala: (TulisanKendala | null)[];

  private x = 0;
  private y = 0;
  private mulai = performance.now();
  private timerId: number | null = null;
  private moveDebounce: number | null = null;

  /**
   * Mekanik 2B (docs/DRAF_INSTRUMEN_2B_MATEMATIKA_KOTA.md): siswa memasang ubin
   * zona di peta. JUMLAH ubin tiap zona x langkah variabel = nilai x dan y.
   * Letak ubin tidak memengaruhi nilai, sama seperti pusat zona pada versi 1.1.0.
   * Event yang dicatat tetap move_slider / revise_after_event dengan x dan y.
   */
  private readonly petakZona = new Map<number, 'x' | 'y'>();
  private kuas: 'x' | 'y' = 'x';
  /** Aksi yang ditetapkan saat ketukan pertama, dipertahankan selama menyeret. */
  private aksiSeret: 'pasang' | 'cabut' = 'pasang';

  private distractorSudahMuncul = false;
  private jumlahPenolakan = 0;
  private tahapRefleksi = false;

  /** Bidang perencanaan mini (Level 3, §7.21); null bila task tidak memilikinya. */
  private bidang: BidangPerencanaan | null = null;

  private readonly laci = new Map<string, Laci>();

  private readonly tombolPusat: Partial<Record<'x' | 'y', HTMLButtonElement>> = {};
  private sliderX!: HTMLInputElement;
  private sliderY!: HTMLInputElement;
  private nilaiX!: HTMLElement;
  private nilaiY!: HTMLElement;
  private meterBar!: HTMLElement;
  private bacaanZ!: HTMLElement;
  private labelWaktu!: HTMLElement;
  private tumpukanToast!: HTMLElement;
  private panelPojok!: HTMLElement;
  private bilahAlat!: HTMLElement;
  private lembar!: HTMLElement;
  private lembarJudul!: HTMLElement;
  private lembarIsi!: HTMLElement;
  private tombolKirim!: HTMLButtonElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly ctx: PlayContext,
    private readonly cb: PlayCallbacks,
  ) {
    this.constraints = ctx.task.constraints.map((k) => ({ ...k }));
    this.objective = { ...ctx.task.objective };
    this.tulisanKendala = new Array(ctx.task.expectedConstraintCount).fill(null);
  }

  /* ================================================================ */
  /* Perakitan tampilan                                                */
  /* ================================================================ */

  render(): void {
    clear(this.root);
    const t = this.ctx.task;

    const mountGame = el('div', { class: 'map-layer', id: 'game-mount' });

    this.root.append(
      el(
        'div',
        { class: 'app-shell' },
        mountGame,
        this.bangunHud(),
        this.bangunDokZona(),
        this.bangunBilahAlat(),
        this.bangunLembar(),
        (this.tumpukanToast = el('div', { class: 'toast-stack' })),
      ),
    );

    this.daftarkanLaci();
    this.mulaiPhaser(mountGame);
    this.mulaiTimer();
    this.perbarui(true);

    // Misi dibuka otomatis: siswa harus membaca soal sebelum apa pun, dan pada
    // layar HP panel yang tertutup mudah luput dari perhatian.
    // Tutorial mematikannya: langkah pertamanya menggeser penggeser di kiri
    // bawah, dan panel Misi yang terbuka justru menutupi penggeser itu.
    if (this.ctx.bukaMisiOtomatis !== false) this.bukaLaci('misi');
    this.toast(`Level ${this.ctx.level}: ${t.title}`, 'info', 4200);
  }

  private bangunHud(): HTMLElement {
    const t = this.ctx.task;
    this.labelWaktu = el('span', { class: 'clock-value' }, '00:00');
    this.meterBar = el('div', { class: 'meters' });

    return el(
      'header',
      { class: 'hud' },
      el(
        'div',
        { class: 'plate plate-identity' },
        this.lencanaRahasia(),
        el(
          'span',
          { class: 'identity-text' },
          el('span', { class: 'identity-city' }, t.title),
          el('span', { class: 'identity-who' }, `${this.ctx.studentName} · ${this.labelSdg(t.sdgContext)}`),
        ),
      ),
      this.meterBar,
      this.bangunPlatTarget(),
      this.bangunTombolSuara(),
      el('div', { class: 'plate plate-clock' }, el('span', { class: 'clock-ico' }, '⏱'), this.labelWaktu),
    );
  }

  /**
   * Pengingat target belajar di HUD - pemantauan diri SELAMA mengerjakan,
   * bukan hanya sebelum dan sesudahnya. Ketuk untuk membaca ulang strateginya.
   */
  private bangunPlatTarget(): HTMLElement | null {
    const target = this.ctx.target;
    if (!target) return null;
    const plat = el(
      'button',
      { class: 'plate plate-goal', ariaLabel: `Targetmu: ${target.focusClaim} skor ${target.targetScore}. Ketuk untuk melihat strategi.` },
      el('span', {}, '🎯'),
      el('span', { class: 'goal-text' }, `${target.focusClaim}→${target.targetScore}`),
    );
    plat.addEventListener('click', () => this.toast(`Strategimu: ${target.strategyText}`, 'info', 5200));
    return plat;
  }

  /**
   * Lencana level. Diketuk lima kali = misi tersembunyi "Arsitek rahasia".
   * Hanya mengirim CustomEvent ke jendela; tidak ada event log, tidak ada skor.
   */
  private lencanaRahasia(): HTMLElement {
    let ketuk = 0;
    const lencana = el('span', { class: 'lvl-badge' }, `LV${this.ctx.level}`);
    lencana.addEventListener('click', () => {
      ketuk++;
      if (ketuk === 5) window.dispatchEvent(new CustomEvent('ecomath:rahasia', { detail: 'arsitek-rahasia' }));
    });
    return lencana;
  }

  /** Tombol bisu (hiburan, tidak dicatat sebagai event). */
  private bangunTombolSuara(): HTMLElement {
    const tombol = el('button', { class: 'plate plate-suara', ariaLabel: 'Nyalakan atau matikan suara' }, sedangBisu() ? '🔇' : '🔊');
    tombol.addEventListener('click', () => {
      aturBisu(!sedangBisu());
      tombol.textContent = sedangBisu() ? '🔇' : '🔊';
    });
    return tombol;
  }

  private bangunDokZona(): HTMLElement {
    const t = this.ctx.task;

    this.nilaiX = el('span', { class: 'zone-value' }, `0 ${t.variables.x.unit}`);
    this.nilaiY = el('span', { class: 'zone-value' }, `0 ${t.variables.y.unit}`);
    this.bacaanZ = el('div', { class: 'plate plate-score' });

    const buatSlider = (v: 'x' | 'y'): HTMLInputElement => {
      const spec = t.variables[v];
      const input = el('input', {
        class: `pixel-range range-${spec.visual}`,
        type: 'range',
        min: '0',
        max: String(spec.max),
        step: String(spec.step),
        value: '0',
        ariaLabel: `Alokasi ${spec.label}`,
      });
      input.addEventListener('input', () => this.geser());
      return input;
    };

    this.sliderX = buatSlider('x');
    this.sliderY = buatSlider('y');

    const kartu = (v: 'x' | 'y', slider: HTMLInputElement, nilai: HTMLElement): HTMLElement => {
      const tombolPusat = el(
        'button',
        { class: 'btn btn-tiny zone-pin', ariaLabel: `Atur pusat zona ${v.toUpperCase()} di peta` },
        LABEL_KUAS,
      );
      tombolPusat.addEventListener('click', () => this.pilihKuas(v));
      this.tombolPusat[v] = tombolPusat;

      return el(
        'div',
        // Warna kartu mengikuti identitas visual variabel, sehingga cocok dengan
        // zona yang tumbuh di peta apa pun sumbunya.
        { class: 'plate zone-card', dataset: { visual: t.variables[v].visual } },
        el(
          'div',
          { class: 'zone-head' },
          el('i', { class: `swatch swatch-${t.variables[v].visual}` }),
          el('span', { class: 'zone-name' }, `${v.toUpperCase()} · ${t.variables[v].label}`),
          nilai,
        ),
        slider,
        el('div', { class: 'zone-foot' }, tombolPusat),
      );
    };

    if (t.feedback?.graphSupport) this.bidang = new BidangPerencanaan();

    return el(
      'div',
      { class: 'zone-dock' },
      this.bidang?.root ?? null,
      kartu('x', this.sliderX, this.nilaiX),
      kartu('y', this.sliderY, this.nilaiY),
      this.bacaanZ,
    );
  }

  private bangunBilahAlat(): HTMLElement {
    this.bilahAlat = el('nav', { class: 'toolbar' });
    this.tombolKirim = el('button', { class: 'tool tool-go' }, el('span', { class: 'tool-ico' }, '▶'), el('span', { class: 'tool-label' }, 'Ajukan'));
    this.tombolKirim.addEventListener('click', () => void this.kirim());
    return this.bilahAlat;
  }

  private bangunLembar(): HTMLElement {
    this.lembarJudul = el('h2', { class: 'sheet-title' });
    this.lembarIsi = el('div', { class: 'sheet-body' });

    const tutup = el('button', { class: 'sheet-close', ariaLabel: 'Tutup panel' }, '✕');
    tutup.addEventListener('click', () => this.tutupLaci());

    this.lembar = el(
      'div',
      { class: 'sheet is-hidden' },
      el(
        'div',
        { class: 'plate sheet-panel' },
        el('header', { class: 'sheet-head' }, this.lembarJudul, tutup),
        this.lembarIsi,
      ),
    );

    // Menyentuh area gelap di luar panel menutup lembar - kebiasaan umum di
    // antarmuka seluler, dan mencegah siswa merasa terjebak di dalam panel.
    this.lembar.addEventListener('click', (ev) => {
      if (ev.target !== this.lembar) return;
      // Lembar refleksi dikunci: siswa yang tidak sengaja menyentuh latar akan
      // kehilangan satu-satunya sumber bukti K4 bila lembar ikut tertutup.
      if (this.lembar.classList.contains('is-locked')) return;
      this.tutupLaci();
    });

    return this.lembar;
  }

  /* ================================================================ */
  /* Laci (bottom sheet)                                               */
  /* ================================================================ */

  private daftarkanLaci(): void {
    const daftar: Array<{ id: string; ikon: string; label: string; judul: string; isi: HTMLElement }> = [
      { id: 'misi', ikon: '\u{1f4dc}', label: 'Misi', judul: 'Misi kota', isi: this.isiMisi() },
      { id: 'variabel', ikon: '\u{1f50e}', label: 'Kenali zona', judul: '1 · Kenali zona', isi: this.isiVariabel() },
      { id: 'tujuan', ikon: '\u{1f3af}', label: 'Mandat', judul: '2 · Mandat Wali Kota', isi: this.isiTujuan() },
      { id: 'kendala', ikon: '\u{1f4d0}', label: 'Perda', judul: '3 · Rancangan perda', isi: this.isiPenyusun() },
      { id: 'pojok', ikon: '\u{1f4cd}', label: 'Simulasi', judul: '4 · Ruang simulasi', isi: this.isiTitikPojok() },
    ];

    for (const d of daftar) {
      const tombol = el(
        'button',
        { class: 'tool', dataset: { drawer: d.id } },
        el('span', { class: 'tool-ico' }, d.ikon),
        el('span', { class: 'tool-label' }, d.label),
        el('span', { class: 'tool-tick' }, '✓'),
      );
      tombol.addEventListener('click', () => this.bukaLaci(d.id));
      this.bilahAlat.append(tombol);
      this.laci.set(d.id, { ...d, tombol, selesai: false });
    }

    this.bilahAlat.append(this.tombolKirim);
  }

  private bukaLaci(id: string): void {
    const l = this.laci.get(id);
    if (!l) return;

    this.lembarJudul.textContent = l.judul;
    this.lembarIsi.replaceChildren(l.isi);
    this.lembar.classList.remove('is-hidden');

    for (const lain of this.laci.values()) {
      lain.tombol.classList.toggle('is-active', lain.id === id);
    }
    if (id === 'pojok') this.gambarTitikPojok();
  }

  private tutupLaci(): void {
    this.lembar.classList.add('is-hidden');
    for (const l of this.laci.values()) l.tombol.classList.remove('is-active');
  }

  /**
   * Rekor simulasi (U7): nilai Z terbaik dari titik pojok yang DIHITUNG SISWA
   * sendiri. Tidak mengetahui titik optimum, sehingga tidak membocorkan jawaban.
   * Hanya tampilan; event check_corner_point tetap dicatat seperti biasa.
   */
  private rekorZ: number | null = null;

  private catatRekor(z: number | null): void {
    if (z === null || this.objective.type === 'none') return;
    const lebihBaik =
      this.rekorZ === null || (this.objective.type === 'max' ? z > this.rekorZ : z < this.rekorZ);
    if (lebihBaik) this.rekorZ = z;
    this.labelRekor.textContent = `Rekor simulasimu: Z = ${num(this.rekorZ!)}`;
  }

  private labelRekor: HTMLElement = el('p', { class: 'hint rekor-simulasi' }, '');

  private tandaiSelesai(id: string): void {
    const l = this.laci.get(id);
    if (!l || l.selesai) return;
    l.selesai = true;
    l.tombol.classList.add('is-done');
  }

  /* ================================================================ */
  /* Isi tiap laci                                                     */
  /* ================================================================ */

  private isiMisi(): HTMLElement {
    const t = this.ctx.task;
    const isi: HTMLElement[] = [el('p', { class: 'prose' }, t.narrative)];

    if (t.dataTable) {
      isi.push(
        el(
          'table',
          { class: 'data-table' },
          el('thead', {}, el('tr', {}, ...t.dataTable.headers.map((h) => el('th', {}, h)))),
          el('tbody', {}, ...t.dataTable.rows.map((r) => el('tr', {}, ...r.map((sel) => el('td', {}, sel))))),
        ),
      );
    }

    if (t.objective.type !== 'none') {
      isi.push(el('div', { class: 'goal-banner' }, el('span', { class: 'goal-tag' }, 'TUJUAN'), t.objective.display));
    }

    isi.push(el('p', { class: 'hint' }, t.gameInteraction));
    return el('div', {}, ...isi);
  }

  private isiVariabel(): HTMLElement {
    const t = this.ctx.task;

    const buat = (variabel: 'x' | 'y'): HTMLElement => {
      const opsi = t.variableOptions.filter((o) => o.assignsTo === variabel);
      const select = el('select', { class: 'field' });
      select.append(el('option', { value: '' }, '-- pilih --'));
      for (const o of opsi) select.append(el('option', { value: o.id }, o.text));

      select.addEventListener('change', () => {
        if (!select.value) return;
        this.cb.onIdentifyVariable(variabel, select.value);
        this.tandaiSelesai('variabel');
      });

      return el(
        'div',
        { class: 'field-group' },
        el(
          'label',
          { class: 'label' },
          el('i', { class: `swatch swatch-${t.variables[variabel].visual}` }),
          `Variabel ${variabel} mewakili`,
        ),
        select,
      );
    };

    return el(
      'div',
      {},
      el('p', { class: 'hint' }, 'Tentukan apa yang diwakili tiap variabel sebelum mulai membangun.'),
      buat('x'),
      buat('y'),
    );
  }

  private isiTujuan(): HTMLElement {
    const t = this.ctx.task;
    const wadah = el('div', { class: 'choice-group' });

    for (const o of t.goalOptions) {
      const radio = el('input', { type: 'radio', name: 'goal', value: o.id });
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        this.cb.onSelectObjective(o.id);
        this.tandaiSelesai('tujuan');
      });
      wadah.append(el('label', { class: 'choice' }, radio, el('span', {}, o.text)));
    }

    return el(
      'div',
      {},
      el('p', { class: 'hint' }, 'Pilih rumusan tujuan yang paling sesuai dengan yang diminta soal.'),
      wadah,
    );
  }

  private isiPenyusun(): HTMLElement {
    const t = this.ctx.task;
    const wadah = el('div', { class: 'builder' });
    for (let slot = 0; slot < t.expectedConstraintCount; slot++) wadah.append(this.barisPenyusun(slot));

    return el(
      'div',
      {},
      el(
        'p',
        { class: 'hint' },
        `Terjemahkan narasi menjadi ${t.expectedConstraintCount} pertidaksamaan, lalu tekan Simpan pada tiap baris.`,
      ),
      wadah,
    );
  }

  private barisPenyusun(slot: number): HTMLElement {
    const koef = (aria: string, awal: string): HTMLInputElement =>
      el('input', { class: 'coef', type: 'number', value: awal, step: 'any', ariaLabel: aria });

    const inputA = koef(`Koefisien x kendala ${slot + 1}`, '1');
    const inputB = koef(`Koefisien y kendala ${slot + 1}`, '1');
    const inputC = koef(`Ruas kanan kendala ${slot + 1}`, '0');

    const pilihOp = el('select', { class: 'op-select', ariaLabel: `Operator kendala ${slot + 1}` });
    for (const op of OPERATOR) pilihOp.append(el('option', { value: op.nilai }, op.label));

    const status = el('span', { class: 'builder-status' });
    const simpan = el('button', { class: 'btn btn-small' }, 'Simpan');

    simpan.addEventListener('click', () => {
      const a = Number(inputA.value);
      const b = Number(inputB.value);
      const c = Number(inputC.value);
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
        status.textContent = 'Isi angka yang valid';
        status.className = 'builder-status is-error';
        return;
      }
      const op = pilihOp.value as ConstraintDto['op'];
      const text = `${a}x + ${b}y ${op} ${c}`;
      this.cb.onWriteConstraint(slot, a, b, op, c, text);
      this.tulisanKendala[slot] = { slot, a, b, op, c, text };

      status.textContent = 'Tersimpan';
      status.className = 'builder-status is-ok';
      this.tandaiSelesai('kendala');

      // Meter di HUD wajib langsung memperlihatkan efek tulisan baru ini -
      // itulah inti dari "uji titik pojok menyesuaikan dengan kendala yang
      // ditulis". Panel Titik Pojok cukup dihitung ulang saat dibuka
      // (lihat bukaLaci), karena kedua panel tidak pernah tampil bersamaan.
      // perbarui() juga menggambar ulang rona peta dan bidang perencanaan,
      // yang pada Level 2-4 ikut bergantung pada tulisan ini (§7.20-§7.21).
      this.perbarui(false);
    });

    return el(
      'div',
      { class: 'builder-row' },
      el('span', { class: 'builder-index' }, String(slot + 1)),
      inputA,
      el('span', { class: 'builder-var' }, 'x +'),
      inputB,
      el('span', { class: 'builder-var' }, 'y'),
      pilihOp,
      inputC,
      simpan,
      status,
    );
  }

  private isiTitikPojok(): HTMLElement {
    this.panelPojok = el('div', { class: 'corner-list' });
    return el(
      'div',
      {},
      el(
        'p',
        { class: 'hint' },
        this.objective.type === 'none'
          ? 'Soal ini adalah sistem pertidaksamaan tanpa fungsi tujuan, jadi yang dicari adalah HIMPUNAN PENYELESAIAN: semua pasangan (x, y) yang memenuhi setiap kendala. Gambar sendiri grafiknya dari kendala yang SUDAH kamu tulis di panel "Perda": untuk tiap pertidaksamaan, ketuk dua titik yang dilalui garis batasnya, lalu ketuk sisi yang memenuhi. Kamu juga bisa menguji titik kapan saja lewat kolom x dan y.'
          : 'Titik pojok di bawah dihitung dari kendala yang SUDAH kamu tulis di panel "Kendala" - bukan dari jawaban sebenarnya. Bila hasilnya terasa aneh, periksa kembali tulisanmu, bukan titik pojoknya.',
      ),
      ...(this.objective.type === 'none'
        ? []
        : [el('p', { class: 'hint' }, 'Hitung nilai Z pada tiap titik pojok untuk menemukan yang paling menguntungkan.')]),
      this.panelPojok,
    );
  }

  /* ================================================================ */
  /* Kendala tersirat                                                  */
  /* ================================================================ */

  /**
   * Apakah isi sebuah kendala harus disembunyikan dari siswa?
   *
   * Kendala IMPLISIT pada Level 4 wajib disimpulkan sendiri oleh siswa dari
   * narasi (mis. "separuh dari 800 kg CO2" -> batas 400). Menampilkan
   * pertidaksamaannya secara utuh akan memberikan jawaban itu cuma-cuma dan
   * meniadakan hal yang justru ingin diukur Level 4. Status terpenuhi/dilanggar
   * tetap ditampilkan supaya validasi real-time tetap berfungsi.
   */
  private disembunyikan(k: ConstraintDto): boolean {
    return k.kind === 'implicit' && !this.kendalaTerbuka.has(k.id);
  }

  /* ================================================================ */
  /* Kendala tulisan siswa - dasar meter HUD dan panel Titik Pojok      */
  /* ================================================================ */

  /** Ubah satu baris tulisan siswa menjadi bentuk yang dipahami evaluate()/cornerCandidates(). */
  private keConstraintDto(t: TulisanKendala): ConstraintDto {
    return {
      id: `tulis-${t.slot}`,
      label: `Kendala ke-${t.slot + 1} (tulisanmu)`,
      a: t.a,
      b: t.b,
      op: t.op,
      c: t.c,
      kind: 'explicit',
      display: t.text,
    };
  }

  /**
   * Kendala yang dipakai menghitung meter dan titik pojok: seluruh baris yang
   * SUDAH ditulis siswa, ditambah non-negativitas dari kunci jawaban.
   *
   * Non-negativitas (x ≥ 0, y ≥ 0) selalu diambil dari kunci jawaban, bukan
   * dari tulisan siswa - task tidak pernah meminta siswa menuliskannya sendiri
   * (bukan bagian dari expectedConstraintCount), dan nilainya universal untuk
   * setiap task (selalu x ≥ 0, y ≥ 0) sehingga menyertakannya bukan kebocoran.
   */
  private tulisanUntukPerhitungan(): ConstraintDto[] {
    const nonNegatif = this.constraints.filter((k) => k.kind === 'nonnegativity');
    const tulisan = this.tulisanKendala.filter((t): t is TulisanKendala => t !== null).map((t) => this.keConstraintDto(t));
    return [...nonNegatif, ...tulisan];
  }

  /* ================================================================ */
  /* Interaksi                                                         */
  /* ================================================================ */

  /** Nyalakan mesin render peta; penanganan ukuran ada di game/mountCity.ts. */
  private mulaiPhaser(mount: HTMLElement): void {
    this.kota = mountCity(mount);
    this.kota.setPickMode((petak, seret) => this.ketukPetak(petak.row * GRID + petak.col, seret));
  }

  private mulaiTimer(): void {
    this.mulai = performance.now();
    this.timerId = window.setInterval(() => {
      this.labelWaktu.textContent = jam(performance.now() - this.mulai);
    }, 1000);
  }

  /** Pilih zona yang dipasang saat peta diketuk. */
  private pilihKuas(variabel: 'x' | 'y'): void {
    this.kuas = variabel;
    for (const [kunci, b] of Object.entries(this.tombolPusat)) {
      b?.classList.toggle('is-picking', kunci === variabel);
    }
    this.toast(`Ketuk atau seret di peta untuk memasang ${this.ctx.task.variables[variabel].label}. Ketuk ubinnya lagi untuk mencabut.`, 'info', 4200);
  }

  private jumlahUbin(variabel: 'x' | 'y'): number {
    let n = 0;
    for (const z of this.petakZona.values()) if (z === variabel) n++;
    return n;
  }

  /**
   * Ketukan atau seretan pada peta (2B).
   *
   * Ketuk petak kosong: pasang ubin zona terpilih. Ketuk ubin sendiri: cabut.
   * Hasilnya ditulis ke penggeser lalu melewati geser(), sehingga event yang
   * tercatat sama persis dengan menggeser penggeser ke nilai itu.
   */
  private ketukPetak(seed: number, seret: boolean): void {
    if (this.tahapRefleksi) return;
    const isi = this.petakZona.get(seed);
    if (!seret) this.aksiSeret = isi === this.kuas ? 'cabut' : 'pasang';

    const spec = this.ctx.task.variables[this.kuas];
    if (this.aksiSeret === 'cabut') {
      if (isi !== this.kuas) return;
      this.petakZona.delete(seed);
      bunyikan('cabut');
    } else {
      if (isi === this.kuas) return;
      // Batas atas sama dengan batas penggeser.
      if ((this.jumlahUbin(this.kuas) + 1) * spec.step > spec.max) return;
      this.petakZona.set(seed, this.kuas);
      bunyikan('pasang');
    }

    this.sliderX.value = String(this.jumlahUbin('x') * this.ctx.task.variables.x.step);
    this.sliderY.value = String(this.jumlahUbin('y') * this.ctx.task.variables.y.step);
    this.geser();
  }

  /**
   * Samakan jumlah ubin dengan nilai x dan y saat nilainya berubah lewat jalur
   * lain (penggeser, tombol "Bangun" di panel simulasi). Ubin baru mengisi petak
   * kosong pertama; ubin berlebih dicabut dari yang terakhir dipasang.
   */
  private sinkronPetak(): void {
    for (const v of ['x', 'y'] as const) {
      const spec = this.ctx.task.variables[v];
      const target = Math.round((v === 'x' ? this.x : this.y) / spec.step);
      let ada = this.jumlahUbin(v);
      if (ada > target) {
        for (const seed of [...this.petakZona.keys()].reverse()) {
          if (ada <= target) break;
          if (this.petakZona.get(seed) === v) {
            this.petakZona.delete(seed);
            ada--;
          }
        }
      }
      for (const seed of PETAK_BANGUN) {
        if (ada >= target) break;
        if (!this.petakZona.has(seed)) {
          this.petakZona.set(seed, v);
          ada++;
        }
      }
    }
  }

  /**
   * Slider digeser.
   *
   * Event move_slider di-debounce 400 ms: satu geseran menghasilkan puluhan
   * event 'input', dan mencatat semuanya akan membanjiri log tanpa menambah
   * informasi apa pun tentang penalaran siswa.
   */
  private geser(): void {
    this.x = Number(this.sliderX.value);
    this.y = Number(this.sliderY.value);
    this.perbarui(false);

    if (this.moveDebounce !== null) clearTimeout(this.moveDebounce);
    this.moveDebounce = window.setTimeout(() => {
      const hasil = evaluate(this.constraints, this.x, this.y);
      if (this.distractorSudahMuncul) this.cb.onReviseAfterEvent(this.x, this.y, hasil.feasible);
      else this.cb.onMoveSlider(this.x, this.y, hasil.feasible);
    }, 400);
  }

  /**
   * Kelayakan yang menentukan rona peta (langit dan bangunan) SEBELUM Kirim.
   *
   * Sumbernya fitur task `feedback.feasibilityFeedback` (SCORING_SPEC §7.20):
   * - 'answer_key'         -> kunci jawaban, termasuk kendala tersirat (Level 1, ECD Bagian 6);
   * - 'student_hypothesis' -> tulisan siswa, sama dengan meter HUD (Level 2-4).
   *
   * Task tanpa fitur ini (server lama) jatuh ke kunci jawaban - perilaku sebelum
   * §7.20. Kelayakan saat Kirim TIDAK memakai fungsi ini: kirim() selalu
   * menguji `this.constraints`, dan server menghitung ulang semuanya.
   */
  private kelayakanUntukRona(): { feasible: boolean } {
    const sumber = this.ctx.task.feedback?.feasibilityFeedback ?? 'answer_key';
    const kendala = sumber === 'student_hypothesis' ? this.tulisanUntukPerhitungan() : this.constraints;
    return evaluate(kendala, this.x, this.y);
  }

  /** Gambar ulang seluruh indikator yang bergantung pada (x, y). */
  private perbarui(gambarUlangPojok = false): void {
    const t = this.ctx.task;
    const hasil = this.kelayakanUntukRona();

    this.nilaiX.textContent = `${num(this.x)} ${t.variables.x.unit}`;
    this.nilaiY.textContent = `${num(this.y)} ${t.variables.y.unit}`;

    this.gambarMeter();
    this.gambarBacaanZ();

    if (gambarUlangPojok && this.panelPojok) this.gambarTitikPojok();

    this.bidang?.gambar({
      kendala: this.tulisanUntukPerhitungan(),
      jumlahTulisan: this.tulisanKendala.filter((k) => k !== null).length,
      x: this.x,
      y: this.y,
      xMax: t.variables.x.max,
      yMax: t.variables.y.max,
    });

    this.sinkronPetak();
    const ubin = new Map<number, string>();
    for (const [seed, v] of this.petakZona) {
      const spec = t.variables[v];
      ubin.set(seed, spec.sprite ? `s:${spec.sprite}` : `v:${spec.visual}`);
    }
    this.kota?.tampilkanKota(ubin, hasil.feasible);
  }

  /**
   * Deretan meter kendala di HUD.
   *
   * Inilah panel kendala real-time - tetapi sejak perubahan ini, meter menguji
   * KENDALA TULISAN SISWA sendiri, bukan kunci jawaban. Slot yang belum ditulis
   * tampil netral (bukan hijau atau merah) dan mengarahkan siswa membuka panel
   * "Kendala". Lihat catatan panjang pada deklarasi `tulisanKendala` di atas.
   */
  /** Status meter pada render sebelumnya; dipakai hanya untuk umpan balik visual. */
  private meterSebelumnya: boolean[] = [];

  private gambarMeter(): void {
    clear(this.meterBar);

    const aktif = this.tulisanUntukPerhitungan();
    const hasil = evaluate(aktif, this.x, this.y);
    const statusBaru: boolean[] = [];

    this.tulisanKendala.forEach((t, slot) => {
      if (!t) {
        const kosong = el(
          'button',
          { class: 'meter is-empty' },
          el('span', { class: 'meter-mark' }, '?'),
          el(
            'span',
            { class: 'meter-body' },
            el('span', { class: 'meter-label' }, `Perda ke-${slot + 1}`),
            el('span', { class: 'meter-expr is-locked' }, 'belum ditulis'),
          ),
        );
        kosong.addEventListener('click', () => this.bukaLaci('kendala'));
        this.meterBar.append(kosong);
        return;
      }

      const fake = this.keConstraintDto(t);
      const rusak = hasil.violated.has(fake.id);
      const kiri = t.a * this.x + t.b * this.y;

      statusBaru[slot] = !rusak;
      // Meter yang BARU menjadi hijau berkedip sekali. Ini hanya tampilan:
      // tidak mencatat event dan tidak memengaruhi skor.
      const baruHijau = !rusak && this.meterSebelumnya[slot] === false;

      const meter = el(
        'button',
        { class: `meter ${rusak ? 'is-bad' : 'is-ok'}${baruHijau ? ' is-just-ok' : ''}` },
        el('span', { class: 'meter-mark' }, rusak ? '✕' : '✓'),
        el(
          'span',
          { class: 'meter-body' },
          el('span', { class: 'meter-label' }, fake.label),
          el('span', { class: 'meter-expr' }, fake.display),
        ),
        el('span', { class: 'meter-now' }, num(kiri)),
      );

      meter.addEventListener('click', () => this.bukaLaci('kendala'));
      this.meterBar.append(meter);
    });

    this.meterSebelumnya = statusBaru;
  }

  private gambarBacaanZ(): void {
    const z = objectiveValue(this.objective, this.x, this.y);
    clear(this.bacaanZ);
    if (z === null) {
      this.bacaanZ.classList.add('is-empty');
      return;
    }
    this.bacaanZ.classList.remove('is-empty');
    this.bacaanZ.append(
      el('span', { class: 'score-label' }, this.objective.label),
      el('span', { class: 'score-value' }, `${num(z)} ${this.objective.unit}`),
    );
  }

  private gambarTitikPojok(): void {
    if (!this.panelPojok) return;
    const t = this.ctx.task;
    clear(this.panelPojok);

    // Kandidat dihitung dari kendala TULISAN SISWA (tulisanUntukPerhitungan),
    // bukan kunci jawaban - lihat catatan pada deklarasi `tulisanKendala`.
    // Konsekuensinya: sebelum semua slot ditulis, titik yang muncul hanyalah
    // sudut kotak slider (batas maksimum); setelah lengkap dan BENAR, titik-
    // titiknya akan sama dengan daerah penyelesaian sesungguhnya - tetapi bila
    // ada yang salah tulis, titik-titiknya pun akan ikut salah, dan itu
    // sengaja: perbedaan itulah yang harus disadari siswa sendiri.
    const kandidat = cornerCandidates(this.tulisanUntukPerhitungan(), t.variables.x.max, t.variables.y.max);

    const belumLengkap = this.tulisanKendala.some((k) => k === null);
    if (belumLengkap) {
      this.panelPojok.append(
        el(
          'p',
          { class: 'hint' },
          `Baru ${this.tulisanKendala.filter((k) => k !== null).length} dari ${this.tulisanKendala.length} kendala yang kamu tulis. ${this.objective.type === 'none' ? 'Hasil uji titik bisa berubah setelah kamu melengkapinya.' : 'Titik di bawah bisa berubah setelah kamu melengkapinya.'}`,
        ),
      );
    }

    if (this.objective.type === 'none') {
      this.panelPojok.append(this.ujiHimpunan());
      return;
    }

    if (kandidat.length === 0) {
      this.panelPojok.append(el('p', { class: 'hint' }, 'Belum ada titik pojok yang dapat dihitung.'));
      return;
    }

    this.panelPojok.append(this.labelRekor);

    for (const p of kandidat) {
      const hasilZ = el('span', { class: 'corner-z' }, '—');

      const hitung = el('button', { class: 'btn btn-tiny' }, 'Hitung');
      hitung.addEventListener('click', () => {
        const z = objectiveValue(this.objective, p.x, p.y);
        hasilZ.textContent = z === null ? 'titik layak' : `Z = ${num(z)}`;
        hasilZ.className = 'corner-z is-computed';
        this.cb.onCheckCorner(p.x, p.y, z);
        this.tandaiSelesai('pojok');
        this.catatRekor(z);
      });

      const pakai = el('button', { class: 'btn btn-tiny btn-ghost' }, 'Bangun');
      pakai.addEventListener('click', () => {
        const titik = this.titikGridTerdekat(p.x, p.y);
        this.sliderX.value = String(titik.x);
        this.sliderY.value = String(titik.y);
        this.geser();
        this.tutupLaci();
      });

      this.panelPojok.append(
        el('div', { class: 'corner-row' }, el('code', { class: 'corner-coord' }, `(${num(p.x)}, ${num(p.y)})`), hasilZ, hitung, pakai),
      );
    }
  }

  /** Gambar siswa per kendala tulisan, disimpan agar tidak hilang saat panel digambar ulang. */
  private gambarSiswa = new Map<string, GambarKendala>();

  /**
   * Soal pertidaksamaan linear tanpa fungsi tujuan: SISWA SENDIRI menggambar
   * grafiknya. Untuk tiap kendala tulisannya, siswa mengetuk dua titik yang
   * dilalui garis batas, lalu mengetuk satu titik di sisi yang memenuhi.
   * Daerah penyelesaian baru diarsir setelah semua garis dan sisi benar,
   * kemudian siswa dapat menguji titik. Gambar dicatat sebagai data proses
   * (event gambar_grafik), bukan bukti rubrik K1-K4.
   */
  private ujiHimpunan(): HTMLElement {
    const t = this.ctx.task;
    const xMax = t.variables.x.max;
    const yMax = t.variables.y.max;
    const satuan = Math.max(xMax, yMax) <= 100 ? 1 : Math.max(xMax, yMax) / 100;
    const bulat = (v: number): number => Math.round(v / satuan) * satuan;

    const tulisan = this.tulisanKendala
      .map((k, slot) => (k ? { slot, k: this.keConstraintDto(k) } : null))
      .filter((v): v is { slot: number; k: ConstraintDto } => v !== null);
    const kunci = (k: ConstraintDto): string => `${k.a}|${k.b}|${k.op}|${k.c}`;
    const keadaan = (k: ConstraintDto): GambarKendala => {
      const id = kunci(k);
      if (!this.gambarSiswa.has(id)) this.gambarSiswa.set(id, { titik: [], garisBenar: false, sisi: null, sisiBenar: false });
      return this.gambarSiswa.get(id)!;
    };
    const aktif = (): { slot: number; k: ConstraintDto } | undefined =>
      tulisan.find(({ k }) => !keadaan(k).garisBenar || !keadaan(k).sisiBenar);
    const simbol = (op: string): string => (op === '>=' ? '≥' : op === '<=' ? '≤' : op);
    const persamaan = (k: ConstraintDto, op = '='): string =>
      `${num(k.a)}x + ${num(k.b)}y ${op} ${num(k.c)}`.replace('+ -', '- ');

    const petunjuk = el('p', { class: 'uji-hp-petunjuk' });
    const hasil = el('p', { class: 'hint' }, '');
    const riwayat = el('ul', { class: 'uji-hp-riwayat' });
    const diuji: Array<{ x: number; y: number; ok: boolean }> = [];
    const grafik = el('div', { class: 'uji-hp-grafik' });
    const inX = el('input', { type: 'number', min: '0', max: String(xMax), step: 'any', value: String(this.x), ariaLabel: 'Nilai x', class: 'uji-hp-input' });
    const inY = el('input', { type: 'number', min: '0', max: String(yMax), step: 'any', value: String(this.y), ariaLabel: 'Nilai y', class: 'uji-hp-input' });
    const uji = el('button', { class: 'btn btn-tiny' }, 'Uji');
    const barisUji = el('div', { class: 'uji-hp-baris' }, el('span', {}, 'x ='), inX, el('span', {}, 'y ='), inY, uji);

    const gambar = (): void => {
      const sekarang = aktif();
      const selesai = tulisan.length > 0 && !sekarang;
      grafik.innerHTML = grafikHimpunan(
        tulisan.map(({ k }) => ({ k, g: keadaan(k) })),
        this.tulisanUntukPerhitungan(),
        selesai,
        xMax,
        yMax,
        diuji,
        t.variables.x.label,
        t.variables.y.label,
      );
      // Uji titik lewat kolom x, y tetap tersedia sejak awal: rubrik K2 membaca
      // kegiatan uji titik, jadi kesulitan menggambar tidak boleh menghalanginya.
      if (tulisan.length === 0) {
        petunjuk.textContent = 'Tulis dulu kendalamu di panel "Perda". Setelah itu kamu menggambar grafiknya di sini.';
      } else if (sekarang) {
        const g = keadaan(sekarang.k);
        petunjuk.textContent = !g.garisBenar
          ? `Kendala ke-${sekarang.slot + 1}: gambar garis ${persamaan(sekarang.k)}. Ketuk DUA titik di grafik yang dilalui garis itu (titik ${g.titik.length + 1} dari 2).`
          : `Kendala ke-${sekarang.slot + 1}: garisnya sudah benar. Sekarang ketuk satu titik di sisi yang memenuhi ${persamaan(sekarang.k, simbol(sekarang.k.op))}.`;
      } else {
        petunjuk.textContent = '✓ Grafikmu lengkap. Daerah berarsir hijau adalah himpunan penyelesaian. Ketuk grafik atau isi x dan y untuk menguji titik.';
      }
    };

    const ujiTitik = (x: number, y: number): void => {
      const kendala = this.tulisanUntukPerhitungan();
      const ev = evaluate(kendala, x, y);
      const dilanggar = kendala.filter((k) => ev.violated.has(k.id)).map((k) => k.label);
      const teks = ev.feasible
        ? `(${num(x)}, ${num(y)}) ∈ HP: memenuhi semua kendala yang kamu tulis.`
        : `(${num(x)}, ${num(y)}) ∉ HP: tidak memenuhi ${dilanggar.join(', ')}.`;
      hasil.textContent = teks;
      hasil.className = ev.feasible ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad';
      riwayat.prepend(el('li', {}, teks));
      diuji.push({ x, y, ok: ev.feasible });
      this.cb.onCheckCorner(x, y, null);
      this.tandaiSelesai('pojok');
      gambar();
    };

    uji.addEventListener('click', () => {
      const x = Number(inX.value);
      const y = Number(inY.value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        hasil.textContent = 'Isi x dan y dengan angka.';
        return;
      }
      ujiTitik(x, y);
    });

    grafik.addEventListener('click', (e) => {
      const svg = grafik.querySelector('svg');
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * GRAF.w;
      const py = ((e.clientY - r.top) / r.height) * GRAF.h;
      const x = bulat(((px - GRAF.kiri) / (GRAF.w - GRAF.kiri - GRAF.kanan)) * xMax);
      const y = bulat(((GRAF.h - GRAF.bawah - py) / (GRAF.h - GRAF.bawah - GRAF.atas)) * yMax);
      if (x < 0 || y < 0 || x > xMax || y > yMax) return;

      const sekarang = aktif();
      if (!sekarang) {
        inX.value = String(x);
        inY.value = String(y);
        ujiTitik(x, y);
        return;
      }
      const { k, slot } = sekarang;
      const g = keadaan(k);
      if (!g.garisBenar) {
        g.titik.push([x, y]);
        if (g.titik.length === 2) {
          const [p, q] = g.titik as [[number, number], [number, number]];
          const toleransi = 0.5 * satuan * Math.max(Math.abs(k.a), Math.abs(k.b));
          const diGaris = (pt: [number, number]): boolean => Math.abs(k.a * pt[0] + k.b * pt[1] - k.c) <= toleransi + 1e-9;
          const berbeda = p[0] !== q[0] || p[1] !== q[1];
          g.garisBenar = berbeda && diGaris(p) && diGaris(q);
          this.cb.onGambarGrafik?.({ slot, tahap: 'garis', titik: [p, q], benar: g.garisBenar });
          hasil.className = g.garisBenar ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad';
          hasil.textContent = g.garisBenar
            ? `✓ Garis kendala ke-${slot + 1} benar.`
            : `✕ Titik (${num(p[0])}, ${num(p[1])}) dan (${num(q[0])}, ${num(q[1])}) tidak keduanya terletak pada garis itu. Coba cari titik potong dengan sumbu x (y = 0) dan sumbu y (x = 0).`;
          if (!g.garisBenar) g.titik = [];
        } else {
          hasil.className = 'hint';
          hasil.textContent = `Titik pertama (${num(x)}, ${num(y)}). Ketuk titik kedua.`;
        }
      } else {
        const lhs = k.a * x + k.b * y;
        if (Math.abs(lhs - k.c) < 1e-9) {
          hasil.className = 'hint';
          hasil.textContent = 'Titik itu tepat di garis. Ketuk titik yang jelas berada di salah satu sisi garis.';
          return;
        }
        const memenuhi = k.op === '>=' || k.op === '>' ? lhs >= k.c : lhs <= k.c;
        g.sisi = memenuhi ? [x, y] : null;
        g.sisiBenar = memenuhi;
        this.cb.onGambarGrafik?.({ slot, tahap: 'arsir', titik: [[x, y]], benar: memenuhi });
        hasil.className = memenuhi ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad';
        hasil.textContent = memenuhi
          ? `✓ Sisi arsiran kendala ke-${slot + 1} benar.`
          : `✕ Titik (${num(x)}, ${num(y)}) tidak memenuhi pertidaksamaan itu. Substitusikan titiknya, lalu pilih sisi yang lain.`;
      }
      gambar();
    });

    const ulangi = el('button', { class: 'btn btn-tiny btn-ghost' }, '↺ Ulangi gambar');
    ulangi.addEventListener('click', () => {
      for (const { k } of tulisan) this.gambarSiswa.delete(kunci(k));
      diuji.length = 0;
      hasil.textContent = '';
      gambar();
    });

    gambar();
    return el('div', { class: 'uji-hp' }, petunjuk, grafik, barisUji, el('div', { class: 'uji-hp-baris' }, ulangi), hasil, riwayat);
  }

  /**
   * Slider hanya bisa berhenti di kelipatan `step` (mis. 0,5). Titik pojok
   * hasil hitungan (mis. 33,33) hampir tak pernah pas di kelipatan itu, dan
   * pembulatan alami browser (ke tetangga TERDEKAT, bukan ke yang layak)
   * kadang mendarat di sisi yang justru melanggar kendala - misalnya
   * (33,33 ; 16,67) dibulatkan browser ke (33,5 ; 16,5) yang sudah lewat
   * batas emisi, padahal (33 ; 17) di sebelahnya masih layak dan lebih
   * dekat ke nilai optimum sebenarnya secara kelayakan.
   *
   * Supaya tombol "Bangun" tidak diam-diam menjebak siswa yang sudah benar
   * menghitung titik pojoknya, kita cari titik berkelipatan step yang
   * masih memenuhi tulisan kendala siswa sendiri dan paling dekat ke titik
   * hasil hitungan tadi. Kalau tak ada satu pun kombinasi yang layak, baru
   * jatuh ke pembulatan biasa (perilaku lama).
   */
  private titikGridTerdekat(x: number, y: number): { x: number; y: number } {
    const t = this.ctx.task;
    const stepX = t.variables.x.step;
    const stepY = t.variables.y.step;
    const bulatkan = (v: number, step: number) => Math.round(v / step) * step;

    const kandidatX = [...new Set([Math.floor(x / stepX) * stepX, Math.ceil(x / stepX) * stepX])].map((v) =>
      Math.max(0, Math.min(t.variables.x.max, v)),
    );
    const kandidatY = [...new Set([Math.floor(y / stepY) * stepY, Math.ceil(y / stepY) * stepY])].map((v) =>
      Math.max(0, Math.min(t.variables.y.max, v)),
    );

    const kendala = this.tulisanUntukPerhitungan();
    let terbaik: { x: number; y: number } | null = null;
    let jarakTerbaik = Infinity;
    for (const cx of kandidatX) {
      for (const cy of kandidatY) {
        if (!evaluate(kendala, cx, cy).feasible) continue;
        const jarak = Math.hypot(cx - x, cy - y);
        if (jarak < jarakTerbaik) {
          jarakTerbaik = jarak;
          terbaik = { x: cx, y: cy };
        }
      }
    }

    return terbaik ?? { x: bulatkan(x, stepX), y: bulatkan(y, stepY) };
  }

  /* ================================================================ */
  /* Notifikasi                                                        */
  /* ================================================================ */

  private toast(teks: string, jenis: 'info' | 'bad' | 'good', durasi = 3200): void {
    const node = el('div', { class: `toast toast-${jenis}` }, teks);
    this.tumpukanToast.append(node);
    window.setTimeout(() => {
      node.classList.add('is-leaving');
      window.setTimeout(() => node.remove(), 260);
    }, durasi);
  }

  /* ================================================================ */
  /* Pengiriman jawaban                                                */
  /* ================================================================ */

  private async kirim(): Promise<void> {
    if (this.tahapRefleksi) return;

    const hasil = evaluate(this.constraints, this.x, this.y);
    this.cb.onAttemptSubmit(this.x, this.y, hasil.feasible);

    if (!hasil.feasible) {
      this.jumlahPenolakan++;
      this.cb.onRejectBySystem(this.x, this.y, [...hasil.violated]);
      this.kota?.shake();

      // U4: penolakan tampil sebagai sidang Dewan Kota dengan akibat di kota.
      // Kendala yang dilanggar tetap dicatat lewat onRejectBySystem di atas.
      this.tampilkanDewan(this.constraints.filter((k) => hasil.violated.has(k.id)));
      bunyikan('tolak');

      // Setelah dua penolakan, siswa diberi jalan keluar. Tanpa ini, siswa yang
      // benar-benar tidak menemukan solusi akan terjebak dan sesinya hilang -
      // padahal ketidakmampuan itu sendiri adalah data yang sah (K3 skor 0).
      if (this.jumlahPenolakan >= 2 && !document.querySelector('.tool-skip')) {
        const lanjut = el('button', { class: 'tool tool-skip' }, el('span', { class: 'tool-ico' }, '⏭'), el('span', { class: 'tool-label' }, 'Lewati'));
        lanjut.addEventListener('click', () => this.bukaRefleksi());
        this.bilahAlat.append(lanjut);
        this.toast('Kesulitan? Tombol "Lewati" muncul di bilah alat.', 'info', 5200);
      }
      return;
    }

    if (this.ctx.task.hasDistractor && !this.distractorSudahMuncul) {
      this.toast('Memeriksa kebijakan kota terbaru...', 'info', 2000);
      const ev = await this.cb.onRequestDistractor(this.x, this.y);
      if (ev) {
        this.terapkanDistractor(ev);
        return;
      }
    }

    // U4: rancangan diterima, warga pindah dan lampu kota menyala (tampilan saja).
    this.toast(KONSEKUENSI_DITERIMA, 'good', 3200);
    bunyikan('terima');
    // Kota hidup sesudah disahkan: hanya animasi, tidak ada event.
    this.kota?.rayakan();
    // Beri waktu melihat kota merayakan sebelum lembar refleksi menutupi peta.
    // Ajukan dikunci selama jeda (tahapRefleksi) agar tidak ada submit ganda.
    this.tahapRefleksi = true;
    // Tiket jalan pintas melewati jeda perayaan; refleksi tetap dibuka.
    const jeda = progresAktif()?.sudah('tiket-jalan-pintas') ? 0 : 2500;
    window.setTimeout(() => this.bukaRefleksi(), jeda);
  }

  /**
   * Sidang Dewan Kota (U4). Hanya tampilan: tidak memancarkan event.
   * Kendala tersirat tidak disebut jenisnya (prinsip 3 di draf perbaikan mekanik).
   */
  private tampilkanDewan(dilanggar: ConstraintDto[]): void {
    const baris = dilanggar.map((k) =>
      el(
        'li',
        {},
        el('span', { class: 'chg-label' }, this.disembunyikan(k) ? 'Inspeksi' : k.label),
        el('span', {}, this.disembunyikan(k) ? KONSEKUENSI_TERSIRAT : konsekuensiKendala(k.id)),
      ),
    );

    const tutup = el('button', { class: 'btn btn-primary btn-block' }, 'Revisi rancangan');
    const modal = el(
      'div',
      { class: 'alert-backdrop dewan' },
      el(
        'div',
        { class: 'plate alert-panel' },
        el('div', { class: 'alert-ticker' }, el('span', { class: 'alert-tag' }, 'DEWAN'), 'SIDANG KOTA'),
        el('h3', { class: 'alert-title' }, 'Rancangan ditolak'),
        el('p', { class: 'prose' }, 'Dewan Kota menilai rancanganmu. Akibatnya terjadi di kota:'),
        el('ul', { class: 'alert-changes dewan-akibat' }, ...baris),
        tutup,
      ),
    );
    tutup.addEventListener('click', () => modal.remove());
    this.root.querySelector('.app-shell')?.append(modal);
  }

  /** Terapkan perubahan kebijakan: kendala baru + narasi + instruksi revisi. */
  private terapkanDistractor(ev: DistractorResponse): void {
    this.distractorSudahMuncul = true;
    for (const id of ev.changedConstraintIds) this.kendalaTerbuka.add(id);
    this.constraints = ev.constraints.map((k) => ({ ...k }));
    this.objective = { ...ev.objective };
    document.querySelector('.tool-skip')?.remove();
    this.jumlahPenolakan = 0;

    const tutup = el('button', { class: 'btn btn-primary btn-block' }, 'Revisi rencana saya');

    const modal = el(
      'div',
      { class: 'alert-backdrop' },
      el(
        'div',
        { class: 'plate alert-panel' },
        el('div', { class: 'alert-ticker' }, el('span', { class: 'alert-tag' }, 'BERITA'), 'KEBIJAKAN KOTA BERUBAH'),
        el('h3', { class: 'alert-title' }, 'Situasi kota berubah'),
        el('p', { class: 'prose' }, ev.narrative),
        el('p', { class: 'hint' }, ev.instruction),
        el(
          'ul',
          { class: 'alert-changes' },
          ...ev.constraints
            .filter((k) => ev.changedConstraintIds.includes(k.id))
            .map((k) => el('li', {}, el('span', { class: 'chg-label' }, k.label), el('code', {}, k.display))),
        ),
        tutup,
      ),
    );

    tutup.addEventListener('click', () => {
      modal.remove();
      this.perbarui(true);
      this.toast('Kendala diperbarui. Sesuaikan alokasimu lalu kirim ulang.', 'info', 4600);
    });

    this.root.querySelector('.app-shell')?.append(modal);
    this.perbarui(true);
  }

  /** Buka lembar refleksi (sumber bukti K4). */
  private bukaRefleksi(): void {
    this.tahapRefleksi = true;
    const t = this.ctx.task;

    const wadahOpsi = el('div', { class: 'choice-group' });
    let opsiTerpilih: string | undefined;

    for (const o of t.reflection.closed.options) {
      const radio = el('input', { type: 'radio', name: 'reflection' });
      radio.addEventListener('change', () => {
        if (radio.checked) opsiTerpilih = o.id;
      });
      wadahOpsi.append(el('label', { class: 'choice' }, radio, el('span', {}, o.text)));
    }

    const teksTerbuka = el('textarea', {
      class: 'field textarea',
      rows: '4',
      maxLength: 2000,
      placeholder: 'Tulis jawabanmu di sini...',
      ariaLabel: 'Jawaban refleksi terbuka',
    });

    const pesan = el('p', { class: 'form-error' });
    const selesai = el('button', { class: 'btn btn-primary btn-block' }, 'Lanjut: nilai pekerjaanku');

    selesai.addEventListener('click', () => {
      if (!opsiTerpilih && teksTerbuka.value.trim().length === 0) {
        pesan.textContent = 'Jawab minimal salah satu pertanyaan refleksi.';
        return;
      }
      this.bukaPenilaianDiri(opsiTerpilih, teksTerbuka.value.trim() || undefined);
    });

    const isi = el(
      'div',
      { class: 'reflection' },
      // U10: refleksi disajikan sebagai laporan wali kota kepada Dewan.
      // Teks butir TIDAK diubah; hanya bingkainya.
      el('p', { class: 'reflect-prompt laporan-judul' }, 'Laporan wali kota kepada Dewan'),
      el('p', { class: 'reflect-prompt' }, t.reflection.closed.prompt),
      wadahOpsi,
      el('p', { class: 'reflect-prompt' }, t.reflection.openPrompt),
      teksTerbuka,
      pesan,
      selesai,
    );

    this.laci.set('refleksi', {
      id: 'refleksi',
      ikon: '✅',
      label: 'Refleksi',
      judul: '5 · Periksa kembali',
      isi,
      tombol: this.tombolKirim,
      selesai: false,
    });

    this.bukaLaci('refleksi');
    // Lembar refleksi tidak boleh ditutup dengan menyentuh latar: siswa yang
    // tidak sengaja menutupnya akan kehilangan satu-satunya sumber bukti K4.
    this.lembar.classList.add('is-locked');
  }

  /**
   * Langkah terakhir sebelum skor: siswa menilai pekerjaannya sendiri
   * (Assessment as Learning). Refleksi dikirim bersama penilaian diri dalam
   * satu submit, sehingga siswa tidak dapat melihat skor lebih dulu lalu
   * menyesuaikan penilaiannya.
   */
  private bukaPenilaianDiri(closedOptionId: string | undefined, openText: string | undefined): void {
    const isi = formPenilaianDiri(this.ctx.task, this.ctx.target ?? null, (skor) => {
      // Tiket Kotak Kejutan karena MENGIKUTI penilaian diri; isi skor tidak dibaca.
      progresAktif()?.beriTiket();
      return this.cb.onFinish({
        finalX: this.x,
        finalY: this.y,
        reflectionClosedOptionId: closedOptionId,
        reflectionOpenText: openText,
        selfAssessment: skor,
      });
    });

    this.laci.set('nilai-diri', {
      id: 'nilai-diri',
      ikon: '🪞',
      label: 'Nilai diri',
      judul: '6 · Nilai pekerjaanmu sendiri',
      isi,
      tombol: this.tombolKirim,
      selesai: false,
    });
    this.bukaLaci('nilai-diri');
    this.lembar.classList.add('is-locked');
    // Panel refleksi tadi mungkin sudah digulir ke bawah; mulai dari tahap K1.
    this.lembarIsi.scrollTop = 0;
  }

  destroy(): void {
    if (this.timerId !== null) clearInterval(this.timerId);
    if (this.moveDebounce !== null) clearTimeout(this.moveDebounce);
    this.kota?.destroy();
    this.kota = null;
  }

  private labelSdg(k: string): string {
    if (k === 'SDG11') return 'SDG 11';
    if (k === 'SDG13') return 'SDG 13';
    return 'SDG 11 & 13';
  }
}

/* ------------------------------------------------------------------ */
/* Grafik himpunan penyelesaian (SVG)                                  */
/* ------------------------------------------------------------------ */

const GRAF = { w: 340, h: 260, kiri: 34, kanan: 12, atas: 12, bawah: 30 };

/** Potong poligon dengan setengah bidang a*x + b*y (op) c (Sutherland-Hodgman). */
function potong(poli: Array<[number, number]>, k: ConstraintDto): Array<[number, number]> {
  const f = (p: [number, number]): number => {
    const v = k.a * p[0] + k.b * p[1] - k.c;
    return k.op === '>=' || k.op === '>' ? -v : v; // <= 0 berarti di dalam
  };
  const hasil: Array<[number, number]> = [];
  for (let i = 0; i < poli.length; i++) {
    const p = poli[i]!;
    const q = poli[(i + 1) % poli.length]!;
    const fp = f(p);
    const fq = f(q);
    if (fp <= 1e-9) hasil.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq);
      hasil.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return hasil;
}

interface GambarKendala {
  titik: Array<[number, number]>;
  garisBenar: boolean;
  sisi: [number, number] | null;
  sisiBenar: boolean;
}

function grafikHimpunan(
  gambarSiswa: Array<{ k: ConstraintDto; g: GambarKendala }>,
  semuaKendala: ConstraintDto[],
  selesai: boolean,
  xMax: number,
  yMax: number,
  titik: Array<{ x: number; y: number; ok: boolean }>,
  labelX: string,
  labelY: string,
): string {
  const { w, h, kiri, kanan, atas, bawah } = GRAF;
  const sx = (x: number): number => kiri + (x / xMax) * (w - kiri - kanan);
  const sy = (y: number): number => h - bawah - (y / yMax) * (h - bawah - atas);
  const kotak = (): Array<[number, number]> => [[0, 0], [xMax, 0], [xMax, yMax], [0, yMax]];
  const poli = (pts: Array<[number, number]>, isi: string, op: number, garis = 'none'): string =>
    pts.length >= 3
      ? `<polygon points="${pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ')}" fill="${isi}" fill-opacity="${op}" stroke="${garis}" stroke-width="1.5"/>`
      : '';

  const bagian: string[] = [];
  // Kisi rapat (10 x 10) sebagai kertas berpetak tempat siswa menggambar.
  for (let i = 0; i <= 10; i++) {
    const gx = sx((xMax * i) / 10);
    const gy = sy((yMax * i) / 10);
    bagian.push(`<line x1="${gx}" y1="${atas}" x2="${gx}" y2="${h - bawah}" stroke="#e3eaed"/>`);
    bagian.push(`<line x1="${kiri}" y1="${gy}" x2="${w - kanan}" y2="${gy}" stroke="#e3eaed"/>`);
    if (i % 2 === 0) {
      bagian.push(`<text x="${gx}" y="${h - bawah + 13}" font-size="10" text-anchor="middle" fill="#1d3640">${Math.round((xMax * i) / 10)}</text>`);
      bagian.push(`<text x="${kiri - 4}" y="${gy + 3}" font-size="10" text-anchor="end" fill="#1d3640">${Math.round((yMax * i) / 10)}</text>`);
    }
  }

  const warna = ['#1565c0', '#c62828', '#6a1b9a', '#ef6c00'];
  gambarSiswa.forEach(({ k, g }, i) => {
    const c = warna[i % warna.length]!;
    // Arsiran tipis pada sisi yang dipilih siswa (setelah sisinya benar).
    if (g.sisiBenar) bagian.push(poli(potong(kotak(), k), c, 0.1));
    // Garis batas hanya tampil setelah siswa menaruh dua titik yang benar.
    if (g.garisBenar) {
      const ruas = potong(potong(kotak(), k), { ...k, a: -k.a, b: -k.b, c: -k.c });
      if (ruas.length >= 2) {
        const [p, q] = [ruas[0]!, ruas[ruas.length - 1]!];
        bagian.push(`<line x1="${sx(p[0])}" y1="${sy(p[1])}" x2="${sx(q[0])}" y2="${sy(q[1])}" stroke="${c}" stroke-width="2"/>`);
      }
    }
    for (const p of g.titik) bagian.push(`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="4" fill="${c}"/>`);
  });

  // Daerah penyelesaian baru diarsir setelah semua garis dan sisi benar.
  if (selesai) {
    let hp = kotak();
    for (const k of semuaKendala) if (k.kind !== 'bounding_box') hp = potong(hp, k);
    bagian.push(poli(hp, '#4caf50', 0.4, '#2e7d32'));
  }

  bagian.push(`<line x1="${kiri}" y1="${h - bawah}" x2="${w - kanan}" y2="${h - bawah}" stroke="#1d3640" stroke-width="1.5"/>`);
  bagian.push(`<line x1="${kiri}" y1="${atas}" x2="${kiri}" y2="${h - bawah}" stroke="#1d3640" stroke-width="1.5"/>`);
  bagian.push(`<text x="${(w + kiri) / 2}" y="${h - 3}" font-size="10" text-anchor="middle" fill="#1d3640">x · ${labelX}</text>`);
  bagian.push(`<text x="10" y="${(h - bawah + atas) / 2}" font-size="10" text-anchor="middle" fill="#1d3640" transform="rotate(-90 10 ${(h - bawah + atas) / 2})">y · ${labelY}</text>`);
  for (const p of titik) {
    bagian.push(`<circle cx="${sx(Math.min(xMax, p.x))}" cy="${sy(Math.min(yMax, p.y))}" r="4" fill="${p.ok ? '#2e7d32' : '#d9534f'}" stroke="#fff" stroke-width="1"/>`);
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:420px;background:#fff;border:2px solid #1d3640;border-radius:8px" role="img" aria-label="Bidang gambar grafik pertidaksamaan">${bagian.join('')}</svg>`;
}
