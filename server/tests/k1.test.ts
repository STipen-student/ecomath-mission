/**
 * Uji rubrik K1 - Memahami Masalah.
 *
 * Tiap deskriptor 0-3 diuji dengan log sintetis yang mewakili tiga arketipe
 * siswa: "sempurna", "trial-error", dan "gagal total".
 */

import { describe, expect, it } from 'vitest';
import { getTaskById } from '../src/tasks/index.js';
import { deriveObservables } from '../src/scoring/observables.js';
import { scoreK1 } from '../src/scoring/k1.js';
import { classifyConstraint } from '../src/scoring/observables.js';
import { L1_KEY, log } from './fixtures/logBuilder.js';

const task = getTaskById('L1-SDG11-A')!;
const substantive = task.constraints.filter((k) => k.kind === 'explicit' || k.kind === 'implicit');

function k1(events: ReturnType<ReturnType<typeof log>['build']>) {
  return scoreK1(task, deriveObservables(task, events));
}

describe('classifyConstraint - deteksi miskonsepsi', () => {
  it('mengenali bentuk ekuivalen sebagai benar, bukan miskonsepsi', () => {
    // "x >= 2y" dan "x - 2y >= 0" adalah pertidaksamaan yang sama.
    expect(classifyConstraint({ a: 1, b: -2, op: '>=', c: 0 }, substantive).kind).toBe('none');
    // Bentuk terkali dua juga ekuivalen: 2x - 4y >= 0.
    expect(classifyConstraint({ a: 2, b: -4, op: '>=', c: 0 }, substantive).kind).toBe('none');
    // Ditulis terbalik arah dan tanda: 2y - x <= 0 setara x - 2y >= 0.
    expect(classifyConstraint({ a: -1, b: 2, op: '<=', c: 0 }, substantive).kind).toBe('none');
  });

  it('mengenali arah pertidaksamaan yang terbalik sebagai sign_flip', () => {
    const m = classifyConstraint({ a: 1, b: 1, op: '>=', c: 40 }, substantive);
    expect(m.kind).toBe('sign_flip');
    expect(m.targetId).toBe('k_lahan');
  });

  it('mengenali tertukarnya peran x dan y sebagai swap_vars', () => {
    // "y >= 2x" ketika yang benar adalah "x >= 2y".
    const m = classifyConstraint({ a: -2, b: 1, op: '>=', c: 0 }, substantive);
    expect(m.kind).toBe('swap_vars');
    expect(m.targetId).toBe('k_rasio');
  });

  it('mengenali kesalahan skala konstanta sebagai unit_scale', () => {
    const m = classifyConstraint({ a: 1, b: 1, op: '<=', c: 400 }, substantive);
    expect(m.kind).toBe('unit_scale');
    expect(m.targetId).toBe('k_lahan');
  });

  it('menandai pertidaksamaan yang tidak menyerupai kendala mana pun sebagai structural', () => {
    const m = classifyConstraint({ a: 7, b: 3, op: '<=', c: 19 }, substantive);
    expect(m.kind).toBe('structural');
    expect(m.targetId).toBeNull();
  });
});

describe('K1 - skor 0', () => {
  it('memberi 0 bila identify_variable tidak pernah muncul', () => {
    const events = log(task.id)
      .selectObjective('g1')
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .moveSlider(30, 10)
      .submit(30, 10)
      .build();

    const r = k1(events);
    expect(r.score).toBe(0);
    expect(r.reasons.join(' ')).toContain('identify_variable');
  });

  it('memberi 0 bila peran variabel ditetapkan keliru (x dan y tertukar)', () => {
    const events = log(task.id)
      .identifyVariable('x', 'vx2') // RTH ditandai sebagai permukiman
      .identifyVariable('y', 'vy2')
      .writeConstraint(0, ...L1_KEY.lahan)
      .submit(30, 10)
      .build();

    expect(k1(events).score).toBe(0);
  });
});

describe('K1 - skor 1', () => {
  it('memberi 1 bila kendala pertama menunjukkan arah pertidaksamaan terbalik', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, 1, 1, '>=', 40) // seharusnya <=
      .writeConstraint(1, ...L1_KEY.rasio)
      .submit(30, 10)
      .build();

    const r = k1(events);
    expect(r.score).toBe(1);
    expect(r.reasons.join(' ')).toContain('arah pertidaksamaan terbalik');
  });

  it('memberi 1 bila kendala pertama menukar peran x dan y', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, -2, 1, '>=', 0) // y >= 2x, seharusnya x >= 2y
      .submit(10, 25)
      .build();

    expect(k1(events).score).toBe(1);
  });

  it('memberi 1 bila siswa tidak pernah menyusun satu pun pertidaksamaan', () => {
    const events = log(task.id).identifyBothCorrect().moveSlider(30, 5).submit(30, 5).build();

    const r = k1(events);
    expect(r.score).toBe(1);
    expect(r.reasons.join(' ')).toContain('tidak pernah menyusun');
  });
});

describe('K1 - skor 2', () => {
  it('memberi 2 bila kendala benar arahnya tetapi keliru skala, lalu direvisi', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, 1, 1, '<=', 400) // lupa skala: 400 bukan 40
      .writeConstraint(1, ...L1_KEY.rasio)
      .writeConstraint(0, ...L1_KEY.lahan) // revisi konstanta
      .moveSlider(30, 10)
      .submit(30, 10)
      .build();

    const r = k1(events);
    expect(r.score).toBe(2);
    expect(r.evidence.minorRevisionCount).toBe(1);
    expect(r.evidence.structuralRevisionCount).toBe(0);
  });

  it('memberi 2 bila hanya sebagian kendala yang benar', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, 3, 5, '<=', 17) // kendala kedua ngawur
      .submit(30, 5)
      .build();

    const r = k1(events);
    expect(r.score).toBe(2);
    expect(r.evidence.constraintCountCorrect).toBe(1);
  });
});

describe('K1 - skor 3', () => {
  it('memberi 3 bila seluruh kendala tepat pada percobaan pertama tanpa revisi struktural', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .selectObjective('g1')
      .moveSlider(30, 10)
      .submit(30, 10)
      .build();

    const r = k1(events);
    expect(r.score).toBe(3);
    expect(r.evidence.allConstraintsCorrectFirstTry).toBe(true);
  });

  it('tetap memberi 3 bila siswa menulis bentuk ekuivalen, bukan bentuk persis kunci', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, 2, 2, '<=', 80) // 2x + 2y <= 80, setara x + y <= 40
      .writeConstraint(1, -1, 2, '<=', 0) // 2y - x <= 0, setara x >= 2y
      .submit(30, 10)
      .build();

    expect(k1(events).score).toBe(3);
  });

  it('menurunkan dari 3 ke 2 bila ada revisi struktural setelah kendala benar', () => {
    const events = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .writeConstraint(1, -2, 1, '>=', 0) // ragu, mengubah struktur kendala kedua
      .writeConstraint(1, ...L1_KEY.rasio) // kembali ke jawaban benar
      .submit(30, 10)
      .build();

    const r = k1(events);
    expect(r.score).toBe(2);
    expect(r.evidence.structuralRevisionCount).toBeGreaterThan(0);
  });
});

describe('K1 - arketipe siswa', () => {
  it('siswa sempurna mendapat 3, trial-error mendapat 2, gagal total mendapat 0', () => {
    const sempurna = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .submit(30, 10)
      .build();

    const trialError = log(task.id)
      .identifyBothCorrect()
      .writeConstraint(0, 1, 1, '<=', 4000)
      .writeConstraint(1, ...L1_KEY.rasio)
      .writeConstraint(0, ...L1_KEY.lahan)
      .submit(30, 10)
      .build();

    const gagalTotal = log(task.id).moveSlider(38, 2).submit(38, 2).build();

    expect(k1(sempurna).score).toBe(3);
    expect(k1(trialError).score).toBe(2);
    expect(k1(gagalTotal).score).toBe(0);
  });
});
