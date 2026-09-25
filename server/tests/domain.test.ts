/**
 * Uji mesin matematis: kelayakan titik, enumerasi titik pojok, dan pencarian
 * optimum. Nilai acuan pada berkas ini dihitung manual dari model matematis
 * pada docs/ECD_Framework.md Bagian 6-9, sehingga bila suatu saat hasil kode
 * berubah, penyebabnya langsung terlihat.
 */

import { describe, expect, it } from 'vitest';
import { evaluate, satisfies, slackOf, tightenStrictForIntegerDomain, applyPatches } from '../src/domain/feasibility.js';
import { cornerPoints, findOptimum, relativeGap } from '../src/domain/optimum.js';
import { getTaskById, TASK_BANK } from '../src/tasks/index.js';
import { c, nonNegativity } from '../src/tasks/helpers.js';

describe('feasibility - evaluasi kendala', () => {
  const kendala = [c('k1', 'Total', 1, 1, '<=', 40), c('k2', 'Rasio', 1, -2, '>=', 0), ...nonNegativity()];

  it('menerima titik di dalam daerah penyelesaian', () => {
    const r = evaluate(kendala, { x: 30, y: 10 });
    expect(r.feasible).toBe(true);
    expect(r.violated).toEqual([]);
  });

  it('menerima titik yang tepat berada di garis batas', () => {
    // (30, 15): x + y = 45 melanggar; pakai (20, 10) yang tepat di garis x = 2y.
    expect(evaluate(kendala, { x: 20, y: 10 }).feasible).toBe(true);
  });

  it('menyebutkan kendala mana yang dilanggar', () => {
    const r = evaluate(kendala, { x: 10, y: 20 });
    expect(r.feasible).toBe(false);
    expect(r.violated).toContain('k2');
    expect(r.violated).not.toContain('k1');
  });

  it('menghitung slack bertanda: positif berarti kendala terpenuhi', () => {
    expect(slackOf(kendala[0]!, { x: 30, y: 5 })).toBe(5);
    expect(slackOf(kendala[0]!, { x: 30, y: 15 })).toBe(-5);
  });

  it('memperlakukan pertidaksamaan tegas sebagai tegas', () => {
    const tegas = c('kt', 'Lebih dari', 1, -1, '>', 0);
    expect(satisfies(tegas, { x: 5, y: 5 })).toBe(false);
    expect(satisfies(tegas, { x: 6, y: 5 })).toBe(true);
  });

  it('mengetatkan pertidaksamaan tegas menjadi non-tegas pada domain bilangan bulat', () => {
    const [hasil] = tightenStrictForIntegerDomain([c('kt', 'Lebih dari', 1, -1, '>', 0)]);
    expect(hasil!.op).toBe('>=');
    expect(hasil!.c).toBe(1); // x - y >= 1
  });
});

describe('optimum - enumerasi titik pojok', () => {
  it('menemukan titik pojok segitiga sederhana', () => {
    const kendala = [c('k1', 'Total', 1, 1, '<=', 10), ...nonNegativity()];
    const pojok = cornerPoints(kendala);
    const koordinat = pojok.map((p) => `${p.x},${p.y}`).sort();
    expect(koordinat).toContain('0,0');
    expect(koordinat).toContain('10,0');
    expect(koordinat).toContain('0,10');
  });

  it('tidak menghasilkan titik duplikat saat beberapa garis berpotongan di titik sama', () => {
    const kendala = [
      c('k1', 'A', 1, 1, '<=', 10),
      c('k2', 'B', 2, 2, '<=', 20), // garis yang sama dengan k1
      ...nonNegativity(),
    ];
    const pojok = cornerPoints(kendala);
    const unik = new Set(pojok.map((p) => `${p.x},${p.y}`));
    expect(unik.size).toBe(pojok.length);
  });
});

describe('optimum - nilai acuan bank skenario', () => {
  it('L3-SDG11-A: memaksimumkan Z = 8x + 5y pada (70, 10) dengan Z = 610', () => {
    const hasil = findOptimum(getTaskById('L3-SDG11-A')!);
    expect(hasil.point).toEqual({ x: 70, y: 10 });
    expect(hasil.z).toBe(610);
  });

  it('L3-SDG13-A: meminimumkan biaya pada perpotongan dua kendala', () => {
    const hasil = findOptimum(getTaskById('L3-SDG13-A')!);
    expect(hasil.point!.x).toBeCloseTo(33.333, 2);
    expect(hasil.point!.y).toBeCloseTo(16.667, 2);
    expect(hasil.z!).toBeCloseTo(8666.67, 1);
  });

  it('L4-SDG13-A: memakai kisi bilangan bulat karena satuannya unit mesin', () => {
    const hasil = findOptimum(getTaskById('L4-SDG13-A')!);
    expect(hasil.point).toEqual({ x: 21, y: 39 });
    expect(hasil.z).toBe(954);
    expect(Number.isInteger(hasil.point!.x)).toBe(true);
  });

  it('L1-SDG13-A: menghormati pertidaksamaan tegas x > y pada domain bulat', () => {
    const task = getTaskById('L1-SDG13-A')!;
    // (12, 12) melanggar karena bus listrik harus LEBIH BANYAK, bukan sama.
    expect(evaluate(tightenStrictForIntegerDomain(task.constraints), { x: 12, y: 12 }).feasible).toBe(false);
    expect(evaluate(tightenStrictForIntegerDomain(task.constraints), { x: 13, y: 11 }).feasible).toBe(true);
  });
});

describe('optimum - pergeseran setelah event distraktor', () => {
  it('L4-SDG11-A: optimum bergeser dari (84, 36) ke (72, 48) saat standar RTH naik', () => {
    const task = getTaskById('L4-SDG11-A')!;
    const sebelum = findOptimum(task);
    const sesudah = findOptimum(task, {
      constraints: applyPatches(task.constraints, task.distractor!.constraintPatches),
    });

    expect(sebelum.point).toEqual({ x: 84, y: 36 });
    expect(sesudah.point).toEqual({ x: 72, y: 48 });
    // Daya tampung turun 3360 -> 2880 kepala keluarga: inilah trade-off yang
    // harus dikenali siswa untuk memperoleh K4 skor 3.
    expect(sebelum.z).toBe(3360);
    expect(sesudah.z).toBe(2880);
  });

  it('L4-SDG13-A: tarif karbon menggeser optimum ke komposisi seluruhnya listrik', () => {
    const task = getTaskById('L4-SDG13-A')!;
    const sesudah = findOptimum(task, {
      constraints: applyPatches(task.constraints, task.distractor!.constraintPatches),
      objective: { ...task.objective, ...task.distractor!.objectivePatch },
    });
    expect(sesudah.point).toEqual({ x: 0, y: 60 });
  });

  it('setiap task Level 4 benar-benar menggeser titik optimumnya', () => {
    // Bila optimum tidak bergeser, event distraktor tidak menghasilkan bukti K4
    // sama sekali - item tersebut gagal mengukur apa yang diklaimnya.
    for (const task of TASK_BANK.filter((t) => t.distractor)) {
      const sebelum = findOptimum(task);
      const sesudah = findOptimum(task, {
        constraints: applyPatches(task.constraints, task.distractor!.constraintPatches),
        objective: task.distractor!.objectivePatch
          ? { ...task.objective, ...task.distractor!.objectivePatch }
          : task.objective,
      });
      expect(sesudah.point, `${task.id}: optimum tidak bergeser setelah event`).not.toEqual(sebelum.point);
    }
  });
});

describe('relativeGap - normalisasi terhadap rentang titik pojok', () => {
  const task = getTaskById('L3-SDG11-A')!;
  const optimum = findOptimum(task);

  it('bernilai 0 tepat pada titik optimum', () => {
    expect(relativeGap(task, { x: 70, y: 10 }, optimum)).toBe(0);
  });

  it('bernilai 1 pada titik pojok terburuk', () => {
    // (0, 10) memberi Z = 50, nilai terendah di antara titik pojok.
    expect(relativeGap(task, { x: 0, y: 10 }, optimum)).toBeCloseTo(1, 5);
  });

  it('bernilai null untuk task tanpa fungsi tujuan', () => {
    const l1 = getTaskById('L1-SDG11-A')!;
    expect(relativeGap(l1, { x: 30, y: 10 }, findOptimum(l1))).toBeNull();
  });
});
