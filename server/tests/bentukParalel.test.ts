/**
 * Validasi bentuk paralel: setiap bentuk B/C harus setara dengan bentuk A
 * (soal asli) kecuali besar angkanya.
 */
import { describe, expect, it } from 'vitest';
import { TASK_BANK } from '../src/tasks/index.js';
import { BENTUK_PARALEL, daftarBentuk, instansiasi } from '../src/tasks/bentukParalel.js';
import { findOptimum } from '../src/domain/optimum.js';
import { applyPatches, evaluate } from '../src/domain/feasibility.js';
import { surfaceLoad } from '../src/tasks/adaptive.js';
import type { TaskDefinition } from '../src/domain/types.js';

/** Kendala (bukan non-negatif) yang aktif/mengikat di titik p. */
function kendalaMengikat(t: TaskDefinition, p: { x: number; y: number }): string[] {
  return t.constraints
    .filter((k) => k.kind !== 'nonnegativity' && Math.abs(k.a * p.x + k.b * p.y - k.c) < 1e-6)
    .map((k) => k.id)
    .sort();
}

function teksSemua(t: TaskDefinition): string {
  return JSON.stringify({
    n: t.narrative,
    d: t.dataTable,
    g: t.goalOptions,
    v: t.variableOptions,
    r: t.reflection,
    ds: t.distractor && { n: t.distractor.narrative, i: t.distractor.instruction, p: t.distractor.constraintPatches },
    h: t.constraints.map((k) => [k.narrativeHint, k.display]),
  });
}

const kasus = TASK_BANK.flatMap((asli) =>
  (BENTUK_PARALEL[asli.id] ?? []).map((b) => ({ asli, bentuk: b, t: instansiasi(asli, b.id) })),
);

describe('bentuk paralel', () => {
  it('setiap soal punya bentuk B (dan C bila angkanya memungkinkan)', () => {
    for (const t of TASK_BANK) expect(daftarBentuk(t.id).length).toBeGreaterThanOrEqual(2);
  });

  it('bentuk A sama persis dengan soal asli', () => {
    for (const t of TASK_BANK) expect(instansiasi(t, 'A')).toBe(t);
  });

  for (const { asli, bentuk, t } of kasus) {
    describe(`${asli.id} bentuk ${bentuk.id} (x${bentuk.skala})`, () => {
      it('ruas kanan kendala terskala, koefisien dan arah tetap', () => {
        asli.constraints.forEach((k, i) => {
          const b = t.constraints[i]!;
          expect([b.a, b.b, b.op, b.kind]).toEqual([k.a, k.b, k.op, k.kind]);
          expect(b.c).toBeCloseTo(k.c * bentuk.skala, 6);
          expect(b.display).toContain(String(b.c));
        });
        expect(t.objective).toEqual(asli.objective);
      });

      it('optimum bulat, di dalam batas slider, dan sejajar langkah slider', () => {
        const o = findOptimum(t);
        const oa = findOptimum(asli);
        if (!oa.point) {
          expect(o.point).toBeNull();
          return;
        }
        expect(o.point).not.toBeNull();
        // Domain bulat: optimum berada pada kisi bilangan bulat di dekat titik
        // pojok yang sama, sehingga boleh bergeser karena pembulatan.
        const toleransi = asli.domain === 'integer' ? 1 + 1e-9 : 1e-6;
        expect(Math.abs(o.point!.x - oa.point.x * bentuk.skala)).toBeLessThanOrEqual(toleransi);
        expect(Math.abs(o.point!.y - oa.point.y * bentuk.skala)).toBeLessThanOrEqual(toleransi);
        for (const s of ['x', 'y'] as const) {
          const v = o.point![s];
          expect(v).toBeLessThanOrEqual(t.variables[s].max);
          expect(Math.abs(v / t.variables[s].step - Math.round(v / t.variables[s].step))).toBeLessThan(1e-9);
        }
        if (asli.domain !== 'integer') expect(kendalaMengikat(t, o.point!)).toEqual(kendalaMengikat(asli, oa.point));
      });

      it('setelah kebijakan berubah (Level 4), optimum baru juga setara', () => {
        if (!asli.distractor) return;
        const setelah = (x: TaskDefinition): TaskDefinition => {
          const kendala = applyPatches(x.constraints, x.distractor!.constraintPatches);
          return { ...x, constraints: kendala, objective: { ...x.objective, ...(x.distractor!.objectivePatch ?? {}) } };
        };
        const pa = findOptimum(setelah(asli)).point;
        if (!pa) return; // tanpa fungsi tujuan (SPtLDV): tidak ada optimum
        const oa = pa;
        const o = findOptimum(setelah(t)).point!;
        expect(o.x).toBeCloseTo(oa.x * bentuk.skala, 6);
        expect(o.y).toBeCloseTo(oa.y * bentuk.skala, 6);
        expect(evaluate(setelah(t).constraints, o).feasible).toBe(true);
      });

      it('beban permukaan sama dengan bentuk A', () => {
        expect(surfaceLoad(t)).toBeCloseTo(surfaceLoad(asli), 6);
      });

      it('setiap frasa lama sudah terganti dan setiap frasa baru muncul di teks', () => {
        const teks = teksSemua(t);
        // Teks display kendala dibentuk ulang dari angka baru, dan angka baru bisa
        // kebetulan sama dengan angka lama (mis. 400 x 2 = 800), jadi tidak diperiksa di sini.
        const teksTulisan = teksSemua({ ...t, constraints: t.constraints.map((k) => ({ ...k, display: '' })) });
        for (const [lama, baru] of bentuk.teks) {
          if (!baru.includes(lama)) expect(teksTulisan, `masih ada "${lama}"`).not.toContain(lama);
          expect(teks).toContain(baru);
        }
      });

      it('angka ruas kanan baru disebut di narasi atau petunjuk kendala', () => {
        const teks = teksSemua(t).replace(/\./g, '').replace(/,/g, '.');
        for (const k of t.constraints) {
          if (k.kind === 'nonnegativity' || k.c === 0 || k.kind === 'implicit') continue;
          const angka = String(k.c);
          const dalamJuta = k.c >= 1000 ? String(k.c / 1000) : null;
          const ada = teks.includes(angka) || (dalamJuta !== null && teks.includes(dalamJuta));
          expect(ada, `${k.id}: ${angka} tidak disebut`).toBe(true);
        }
      });
    });
  }
});

describe('bentuk paralel - pemberian soal', () => {
  it('soal yang diterima siswa sama dengan bentuk yang tersimpan pada percobaannya', async () => {
    const { default: request } = await import('supertest');
    const { createApp } = await import('../src/app.js');
    const { prisma } = await import('../src/db.js');
    const { getTaskInstance } = await import('../src/tasks/index.js');
    const app = createApp();
    const terlihat = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const sesi = await request(app).post('/api/session').send({ studentName: `Uji Bentuk ${i}`, classCode: 'XI-UJI-BENTUK' });
      const res = await request(app).get(`/api/task/1?sessionId=${sesi.body.sessionId}`);
      expect(res.status).toBe(200);
      const attempt = await prisma.taskAttempt.findUnique({ where: { id: res.body.attemptId } });
      terlihat.add(attempt!.bentuk);
      const harapan = getTaskInstance(attempt!.taskId, attempt!.bentuk)!;
      expect(res.body.task.narrative).toBe(harapan.narrative);
      // Memanggil ulang (mis. halaman dimuat ulang) memberi bentuk yang sama.
      const lagi = await request(app).get(`/api/task/1?sessionId=${sesi.body.sessionId}`);
      expect(lagi.body.task.narrative).toBe(harapan.narrative);
    }
    expect(terlihat.size).toBeGreaterThan(1);
  });
});
