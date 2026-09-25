/**
 * Orkestrator mesin skoring.
 *
 * Fungsi `scoreAttempt` bersifat MURNI: tanpa akses database, tanpa jam sistem,
 * tanpa jaringan. Masukannya definisi task + log event, keluarannya skor beserta
 * jejak audit. Sifat ini yang membuat rubrik dapat diuji unit dengan log sintetis
 * dan menghasilkan skor yang sama persis setiap kali dijalankan ulang - syarat
 * agar data penelitian dapat direproduksi.
 */

import type { RawEvent } from '../domain/events.js';
import type { TaskDefinition } from '../domain/types.js';
import { deriveObservables, type Observables } from './observables.js';
import { scoreK1 } from './k1.js';
import { scoreK2 } from './k2.js';
import { scoreK3 } from './k3.js';
import { scoreK4 } from './k4.js';
import { COMPOSITE_WEIGHTS, SCORING_VERSION } from './thresholds.js';
import { buildOverallMessage, buildStudentFeedback, type StudentFeedback } from './feedback.js';
import type { AttemptScore, ClaimResult } from './types.js';

/** Komposit berbobot per level, rentang 0-3. */
export function weightedComposite(
  level: number,
  scores: { K1: number; K2: number; K3: number; K4: number },
): number {
  const w = COMPOSITE_WEIGHTS[level] ?? { K1: 0.25, K2: 0.25, K3: 0.25, K4: 0.25 };
  const value = scores.K1 * w.K1 + scores.K2 * w.K2 + scores.K3 * w.K3 + scores.K4 * w.K4;
  // Dibulatkan ke 4 desimal agar nilai yang tersimpan stabil lintas platform.
  return Math.round(value * 10000) / 10000;
}

export interface ScoreAttemptResult extends AttemptScore {
  observables: Observables;
  /** Umpan balik formatif dalam bahasa siswa - lihat scoring/feedback.ts. */
  studentFeedback: StudentFeedback[];
  /** Satu kalimat penutup: bagian terkuat dan yang perlu dilatih. */
  overallMessage: string;
}

/**
 * Skor satu percobaan task berdasarkan seluruh log-nya.
 *
 * @param task    definisi task yang dikerjakan siswa
 * @param events  seluruh event log percobaan tersebut (urutan bebas, akan diurutkan)
 */
export function scoreAttempt(task: TaskDefinition, events: RawEvent[]): ScoreAttemptResult {
  const observables = deriveObservables(task, events);

  const claims: ClaimResult[] = [
    scoreK1(task, observables),
    scoreK2(task, observables),
    scoreK3(task, observables),
    scoreK4(task, observables),
  ];

  const [k1, k2, k3, k4] = claims;
  const scores = { K1: k1!.score, K2: k2!.score, K3: k3!.score, K4: k4!.score };
  const rawSum = scores.K1 + scores.K2 + scores.K3 + scores.K4;

  const studentFeedback = buildStudentFeedback(task, claims, observables);

  return {
    taskId: task.id,
    level: task.level,
    ...scores,
    rawSum,
    weightedComposite: weightedComposite(task.level, scores),
    claims,
    scoringVersion: SCORING_VERSION,
    k4HeuristicUsed: observables.reflectionOpenText !== null,
    observables,
    studentFeedback,
    overallMessage: buildOverallMessage(studentFeedback),
  };
}

export { deriveObservables } from './observables.js';
export { analyzeOpenText, combineReflectionQuality } from './k4.js';
export {
  buildStudentFeedback,
  buildOverallMessage,
  buildSessionConclusion,
  JUDUL_KLAIM,
  type StudentFeedback,
  type ClaimProfile,
} from './feedback.js';
export { SCORING_VERSION, THRESHOLDS, COMPOSITE_WEIGHTS } from './thresholds.js';
export type { AttemptScore, ClaimResult, RubricScore, ScoringCriterion } from './types.js';
export type { Observables } from './observables.js';
