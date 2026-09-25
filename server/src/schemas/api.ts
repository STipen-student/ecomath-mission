/**
 * Validasi seluruh masukan API dengan Zod.
 *
 * Prinsip: TIDAK ADA data dari client yang menyentuh database sebelum melewati
 * skema di berkas ini. Selain alasan keamanan, ini juga menjaga integritas data
 * penelitian - satu event log dengan bentuk payload menyimpang dapat membuat
 * mesin skoring salah membaca timeline siswa.
 */

import { z } from 'zod';
import { EVENT_TYPES } from '../domain/events.js';

/** Batas panjang teks bebas, mencegah penyimpanan payload berukuran ekstrem. */
const SHORT_TEXT = 120;
const OPEN_TEXT = 2000;

export const CreateSessionSchema = z.object({
  studentName: z.string().trim().min(1, 'Nama siswa wajib diisi').max(SHORT_TEXT),
  studentId: z.string().trim().max(SHORT_TEXT).optional(),
  classCode: z.string().trim().min(1, 'Kode kelas wajib diisi').max(SHORT_TEXT),
});
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const TaskQuerySchema = z.object({
  sessionId: z.string().trim().min(1).max(SHORT_TEXT).optional(),
  /** Memaksa task tertentu - dipakai untuk desain penelitian terkontrol dan demo. */
  taskId: z.string().trim().max(SHORT_TEXT).optional(),
  preferContext: z.enum(['SDG11', 'SDG13', 'SDG11&13']).optional(),
});

const NumberFinite = z.number().finite();

/** Payload dibatasi objek datar berukuran wajar. */
const PayloadSchema = z.record(z.unknown()).default({});

export const EventSchema = z.object({
  session_id: z.string().trim().min(1).max(SHORT_TEXT),
  task_id: z.string().trim().min(1).max(SHORT_TEXT),
  timestamp_ms: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
  event_type: z.enum(EVENT_TYPES),
  payload: PayloadSchema,
  is_valid_at_time: z.boolean(),
  duration_since_last_event_ms: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
});
export type EventInput = z.infer<typeof EventSchema>;

/**
 * POST /api/log menerima SATU event atau ARRAY event.
 *
 * Bentuk array bukan sekadar kemudahan: koneksi internet sekolah kerap
 * terputus-putus, dan client menyangga event lalu mengirimkannya sekaligus saat
 * koneksi pulih. Tanpa ini, log yang hilang berarti bukti penelitian yang hilang.
 */
export const LogBodySchema = z.union([EventSchema, z.array(EventSchema).min(1).max(200)]);

export const SubmitSchema = z.object({
  sessionId: z.string().trim().min(1).max(SHORT_TEXT),
  taskId: z.string().trim().min(1).max(SHORT_TEXT),
  finalX: NumberFinite,
  finalY: NumberFinite,
  /** Jawaban refleksi; boleh kosong bila siswa melewatinya. */
  reflectionClosedOptionId: z.string().trim().max(SHORT_TEXT).optional(),
  reflectionOpenText: z.string().trim().max(OPEN_TEXT).optional(),
  /** Menandai sesi selesai seluruhnya (setelah level terakhir). */
  finishSession: z.boolean().optional(),
});
export type SubmitInput = z.infer<typeof SubmitSchema>;

export const AdminResultsQuerySchema = z.object({
  classCode: z.string().trim().max(SHORT_TEXT).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  /** Sertakan jejak audit rubrik; berukuran besar, mati secara default. */
  includeTrace: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().positive().max(5000).default(1000),
});

export const K4OverrideSchema = z.object({
  scoreId: z.string().trim().min(1).max(SHORT_TEXT),
  k4ManualOverride: z.number().int().min(0).max(3).nullable(),
  note: z.string().trim().max(OPEN_TEXT).optional(),
});

/** Ringkasan tutorial antarmuka (docs/SCORING_SPEC.md §7.17). */
export const TutorialResultSchema = z.object({
  status: z.enum(['completed', 'skipped']),
  durationMs: z.number().int().min(0).max(3_600_000),
  missteps: z.number().int().min(0).max(10_000),
  stepsCompleted: z.number().int().min(0).max(50),
  stepsTotal: z.number().int().min(0).max(50).optional(),
});

/** Saklar mode Activity Selection adaptif (docs/SCORING_SPEC.md §7.16). */
export const AdaptiveToggleSchema = z.object({
  enabled: z.boolean(),
});
