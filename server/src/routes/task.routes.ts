/**
 * GET /api/task/:level - mengambil satu task sesuai Assembly Rule level tersebut.
 *
 * Bila `sessionId` disertakan, pemberian task bersifat IDEMPOTEN: percobaan
 * (TaskAttempt) untuk level itu dibuat sekali, dan permintaan berikutnya
 * mengembalikan task yang sama. Tanpa sifat ini, siswa yang me-refresh halaman
 * akan mendapat soal berbeda di tengah pengerjaan dan log-nya menjadi campuran
 * dua task - data yang tidak dapat dipakai.
 *
 * Kunci jawaban (titik optimum, nilai Z) TIDAK PERNAH dikirim ke client, supaya
 * tidak dapat dibaca siswa lewat panel jaringan peramban.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { TaskQuerySchema } from '../schemas/api.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { ASSEMBLY_RULES, getTaskById, pickTaskForLevel } from '../tasks/index.js';
import { selectAdaptiveTask, surfaceLoad, type PriorClaimScores } from '../tasks/adaptive.js';
import { isAdaptiveEnabled } from '../tasks/adaptiveState.js';
import type { AdaptiveSelectionPayload } from '../domain/events.js';
import type { SdgContext, TaskDefinition } from '../domain/types.js';

export const taskRouter = Router();

/**
 * Bentuk task yang aman dikirim ke client.
 * Kendala non-negativitas ikut dikirim karena perlu digambar pada grafik,
 * tetapi ditandai agar panel kendala dapat menampilkannya terpisah.
 */
function toClientTask(task: TaskDefinition) {
  return {
    id: task.id,
    level: task.level,
    sdgContext: task.sdgContext,
    title: task.title,
    narrative: task.narrative,
    dataTable: task.dataTable ?? null,
    variables: task.variables,
    constraints: task.constraints.map((k) => ({
      id: k.id,
      label: k.label,
      a: k.a,
      b: k.b,
      op: k.op,
      c: k.c,
      kind: k.kind,
      display: k.display,
    })),
    objective: task.objective,
    domain: task.domain,
    representation: task.representation,
    goalOptions: task.goalOptions.map((g) => ({ id: g.id, text: g.text })),
    variableOptions: task.variableOptions.map((v) => ({ id: v.id, text: v.text, assignsTo: v.assignsTo })),
    reflection: {
      closed: {
        prompt: task.reflection.closed.prompt,
        options: task.reflection.closed.options.map((o) => ({ id: o.id, text: o.text })),
      },
      openPrompt: task.reflection.openPrompt,
    },
    expectedConstraintCount: task.expectedConstraintCount,
    gameInteraction: task.gameInteraction,
    /** Ada tidaknya event distraktor; narasinya baru dikirim saat event dipicu. */
    hasDistractor: task.distractor !== null,
  };
}

taskRouter.get(
  '/:level',
  asyncHandler(async (req, res) => {
    const level = Number(req.params.level);
    if (!Number.isInteger(level) || !ASSEMBLY_RULES[level]) {
      throw new HttpError(400, 'Level harus salah satu dari 1, 2, 3, atau 4');
    }

    const query = TaskQuerySchema.parse(req.query);

    // Sesi diketahui: kembalikan percobaan yang sudah ada, atau buat baru.
    if (query.sessionId) {
      const session = await prisma.session.findUnique({ where: { id: query.sessionId } });
      if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');

      const existing = await prisma.taskAttempt.findUnique({
        where: { sessionId_level: { sessionId: query.sessionId, level } },
      });

      if (existing) {
        const task = getTaskById(existing.taskId);
        if (!task) throw new HttpError(500, `Task ${existing.taskId} tidak ada di bank skenario`);
        res.json({ attemptId: existing.id, task: toClientTask(task), resumed: true });
        return;
      }

      // Hindari mengulang konteks SDG yang sudah dipakai pada level sebelumnya,
      // agar tiap siswa terpapar variasi konteks dalam satu sesi.
      const priorAttempts = await prisma.taskAttempt.findMany({
        where: { sessionId: query.sessionId },
        select: { taskId: true, score: { select: { k1: true, k2: true, k3: true, k4: true } } },
      });
      const usedContexts = priorAttempts
        .map((a) => getTaskById(a.taskId)?.sdgContext)
        .filter((s): s is SdgContext => Boolean(s));

      const adaptif = isAdaptiveEnabled();

      let picked: TaskDefinition | undefined;
      let jejak: AdaptiveSelectionPayload | null = null;

      if (query.taskId) {
        // Permintaan task eksplisit (pratinjau guru / uji) melewati kedua jalur.
        picked = getTaskById(query.taskId);
      } else if (adaptif) {
        /**
         * Sinyal kemampuan: skor klaim level-level yang SUDAH selesai dinilai.
         * Percobaan yang belum disubmit tidak punya baris Score dan otomatis
         * terabaikan - siswa yang meninggalkan satu level di tengah jalan tidak
         * membawa sinyal palsu ke pemilihan berikutnya.
         */
        const priors: PriorClaimScores[] = priorAttempts
          .map((a) => a.score)
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map((s) => ({ K1: s.k1, K2: s.k2, K3: s.k3, K4: s.k4 }));

        const choice = selectAdaptiveTask(level, priors, { usedContexts });
        if (choice) {
          picked = choice.task;
          jejak = {
            level,
            mode: 'adaptive',
            chosenTaskId: choice.task.id,
            band: choice.band,
            claimMean: choice.claimMean === null ? null : Math.round(choice.claimMean * 100) / 100,
            basedOnClaims: choice.basedOnClaims,
            ranked: choice.ranked,
            tanpaRuangAdaptif: choice.tanpaRuangAdaptif,
          };
        }
      } else {
        const candidates = ['SDG11', 'SDG13', 'SDG11&13'] as const;
        const unused = candidates.filter((ctx) => !usedContexts.includes(ctx));
        const preferContext =
          query.preferContext ?? (unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : undefined);
        picked = pickTaskForLevel(level, { preferContext });
      }

      if (!picked) throw new HttpError(404, `Tidak ada task tersedia untuk level ${level}`);

      const attempt = await prisma.taskAttempt.create({
        data: { sessionId: query.sessionId, level, taskId: picked.id },
      });

      /**
       * Catat keputusan pemilihan pada SETIAP percobaan, termasuk saat mode
       * adaptif mati. Tanpa baris ini, data hasil administrasi adaptif dan
       * fixed-form tidak dapat dipisahkan saat analisis.
       */
      const payload: AdaptiveSelectionPayload = jejak ?? {
        level,
        mode: 'fixed',
        chosenTaskId: picked.id,
        band: 'belum_ada',
        claimMean: null,
        basedOnClaims: picked.dominantClaims,
        ranked: [{ taskId: picked.id, surfaceLoad: surfaceLoad(picked) }],
        tanpaRuangAdaptif: false,
      };

      await prisma.eventLog.create({
        data: {
          attemptId: attempt.id,
          sessionId: query.sessionId,
          taskId: picked.id,
          timestampMs: 0,
          eventType: 'adaptive_selection',
          payload: JSON.stringify(payload),
          isValidAtTime: true,
          durationSinceLastEventMs: 0,
        },
      });

      res.json({ attemptId: attempt.id, task: toClientTask(picked), resumed: false });
      return;
    }

    // Tanpa sesi: pratinjau task saja (dipakai guru untuk melihat bank soal).
    const picked = query.taskId ? getTaskById(query.taskId) : pickTaskForLevel(level, { preferContext: query.preferContext });
    if (!picked) throw new HttpError(404, `Tidak ada task tersedia untuk level ${level}`);
    res.json({ attemptId: null, task: toClientTask(picked), resumed: false });
  }),
);
