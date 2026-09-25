/**
 * POST /api/task/:attemptId/distractor - memicu event kebijakan Level 4.
 *
 * Endpoint ini di luar daftar minimum yang diminta, tetapi diperlukan karena
 * dua alasan yang keduanya menyangkut kesahihan data:
 *
 *   1. Narasi dan kendala baru event distraktor TIDAK boleh ikut terkirim
 *      bersama task di awal - siswa dapat membacanya lewat panel jaringan
 *      peramban dan "menyiapkan" jawaban sebelum event muncul.
 *   2. Penanda waktu munculnya event menentukan pemisahan aksi "sebelum" dan
 *      "sesudah" pada penilaian K4. Bila client yang menentukannya, timeline
 *      bukti K4 bergantung pada jam perangkat siswa.
 *
 * Server memverifikasi sendiri bahwa syarat pemicu benar-benar terpenuhi:
 * titik yang diklaim siswa dihitung ulang kelayakannya di sini, tidak dipercaya
 * begitu saja dari client.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { getTaskById } from '../tasks/index.js';
import { applyPatches, evaluate } from '../domain/feasibility.js';
import { THRESHOLDS } from '../scoring/thresholds.js';

export const distractorRouter = Router();

const TriggerSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  /** Waktu sejak task dimulai menurut client; dipakai hanya untuk pemicu cadangan. */
  elapsedMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
});

distractorRouter.post(
  '/:attemptId/distractor',
  asyncHandler(async (req, res) => {
    const input = TriggerSchema.parse(req.body);
    const attemptId = req.params.attemptId!;

    const attempt = await prisma.taskAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new HttpError(404, 'Percobaan tidak ditemukan');

    const task = getTaskById(attempt.taskId);
    if (!task) throw new HttpError(500, `Task ${attempt.taskId} tidak ada di bank skenario`);
    if (!task.distractor) throw new HttpError(400, 'Task ini tidak memiliki event distraktor');

    // Idempoten: sekali muncul, event tidak dimunculkan ulang.
    const already = await prisma.eventLog.findFirst({
      where: { attemptId, eventType: 'distractor_shown' },
      orderBy: { timestampMs: 'asc' },
    });

    const patched = applyPatches(task.constraints, task.distractor.constraintPatches);
    const objectiveAfter = task.distractor.objectivePatch
      ? { ...task.objective, ...task.distractor.objectivePatch }
      : task.objective;

    const responseBody = {
      eventId: task.distractor.id,
      narrative: task.distractor.narrative,
      instruction: task.distractor.instruction,
      constraints: patched.map((k) => ({
        id: k.id,
        label: k.label,
        a: k.a,
        b: k.b,
        op: k.op,
        c: k.c,
        kind: k.kind,
        display: k.display,
      })),
      objective: objectiveAfter,
      changedConstraintIds: task.distractor.constraintPatches.map((p) => p.targetId),
    };

    if (already) {
      res.json({ ...responseBody, alreadyShown: true, trigger: 'first_valid_submit' });
      return;
    }

    // Verifikasi syarat pemicu di sisi server.
    const feasible = evaluate(task.constraints, { x: input.x, y: input.y }).feasible;
    const timeFallback = input.elapsedMs >= THRESHOLDS.distractorFallbackMs;

    if (!feasible && !timeFallback) {
      throw new HttpError(
        409,
        'Event belum dapat dimunculkan: solusi awal belum memenuhi seluruh kendala dan batas waktu cadangan belum tercapai',
      );
    }

    const trigger = feasible ? 'first_valid_submit' : 'time_fallback';

    await prisma.eventLog.create({
      data: {
        attemptId,
        sessionId: attempt.sessionId,
        taskId: attempt.taskId,
        timestampMs: input.elapsedMs,
        eventType: 'distractor_shown',
        payload: JSON.stringify({ eventId: task.distractor.id, trigger }),
        isValidAtTime: feasible,
        durationSinceLastEventMs: 0,
      },
    });

    res.json({ ...responseBody, alreadyShown: false, trigger });
  }),
);
