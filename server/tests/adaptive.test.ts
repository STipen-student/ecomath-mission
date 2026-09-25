/**
 * Uji Activity Selection adaptif (docs/SCORING_SPEC.md §7.16).
 *
 * Fokus pengujian bukan sekadar "fungsinya jalan", melainkan PAGAR-PAGAR
 * validitasnya: keempat level tetap wajib, adaptivitas tidak pernah menyentuh
 * penskoran, dan keputusan sistem selalu meninggalkan jejak audit.
 */

import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE_THRESHOLDS,
  bandOf,
  claimMeanFor,
  selectAdaptiveTask,
  surfaceLoad,
  type PriorClaimScores,
} from '../src/tasks/adaptive.js';
import { isAdaptiveEnabled, resetAdaptiveEnabled, setAdaptiveEnabled } from '../src/tasks/adaptiveState.js';
import { TASK_BANK, tasksByLevel } from '../src/tasks/index.js';
import { deriveObservables } from '../src/scoring/observables.js';
import { scoreAttempt } from '../src/scoring/index.js';
import type { RawEvent } from '../src/domain/events.js';

const skor = (K1: number, K2: number, K3: number, K4: number): PriorClaimScores => ({ K1, K2, K3, K4 });

/** rng deterministik: selalu memilih kandidat pertama. */
const rngPertama = () => 0;

describe('beban permukaan', () => {
  it('jumlah kendala selalu lebih menentukan daripada jenis bilangan', () => {
    // Selisih satu kendala (1,0) harus mengalahkan selisih jenis bilangan
    // terbesar (0,67), supaya struktur sistem pertidaksamaan tetap menjadi
    // penentu utama - bukan beban aritmetika.
    for (const t of TASK_BANK) {
      const pecahan = surfaceLoad(t) - t.expectedConstraintCount;
      expect(pecahan).toBeGreaterThanOrEqual(0);
      expect(pecahan).toBeLessThan(1);
    }
  });

  it('Level 1 dan Level 4 tidak punya ruang adaptif (varian setara)', () => {
    for (const level of [1, 4]) {
      const beban = new Set(tasksByLevel(level).map(surfaceLoad));
      expect(beban.size).toBe(1);
    }
  });

  it('Level 2 dan Level 3 punya ruang adaptif', () => {
    for (const level of [2, 3]) {
      const beban = new Set(tasksByLevel(level).map(surfaceLoad));
      expect(beban.size).toBeGreaterThan(1);
    }
  });
});

describe('pemetaan pita kemampuan', () => {
  it('memetakan rerata klaim ke pita sesuai ambang', () => {
    expect(bandOf(null)).toBe('belum_ada');
    expect(bandOf(0)).toBe('rendah');
    expect(bandOf(ADAPTIVE_THRESHOLDS.bandRendahMax)).toBe('rendah');
    expect(bandOf(1.5)).toBe('sedang');
    expect(bandOf(ADAPTIVE_THRESHOLDS.bandTinggiMin)).toBe('tinggi');
    expect(bandOf(3)).toBe('tinggi');
  });

  it('hanya membaca klaim dominan level yang akan disajikan', () => {
    // K1 sempurna, K2/K3 nol. Level 3 berfokus K2-K3, maka reratanya harus 0 -
    // bukan terangkat oleh K1 yang tidak relevan bagi level itu.
    const priors = [skor(3, 0, 0, 0)];
    expect(claimMeanFor(['K2', 'K3'], priors)).toBe(0);
    expect(claimMeanFor(['K1'], priors)).toBe(3);
  });

  it('mengembalikan null bila belum ada level yang dinilai', () => {
    expect(claimMeanFor(['K2', 'K3'], [])).toBeNull();
  });
});

describe('pemilihan varian', () => {
  it('siswa berpita rendah menerima varian berbeban permukaan terendah', () => {
    const pilihan = selectAdaptiveTask(3, [skor(1, 0, 0, 0)], { rng: rngPertama });
    const terendah = Math.min(...tasksByLevel(3).map(surfaceLoad));
    expect(pilihan!.band).toBe('rendah');
    expect(surfaceLoad(pilihan!.task)).toBe(terendah);
  });

  it('siswa berpita tinggi menerima varian berbeban permukaan tertinggi', () => {
    const pilihan = selectAdaptiveTask(3, [skor(3, 3, 3, 3)], { rng: rngPertama });
    const tertinggi = Math.max(...tasksByLevel(3).map(surfaceLoad));
    expect(pilihan!.band).toBe('tinggi');
    expect(surfaceLoad(pilihan!.task)).toBe(tertinggi);
  });

  it('selalu memilih dari dalam level yang diminta - tidak pernah melompat level', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const p of [skor(0, 0, 0, 0), skor(1, 1, 1, 1), skor(3, 3, 3, 3)]) {
        const pilihan = selectAdaptiveTask(level, [p], { rng: rngPertama });
        expect(pilihan!.task.level).toBe(level);
      }
    }
  });

  it('menandai level tanpa ruang adaptif alih-alih berpura-pura mengadaptasi', () => {
    expect(selectAdaptiveTask(1, [skor(3, 3, 3, 3)], { rng: rngPertama })!.tanpaRuangAdaptif).toBe(true);
    expect(selectAdaptiveTask(4, [skor(0, 0, 0, 0)], { rng: rngPertama })!.tanpaRuangAdaptif).toBe(true);
    expect(selectAdaptiveTask(3, [skor(0, 0, 0, 0)], { rng: rngPertama })!.tanpaRuangAdaptif).toBe(false);
  });

  it('menghindari konteks SDG yang sudah dipakai bila beban permukaannya setara', () => {
    // Level 1: ketiga varian setara, sehingga konteks menjadi satu-satunya
    // pembeda dan penyeimbangan konteks harus tetap bekerja.
    const pilihan = selectAdaptiveTask(1, [], { usedContexts: ['SDG11'], rng: rngPertama });
    expect(pilihan!.task.sdgContext).not.toBe('SDG11');
  });

  it('tetap memberi task walau seluruh konteks sudah terpakai', () => {
    const pilihan = selectAdaptiveTask(2, [skor(2, 2, 2, 2)], {
      usedContexts: ['SDG11', 'SDG13', 'SDG11&13'],
      rng: rngPertama,
    });
    expect(pilihan!.task.level).toBe(2);
  });

  it('mencatat seluruh kandidat beserta bebannya untuk audit', () => {
    const pilihan = selectAdaptiveTask(3, [skor(2, 2, 2, 2)], { rng: rngPertama });
    expect(pilihan!.ranked).toHaveLength(tasksByLevel(3).length);
    const beban = pilihan!.ranked.map((r) => r.surfaceLoad);
    expect([...beban].sort((a, b) => a - b)).toEqual(beban);
  });
});

describe('saklar mode adaptif', () => {
  it('dapat dinyalakan dan dimatikan saat berjalan', () => {
    setAdaptiveEnabled(true);
    expect(isAdaptiveEnabled()).toBe(true);
    setAdaptiveEnabled(false);
    expect(isAdaptiveEnabled()).toBe(false);
    resetAdaptiveEnabled();
  });
});

describe('pagar validitas: tutorial terisolasi dari data penelitian', () => {
  it('id TUTORIAL tidak pernah ada di bank soal', () => {
    // Task latihan didefinisikan sepenuhnya di client (client/src/ui/tutorialTask.ts).
    // Bila suatu saat ia bocor ke bank soal server, ia dapat terpilih assembly
    // rule dan ikut terskor - uji ini menghentikan hal itu.
    expect(TASK_BANK.some((t) => t.id === 'TUTORIAL')).toBe(false);
  });

  it('bank soal hanya berisi 12 task resmi berkode Lx-SDGy', () => {
    expect(TASK_BANK).toHaveLength(12);
    for (const t of TASK_BANK) {
      expect(t.id).toMatch(/^L[1-4]-SDG(11|13|11&13)-[A-Z]$/);
    }
  });
});

describe('pagar validitas: adaptivitas tidak boleh menyentuh penskoran', () => {
  const task = TASK_BANK.find((t) => t.id === 'L3-SDG13-A')!;

  const logDasar: RawEvent[] = [
    { session_id: 's', task_id: task.id, timestamp_ms: 1000, event_type: 'identify_variable', payload: { variable: 'x', optionId: task.variableOptions.find((o) => o.assignsTo === 'x' && o.correct)!.id }, is_valid_at_time: true, duration_since_last_event_ms: 0 },
    { session_id: 's', task_id: task.id, timestamp_ms: 1500, event_type: 'identify_variable', payload: { variable: 'y', optionId: task.variableOptions.find((o) => o.assignsTo === 'y' && o.correct)!.id }, is_valid_at_time: true, duration_since_last_event_ms: 500 },
    { session_id: 's', task_id: task.id, timestamp_ms: 2000, event_type: 'select_objective', payload: { optionId: task.goalOptions.find((g) => g.correct)!.id }, is_valid_at_time: true, duration_since_last_event_ms: 500 },
    { session_id: 's', task_id: task.id, timestamp_ms: 3000, event_type: 'move_slider', payload: { x: 33, y: 17 }, is_valid_at_time: true, duration_since_last_event_ms: 1000 },
    { session_id: 's', task_id: task.id, timestamp_ms: 4000, event_type: 'attempt_submit', payload: { x: 33, y: 17, phase: 'initial' }, is_valid_at_time: true, duration_since_last_event_ms: 1000 },
  ];

  const eventAdaptif: RawEvent = {
    session_id: 's',
    task_id: task.id,
    timestamp_ms: 0,
    event_type: 'adaptive_selection',
    payload: {
      level: 3,
      mode: 'adaptive',
      chosenTaskId: task.id,
      band: 'rendah',
      claimMean: 0.5,
      basedOnClaims: ['K2', 'K3'],
      ranked: [{ taskId: task.id, surfaceLoad: 2.67 }],
      tanpaRuangAdaptif: false,
    },
    is_valid_at_time: true,
    duration_since_last_event_ms: 0,
  };

  it('mengabaikan adaptive_selection sepenuhnya saat menghitung skor', () => {
    const tanpa = scoreAttempt(task, logDasar);
    const dengan = scoreAttempt(task, [eventAdaptif, ...logDasar]);

    expect(dengan.scores).toEqual(tanpa.scores);
    expect(dengan.rawSum).toBe(tanpa.rawSum);
    expect(dengan.weightedComposite).toBe(tanpa.weightedComposite);
  });

  it('tidak mengubah satu pun observable variable', () => {
    const tanpa = deriveObservables(task, logDasar);
    const dengan = deriveObservables(task, [eventAdaptif, ...logDasar]);
    expect(dengan).toEqual(tanpa);
  });

  it('pita kemampuan yang berbeda tidak mengubah skor untuk log yang sama', () => {
    // Bukti paling langsung bahwa mode adaptif hanya memilih SOAL, tidak pernah
    // ikut menentukan NILAI: apa pun pita yang tercatat, skornya identik.
    const pita = ['rendah', 'sedang', 'tinggi', 'belum_ada'] as const;
    const hasil = pita.map((b) =>
      scoreAttempt(task, [{ ...eventAdaptif, payload: { ...eventAdaptif.payload, band: b } }, ...logDasar]).rawSum,
    );
    expect(new Set(hasil).size).toBe(1);
  });
});
