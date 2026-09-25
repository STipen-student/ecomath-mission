/**
 * K1 - Memahami Masalah (docs/ECD_Framework.md Bagian 5.2).
 *
 * Deskriptor rubrik:
 *   0  identify_variable tidak muncul ATAU variabel yang ditetapkan tidak sesuai konteks
 *   1  Variabel diidentifikasi namun write_constraint pertama menunjukkan miskonsepsi
 *      besaran (mis. salah tanda pertidaksamaan yang mengubah arah kendala)
 *   2  Variabel dan minimal satu kendala utama diterjemahkan benar, namun ada
 *      kekeliruan kecil (mis. lupa satuan/skala) yang terdeteksi dari revisi berikutnya
 *   3  Seluruh variabel dan kendala pada narasi diterjemahkan tepat pada percobaan
 *      pertama tanpa revisi struktural
 */

import type { TaskDefinition } from '../domain/types.js';
import type { Observables } from './observables.js';
import type { ClaimResult, RubricScore } from './types.js';

const DESCRIPTORS: Record<RubricScore, string> = {
  0: 'identify_variable tidak muncul atau variabel yang ditetapkan tidak sesuai konteks',
  1: 'Variabel diidentifikasi namun write_constraint pertama menunjukkan miskonsepsi besaran',
  2: 'Variabel dan minimal satu kendala utama diterjemahkan benar, namun ada kekeliruan kecil yang terdeteksi dari revisi berikutnya',
  3: 'Seluruh variabel dan kendala pada narasi diterjemahkan tepat pada percobaan pertama tanpa revisi struktural',
};

/** Miskonsepsi yang tergolong "besar" sehingga menahan skor di angka 1. */
const MAJOR_MISCONCEPTIONS = new Set(['sign_flip', 'swap_vars', 'structural']);

export function scoreK1(task: TaskDefinition, o: Observables): ClaimResult {
  const reasons: string[] = [];
  let score: RubricScore;

  const evidence = {
    identifyVariableCount: o.identifyVariableCount,
    variablesCorrect: o.variablesCorrect,
    firstConstraintMisconception: o.firstConstraintMisconception,
    constraintCountWritten: o.constraintCountWritten,
    constraintCountCorrect: o.constraintCountCorrect,
    expectedConstraintCount: task.expectedConstraintCount,
    structuralRevisionCount: o.structuralRevisionCount,
    minorRevisionCount: o.minorRevisionCount,
    allConstraintsCorrectFirstTry: o.allConstraintsCorrectFirstTry,
  };

  if (o.identifyVariableCount === 0) {
    score = 0;
    reasons.push('Tidak ada event identify_variable sama sekali.');
  } else if (!o.variablesCorrect) {
    score = 0;
    reasons.push('Variabel ditetapkan tetapi tidak sesuai konteks narasi (peran x/y keliru).');
  } else if (o.constraintCountWritten === 0) {
    // Tidak tercakup deskriptor mana pun secara harfiah: variabel benar tetapi
    // siswa tidak pernah menerjemahkan narasi menjadi pertidaksamaan. Ditempatkan
    // di skor 1 karena bukti penerjemahan - inti klaim K1 - tidak pernah muncul.
    score = 1;
    reasons.push('Variabel benar, tetapi siswa tidak pernah menyusun satu pun pertidaksamaan.');
  } else if (MAJOR_MISCONCEPTIONS.has(o.firstConstraintMisconception)) {
    score = 1;
    const label =
      o.firstConstraintMisconception === 'sign_flip'
        ? 'arah pertidaksamaan terbalik'
        : o.firstConstraintMisconception === 'swap_vars'
          ? 'peran variabel x dan y tertukar'
          : 'pertidaksamaan tidak menyerupai kendala mana pun pada narasi';
    reasons.push(`write_constraint pertama menunjukkan miskonsepsi besar: ${label}.`);
  } else if (o.allConstraintsCorrectFirstTry && o.constraintCountCorrect >= task.expectedConstraintCount) {
    score = 3;
    reasons.push(
      `Seluruh ${task.expectedConstraintCount} kendala tepat pada percobaan pertama, tanpa revisi struktural.`,
    );
  } else if (o.constraintCountCorrect >= 1) {
    score = 2;
    reasons.push(`${o.constraintCountCorrect} dari ${task.expectedConstraintCount} kendala diterjemahkan benar.`);
    if (o.firstConstraintMisconception === 'unit_scale') {
      reasons.push('Kendala pertama benar arahnya tetapi keliru pada skala/konstanta.');
    }
    if (o.structuralRevisionCount > 0) {
      reasons.push(`Terdapat ${o.structuralRevisionCount} revisi struktural pada kendala yang sudah disusun.`);
    }
    if (o.minorRevisionCount > 0) {
      reasons.push(`Terdapat ${o.minorRevisionCount} revisi konstanta (indikasi kekeliruan satuan/skala).`);
    }
  } else {
    score = 1;
    reasons.push('Tidak ada satu pun kendala yang diterjemahkan dengan benar.');
  }

  return { claim: 'K1', score, descriptor: DESCRIPTORS[score], reasons, criterion: 'standard', evidence };
}
