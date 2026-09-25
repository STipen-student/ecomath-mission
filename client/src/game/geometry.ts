/**
 * Evaluasi kendala di sisi client, untuk validasi visual real-time.
 *
 * CATATAN DUPLIKASI YANG DISENGAJA:
 * Logika serupa ada di server (server/src/domain/feasibility.ts). Keduanya
 * TIDAK dijadikan satu paket bersama karena Panduan Deployment menempatkan
 * client dan server sebagai dua project terpisah (Vercel root = client/,
 * Railway root = server/), sehingga impor lintas folder akan gagal saat build.
 *
 * Duplikasinya aman karena berkas ini hanya menghitung a*x + b*y dari koefisien
 * yang dikirim API - tidak memuat satu pun aturan rubrik. Server tetap menjadi
 * satu-satunya penentu skor, dan kelayakan pada saat submit selalu dihitung
 * ulang di server.
 */

import type { ConstraintDto } from '../api/types.js';

const EPS = 1e-9;

export interface FeasibilityView {
  feasible: boolean;
  violated: Set<string>;
  /** Slack per kendala: >= 0 berarti terpenuhi. Dipakai untuk progress bar. */
  slack: Record<string, number>;
}

export function satisfies(k: ConstraintDto, x: number, y: number): boolean {
  const lhs = k.a * x + k.b * y;
  switch (k.op) {
    case '<=':
      return lhs <= k.c + EPS;
    case '>=':
      return lhs >= k.c - EPS;
    case '<':
      return lhs < k.c - EPS;
    case '>':
      return lhs > k.c + EPS;
  }
}

export function evaluate(constraints: ConstraintDto[], x: number, y: number): FeasibilityView {
  const violated = new Set<string>();
  const slack: Record<string, number> = {};

  for (const k of constraints) {
    if (k.kind === 'bounding_box') continue;
    const lhs = k.a * x + k.b * y;
    // Slack dinormalisasi ke bentuk "<=" supaya tanda positif selalu berarti
    // kendala terpenuhi, terlepas dari arah pertidaksamaan aslinya.
    slack[k.id] = k.op === '>=' || k.op === '>' ? lhs - k.c : k.c - lhs;
    if (!satisfies(k, x, y)) violated.add(k.id);
  }

  return { feasible: violated.size === 0, violated, slack };
}

/** Nilai fungsi tujuan pada satu titik; null bila task tanpa fungsi tujuan. */
export function objectiveValue(objective: { type: string; cx: number; cy: number }, x: number, y: number): number | null {
  if (objective.type === 'none') return null;
  return objective.cx * x + objective.cy * y;
}

/**
 * Titik pojok daerah penyelesaian, dihitung ulang di client hanya untuk
 * MENYOROTNYA di peta sebagai kandidat yang dapat diperiksa siswa. Nilai
 * optimum tidak ditandai - siswa sendiri yang harus mengujinya.
 */
export function cornerCandidates(constraints: ConstraintDto[], xMax: number, yMax: number): Array<{ x: number; y: number }> {
  const lines = [
    ...constraints.filter((k) => k.kind !== 'bounding_box' && !(k.a === 0 && k.b === 0)),
    { id: '__bx', label: '', a: 1, b: 0, op: '<=' as const, c: xMax, kind: 'bounding_box' as const, display: '' },
    { id: '__by', label: '', a: 0, b: 1, op: '<=' as const, c: yMax, kind: 'bounding_box' as const, display: '' },
  ];

  const found: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const k1 = lines[i]!;
      const k2 = lines[j]!;
      const det = k1.a * k2.b - k2.a * k1.b;
      if (Math.abs(det) < 1e-12) continue;

      const x = (k1.c * k2.b - k2.c * k1.b) / det;
      const y = (k1.a * k2.c - k2.a * k1.c) / det;
      if (x < -EPS || y < -EPS || x > xMax + EPS || y > yMax + EPS) continue;
      if (!evaluate(constraints, x, y).feasible) continue;

      const bulat = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
      if (!found.some((p) => Math.abs(p.x - bulat.x) < 0.01 && Math.abs(p.y - bulat.y) < 0.01)) {
        found.push(bulat);
      }
    }
  }

  return found.sort((p, q) => p.x - q.x || p.y - q.y);
}
