/**
 * POST /api/kota/submit - menyimpan satu sesi eksperimen Kota (instrumen draf 2).
 *
 * Hanya untuk branch theotown-ui. Data DIPISAHKAN dari instrumen 1.1.0:
 *   - kode kelas wajib berawalan DRAF2- ;
 *   - Session.instrumentVersion = 2.0.0-draf ;
 *   - task khusus KOTA-DRAF2 pada level 0, sehingga mesin skoring 1.1.0
 *     tidak pernah membacanya.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { skorKota, SKORING_KOTA_VERSI, type AksiKota } from '../economy/skoringKota.js';
import { BANGUNAN, type Bangunan } from '../economy/ekonomi.js';

export const kotaRouter = Router();

const JENIS = Object.keys(BANGUNAN) as [Bangunan, ...Bangunan[]];
const AKSI = z.discriminatedUnion('tipe', [
  z.object({ tipe: z.literal('pilih'), jenis: z.enum(JENIS), hari: z.number().int().min(1).max(60) }),
  z.object({
    tipe: z.literal('tempatkan'), jenis: z.enum(JENIS), petak: z.number().int().min(0).max(63),
    hari: z.number().int().min(1).max(60), melanggar: z.boolean(),
  }),
  z.object({
    tipe: z.literal('bongkar'), jenis: z.enum(JENIS), petak: z.number().int().min(0).max(63),
    hari: z.number().int().min(1).max(60), bahagiaSebelum: z.number().min(0).max(100), bahagiaSesudah: z.number().min(0).max(100),
  }),
]);

const MASUKAN = z.object({
  studentName: z.string().trim().min(1).max(120),
  classCode: z.string().trim().min(7).max(120).regex(/^DRAF2-/, 'Kode kelas harus berawalan DRAF2-'),
  aksi: z.array(AKSI).max(500),
  akhir: z.object({
    warga: z.number().int().min(0).max(10000),
    bahagia: z.number().int().min(0).max(100),
    bangkrut: z.boolean(),
    hariSelesai: z.number().int().min(1).max(60),
  }),
});

const TASK_ID = 'KOTA-DRAF2';

kotaRouter.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const input = MASUKAN.parse(req.body);
    const aksi = input.aksi as AksiKota[];
    const skor = skorKota(aksi, input.akhir);

    const sesi = await prisma.session.create({
      data: {
        studentName: input.studentName,
        classCode: input.classCode,
        instrumentVersion: SKORING_KOTA_VERSI,
      },
    });
    const percobaan = await prisma.taskAttempt.create({
      data: { sessionId: sesi.id, level: 0, taskId: TASK_ID, finishedAt: new Date() },
    });

    await prisma.eventLog.createMany({
      data: aksi.map((a, i) => ({
        attemptId: percobaan.id,
        sessionId: sesi.id,
        taskId: TASK_ID,
        timestampMs: i + 1,
        eventType: 'kota_aksi',
        payload: JSON.stringify(a),
        isValidAtTime: true,
        durationSinceLastEventMs: 0,
      })),
    });

    const rata = (skor.K1 + skor.K2 + skor.K3 + skor.K4) / 4;
    await prisma.score.create({
      data: {
        attemptId: percobaan.id,
        sessionId: sesi.id,
        taskId: TASK_ID,
        level: 0,
        k1: skor.K1, k2: skor.K2, k3: skor.K3, k4: skor.K4,
        rawSum: skor.K1 + skor.K2 + skor.K3 + skor.K4,
        weightedComposite: Math.round(rata * 10000) / 10000,
        trace: JSON.stringify({ akhir: input.akhir, versi: SKORING_KOTA_VERSI }),
        feedback: JSON.stringify({ claims: [], overallMessage: '' }),
        scoringVersion: SKORING_KOTA_VERSI,
      },
    });

    res.status(201).json({ sessionId: sesi.id, scores: { K1: skor.K1, K2: skor.K2, K3: skor.K3, K4: skor.K4 }, versi: SKORING_KOTA_VERSI });
  }),
);
