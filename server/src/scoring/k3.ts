/**
 * K3 - Melaksanakan Rencana (docs/ECD_Framework.md Bagian 5.2).
 *
 * Deskriptor rubrik:
 *   0  final_position_xy berada di luar daerah penyelesaian pada submit terakhir
 *   1  Posisi akhir valid tetapi bukan pada/dekat titik optimum (> toleransi per task)
 *   2  Posisi akhir pada titik optimum yang benar, namun boundary_violation_count tinggi
 *   3  Posisi akhir tepat pada titik optimum dengan boundary_violation_count minimal,
 *      sesuai ambang batas per level
 *
 * VARIAN feasibility_only (Level 1-2):
 * Task Level 1-2 pada bank skenario tidak memiliki fungsi tujuan, sehingga
 * deskriptor 1 ("bukan pada titik optimum") tidak dapat diterapkan. Sebagai
 * gantinya skor 1 dan 2 dibedakan oleh banyaknya penolakan sistem: siswa yang
 * mencapai daerah penyelesaian setelah sangat banyak penolakan menunjukkan
 * pencarian coba-coba, bukan pelaksanaan rencana. Varian yang dipakai selalu
 * tercatat pada `criterion` agar terlihat saat audit.
 *
 * Pada Level 4, kelayakan dan optimum dihitung terhadap kendala SETELAH event
 * distraktor, karena itulah aturan yang berlaku saat siswa melakukan submit
 * terakhirnya. Perilaku merevisi setelah event dinilai terpisah pada K4.
 */

import type { TaskDefinition } from '../domain/types.js';
import type { Observables } from './observables.js';
import { THRESHOLDS } from './thresholds.js';
import type { ClaimResult, RubricScore, ScoringCriterion } from './types.js';

const DESCRIPTORS: Record<RubricScore, string> = {
  0: 'final_position_xy berada di luar daerah penyelesaian pada submit terakhir',
  1: 'Posisi akhir valid tetapi bukan pada/dekat titik optimum (di luar toleransi task)',
  2: 'Posisi akhir berada pada titik optimum yang benar, namun proses menunjukkan banyak percobaan gagal',
  3: 'Posisi akhir tepat pada titik optimum dengan proses yang efisien (boundary_violation_count sesuai ambang level)',
};

const DESCRIPTORS_FEASIBILITY_ONLY: Record<RubricScore, string> = {
  0: 'final_position_xy berada di luar daerah penyelesaian pada submit terakhir',
  1: 'Posisi akhir valid tetapi dicapai setelah sangat banyak penolakan sistem (pola coba-coba)',
  2: 'Posisi akhir valid, namun jumlah penolakan sistem melebihi ambang efisiensi level ini',
  3: 'Posisi akhir valid dengan proses yang efisien (boundary_violation_count sesuai ambang level)',
};

export function scoreK3(task: TaskDefinition, o: Observables): ClaimResult {
  const substantiveCount = task.constraints.filter(
    (k) => k.kind === 'explicit' || k.kind === 'implicit',
  ).length;
  const violationThreshold = THRESHOLDS.violationThresholdFor(substantiveCount);
  const lenientThreshold = violationThreshold * THRESHOLDS.feasibilityOnlyLenientMultiplier;

  const feasibilityOnly = task.objective.type === 'none';
  const criterion: ScoringCriterion = feasibilityOnly ? 'feasibility_only' : 'standard';

  const evidence = {
    submitCount: o.submitCount,
    finalX: o.finalPosition ? o.finalPosition.x : null,
    finalY: o.finalPosition ? o.finalPosition.y : null,
    finalPositionValid: o.finalPositionValid,
    finalZ: o.finalZ,
    optimalZ: o.optimalZ,
    optimalX: o.optimalPoint ? o.optimalPoint.x : null,
    optimalY: o.optimalPoint ? o.optimalPoint.y : null,
    relativeGap: o.relativeGap,
    optimumToleranceRatio: THRESHOLDS.optimumToleranceRatio,
    boundaryViolationCount: o.boundaryViolationCount,
    violationThreshold,
    evaluatedAfterDistractor: o.distractorFired,
  };

  const reasons: string[] = [];
  let score: RubricScore;

  if (o.finalPosition === null) {
    score = 0;
    reasons.push('Siswa tidak pernah melakukan attempt_submit, sehingga tidak ada posisi akhir yang dapat dinilai.');
  } else if (!o.finalPositionValid) {
    score = 0;
    reasons.push(
      `Posisi akhir (${o.finalPosition.x}, ${o.finalPosition.y}) berada di luar daerah penyelesaian setelah ${o.boundaryViolationCount} penolakan sistem.`,
    );
  } else if (feasibilityOnly) {
    if (o.boundaryViolationCount > lenientThreshold) {
      score = 1;
      reasons.push(
        `Posisi akhir valid, tetapi dicapai setelah ${o.boundaryViolationCount} penolakan (jauh di atas ambang ${violationThreshold}).`,
      );
    } else if (o.boundaryViolationCount > violationThreshold) {
      score = 2;
      reasons.push(
        `Posisi akhir valid dengan ${o.boundaryViolationCount} penolakan, melebihi ambang efisiensi ${violationThreshold}.`,
      );
    } else {
      score = 3;
      reasons.push(
        `Posisi akhir valid dengan hanya ${o.boundaryViolationCount} penolakan (ambang ${violationThreshold}).`,
      );
    }
    reasons.push('Task ini tidak memiliki fungsi tujuan, sehingga K3 dinilai atas kelayakan dan efisiensi proses.');
  } else {
    const gap = o.relativeGap ?? 1;
    const atOptimum = gap <= THRESHOLDS.optimumToleranceRatio;
    if (!atOptimum) {
      score = 1;
      reasons.push(
        `Posisi akhir valid tetapi nilai Z = ${fmt(o.finalZ)} berjarak ${(gap * 100).toFixed(1)}% dari optimum Z* = ${fmt(o.optimalZ)} (toleransi ${(THRESHOLDS.optimumToleranceRatio * 100).toFixed(0)}%).`,
      );
    } else if (o.boundaryViolationCount > violationThreshold) {
      score = 2;
      reasons.push(
        `Titik optimum tercapai (Z = ${fmt(o.finalZ)}), tetapi setelah ${o.boundaryViolationCount} penolakan sistem - melebihi ambang ${violationThreshold}.`,
      );
    } else {
      score = 3;
      reasons.push(
        `Titik optimum tercapai (Z = ${fmt(o.finalZ)}) dengan ${o.boundaryViolationCount} penolakan, dalam ambang ${violationThreshold}.`,
      );
    }
  }

  if (o.distractorFired) {
    reasons.push('Kelayakan dan optimum dihitung terhadap kendala SETELAH event distraktor.');
  }

  return {
    claim: 'K3',
    score,
    descriptor: feasibilityOnly ? DESCRIPTORS_FEASIBILITY_ONLY[score] : DESCRIPTORS[score],
    reasons,
    criterion,
    evidence,
  };
}

function fmt(v: number | null): string {
  if (v === null) return '-';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
