/**
 * POST /api/log - menerima event log dari client.
 *
 * Menerima satu event maupun array event (lihat schemas/api.ts). Penulisan
 * dilakukan dengan createMany agar satu kiriman batch menjadi satu perjalanan
 * ke database - penting saat 30 siswa menggeser slider secara bersamaan.
 *
 * Kegagalan menyimpan log berarti kehilangan bukti penelitian, sehingga endpoint
 * ini sengaja PERMISIF terhadap event yang tiba terlambat atau dobel: event tetap
 * disimpan apa adanya, dan `receivedAt` mencatat kapan server menerimanya
 * sehingga anomali jaringan dapat dipisahkan saat analisis.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { LogBodySchema, type EventInput } from '../schemas/api.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logLimiter } from '../middleware/rateLimit.js';

export const logRouter = Router();

logRouter.post(
  '/',
  logLimiter,
  asyncHandler(async (req, res) => {
    const parsed = LogBodySchema.parse(req.body);
    const events: EventInput[] = Array.isArray(parsed) ? parsed : [parsed];

    // Seluruh event dalam satu kiriman harus berasal dari sesi dan task yang sama;
    // campuran menandakan bug pada client yang lebih baik ketahuan sekarang
    // daripada menghasilkan log yang salah tempat.
    const sessionIds = new Set(events.map((e) => e.session_id));
    const taskIds = new Set(events.map((e) => e.task_id));
    if (sessionIds.size > 1 || taskIds.size > 1) {
      throw new HttpError(400, 'Satu kiriman log hanya boleh berisi event dari satu sesi dan satu task');
    }

    const sessionId = events[0]!.session_id;
    const taskId = events[0]!.task_id;

    const attempt = await prisma.taskAttempt.findFirst({
      where: { sessionId, taskId },
      select: { id: true },
    });
    if (!attempt) {
      throw new HttpError(404, `Tidak ada percobaan aktif untuk sesi ${sessionId} pada task ${taskId}`);
    }

    await prisma.eventLog.createMany({
      data: events.map((e) => ({
        attemptId: attempt.id,
        sessionId,
        taskId,
        timestampMs: e.timestamp_ms,
        eventType: e.event_type,
        payload: JSON.stringify(e.payload),
        isValidAtTime: e.is_valid_at_time,
        durationSinceLastEventMs: e.duration_since_last_event_ms,
      })),
    });

    res.status(201).json({ accepted: events.length });
  }),
);
