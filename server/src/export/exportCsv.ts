/**
 * Ekspor data penelitian ke CSV.
 *
 * Menghasilkan empat berkas yang saling melengkapi:
 *
 *   sessions.csv     satu baris per siswa - data identitas dan waktu
 *   scores_long.csv  satu baris per PERCOBAAN (siswa x level) - format panjang,
 *                    dipakai untuk analisis butir, korelasi item-total, dan Rasch
 *   scores_wide.csv  satu baris per SISWA dengan kolom K1_L1 ... K4_L4 - format
 *                    lebar, langsung siap dihitung Cronbach's alpha di SPSS/Jamovi
 *   events.csv       seluruh log mentah - untuk analisis proses (process mining,
 *                    pola trial-error, durasi perencanaan)
 *
 * Dua format skor sengaja disediakan karena SPSS menghitung reliabilitas dari
 * format LEBAR (tiap butir satu kolom), sedangkan analisis multilevel dan
 * pemodelan Rasch menuntut format PANJANG. Mengonversinya manual di Excel adalah
 * sumber kesalahan yang tidak perlu.
 */

import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { toCsv, type CsvRow } from '../lib/csv.js';
import { effectiveScore } from '../lib/scoreView.js';
import { narrateEvent } from '../lib/eventNarrator.js';
import { SCORING_VERSION } from '../scoring/thresholds.js';

const prisma = new PrismaClient();

export interface ExportOptions {
  /** Folder tujuan; dibuat bila belum ada. */
  outDir: string;
  /** Batasi pada satu kode kelas saja. */
  classCode?: string;
  /** Sertakan jejak audit rubrik (kolom besar berisi JSON). */
  includeTrace?: boolean;
}

function tulis(outDir: string, nama: string, rows: CsvRow[]): void {
  const path = join(outDir, nama);
  writeFileSync(path, toCsv(rows), 'utf8');
  console.log(`  ${nama.padEnd(18)} ${String(rows.length).padStart(6)} baris  -> ${path}`);
}

export async function runExport(opts: ExportOptions): Promise<void> {
  const outDir = resolve(opts.outDir);
  mkdirSync(outDir, { recursive: true });

  const filterKelas = opts.classCode ? { classCode: opts.classCode } : {};

  console.log(`Mengekspor data penelitian (versi rubrik ${SCORING_VERSION})`);
  if (opts.classCode) console.log(`Disaring pada kode kelas: ${opts.classCode}`);
  console.log('');

  /* ---------------- sessions.csv ---------------- */
  const sessions = await prisma.session.findMany({
    where: filterKelas,
    orderBy: [{ classCode: 'asc' }, { startedAt: 'asc' }],
    include: { attempts: { include: { score: true } } },
  });

  tulis(
    outDir,
    'sessions.csv',
    sessions.map((s) => ({
      session_id: s.id,
      student_name: s.studentName,
      student_id: s.studentId ?? '',
      class_code: s.classCode,
      started_at: s.startedAt.toISOString(),
      finished_at: s.finishedAt ? s.finishedAt.toISOString() : '',
      /** Durasi total sesi dalam menit; kosong bila sesi tidak diselesaikan. */
      duration_min: s.finishedAt
        ? Math.round(((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000) * 100) / 100
        : '',
      levels_completed: s.attempts.filter((a) => a.score !== null).length,
      session_composite: s.sessionComposite ?? '',
      user_agent: s.userAgent ?? '',
    })),
  );

  /* ---------------- scores_long.csv ---------------- */
  const scores = await prisma.score.findMany({
    where: opts.classCode ? { attempt: { session: { classCode: opts.classCode } } } : {},
    include: { attempt: { include: { session: true } } },
    orderBy: [{ sessionId: 'asc' }, { level: 'asc' }],
  });

  tulis(
    outDir,
    'scores_long.csv',
    scores.map((s) => {
      const eff = effectiveScore(s);
      return {
        session_id: s.sessionId,
        student_name: s.attempt.session.studentName,
        student_id: s.attempt.session.studentId ?? '',
        class_code: s.attempt.session.classCode,
        level: s.level,
        task_id: s.taskId,
        K1: s.k1,
        K2: s.k2,
        K3: s.k3,
        K4_auto: s.k4,
        K4_manual: s.k4ManualOverride ?? '',
        K4: eff.k4,
        /** 1 bila skor K4 dikoreksi manual - dipakai menghitung kesepakatan antar-penilai. */
        K4_overridden: eff.overridden,
        raw_sum: eff.rawSum,
        weighted_composite: eff.weightedComposite,
        scoring_version: s.scoringVersion,
        attempt_started_at: s.attempt.startedAt.toISOString(),
        attempt_finished_at: s.attempt.finishedAt ? s.attempt.finishedAt.toISOString() : '',
        attempt_duration_min: s.attempt.finishedAt
          ? Math.round(((s.attempt.finishedAt.getTime() - s.attempt.startedAt.getTime()) / 60000) * 100) / 100
          : '',
        computed_at: s.computedAt.toISOString(),
        ...(opts.includeTrace ? { trace: s.trace } : {}),
      };
    }),
  );

  /* ---------------- scores_wide.csv ---------------- */
  const perSesi = new Map<string, (typeof scores)[number][]>();
  for (const s of scores) {
    const daftar = perSesi.get(s.sessionId) ?? [];
    daftar.push(s);
    perSesi.set(s.sessionId, daftar);
  }

  const wide: CsvRow[] = [];
  for (const [sessionId, daftar] of perSesi) {
    const pertama = daftar[0]!;
    const baris: CsvRow = {
      session_id: sessionId,
      student_name: pertama.attempt.session.studentName,
      student_id: pertama.attempt.session.studentId ?? '',
      class_code: pertama.attempt.session.classCode,
    };

    let totalMentah = 0;
    let jumlahLevel = 0;

    for (const level of [1, 2, 3, 4]) {
      const s = daftar.find((x) => x.level === level);
      // Sel dikosongkan (bukan diisi 0) bila level tidak dikerjakan, supaya SPSS
      // memperlakukannya sebagai missing value - bukan sebagai skor nol yang
      // akan menarik turun rata-rata dan merusak perhitungan reliabilitas.
      if (!s) {
        baris[`task_L${level}`] = '';
        baris[`K1_L${level}`] = '';
        baris[`K2_L${level}`] = '';
        baris[`K3_L${level}`] = '';
        baris[`K4_L${level}`] = '';
        baris[`sum_L${level}`] = '';
        baris[`comp_L${level}`] = '';
        continue;
      }
      const eff = effectiveScore(s);
      baris[`task_L${level}`] = s.taskId;
      baris[`K1_L${level}`] = s.k1;
      baris[`K2_L${level}`] = s.k2;
      baris[`K3_L${level}`] = s.k3;
      baris[`K4_L${level}`] = eff.k4;
      baris[`sum_L${level}`] = eff.rawSum;
      baris[`comp_L${level}`] = eff.weightedComposite;
      totalMentah += eff.rawSum;
      jumlahLevel++;
    }

    baris.levels_completed = jumlahLevel;
    baris.total_raw = totalMentah;
    baris.mean_composite = pertama.attempt.session.sessionComposite ?? '';
    wide.push(baris);
  }

  tulis(outDir, 'scores_wide.csv', wide);

  /* ---------------- events.csv ---------------- */
  const events = await prisma.eventLog.findMany({
    where: opts.classCode ? { attempt: { session: { classCode: opts.classCode } } } : {},
    include: { attempt: { include: { session: true } } },
    orderBy: [{ sessionId: 'asc' }, { taskId: 'asc' }, { timestampMs: 'asc' }],
  });

  // Payload JSON diterjemahkan menjadi kalimat berbahasa Indonesia dan kolom
  // terurai - lihat lib/eventNarrator.ts. Endpoint unduh langsung di halaman
  // guru memakai fungsi yang sama persis, sehingga kedua jalur ekspor selalu
  // menghasilkan narasi yang identik.
  tulis(
    outDir,
    'events.csv',
    events.map((e) => {
      const d = narrateEvent(e.taskId, e.eventType, e.payload);
      return {
        session_id: e.sessionId,
        student_name: e.attempt.session.studentName,
        class_code: e.attempt.session.classCode,
        level: e.attempt.level,
        task_id: e.taskId,
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
        is_valid_at_time: e.isValidAtTime,
        duration_since_last_event_ms: e.durationSinceLastEventMs,
        received_at: e.receivedAt.toISOString(),
        payload_json: e.payload,
      };
    }),
  );

  console.log('');
  console.log(`Selesai. ${sessions.length} sesi, ${scores.length} skor, ${events.length} event.`);
  console.log('');
  console.log('Catatan untuk analisis:');
  console.log('  - scores_wide.csv  : reliabilitas (Cronbach alpha) dan statistik deskriptif per siswa');
  console.log('  - scores_long.csv  : analisis butir, korelasi item-total, pemodelan Rasch/IRT');
  console.log('  - events.csv       : analisis proses (durasi perencanaan, pola trial-error)');
  console.log('  - Sel kosong pada scores_wide.csv berarti level TIDAK dikerjakan (missing value),');
  console.log('    bukan skor nol. Setel sebagai missing di SPSS sebelum menghitung reliabilitas.');
}

/** Baca argumen baris perintah sederhana: --out, --class, --trace. */
export function parseArgs(argv: string[]): ExportOptions {
  const ambil = (nama: string): string | undefined => {
    const i = argv.indexOf(`--${nama}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    outDir: ambil('out') ?? './exports',
    classCode: ambil('class'),
    includeTrace: argv.includes('--trace'),
  };
}

export async function main(argv: string[]): Promise<void> {
  try {
    await runExport(parseArgs(argv));
  } finally {
    await prisma.$disconnect();
  }
}
