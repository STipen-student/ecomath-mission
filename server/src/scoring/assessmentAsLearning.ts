/**
 * Assessment as Learning (docs/SCORING_SPEC.md §7.18).
 *
 * Assessment for Learning memberi siswa umpan balik DARI sistem. Assessment as
 * Learning menjadikan siswa penilai pekerjaannya sendiri: ia menetapkan target
 * sebelum mengerjakan, menilai diri sebelum melihat skor, lalu membandingkan
 * penilaiannya dengan bukti. Kesenjangan antara keduanya - kalibrasi - adalah
 * bahan belajar metakognitif yang tidak dapat diberikan umpan balik biasa.
 *
 * Modul ini MURNI dan TIDAK mengubah skor K1-K4 sedikit pun. Penilaian diri
 * dan target hanya dibandingkan dengan skor yang sudah dihitung rubrik.
 */

import type { RubricScore } from './types.js';
import { JUDUL_KLAIM } from './feedback.js';

export type Klaim = 'K1' | 'K2' | 'K3' | 'K4';
export const KLAIM_AAL: readonly Klaim[] = ['K1', 'K2', 'K3', 'K4'];

export type SkorKlaim = Record<Klaim, number>;

/* ------------------------------------------------------------------ */
/* Kalibrasi penilaian diri                                            */
/* ------------------------------------------------------------------ */

export type StatusKalibrasi = 'tepat' | 'terlalu_tinggi' | 'terlalu_rendah';

export interface KalibrasiKlaim {
  claim: Klaim;
  title: string;
  self: number;
  actual: number;
  /** self - actual; positif = menilai diri lebih tinggi dari bukti. */
  gap: number;
  status: StatusKalibrasi;
  message: string;
}

export interface Kalibrasi {
  perClaim: KalibrasiKlaim[];
  /** Jumlah tahap yang penilaian dirinya sama persis dengan bukti (0-4). */
  exactCount: number;
  /** Rata-rata |self - actual|, 0-3. Makin kecil makin terkalibrasi. */
  meanAbsGap: number;
  /** Rata-rata (self - actual). Positif = cenderung melebihkan diri. */
  bias: number;
  summary: string;
}

function bulat(v: number): number {
  return Math.round(v * 100) / 100;
}

function pesanKalibrasi(judul: string, self: number, actual: number): { status: StatusKalibrasi; message: string } {
  const tahap = judul.toLowerCase();
  if (self === actual) {
    return {
      status: 'tepat',
      message: `Penilaianmu tepat: kamu memberi ${self}, bukti dari pekerjaanmu juga ${actual}. Kamu mengenali dengan jujur seberapa baik kamu ${tahap}.`,
    };
  }
  if (self > actual) {
    return {
      status: 'terlalu_tinggi',
      message: `Kamu menilai dirimu ${self}, bukti menunjukkan ${actual}. Ada bagian ${tahap} yang terasa sudah beres padahal belum — baca ringkasan di bawah untuk menemukannya, lalu periksa bagian itu lebih dulu di level berikutnya.`,
    };
  }
  return {
    status: 'terlalu_rendah',
    message: `Kamu menilai dirimu ${self}, padahal bukti menunjukkan ${actual}. Kamu lebih mampu ${tahap} daripada yang kamu kira — ingat langkah yang sudah benar ini dan pakai lagi.`,
  };
}

/**
 * Bandingkan penilaian diri dengan skor rubrik.
 *
 * Kalimat ringkasan menyebut ARAH kekeliruan, bukan sekadar angka: siswa yang
 * selalu melebihkan diri perlu kebiasaan memeriksa ulang, sedangkan siswa yang
 * merendahkan diri perlu tahu bahwa caranya sudah benar.
 */
export function buildCalibration(self: SkorKlaim, actual: SkorKlaim): Kalibrasi {
  const perClaim = KLAIM_AAL.map((k): KalibrasiKlaim => {
    const judul = JUDUL_KLAIM[k] ?? k;
    const { status, message } = pesanKalibrasi(judul, self[k], actual[k]);
    return { claim: k, title: judul, self: self[k], actual: actual[k], gap: self[k] - actual[k], status, message };
  });

  const exactCount = perClaim.filter((c) => c.status === 'tepat').length;
  const meanAbsGap = bulat(perClaim.reduce((n, c) => n + Math.abs(c.gap), 0) / perClaim.length);
  const bias = bulat(perClaim.reduce((n, c) => n + c.gap, 0) / perClaim.length);

  let summary: string;
  if (exactCount === 4) {
    summary = 'Keempat penilaian dirimu cocok dengan bukti. Kamu sudah bisa menilai pekerjaanmu sendiri secara akurat.';
  } else if (bias >= 0.5) {
    summary = `${exactCount} dari 4 penilaian dirimu cocok dengan bukti. Kamu cenderung menilai dirimu lebih tinggi — sebelum menekan "Kirim", biasakan mencocokkan pekerjaanmu dengan kriteria satu per satu.`;
  } else if (bias <= -0.5) {
    summary = `${exactCount} dari 4 penilaian dirimu cocok dengan bukti. Kamu cenderung meremehkan pekerjaanmu — beberapa langkahmu sebenarnya sudah memenuhi kriteria.`;
  } else {
    summary = `${exactCount} dari 4 penilaian dirimu cocok dengan bukti. Perhatikan tahap yang belum cocok di bawah — di sanalah gambaranmu tentang pekerjaanmu sendiri masih meleset.`;
  }

  return { perClaim, exactCount, meanAbsGap, bias, summary };
}

/* ------------------------------------------------------------------ */
/* Tinjauan target belajar                                             */
/* ------------------------------------------------------------------ */

export type StatusTarget = 'tercapai' | 'meningkat' | 'tetap' | 'menurun' | 'belum_tercapai';

export interface TargetBelajar {
  focusClaim: Klaim;
  targetScore: number;
  strategyId: string;
  strategyText: string;
}

export interface TinjauanTarget extends TargetBelajar {
  title: string;
  /** Skor tahap yang sama di level sebelumnya; null pada level pertama. */
  previousScore: number | null;
  currentScore: number;
  achieved: boolean;
  status: StatusTarget;
  message: string;
}

/**
 * Nilai target yang ditetapkan siswa sendiri sebelum level dimulai.
 *
 * "Tercapai" berarti skor tahap fokus mencapai target yang siswa pilih - bukan
 * target dari sistem. Bila belum tercapai, kalimatnya membedakan antara tetap
 * ada kemajuan dibanding level lalu dan benar-benar tidak bergerak, karena
 * keduanya menuntut tindak lanjut yang berbeda.
 */
export function buildGoalReview(goal: TargetBelajar, actual: SkorKlaim, previousScore: number | null): TinjauanTarget {
  const title = JUDUL_KLAIM[goal.focusClaim] ?? goal.focusClaim;
  const tahap = title.toLowerCase();
  const currentScore = actual[goal.focusClaim];
  const achieved = currentScore >= goal.targetScore;

  let status: StatusTarget;
  let message: string;

  if (achieved) {
    status = 'tercapai';
    message = `Target tercapai! Kamu menargetkan ${goal.targetScore} untuk ${tahap} dan mendapat ${currentScore}. Strategimu ("${goal.strategyText}") berhasil; pertahankan.`;
  } else if (previousScore !== null && currentScore > previousScore) {
    status = 'meningkat';
    message = `Belum mencapai target ${goal.targetScore}, tetapi ${tahap} naik dari ${previousScore} ke ${currentScore}. Strategimu mulai bekerja — lanjutkan sambil memperbaiki bagian yang masih kurang.`;
  } else if (previousScore !== null && currentScore < previousScore) {
    status = 'menurun';
    message = `${title} turun dari ${previousScore} ke ${currentScore}, di bawah targetmu ${goal.targetScore}. Tanyakan pada dirimu: apakah strategi tadi benar-benar kamu jalankan, atau soal ini menuntut cara lain?`;
  } else if (previousScore !== null) {
    status = 'tetap';
    message = `${title} tetap ${currentScore}, belum mencapai targetmu ${goal.targetScore}. Strategi "${goal.strategyText}" mungkin belum cukup — coba pilih strategi lain untuk tahap ini.`;
  } else {
    status = 'belum_tercapai';
    message = `Kamu menargetkan ${goal.targetScore} untuk ${tahap} dan mendapat ${currentScore}. Baca saran di bawah, lalu tetapkan target yang lebih tajam untuk level berikutnya.`;
  }

  return { ...goal, title, previousScore, currentScore, achieved, status, message };
}

/* ------------------------------------------------------------------ */
/* Saran tahap fokus berikutnya                                         */
/* ------------------------------------------------------------------ */

/**
 * Tahap yang disarankan menjadi fokus level berikutnya: skor terendah, dengan
 * kalibrasi terburuk sebagai pemecah seri. Hanya SARAN - siswa tetap memilih
 * sendiri targetnya, karena memilih adalah inti Assessment as Learning.
 */
export function suggestNextFocus(actual: SkorKlaim, kalibrasi: Kalibrasi | null): Klaim {
  const gap = (k: Klaim): number => Math.abs(kalibrasi?.perClaim.find((c) => c.claim === k)?.gap ?? 0);
  return [...KLAIM_AAL].sort((a, b) => actual[a] - actual[b] || gap(b) - gap(a))[0]!;
}

/* ------------------------------------------------------------------ */
/* Paket hasil per level                                                */
/* ------------------------------------------------------------------ */

export interface HasilAsesmenSebagaiBelajar {
  /** Null bila siswa tidak mengisi penilaian diri (mis. klien versi lama). */
  calibration: Kalibrasi | null;
  /** Null bila siswa tidak menetapkan target sebelum level ini. */
  goalReview: TinjauanTarget | null;
  suggestedNextFocus: Klaim;
}

export function buildAssessmentAsLearning(input: {
  actual: Record<Klaim, RubricScore | number>;
  self: SkorKlaim | null;
  goal: TargetBelajar | null;
  previousScores: SkorKlaim | null;
}): HasilAsesmenSebagaiBelajar {
  const actual: SkorKlaim = { K1: input.actual.K1, K2: input.actual.K2, K3: input.actual.K3, K4: input.actual.K4 };
  const calibration = input.self ? buildCalibration(input.self, actual) : null;
  const goalReview = input.goal
    ? buildGoalReview(input.goal, actual, input.previousScores ? input.previousScores[input.goal.focusClaim] : null)
    : null;
  return { calibration, goalReview, suggestedNextFocus: suggestNextFocus(actual, calibration) };
}

/* ------------------------------------------------------------------ */
/* Pembacaan payload dari log                                           */
/* ------------------------------------------------------------------ */

function klaimSah(v: unknown): v is Klaim {
  return v === 'K1' || v === 'K2' || v === 'K3' || v === 'K4';
}

function skorSah(v: unknown, min = 0): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= 3 ? n : null;
}

/** Baca payload goal_set; null bila bentuknya tidak sah. */
export function parseGoal(p: Record<string, unknown>): TargetBelajar | null {
  const target = skorSah(p.targetScore, 1);
  if (!klaimSah(p.focusClaim) || target === null) return null;
  return {
    focusClaim: p.focusClaim,
    targetScore: target,
    strategyId: typeof p.strategyId === 'string' ? p.strategyId : '',
    strategyText: typeof p.strategyText === 'string' ? p.strategyText : '',
  };
}

/** Baca payload self_assessment; null bila ada tahap yang tidak dinilai. */
export function parseSelfAssessment(p: Record<string, unknown>): SkorKlaim | null {
  const nilai = KLAIM_AAL.map((k) => skorSah(p[k]));
  if (nilai.some((v) => v === null)) return null;
  const [K1, K2, K3, K4] = nilai as number[];
  return { K1: K1!, K2: K2!, K3: K3!, K4: K4! };
}
