/**
 * Misi Kota Hijau (tugas kinerja KPMM kedua).
 *
 * POST /api/kota-hijau/submit  - simpan pengerjaan satu sesi dan nilai KH1-KH4.
 *
 * Satu pengerjaan per sesi, seperti satu percobaan per level. Skor dihitung
 * ulang di server dari tindakan siswa (src/kotaHijau/skor.ts); penilaian diri
 * disimpan sebagai data AaL dan tidak memengaruhi skor.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { submitLimiter } from '../middleware/rateLimit.js';
import { skorKotaHijau } from '../kotaHijau/skor.js';

export const kotaHijauRouter = Router();

const ID_AKSI = z.enum(['ganti-bus', 'ganti-mesin', 'rawat-taman', 'rawat-pohon', 'tanam-pohon', 'taman-baru', 'surya-baru']);
const RENCANA = z.record(ID_AKSI, z.number().int().min(0).max(100));
const SKOR_DIRI = z.number().int().min(0).max(3);

const KirimanSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  pemahaman: z.array(z.string().max(40)).max(10),
  langkah: z
    .array(z.object({ fase: z.union([z.literal(1), z.literal(2)]), tipe: z.enum(['hitung', 'jalankan']), rencana: RENCANA }))
    .max(200),
  refleksi: z.object({ pilihan: z.string().max(10), teks: z.string().max(2000).optional() }),
  penilaianDiri: z.object({ KH1: SKOR_DIRI, KH2: SKOR_DIRI, KH3: SKOR_DIRI, KH4: SKOR_DIRI }),
});

kotaHijauRouter.post(
  '/submit',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const input = KirimanSchema.parse(req.body);
    const session = await prisma.session.findUnique({ where: { id: input.sessionId }, select: { id: true } });
    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');
    const sudah = await prisma.kotaHijau.findUnique({ where: { sessionId: input.sessionId }, select: { id: true } });
    if (sudah) throw new HttpError(409, 'Misi Kota Hijau sudah dikerjakan pada sesi ini.');

    const skor = skorKotaHijau(input);
    await prisma.kotaHijau.create({
      data: {
        sessionId: input.sessionId,
        versi: skor.versi,
        kh1: skor.KH1,
        kh2: skor.KH2,
        kh3: skor.KH3,
        kh4: skor.KH4,
        total: skor.total,
        data: JSON.stringify({
          pemahaman: input.pemahaman,
          langkah: input.langkah,
          refleksi: input.refleksi,
          penilaianDiri: input.penilaianDiri,
          rincian: skor.rincian,
        }),
      },
    });
    res.status(201).json({ ...skor, penilaianDiri: input.penilaianDiri });
  }),
);
