/**
 * Evaluasi kelayakan sebuah titik (x, y) terhadap sistem pertidaksamaan.
 *
 * Modul ini murni (tanpa I/O, tanpa akses database) supaya dapat diuji unit
 * dan diaudit terpisah dari logika endpoint - lihat server/tests/feasibility.test.ts.
 */

import type { Constraint, ConstraintPatch, FeasibilityResult, Point, VariableDomain } from './types.js';

/**
 * Toleransi pembulatan floating point.
 *
 * Dipilih 1e-9 (jauh di bawah step slider terkecil, 0.5) supaya hanya menyerap
 * galat representasi biner - BUKAN menyerap kesalahan siswa. Contoh kasus nyata:
 * 0.04*x + 0.03*y pada L2-SDG11-A menghasilkan sisa desimal yang tanpa epsilon
 * dapat menolak titik yang sebetulnya tepat berada di garis batas.
 */
export const EPS = 1e-9;

/**
 * Normalisasi kendala ke bentuk kanonik "a*x + b*y <= c".
 * Kendala >= dikalikan -1. Kendala tegas (< / >) dipertahankan operatornya
 * dan ditangani terpisah oleh `satisfies`.
 */
export function normalize(k: Constraint): { a: number; b: number; c: number; strict: boolean } {
  const strict = k.op === '<' || k.op === '>';
  if (k.op === '>=' || k.op === '>') {
    return { a: -k.a, b: -k.b, c: -k.c, strict };
  }
  return { a: k.a, b: k.b, c: k.c, strict };
}

/**
 * Slack sebuah kendala pada titik p, dalam bentuk kanonik.
 * Nilai >= 0 berarti kendala terpenuhi; semakin besar semakin longgar.
 */
export function slackOf(k: Constraint, p: Point): number {
  const n = normalize(k);
  return n.c - (n.a * p.x + n.b * p.y);
}

/** Apakah titik p memenuhi kendala k? */
export function satisfies(k: Constraint, p: Point): boolean {
  const n = normalize(k);
  const s = n.c - (n.a * p.x + n.b * p.y);
  return n.strict ? s > EPS : s >= -EPS;
}

/**
 * Evaluasi titik terhadap seluruh kendala.
 * Kendala bounding_box diabaikan karena merupakan batas viewport game,
 * bukan bagian dari model matematis soal.
 */
export function evaluate(constraints: Constraint[], p: Point): FeasibilityResult {
  const violated: string[] = [];
  const slack: Record<string, number> = {};
  for (const k of constraints) {
    if (k.kind === 'bounding_box') continue;
    slack[k.id] = slackOf(k, p);
    if (!satisfies(k, p)) violated.push(k.id);
  }
  return { feasible: violated.length === 0, violated, slack };
}

/**
 * Terapkan patch event distraktor dan hasilkan himpunan kendala baru.
 * Tidak memutasi input - pemanggil memerlukan versi "sebelum" dan "sesudah"
 * event untuk menilai K4 (revisi setelah event).
 */
export function applyPatches(constraints: Constraint[], patches: ConstraintPatch[]): Constraint[] {
  return constraints.map((k) => {
    const patch = patches.find((p) => p.targetId === k.id);
    if (!patch) return { ...k };
    return {
      ...k,
      a: patch.newA ?? k.a,
      b: patch.newB ?? k.b,
      c: patch.newC ?? k.c,
      op: patch.newOp ?? k.op,
      display: patch.newDisplay ?? k.display,
      label: patch.newLabel ?? k.label,
    };
  });
}

/**
 * Pembulatan titik ke domain task.
 * Task bersatuan unit diskret (bus, mesin, panel surya) memakai domain integer;
 * task bersatuan luas/panjang (hektar, meter) memakai domain kontinu dengan
 * pembulatan ke step slider agar sebanding dengan resolusi masukan siswa.
 */
export function snapToDomain(p: Point, domain: VariableDomain, stepX: number, stepY: number): Point {
  if (domain === 'integer') {
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }
  const snap = (v: number, step: number) => Math.round(v / step) * step;
  return { x: snap(p.x, stepX), y: snap(p.y, stepY) };
}

/**
 * Konversi kendala tegas menjadi non-tegas pada domain bilangan bulat.
 * Contoh L1-SDG13-A: "x > y" (jumlah bus listrik harus LEBIH dari bus
 * konvensional) setara "x - y >= 1" pada bilangan bulat. Konversi ini membuat
 * enumerasi titik pojok dan pengecekan kelayakan konsisten satu sama lain.
 *
 * Hanya diterapkan bila seluruh koefisien bulat; bila tidak, kendala tegas
 * dibiarkan apa adanya dan ditangani `satisfies` dengan epsilon.
 */
export function tightenStrictForIntegerDomain(constraints: Constraint[]): Constraint[] {
  return constraints.map((k) => {
    if (k.op !== '<' && k.op !== '>') return k;
    const allIntegral = Number.isInteger(k.a) && Number.isInteger(k.b) && Number.isInteger(k.c);
    if (!allIntegral) return k;
    return k.op === '<'
      ? { ...k, op: '<=' as const, c: k.c - 1 }
      : { ...k, op: '>=' as const, c: k.c + 1 };
  });
}
