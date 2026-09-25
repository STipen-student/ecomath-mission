/**
 * Uji mesin skoring secara utuh: log lengkap satu percobaan -> profil K1-K4.
 *
 * Tiga arketipe siswa diuji pada task Level 4 (yang mengaktifkan seluruh
 * deskriptor rubrik sekaligus), ditambah pemeriksaan sifat-sifat yang harus
 * selalu berlaku pada seluruh bank soal.
 */

import { describe, expect, it } from 'vitest';
import { getTaskById, TASK_BANK } from '../src/tasks/index.js';
import { scoreAttempt, weightedComposite } from '../src/scoring/index.js';
import { COMPOSITE_WEIGHTS, SCORING_VERSION } from '../src/scoring/thresholds.js';
import { L1_KEY, L4_KEY, log } from './fixtures/logBuilder.js';

const l4 = getTaskById('L4-SDG11-A')!;
const l1 = getTaskById('L1-SDG11-A')!;

/** Siswa sempurna: merencanakan, menerjemahkan tepat, optimum, merevisi, merefleksi. */
function siswaSempurna() {
  return log(l4.id)
    .identifyBothCorrect()
    .selectObjective('g1')
    .writeConstraint(0, ...L4_KEY.lahan)
    .writeConstraint(1, ...L4_KEY.anggaran)
    .writeConstraint(2, ...L4_KEY.rth)
    .checkCorner(84, 36, 3360)
    .checkCorner(0, 120, 0)
    .moveSlider(84, 36)
    .submit(84, 36)
    .distractorShown('ev_rth_40')
    .checkCorner(72, 48, 2880)
    .reviseAfterEvent(72, 48)
    .submit(72, 48, 'post_event')
    .reflection(
      'r3',
      'RTH minimal naik dari 36 menjadi 48 hektar sehingga perumahan turun dari 84 ke 72 hektar, akibatnya daya tampung berkurang 480 kepala keluarga karena kota harus mengorbankan hunian demi standar lingkungan.',
    )
    .build();
}

/** Siswa trial-error: menggeser dulu, banyak ditolak, akhirnya menemukan solusi. */
function siswaTrialError() {
  const b = log(l4.id)
    .identifyBothCorrect()
    .moveSlider(120, 0, false)
    .selectObjective('g1') // baru memilih tujuan setelah menggeser
    .writeConstraint(0, ...L4_KEY.lahan);

  for (let i = 0; i < 6; i++) b.reject(110 - i * 5, 10, ['k_rth_who']);

  return b
    .moveSlider(84, 36)
    .submit(84, 36)
    .distractorShown('ev_rth_40')
    .reject(84, 36, ['k_rth_who'])
    .reviseAfterEvent(70, 50)
    .submit(70, 50, 'post_event')
    .reflection('r1', 'RTH nya ditambah supaya kotanya lebih hijau dan sehat.')
    .build();
}

/** Siswa gagal total: tidak merencanakan, tidak valid, tidak merefleksi. */
function siswaGagalTotal() {
  return log(l4.id).moveSlider(120, 10, false).submit(120, 10, 'initial', false).build();
}

describe('profil skor tiga arketipe siswa pada Level 4', () => {
  it('siswa sempurna memperoleh 3 pada seluruh klaim', () => {
    const r = scoreAttempt(l4, siswaSempurna());
    expect({ K1: r.K1, K2: r.K2, K3: r.K3, K4: r.K4 }).toEqual({ K1: 3, K2: 3, K3: 3, K4: 3 });
    expect(r.rawSum).toBe(12);
    expect(r.weightedComposite).toBe(3);
  });

  it('siswa trial-error memperoleh skor menengah dengan K2 nol', () => {
    const r = scoreAttempt(l4, siswaTrialError());
    // K2 = 0 karena tujuan dipilih setelah slider digeser (indikasi tanpa rencana).
    expect(r.K2).toBe(0);
    // Revisi setelah event berhasil valid (70, 50), tetapi refleksinya dangkal.
    expect(r.K3).toBeGreaterThan(0);
    expect(r.K4).toBe(2);
    expect(r.rawSum).toBeGreaterThan(0);
    expect(r.rawSum).toBeLessThan(12);
  });

  it('siswa gagal total memperoleh 0 pada seluruh klaim', () => {
    const r = scoreAttempt(l4, siswaGagalTotal());
    expect({ K1: r.K1, K2: r.K2, K3: r.K3, K4: r.K4 }).toEqual({ K1: 0, K2: 0, K3: 0, K4: 0 });
    expect(r.rawSum).toBe(0);
    expect(r.weightedComposite).toBe(0);
  });

  it('mengurutkan ketiga arketipe secara benar berdasarkan komposit', () => {
    const sempurna = scoreAttempt(l4, siswaSempurna()).weightedComposite;
    const trialError = scoreAttempt(l4, siswaTrialError()).weightedComposite;
    const gagal = scoreAttempt(l4, siswaGagalTotal()).weightedComposite;

    expect(sempurna).toBeGreaterThan(trialError);
    expect(trialError).toBeGreaterThan(gagal);
  });
});

describe('sifat yang harus selalu berlaku', () => {
  it('menghasilkan skor identik untuk log yang sama (dapat direproduksi)', () => {
    const events = siswaSempurna();
    const a = scoreAttempt(l4, events);
    const b = scoreAttempt(l4, events);
    expect({ K1: a.K1, K2: a.K2, K3: a.K3, K4: a.K4 }).toEqual({ K1: b.K1, K2: b.K2, K3: b.K3, K4: b.K4 });
    expect(a.weightedComposite).toBe(b.weightedComposite);
  });

  it('tidak terpengaruh urutan kedatangan event (log diurutkan ulang)', () => {
    const events = siswaSempurna();
    const teracak = [...events].reverse();
    const a = scoreAttempt(l4, events);
    const b = scoreAttempt(l4, teracak);
    expect({ K1: b.K1, K2: b.K2, K3: b.K3, K4: b.K4 }).toEqual({ K1: a.K1, K2: a.K2, K3: a.K3, K4: a.K4 });
  });

  it('menghasilkan skor 0-3 untuk setiap klaim pada log kosong maupun lengkap', () => {
    for (const task of TASK_BANK) {
      for (const events of [[], siswaSempurna()]) {
        const r = scoreAttempt(task, events);
        for (const claim of [r.K1, r.K2, r.K3, r.K4]) {
          expect(claim, task.id).toBeGreaterThanOrEqual(0);
          expect(claim, task.id).toBeLessThanOrEqual(3);
        }
        expect(r.rawSum).toBe(r.K1 + r.K2 + r.K3 + r.K4);
      }
    }
  });

  it('mengabaikan set_zone_center sepenuhnya saat menghitung skor', () => {
    // Letak zona di peta adalah pilihan tata kota, bukan bagian model matematis.
    // Menyisipkan event ini TIDAK boleh menggeser satu angka pun - bila suatu
    // saat ada rubrik yang diam-diam membacanya, uji ini akan gagal.
    const dasar = siswaSempurna();
    const denganTataKota = [
      ...dasar,
      {
        session_id: 'sesi-uji',
        task_id: l4.id,
        timestamp_ms: 2400,
        event_type: 'set_zone_center' as const,
        payload: { variable: 'x', col: 9, row: 4 },
        is_valid_at_time: true,
        duration_since_last_event_ms: 300,
      },
      {
        session_id: 'sesi-uji',
        task_id: l4.id,
        timestamp_ms: 2600,
        event_type: 'set_zone_center' as const,
        payload: { variable: 'y', col: 3, row: 10 },
        is_valid_at_time: true,
        duration_since_last_event_ms: 200,
      },
    ];

    const a = scoreAttempt(l4, dasar);
    const b = scoreAttempt(l4, denganTataKota);

    expect({ K1: b.K1, K2: b.K2, K3: b.K3, K4: b.K4 }).toEqual({ K1: a.K1, K2: a.K2, K3: a.K3, K4: a.K4 });
    expect(b.rawSum).toBe(a.rawSum);
    expect(b.weightedComposite).toBe(a.weightedComposite);
  });

  it('tidak melempar error pada log kosong', () => {
    for (const task of TASK_BANK) {
      const r = scoreAttempt(task, []);
      expect(r.rawSum).toBe(0);
      expect(r.taskId).toBe(task.id);
    }
  });

  it('menyertakan jejak audit lengkap untuk keempat klaim', () => {
    const r = scoreAttempt(l4, siswaSempurna());
    expect(r.claims.map((c) => c.claim)).toEqual(['K1', 'K2', 'K3', 'K4']);
    for (const c of r.claims) {
      expect(c.descriptor.length).toBeGreaterThan(10);
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(Object.keys(c.evidence).length).toBeGreaterThan(0);
    }
    expect(r.scoringVersion).toBe(SCORING_VERSION);
  });
});

describe('komposit berbobot', () => {
  it('menghasilkan 3,0 untuk profil sempurna dan 0 untuk profil nol di semua level', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(weightedComposite(level, { K1: 3, K2: 3, K3: 3, K4: 3 })).toBe(3);
      expect(weightedComposite(level, { K1: 0, K2: 0, K3: 0, K4: 0 })).toBe(0);
    }
  });

  it('membobot K4 paling besar di Level 4: profil hanya-K4 unggul atas profil hanya-K1', () => {
    const hanyaK4 = weightedComposite(4, { K1: 0, K2: 0, K3: 0, K4: 3 });
    const hanyaK1 = weightedComposite(4, { K1: 3, K2: 0, K3: 0, K4: 0 });
    expect(hanyaK4).toBeGreaterThan(hanyaK1);
    expect(hanyaK4).toBeCloseTo(3 * COMPOSITE_WEIGHTS[4]!.K4, 6);
  });

  it('membobot K1 paling besar di Level 1', () => {
    expect(weightedComposite(1, { K1: 3, K2: 0, K3: 0, K4: 0 })).toBeGreaterThan(
      weightedComposite(1, { K1: 0, K2: 0, K3: 0, K4: 3 }),
    );
  });

  it('memberi bobot rata untuk level yang tidak dikenal, bukan melempar error', () => {
    expect(weightedComposite(99, { K1: 3, K2: 3, K3: 3, K4: 3 })).toBe(3);
  });
});

describe('skoring Level 1 - varian tanpa fungsi tujuan', () => {
  it('menilai K3 dengan kriteria feasibility_only dan K4 dengan reflection_only', () => {
    const events = log(l1.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .checkCorner(40, 0)
      .moveSlider(30, 10)
      .submit(30, 10)
      .reflection(
        'r3',
        'Kalau RTH ditambah maka permukiman harus berkurang karena total lahan hanya 40 hektar, sehingga daya tampung hunian menurun.',
      )
      .build();

    const r = scoreAttempt(l1, events);
    expect(r.claims[2]!.criterion).toBe('feasibility_only');
    expect(r.claims[3]!.criterion).toBe('reflection_only');
    expect({ K1: r.K1, K2: r.K2, K3: r.K3, K4: r.K4 }).toEqual({ K1: 3, K2: 3, K3: 3, K4: 3 });
  });
});
