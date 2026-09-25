/**
 * Uji integritas bank skenario.
 *
 * Uji pada berkas ini menjaga hal-hal yang, bila luput, baru ketahuan saat satu
 * kelas sudah duduk di depan layar: soal tanpa jawaban, Level 4 tanpa event
 * distraktor, atau kunci jawaban yang bocor ke client.
 */

import { describe, expect, it } from 'vitest';
import {
  ASSEMBLY_RULES,
  TASK_BANK,
  getTaskById,
  pickTaskForLevel,
  substantiveConstraintCount,
  validateAgainstAssemblyRule,
} from '../src/tasks/index.js';
import { findOptimum } from '../src/domain/optimum.js';
import { COMPOSITE_WEIGHTS } from '../src/scoring/thresholds.js';

describe('kelengkapan bank skenario', () => {
  it('memuat 12 task: 3 varian konteks SDG untuk tiap level 1-4', () => {
    expect(TASK_BANK).toHaveLength(12);
    for (const level of [1, 2, 3, 4]) {
      const perLevel = TASK_BANK.filter((t) => t.level === level);
      expect(perLevel, `level ${level}`).toHaveLength(3);
      expect(new Set(perLevel.map((t) => t.sdgContext)).size).toBe(3);
    }
  });

  it('memakai kode task sesuai Tabel Spesifikasi Bagian 10', () => {
    const kode = TASK_BANK.map((t) => t.id).sort();
    expect(kode).toEqual(
      [
        'L1-SDG11&13-A', 'L1-SDG11-A', 'L1-SDG13-A',
        'L2-SDG11&13-A', 'L2-SDG11-A', 'L2-SDG13-A',
        'L3-SDG11&13-A', 'L3-SDG11-A', 'L3-SDG13-A',
        'L4-SDG11&13-A', 'L4-SDG11-A', 'L4-SDG13-A',
      ].sort(),
    );
  });

  it('tidak memiliki kode task yang duplikat', () => {
    expect(new Set(TASK_BANK.map((t) => t.id)).size).toBe(TASK_BANK.length);
  });
});

describe('setiap task dapat diselesaikan siswa', () => {
  it.each(TASK_BANK.map((t) => [t.id] as const))('%s memiliki daerah penyelesaian tidak kosong', (id) => {
    const hasil = findOptimum(getTaskById(id)!);
    expect(hasil.empty, `${id}: daerah penyelesaian kosong`).toBe(false);
    expect(hasil.corners.length).toBeGreaterThan(0);
  });

  it.each(TASK_BANK.filter((t) => t.distractor).map((t) => [t.id] as const))(
    '%s tetap dapat diselesaikan setelah event distraktor',
    (id) => {
      const task = getTaskById(id)!;
      const patched = task.constraints.map((k) => {
        const p = task.distractor!.constraintPatches.find((x) => x.targetId === k.id);
        return p ? { ...k, a: p.newA ?? k.a, b: p.newB ?? k.b, c: p.newC ?? k.c, op: p.newOp ?? k.op } : k;
      });
      expect(findOptimum(task, { constraints: patched }).empty).toBe(false);
    },
  );
});

describe('kepatuhan pada Assembly Rule Bagian 4.2', () => {
  it.each(TASK_BANK.map((t) => [t.id] as const))('%s memenuhi aturan levelnya', (id) => {
    expect(validateAgainstAssemblyRule(getTaskById(id)!)).toEqual([]);
  });

  it('setiap task Level 4 memiliki kendala implisit DAN event distraktor', () => {
    for (const task of TASK_BANK.filter((t) => t.level === 4)) {
      expect(task.constraints.some((k) => k.kind === 'implicit'), `${task.id}`).toBe(true);
      expect(task.distractor, `${task.id}`).not.toBeNull();
      expect(task.representation).toBe('narrative_partial_graph');
    }
  });

  it('tidak ada task Level 1-3 yang memiliki event distraktor', () => {
    for (const task of TASK_BANK.filter((t) => t.level < 4)) {
      expect(task.distractor, `${task.id}`).toBeNull();
    }
  });

  it('menandai L2-SDG11&13-A sebagai anchor item penyetaraan L2-L3', () => {
    const anchor = TASK_BANK.filter((t) => t.isAnchorItem);
    expect(anchor.map((t) => t.id)).toEqual(['L2-SDG11&13-A']);
    expect(substantiveConstraintCount(anchor[0]!)).toBe(3);
  });
});

describe('kelengkapan data tiap task', () => {
  it.each(TASK_BANK.map((t) => [t.id] as const))('%s memiliki opsi dan refleksi yang lengkap', (id) => {
    const t = getTaskById(id)!;

    // Tepat satu rumusan tujuan yang benar.
    expect(t.goalOptions.filter((g) => g.correct)).toHaveLength(1);
    expect(t.goalOptions.length).toBeGreaterThanOrEqual(3);

    // Tepat satu opsi benar untuk masing-masing variabel.
    expect(t.variableOptions.filter((v) => v.assignsTo === 'x' && v.correct)).toHaveLength(1);
    expect(t.variableOptions.filter((v) => v.assignsTo === 'y' && v.correct)).toHaveLength(1);

    // Refleksi tertutup mencakup seluruh tingkat kualitas 0-3.
    const kualitas = t.reflection.closed.options.map((o) => o.quality).sort();
    expect(kualitas).toEqual([0, 1, 2, 3]);
    expect(t.reflection.openPrompt.length).toBeGreaterThan(10);
    expect(t.reflection.expectedTerms.length).toBeGreaterThanOrEqual(5);

    // Non-negativitas selalu ada, dan slider dapat mencapai daerah tak layak
    // sehingga event reject_by_system benar-benar dapat muncul.
    expect(t.constraints.filter((k) => k.kind === 'nonnegativity')).toHaveLength(2);
    expect(t.variables.x.max).toBeGreaterThan(0);
    expect(t.variables.y.max).toBeGreaterThan(0);
  });

  it.each(TASK_BANK.map((t) => [t.id] as const))('%s memberi identitas visual berbeda pada kedua variabel', (id) => {
    const t = getTaskById(id)!;
    // Bila kedua variabel memakai identitas visual yang sama, kedua zona pada
    // peta menjadi tidak terbedakan dan siswa kehilangan umpan balik utamanya.
    expect(t.variables.x.visual, `${id}: kedua variabel memakai visual yang sama`).not.toBe(t.variables.y.visual);
  });

  it('menempatkan identitas "nature" pada variabel ruang hijau, bukan pada lawannya', () => {
    // Uji ini menjaga hal yang pernah salah: warna sempat dikunci ke sumbu x/y,
    // sehingga zona hijau pada Level 4 digambar sebagai blok hunian kuning dan
    // hunian digambar sebagai pepohonan - persis terbalik dari maknanya.
    const harusNature: Array<[string, 'x' | 'y']> = [
      ['L1-SDG11-A', 'x'],      // Ruang Terbuka Hijau
      ['L1-SDG11&13-A', 'y'],   // Jalur sepeda
      ['L2-SDG11&13-A', 'x'],   // Ruang Terbuka Hijau
      ['L3-SDG11-A', 'x'],      // Taman Kota
      ['L3-SDG11&13-A', 'y'],   // Koridor Hijau
      ['L4-SDG11-A', 'y'],      // Ruang Terbuka Hijau
      ['L4-SDG11&13-A', 'y'],   // Zona Hijau Multifungsi
    ];

    for (const [taskId, sumbu] of harusNature) {
      const t = getTaskById(taskId)!;
      expect(t.variables[sumbu].visual, `${taskId} sumbu ${sumbu}`).toBe('nature');
    }
  });

  it('setiap opsi jawaban memiliki id yang unik dalam task-nya', () => {
    for (const t of TASK_BANK) {
      const ids = [
        ...t.goalOptions.map((o) => o.id),
        ...t.variableOptions.map((o) => o.id),
        ...t.reflection.closed.options.map((o) => o.id),
      ];
      expect(new Set(ids).size, `${t.id}`).toBe(ids.length);
    }
  });

  it('setiap kendala memiliki id unik dan teks tampilan', () => {
    for (const t of TASK_BANK) {
      const ids = t.constraints.map((k) => k.id);
      expect(new Set(ids).size, `${t.id}`).toBe(ids.length);
      for (const k of t.constraints) expect(k.display.length, `${t.id}/${k.id}`).toBeGreaterThan(0);
    }
  });
});

describe('assembly rule saat pemilihan task', () => {
  it('selalu mengembalikan task dari level yang diminta', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let i = 0; i < 20; i++) {
        expect(pickTaskForLevel(level)!.level).toBe(level);
      }
    }
  });

  it('mengutamakan konteks SDG yang diminta', () => {
    const t = pickTaskForLevel(2, { preferContext: 'SDG13' });
    expect(t!.sdgContext).toBe('SDG13');
  });

  it('menghindari task yang sudah dipakai bila masih ada alternatif', () => {
    const t = pickTaskForLevel(1, { exclude: ['L1-SDG11-A', 'L1-SDG13-A'] });
    expect(t!.id).toBe('L1-SDG11&13-A');
  });

  it('tetap mengembalikan task meski seluruh kandidat dikecualikan', () => {
    const semua = TASK_BANK.filter((t) => t.level === 1).map((t) => t.id);
    expect(pickTaskForLevel(1, { exclude: semua })).toBeDefined();
  });

  it('mengembalikan undefined untuk level yang tidak ada', () => {
    expect(pickTaskForLevel(9)).toBeUndefined();
    expect(ASSEMBLY_RULES[9]).toBeUndefined();
  });
});

describe('bobot komposit', () => {
  it('berjumlah tepat 1,0 pada setiap level', () => {
    for (const level of [1, 2, 3, 4]) {
      const w = COMPOSITE_WEIGHTS[level]!;
      expect(w.K1 + w.K2 + w.K3 + w.K4, `level ${level}`).toBeCloseTo(1, 10);
    }
  });

  it('memberi K4 bobot terbesar pada Level 4, sesuai catatan desain Bagian 2', () => {
    const w4 = COMPOSITE_WEIGHTS[4]!;
    expect(w4.K4).toBeGreaterThan(w4.K1);
    expect(w4.K4).toBeGreaterThan(w4.K2);
    expect(w4.K4).toBeGreaterThan(w4.K3);
  });

  it('memberi K4 bobot lebih kecil pada Level 1-3 dibanding Level 4', () => {
    for (const level of [1, 2, 3]) {
      expect(COMPOSITE_WEIGHTS[level]!.K4, `level ${level}`).toBeLessThan(COMPOSITE_WEIGHTS[4]!.K4);
    }
  });

  it('memberi K1 bobot terbesar pada Level 1, sesuai fokus bukti K1 dominan', () => {
    const w1 = COMPOSITE_WEIGHTS[1]!;
    expect(w1.K1).toBeGreaterThan(Math.max(w1.K2, w1.K3, w1.K4));
  });
});
