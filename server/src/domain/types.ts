/**
 * Tipe domain inti Ecomath Mission.
 *
 * Seluruh skenario direpresentasikan sebagai DATA terstruktur (koefisien numerik),
 * bukan string rumus. Konsekuensinya:
 *   - server dapat menghitung daerah penyelesaian & titik optimum secara eksak;
 *   - client dapat memvalidasi konfigurasi siswa secara real-time tanpa parser;
 *   - miskonsepsi siswa (salah tanda, tukar variabel, salah skala) terdeteksi
 *     deterministik dengan membandingkan koefisien, bukan mencocokkan teks.
 *
 * Rujukan: docs/ECD_Framework.md Bagian 4 (Task Model) dan Bagian 6-9 (Bank Skenario).
 */

/** Operator pertidaksamaan yang didukung. */
export type InequalityOp = '<=' | '>=' | '<' | '>';

/** Domain nilai variabel keputusan. */
export type VariableDomain = 'continuous' | 'integer';

/** Klaim kompetensi pada Student Model (Bagian 2). */
export type ClaimKey = 'K1' | 'K2' | 'K3' | 'K4';

/** Konteks SDG sebagai task feature (Bagian 4.1). */
export type SdgContext = 'SDG11' | 'SDG13' | 'SDG11&13';

/** Jenis bilangan sebagai task feature (Bagian 4.1). */
export type NumberStyle = 'simple_integer' | 'large_integer' | 'decimal_mixed';

/** Representasi awal sebagai task feature (Bagian 4.1). */
export type Representation = 'narrative' | 'narrative_table' | 'narrative_partial_graph';

/**
 * Peran sebuah kendala dalam struktur task.
 * - explicit       : dinyatakan langsung pada narasi
 * - implicit       : harus disimpulkan siswa (wajib ada 1 pada Level 4)
 * - nonnegativity  : syarat x >= 0 / y >= 0
 * - bounding_box   : batas viewport/slider, bukan kendala matematis soal
 */
export type ConstraintKind = 'explicit' | 'implicit' | 'nonnegativity' | 'bounding_box';

/** Satu pertidaksamaan linear: a*x + b*y {op} c */
export interface Constraint {
  id: string;
  /** Label pendek untuk panel kendala, mis. "Total lahan". */
  label: string;
  a: number;
  b: number;
  op: InequalityOp;
  c: number;
  kind: ConstraintKind;
  /** Tampilan siap-baca, mis. "x + y \u2264 40 (hektar)". */
  display: string;
  /** Potongan narasi yang menjadi sumber kendala ini (membantu K1). */
  narrativeHint?: string;
}

/**
 * Fungsi tujuan. type 'none' dipakai Level 1-2 yang memang tidak memiliki
 * fungsi tujuan matematis (lihat Bagian 6-7); pada varian itu K3 dinilai
 * atas kelayakan saja - lihat scoring/k3.ts.
 */
export interface Objective {
  type: 'max' | 'min' | 'none';
  cx: number;
  cy: number;
  label: string;
  unit: string;
  display: string;
}

/**
 * Identitas visual sebuah variabel pada peta kota.
 *
 * Ditentukan dari MAKNA variabel, bukan dari sumbunya. Bila warna dikunci ke
 * sumbu (x selalu hijau, y selalu kuning), maka pada skenario yang menempatkan
 * variabel ramah lingkungan di sumbu y - lima dari dua belas task - siswa akan
 * melihat pepohonan tumbuh saat menambah mesin fosil. Visual yang menyesatkan
 * seperti itu merusak penalaran trade-off SDG yang justru ingin diukur K4.
 *
 *   nature   ruang hijau, taman, jalur sepeda   -> pepohonan hijau
 *   clean    teknologi bersih, energi terbarukan -> blok hijau terang
 *   housing  hunian, perumahan                   -> blok kuning-jingga
 *   neutral  industri, infrastruktur, fosil      -> blok kelabu
 *
 * Kedua variabel pada satu task WAJIB memakai identitas berbeda agar dapat
 * dibedakan di peta - diperiksa oleh uji pada server/tests/taskbank.test.ts.
 */
export type VariableVisual = 'nature' | 'clean' | 'housing' | 'neutral';

/** Definisi satu variabel keputusan beserta batas slider di game. */
export interface TaskVariable {
  key: 'x' | 'y';
  label: string;
  unit: string;
  /** Batas atas slider = bounding box viewport kota. */
  max: number;
  step: number;
  visual: VariableVisual;
}

/**
 * Opsi rumusan tujuan yang harus dipilih siswa SEBELUM menggeser slider.
 * Menghasilkan event select_objective -> observable K2 (Bagian 3).
 * Pada task ber-fungsi-tujuan, opsi benar = fungsi tujuan sesungguhnya;
 * pada Level 1-2, opsi benar = rumusan tujuan tugas.
 */
export interface GoalOption {
  id: string;
  text: string;
  correct: boolean;
}

/**
 * Opsi identifikasi variabel (event identify_variable) -> observable K1.
 * `assignsTo` menyatakan variabel mana yang diklaim opsi ini.
 */
export interface VariableOption {
  id: string;
  text: string;
  assignsTo: 'x' | 'y';
  correct: boolean;
}

/** Jenis miskonsepsi yang dapat dideteksi dari constraint builder (rubrik K1). */
export type MisconceptionKind =
  | 'none'
  | 'sign_flip'   // koefisien benar, arah pertidaksamaan terbalik -> K1 skor 1
  | 'swap_vars'   // peran x dan y tertukar               -> K1 skor 1
  | 'unit_scale'  // struktur benar, konstanta salah skala -> K1 skor 2
  | 'structural'; // tidak menyerupai kendala mana pun     -> K1 skor 1

/**
 * Satu perubahan kendala akibat event distraktor (Level 4).
 * Hanya ruas kanan / operator yang dapat berubah - struktur soal tetap,
 * sesuai contoh pada Bagian 9 (y >= 36 menjadi y >= 48).
 */
export interface ConstraintPatch {
  targetId: string;
  newA?: number;
  newB?: number;
  newC?: number;
  newOp?: InequalityOp;
  newDisplay?: string;
  newLabel?: string;
}

/** Event kebijakan mendadak - WAJIB pada Level 4 (Bagian 4.2). */
export interface DistractorEvent {
  id: string;
  /** Narasi yang ditampilkan ke siswa. */
  narrative: string;
  /** Perubahan pada kendala yang sudah ada. */
  constraintPatches: ConstraintPatch[];
  /** Perubahan struktur biaya / fungsi tujuan (mis. tarif karbon naik). */
  objectivePatch?: Partial<Pick<Objective, 'cx' | 'cy' | 'label' | 'display'>>;
  /** Instruksi tindak lanjut untuk siswa. */
  instruction: string;
}

/** Pertanyaan reflektif tertutup - diskor otomatis lewat bobot `quality`. */
export interface ReflectionClosed {
  prompt: string;
  options: Array<{
    id: string;
    text: string;
    /** Kualitas trade-off yang tercermin dari opsi ini (0-3). */
    quality: 0 | 1 | 2 | 3;
  }>;
}

/** Bagian refleksi sebuah task (sumber bukti K4). */
export interface ReflectionSpec {
  closed: ReflectionClosed;
  openPrompt: string;
  /**
   * Istilah domain yang, bila disebut siswa pada jawaban terbuka, menandakan
   * ia merujuk kendala/variabel konkret - bukan menjawab normatif umum.
   * Dipakai heuristik K4 pada scoring/k4.ts.
   */
  expectedTerms: string[];
}

/** Definisi lengkap satu skenario/task. */
export interface TaskDefinition {
  /** Kode task sesuai Bagian 10, mis. "L1-SDG11-A". */
  id: string;
  level: 1 | 2 | 3 | 4;
  sdgContext: SdgContext;
  title: string;
  narrative: string;
  /** Tabel data pendukung (task feature "cerita + tabel data"). */
  dataTable?: { headers: string[]; rows: string[][] };
  variables: { x: TaskVariable; y: TaskVariable };
  /** Seluruh kendala termasuk non-negativitas. */
  constraints: Constraint[];
  objective: Objective;
  domain: VariableDomain;
  numberStyle: NumberStyle;
  representation: Representation;
  distractor: DistractorEvent | null;
  reflection: ReflectionSpec;
  goalOptions: GoalOption[];
  variableOptions: VariableOption[];
  /** Jumlah kendala yang WAJIB disusun siswa (eksplisit + implisit, tanpa non-negativitas). */
  expectedConstraintCount: number;
  /**
   * Jumlah kendala menurut Tabel Spesifikasi Task (Bagian 10).
   * Disimpan terpisah dari `expectedConstraintCount` karena pada Level 1 kedua
   * angka berbeda: tabel menulis 1, narasi meminta 2. Skoring memakai
   * `expectedConstraintCount`; kolom ini hanya untuk Item-Claim Blueprint.
   */
  blueprintConstraintCount: number;
  dominantClaims: ClaimKey[];
  /** Deskripsi interaksi game sesuai bank skenario. */
  gameInteraction: string;
  /** Varian L2-SDG11&13-A ditandai sebagai anchor item penyetaraan L2<->L3 (Bagian 10). */
  isAnchorItem?: boolean;
}

/** Titik keputusan siswa pada bidang xy. */
export interface Point {
  x: number;
  y: number;
}

/** Hasil evaluasi satu titik terhadap seluruh kendala. */
export interface FeasibilityResult {
  feasible: boolean;
  /** Kendala yang dilanggar, untuk pewarnaan merah pada panel kendala. */
  violated: string[];
  /** Slack per kendala: nilai >= 0 berarti terpenuhi (setelah normalisasi ke bentuk <=). */
  slack: Record<string, number>;
}

/** Hasil pencarian titik optimum sebuah task. */
export interface OptimumResult {
  /** Titik optimum; null bila task tanpa fungsi tujuan atau daerah kosong. */
  point: Point | null;
  /** Nilai fungsi tujuan pada titik optimum. */
  z: number | null;
  /** Seluruh titik pojok daerah penyelesaian (untuk highlight di game). */
  corners: Point[];
  /** True bila daerah penyelesaian kosong (task salah konfigurasi). */
  empty: boolean;
}
