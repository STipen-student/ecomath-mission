/**
 * POST /api/submit - submission akhir satu task, menjalankan mesin skoring.
 *
 * Alur:
 *   1. Catat event attempt_submit dan reflection_response terakhir (bila ada),
 *      supaya skoring dihitung dari log yang LENGKAP - termasuk aksi terakhir
 *      siswa yang mungkin belum sempat terkirim lewat /api/log.
 *   2. Baca SELURUH log percobaan dari database.
 *   3. Jalankan scoreAttempt dan simpan skor beserta jejak auditnya.
 *
 * Skoring selalu dihitung ulang dari log tersimpan, tidak pernah dari nilai yang
 * dikirim client. Konsekuensinya, skor dapat dihitung ulang kapan saja (mis.
 * setelah revisi ambang batas) langsung dari EventLog tanpa kehilangan apa pun.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { SubmitSchema } from '../schemas/api.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { submitLimiter } from '../middleware/rateLimit.js';
import { getTaskById } from '../tasks/index.js';
import { scoreAttempt } from '../scoring/index.js';
import { evaluate } from '../domain/feasibility.js';
import { rowsToRawEvents } from '../lib/eventMapper.js';

export const submitRouter = Router();

submitRouter.post(
  '/',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const input = SubmitSchema.parse(req.body);

    const attempt = await prisma.taskAttempt.findFirst({
      where: { sessionId: input.sessionId, taskId: input.taskId },
    });
    if (!attempt) {
      throw new HttpError(404, `Tidak ada percobaan aktif untuk sesi ${input.sessionId} pada task ${input.taskId}`);
    }

    const task = getTaskById(input.taskId);
    if (!task) throw new HttpError(500, `Task ${input.taskId} tidak ada di bank skenario`);

    const existingEvents = await prisma.eventLog.findMany({
      where: { attemptId: attempt.id },
      orderBy: { timestampMs: 'asc' },
    });

    const distractorShown = existingEvents.find((e) => e.eventType === 'distractor_shown');
    const lastTimestamp = existingEvents.length > 0 ? existingEvents[existingEvents.length - 1]!.timestampMs : 0;

    // Kendala yang berlaku saat submit akhir: pasca-event bila event sudah muncul.
    const activeConstraints =
      distractorShown && task.distractor
        ? task.constraints.map((k) => {
            const patch = task.distractor!.constraintPatches.find((p) => p.targetId === k.id);
            return patch
              ? {
                  ...k,
                  a: patch.newA ?? k.a,
                  b: patch.newB ?? k.b,
                  c: patch.newC ?? k.c,
                  op: patch.newOp ?? k.op,
                }
              : k;
          })
        : task.constraints;

    const finalPoint = { x: input.finalX, y: input.finalY };
    const finalValid = evaluate(activeConstraints, finalPoint).feasible;

    /*
     * Event penutup adalah JARING PENGAMAN, bukan pencatatan ganda.
     *
     * Client sudah mengirim attempt_submit dan reflection_response lewat
     * /api/log. Baris di bawah hanya ditulis bila event itu TIDAK ditemukan -
     * misalnya karena koneksi siswa terputus sebelum sempat terkirim. Tanpa
     * pemeriksaan ini, setiap sesi normal akan memuat dua baris submit dan dua
     * baris refleksi yang identik, sehingga statistik deskriptif seperti
     * rata-rata jumlah percobaan submit menjadi salah saat analisis.
     */
    const parsePayload = (raw: string): Record<string, unknown> => {
      try {
        const v: unknown = JSON.parse(raw);
        return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    };

    const submitTerakhir = [...existingEvents].reverse().find((e) => e.eventType === 'attempt_submit');
    const submitSudahTercatat = (() => {
      if (!submitTerakhir) return false;
      const p = parsePayload(submitTerakhir.payload);
      return Number(p.x) === input.finalX && Number(p.y) === input.finalY;
    })();

    const refleksiTerakhir = [...existingEvents].reverse().find((e) => e.eventType === 'reflection_response');
    const refleksiSudahTercatat = (() => {
      if (!refleksiTerakhir) return false;
      const p = parsePayload(refleksiTerakhir.payload);
      const opsiSama = (p.closedOptionId ?? undefined) === input.reflectionClosedOptionId;
      const teksSama = (p.openText ?? undefined) === input.reflectionOpenText;
      return opsiSama && teksSama;
    })();

    const closingEvents: Array<{
      attemptId: string;
      sessionId: string;
      taskId: string;
      timestampMs: number;
      eventType: string;
      payload: string;
      isValidAtTime: boolean;
      durationSinceLastEventMs: number;
    }> = [];

    if (!submitSudahTercatat) {
      closingEvents.push({
        attemptId: attempt.id,
        sessionId: input.sessionId,
        taskId: input.taskId,
        timestampMs: lastTimestamp + 1,
        eventType: 'attempt_submit',
        payload: JSON.stringify({
          x: input.finalX,
          y: input.finalY,
          phase: distractorShown ? 'post_event' : 'initial',
          source: 'final_submit',
        }),
        isValidAtTime: finalValid,
        durationSinceLastEventMs: 0,
      });
    }

    if ((input.reflectionClosedOptionId || input.reflectionOpenText) && !refleksiSudahTercatat) {
      closingEvents.push({
        attemptId: attempt.id,
        sessionId: input.sessionId,
        taskId: input.taskId,
        timestampMs: lastTimestamp + 2,
        eventType: 'reflection_response',
        payload: JSON.stringify({
          closedOptionId: input.reflectionClosedOptionId,
          openText: input.reflectionOpenText,
        }),
        isValidAtTime: finalValid,
        durationSinceLastEventMs: 0,
      });
    }

    if (closingEvents.length > 0) {
      await prisma.eventLog.createMany({ data: closingEvents });
    }

    // Baca ulang seluruh log - termasuk event penutup - lalu skor.
    const allRows = await prisma.eventLog.findMany({
      where: { attemptId: attempt.id },
      orderBy: { timestampMs: 'asc' },
    });
    const result = scoreAttempt(task, rowsToRawEvents(allRows));

    const trace = JSON.stringify({
      claims: result.claims,
      observablesRingkas: {
        variablesCorrect: result.observables.variablesCorrect,
        constraintCountWritten: result.observables.constraintCountWritten,
        constraintCountCorrect: result.observables.constraintCountCorrect,
        cornerPointsChecked: result.observables.cornerPointsChecked,
        boundaryViolationCount: result.observables.boundaryViolationCount,
        finalPosition: result.observables.finalPosition,
        finalZ: result.observables.finalZ,
        optimalZ: result.observables.optimalZ,
        relativeGap: result.observables.relativeGap,
        distractorFired: result.observables.distractorFired,
        postEventValid: result.observables.postEventValid,
        planningTimeMs: result.observables.planningTimeMs,
        totalDurationMs: result.observables.totalDurationMs,
      },
    });

    // Umpan balik yang BENAR-BENAR ditampilkan ke siswa, disimpan apa adanya.
    // scoring/feedback.ts dapat direvisi di kemudian hari; tanpa penyimpanan ini,
    // catatan "apa yang dilihat siswa saat submit" akan hilang begitu kalimatnya
    // berubah, karena trace hanya memuat deskriptor rubrik teknis untuk peneliti.
    const feedback = JSON.stringify({
      claims: result.studentFeedback,
      overallMessage: result.overallMessage,
    });

    const score = await prisma.score.upsert({
      where: { attemptId: attempt.id },
      create: {
        attemptId: attempt.id,
        sessionId: input.sessionId,
        taskId: input.taskId,
        level: task.level,
        k1: result.K1,
        k2: result.K2,
        k3: result.K3,
        k4: result.K4,
        rawSum: result.rawSum,
        weightedComposite: result.weightedComposite,
        trace,
        feedback,
        scoringVersion: result.scoringVersion,
      },
      update: {
        k1: result.K1,
        k2: result.K2,
        k3: result.K3,
        k4: result.K4,
        rawSum: result.rawSum,
        weightedComposite: result.weightedComposite,
        trace,
        feedback,
        scoringVersion: result.scoringVersion,
        computedAt: new Date(),
      },
    });

    await prisma.taskAttempt.update({
      where: { id: attempt.id },
      data: { finishedAt: new Date() },
    });

    // Perbarui komposit sesi = rata-rata komposit seluruh percobaan yang selesai.
    const sessionScores = await prisma.score.findMany({
      where: { sessionId: input.sessionId },
      select: { weightedComposite: true },
    });
    const sessionComposite =
      sessionScores.length > 0
        ? Math.round((sessionScores.reduce((s, x) => s + x.weightedComposite, 0) / sessionScores.length) * 10000) / 10000
        : null;

    await prisma.session.update({
      where: { id: input.sessionId },
      data: {
        sessionComposite,
        ...(input.finishSession ? { finishedAt: new Date() } : {}),
      },
    });

    res.json({
      scoreId: score.id,
      taskId: task.id,
      level: task.level,
      scores: { K1: result.K1, K2: result.K2, K3: result.K3, K4: result.K4 },
      rawSum: result.rawSum,
      weightedComposite: result.weightedComposite,
      sessionComposite,
      finalPositionValid: result.observables.finalPositionValid,
      /**
       * Umpan balik untuk siswa.
       *
       * `feedback` memakai bahasa siswa (scoring/feedback.ts); `rubric` memuat
       * deskriptor asli untuk keperluan audit dan tampilan guru. Nilai optimum
       * hanya diberitahukan SETELAH submit, sehingga tidak dapat dipakai
       * menebak jawaban sebelum mengerjakan.
       */
      feedback: result.studentFeedback,
      overallMessage: result.overallMessage,
      rubric: result.claims.map((c) => ({
        claim: c.claim,
        score: c.score,
        descriptor: c.descriptor,
        reasons: c.reasons,
      })),
      optimum:
        task.objective.type === 'none'
          ? null
          : { point: result.observables.optimalPoint, z: result.observables.optimalZ },
      scoringVersion: result.scoringVersion,
    });
  }),
);
