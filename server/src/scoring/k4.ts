/**
 * K4 - Memeriksa Kembali (docs/ECD_Framework.md Bagian 5.2).
 *
 * Deskriptor rubrik:
 *   0  Tidak ada revise_after_event meskipun terjadi event distraktor (khusus Level 4);
 *      reflection_response tidak dijawab atau asal pilih
 *   1  Ada upaya revisi setelah event distraktor tetapi solusi baru tetap melanggar kendala baru
 *   2  Revisi berhasil memenuhi kendala baru, tetapi reflection_response menunjukkan
 *      pemahaman trade-off yang tidak lengkap
 *   3  Revisi berhasil dan reflection_response secara eksplisit mengidentifikasi trade-off
 *      antar-kendala/SDG serta memberi justifikasi kewajaran solusi akhir
 *
 * VARIAN reflection_only (Level 1-3):
 * Dokumen menyatakan pada level tanpa event distraktor wajib, K4 tetap diukur
 * lewat pertanyaan reflektif singkat di akhir task, dengan bobot lebih kecil
 * terhadap komposit (lihat scoring/composite.ts).
 *
 * PERINGATAN VALIDITAS - penskoran otomatis jawaban terbuka:
 * Sesuai keputusan peneliti, jawaban terbuka diskor otomatis dengan heuristik
 * penanda leksikal. Heuristik ini mendeteksi PENANDA BAHASA (penyebutan istilah
 * domain, penanda trade-off, penanda justifikasi), BUKAN kebenaran penalaran.
 * Konsekuensinya: kalimat hafalan yang mengandung penanda tepat dapat memperoleh
 * skor tinggi, dan penalaran benar yang ditulis tanpa penanda dapat memperoleh
 * skor rendah. Teks mentah selalu tersimpan pada EventLog dan kolom
 * Score.k4ManualOverride tersedia untuk koreksi rater kedua.
 */

import type { TaskDefinition } from '../domain/types.js';
import type { Observables } from './observables.js';
import { K4_MARKERS, THRESHOLDS } from './thresholds.js';
import type { ClaimResult, RubricScore, ScoringCriterion } from './types.js';

const DESCRIPTORS: Record<RubricScore, string> = {
  0: 'Tidak ada revise_after_event meskipun terjadi event distraktor; atau reflection_response tidak dijawab / asal pilih',
  1: 'Ada upaya revisi setelah event distraktor tetapi solusi baru tetap melanggar kendala baru',
  2: 'Revisi berhasil memenuhi kendala baru, tetapi reflection_response menunjukkan pemahaman trade-off yang tidak lengkap',
  3: 'Revisi berhasil dan reflection_response secara eksplisit mengidentifikasi trade-off antar-kendala/SDG serta memberi justifikasi',
};

const DESCRIPTORS_REFLECTION_ONLY: Record<RubricScore, string> = {
  0: 'reflection_response tidak dijawab atau asal pilih',
  1: 'Refleksi menyebut konteks masalah tetapi tidak mengenali adanya trade-off',
  2: 'Refleksi mengenali trade-off antar-kendala namun belum disertai justifikasi',
  3: 'Refleksi mengidentifikasi trade-off secara eksplisit dan memberi justifikasi kewajaran solusi',
};

/** Hasil analisis heuristik satu jawaban terbuka. */
export interface OpenTextAnalysis {
  score: RubricScore;
  charCount: number;
  wordCount: number;
  mentionsDomainTerm: boolean;
  hasTradeoffMarker: boolean;
  hasJustificationMarker: boolean;
  hasQuantitativeReference: boolean;
  isNonAnswer: boolean;
  matchedTerms: string[];
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Skor heuristik 0-3 untuk jawaban terbuka.
 *
 *   0  terlalu pendek, atau frasa non-jawaban ("tidak tahu", "bingung"),
 *      atau tidak menyebut istilah domain sekaligus tidak ada penanda trade-off
 *   1  menyebut istilah domain, tetapi tidak ada penanda trade-off
 *   2  menyebut istilah domain DAN ada penanda trade-off
 *   3  poin 2, ditambah penanda justifikasi ATAU rujukan kuantitatif (angka)
 */
export function analyzeOpenText(text: string | null, expectedTerms: string[]): OpenTextAnalysis {
  const empty: OpenTextAnalysis = {
    score: 0,
    charCount: 0,
    wordCount: 0,
    mentionsDomainTerm: false,
    hasTradeoffMarker: false,
    hasJustificationMarker: false,
    hasQuantitativeReference: false,
    isNonAnswer: true,
    matchedTerms: [],
  };
  if (!text) return empty;

  const t = normalize(text);
  const charCount = t.length;
  const wordCount = t.split(' ').filter(Boolean).length;

  const isNonAnswer =
    K4_MARKERS.nonAnswer.some((m) => t === m || t.startsWith(`${m} `) || t === `${m}.`) ||
    charCount < THRESHOLDS.minOpenTextChars ||
    wordCount < THRESHOLDS.minOpenTextWords;

  const matchedTerms = expectedTerms.filter((term) => t.includes(normalize(term)));
  const mentionsDomainTerm = matchedTerms.length > 0;
  const hasTradeoffMarker = K4_MARKERS.tradeoff.some((m) => t.includes(m));
  const hasJustificationMarker = K4_MARKERS.justification.some((m) => t.includes(m));
  const hasQuantitativeReference = /\d/.test(t);

  let score: RubricScore = 0;
  if (isNonAnswer) {
    score = 0;
  } else if (!mentionsDomainTerm && !hasTradeoffMarker) {
    score = 0;
  } else if (!hasTradeoffMarker) {
    score = 1;
  } else if (!mentionsDomainTerm) {
    score = 1;
  } else if (hasJustificationMarker || hasQuantitativeReference) {
    score = 3;
  } else {
    score = 2;
  }

  return {
    score,
    charCount,
    wordCount,
    mentionsDomainTerm,
    hasTradeoffMarker,
    hasJustificationMarker,
    hasQuantitativeReference,
    isNonAnswer,
    matchedTerms,
  };
}

/**
 * Gabungkan kualitas jawaban tertutup dan terbuka.
 *
 * Memakai PEMBULATAN KE BAWAH dari rata-rata, bukan nilai maksimum, supaya
 * skor 3 hanya tercapai bila KEDUA bentuk jawaban sama-sama menunjukkan
 * trade-off yang lengkap. Ini membatasi peluang siswa memperoleh skor tertinggi
 * hanya karena menebak opsi tertutup yang tepat.
 */
export function combineReflectionQuality(
  closed: 0 | 1 | 2 | 3 | null,
  open: RubricScore | null,
): RubricScore {
  if (closed === null && open === null) return 0;
  if (closed === null) return open!;
  if (open === null) return closed;
  return Math.floor((closed + open) / 2) as RubricScore;
}

export function scoreK4(task: TaskDefinition, o: Observables): ClaimResult {
  const openAnalysis = analyzeOpenText(o.reflectionOpenText, task.reflection.expectedTerms);
  const openScore = o.reflectionOpenText === null ? null : openAnalysis.score;
  const reflectionQuality = combineReflectionQuality(o.reflectionClosedQuality, openScore);

  const hasDistractorInTask = task.distractor !== null;
  const criterion: ScoringCriterion = !hasDistractorInTask
    ? 'reflection_only'
    : o.distractorFired
      ? 'standard'
      : 'distractor_not_fired';

  const evidence = {
    taskHasDistractor: hasDistractorInTask,
    distractorFired: o.distractorFired,
    reviseAfterEventCount: o.reviseAfterEventCount,
    postEventValid: o.postEventValid,
    postSolutionEditCount: o.postSolutionEditCount,
    reflectionAnswered: o.reflectionAnswered,
    reflectionClosedQuality: o.reflectionClosedQuality,
    openTextScore: openScore,
    openTextWordCount: openAnalysis.wordCount,
    openMentionsDomainTerm: openAnalysis.mentionsDomainTerm,
    openHasTradeoffMarker: openAnalysis.hasTradeoffMarker,
    openHasJustificationMarker: openAnalysis.hasJustificationMarker,
    openHasQuantitativeReference: openAnalysis.hasQuantitativeReference,
    openMatchedTerms: openAnalysis.matchedTerms.join('; '),
    reflectionQuality,
  };

  const reasons: string[] = [];
  let score: RubricScore;

  if (criterion === 'standard') {
    const attemptedRevision = o.reviseAfterEventCount > 0 || o.postSolutionEditCount > 0;
    if (!attemptedRevision) {
      score = 0;
      reasons.push('Event distraktor muncul tetapi siswa tidak melakukan revisi apa pun sesudahnya.');
    } else if (!o.postEventValid) {
      score = 1;
      reasons.push('Ada upaya revisi setelah event, tetapi solusi barunya tetap melanggar kendala yang direvisi.');
    } else if (reflectionQuality === 0) {
      score = 0;
      reasons.push('Revisi berhasil, tetapi reflection_response tidak dijawab atau menunjukkan jawaban asal.');
    } else if (reflectionQuality === 3) {
      score = 3;
      reasons.push('Revisi berhasil memenuhi kendala baru dan refleksi mengidentifikasi trade-off disertai justifikasi.');
    } else {
      score = 2;
      reasons.push(`Revisi berhasil memenuhi kendala baru, tetapi kualitas refleksi baru mencapai tingkat ${reflectionQuality} dari 3.`);
    }
  } else {
    // reflection_only (Level 1-3) dan distractor_not_fired (Level 4 tanpa event terpicu)
    score = reflectionQuality;
    if (criterion === 'distractor_not_fired') {
      reasons.push('Event distraktor tidak sempat muncul pada sesi ini; K4 dinilai dari refleksi saja.');
    } else {
      reasons.push('Task ini tidak memiliki event distraktor; K4 dinilai dari respons reflektif akhir.');
    }
    if (!o.reflectionAnswered) reasons.push('Tidak ada reflection_response sama sekali.');
  }

  if (o.reflectionClosedQuality !== null) {
    reasons.push(`Opsi refleksi tertutup yang dipilih bernilai kualitas ${o.reflectionClosedQuality}/3.`);
  }
  if (openScore !== null) {
    reasons.push(
      `Heuristik jawaban terbuka: ${openScore}/3 (istilah domain: ${openAnalysis.mentionsDomainTerm ? 'ya' : 'tidak'}, penanda trade-off: ${openAnalysis.hasTradeoffMarker ? 'ya' : 'tidak'}, justifikasi: ${openAnalysis.hasJustificationMarker ? 'ya' : 'tidak'}).`,
    );
  }

  return {
    claim: 'K4',
    score,
    descriptor: criterion === 'standard' ? DESCRIPTORS[score] : DESCRIPTORS_REFLECTION_ONLY[score],
    reasons,
    criterion,
    evidence,
  };
}
