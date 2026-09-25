/**
 * Perhitungan skor efektif setelah memperhitungkan koreksi manual K4.
 *
 * Bila peneliti mengoreksi K4 lewat endpoint admin, jumlah mentah dan komposit
 * berbobot HARUS ikut dihitung ulang - bila tidak, tabel rekap akan memuat
 * K4 hasil koreksi berdampingan dengan komposit lama yang masih memakai skor
 * otomatis, dan ketidakkonsistenan itu akan terbawa ke analisis statistik.
 */

import { weightedComposite } from '../scoring/index.js';

export interface ScoreRecordLike {
  level: number;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k4ManualOverride: number | null;
}

export interface EffectiveScore {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  rawSum: number;
  weightedComposite: number;
  overridden: boolean;
}

export function effectiveScore(s: ScoreRecordLike): EffectiveScore {
  const k4 = s.k4ManualOverride ?? s.k4;
  const scores = { K1: s.k1, K2: s.k2, K3: s.k3, K4: k4 };
  return {
    k1: s.k1,
    k2: s.k2,
    k3: s.k3,
    k4,
    rawSum: s.k1 + s.k2 + s.k3 + k4,
    weightedComposite: weightedComposite(s.level, scores),
    overridden: s.k4ManualOverride !== null,
  };
}
