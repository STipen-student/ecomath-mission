/**
 * Activity Selection Process — pemilihan varian task responsif kemampuan.
 *
 * Rujukan: docs/ECD_Framework.md Bagian 4.2, yang mengizinkan sistem memilih
 * task "secara acak berstrata ATAU ADAPTIF ... sehingga tiap siswa dapat
 * memperoleh permukaan soal berbeda TANPA MENGUBAH TINGKAT KESULITAN
 * KONSTRUKNYA". Anak kalimat terakhir itu adalah seluruh batasan modul ini.
 *
 * ────────────────────────────────────────────────────────────────────────
 * APA YANG BOLEH DIADAPTASI, DAN APA YANG TIDAK
 * ────────────────────────────────────────────────────────────────────────
 *
 * BOLEH (permukaan)  : varian mana dalam SATU level yang disajikan — jumlah
 *                      kendala 2 vs 3, bilangan bulat vs desimal, konteks SDG.
 *
 * TIDAK BOLEH        : (a) melewati/mengulang level. Keempat level tetap wajib
 *                          bagi semua siswa. Bila siswa lemah dirutekan agar
 *                          tidak sampai Level 4, ia tak pernah menghadapi event
 *                          distraktor — satu-satunya pemicu bukti K4 — sehingga
 *                          K4-nya menjadi TIDAK TERUKUR, bukan nol. Melaporkan
 *                          0 untuk klaim tanpa bukti adalah pelanggaran ECD yang
 *                          sesungguhnya.
 *                      (b) memberi petunjuk / mengungkap kendala tersirat /
 *                          mengurangi jumlah kendala yang wajib ditulis. Semua
 *                          itu mengubah BUKTI yang tersedia, sehingga skor K1=3
 *                          milik dua siswa tidak lagi bermakna sama.
 *
 * Modul ini karena itu hanya pernah memilih DI ANTARA varian yang assembly rule
 * level tersebut sudah nyatakan setara konstruknya.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PERINGATAN VALIDITAS — WAJIB DIBACA SEBELUM DIPAKAI AMBIL DATA
 * ────────────────────────────────────────────────────────────────────────
 *
 * Beban permukaan di bawah adalah PERINGKAT RASIONAL dari fitur task (Bagian
 * 4.1), BUKAN kesulitan butir hasil kalibrasi empiris. Selama butir belum
 * dikalibrasi (Rasch/IRT atas data uji coba), skor mentah antar siswa yang
 * menerima varian berbeda TIDAK sepenuhnya sebanding.
 *
 * Karena itu default operasionalnya: MATIKAN saat pengambilan data skripsi
 * (ADAPTIVE_MODE=false) sehingga administrasi berbentuk fixed-form dan skor
 * sebanding tanpa perlu IRT; NYALAKAN untuk demonstrasi dan pengembangan
 * lanjutan. Lihat docs/SCORING_SPEC.md §7.16.
 */

import type { ClaimKey, SdgContext, TaskDefinition } from '../domain/types.js';
import { tasksByLevel } from './index.js';

/* ------------------------------------------------------------------ */
/* Model beban permukaan                                               */
/* ------------------------------------------------------------------ */

/**
 * Tambahan beban dari jenis bilangan (task feature "Jenis bilangan", Bagian 4.1:
 * "mengontrol tingkat kesulitan komputasi TANPA MENGUBAH STRUKTUR KONSEP").
 *
 * Sengaja bernilai < 1 agar tidak pernah mengalahkan selisih satu kendala:
 * jumlah kendala adalah penentu utama kompleksitas sistem pertidaksamaan,
 * jenis bilangan hanya beban aritmetika di atasnya.
 */
const NUMBER_STYLE_LOAD = {
  simple_integer: 0,
  large_integer: 0.34,
  decimal_mixed: 0.67,
} as const;

/**
 * Beban permukaan satu task. Angka ini TIDAK pernah masuk ke penskoran —
 * ia hanya mengurutkan varian saat pemilihan.
 */
export function surfaceLoad(task: TaskDefinition): number {
  return task.expectedConstraintCount + NUMBER_STYLE_LOAD[task.numberStyle];
}

/** Pita kemampuan hasil pembacaan skor klaim terdahulu. */
export type AbilityBand = 'rendah' | 'sedang' | 'tinggi' | 'belum_ada';

/**
 * Ambang pemetaan rerata klaim (skala 0-3) ke pita.
 *
 * Dikumpulkan di sini — bukan disebar di logika — agar dapat direvisi setelah
 * uji coba instrumen dan dikutip sebagai definisi operasional, mengikuti pola
 * yang sama dengan scoring/thresholds.ts.
 */
export const ADAPTIVE_THRESHOLDS = {
  /** Rerata klaim <= nilai ini dibaca sebagai pita rendah. */
  bandRendahMax: 1.0,
  /** Rerata klaim >= nilai ini dibaca sebagai pita tinggi. */
  bandTinggiMin: 2.0,
} as const;

export function bandOf(claimMean: number | null): AbilityBand {
  if (claimMean === null) return 'belum_ada';
  if (claimMean <= ADAPTIVE_THRESHOLDS.bandRendahMax) return 'rendah';
  if (claimMean >= ADAPTIVE_THRESHOLDS.bandTinggiMin) return 'tinggi';
  return 'sedang';
}

/* ------------------------------------------------------------------ */
/* Sinyal kemampuan                                                    */
/* ------------------------------------------------------------------ */

/** Satu baris skor level yang sudah diselesaikan siswa. */
export interface PriorClaimScores {
  K1: number;
  K2: number;
  K3: number;
  K4: number;
}

/**
 * Rerata klaim yang RELEVAN bagi level yang akan disajikan.
 *
 * Bukan rerata seluruh klaim: tiap level dirancang memunculkan bukti untuk
 * klaim tertentu (kolom "Fokus bukti", Bagian 4.2). Level 3 berfokus K2-K3,
 * maka kesiapan siswa untuk Level 3 paling tepat dibaca dari K2-K3 miliknya
 * pada level-level sebelumnya — bukan dari K1 yang mungkin sudah lama kuat
 * atau K4 yang belum sempat terukur.
 *
 * `planningTimeMs` dan turunan kecepatan lain SENGAJA tidak dipakai di sini:
 * siswa yang lambat karena perangkatnya lambat akan dirutekan ke soal mudah
 * dan skornya tertekan oleh sebab yang sama sekali di luar konstruk.
 */
export function claimMeanFor(dominantClaims: ClaimKey[], priors: PriorClaimScores[]): number | null {
  if (priors.length === 0 || dominantClaims.length === 0) return null;
  const nilai = priors.flatMap((p) => dominantClaims.map((k) => p[k]));
  if (nilai.length === 0) return null;
  return nilai.reduce((a, b) => a + b, 0) / nilai.length;
}

/* ------------------------------------------------------------------ */
/* Pemilihan                                                           */
/* ------------------------------------------------------------------ */

export interface AdaptiveChoice {
  task: TaskDefinition;
  band: AbilityBand;
  claimMean: number | null;
  /** Klaim yang dibaca untuk menghasilkan `claimMean`. */
  basedOnClaims: ClaimKey[];
  /** Seluruh kandidat, terurut dari beban permukaan terendah. */
  ranked: Array<{ taskId: string; surfaceLoad: number }>;
  /**
   * True bila seluruh varian level ini berbeban permukaan SAMA, sehingga
   * adaptivitas tidak punya ruang dan pemilihan jatuh ke acak berstrata.
   * Terjadi pada Level 1 dan Level 4, yang ketiga variannya memang dirancang
   * sebagai bentuk paralel setara.
   */
  tanpaRuangAdaptif: boolean;
}

/**
 * Pilih varian level `level` yang paling sesuai pita kemampuan siswa.
 *
 * @param priors        skor klaim level-level yang sudah diselesaikan siswa
 * @param usedContexts  konteks SDG yang sudah dipakai (untuk penyeimbang)
 */
export function selectAdaptiveTask(
  level: number,
  priors: PriorClaimScores[],
  opts: { usedContexts?: SdgContext[]; rng?: () => number } = {},
): AdaptiveChoice | undefined {
  const pool = tasksByLevel(level);
  if (pool.length === 0) return undefined;

  const rng = opts.rng ?? Math.random;
  const usedContexts = opts.usedContexts ?? [];

  const dominantClaims = pool[0]!.dominantClaims;
  const claimMean = claimMeanFor(dominantClaims, priors);
  const band = bandOf(claimMean);

  const ranked = [...pool]
    .map((t) => ({ task: t, load: surfaceLoad(t) }))
    .sort((a, b) => a.load - b.load);

  const rankedView = ranked.map((r) => ({ taskId: r.task.id, surfaceLoad: r.load }));

  const bebanUnik = new Set(ranked.map((r) => r.load));
  const tanpaRuangAdaptif = bebanUnik.size === 1;

  /**
   * Kandidat yang setara-suai: bila beberapa varian berbeban sama persis
   * dengan yang dituju pita, seluruhnya menjadi kandidat dan konteks SDG
   * yang belum terpakai menjadi pemecah seri. Urutannya disengaja —
   * kesesuaian bukti lebih diutamakan daripada variasi konteks, sebab
   * konteks adalah fitur permukaan sedangkan kesesuaian menentukan
   * seberapa informatif bukti yang dihasilkan.
   */
  let target: number;
  if (band === 'rendah') target = ranked[0]!.load;
  else if (band === 'tinggi') target = ranked[ranked.length - 1]!.load;
  else if (band === 'sedang') target = ranked[Math.floor((ranked.length - 1) / 2)]!.load;
  else target = NaN; // belum_ada -> seluruh pool jadi kandidat

  let kandidat = Number.isNaN(target) ? ranked : ranked.filter((r) => r.load === target);
  if (kandidat.length === 0) kandidat = ranked;

  const belumTerpakai = kandidat.filter((r) => !usedContexts.includes(r.task.sdgContext));
  const final = belumTerpakai.length > 0 ? belumTerpakai : kandidat;

  const pilihan = final[Math.min(Math.floor(rng() * final.length), final.length - 1)]!;

  return {
    task: pilihan.task,
    band,
    claimMean,
    basedOnClaims: dominantClaims,
    ranked: rankedView,
    tanpaRuangAdaptif,
  };
}
