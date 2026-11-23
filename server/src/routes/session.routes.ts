/**
 * POST /api/session - membuat sesi baru siswa.
 * GET  /api/session/:id - status sesi (dipakai client saat memulihkan sesi
 *                         yang terputus, mis. halaman ter-refresh di tengah jalan).
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { CreateSessionSchema, LoginSchema, ProgresSchema, TutorialResultSchema } from '../schemas/api.js';
import { cocokPin, hashPin, PIN_DIRESET } from '../lib/pin.js';
import { kotaPerLevel, levelSelesai } from '../lib/riwayatSiswa.js';
import { logLimiter, loginLimiter } from '../middleware/rateLimit.js';
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
        // Versi tampilan yang benar-benar dijalankan siswa - dibaca dari client,
        // bukan dari server, karena client dapat tertinggal dari server saat
        // peramban memakai berkas lama dari cache.
        instrumentVersion: input.instrumentVersion ?? null,
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
 * POST /api/session/login - masuk dengan NIS + kode kelas + PIN.
 *
 * - Belum ada sesi berPIN untuk NIS + kelas itu: sesi baru dibuat dan PIN yang
 *   diketik menjadi PIN siswa (nama wajib diisi).
 * - Sudah ada: PIN dicocokkan, lalu siswa MELANJUTKAN sesi yang sama: level
 *   yang sudah dinilai, kota tiap level, dan progres permainannya dikirim balik.
 * - PIN direset guru: PIN yang diketik menjadi PIN baru, sesi tetap dilanjutkan.
 *
 * Sesi lama tanpa PIN (sebelum fitur ini) tidak bisa diklaim lewat login, agar
 * tidak ada yang mengambil alih pekerjaan orang lain hanya dengan mengetahui NIS.
 * Kode kelas disimpan dalam huruf besar supaya "xi-ipa-1" dan "XI-IPA-1" sama.
 */
sessionRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = LoginSchema.parse(req.body);
    const classCode = input.classCode.toUpperCase();

    const ada = await prisma.session.findFirst({
      where: { studentId: input.studentId, classCode, pinHash: { not: null } },
      orderBy: { startedAt: 'desc' },
    });

    let session = ada;
    let baru = false;
    if (ada) {
      if (ada.pinHash === PIN_DIRESET) {
        session = await prisma.session.update({ where: { id: ada.id }, data: { pinHash: hashPin(input.pin) } });
      } else if (!cocokPin(input.pin, ada.pinHash!)) {
        throw new HttpError(401, 'NIS, kode kelas, atau PIN salah.');
      }
    } else {
      const nama = input.studentName?.trim();
      if (!nama) throw new HttpError(400, 'Pertama kali masuk: isi juga nama atau inisialmu.');
      session = await prisma.session.create({
        data: {
          studentName: nama,
          studentId: input.studentId,
          classCode,
          pinHash: hashPin(input.pin),
          userAgent: req.header('user-agent')?.slice(0, 300) ?? null,
          instrumentVersion: input.instrumentVersion ?? null,
        },
      });
      baru = true;
    }

    const s = session!;
    const refleksi = await prisma.eventLog.findFirst({
      where: { sessionId: s.id, eventType: 'learning_reflection' },
      select: { id: true },
    });
    res.status(baru ? 201 : 200).json({
      sessionId: s.id,
      studentName: s.studentName,
      classCode: s.classCode,
      startedAt: s.startedAt,
      baru,
      lanjutan: {
        levelSelesai: baru ? [] : await levelSelesai(s.id),
        kota: baru ? [] : await kotaPerLevel(s.id),
        tutorialSelesai: s.tutorialStatus !== null,
        refleksiSelesai: refleksi !== null,
        sessionComposite: s.sessionComposite,
        progres: s.progres,
      },
    });
  }),
);

/**
 * PUT /api/session/:id/progres - menyimpan progres permainan (koin, misi,
 * bangunan) agar ikut ke perangkat lain. Hanya ekonomi permainan.
 */
sessionRouter.put(
  '/:id/progres',
  logLimiter,
  asyncHandler(async (req, res) => {
    const input = ProgresSchema.parse(req.body);
    const id = String(req.params.id);
    const session = await prisma.session.findUnique({ where: { id }, select: { id: true } });
    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');
    await prisma.session.update({ where: { id }, data: { progres: input.progres } });
    res.json({ ok: true });
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
    const id = String(req.params.id);

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
      where: { id: String(req.params.id) },
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
