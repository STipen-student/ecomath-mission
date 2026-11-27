/** Uji integrasi login siswa (NIS + kode kelas + PIN) dan penyimpanan progres. */
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

const login = (body: Record<string, unknown>) => request(app).post('/api/session/login').send(body);

describe('POST /api/session/login', () => {
  it('membuat sesi baru pada login pertama dan menyimpan PIN sebagai hash', async () => {
    const res = await login({ studentName: 'Rina', studentId: '1001', classCode: 'xi-uji-login', pin: '1234' });
    expect(res.status).toBe(201);
    expect(res.body.baru).toBe(true);
    expect(res.body.classCode).toBe('XI-UJI-LOGIN');
    const sesi = await prisma.session.findUnique({ where: { id: res.body.sessionId } });
    expect(sesi?.pinHash).toBeTruthy();
    expect(sesi?.pinHash).not.toContain('1234');
  });

  it('melanjutkan sesi yang sama dengan PIN benar, tanpa membuat sesi baru', async () => {
    const awal = await login({ studentName: 'Budi', studentId: '1002', classCode: 'XI-UJI-LOGIN', pin: '5678' });
    const lagi = await login({ studentId: '1002', classCode: 'xi-uji-login', pin: '5678' });
    expect(lagi.status).toBe(200);
    expect(lagi.body.baru).toBe(false);
    expect(lagi.body.sessionId).toBe(awal.body.sessionId);
    expect(lagi.body.lanjutan.levelSelesai).toEqual([]);
    const jumlah = await prisma.session.count({ where: { studentId: '1002', classCode: 'XI-UJI-LOGIN' } });
    expect(jumlah).toBe(1);
  });

  it('menolak PIN salah', async () => {
    await login({ studentName: 'Citra', studentId: '1003', classCode: 'XI-UJI-LOGIN', pin: '1111' });
    const salah = await login({ studentId: '1003', classCode: 'XI-UJI-LOGIN', pin: '2222' });
    expect(salah.status).toBe(401);
  });

  it('meminta nama pada login pertama dan menolak PIN bukan 4-6 angka', async () => {
    expect((await login({ studentId: '1004', classCode: 'XI-UJI-LOGIN', pin: '1234' })).status).toBe(400);
    expect((await login({ studentName: 'Dedi', studentId: '1004', classCode: 'XI-UJI-LOGIN', pin: '12a4' })).status).toBe(400);
  });

  it('tidak mengambil alih sesi lama yang dibuat tanpa PIN', async () => {
    const lama = await request(app).post('/api/session').send({ studentName: 'Eka', studentId: '1005', classCode: 'XI-UJI-LOGIN' });
    const res = await login({ studentName: 'Eka', studentId: '1005', classCode: 'XI-UJI-LOGIN', pin: '4321' });
    expect(res.body.baru).toBe(true);
    expect(res.body.sessionId).not.toBe(lama.body.sessionId);
  });

  it('setelah guru mereset PIN, PIN baru diterima dan sesinya tetap sama', async () => {
    const awal = await login({ studentName: 'Fajar', studentId: '1006', classCode: 'XI-UJI-LOGIN', pin: '1357' });
    const reset = await request(app)
      .post(`/api/admin/student/${awal.body.sessionId}/reset-pin`)
      .set('x-admin-key', ADMIN_KEY);
    expect(reset.status).toBe(200);
    const baru = await login({ studentId: '1006', classCode: 'XI-UJI-LOGIN', pin: '2468' });
    expect(baru.status).toBe(200);
    expect(baru.body.sessionId).toBe(awal.body.sessionId);
    expect((await login({ studentId: '1006', classCode: 'XI-UJI-LOGIN', pin: '1357' })).status).toBe(401);
  });

  it('reset PIN memerlukan kunci admin', async () => {
    const awal = await login({ studentName: 'Gita', studentId: '1007', classCode: 'XI-UJI-LOGIN', pin: '9999' });
    const res = await request(app).post(`/api/admin/student/${awal.body.sessionId}/reset-pin`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/session/:id/progres', () => {
  it('menyimpan progres dan mengembalikannya saat login berikutnya', async () => {
    const awal = await login({ studentName: 'Hana', studentId: '1008', classCode: 'XI-UJI-LOGIN', pin: '8080' });
    const progres = JSON.stringify({ koin: 120, selesai: ['level-1'] });
    const simpan = await request(app).put(`/api/session/${awal.body.sessionId}/progres`).send({ progres });
    expect(simpan.status).toBe(200);
    const lagi = await login({ studentId: '1008', classCode: 'XI-UJI-LOGIN', pin: '8080' });
    expect(lagi.body.lanjutan.progres).toBe(progres);
  });
});

describe('data uji coba terpisah dari data penelitian', () => {
  it('kelas berawalan UJI tidak ikut rekap tanpa saringan, tetapi bisa dilihat bila dipilih', async () => {
    await login({ studentName: 'Uji Coba', studentId: '7001', classCode: 'UJI-PISAH', pin: '1234' });
    const semua = await request(app).get('/api/admin/summary').set('x-admin-key', ADMIN_KEY);
    expect(semua.body.siswa.some((s: { classCode: string }) => s.classCode === 'UJI-PISAH')).toBe(false);
    const dipilih = await request(app).get('/api/admin/summary').query({ classCode: 'UJI-PISAH' }).set('x-admin-key', ADMIN_KEY);
    expect(dipilih.body.siswa.some((s: { classCode: string }) => s.classCode === 'UJI-PISAH')).toBe(true);
  });
});

describe('persetujuan dan penarikan data', () => {
  it('mencatat persetujuan siswa beserta versinya, dan tampil di laporan guru', async () => {
    const awal = await login({ studentName: 'Indah', studentId: '1101', classCode: 'XI-UJI-ETIK', pin: '1111' });
    expect(awal.body.lanjutan.persetujuanVersi).toBeNull();
    const ok = await request(app).post(`/api/session/${awal.body.sessionId}/persetujuan`).send({ versi: '1', setuju: true, izinWali: true });
    expect(ok.status).toBe(200);
    const lagi = await login({ studentId: '1101', classCode: 'XI-UJI-ETIK', pin: '1111' });
    expect(lagi.body.lanjutan.persetujuanVersi).toBe('1');
    const lap = await request(app).get(`/api/admin/student/${awal.body.sessionId}`).set('x-admin-key', ADMIN_KEY);
    expect(lap.body.persetujuan.izinWali).toBe(true);
  });

  it('menolak persetujuan tanpa kata setuju', async () => {
    const awal = await login({ studentName: 'Joko', studentId: '1102', classCode: 'XI-UJI-ETIK', pin: '2222' });
    const res = await request(app).post(`/api/session/${awal.body.sessionId}/persetujuan`).send({ versi: '1', setuju: false, izinWali: true });
    expect(res.status).toBe(400);
  });

  it('menghapus permanen seluruh data siswa hanya dengan konfirmasi HAPUS dan kunci admin', async () => {
    const awal = await login({ studentName: 'Kiki', studentId: '1103', classCode: 'XI-UJI-ETIK', pin: '3333' });
    const id = awal.body.sessionId as string;
    await request(app).get('/api/task/1').query({ sessionId: id });
    expect((await request(app).delete(`/api/admin/student/${id}`).send({ konfirmasi: 'HAPUS' })).status).toBe(401);
    expect((await request(app).delete(`/api/admin/student/${id}`).set('x-admin-key', ADMIN_KEY).send({})).status).toBe(400);
    const hapus = await request(app).delete(`/api/admin/student/${id}`).set('x-admin-key', ADMIN_KEY).send({ konfirmasi: 'HAPUS' });
    expect(hapus.status).toBe(200);
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.taskAttempt.count({ where: { sessionId: id } })).toBe(0);
    expect(await prisma.eventLog.count({ where: { sessionId: id } })).toBe(0);
  });
});
