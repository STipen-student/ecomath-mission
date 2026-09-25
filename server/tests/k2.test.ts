/**
 * Uji rubrik K2 - Merencanakan Penyelesaian.
 *
 * Fokus rubrik ini adalah URUTAN dan KELENGKAPAN perencanaan, bukan ketepatan
 * terjemahan (itu wilayah K1). Uji terakhir pada berkas ini secara khusus
 * mengunci pemisahan tersebut agar tidak tanpa sengaja hilang saat kode direvisi.
 */

import { describe, expect, it } from 'vitest';
import { getTaskById } from '../src/tasks/index.js';
import { deriveObservables } from '../src/scoring/observables.js';
import { scoreK2 } from '../src/scoring/k2.js';
import { L3_KEY, log } from './fixtures/logBuilder.js';

const task = getTaskById('L3-SDG11-A')!;

function k2(events: ReturnType<ReturnType<typeof log>['build']>) {
  return scoreK2(task, deriveObservables(task, events));
}

/** Menyusun ketiga kendala L3-SDG11-A dengan benar. */
function writeAllConstraints(b: ReturnType<typeof log>) {
  return b
    .writeConstraint(0, ...L3_KEY.lahan)
    .writeConstraint(1, ...L3_KEY.anggaran)
    .writeConstraint(2, ...L3_KEY.akses);
}

describe('K2 - skor 0', () => {
  it('memberi 0 bila select_objective tidak pernah dilakukan', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect())
      .moveSlider(70, 10)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(0);
    expect(r.reasons.join(' ')).toContain('tidak pernah memilih');
  });

  it('memberi 0 bila tujuan baru dipilih SETELAH slider digeser (trial-error)', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect())
      .moveSlider(40, 30)
      .moveSlider(60, 20)
      .selectObjective('g1') // terlambat
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(0);
    expect(r.reasons.join(' ')).toContain('trial-error');
  });
});

describe('K2 - skor 1', () => {
  it('memberi 1 bila jumlah kendala yang disusun kurang dari yang diminta task', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L3_KEY.lahan)
      .writeConstraint(1, ...L3_KEY.anggaran) // kendala aksesibilitas tidak disusun
      .moveSlider(70, 10)
      .checkCorner(70, 10, 610)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(1);
    expect(r.evidence.constraintCountWritten).toBe(2);
    expect(r.evidence.expectedConstraintCount).toBe(3);
  });
});

describe('K2 - skor 2', () => {
  it('memberi 2 bila lengkap dan terencana tetapi tanpa cek titik pojok sebelum submit', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect().selectObjective('g1'))
      .moveSlider(70, 10)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(2);
    expect(r.reasons.join(' ')).toContain('titik pojok');
  });

  it('menahan di 2 bila urutan sudah efisien tetapi fungsi tujuan yang dipilih keliru', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect().selectObjective('g3'))
      .moveSlider(70, 10)
      .checkCorner(70, 10, 610)
      .checkCorner(0, 60, 300)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(2);
    expect(r.evidence.objectiveCorrect).toBe(false);
  });

  it('memberi 2 bila titik pojok baru dicek SETELAH submit pertama', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect().selectObjective('g1'))
      .moveSlider(50, 20)
      .submit(50, 20)
      .checkCorner(70, 10, 610) // terlambat
      .submit(70, 10)
      .build();

    expect(k2(events).score).toBe(2);
  });
});

describe('K2 - skor 3', () => {
  it('memberi 3 bila tujuan dipilih di awal, kendala lengkap, dan titik pojok dicek sebelum submit', () => {
    const events = writeAllConstraints(log(task.id).identifyBothCorrect().selectObjective('g1'))
      .moveSlider(70, 10)
      .checkCorner(70, 10, 610)
      .checkCorner(53.33, 26.67, 560)
      .checkCorner(0, 60, 300)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(3);
    expect(r.evidence.cornerPointsChecked).toBe(3);
  });
});

describe('K2 - pemisahan konstruk dari K1', () => {
  it('tidak menghukum ulang kesalahan terjemahan: kendala salah tetapi lengkap tetap dapat 3', () => {
    // Ketiga kendala disusun dengan salah skala pada kendala anggaran. Ketepatan
    // terjemahan sudah dinilai K1; K2 hanya menilai kelengkapan dan urutan.
    // Bila uji ini gagal, berarti satu kesalahan siswa dihukum di dua klaim
    // sekaligus dan K1-K2 akan berkorelasi secara artifisial.
    const events = log(task.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L3_KEY.lahan)
      .writeConstraint(1, 25, 40, '<=', 24000) // salah skala
      .writeConstraint(2, ...L3_KEY.akses)
      .moveSlider(70, 10)
      .checkCorner(70, 10, 610)
      .submit(70, 10)
      .build();

    const r = k2(events);
    expect(r.score).toBe(3);
    expect(r.evidence.constraintCountWritten).toBe(3);
  });
});
