/**
 * Uji rubrik K3 - Melaksanakan Rencana.
 *
 * Mencakup dua varian aturan: 'standard' (task berfungsi tujuan, Level 3-4) dan
 * 'feasibility_only' (task tanpa fungsi tujuan, Level 1-2).
 */

import { describe, expect, it } from 'vitest';
import { getTaskById } from '../src/tasks/index.js';
import { deriveObservables } from '../src/scoring/observables.js';
import { scoreK3 } from '../src/scoring/k3.js';
import { THRESHOLDS } from '../src/scoring/thresholds.js';
import { L1_KEY, L3_KEY, log } from './fixtures/logBuilder.js';

const l3 = getTaskById('L3-SDG11-A')!;
const l1 = getTaskById('L1-SDG11-A')!;

function k3(task: typeof l3, events: ReturnType<ReturnType<typeof log>['build']>) {
  return scoreK3(task, deriveObservables(task, events));
}

function planned(taskId: string) {
  return log(taskId)
    .identifyBothCorrect()
    .selectObjective('g1')
    .writeConstraint(0, ...L3_KEY.lahan)
    .writeConstraint(1, ...L3_KEY.anggaran)
    .writeConstraint(2, ...L3_KEY.akses);
}

describe('K3 varian standard (task dengan fungsi tujuan)', () => {
  it('memberi 0 bila posisi akhir di luar daerah penyelesaian', () => {
    const events = planned(l3.id)
      .moveSlider(100, 30, false)
      .reject(100, 30, ['k_lahan'])
      .submit(100, 30, 'initial', false)
      .build();

    const r = k3(l3, events);
    expect(r.score).toBe(0);
    expect(r.evidence.finalPositionValid).toBe(false);
  });

  it('memberi 0 bila siswa tidak pernah submit sama sekali', () => {
    const events = planned(l3.id).moveSlider(70, 10).build();

    const r = k3(l3, events);
    expect(r.score).toBe(0);
    expect(r.reasons.join(' ')).toContain('tidak pernah melakukan attempt_submit');
  });

  it('memberi 1 bila posisi valid tetapi jauh dari titik optimum', () => {
    // (0, 60) layak tetapi Z = 300, sedangkan optimum Z* = 610.
    const events = planned(l3.id).moveSlider(0, 60).submit(0, 60).build();

    const r = k3(l3, events);
    expect(r.score).toBe(1);
    expect(r.evidence.optimalZ).toBe(L3_KEY.optimumZ);
    expect(Number(r.evidence.relativeGap)).toBeGreaterThan(THRESHOLDS.optimumToleranceRatio);
  });

  it('memberi 2 bila optimum tercapai tetapi lewat banyak penolakan sistem', () => {
    const b = planned(l3.id);
    // Ambang task ini = 3 kendala substantif; 5 penolakan melewatinya.
    for (let i = 0; i < 5; i++) b.reject(90 - i, 30, ['k_lahan']);
    const events = b.moveSlider(70, 10).submit(70, 10).build();

    const r = k3(l3, events);
    expect(r.score).toBe(2);
    expect(r.evidence.boundaryViolationCount).toBe(5);
    expect(r.evidence.violationThreshold).toBe(3);
  });

  it('memberi 3 bila optimum tercapai dengan penolakan dalam ambang', () => {
    const events = planned(l3.id)
      .reject(90, 20, ['k_lahan'])
      .moveSlider(70, 10)
      .checkCorner(70, 10, 610)
      .submit(70, 10)
      .build();

    const r = k3(l3, events);
    expect(r.score).toBe(3);
    expect(r.evidence.relativeGap).toBe(0);
    expect(r.evidence.finalZ).toBe(610);
  });

  it('menerima titik yang sedikit meleset dari optimum selama dalam toleransi 5%', () => {
    // (69, 10): Z = 602. Rentang Z antar titik pojok = 610 - 50 = 560,
    // sehingga selisih 8 poin setara 1,4% - masih di dalam toleransi.
    const events = planned(l3.id).moveSlider(69, 10).checkCorner(70, 10, 610).submit(69, 10).build();

    const r = k3(l3, events);
    expect(r.score).toBe(3);
    expect(Number(r.evidence.relativeGap)).toBeLessThan(THRESHOLDS.optimumToleranceRatio);
  });
});

describe('K3 varian feasibility_only (task tanpa fungsi tujuan)', () => {
  function plannedL1() {
    return log(l1.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio);
  }

  it('memakai kriteria feasibility_only dan mencatatnya pada jejak audit', () => {
    const events = plannedL1().moveSlider(30, 10).submit(30, 10).build();

    const r = k3(l1, events);
    expect(r.criterion).toBe('feasibility_only');
    expect(r.score).toBe(3);
  });

  it('memberi 0 bila posisi akhir melanggar kendala rasio RTH', () => {
    // (10, 20): x + y = 30 <= 40 terpenuhi, tetapi x >= 2y tidak.
    const events = plannedL1().submit(10, 20, 'initial', false).build();

    expect(k3(l1, events).score).toBe(0);
  });

  it('memberi 2 bila valid tetapi penolakan melebihi ambang', () => {
    const b = plannedL1();
    for (let i = 0; i < 3; i++) b.reject(10, 20, ['k_rasio']); // ambang = 2
    const events = b.submit(30, 10).build();

    const r = k3(l1, events);
    expect(r.score).toBe(2);
    expect(r.evidence.violationThreshold).toBe(2);
  });

  it('memberi 1 bila valid tetapi penolakan sangat banyak (pola coba-coba)', () => {
    const b = plannedL1();
    for (let i = 0; i < 9; i++) b.reject(10, 20, ['k_rasio']); // > 2 x 2
    const events = b.submit(30, 10).build();

    expect(k3(l1, events).score).toBe(1);
  });
});

describe('K3 pada Level 4 - dinilai terhadap kendala pasca-event', () => {
  const l4 = getTaskById('L4-SDG11-A')!;

  it('menolak solusi lama (84, 36) setelah event menaikkan standar RTH ke 48', () => {
    const events = log(l4.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(84, 36)
      .submit(84, 36)
      .distractorShown('ev_rth_40')
      .submit(84, 36, 'post_event', false) // tidak merevisi
      .build();

    const r = k3(l4, events);
    expect(r.score).toBe(0);
    expect(r.evidence.evaluatedAfterDistractor).toBe(true);
  });

  it('memberi 3 untuk solusi optimum baru (72, 48) setelah event', () => {
    const events = log(l4.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(84, 36)
      .submit(84, 36)
      .distractorShown('ev_rth_40')
      .reviseAfterEvent(72, 48)
      .submit(72, 48, 'post_event')
      .build();

    const r = k3(l4, events);
    expect(r.score).toBe(3);
    expect(r.evidence.finalZ).toBe(2880); // 40 x 72 kepala keluarga
  });
});
