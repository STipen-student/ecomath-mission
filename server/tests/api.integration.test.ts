/**
 * Uji integrasi API: alur lengkap dari membuat sesi sampai memperoleh skor,
 * melalui HTTP sungguhan dan database sungguhan.
 *
 * Uji ini melengkapi uji rubrik: uji rubrik memastikan skor BENAR, uji ini
 * memastikan skor benar-benar SAMPAI - lewat validasi masukan, penyimpanan log,
 * pemicu event distraktor, dan proteksi endpoint admin.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { L4_KEY } from './fixtures/logBuilder.js';

const ADMIN_KEY = 'kunci-admin-untuk-pengujian-1234';

let app: Express;

beforeAll(() => {
  app = createApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Membuat sesi baru dan mengembalikan id-nya. */
async function buatSesi(classCode = 'UJI-1'): Promise<string> {
  const res = await request(app)
    .post('/api/session')
    .send({ studentName: 'Siswa Uji', studentId: 'UJI-001', classCode });
  expect(res.status).toBe(201);
  return res.body.sessionId as string;
}

describe('POST /api/session', () => {
  it('membuat sesi baru dan mengembalikan sessionId', async () => {
    const res = await request(app)
      .post('/api/session')
      .send({ studentName: 'Ani', classCode: 'XI-IPA-1' });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.classCode).toBe('XI-IPA-1');
  });

  it('menolak nama siswa atau kode kelas yang kosong', async () => {
    const res = await request(app).post('/api/session').send({ studentName: '', classCode: '' });
    expect(res.status).toBe(400);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it('menolak masukan yang bukan objek', async () => {
    expect((await request(app).post('/api/session').send('bukan json')).status).toBe(400);
  });
});

describe('GET /api/task/:level', () => {
  it('mengembalikan task sesuai level yang diminta', async () => {
    const res = await request(app).get('/api/task/3');
    expect(res.status).toBe(200);
    expect(res.body.task.level).toBe(3);
    expect(res.body.task.constraints.length).toBeGreaterThan(0);
  });

  it('menolak level di luar 1-4', async () => {
    expect((await request(app).get('/api/task/7')).status).toBe(400);
    expect((await request(app).get('/api/task/abc')).status).toBe(400);
  });

  it('TIDAK PERNAH mengirim kunci jawaban ke client', async () => {
    // Yang diperiksa adalah KUNCI pada JSON, bukan sekadar kata di dalam teks:
    // narasi task memang boleh menyebut kata "optimum", yang tidak boleh adalah
    // adanya field berisi titik optimum, jawaban benar, atau isi event distraktor.
    const kunciTerlarang = ['optimum', 'corners', 'quality', 'correct', 'distractor', 'narrativeHint'];

    for (const level of [1, 2, 3, 4]) {
      const res = await request(app).get(`/api/task/${level}`);
      const json = JSON.stringify(res.body);

      for (const kunci of kunciTerlarang) {
        expect(json, `level ${level} membocorkan field "${kunci}"`).not.toMatch(new RegExp(`"${kunci}"\s*:`));
      }

      expect(res.body.task.distractor).toBeUndefined();
      expect(res.body.task.reflection.closed.options.every((o: { quality?: number }) => o.quality === undefined)).toBe(true);
      expect(res.body.task.variableOptions.every((o: { correct?: boolean }) => o.correct === undefined)).toBe(true);
      expect(res.body.task.goalOptions.every((o: { correct?: boolean }) => o.correct === undefined)).toBe(true);
      // hasDistractor hanya boolean - siswa boleh tahu ADA event, bukan APA isinya.
      expect(typeof res.body.task.hasDistractor).toBe('boolean');
    }
  });

  it('bersifat idempoten: level yang sama pada sesi yang sama memberi task yang sama', async () => {
    const sessionId = await buatSesi();
    const a = await request(app).get('/api/task/2').query({ sessionId });
    const b = await request(app).get('/api/task/2').query({ sessionId });

    expect(a.body.task.id).toBe(b.body.task.id);
    expect(a.body.attemptId).toBe(b.body.attemptId);
    expect(b.body.resumed).toBe(true);
  });

  it('menolak sessionId yang tidak dikenal', async () => {
    const res = await request(app).get('/api/task/1').query({ sessionId: 'tidak-ada' });
    expect(res.status).toBe(404);
  });

  it('dapat memaksa task tertentu untuk desain penelitian terkontrol', async () => {
    const sessionId = await buatSesi();
    const res = await request(app).get('/api/task/4').query({ sessionId, taskId: 'L4-SDG11-A' });
    expect(res.body.task.id).toBe('L4-SDG11-A');
  });
});

describe('POST /api/log', () => {
  it('menerima satu event maupun array event', async () => {
    const sessionId = await buatSesi();
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    const dasar = {
      session_id: sessionId,
      task_id: 'L1-SDG11-A',
      is_valid_at_time: true,
      duration_since_last_event_ms: 100,
    };

    const satu = await request(app)
      .post('/api/log')
      .send({ ...dasar, timestamp_ms: 1000, event_type: 'identify_variable', payload: { variable: 'x', optionId: 'vx1' } });
    expect(satu.status).toBe(201);
    expect(satu.body.accepted).toBe(1);

    const banyak = await request(app)
      .post('/api/log')
      .send([
        { ...dasar, timestamp_ms: 2000, event_type: 'move_slider', payload: { x: 30, y: 10 } },
        { ...dasar, timestamp_ms: 3000, event_type: 'move_slider', payload: { x: 28, y: 12 } },
      ]);
    expect(banyak.status).toBe(201);
    expect(banyak.body.accepted).toBe(2);
  });

  it('menerima event set_zone_center dari peta', async () => {
    const sessionId = await buatSesi();
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    const res = await request(app).post('/api/log').send({
      session_id: sessionId,
      task_id: 'L1-SDG11-A',
      timestamp_ms: 800,
      event_type: 'set_zone_center',
      payload: { variable: 'x', col: 5, row: 7 },
      is_valid_at_time: true,
      duration_since_last_event_ms: 120,
    });

    expect(res.status).toBe(201);
    expect(res.body.accepted).toBe(1);
  });

  it('menolak jenis event yang tidak dikenal', async () => {
    const sessionId = await buatSesi();
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    const res = await request(app).post('/api/log').send({
      session_id: sessionId,
      task_id: 'L1-SDG11-A',
      timestamp_ms: 1000,
      event_type: 'menghapus_semua_data',
      payload: {},
      is_valid_at_time: true,
      duration_since_last_event_ms: 0,
    });
    expect(res.status).toBe(400);
  });

  it('menolak log untuk percobaan yang tidak ada', async () => {
    const res = await request(app).post('/api/log').send({
      session_id: 'sesi-hantu',
      task_id: 'L1-SDG11-A',
      timestamp_ms: 1000,
      event_type: 'move_slider',
      payload: { x: 1, y: 1 },
      is_valid_at_time: true,
      duration_since_last_event_ms: 0,
    });
    expect(res.status).toBe(404);
  });

  it('menolak kiriman yang mencampur beberapa sesi', async () => {
    const a = await buatSesi();
    const b = await buatSesi();
    await request(app).get('/api/task/1').query({ sessionId: a, taskId: 'L1-SDG11-A' });

    const res = await request(app)
      .post('/api/log')
      .send([
        { session_id: a, task_id: 'L1-SDG11-A', timestamp_ms: 1, event_type: 'move_slider', payload: {}, is_valid_at_time: true, duration_since_last_event_ms: 0 },
        { session_id: b, task_id: 'L1-SDG11-A', timestamp_ms: 2, event_type: 'move_slider', payload: {}, is_valid_at_time: true, duration_since_last_event_ms: 0 },
      ]);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/task/:attemptId/distractor', () => {
  it('menolak memunculkan event bila solusi awal belum valid', async () => {
    const sessionId = await buatSesi();
    const task = await request(app).get('/api/task/4').query({ sessionId, taskId: 'L4-SDG11-A' });

    const res = await request(app)
      .post(`/api/task/${task.body.attemptId}/distractor`)
      .send({ x: 120, y: 10, elapsedMs: 60_000 }); // melanggar kendala RTH

    expect(res.status).toBe(409);
  });

  it('memunculkan event dan mengirim kendala yang sudah direvisi', async () => {
    const sessionId = await buatSesi();
    const task = await request(app).get('/api/task/4').query({ sessionId, taskId: 'L4-SDG11-A' });

    const res = await request(app)
      .post(`/api/task/${task.body.attemptId}/distractor`)
      .send({ x: L4_KEY.optimum.x, y: L4_KEY.optimum.y, elapsedMs: 60_000 });

    expect(res.status).toBe(200);
    expect(res.body.narrative).toContain('40%');
    expect(res.body.changedConstraintIds).toContain('k_rth_who');

    const rth = res.body.constraints.find((k: { id: string }) => k.id === 'k_rth_who');
    expect(rth.c).toBe(48); // 30% dari 120 menjadi 40% dari 120
  });

  it('bersifat idempoten: pemanggilan kedua tidak menggandakan event', async () => {
    const sessionId = await buatSesi();
    const task = await request(app).get('/api/task/4').query({ sessionId, taskId: 'L4-SDG11-A' });
    const titik = { x: L4_KEY.optimum.x, y: L4_KEY.optimum.y, elapsedMs: 60_000 };

    await request(app).post(`/api/task/${task.body.attemptId}/distractor`).send(titik);
    const kedua = await request(app).post(`/api/task/${task.body.attemptId}/distractor`).send(titik);

    expect(kedua.body.alreadyShown).toBe(true);
    const jumlah = await prisma.eventLog.count({
      where: { attemptId: task.body.attemptId, eventType: 'distractor_shown' },
    });
    expect(jumlah).toBe(1);
  });
});

describe('POST /api/submit - alur lengkap', () => {
  it('menghasilkan profil K1-K4 penuh untuk siswa yang mengerjakan dengan sempurna', async () => {
    const sessionId = await buatSesi('UJI-LENGKAP');
    const task = await request(app).get('/api/task/4').query({ sessionId, taskId: 'L4-SDG11-A' });
    const attemptId = task.body.attemptId as string;

    const dasar = {
      session_id: sessionId,
      task_id: 'L4-SDG11-A',
      is_valid_at_time: true,
      duration_since_last_event_ms: 500,
    };

    await request(app)
      .post('/api/log')
      .send([
        { ...dasar, timestamp_ms: 1000, event_type: 'identify_variable', payload: { variable: 'x', optionId: 'vx1' } },
        { ...dasar, timestamp_ms: 1500, event_type: 'identify_variable', payload: { variable: 'y', optionId: 'vy1' } },
        { ...dasar, timestamp_ms: 2000, event_type: 'select_objective', payload: { optionId: 'g1' } },
        { ...dasar, timestamp_ms: 2500, event_type: 'write_constraint', payload: { slot: 0, a: 1, b: 1, op: '<=', c: 120, constraint_text: 'x + y <= 120' } },
        { ...dasar, timestamp_ms: 3000, event_type: 'write_constraint', payload: { slot: 1, a: 25, b: 18, op: '<=', c: 3600, constraint_text: '25x + 18y <= 3600' } },
        { ...dasar, timestamp_ms: 3500, event_type: 'write_constraint', payload: { slot: 2, a: 0, b: 1, op: '>=', c: 36, constraint_text: 'y >= 36' } },
        { ...dasar, timestamp_ms: 4000, event_type: 'check_corner_point', payload: { x: 84, y: 36, z: 3360 } },
        { ...dasar, timestamp_ms: 4500, event_type: 'check_corner_point', payload: { x: 0, y: 120, z: 0 } },
        { ...dasar, timestamp_ms: 5000, event_type: 'move_slider', payload: { x: 84, y: 36 } },
        { ...dasar, timestamp_ms: 5500, event_type: 'attempt_submit', payload: { x: 84, y: 36, phase: 'initial' } },
      ]);

    // Event distraktor dipicu setelah submit awal yang valid.
    const ev = await request(app)
      .post(`/api/task/${attemptId}/distractor`)
      .send({ x: 84, y: 36, elapsedMs: 6000 });
    expect(ev.status).toBe(200);

    await request(app)
      .post('/api/log')
      .send([
        { ...dasar, timestamp_ms: 7000, event_type: 'check_corner_point', payload: { x: 72, y: 48, z: 2880 } },
        { ...dasar, timestamp_ms: 7500, event_type: 'revise_after_event', payload: { x: 72, y: 48 } },
      ]);

    const submit = await request(app).post('/api/submit').send({
      sessionId,
      taskId: 'L4-SDG11-A',
      finalX: 72,
      finalY: 48,
      reflectionClosedOptionId: 'r3',
      reflectionOpenText:
        'RTH minimal naik dari 36 ke 48 hektar sehingga perumahan turun ke 72 hektar, akibatnya daya tampung berkurang 480 kepala keluarga karena kota mengorbankan hunian demi target lingkungan.',
      finishSession: true,
    });

    expect(submit.status).toBe(200);
    expect(submit.body.scores).toEqual({ K1: 3, K2: 3, K3: 3, K4: 3 });
    expect(submit.body.rawSum).toBe(12);
    expect(submit.body.weightedComposite).toBe(3);
    expect(submit.body.finalPositionValid).toBe(true);
    // Kunci jawaban baru dibuka SETELAH submit.
    expect(submit.body.optimum.point).toEqual({ x: 72, y: 48 });
    expect(submit.body.feedback).toHaveLength(4);
    expect(submit.body.rubric).toHaveLength(4);
    expect(submit.body.overallMessage.length).toBeGreaterThan(10);
    for (const f of submit.body.feedback) {
      expect(f.summary.length).toBeGreaterThan(15);
      expect(f.suggestion.length).toBeGreaterThan(15);
    }

    // Skor benar-benar tersimpan di database.
    const tersimpan = await prisma.score.findFirst({ where: { sessionId } });
    expect(tersimpan?.rawSum).toBe(12);
    expect(tersimpan?.trace.length).toBeGreaterThan(50);

    // Umpan balik yang dilihat siswa disimpan APA ADANYA, bukan hanya dapat
    // dihitung ulang - dan harus persis sama dengan yang dikirim ke client.
    expect(tersimpan?.feedback.length).toBeGreaterThan(50);
    const feedbackTersimpan = JSON.parse(tersimpan!.feedback) as {
      claims: Array<{ claim: string; summary: string; suggestion: string }>;
      overallMessage: string;
    };
    expect(feedbackTersimpan.claims).toHaveLength(4);
    expect(feedbackTersimpan.overallMessage).toBe(submit.body.overallMessage);
    expect(feedbackTersimpan.claims.map((c) => c.summary)).toEqual(
      submit.body.feedback.map((f: { summary: string }) => f.summary),
    );
  });

  it('menghasilkan skor rendah untuk siswa yang langsung submit tanpa perencanaan', async () => {
    const sessionId = await buatSesi('UJI-MINIM');
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    const res = await request(app)
      .post('/api/submit')
      .send({ sessionId, taskId: 'L1-SDG11-A', finalX: 10, finalY: 20 });

    expect(res.status).toBe(200);
    expect(res.body.scores.K1).toBe(0);
    expect(res.body.scores.K2).toBe(0);
    expect(res.body.scores.K3).toBe(0); // (10, 20) melanggar kendala rasio RTH
    expect(res.body.finalPositionValid).toBe(false);
  });

  it('menolak submit untuk percobaan yang tidak ada', async () => {
    const res = await request(app)
      .post('/api/submit')
      .send({ sessionId: 'sesi-hantu', taskId: 'L1-SDG11-A', finalX: 1, finalY: 1 });
    expect(res.status).toBe(404);
  });

  it('menolak koordinat yang bukan angka', async () => {
    const sessionId = await buatSesi();
    const res = await request(app)
      .post('/api/submit')
      .send({ sessionId, taskId: 'L1-SDG11-A', finalX: 'banyak', finalY: null });
    expect(res.status).toBe(400);
  });

  it('tidak menggandakan event penutup bila client sudah mencatatnya', async () => {
    const sessionId = await buatSesi('UJI-DUPLIKAT');
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    const dasar = {
      session_id: sessionId,
      task_id: 'L1-SDG11-A',
      is_valid_at_time: true,
      duration_since_last_event_ms: 100,
    };

    // Client mencatat submit dan refleksi seperti pada sesi yang berjalan normal.
    await request(app)
      .post('/api/log')
      .send([
        { ...dasar, timestamp_ms: 5000, event_type: 'attempt_submit', payload: { x: 30, y: 10, phase: 'initial' } },
        { ...dasar, timestamp_ms: 6000, event_type: 'reflection_response', payload: { closedOptionId: 'r2', openText: 'RTH bertambah tetapi permukiman berkurang.' } },
      ]);

    await request(app).post('/api/submit').send({
      sessionId,
      taskId: 'L1-SDG11-A',
      finalX: 30,
      finalY: 10,
      reflectionClosedOptionId: 'r2',
      reflectionOpenText: 'RTH bertambah tetapi permukiman berkurang.',
    });

    const attempt = await prisma.taskAttempt.findFirst({ where: { sessionId } });
    const submits = await prisma.eventLog.count({
      where: { attemptId: attempt!.id, eventType: 'attempt_submit' },
    });
    const refleksi = await prisma.eventLog.count({
      where: { attemptId: attempt!.id, eventType: 'reflection_response' },
    });

    expect(submits).toBe(1);
    expect(refleksi).toBe(1);
  });

  it('tetap menulis event penutup bila log client hilang di jalan', async () => {
    const sessionId = await buatSesi('UJI-LOG-HILANG');
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    // Tidak ada satu pun log dari client - mensimulasikan koneksi yang putus.
    await request(app).post('/api/submit').send({
      sessionId,
      taskId: 'L1-SDG11-A',
      finalX: 30,
      finalY: 10,
      reflectionClosedOptionId: 'r3',
    });

    const attempt = await prisma.taskAttempt.findFirst({ where: { sessionId } });
    const submits = await prisma.eventLog.count({
      where: { attemptId: attempt!.id, eventType: 'attempt_submit' },
    });
    expect(submits).toBe(1);

    const skor = await prisma.score.findFirst({ where: { sessionId } });
    expect(skor).not.toBeNull();
    expect(skor!.k3).toBeGreaterThan(0); // posisi akhir tetap dinilai
  });

  it('menghitung ulang skor bila submit diulang, bukan menggandakan baris', async () => {
    const sessionId = await buatSesi('UJI-ULANG');
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });

    await request(app).post('/api/submit').send({ sessionId, taskId: 'L1-SDG11-A', finalX: 30, finalY: 10 });
    await request(app).post('/api/submit').send({ sessionId, taskId: 'L1-SDG11-A', finalX: 30, finalY: 10 });

    expect(await prisma.score.count({ where: { sessionId } })).toBe(1);
  });
});

describe('GET /api/admin - proteksi API key', () => {
  it('menolak akses tanpa API key', async () => {
    expect((await request(app).get('/api/admin/results')).status).toBe(401);
  });

  it('menolak API key yang salah', async () => {
    const res = await request(app).get('/api/admin/results').set('x-admin-key', 'kunci-salah');
    expect(res.status).toBe(401);
  });

  it('mengembalikan rekap skor dengan API key yang benar', async () => {
    const res = await request(app).get('/api/admin/results').set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0]).toHaveProperty('K1');
    expect(res.body.results[0]).toHaveProperty('weighted_composite');
  });

  it('dapat menyaring berdasarkan kode kelas', async () => {
    const res = await request(app)
      .get('/api/admin/results')
      .query({ classCode: 'UJI-LENGKAP' })
      .set('x-admin-key', ADMIN_KEY);

    expect(res.body.results.every((r: { class_code: string }) => r.class_code === 'UJI-LENGKAP')).toBe(true);
  });

  it('mengekspor CSV yang mengutip payload JSON dengan benar', async () => {
    const res = await request(app)
      .get('/api/admin/events')
      .query({ format: 'csv' })
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const isi = res.text;
    expect(isi).toContain('session_id,student_name');
    // Payload JSON mengandung koma dan tanda kutip, sehingga wajib dikutip
    // agar kolom tidak bergeser saat dibuka di SPSS/Excel.
    expect(isi).toMatch(/"\{""/);
  });

  it('menghasilkan Item-Claim Blueprint dari bank soal', async () => {
    const res = await request(app).get('/api/admin/blueprint').set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(res.body.blueprint).toHaveLength(12);
    expect(res.body.blueprint.find((b: { kode_task: string }) => b.kode_task === 'L2-SDG11&13-A').anchor_item).toBe(true);
  });
});

describe('GET /api/admin/summary - laporan kelas untuk guru', () => {
  it('menolak akses tanpa API key', async () => {
    expect((await request(app).get('/api/admin/summary')).status).toBe(401);
  });

  it('mengembalikan rata-rata dan sebaran per klaim', async () => {
    const res = await request(app).get('/api/admin/summary').set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.perKlaim).toHaveLength(4);
    for (const k of res.body.perKlaim) {
      expect(['K1', 'K2', 'K3', 'K4']).toContain(k.claim);
      // Sebaran selalu empat angka (skor 0,1,2,3) dan jumlahnya sama dengan
      // banyaknya percobaan - kalau tidak, ada baris skor yang hilang dihitung.
      expect(k.distribusi).toHaveLength(4);
      expect(k.distribusi.reduce((a: number, b: number) => a + b, 0)).toBe(res.body.jumlahPercobaan);
    }
  });

  it('memuat rekap per level, per soal, dan daftar siswa', async () => {
    const res = await request(app).get('/api/admin/summary').set('x-admin-key', ADMIN_KEY);

    expect(res.body.perLevel).toHaveLength(4);
    expect(Array.isArray(res.body.perTask)).toBe(true);
    expect(res.body.siswa.length).toBeGreaterThan(0);
    expect(res.body.siswa[0]).toHaveProperty('perLevel');
    expect(res.body.daftarKelas.length).toBeGreaterThan(0);
  });

  it('menyaring berdasarkan kode kelas', async () => {
    const res = await request(app)
      .get('/api/admin/summary')
      .query({ classCode: 'UJI-LENGKAP' })
      .set('x-admin-key', ADMIN_KEY);

    expect(res.body.classCode).toBe('UJI-LENGKAP');
    expect(res.body.siswa.every((s: { classCode: string }) => s.classCode === 'UJI-LENGKAP')).toBe(true);
  });

  it('tidak melempar error saat kelas belum punya data sama sekali', async () => {
    const res = await request(app)
      .get('/api/admin/summary')
      .query({ classCode: 'KELAS-KOSONG' })
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.jumlahPercobaan).toBe(0);
    expect(res.body.perKlaim.every((k: { mean: number | null }) => k.mean === null)).toBe(true);
  });
});

describe('GET /api/admin/student/:sessionId - laporan satu siswa lintas level', () => {
  it('menyaring akses tanpa API key dan sessionId yang tidak dikenal', async () => {
    expect((await request(app).get('/api/admin/student/apa-saja')).status).toBe(401);
    expect((await request(app).get('/api/admin/student/tidak-ada').set('x-admin-key', ADMIN_KEY)).status).toBe(404);
  });

  it('mengembalikan daftar kosong yang wajar untuk siswa yang belum submit level mana pun', async () => {
    const sessionId = await buatSesi('UJI-LAPORAN-KOSONG');
    const res = await request(app).get(`/api/admin/student/${sessionId}`).set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.perLevel).toHaveLength(0);
    expect(res.body.levelsCompleted).toBe(0);
    expect(res.body.profilKlaim).toHaveLength(4);
    expect(res.body.profilKlaim.every((p: { levelCount: number }) => p.levelCount === 0)).toBe(true);
    expect(res.body.kesimpulan).toContain('belum menyelesaikan');
  });

  it('mengagregasi skor dan profil klaim lintas dua level yang dikerjakan', async () => {
    const sessionId = await buatSesi('UJI-LAPORAN-SISWA');

    // Level 1: dikerjakan asal-asalan, tanpa perencanaan.
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });
    await request(app).post('/api/submit').send({ sessionId, taskId: 'L1-SDG11-A', finalX: 30, finalY: 10 });

    // Level 2: variabel ditetapkan dan tujuan dipilih sebelum submit.
    await request(app).get('/api/task/2').query({ sessionId, taskId: 'L2-SDG11-A' });
    const dasar = { session_id: sessionId, task_id: 'L2-SDG11-A', is_valid_at_time: true, duration_since_last_event_ms: 200 };
    await request(app)
      .post('/api/log')
      .send([
        { ...dasar, timestamp_ms: 500, event_type: 'identify_variable', payload: { variable: 'x', optionId: 'vx1' } },
        { ...dasar, timestamp_ms: 700, event_type: 'identify_variable', payload: { variable: 'y', optionId: 'vy1' } },
        { ...dasar, timestamp_ms: 900, event_type: 'select_objective', payload: { optionId: 'g1' } },
      ]);
    await request(app).post('/api/submit').send({ sessionId, taskId: 'L2-SDG11-A', finalX: 10, finalY: 10 });

    const res = await request(app).get(`/api/admin/student/${sessionId}`).set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.studentName).toBeTruthy();
    expect(res.body.classCode).toBe('UJI-LAPORAN-SISWA');
    expect(res.body.levelsCompleted).toBe(2);
    expect(res.body.perLevel.map((p: { level: number }) => p.level).sort()).toEqual([1, 2]);

    // Kalimat penutup per level disimpan apa adanya saat submit, bukan string kosong.
    for (const p of res.body.perLevel) {
      expect(p.overallMessage.length, `level ${p.level}`).toBeGreaterThan(5);
    }

    // Profil klaim merangkum KEDUA level yang dikerjakan.
    expect(res.body.profilKlaim).toHaveLength(4);
    for (const p of res.body.profilKlaim) {
      expect(p.levelCount).toBe(2);
      expect(p.mean).toBeGreaterThanOrEqual(0);
      expect(p.mean).toBeLessThanOrEqual(3);
    }

    // Total mentah adalah jumlah rawSum tiap level - bukan dihitung ulang secara terpisah.
    const totalDariLevel = res.body.perLevel.reduce((n: number, p: { rawSum: number }) => n + p.rawSum, 0);
    expect(res.body.totalRaw).toBe(totalDariLevel);

    expect(res.body.kesimpulan.length).toBeGreaterThan(10);
    expect(res.body.kesimpulan).not.toContain('belum menyelesaikan');
  });
});

describe('GET /api/admin/attempt/:id - rincian pekerjaan satu siswa', () => {
  it('mengembalikan jejak audit, refleksi, dan log', async () => {
    const daftar = await request(app).get('/api/admin/summary').set('x-admin-key', ADMIN_KEY);
    const siswa = daftar.body.siswa.find((s: { perLevel: unknown[] }) => s.perLevel.length > 0);
    const attemptId = siswa.perLevel[0].attemptId as string;

    const res = await request(app).get(`/api/admin/attempt/${attemptId}`).set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.studentName).toBeTruthy();
    expect(res.body.taskTitle).toBeTruthy();
    // Jejak audit inilah yang membuat skor otomatis dapat diperiksa guru.
    expect(res.body.score.trace.claims).toHaveLength(4);
    expect(res.body.score.trace.claims[0]).toHaveProperty('descriptor');
    expect(res.body.score.trace.claims[0]).toHaveProperty('reasons');
    // Umpan balik siswa: bahasa berbeda dari jejak audit teknis di atas, dan
    // disimpan apa adanya dari saat submit - bukan dihitung ulang di sini.
    expect(res.body.score.studentFeedback.claims).toHaveLength(4);
    expect(res.body.score.studentFeedback.claims[0]).toHaveProperty('summary');
    expect(res.body.score.studentFeedback.claims[0]).toHaveProperty('suggestion');
    expect(res.body.score.studentFeedback.overallMessage.length).toBeGreaterThan(5);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.refleksi).toHaveProperty('openText');
  });

  it('mengangkat jawaban refleksi siswa ke permukaan', async () => {
    const daftar = await request(app)
      .get('/api/admin/summary')
      .query({ classCode: 'UJI-LENGKAP' })
      .set('x-admin-key', ADMIN_KEY);
    const attemptId = daftar.body.siswa[0].perLevel[0].attemptId as string;

    const res = await request(app).get(`/api/admin/attempt/${attemptId}`).set('x-admin-key', ADMIN_KEY);

    // Guru harus dapat membaca tulisan siswa tanpa menelusuri log satu per satu.
    expect(res.body.refleksi.openText).toContain('kepala keluarga');
    expect(res.body.refleksi.closedOptionText).toBeTruthy();
    expect(res.body.refleksi.closedOptionQuality).toBe(3);
  });

  it('menolak percobaan yang tidak ada', async () => {
    const res = await request(app).get('/api/admin/attempt/tidak-ada').set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(404);
  });

  it('menolak akses tanpa API key', async () => {
    expect((await request(app).get('/api/admin/attempt/apa-saja')).status).toBe(401);
  });
});

describe('POST /api/admin/k4-override - koreksi manual rater kedua', () => {
  it('menghitung ulang jumlah mentah dan komposit setelah K4 dikoreksi', async () => {
    const sessionId = await buatSesi('UJI-OVERRIDE');
    await request(app).get('/api/task/1').query({ sessionId, taskId: 'L1-SDG11-A' });
    const submit = await request(app)
      .post('/api/submit')
      .send({ sessionId, taskId: 'L1-SDG11-A', finalX: 30, finalY: 10, reflectionClosedOptionId: 'r3' });

    const sebelum = submit.body.rawSum as number;

    const res = await request(app)
      .post('/api/admin/k4-override')
      .set('x-admin-key', ADMIN_KEY)
      .send({ scoreId: submit.body.scoreId, k4ManualOverride: 0, note: 'Jawaban terbuka tidak menunjukkan trade-off.' });

    expect(res.status).toBe(200);
    expect(res.body.k4).toBe(0);
    expect(res.body.overridden).toBe(true);
    expect(res.body.rawSum).toBeLessThan(sebelum);

    // Skor otomatis TIDAK ditimpa, sehingga selisihnya masih dapat dihitung.
    const baris = await prisma.score.findUnique({ where: { id: submit.body.scoreId } });
    expect(baris?.k4).toBeGreaterThan(0);
    expect(baris?.k4ManualOverride).toBe(0);
  });

  it('menolak nilai koreksi di luar rentang 0-3', async () => {
    const res = await request(app)
      .post('/api/admin/k4-override')
      .set('x-admin-key', ADMIN_KEY)
      .send({ scoreId: 'apa-saja', k4ManualOverride: 9 });
    expect(res.status).toBe(400);
  });
});

describe('health check dan CORS', () => {
  it('menjawab /health dengan versi rubrik yang sedang aktif', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.scoringVersion).toBeTruthy();
  });

  it('mengizinkan origin yang terdaftar', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('menolak origin yang tidak terdaftar', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://situs-asing.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('mengembalikan 404 untuk endpoint yang tidak ada', async () => {
    expect((await request(app).get('/api/tidak-ada')).status).toBe(404);
  });
});
