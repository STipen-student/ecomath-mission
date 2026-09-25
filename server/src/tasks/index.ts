/**
 * Registry bank skenario + Assembly Rule (docs/ECD_Framework.md Bagian 4.2).
 *
 * Bank soal disimpan sebagai DATA terstruktur di level1-4.ts, bukan di dalam
 * logika endpoint. Menambah varian baru cukup dengan menambah objek pada berkas
 * level yang sesuai - tidak ada kode endpoint maupun kode client yang berubah.
 */

import type { SdgContext, TaskDefinition } from '../domain/types.js';
import { LEVEL_1_TASKS } from './level1.js';
import { LEVEL_2_TASKS } from './level2.js';
import { LEVEL_3_TASKS } from './level3.js';
import { LEVEL_4_TASKS } from './level4.js';

export const TASK_BANK: TaskDefinition[] = [
  ...LEVEL_1_TASKS,
  ...LEVEL_2_TASKS,
  ...LEVEL_3_TASKS,
  ...LEVEL_4_TASKS,
];

const BY_ID = new Map(TASK_BANK.map((t) => [t.id, t]));

export function getTaskById(id: string): TaskDefinition | undefined {
  return BY_ID.get(id);
}

export function tasksByLevel(level: number): TaskDefinition[] {
  return TASK_BANK.filter((t) => t.level === level);
}

/** Batasan yang WAJIB dipenuhi setiap varian pada level tertentu (Bagian 4.2). */
export interface LevelAssemblyRule {
  level: 1 | 2 | 3 | 4;
  minConstraints: number;
  maxConstraints: number;
  requiresDistractor: boolean;
  requiresImplicitConstraint: boolean;
  /** Fokus bukti dominan pada level ini. */
  evidenceFocus: string;
}

export const ASSEMBLY_RULES: Record<number, LevelAssemblyRule> = {
  1: { level: 1, minConstraints: 1, maxConstraints: 2, requiresDistractor: false, requiresImplicitConstraint: false, evidenceFocus: 'K1 dominan' },
  2: { level: 2, minConstraints: 2, maxConstraints: 3, requiresDistractor: false, requiresImplicitConstraint: false, evidenceFocus: 'K1-K2' },
  3: { level: 3, minConstraints: 2, maxConstraints: 3, requiresDistractor: false, requiresImplicitConstraint: false, evidenceFocus: 'K2-K3' },
  4: { level: 4, minConstraints: 3, maxConstraints: 4, requiresDistractor: true, requiresImplicitConstraint: true, evidenceFocus: 'K3-K4, bobot K4 diperbesar' },
};

/**
 * Pengacakan berstrata: satu varian dipilih acak dari level yang diminta.
 *
 * Bila `preferContext` diberikan, sistem mengutamakan varian dengan konteks SDG
 * tersebut - berguna untuk desain penelitian yang ingin menyeimbangkan paparan
 * konteks antar-siswa. Bila tidak ada varian yang cocok, sistem jatuh kembali ke
 * seluruh varian level tersebut sehingga siswa tidak pernah kehabisan soal.
 *
 * `rng` dapat disuntikkan agar pengujian bersifat deterministik.
 */
export function pickTaskForLevel(
  level: number,
  opts: { preferContext?: SdgContext; exclude?: string[]; rng?: () => number } = {},
): TaskDefinition | undefined {
  const rng = opts.rng ?? Math.random;
  let pool = tasksByLevel(level);
  if (pool.length === 0) return undefined;

  if (opts.exclude?.length) {
    const filtered = pool.filter((t) => !opts.exclude!.includes(t.id));
    if (filtered.length > 0) pool = filtered;
  }
  if (opts.preferContext) {
    const byContext = pool.filter((t) => t.sdgContext === opts.preferContext);
    if (byContext.length > 0) pool = byContext;
  }
  const index = Math.floor(rng() * pool.length);
  return pool[Math.min(index, pool.length - 1)];
}

/**
 * Jumlah kendala substantif sebuah task (eksplisit + implisit),
 * tidak menghitung non-negativitas maupun bounding box.
 */
export function substantiveConstraintCount(task: TaskDefinition): number {
  return task.constraints.filter((k) => k.kind === 'explicit' || k.kind === 'implicit').length;
}

/** Pelanggaran assembly rule pada satu task, kosong bila task valid. */
export function validateAgainstAssemblyRule(task: TaskDefinition): string[] {
  const rule = ASSEMBLY_RULES[task.level];
  const problems: string[] = [];
  if (!rule) return [`Level ${task.level} tidak memiliki assembly rule`];

  const n = substantiveConstraintCount(task);
  if (n < rule.minConstraints || n > rule.maxConstraints) {
    problems.push(`jumlah kendala ${n} di luar rentang ${rule.minConstraints}-${rule.maxConstraints}`);
  }
  if (rule.requiresDistractor && !task.distractor) {
    problems.push('Level ini WAJIB memiliki event distraktor');
  }
  if (!rule.requiresDistractor && task.distractor) {
    problems.push('Level ini tidak boleh memiliki event distraktor');
  }
  if (rule.requiresImplicitConstraint && !task.constraints.some((k) => k.kind === 'implicit')) {
    problems.push('Level ini WAJIB memiliki minimal satu kendala implisit');
  }
  if (task.expectedConstraintCount !== n) {
    problems.push(`expectedConstraintCount (${task.expectedConstraintCount}) tidak sama dengan jumlah kendala substantif (${n})`);
  }
  return problems;
}

export { LEVEL_1_TASKS, LEVEL_2_TASKS, LEVEL_3_TASKS, LEVEL_4_TASKS };
