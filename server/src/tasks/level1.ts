/**
 * Bank Skenario Level 1 (docs/ECD_Framework.md Bagian 6).
 *
 * Karakteristik: kendala eksplisit sederhana, bilangan bulat, TANPA distraktor,
 * representasi naratif murni. Fokus bukti dominan: K1 (Memahami Masalah).
 *
 * Catatan penyetaraan: Tabel Bagian 10 mencantumkan "Jml Kendala = 1" untuk
 * seluruh varian Level 1, sedangkan narasi tiap varian meminta siswa menuliskan
 * DUA pertidaksamaan. Sesuai keputusan peneliti, mesin skoring K2 memakai
 * `expectedConstraintCount` (mengikuti narasi = 2), sementara angka blueprint
 * disimpan terpisah pada `blueprintConstraintCount` untuk Item-Claim Blueprint.
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

export const LEVEL_1_TASKS: TaskDefinition[] = [
  {
    id: 'L1-SDG11-A',
    level: 1,
    sdgContext: 'SDG11',
    title: 'Ruang Terbuka Hijau Kota Ecoville',
    narrative:
      'Sebuah kota kecil bernama Ecoville memiliki total lahan kosong seluas 40 hektar yang akan dibagi untuk dua peruntukan: Ruang Terbuka Hijau (RTH) seluas x hektar dan kawasan permukiman baru seluas y hektar. Sesuai target SDG 11, luas RTH minimal harus 2 kali luas kawasan permukiman baru. Tuliskan pertidaksamaan yang menggambarkan hubungan antara x dan y, serta pertidaksamaan yang menggambarkan total lahan yang tersedia.',
    variables: {
      x: { key: 'x', label: 'Ruang Terbuka Hijau (RTH)', unit: 'hektar', max: 50, step: 1, visual: 'nature' },
      y: { key: 'y', label: 'Kawasan permukiman baru', unit: 'hektar', max: 50, step: 1, visual: 'housing' },
    },
    constraints: [
      c('k_lahan', 'Total lahan tersedia', 1, 1, '<=', 40, 'explicit', 'total lahan kosong seluas 40 hektar', 'hektar'),
      c('k_rasio', 'RTH minimal 2x permukiman', 1, -2, '>=', 0, 'explicit', 'luas RTH minimal harus 2 kali luas kawasan permukiman baru'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'continuous',
    numberStyle: 'simple_integer',
    representation: 'narrative',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua kombinasi luas RTH dan permukiman yang memenuhi kedua kendala', correct: true },
      { id: 'g2', text: 'Memaksimumkan luas permukiman baru tanpa memperhatikan luas RTH', correct: false },
      { id: 'g3', text: 'Menghabiskan seluruh 40 hektar untuk RTH saja', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Ruang Terbuka Hijau (RTH) dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas kawasan permukiman baru dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Jumlah penduduk kota Ecoville', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas kawasan permukiman baru dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Ruang Terbuka Hijau (RTH) dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Total lahan kosong yang dimiliki kota', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt:
          'Apakah alokasi lahanmu masih dapat diperbaiki agar lebih ramah lingkungan tanpa melebihi total lahan yang tersedia?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Bisa, tinggal memperbesar RTH saja', quality: 1 },
          { id: 'r2', text: 'Bisa, RTH diperbesar tetapi total lahan 40 hektar tidak boleh terlampaui', quality: 2 },
          {
            id: 'r3',
            text: 'Bisa, RTH diperbesar dengan mengurangi permukiman, dan konsekuensinya daya tampung hunian kota berkurang',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: apa yang harus dikorbankan jika kota ingin menambah luas RTH?',
      expectedTerms: ['rth', 'ruang terbuka hijau', 'hijau', 'permukiman', 'hunian', 'lahan', 'hektar'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 1,
    dominantClaims: ['K1'],
    gameInteraction:
      'Menggeser dua slider zona (RTH dan permukiman) pada peta kota; sistem menandai merah bila kombinasi melanggar salah satu kendala.',
  },

  {
    id: 'L1-SDG13-A',
    level: 1,
    sdgContext: 'SDG13',
    title: 'Armada Bus Rendah Emisi',
    narrative:
      'Dinas Perhubungan kota Ecoville akan menambah armada transportasi umum sebanyak x unit bus listrik dan y unit bus konvensional, dengan total penambahan tidak lebih dari 24 unit karena keterbatasan garasi. Sesuai komitmen SDG 13, jumlah bus listrik yang ditambahkan harus lebih dari jumlah bus konvensional. Tuliskan pertidaksamaan-pertidaksamaan yang menggambarkan situasi tersebut.',
    variables: {
      x: { key: 'x', label: 'Bus listrik', unit: 'unit', max: 30, step: 1, visual: 'clean' },
      y: { key: 'y', label: 'Bus konvensional', unit: 'unit', max: 30, step: 1, visual: 'neutral' },
    },
    constraints: [
      c('k_garasi', 'Kapasitas garasi', 1, 1, '<=', 24, 'explicit', 'total penambahan tidak lebih dari 24 unit', 'unit'),
      c('k_listrik', 'Bus listrik lebih banyak', 1, -1, '>', 0, 'explicit', 'jumlah bus listrik harus lebih dari jumlah bus konvensional'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'integer',
    numberStyle: 'simple_integer',
    representation: 'narrative',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua kombinasi jumlah bus yang memenuhi kapasitas garasi dan komitmen emisi', correct: true },
      { id: 'g2', text: 'Menambah bus sebanyak-banyaknya sampai garasi penuh', correct: false },
      { id: 'g3', text: 'Menyamakan jumlah bus listrik dan bus konvensional', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Jumlah unit bus listrik yang ditambahkan', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Jumlah unit bus konvensional yang ditambahkan', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Kapasitas maksimum garasi kota', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Jumlah unit bus konvensional yang ditambahkan', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Jumlah unit bus listrik yang ditambahkan', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Jumlah penumpang harian', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt:
          'Apakah komposisi armada pilihanmu sudah paling mendukung target penurunan emisi tanpa melanggar kapasitas garasi?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Sudah, karena jumlah totalnya masih di bawah 24 unit', quality: 1 },
          { id: 'r2', text: 'Belum, bus listrik masih bisa ditambah selama kapasitas garasi 24 unit tidak terlampaui', quality: 2 },
          {
            id: 'r3',
            text: 'Belum, bus listrik bisa ditambah dengan mengurangi bus konvensional, tetapi konsekuensinya biaya pengadaan armada akan naik',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: apa yang harus dikorbankan kota jika ingin memperbanyak bus listrik?',
      expectedTerms: ['bus listrik', 'listrik', 'konvensional', 'garasi', 'emisi', 'unit', 'armada'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 1,
    dominantClaims: ['K1'],
    gameInteraction:
      'Menempatkan unit bus di depo melalui dua tumpukan counter; sistem menampilkan sisa kapasitas garasi secara real-time.',
  },

  {
    id: 'L1-SDG11&13-A',
    level: 1,
    sdgContext: 'SDG11&13',
    title: 'Lahan Parkir vs Jalur Sepeda',
    narrative:
      'Pemerintah kota akan merenovasi satu ruas jalan dengan total 30 meter lebar efektif menjadi dua peruntukan: lahan parkir selebar x meter dan jalur sepeda selebar y meter. Untuk mendukung mobilitas rendah emisi, lebar jalur sepeda harus paling sedikit sama dengan lebar lahan parkir. Tuliskan pertidaksamaan yang menggambarkan situasi ini.',
    variables: {
      x: { key: 'x', label: 'Lahan parkir', unit: 'meter', max: 35, step: 1, visual: 'neutral' },
      y: { key: 'y', label: 'Jalur sepeda', unit: 'meter', max: 35, step: 1, visual: 'nature' },
    },
    constraints: [
      c('k_lebar', 'Lebar efektif jalan', 1, 1, '<=', 30, 'explicit', 'total 30 meter lebar efektif', 'meter'),
      c('k_sepeda', 'Jalur sepeda minimal selebar parkir', -1, 1, '>=', 0, 'explicit', 'lebar jalur sepeda paling sedikit sama dengan lebar lahan parkir'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'continuous',
    numberStyle: 'simple_integer',
    representation: 'narrative',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pembagian lebar jalan yang memenuhi kedua kendala', correct: true },
      { id: 'g2', text: 'Memaksimumkan lebar lahan parkir agar kota mendapat retribusi terbesar', correct: false },
      { id: 'g3', text: 'Membagi rata 15 meter untuk masing-masing peruntukan', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Lebar lahan parkir dalam meter', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Lebar jalur sepeda dalam meter', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Panjang ruas jalan yang direnovasi', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Lebar jalur sepeda dalam meter', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Lebar lahan parkir dalam meter', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Total lebar efektif jalan', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt:
          'Apakah pembagian lebar jalan pilihanmu sudah mendukung mobilitas rendah emisi tanpa melebihi lebar jalan yang tersedia?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Sudah, karena jalur sepedanya sudah ada', quality: 1 },
          { id: 'r2', text: 'Bisa ditingkatkan, jalur sepeda diperlebar selama total 30 meter tidak terlampaui', quality: 2 },
          {
            id: 'r3',
            text: 'Bisa ditingkatkan, jalur sepeda diperlebar dengan mengurangi lahan parkir, tetapi konsekuensinya daya tampung kendaraan pribadi berkurang',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: apa konsekuensinya bagi pengguna kendaraan pribadi bila jalur sepeda diperlebar?',
      expectedTerms: ['jalur sepeda', 'sepeda', 'parkir', 'lebar', 'meter', 'jalan', 'emisi'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 1,
    dominantClaims: ['K1'],
    gameInteraction: 'Mengatur dua segmen jalan pada tampilan potongan melintang (cross-section) jalan kota.',
  },
];
