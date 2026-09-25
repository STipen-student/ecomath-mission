/**
 * SELURUH konstanta yang dapat disetel pada mesin skoring terkumpul di berkas ini.
 *
 * Alasan desain: rubrik pada docs/ECD_Framework.md menyebut ambang batas secara
 * kualitatif ("boundary_violation_count minimal, sesuai ambang batas per level",
 * "> toleransi yang ditetapkan per task") tanpa angka. Angka-angka di bawah
 * adalah operasionalisasi yang DISETUJUI PENELITI, bukan tebakan sistem, dan
 * sengaja dikumpulkan di satu tempat agar:
 *   1. dapat direvisi setelah uji coba instrumen tanpa menyentuh logika rubrik;
 *   2. dapat dikutip apa adanya pada BAB III skripsi sebagai definisi operasional;
 *   3. setiap perubahan langsung tertangkap oleh unit test di server/tests/.
 *
 * Setiap perubahan angka di sini WAJIB diikuti pencatatan versi pada
 * SCORING_VERSION agar skor lama dan skor baru tidak tercampur saat analisis.
 */

/**
 * Versi rubrik. Disimpan bersama tiap baris Score.
 * Naikkan setiap kali ambang batas atau logika rubrik berubah.
 */
export const SCORING_VERSION = '1.0.0';

export const THRESHOLDS = {
  /**
   * K3 - toleransi jarak dari nilai optimum.
   *
   * Gap dihitung relatif terhadap RENTANG nilai Z antar titik pojok
   * (lihat domain/optimum.ts: relativeGap), bukan terhadap |Z*|, supaya
   * makna "5%" setara di soal maksimasi skor maupun minimisasi biaya.
   * Nilai <= 0,05 dianggap "berada pada titik optimum".
   */
  optimumToleranceRatio: 0.05,

  /**
   * K3 - ambang boundary_violation_count.
   *
   * Ditetapkan sama dengan jumlah kendala substantif task, sehingga ambang
   * menyesuaikan kompleksitas secara otomatis: Level 1 = 2, Level 2 = 2-3,
   * Level 3 = 2-3, Level 4 = 3. Rasionalnya, satu penolakan per kendala masih
   * wajar sebagai proses eksplorasi batas daerah penyelesaian; lebih dari itu
   * menandakan pencarian coba-coba, bukan penerapan rencana.
   */
  violationThresholdFor(substantiveConstraintCount: number): number {
    return substantiveConstraintCount;
  },

  /**
   * K3 varian tanpa fungsi tujuan (Level 1-2).
   *
   * Deskriptor "posisi akhir valid tetapi bukan pada titik optimum" tidak dapat
   * diterapkan karena task ini memang tidak memiliki fungsi tujuan. Sebagai
   * gantinya skor 1 vs 2 dibedakan oleh banyaknya penolakan sistem: lebih dari
   * (ambang x pengali ini) penolakan menandakan siswa menemukan daerah
   * penyelesaian secara kebetulan, bukan dengan menerapkan rencana.
   */
  feasibilityOnlyLenientMultiplier: 2,

  /**
   * K4 - panjang minimum jawaban terbuka.
   * Jawaban lebih pendek dari ini diperlakukan sebagai "tidak dijawab / asal isi"
   * sesuai deskriptor skor 0.
   */
  minOpenTextChars: 12,
  minOpenTextWords: 3,

  /**
   * Pemicu cadangan event distraktor Level 4.
   *
   * Dokumen menetapkan event muncul setelah siswa submit solusi awal yang valid.
   * Tanpa cadangan, siswa yang tidak pernah mencapai solusi valid tidak akan
   * pernah menghasilkan bukti K4 sama sekali. Setelah ambang ini terlampaui,
   * sistem memunculkan event apa pun status solusinya, dan pemicunya dicatat
   * sebagai 'time_fallback' pada log agar dapat dipisahkan saat analisis.
   */
  distractorFallbackMs: 12 * 60 * 1000,

  /**
   * Toleransi numerik saat membandingkan pertidaksamaan susunan siswa dengan
   * kunci. Cukup longgar untuk menyerap pembulatan desimal pada koefisien
   * seperti 0,04 dan 0,25, cukup ketat untuk tidak menyamakan 2y dengan 3y.
   */
  constraintMatchTolerance: 1e-6,
} as const;

/**
 * Bobot komposit per level (keputusan peneliti).
 *
 * Dokumen menyatakan K4 "dibobot lebih besar pada Level 4" dan "bobotnya lebih
 * kecil terhadap skor komposit dibanding Level 4" pada Level 1-3, tetapi tidak
 * menyebut angka. Bobot berikut mengikuti kolom "Fokus bukti" pada Aturan
 * Kombinasi Bagian 4.2: Level 1 fokus K1; Level 2 fokus K1-K2; Level 3 fokus
 * K2-K3; Level 4 fokus K3-K4 dengan K4 terbesar.
 *
 * Jumlah bobot tiap level tepat 1,0 (diverifikasi unit test), sehingga komposit
 * berbobot berada pada rentang 0-3 dan sebanding antar level.
 */
export const COMPOSITE_WEIGHTS: Record<number, { K1: number; K2: number; K3: number; K4: number }> = {
  1: { K1: 0.4, K2: 0.25, K3: 0.25, K4: 0.1 },
  2: { K1: 0.3, K2: 0.3, K3: 0.25, K4: 0.15 },
  3: { K1: 0.2, K2: 0.3, K3: 0.3, K4: 0.2 },
  4: { K1: 0.15, K2: 0.2, K3: 0.25, K4: 0.4 },
};

/**
 * Penanda leksikal untuk heuristik penilaian jawaban terbuka K4.
 *
 * PERINGATAN VALIDITAS: penskoran otomatis teks terbuka dipilih peneliti secara
 * sadar demi kepraktisan pengambilan data. Heuristik ini mendeteksi PENANDA
 * BAHASA, bukan kebenaran penalaran - siswa yang menulis kalimat hafalan dapat
 * memperoleh skor tinggi. Teks mentah siswa selalu tersimpan utuh pada tabel
 * EventLog, dan kolom Score.k4ManualOverride tersedia bila skor K4 perlu
 * dikoreksi manual oleh rater kedua tanpa menghitung ulang klaim lain.
 */
export const K4_MARKERS = {
  /** Penanda kesadaran trade-off: ada sesuatu yang dikorbankan. */
  tradeoff: [
    'tetapi', 'tapi', 'namun', 'sedangkan', 'sementara itu',
    'berkurang', 'menurun', 'turun', 'menyusut', 'mengecil',
    'dikorbankan', 'mengorbankan', 'korbankan',
    'konsekuensi', 'akibatnya', 'imbasnya', 'dampaknya',
    'sebagai gantinya', 'gantinya', 'ditukar', 'menukar',
    'trade-off', 'tradeoff', 'timbal balik',
    'harus mengurangi', 'terpaksa mengurangi', 'lebih sedikit',
    'tidak bisa maksimal', 'tidak dapat maksimal', 'tidak maksimal',
  ],
  /** Penanda justifikasi: siswa memberi alasan, bukan sekadar menyatakan. */
  justification: [
    'karena', 'sebab', 'supaya', 'agar', 'sehingga',
    'alasannya', 'alasan saya', 'menurut saya', 'sebabnya',
    'oleh karena itu', 'dengan demikian', 'jadi',
  ],
  /** Frasa yang menandakan siswa tidak menjawab secara substantif. */
  nonAnswer: [
    'tidak tahu', 'gak tau', 'ga tau', 'nggak tau', 'tidak tau',
    'entah', 'bingung', 'lupa', 'tidak paham', 'ga paham',
    'terserah', 'bebas', 'asal', '-', '...',
  ],
} as const;
