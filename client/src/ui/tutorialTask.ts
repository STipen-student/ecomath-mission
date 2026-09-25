/**
 * Skenario latihan untuk tutorial antarmuka.
 *
 * ────────────────────────────────────────────────────────────────────────
 * MENGAPA BUKAN DIAMBIL DARI BANK SOAL SERVER
 * ────────────────────────────────────────────────────────────────────────
 * Task ini didefinisikan SEPENUHNYA di client dan tidak pernah dikirim ke
 * `/api/task`, tidak punya `TaskAttempt`, dan tidak menghasilkan satu pun baris
 * `EventLog`. Konsekuensinya ia mustahil ikut terskor, mustahil mengacaukan
 * assembly rule, dan mustahil muncul pada ekspor data penelitian.
 *
 * ────────────────────────────────────────────────────────────────────────
 * MENGAPA SELURUH JAWABANNYA DIBERIKAN
 * ────────────────────────────────────────────────────────────────────────
 * Tutorial ini menyasar SATU ancaman validitas: *construct-irrelevant
 * variance*. Siswa yang memperoleh K1 = 0 karena tidak menemukan panel
 * "Variabel" bukan bukti bahwa ia tidak mampu memahami masalah — itu bukti
 * bahwa antarmukanya tidak terpelajari. Skor semacam itu mengukur ketrampilan
 * memakai aplikasi, bukan kemampuan pemecahan masalah matematis.
 *
 * Karena itu tutorial memberikan pertidaksamaan, rumusan tujuan, dan makna
 * variabelnya APA ADANYA untuk disalin siswa. Yang dilatih semata-mata
 * mekaniknya: kotak mana diisi apa, tombol Simpan ada di mana, panel dibuka
 * dari mana.
 *
 * Batas ini penting dan harus dijaga: MENERJEMAHKAN narasi menjadi
 * pertidaksamaan adalah konstruk K1 yang justru diukur instrumen. Bila
 * tutorial pernah mengajarkan cara menerjemahkan, ia mengajarkan jawaban dan
 * K1 tidak lagi mengukur apa pun. Mengetik ke dalam kotak bukan konstruk;
 * menerjemahkan adalah konstruk.
 *
 * Konteksnya pun sengaja dijauhkan dari SDG 11/13 dan dari seluruh struktur
 * soal pada bank skenario, agar tidak ada efek pemanasan terhadap konteks
 * mana pun yang akan dinilai.
 */

import type { TaskDto } from '../api/types.js';

/** Pertidaksamaan yang harus disalin siswa saat tutorial. */
export const KENDALA_LATIHAN = { a: 1, b: 1, op: '<=' as const, c: 10 };

export const TUTORIAL_TASK: TaskDto = {
  id: 'TUTORIAL',
  level: 1,
  sdgContext: 'SDG11',
  title: 'Latihan Cara Bermain',
  narrative:
    'Ini latihan, bukan penilaian — tidak ada skor yang dicatat di sini. Kamu akan menata taman kecil sekolah berisi pot bunga (x) dan bangku taman (y). Seluruh jawabannya sudah dituliskan untukmu di panduan; tugasmu hanya mencobanya sekali supaya terbiasa dengan tombol-tombolnya.',
  dataTable: null,
  variables: {
    x: { key: 'x', label: 'Pot Bunga', unit: 'buah', max: 12, step: 1, visual: 'nature' },
    y: { key: 'y', label: 'Bangku Taman', unit: 'buah', max: 12, step: 1, visual: 'housing' },
  },
  constraints: [
    {
      id: 'lat_total',
      label: 'Ruang taman tersedia',
      a: 1,
      b: 1,
      op: '<=',
      c: 10,
      kind: 'explicit',
      display: 'x + y ≤ 10 (buah)',
    },
    { id: 'lat_nx', label: 'Jumlah tidak negatif (x)', a: 1, b: 0, op: '>=', c: 0, kind: 'nonnegativity', display: 'x ≥ 0' },
    { id: 'lat_ny', label: 'Jumlah tidak negatif (y)', a: 0, b: 1, op: '>=', c: 0, kind: 'nonnegativity', display: 'y ≥ 0' },
  ],
  objective: {
    type: 'max',
    cx: 2,
    cy: 1,
    label: 'Skor keasrian taman',
    unit: 'poin',
    display: 'Maksimumkan Z = 2x + 1y',
  },
  domain: 'integer',
  representation: 'narrative',
  goalOptions: [
    { id: 'lat_g1', text: 'Memaksimumkan skor keasrian taman' },
    { id: 'lat_g2', text: 'Menghabiskan seluruh ruang taman' },
  ],
  variableOptions: [
    { id: 'lat_vx1', text: 'Banyaknya pot bunga', assignsTo: 'x' },
    { id: 'lat_vx2', text: 'Banyaknya bangku taman', assignsTo: 'x' },
    { id: 'lat_vy1', text: 'Banyaknya bangku taman', assignsTo: 'y' },
    { id: 'lat_vy2', text: 'Banyaknya pot bunga', assignsTo: 'y' },
  ],
  reflection: {
    closed: {
      prompt: 'Latihan terakhir: pilih salah satu jawaban di bawah (mana pun boleh, ini tidak dinilai).',
      options: [
        { id: 'lat_r1', text: 'Sudah, ruang taman terpakai dengan baik' },
        { id: 'lat_r2', text: 'Masih bisa ditambah pot bunga' },
      ],
    },
    openPrompt: 'Tulis apa saja di sini (satu kata pun cukup) untuk mencoba kotak jawaban terbuka.',
  },
  expectedConstraintCount: 1,
  gameInteraction: 'Latihan mengenal panel dan tombol.',
  hasDistractor: false,
};

/** Opsi variabel yang benar untuk latihan — dipakai panduan langkah. */
export const JAWABAN_LATIHAN = {
  variabelX: 'lat_vx1',
  variabelY: 'lat_vy1',
  tujuan: 'lat_g1',
} as const;
