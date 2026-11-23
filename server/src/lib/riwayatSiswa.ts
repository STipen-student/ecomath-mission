/**
 * Membangun ulang riwayat pekerjaan satu sesi dari database: kota rancangan
 * akhir tiap level (untuk Peta Wilayah) dan ringkasan skor tiap level. Dipakai
 * laporan guru dan login siswa (melanjutkan pekerjaan).
 */

import { prisma } from '../db.js';
import { getTaskById } from '../tasks/index.js';

function parseJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export interface KotaLevelDto {
  level: number;
  taskId: string;
  judul: string;
  x: number;
  y: number;
  xMax: number;
  yMax: number;
  labelX: string;
  labelY: string;
  unitX: string;
  unitY: string;
  visualX: string;
  visualY: string;
  spriteX?: string;
  spriteY?: string;
  layak: boolean;
}

/** Kota rancangan akhir tiap percobaan (attempt_submit terakhir per percobaan). */
export async function kotaPerLevel(sessionId: string): Promise<KotaLevelDto[]> {
  const attempts = await prisma.taskAttempt.findMany({ where: { sessionId }, orderBy: { level: 'asc' } });
  const submitRows = await prisma.eventLog.findMany({
    where: { sessionId, eventType: 'attempt_submit' },
    orderBy: { timestampMs: 'asc' },
  });
  const akhirPerAttempt = new Map<string, (typeof submitRows)[number]>();
  for (const r of submitRows) akhirPerAttempt.set(r.attemptId, r);
  return attempts.flatMap((a) => {
    const akhir = akhirPerAttempt.get(a.id);
    const task = getTaskById(a.taskId);
    if (!akhir || !task) return [];
    const p = (parseJson(akhir.payload) ?? {}) as { x?: unknown; y?: unknown };
    return [
      {
        level: a.level,
        taskId: a.taskId,
        judul: task.title,
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        xMax: task.variables.x.max,
        yMax: task.variables.y.max,
        labelX: task.variables.x.label,
        labelY: task.variables.y.label,
        unitX: task.variables.x.unit,
        unitY: task.variables.y.unit,
        visualX: task.variables.x.visual,
        visualY: task.variables.y.visual,
        spriteX: task.variables.x.sprite,
        spriteY: task.variables.y.sprite,
        layak: akhir.isValidAtTime,
      },
    ];
  });
}

export interface LevelSelesaiDto {
  level: number;
  taskId: string;
  rawSum: number;
  scores: { K1: number; K2: number; K3: number; K4: number };
  feedback: unknown;
  overallMessage: string;
  assessmentAsLearning: unknown;
}

/** Level yang sudah dinilai, urut level, beserta umpan balik yang disimpan saat submit. */
export async function levelSelesai(sessionId: string): Promise<LevelSelesaiDto[]> {
  const skor = await prisma.score.findMany({ where: { sessionId }, orderBy: { level: 'asc' } });
  return skor.map((s) => {
    const fb = (parseJson(s.feedback) ?? {}) as { claims?: unknown; overallMessage?: unknown; assessmentAsLearning?: unknown };
    const k4 = s.k4ManualOverride ?? s.k4;
    return {
      level: s.level,
      taskId: s.taskId,
      rawSum: s.k1 + s.k2 + s.k3 + k4,
      scores: { K1: s.k1, K2: s.k2, K3: s.k3, K4: k4 },
      feedback: Array.isArray(fb.claims) ? fb.claims : [],
      overallMessage: typeof fb.overallMessage === 'string' ? fb.overallMessage : '',
      assessmentAsLearning: fb.assessmentAsLearning ?? null,
    };
  });
}
