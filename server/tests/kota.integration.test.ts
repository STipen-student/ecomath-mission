/** Uji integrasi POST /api/kota/submit (draf 2). Data dipisah dari instrumen 1.1.0. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

let app: Express;
beforeAll(() => { app = createApp(); });
afterAll(async () => { await prisma.$disconnect(); });

const kirim = (classCode: string) => ({
  studentName: 'Siswa Kota',
  classCode,
  aksi: [
    { tipe: 'pilih', jenis: 'rumah', hari: 1 },
    { tipe: 'tempatkan', jenis: 'rumah', petak: 1, hari: 1, melanggar: false },
  ],
  akhir: { warga: 130, bahagia: 70, bangkrut: false, hariSelesai: 40 },
});

describe('POST /api/kota/submit', () => {
  it('menyimpan sesi draf 2 dengan versi dan skor terpisah', async () => {
    const res = await request(app).post('/api/kota/submit').send(kirim('DRAF2-UJI'));
    expect(res.status).toBe(201);
    expect(res.body.versi).toMatch(/^2\./);
    const sesi = await prisma.session.findUnique({ where: { id: res.body.sessionId } });
    expect(sesi?.instrumentVersion).toMatch(/^2\./);
    expect(sesi?.classCode).toBe('DRAF2-UJI');
  });

  it('menolak kode kelas yang tidak berawalan DRAF2-', async () => {
    const res = await request(app).post('/api/kota/submit').send(kirim('XI-IPA-1'));
    expect(res.status).toBe(400);
  });

  it('tidak mengubah sesi instrumen 1.1.0', async () => {
    await request(app).post('/api/kota/submit').send(kirim('DRAF2-UJI-2'));
    const lama = await prisma.session.count({ where: { instrumentVersion: { not: null }, NOT: { classCode: { startsWith: 'DRAF2-' } } } });
    const drafDua = await prisma.session.count({ where: { classCode: { startsWith: 'DRAF2-' } } });
    expect(drafDua).toBeGreaterThan(0);
    expect(lama).toBeGreaterThanOrEqual(0);
  });
});
