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
import { defaultCenters } from '../game/iso/isoGrid.js';
import { cornerCandidates, evaluate, objectiveValue } from '../game/geometry.js';
import type { ConstraintDto, DistractorResponse, TaskDto } from '../api/types.js';
import { clear, el, jam, num } from './dom.js';

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
  onRequestDistractor: (x: number, y: number) => Promise<DistractorResponse | null>;
  onFinish: (data: {
    finalX: number;
    finalY: number;
    reflectionClosedOptionId?: string;
    reflectionOpenText?: string;
  }) => Promise<void>;
}

export interface PlayContext {
  studentName: string;
  level: number;
  totalLevels: number;
  task: TaskDto;
}

const OPERATOR = [
  { nilai: '<=', label: '≤' },
  { nilai: '>=', label: '≥' },
  { nilai: '<', label: '<' },
  { nilai: '>', label: '>' },
] as const;

const LABEL_PUSAT = '\u{1f4cd} Atur pusat';
const LABEL_BATAL = '\u2715 Batal';

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
   * kelayakan submit/reject, warna peta, dan revisi setelah event distraktor -
   * seluruhnya tetap harus memakai kebenaran asli demi validitas skor.
   */
  private tulisanKendala: (TulisanKendala | null)[];

  private x = 0;
  private y = 0;
  private mulai = performance.now();
  private timerId: number | null = null;
  private moveDebounce: number | null = null;

  /**
   * Titik pusat pembangunan tiap zona.
   *
   * Menentukan DI MANA zona tumbuh, bukan BERAPA banyak - jumlahnya tetap
   * ditentukan slider. Pemisahan ini menjaga agar nilai x dan y tidak terkunci
   * pada kelipatan satu petak; lihat catatan pada game/iso/isoGrid.ts.
   */
  private pusat = defaultCenters();
  private modePilih: 'x' | 'y' | null = null;

  private distractorSudahMuncul = false;
  private jumlahPenolakan = 0;
  private tahapRefleksi = false;

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
    this.bukaLaci('misi');
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
        el('span', { class: 'lvl-badge' }, `LV${this.ctx.level}`),
        el(
          'span',
          { class: 'identity-text' },
          el('span', { class: 'identity-city' }, t.title),
          el('span', { class: 'identity-who' }, `${this.ctx.studentName} · ${this.labelSdg(t.sdgContext)}`),
        ),
      ),
      this.meterBar,
      el('div', { class: 'plate plate-clock' }, el('span', { class: 'clock-ico' }, '⏱'), this.labelWaktu),
    );
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
        LABEL_PUSAT,
      );
      tombolPusat.addEventListener('click', () => this.mulaiPilihPusat(v, tombolPusat));
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

    return el(
      'div',
      { class: 'zone-dock' },
      kartu('x', this.sliderX, this.nilaiX),
      kartu('y', this.sliderY, this.nilaiY),
      this.bacaanZ,
    );
  }

  private bangunBilahAlat(): HTMLElement {
    this.bilahAlat = el('nav', { class: 'toolbar' });
    this.tombolKirim = el('button', { class: 'tool tool-go' }, el('span', { class: 'tool-ico' }, '▶'), el('span', { class: 'tool-label' }, 'Kirim'));
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
      { id: 'variabel', ikon: '\u{1f50e}', label: 'Variabel', judul: '1 · Pahami masalah', isi: this.isiVariabel() },
      { id: 'tujuan', ikon: '\u{1f3af}', label: 'Tujuan', judul: '2 · Tentukan tujuan', isi: this.isiTujuan() },
      { id: 'kendala', ikon: '\u{1f4d0}', label: 'Kendala', judul: '3 · Susun pertidaksamaan', isi: this.isiPenyusun() },
      { id: 'pojok', ikon: '\u{1f4cd}', label: 'Titik pojok', judul: '4 · Uji titik pojok', isi: this.isiTitikPojok() },
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
      this.gambarMeter();
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
        'Titik pojok di bawah dihitung dari kendala yang SUDAH kamu tulis di panel "Kendala" - bukan dari jawaban sebenarnya. Bila hasilnya terasa aneh, periksa kembali tulisanmu, bukan titik pojoknya.',
      ),
      el(
        'p',
        { class: 'hint' },
        this.objective.type === 'none'
          ? 'Periksa titik-titik ini untuk memastikan pemahamanmu terhadap daerah penyelesaian.'
          : 'Hitung nilai Z pada tiap titik pojok untuk menemukan yang paling menguntungkan.',
      ),
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
  }

  private mulaiTimer(): void {
    this.mulai = performance.now();
    this.timerId = window.setInterval(() => {
      this.labelWaktu.textContent = jam(performance.now() - this.mulai);
    }, 1000);
  }

  /**
   * Masuk mode pilih pusat zona.
   *
   * Peta hanya dapat disentuh selama mode ini aktif. Di luar mode itu, sentuhan
   * pada peta diabaikan - setiap perubahan keadaan harus melewati kendali yang
   * tercatat sebagai event, dan sentuhan liar tidak meninggalkan bukti apa pun.
   */
  private mulaiPilihPusat(variabel: 'x' | 'y', tombol: HTMLButtonElement): void {
    if (this.modePilih === variabel) {
      this.batalPilihPusat();
      return;
    }

    this.modePilih = variabel;
    for (const [kunci, b] of Object.entries(this.tombolPusat)) {
      b?.classList.toggle('is-picking', kunci === variabel);
    }

    const label = this.ctx.task.variables[variabel].label;
    this.toast(`Ketuk peta untuk menentukan pusat ${label}.`, 'info', 5200);
    tombol.textContent = LABEL_BATAL;

    this.kota?.setPickMode((petak) => {
      this.pusat = { ...this.pusat, [variabel]: petak };
      this.cb.onSetZoneCenter(variabel, petak.col, petak.row);
      this.batalPilihPusat();
      this.perbarui(false);
      this.toast(`Pusat ${label} dipindahkan.`, 'good', 2600);
    });
  }

  private batalPilihPusat(): void {
    this.modePilih = null;
    this.kota?.setPickMode(null);
    for (const b of Object.values(this.tombolPusat)) {
      b?.classList.remove('is-picking');
      if (b) b.textContent = LABEL_PUSAT;
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

  /** Gambar ulang seluruh indikator yang bergantung pada (x, y). */
  private perbarui(gambarUlangPojok = false): void {
    const hasil = evaluate(this.constraints, this.x, this.y);
    const t = this.ctx.task;

    this.nilaiX.textContent = `${num(this.x)} ${t.variables.x.unit}`;
    this.nilaiY.textContent = `${num(this.y)} ${t.variables.y.unit}`;

    this.gambarMeter();
    this.gambarBacaanZ();

    if (gambarUlangPojok && this.panelPojok) this.gambarTitikPojok();

    this.kota?.render({
      x: this.x,
      y: this.y,
      xMax: t.variables.x.max,
      yMax: t.variables.y.max,
      feasible: hasil.feasible,
      visualX: t.variables.x.visual,
      visualY: t.variables.y.visual,
      pusat: this.pusat,
    });
  }

  /**
   * Deretan meter kendala di HUD.
   *
   * Inilah panel kendala real-time - tetapi sejak perubahan ini, meter menguji
   * KENDALA TULISAN SISWA sendiri, bukan kunci jawaban. Slot yang belum ditulis
   * tampil netral (bukan hijau atau merah) dan mengarahkan siswa membuka panel
   * "Kendala". Lihat catatan panjang pada deklarasi `tulisanKendala` di atas.
   */
  private gambarMeter(): void {
    clear(this.meterBar);

    const aktif = this.tulisanUntukPerhitungan();
    const hasil = evaluate(aktif, this.x, this.y);

    this.tulisanKendala.forEach((t, slot) => {
      if (!t) {
        const kosong = el(
          'button',
          { class: 'meter is-empty' },
          el('span', { class: 'meter-mark' }, '?'),
          el(
            'span',
            { class: 'meter-body' },
            el('span', { class: 'meter-label' }, `Kendala ke-${slot + 1}`),
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

      const meter = el(
        'button',
        { class: `meter ${rusak ? 'is-bad' : 'is-ok'}` },
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
          `Baru ${this.tulisanKendala.filter((k) => k !== null).length} dari ${this.tulisanKendala.length} kendala yang kamu tulis. Titik di bawah bisa berubah setelah kamu melengkapinya.`,
        ),
      );
    }

    if (kandidat.length === 0) {
      this.panelPojok.append(el('p', { class: 'hint' }, 'Belum ada titik pojok yang dapat dihitung.'));
      return;
    }

    for (const p of kandidat) {
      const hasilZ = el('span', { class: 'corner-z' }, '—');

      const hitung = el('button', { class: 'btn btn-tiny' }, 'Hitung');
      hitung.addEventListener('click', () => {
        const z = objectiveValue(this.objective, p.x, p.y);
        hasilZ.textContent = z === null ? 'titik layak' : `Z = ${num(z)}`;
        hasilZ.className = 'corner-z is-computed';
        this.cb.onCheckCorner(p.x, p.y, z);
        this.tandaiSelesai('pojok');
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

      const namaDilanggar = this.constraints
        .filter((k) => hasil.violated.has(k.id))
        .map((k) => (this.disembunyikan(k) ? 'kendala tersirat' : k.label))
        .join(', ');

      this.toast(`Rencana ditolak — melanggar: ${namaDilanggar}`, 'bad', 4200);

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

    this.bukaRefleksi();
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
    const selesai = el('button', { class: 'btn btn-primary btn-block' }, 'Selesaikan level ini');

    selesai.addEventListener('click', () => {
      if (!opsiTerpilih && teksTerbuka.value.trim().length === 0) {
        pesan.textContent = 'Jawab minimal salah satu pertanyaan refleksi.';
        return;
      }
      selesai.disabled = true;
      selesai.textContent = 'Menghitung skor...';
      void this.cb
        .onFinish({
          finalX: this.x,
          finalY: this.y,
          reflectionClosedOptionId: opsiTerpilih,
          reflectionOpenText: teksTerbuka.value.trim() || undefined,
        })
        .catch((err: unknown) => {
          pesan.textContent = err instanceof Error ? err.message : 'Gagal mengirim jawaban.';
          selesai.disabled = false;
          selesai.textContent = 'Selesaikan level ini';
        });
    });

    const isi = el(
      'div',
      { class: 'reflection' },
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
