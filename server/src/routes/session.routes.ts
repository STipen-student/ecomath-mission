/**
 * POST /api/session - membuat sesi baru siswa.
 * GET  /api/session/:id - status sesi (dipakai client saat memulihkan sesi
 *                         yang terputus, mis. halaman ter-refresh di tengah jalan).
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { CreateSessionSchema, TutorialResultSchema } from '../schemas/api.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const sessionRouter = Router();

sessionRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = CreateSessionSchema.parse(req.body);

    const session = await prisma.session.create({
      data: {
        studentName: input.studentName,
        studentId: input.studentId ?? null,
        classCode: input.classCode,
        // User-Agent dicatat untuk mendeteksi masalah teknis per jenis perangkat
        // saat pengambilan data (mis. seluruh error berasal dari satu tipe HP).
        userAgent: req.header('user-agent')?.slice(0, 300) ?? null,
      },
    });

    res.status(201).json({
      sessionId: session.id,
      studentName: session.studentName,
      classCode: session.classCode,
      startedAt: session.startedAt,
    });
  }),
);

/**
 * POST /api/session/:id/tutorial - mencatat ringkasan tutorial antarmuka.
 *
 * Yang disimpan hanya RINGKASAN (selesai/dilewati, durasi, jumlah salah
 * langkah), bukan event per aksi: tutorial bukan sumber bukti atas klaim mana
 * pun tentang siswa, melainkan kovariat untuk memeriksa apakah antarmuka masih
 * menyumbang varians yang tidak relevan dengan konstruk.
 *
 * Idempoten: pemanggilan ulang menimpa nilai sebelumnya, sehingga siswa yang
 * me-refresh halaman tidak menggandakan catatan.
 */
sessionRouter.post(
  '/:id/tutorial',
  asyncHandler(async (req, res) => {
    const input = TutorialResultSchema.parse(req.body);
    const id = req.params.id!;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');

    await prisma.session.update({
      where: { id },
      data: {
        tutorialStatus: input.status,
        tutorialDurationMs: input.durationMs,
        tutorialMissteps: input.missteps,
        tutorialSteps: input.stepsCompleted,
      },
    });

    res.json({ ok: true });
  }),
);

sessionRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id! },
      include: {
        attempts: {
          orderBy: { level: 'asc' },
          include: { score: true },
        },
      },
    });

    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');

    res.json({
      sessionId: session.id,
      studentName: session.studentName,
      classCode: session.classCode,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      sessionComposite: session.sessionComposite,
      attempts: session.attempts.map((a) => ({
        attemptId: a.id,
        level: a.level,
        taskId: a.taskId,
        finishedAt: a.finishedAt,
        score: a.score
          ? {
              K1: a.score.k1,
              K2: a.score.k2,
              K3: a.score.k3,
              K4: a.score.k4ManualOverride ?? a.score.k4,
              rawSum: a.score.rawSum,
              weightedComposite: a.score.weightedComposite,
            }
          : null,
      })),
    });
  }),
);
