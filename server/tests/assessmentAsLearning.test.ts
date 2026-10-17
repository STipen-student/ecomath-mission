/**
 * Uji Assessment as Learning (docs/SCORING_SPEC.md §7.18).
 *
 * Dua hal yang dikunci di sini:
 *   1. Kalibrasi dan tinjauan target dihitung benar dari penilaian diri siswa.
 *   2. Event asesmen diri TIDAK PERNAH mengubah skor K1-K4 - termasuk lewat
 *      jalur halus seperti durasi pengerjaan yang bertambah.
 */

import { describe, expect, it } from 'vitest';
import type { RawEvent } from '../src/domain/events.js';
import { getTaskById } from '../src/tasks/index.js';
import {
  buildAssessmentAsLearning,
  buildCalibration,
  buildGoalReview,
  parseGoal,
  parseSelfAssessment,
  scoreAttempt,
  suggestNextFocus,
} from '../src/scoring/index.js';
import { L3_KEY, log } from './fixtures/logBuilder.js';

const l3 = getTaskById('L3-SDG11-A')!;

function logL3(): RawEvent[] {
  return log(l3.id)
    .identifyBothCorrect()
    .selectObjective('g1')
    .writeConstraint(0, ...L3_KEY.lahan)
    .writeConstraint(1, ...L3_KEY.anggaran)
    .writeConstraint(2, ...L3_KEY.akses)
    .checkCorner(70, 10, 610)
    .moveSlider(70, 10)
    .submit(70, 10)
    .reflection('r3', 'Lahan perumahan berkurang karena anggaran terbatas sehingga RTH lebih menguntungkan.')
    .build();
}

function aal(type: RawEvent['event_type'], timestamp: number, payload: Record<string, unknown>): RawEvent {
  return {
    session_id: 'sesi-uji',
    task_id: l3.id,
    timestamp_ms: timestamp,
    event_type: type,
    payload,
    is_valid_at_time: true,
    duration_since_last_event_ms: 0,
  };
}

describe('event asesmen diri tidak memengaruhi skor', () => {
  it('skor dan observable identik dengan atau tanpa goal_set, self_assessment, learning_reflection', () => {
    const dasar = logL3();
    const akhir = dasar[dasar.length - 1]!.timestamp_ms;
    const denganAal = [
      aal('goal_set', 0, { focusClaim: 'K2', targetScore: 3, strategyId: 'k2-a', strategyText: 'x' }),
      ...dasar,
      // Jauh setelah submit: bila tidak disaring, totalDurationMs akan melonjak.
      aal('self_assessment', akhir + 600_000, { K1: 3, K2: 3, K3: 3, K4: 3 }),
      aal('learning_reflection', akhir + 900_000, { openText: 'Saya belajar memeriksa titik pojok.' }),
    ];

    const a = scoreAttempt(l3, dasar);
    const b = scoreAttempt(l3, denganAal);
    expect(b.claims).toEqual(a.claims);
    expect(b.rawSum).toBe(a.rawSum);
    expect(b.observables.totalDurationMs).toBe(a.observables.totalDurationMs);
    expect(b.observables.planningTimeMs).toBe(a.observables.planningTimeMs);
  });
});

describe('kalibrasi penilaian diri', () => {
  it('mengenali penilaian yang tepat, terlalu tinggi, dan terlalu rendah', () => {
    const k = buildCalibration({ K1: 3, K2: 3, K3: 1, K4: 2 }, { K1: 3, K2: 1, K3: 2, K4: 2 });
    expect(k.perClaim.map((c) => c.status)).toEqual(['tepat', 'terlalu_tinggi', 'terlalu_rendah', 'tepat']);
    expect(k.exactCount).toBe(2);
    expect(k.meanAbsGap).toBe(0.75);
    expect(k.bias).toBe(0.25);
    for (const c of k.perClaim) expect(c.message.length).toBeGreaterThan(30);
  });

  it('ringkasan menyebut arah kecenderungan menilai diri', () => {
    expect(buildCalibration({ K1: 3, K2: 3, K3: 3, K4: 3 }, { K1: 1, K2: 1, K3: 2, K4: 2 }).summary).toMatch(/lebih tinggi/);
    expect(buildCalibration({ K1: 0, K2: 0, K3: 1, K4: 1 }, { K1: 2, K2: 2, K3: 3, K4: 2 }).summary).toMatch(/meremehkan/);
    expect(buildCalibration({ K1: 2, K2: 2, K3: 2, K4: 2 }, { K1: 2, K2: 2, K3: 2, K4: 2 }).summary).toMatch(/akurat/);
  });
});

describe('tinjauan target belajar', () => {
  const goal = { focusClaim: 'K2' as const, targetScore: 3, strategyId: 'k2-a', strategyText: 'Pilih tujuan dulu' };
  const skor = (k2: number) => ({ K1: 2, K2: k2, K3: 2, K4: 2 });

  it('tercapai bila skor tahap fokus memenuhi target pilihan siswa', () => {
    const t = buildGoalReview(goal, skor(3), 1);
    expect(t.achieved).toBe(true);
    expect(t.status).toBe('tercapai');
  });

  it('membedakan meningkat, tetap, menurun, dan level pertama', () => {
    expect(buildGoalReview(goal, skor(2), 1).status).toBe('meningkat');
    expect(buildGoalReview(goal, skor(1), 1).status).toBe('tetap');
    expect(buildGoalReview(goal, skor(0), 1).status).toBe('menurun');
    expect(buildGoalReview(goal, skor(2), null).status).toBe('belum_tercapai');
  });

  it('menyarankan tahap terlemah, dengan kalibrasi terburuk sebagai pemecah seri', () => {
    const actual = { K1: 3, K2: 1, K3: 1, K4: 2 };
    const kal = buildCalibration({ K1: 3, K2: 1, K3: 3, K4: 2 }, actual);
    expect(suggestNextFocus(actual, kal)).toBe('K3');
    expect(suggestNextFocus(actual, null)).toBe('K2');
  });

  it('paket hasil tetap utuh walau siswa tidak menilai diri maupun menetapkan target', () => {
    const h = buildAssessmentAsLearning({ actual: skor(2), self: null, goal: null, previousScores: null });
    expect(h.calibration).toBeNull();
    expect(h.goalReview).toBeNull();
    expect(h.suggestedNextFocus).toBeDefined();
  });
});

describe('pembacaan payload', () => {
  it('menolak payload yang tidak lengkap atau di luar rentang', () => {
    expect(parseSelfAssessment({ K1: 3, K2: 2, K3: 1 })).toBeNull();
    expect(parseSelfAssessment({ K1: 3, K2: 2, K3: 1, K4: 4 })).toBeNull();
    expect(parseSelfAssessment({ K1: 3, K2: 2, K3: 1, K4: 0 })).toEqual({ K1: 3, K2: 2, K3: 1, K4: 0 });
    expect(parseGoal({ focusClaim: 'K5', targetScore: 2 })).toBeNull();
    expect(parseGoal({ focusClaim: 'K1', targetScore: 0 })).toBeNull();
    expect(parseGoal({ focusClaim: 'K1', targetScore: 2, strategyId: 's', strategyText: 't' })?.focusClaim).toBe('K1');
  });
});
