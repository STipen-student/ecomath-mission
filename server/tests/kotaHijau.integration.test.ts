/** Uji integrasi POST /api/kota-hijau/submit dan tampilannya di laporan guru. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

const ADMIN_KEY = 'kunci-admin-untuk-pengujian-1234';
let app: Express;
beforeAll(() => {
  app = createApp();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const OPTIMAL = { 'ganti-bus': 2, 'ganti-mesin': 1, 'rawat-taman': 2, 'tanam-pohon': 1 };

async function sesiBaru(): Promise<string> {
  const res = await request(app).post('/api/session').send({ studentName: 'Uji KH', classCode: 'XI-UJI-KH' });
  return res.body.sessionId as string;
}

const kiriman = (sessionId: string) => ({
  sessionId,
  pemahaman: ['indeks', 'emisi', 'rusak', 'anggaran'],
  langkah: [
    { fase: 1, tipe: 'hitung', rencana: OPTIMAL },
    { fase: 1, tipe: 'jalankan', rencana: OPTIMAL },
    { fase: 2, tipe: 'jalankan', rencana: { 'rawat-pohon': 2 } },
  ],
  refleksi: { pilihan: 'r3', teks: 'Merawat lebih murah.' },
  penilaianDiri: { KH1: 3, KH2: 2, KH3: 3, KH4: 2 },
});

describe('POST /api/kota-hijau/submit', () => {
  it('menilai KH1-KH4 dan menyimpannya terpisah dari skor K1-K4', async () => {
    const id = await sesiBaru();
    const res = await request(app).post('/api/kota-hijau/submit').send(kiriman(id));
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(12);
    const skorK = await prisma.score.count({ where: { sessionId: id } });
    expect(skorK).toBe(0);
  });

  it('hanya satu pengerjaan per sesi', async () => {
    const id = await sesiBaru();
    await request(app).post('/api/kota-hijau/submit').send(kiriman(id));
    const lagi = await request(app).post('/api/kota-hijau/submit').send(kiriman(id));
    expect(lagi.status).toBe(409);
  });

  it('penilaian diri tidak memengaruhi skor', async () => {
    const a = await sesiBaru();
    const b = await sesiBaru();
    const ra = await request(app).post('/api/kota-hijau/submit').send(kiriman(a));
    const rb = await request(app)
      .post('/api/kota-hijau/submit')
      .send({ ...kiriman(b), penilaianDiri: { KH1: 0, KH2: 0, KH3: 0, KH4: 0 } });
    expect(rb.body.total).toBe(ra.body.total);
  });

  it('tampil di laporan guru', async () => {
    const id = await sesiBaru();
    await request(app).post('/api/kota-hijau/submit').send(kiriman(id));
    const lap = await request(app).get(`/api/admin/student/${id}`).set('x-admin-key', ADMIN_KEY);
    expect(lap.status).toBe(200);
    expect(lap.body.kotaHijau.total).toBe(12);
    expect(lap.body.kotaHijau.penilaianDiri.KH2).toBe(2);
  });
});
