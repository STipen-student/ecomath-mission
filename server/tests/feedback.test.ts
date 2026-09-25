/**
 * Uji penyusun umpan balik siswa.
 *
 * Yang dijaga di sini bukan kalimatnya persis, melainkan SIFAT yang membuat
 * umpan balik berguna: selalu ada saran untuk setiap kombinasi klaim dan skor,
 * kalimatnya bebas istilah teknis internal, dan isinya berubah mengikuti apa
 * yang sebenarnya dilakukan siswa.
 */

import { describe, expect, it } from 'vitest';
import { getTaskById, TASK_BANK } from '../src/tasks/index.js';
import { scoreAttempt } from '../src/scoring/index.js';
import { buildOverallMessage, buildSessionConclusion, type ClaimProfile } from '../src/scoring/feedback.js';
import { L1_KEY, L3_KEY, L4_KEY, log } from './fixtures/logBuilder.js';

const l1 = getTaskById('L1-SDG11-A')!;
const l3 = getTaskById('L3-SDG11-A')!;
const l4 = getTaskById('L4-SDG11-A')!;

/** Istilah internal yang tidak boleh bocor ke layar siswa. */
const ISTILAH_TEKNIS = [
  'boundary_violation_count',
  'check_corner_point',
  'attempt_submit',
  'identify_variable',
  'select_objective',
  'write_constraint',
  'reflection_response',
  'revise_after_event',
  'relativeGap',
  'criterion',
  'observable',
];

describe('umpan balik selalu tersedia', () => {
  it('memberi ringkasan dan saran untuk keempat klaim pada log kosong', () => {
    for (const task of TASK_BANK) {
      const r = scoreAttempt(task, []);
      expect(r.studentFeedback, task.id).toHaveLength(4);
      for (const f of r.studentFeedback) {
        expect(f.summary.length, `${task.id}/${f.claim} ringkasan`).toBeGreaterThan(15);
        expect(f.suggestion.length, `${task.id}/${f.claim} saran`).toBeGreaterThan(15);
        expect(f.title.length).toBeGreaterThan(3);
      }
    }
  });

  it('tetap memberi saran meskipun siswa sudah mendapat skor sempurna', () => {
    const events = log(l4.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L4_KEY.lahan)
      .writeConstraint(1, ...L4_KEY.anggaran)
      .writeConstraint(2, ...L4_KEY.rth)
      .checkCorner(84, 36, 3360)
      .moveSlider(84, 36)
      .submit(84, 36)
      .distractorShown('ev_rth_40')
      .reviseAfterEvent(72, 48)
      .submit(72, 48, 'post_event')
      .reflection(
        'r3',
        'RTH naik dari 36 ke 48 hektar sehingga perumahan turun ke 72 hektar, akibatnya daya tampung berkurang 480 kepala keluarga karena hunian dikorbankan demi lingkungan.',
      )
      .build();

    const r = scoreAttempt(l4, events);
    expect(r.rawSum).toBe(12);
    for (const f of r.studentFeedback) {
      expect(f.score).toBe(3);
      // Skor sempurna pun tetap mendapat langkah berikutnya - umpan balik
      // formatif tidak boleh berhenti hanya karena siswa sudah benar.
      expect(f.suggestion.length).toBeGreaterThan(15);
    }
  });

  it('tidak membocorkan istilah teknis internal ke kalimat siswa', () => {
    const contoh = [
      scoreAttempt(l1, []),
      scoreAttempt(l3, log(l3.id).identifyBothCorrect().moveSlider(0, 60).submit(0, 60).build()),
      scoreAttempt(l4, log(l4.id).moveSlider(120, 10, false).submit(120, 10, 'initial', false).build()),
    ];

    for (const r of contoh) {
      const teks = r.studentFeedback.map((f) => `${f.summary} ${f.suggestion}`).join(' ').toLowerCase();
      for (const istilah of ISTILAH_TEKNIS) {
        expect(teks, `bocor: ${istilah}`).not.toContain(istilah.toLowerCase());
      }
    }
  });
});

describe('umpan balik mengikuti perilaku siswa', () => {
  it('membedakan siswa yang belum menetapkan variabel dari yang menukarnya', () => {
    const tanpaVariabel = scoreAttempt(l1, log(l1.id).moveSlider(30, 5).submit(30, 5).build());
    const tertukar = scoreAttempt(
      l1,
      log(l1.id).identifyVariable('x', 'vx2').identifyVariable('y', 'vy2').submit(30, 5).build(),
    );

    const a = tanpaVariabel.studentFeedback.find((f) => f.claim === 'K1')!;
    const b = tertukar.studentFeedback.find((f) => f.claim === 'K1')!;

    expect(a.score).toBe(0);
    expect(b.score).toBe(0);
    // Skornya sama, tetapi sarannya harus berbeda: keduanya butuh tindakan
    // yang berbeda pula.
    expect(a.suggestion).not.toBe(b.suggestion);
  });

  it('menyebut kendala yang dilanggar pada K3 ketika solusi akhir tidak sah', () => {
    const events = log(l3.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(100, 30, false)
      .submit(100, 30, 'initial', false)
      .build();

    const k3 = scoreAttempt(l3, events).studentFeedback.find((f) => f.claim === 'K3')!;
    expect(k3.score).toBe(0);
    expect(k3.summary.toLowerCase()).toContain('melanggar');
  });

  it('menyebut selisih nilai Z ketika siswa sah tetapi belum optimum', () => {
    const events = log(l3.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(0, 60)
      .submit(0, 60)
      .build();

    const k3 = scoreAttempt(l3, events).studentFeedback.find((f) => f.claim === 'K3')!;
    expect(k3.score).toBe(1);
    // Angka milik siswa sendiri dan angka terbaik harus muncul supaya sarannya
    // terasa spesifik, bukan template.
    expect(k3.summary).toContain('300');
    expect(k3.summary).toContain(String(L3_KEY.optimumZ));
  });

  it('membedakan tidak merevisi dari merevisi tetapi masih melanggar pada K4', () => {
    const dasar = () =>
      log(l4.id).identifyBothCorrect().selectObjective('g1').moveSlider(84, 36).submit(84, 36).distractorShown('ev_rth_40');

    const tanpaRevisi = scoreAttempt(l4, dasar().reflection('r3', 'RTH bertambah tetapi perumahan berkurang.').build());
    const revisiGagal = scoreAttempt(
      l4,
      dasar().reviseAfterEvent(80, 40, false).submit(80, 40, 'post_event', false).reflection('r3', 'RTH bertambah tetapi perumahan berkurang.').build(),
    );

    const a = tanpaRevisi.studentFeedback.find((f) => f.claim === 'K4')!;
    const b = revisiGagal.studentFeedback.find((f) => f.claim === 'K4')!;

    expect(a.score).toBe(0);
    expect(b.score).toBe(1);
    expect(a.summary).not.toBe(b.summary);
  });

  it('tidak menuduh siswa diam ketika ia sebenarnya menjawab refleksi', () => {
    // Skor K4 boleh 0, tetapi kalimatnya tidak boleh menyatakan siswa tidak
    // menjawab bila ia benar-benar menulis sesuatu - itu membuat seluruh umpan
    // balik terasa tidak dapat dipercaya.
    const menjawabLemah = scoreAttempt(
      l1,
      log(l1.id)
        .identifyBothCorrect()
        .selectObjective('g1')
        .submit(30, 10)
        .reflection('r1', 'Kota sebaiknya dibuat lebih bagus dan nyaman untuk semua orang.')
        .build(),
    ).studentFeedback.find((f) => f.claim === 'K4')!;

    const diam = scoreAttempt(
      l1,
      log(l1.id).identifyBothCorrect().selectObjective('g1').submit(30, 10).build(),
    ).studentFeedback.find((f) => f.claim === 'K4')!;

    expect(menjawabLemah.score).toBe(0);
    expect(diam.score).toBe(0);
    expect(diam.summary.toLowerCase()).toContain('tidak menjawab');
    expect(menjawabLemah.summary.toLowerCase()).not.toContain('tidak menjawab');
  });

  it('memakai varian refleksi saja pada level tanpa event distraktor', () => {
    const events = log(l1.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .writeConstraint(0, ...L1_KEY.lahan)
      .writeConstraint(1, ...L1_KEY.rasio)
      .submit(30, 10)
      .build();

    const k4 = scoreAttempt(l1, events).studentFeedback.find((f) => f.claim === 'K4')!;
    expect(k4.score).toBe(0);
    expect(k4.summary.toLowerCase()).toContain('refleksi');
  });
});

describe('kalimat penutup', () => {
  it('menyebut klaim terkuat dan terlemah bila profilnya tidak rata', () => {
    const pesan = buildOverallMessage([
      { claim: 'K1', title: 'Memahami masalah', score: 3, summary: '', suggestion: '' },
      { claim: 'K2', title: 'Menyusun rencana', score: 0, summary: '', suggestion: '' },
      { claim: 'K3', title: 'Menjalankan rencana', score: 2, summary: '', suggestion: '' },
      { claim: 'K4', title: 'Memeriksa kembali', score: 1, summary: '', suggestion: '' },
    ]);
    expect(pesan).toContain('memahami masalah');
    expect(pesan).toContain('menyusun rencana');
  });

  it('mengajak naik level bila seluruh klaim sempurna', () => {
    const pesan = buildOverallMessage(
      (['K1', 'K2', 'K3', 'K4'] as const).map((claim) => ({ claim, title: claim, score: 3 as const, summary: '', suggestion: '' })),
    );
    expect(pesan.toLowerCase()).toContain('level berikutnya');
  });

  it('memberi satu langkah awal bila seluruh klaim nol', () => {
    const pesan = buildOverallMessage(
      (['K1', 'K2', 'K3', 'K4'] as const).map((claim) => ({ claim, title: claim, score: 0 as const, summary: '', suggestion: '' })),
    );
    expect(pesan.length).toBeGreaterThan(20);
  });
});

describe('buildSessionConclusion - kesimpulan lintas level untuk laporan guru', () => {
  const profil = (isi: Array<[ClaimProfile['claim'], string, number, number]>): ClaimProfile[] =>
    isi.map(([claim, title, mean, levelCount]) => ({ claim, title, mean, levelCount }));

  it('menyebut siswa belum mengerjakan apa pun bila tidak ada level berisi data', () => {
    const pesan = buildSessionConclusion(
      profil([
        ['K1', 'Memahami masalah', 0, 0],
        ['K2', 'Menyusun rencana', 0, 0],
        ['K3', 'Menjalankan rencana', 0, 0],
        ['K4', 'Memeriksa kembali', 0, 0],
      ]),
    );
    expect(pesan).toContain('belum menyelesaikan');
  });

  it('menyebut penguasaan konsisten bila klaim terlemah tetap tinggi', () => {
    const pesan = buildSessionConclusion(
      profil([
        ['K1', 'Memahami masalah', 3, 2],
        ['K2', 'Menyusun rencana', 2.5, 2],
        ['K3', 'Menjalankan rencana', 2.5, 2],
        ['K4', 'Memeriksa kembali', 3, 2],
      ]),
    );
    expect(pesan.toLowerCase()).toContain('konsisten');
  });

  it('menyarankan mulai dari K1 bila klaim terbaik pun masih sangat rendah', () => {
    const pesan = buildSessionConclusion(
      profil([
        ['K1', 'Memahami masalah', 0.5, 3],
        ['K2', 'Menyusun rencana', 0.3, 3],
        ['K3', 'Menjalankan rencana', 0, 3],
        ['K4', 'Memeriksa kembali', 0, 3],
      ]),
    );
    expect(pesan).toContain('K1');
  });

  it('menyebutkan klaim terkuat dan terlemah beserta rata-ratanya', () => {
    const pesan = buildSessionConclusion(
      profil([
        ['K1', 'Memahami masalah', 3, 4],
        ['K2', 'Menyusun rencana', 2, 4],
        ['K3', 'Menjalankan rencana', 1, 4],
        ['K4', 'Memeriksa kembali', 0.5, 4],
      ]),
    );
    expect(pesan.toLowerCase()).toContain('memahami masalah');
    expect(pesan.toLowerCase()).toContain('memeriksa kembali');
    expect(pesan).toContain('3.0');
    expect(pesan).toContain('0.5');
  });

  it('mengabaikan klaim yang levelCount-nya nol saat mencari terkuat/terlemah', () => {
    // K4 sengaja tidak pernah muncul (mis. hanya mengerjakan level tanpa event
    // distraktor) - kesimpulan tidak boleh menganggapnya sebagai klaim terlemah
    // hanya karena rata-ratanya bawaan 0.
    const pesan = buildSessionConclusion(
      profil([
        ['K1', 'Memahami masalah', 3, 2],
        ['K2', 'Menyusun rencana', 1, 2],
        ['K3', 'Menjalankan rencana', 2, 2],
        ['K4', 'Memeriksa kembali', 0, 0],
      ]),
    );
    expect(pesan.toLowerCase()).not.toContain('memeriksa kembali');
  });
});
