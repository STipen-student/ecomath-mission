/**
 * Tipe hasil penskoran.
 *
 * Setiap klaim tidak hanya mengembalikan angka, tetapi juga JEJAK AUDIT:
 * deskriptor rubrik mana yang cocok, observable apa yang membuatnya cocok, dan
 * varian aturan apa yang dipakai. Jejak ini disimpan bersama skor sehingga
 * setiap angka pada data penelitian dapat ditelusuri kembali ke perilaku siswa -
 * syarat agar mesin skoring dapat dipertanggungjawabkan sebagai instrumen, bukan
 * diperlakukan sebagai kotak hitam.
 */

import type { ClaimKey } from '../domain/types.js';

export type RubricScore = 0 | 1 | 2 | 3;

/**
 * Varian aturan yang dipakai saat menilai sebuah klaim.
 * Dicatat karena beberapa deskriptor rubrik tidak berlaku pada semua task.
 */
export type ScoringCriterion =
  | 'standard'
  | 'feasibility_only'       // K3 pada task tanpa fungsi tujuan (Level 1-2)
  | 'reflection_only'        // K4 pada task tanpa event distraktor (Level 1-3)
  | 'distractor_not_fired';  // K4 Level 4 saat event tidak sempat muncul

export interface ClaimResult {
  claim: ClaimKey;
  score: RubricScore;
  /** Kutipan deskriptor rubrik yang dipenuhi. */
  descriptor: string;
  /** Alasan teknis dalam bahasa manusia - satu baris per bukti. */
  reasons: string[];
  criterion: ScoringCriterion;
  /** Observable yang menentukan skor ini, untuk audit dan ekspor. */
  evidence: Record<string, number | string | boolean | null>;
}

export interface AttemptScore {
  taskId: string;
  level: number;
  K1: RubricScore;
  K2: RubricScore;
  K3: RubricScore;
  K4: RubricScore;
  /** Jumlah mentah K1+K2+K3+K4, rentang 0-12. */
  rawSum: number;
  /** Komposit berbobot per level, rentang 0-3. */
  weightedComposite: number;
  claims: ClaimResult[];
  scoringVersion: string;
  /**
   * True bila skor K4 berasal dari heuristik teks terbuka dan layak ditinjau
   * rater kedua. Tidak mengubah skor - hanya penanda untuk kendali mutu.
   */
  k4HeuristicUsed: boolean;
}
