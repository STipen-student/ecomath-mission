/**
 * Laporan guru. Diproteksi API key yang sama dengan endpoint admin lain.
 *
 *   GET /api/admin/summary            rekap satu kelas: rata-rata per klaim, per level, per task
 *   GET /api/admin/student/:sessionId laporan satu siswa: skor tiap level, profil klaim, kesimpulan
 *   GET /api/admin/attempt/:attemptId rincian satu percobaan: jejak audit, refleksi, log
 *
 * Dipisahkan dari admin.routes.ts karena tujuannya berbeda: berkas itu melayani
 * EKSPOR data mentah untuk analisis statistik, sedangkan berkas ini melayani
 * PEMBACAAN oleh guru saat pembelajaran berlangsung.
 *
 * Agregat dihitung di server, bukan di halaman guru. Alasannya dua: halaman guru
 * tetap ringan meski satu kelas berisi ratusan percobaan, dan rumus rata-rata
 * hanya hidup di satu tempat sehingga angka pada layar guru dijamin sama dengan
 * angka pada berkas ekspor CSV.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { AdminResultsQuerySchema } from '../schemas/api.js';
import { getTaskById } from '../tasks/index.js';
import { SCORING_VERSION } from '../scoring/thresholds.js';
import { buildSessionConclusion, JUDUL_KLAIM, type ClaimProfile } from '../scoring/index.js';
import { effectiveScore } from '../lib/scoreView.js';

export const teacherRouter = Router();
teacherRouter.use(requireAdmin);

const KLAIM = ['K1', 'K2', 'K3', 'K4'] as const;
type Klaim = (typeof KLAIM)[number];

/** Bulatkan ke dua desimal; null bila tidak ada data. */
function rata(nilai: number[]): number | null {
  if (nilai.length === 0) return null;
  return Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100;
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(raw);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

teacherRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const query = AdminResultsQuerySchema.parse(req.query);

    const scores = await prisma.score.findMany({
      where: query.classCode ? { attempt: { session: { classCode: query.classCode } } } : {},
      include: { attempt: { include: { session: true } } },
      orderBy: [{ sessionId: 'asc' }, { level: 'asc' }],
    });

    const sesi = await prisma.session.findMany({
      where: query.classCode ? { classCode: query.classCode } : {},
      orderBy: [{ classCode: 'asc' }, { startedAt: 'asc' }],
    });

    const baris = scores.map((s) => ({ s, eff: effectiveScore(s) }));

    /** Nilai satu klaim pada satu baris skor, sudah memperhitungkan koreksi K4. */
    const nilaiKlaim = (b: (typeof baris)[number], k: Klaim): number =>
      k === 'K4' ? b.eff.k4 : b.s[k.toLowerCase() as 'k1' | 'k2' | 'k3'];

    const perKlaim = KLAIM.map((k) => {
      const nilai = baris.map((b) => nilaiKlaim(b, k));
      return {
        claim: k,
        mean: rata(nilai),
        // Distribusi 0-3: memperlihatkan sebaran, bukan hanya rata-rata. Kelas
        // dengan rata-rata 1,5 bisa berarti semua siswa di angka 1-2, atau
        // separuh di 0 dan separuh di 3 - dua situasi yang menuntut tindakan
        // pengajaran yang sama sekali berbeda.
        distribusi: [0, 1, 2, 3].map((skor) => nilai.filter((v) => v === skor).length),
      };
    });

    const perLevel = [1, 2, 3, 4].map((level) => {
      const b = baris.filter((x) => x.s.level === level);
      const perKlaimLevel: Record<string, number | null> = {};
      for (const k of KLAIM) perKlaimLevel[k] = rata(b.map((x) => nilaiKlaim(x, k)));
      return {
        level,
        jumlahPercobaan: b.length,
        meanRawSum: rata(b.map((x) => x.eff.rawSum)),
        ...perKlaimLevel,
      };
    });

    const idTask = [...new Set(baris.map((b) => b.s.taskId))].sort();
    const perTask = idTask.map((taskId) => {
      const b = baris.filter((x) => x.s.taskId === taskId);
      const total = b.reduce((n, x) => n + x.eff.rawSum, 0);
      return {
        taskId,
        judul: getTaskById(taskId)?.title ?? taskId,
        level: b[0]?.s.level ?? 0,
        jumlahPercobaan: b.length,
        meanRawSum: rata(b.map((x) => x.eff.rawSum)),
        /**
         * Proporsi skor maksimum yang tercapai (0-1). Setara "tingkat kemudahan"
         * pada analisis butir: makin kecil, makin sukar butir itu bagi kelas ini.
         */
        tingkatKemudahan: b.length > 0 ? Math.round((total / (b.length * 12)) * 100) / 100 : null,
      };
    });

    const siswa = sesi.map((x) => {
      const miliknya = baris.filter((b) => b.s.sessionId === x.id);
      return {
        sessionId: x.id,
        studentName: x.studentName,
        studentId: x.studentId ?? '',
        classCode: x.classCode,
        startedAt: x.startedAt.toISOString(),
        finishedAt: x.finishedAt ? x.finishedAt.toISOString() : null,
        levelsCompleted: miliknya.length,
        totalRaw: miliknya.reduce((n, b) => n + b.eff.rawSum, 0),
        sessionComposite: x.sessionComposite,
        perLevel: miliknya.map((b) => ({
          level: b.s.level,
          taskId: b.s.taskId,
          scoreId: b.s.id,
          attemptId: b.s.attemptId,
          K1: b.s.k1,
          K2: b.s.k2,
          K3: b.s.k3,
          K4: b.eff.k4,
          K4auto: b.s.k4,
          K4overridden: b.eff.overridden,
          rawSum: b.eff.rawSum,
          weightedComposite: b.eff.weightedComposite,
        })),
      };
    });

    const semuaKelas = await prisma.session.findMany({ select: { classCode: true }, distinct: ['classCode'] });

    res.json({
      scoringVersion: SCORING_VERSION,
      classCode: query.classCode ?? null,
      daftarKelas: semuaKelas.map((x) => x.classCode).sort(),
      jumlahSiswa: sesi.length,
      jumlahSelesai: sesi.filter((x) => x.finishedAt !== null).length,
      jumlahPercobaan: scores.length,
      /** Percobaan yang skor K4-nya masih murni heuristik dan belum ditinjau guru. */
      perluTinjauK4: baris.filter((b) => !b.eff.overridden).length,
      perKlaim,
      perLevel,
      perTask,
      siswa,
    });
  }),
);

/**
 * Laporan satu siswa lintas seluruh level yang dikerjakannya.
 *
 * Berbeda dari GET /attempt/:attemptId (satu percobaan, satu level) - endpoint
 * ini menjawab "guru memilih nama siswa, lalu melihat laporan lengkapnya":
 * skor tiap level, rata-rata tiap klaim (K1-K4) lintas level, dan satu kalimat
 * kesimpulan. Rincian teknis per level (jejak audit, log mentah) sengaja TIDAK
 * diulang di sini - masih tersedia lewat GET /attempt/:attemptId per level bila
 * guru ingin menyelami satu percobaan tertentu.
 */
teacherRouter.get(
  '/student/:sessionId',
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId! },
      include: {
        attempts: {
          orderBy: { level: 'asc' },
          include: { score: true },
        },
      },
    });
    if (!session) throw new HttpError(404, 'Sesi siswa tidak ditemukan');

    const perLevel = session.attempts
      .filter((a): a is typeof a & { score: NonNullable<(typeof a)['score']> } => a.score !== null)
      .map((a) => {
        const eff = effectiveScore(a.score);
        const fb = parseJson(a.score.feedback) as { overallMessage?: unknown };
        return {
          level: a.level,
          taskId: a.taskId,
          taskTitle: getTaskById(a.taskId)?.title ?? a.taskId,
          attemptId: a.id,
          scoreId: a.score.id,
          K1: a.score.k1,
          K2: a.score.k2,
          K3: a.score.k3,
          K4: eff.k4,
          K4auto: a.score.k4,
          K4overridden: eff.overridden,
          rawSum: eff.rawSum,
          weightedComposite: eff.weightedComposite,
          // Kalimat penutup PER LEVEL, disimpan apa adanya saat submit - lihat
          // scoring/feedback.ts dan schema.prisma (Score.feedback).
          overallMessage: typeof fb.overallMessage === 'string' ? fb.overallMessage : '',
        };
      });

    // Rata-rata tiap klaim lintas level yang sudah dikerjakan. K1-K3 dibaca
    // langsung; K4 memakai nilai efektif (koreksi guru bila ada) supaya profil
    // ini konsisten dengan angka yang tampil di tabel ringkasan kelas.
    const profilKlaim: ClaimProfile[] = KLAIM.map((k) => {
      const nilai = perLevel.map((p) => (k === 'K4' ? p.K4 : p[k as 'K1' | 'K2' | 'K3']));
      return {
        claim: k,
        title: JUDUL_KLAIM[k] ?? k,
        mean: nilai.length > 0 ? Math.round((nilai.reduce((x, y) => x + y, 0) / nilai.length) * 100) / 100 : 0,
        levelCount: nilai.length,
      };
    });

    res.json({
      sessionId: session.id,
      studentName: session.studentName,
      studentId: session.studentId ?? '',
      classCode: session.classCode,
      startedAt: session.startedAt.toISOString(),
      finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
      sessionComposite: session.sessionComposite,
      /**
       * Tutorial antarmuka - KOVARIAT, bukan bagian dari skor.
       * Berguna saat menafsirkan skor rendah: siswa yang melewati tutorial atau
       * banyak salah langkah mungkin terhambat antarmukanya, bukan konstruknya.
       */
      tutorial: session.tutorialStatus
        ? {
            status: session.tutorialStatus,
            durationMs: session.tutorialDurationMs,
            missteps: session.tutorialMissteps,
            stepsCompleted: session.tutorialSteps,
          }
        : null,
      levelsCompleted: perLevel.length,
      totalRaw: perLevel.reduce((n, p) => n + p.rawSum, 0),
      perLevel,
      profilKlaim,
      kesimpulan: buildSessionConclusion(profilKlaim),
    });
  }),
);

teacherRouter.get(
  '/attempt/:attemptId',
  asyncHandler(async (req, res) => {
    const attempt = await prisma.taskAttempt.findUnique({
      where: { id: req.params.attemptId! },
      include: {
        session: true,
        score: true,
        events: { orderBy: { timestampMs: 'asc' } },
      },
    });
    if (!attempt) throw new HttpError(404, 'Percobaan tidak ditemukan');

    const task = getTaskById(attempt.taskId);

    // Jawaban refleksi diangkat ke permukaan supaya guru tidak perlu menelusuri
    // log satu per satu untuk membaca tulisan siswa. Inilah bagian yang paling
    // perlu ditinjau manusia, karena K4 dinilai dengan heuristik teks.
    const refleksi = [...attempt.events].reverse().find((e) => e.eventType === 'reflection_response');
    const isi = refleksi ? parseJson(refleksi.payload) : {};
    const opsi = task?.reflection.closed.options.find((o) => o.id === isi.closedOptionId);

    res.json({
      attemptId: attempt.id,
      sessionId: attempt.sessionId,
      studentName: attempt.session.studentName,
      classCode: attempt.session.classCode,
      level: attempt.level,
      taskId: attempt.taskId,
      taskTitle: task?.title ?? attempt.taskId,
      narrative: task?.narrative ?? '',
      startedAt: attempt.startedAt.toISOString(),
      finishedAt: attempt.finishedAt ? attempt.finishedAt.toISOString() : null,
      durasiMenit: attempt.finishedAt
        ? Math.round(((attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 60000) * 10) / 10
        : null,
      score: attempt.score
        ? {
            scoreId: attempt.score.id,
            ...effectiveScore(attempt.score),
            k4Auto: attempt.score.k4,
            k4ReviewNote: attempt.score.k4ReviewNote,
            scoringVersion: attempt.score.scoringVersion,
            trace: parseJson(attempt.score.trace),
            /** Umpan balik yang benar-benar dilihat siswa saat submit - lihat schema.prisma. */
            studentFeedback: parseJson(attempt.score.feedback),
          }
        : null,
      refleksi: {
        closedOptionId: (isi.closedOptionId as string | undefined) ?? null,
        closedOptionText: opsi?.text ?? null,
        closedOptionQuality: opsi?.quality ?? null,
        openText: (isi.openText as string | undefined) ?? null,
        openPrompt: task?.reflection.openPrompt ?? '',
      },
      jumlahEvent: attempt.events.length,
      events: attempt.events.map((e) => ({
        timestampMs: e.timestampMs,
        eventType: e.eventType,
        payload: parseJson(e.payload),
        isValidAtTime: e.isValidAtTime,
        durationSinceLastEventMs: e.durationSinceLastEventMs,
      })),
    });
  }),
);
