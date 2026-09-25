/**
 * Penentuan daerah penyelesaian, titik pojok, dan titik optimum.
 *
 * Metode: enumerasi titik pojok (vertex enumeration). Untuk program linear dua
 * variabel dengan daerah penyelesaian berupa poligon konveks, nilai optimum
 * fungsi tujuan linear selalu tercapai pada salah satu titik pojok - inilah
 * dasar metode "uji titik pojok" yang diajarkan pada materi SPtLDV, sehingga
 * mesin skoring menghitung dengan cara yang sama dengan yang dipelajari siswa.
 *
 * Untuk task berdomain bilangan bulat (unit bus/mesin/panel), titik pojok dapat
 * jatuh pada koordinat pecahan yang tidak mungkin dipilih siswa. Pada kasus itu
 * pencarian dilakukan dengan penelusuran kisi bilangan bulat (lattice) di dalam
 * bounding box - ukuran soal pada bank skenario kecil (<= ~250x250) sehingga
 * penelusuran eksak jauh lebih murah daripada risiko salah hitung optimum.
 */

import type { Constraint, OptimumResult, Point, TaskDefinition } from './types.js';
import { EPS, evaluate, tightenStrictForIntegerDomain } from './feasibility.js';

/** Kendala bounding box dari batas slider - menjamin daerah penyelesaian terbatas. */
export function boundingBoxConstraints(task: TaskDefinition): Constraint[] {
  return [
    {
      id: '__bbox_x',
      label: 'Batas peta (x)',
      a: 1,
      b: 0,
      op: '<=',
      c: task.variables.x.max,
      kind: 'bounding_box',
      display: `x \u2264 ${task.variables.x.max}`,
    },
    {
      id: '__bbox_y',
      label: 'Batas peta (y)',
      a: 0,
      b: 1,
      op: '<=',
      c: task.variables.y.max,
      kind: 'bounding_box',
      display: `y \u2264 ${task.variables.y.max}`,
    },
  ];
}

/**
 * Perpotongan dua garis batas a1x+b1y=c1 dan a2x+b2y=c2.
 * Mengembalikan null bila sejajar/berimpit (determinan mendekati nol).
 */
function intersect(k1: Constraint, k2: Constraint): Point | null {
  const det = k1.a * k2.b - k2.a * k1.b;
  if (Math.abs(det) < 1e-12) return null;
  return {
    x: (k1.c * k2.b - k2.c * k1.b) / det,
    y: (k1.a * k2.c - k2.a * k1.c) / det,
  };
}

/** Buang titik duplikat akibat lebih dari dua garis berpotongan di titik sama. */
function dedupe(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (!out.some((q) => Math.abs(q.x - p.x) < 1e-7 && Math.abs(q.y - p.y) < 1e-7)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Seluruh titik pojok daerah penyelesaian.
 * `constraints` harus sudah mencakup non-negativitas dan bounding box.
 */
export function cornerPoints(constraints: Constraint[]): Point[] {
  const active = constraints.filter((k) => !(k.a === 0 && k.b === 0));
  const candidates: Point[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const p = intersect(active[i]!, active[j]!);
      if (p) candidates.push(p);
    }
  }
  // Titik pojok harus memenuhi SELURUH kendala, termasuk bounding box.
  const feasible = candidates.filter((p) =>
    active.every((k) => {
      const strict = k.op === '<' || k.op === '>';
      const sign = k.op === '>=' || k.op === '>' ? -1 : 1;
      const s = sign * k.c - (sign * k.a * p.x + sign * k.b * p.y);
      // Titik pojok berada TEPAT di garis batas, maka kendala tegas dievaluasi
      // longgar di sini; penyaringan ketat dilakukan oleh pemanggil bila perlu.
      return strict ? s >= -EPS : s >= -EPS;
    }),
  );
  return dedupe(feasible).map((p) => ({
    x: Math.abs(p.x) < 1e-9 ? 0 : p.x,
    y: Math.abs(p.y) < 1e-9 ? 0 : p.y,
  }));
}

/** Nilai fungsi tujuan pada satu titik. */
export function evaluateObjective(task: TaskDefinition, p: Point): number | null {
  if (task.objective.type === 'none') return null;
  return task.objective.cx * p.x + task.objective.cy * p.y;
}

/**
 * Cari titik optimum sebuah task.
 *
 * @param task            definisi task
 * @param overrides       kendala/objective pengganti (dipakai setelah event distraktor Level 4)
 */
export function findOptimum(
  task: TaskDefinition,
  overrides?: { constraints?: Constraint[]; objective?: TaskDefinition['objective'] },
): OptimumResult {
  const objective = overrides?.objective ?? task.objective;
  const base = overrides?.constraints ?? task.constraints;
  const withBox = [...base, ...boundingBoxConstraints(task)];
  const constraints =
    task.domain === 'integer' ? tightenStrictForIntegerDomain(withBox) : withBox;

  const corners = cornerPoints(constraints).filter((p) => evaluate(constraints, p).feasible);

  if (objective.type === 'none') {
    return { point: null, z: null, corners, empty: corners.length === 0 };
  }

  const better = (a: number, b: number) => (objective.type === 'max' ? a > b : a < b);
  const zAt = (p: Point) => objective.cx * p.x + objective.cy * p.y;

  if (task.domain === 'integer') {
    // Penelusuran kisi bilangan bulat: titik pojok pecahan tidak dapat dipilih siswa.
    let best: Point | null = null;
    let bestZ = objective.type === 'max' ? -Infinity : Infinity;
    const xMax = Math.floor(task.variables.x.max);
    const yMax = Math.floor(task.variables.y.max);
    for (let x = 0; x <= xMax; x++) {
      for (let y = 0; y <= yMax; y++) {
        const p = { x, y };
        if (!evaluate(constraints, p).feasible) continue;
        const z = zAt(p);
        if (best === null || better(z, bestZ)) {
          best = p;
          bestZ = z;
        }
      }
    }
    return {
      point: best,
      z: best ? bestZ : null,
      corners,
      empty: best === null,
    };
  }

  if (corners.length === 0) {
    return { point: null, z: null, corners: [], empty: true };
  }

  let best = corners[0]!;
  let bestZ = zAt(best);
  for (const p of corners.slice(1)) {
    const z = zAt(p);
    if (better(z, bestZ)) {
      best = p;
      bestZ = z;
    }
  }
  return { point: best, z: bestZ, corners, empty: false };
}

/**
 * Selisih relatif nilai fungsi tujuan siswa terhadap nilai optimum.
 *
 * Dinormalisasi terhadap RENTANG nilai Z pada titik-titik pojok, bukan terhadap
 * |Z*| saja. Alasannya: pada soal minimisasi biaya, |Z*| bernilai ribuan
 * sehingga selisih 5% dari |Z*| bisa jauh lebih longgar daripada perbedaan
 * antar-titik-pojok yang sesungguhnya membedakan siswa. Normalisasi terhadap
 * rentang membuat toleransi 5% berarti sama di seluruh bank soal.
 *
 * Mengembalikan 0 bila siswa tepat di titik optimum, 1 bila di titik pojok
 * terburuk, dan null bila task tanpa fungsi tujuan.
 */
export function relativeGap(
  task: TaskDefinition,
  studentPoint: Point,
  optimum: OptimumResult,
  overrideObjective?: TaskDefinition['objective'],
): number | null {
  const objective = overrideObjective ?? task.objective;
  if (objective.type === 'none' || optimum.z === null) return null;

  const zStudent = objective.cx * studentPoint.x + objective.cy * studentPoint.y;
  const zValues = optimum.corners.map((p) => objective.cx * p.x + objective.cy * p.y);
  if (zValues.length === 0) return null;

  const zBest = optimum.z;
  const zWorst = objective.type === 'max' ? Math.min(...zValues) : Math.max(...zValues);
  const span = Math.abs(zBest - zWorst);

  // Daerah penyelesaian degenerate (semua titik pojok bernilai sama):
  // gunakan perbandingan absolut terhadap |zBest|.
  if (span < 1e-9) {
    const denom = Math.max(Math.abs(zBest), 1);
    return Math.abs(zBest - zStudent) / denom;
  }
  return Math.abs(zBest - zStudent) / span;
}
