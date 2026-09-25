/**
 * Endpoint guru/peneliti. Seluruhnya diproteksi API key sederhana (x-admin-key).
 *
 *   GET  /api/admin/results          rekap skor semua siswa (JSON atau CSV)
 *   GET  /api/admin/events           log mentah untuk analisis proses (CSV)
 *   GET  /api/admin/blueprint        Item-Claim Blueprint bank soal
 *   GET  /api/admin/adaptive         keadaan saklar Activity Selection adaptif
 *   POST /api/admin/adaptive         nyalakan/matikan mode adaptif
 *   POST /api/admin/k4-override      koreksi manual skor K4 oleh rater kedua
 *
 * CSV di sini dihasilkan langsung dari database sehingga guru dapat mengunduh
 * lewat peramban tanpa menjalankan script apa pun. Untuk ekspor lengkap ke
 * berkas, tersedia docs/EXPORT/export_to_csv.ts.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { AdaptiveToggleSchema, AdminResultsQuerySchema, K4OverrideSchema } from '../schemas/api.js';
import { TASK_BANK, substantiveConstraintCount } from '../tasks/index.js';
import { ADAPTIVE_THRESHOLDS, surfaceLoad } from '../tasks/adaptive.js';
import { isAdaptiveEnabled, setAdaptiveEnabled } from '../tasks/adaptiveState.js';
import { config } from '../config.js';
import { COMPOSITE_WEIGHTS, SCORING_VERSION } from '../scoring/thresholds.js';
import { toCsv } from '../lib/csv.js';
import { effectiveScore } from '../lib/scoreView.js';
import { narrateEvent } from '../lib/eventNarrator.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get(
  '/results',
  asyncHandler(async (req, res) => {
    const query = AdminResultsQuerySchema.parse(req.query);

    const scores = await prisma.score.findMany({
      where: query.classCode ? { attempt: { session: { classCode: query.classCode } } } : {},
      include: { attempt: { include: { session: true } } },
      orderBy: [{ sessionId: 'asc' }, { level: 'asc' }],
      take: query.limit,
    });

    const rows = scores.map((s) => {
      const eff = effectiveScore(s);
      return {
        session_id: s.sessionId,
        student_name: s.attempt.session.studentName,
        student_id: s.attempt.session.studentId ?? '',
        class_code: s.attempt.session.classCode,
        task_id: s.taskId,
        level: s.level,
        K1: s.k1,
        K2: s.k2,
        K3: s.k3,
        K4_auto: s.k4,
        K4_manual_override: s.k4ManualOverride ?? '',
        K4_effective: eff.k4,
        raw_sum: eff.rawSum,
        weighted_composite: eff.weightedComposite,
        scoring_version: s.scoringVersion,
        started_at: s.attempt.startedAt.toISOString(),
        finished_at: s.attempt.finishedAt ? s.attempt.finishedAt.toISOString() : '',
        computed_at: s.computedAt.toISOString(),
        ...(query.includeTrace ? { trace: s.trace } : {}),
      };
    });

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ecomath_scores.csv"');
      res.send(toCsv(rows));
      return;
    }

    res.json({ count: rows.length, scoringVersion: SCORING_VERSION, results: rows });
  }),
);

adminRouter.get(
  '/events',
  asyncHandler(async (req, res) => {
    const query = AdminResultsQuerySchema.parse(req.query);

    const events = await prisma.eventLog.findMany({
      where: query.classCode ? { attempt: { session: { classCode: query.classCode } } } : {},
      include: { attempt: { include: { session: true } } },
      orderBy: [{ sessionId: 'asc' }, { timestampMs: 'asc' }],
      take: query.limit,
    });

    // Payload JSON diterjemahkan menjadi kalimat berbahasa Indonesia dan kolom
    // terurai (x, y, koefisien, pilihan) - lihat lib/eventNarrator.ts. Tanpa ini,
    // tiap baris hanya berupa blob JSON yang bentuknya berbeda per jenis event
    // dan terlihat acak saat dibuka di Excel.
    const rows = events.map((e) => {
      const d = narrateEvent(e.taskId, e.eventType, e.payload);
      return {
        session_id: e.sessionId,
        student_name: e.attempt.session.studentName,
        class_code: e.attempt.session.classCode,
        task_id: e.taskId,
        level: e.attempt.level,
        timestamp_ms: e.timestampMs,
        event_type: e.eventType,
        keterangan: d.keterangan,
        x: d.x,
        y: d.y,
        z: d.z,
        a: d.a,
        b: d.b,
        operator: d.operator,
        c: d.c,
        pilihan_teks: d.pilihan_teks,
        catatan: d.catatan,
        is_valid_at_time: e.isValidAtTime ? 1 : 0,
        duration_since_last_event_ms: e.durationSinceLastEventMs,
        received_at: e.receivedAt.toISOString(),
        // Payload mentah tetap disertakan di ujung sebagai data cadangan untuk
        // pemrosesan ulang terprogram - bukan untuk dibaca manual.
        payload_json: e.payload,
      };
    });

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ecomath_events.csv"');
      res.send(toCsv(rows));
      return;
    }

    res.json({ count: rows.length, events: rows });
  }),
);

/**
 * Saklar Activity Selection adaptif (docs/SCORING_SPEC.md §7.16).
 *
 * GET  mengembalikan keadaan berjalan beserta peringkat beban permukaan tiap
 *      level, sehingga guru dapat melihat pada level mana adaptivitas benar-
 *      benar punya ruang - Level 1 dan 4 tidak, karena ketiga variannya
 *      dirancang setara.
 * POST mengubah keadaan berjalan (tidak bertahan melewati restart server).
 */
adminRouter.get(
  '/adaptive',
  asyncHandler(async (_req, res) => {
    res.json(ringkasanAdaptif());
  }),
);

adminRouter.post(
  '/adaptive',
  asyncHandler(async (req, res) => {
    const { enabled } = AdaptiveToggleSchema.parse(req.body);
    setAdaptiveEnabled(enabled);
    res.json(ringkasanAdaptif());
  }),
);

function ringkasanAdaptif() {
  const perLevel = [1, 2, 3, 4].map((level) => {
    const varian = TASK_BANK.filter((t) => t.level === level)
      .map((t) => ({ taskId: t.id, bebanPermukaan: Math.round(surfaceLoad(t) * 100) / 100 }))
      .sort((a, b) => a.bebanPermukaan - b.bebanPermukaan);
    const unik = new Set(varian.map((v) => v.bebanPermukaan));
    return { level, varian, adaRuangAdaptif: unik.size > 1 };
  });

  return {
    enabled: isAdaptiveEnabled(),
    /** Nilai ADAPTIVE_MODE; keadaan kembali ke sini setiap server restart. */
    defaultFromEnv: config.adaptiveModeDefault,
    thresholds: ADAPTIVE_THRESHOLDS,
    perLevel,
  };
}

/**
 * Item-Claim Blueprint (Bagian 10 dokumen ECD), dihasilkan langsung dari bank
 * soal sehingga selalu sinkron dengan kode - tidak perlu disalin manual ke
 * lampiran skripsi.
 */
adminRouter.get(
  '/blueprint',
  asyncHandler(async (_req, res) => {
    const rows = TASK_BANK.map((t) => ({
      kode_task: t.id,
      level: t.level,
      konteks_sdg: t.sdgContext,
      jml_kendala_substantif: substantiveConstraintCount(t),
      jml_kendala_blueprint: t.blueprintConstraintCount,
      jml_kendala_dinilai_K2: t.expectedConstraintCount,
      ada_kendala_implisit: t.constraints.some((k) => k.kind === 'implicit'),
      ada_event_distraktor: t.distractor !== null,
      fungsi_tujuan: t.objective.type === 'none' ? '-' : t.objective.display,
      klaim_dominan: t.dominantClaims.join(', '),
      anchor_item: t.isAnchorItem === true,
      representasi: t.representation,
      jenis_bilangan: t.numberStyle,
    }));

    res.json({
      scoringVersion: SCORING_VERSION,
      compositeWeights: COMPOSITE_WEIGHTS,
      count: rows.length,
      blueprint: rows,
    });
  }),
);

/**
 * Koreksi manual skor K4.
 *
 * Disediakan karena K4 memakai heuristik teks terbuka yang dapat keliru menilai
 * penalaran siswa. Skor otomatis TIDAK ditimpa - disimpan pada kolom terpisah -
 * sehingga selisih skor otomatis dan skor rater dapat dihitung sebagai bukti
 * reliabilitas antar-penilai pada laporan penelitian.
 */
adminRouter.post(
  '/k4-override',
  asyncHandler(async (req, res) => {
    const input = K4OverrideSchema.parse(req.body);

    const existing = await prisma.score.findUnique({ where: { id: input.scoreId } });
    if (!existing) throw new HttpError(404, 'Skor tidak ditemukan');

    const updated = await prisma.score.update({
      where: { id: input.scoreId },
      data: {
        k4ManualOverride: input.k4ManualOverride,
        k4ReviewNote: input.note ?? null,
      },
    });

    res.json({ scoreId: updated.id, ...effectiveScore(updated) });
  }),
);
