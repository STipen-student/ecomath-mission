/**
 * Bank Skenario Level 3 (instrumen 2.0.0): SISTEM PERTIDAKSAMAAN LINEAR DUA
 * VARIABEL tanpa fungsi tujuan, sesuai materi kelas X.
 *
 * Karakteristik: tiga kendala eksplisit (termasuk batas bawah ">=" yang
 * memotong daerah dari sisi lain), dibaca dari narasi dan tabel. Siswa menyusun
 * sistem pertidaksamaan, menggambar himpunan penyelesaiannya, lalu memilih satu
 * rencana di dalamnya. Fokus bukti dominan: K2-K3 (K3 memakai varian
 * feasibility_only, lihat scoring/k3.ts).
 *
 * Ketiga varian sengaja berbeda gaya angkanya (bulat kecil, ribuan, desimal)
 * agar pemilihan adaptif punya ruang (tasks/adaptive.ts). Soal program linear
 * Level 3 instrumen 1.x diarsipkan di level3ProgramLinear.ts.
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

const TANPA_TUJUAN = { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' } as const;

export const LEVEL_3_TASKS: TaskDefinition[] = [
  {
    id: 'L3-SDG11-B',
    level: 3,
    sdgContext: 'SDG11',
    title: 'Menata Ulang Alun-alun Meridian',
    narrative:
      'Alun-alun lama Kota Meridian seluas 60 hektar akan ditata ulang menjadi pasar rakyat seluas x hektar dan ruang hijau seluas y hektar. Luas pasar dan ruang hijau bersama-sama tidak boleh melebihi luas alun-alun. Agar semua pedagang lama mendapat tempat, luas pasar paling sedikit 10 hektar. Agar alun-alun tetap sejuk, luas ruang hijau paling sedikit sama dengan luas pasar. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu rencana penataan yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Ketentuan', 'Nilai'],
      rows: [
        ['Luas alun-alun', '60 hektar'],
        ['Luas pasar rakyat (x)', 'paling sedikit 10 hektar'],
        ['Luas ruang hijau (y)', 'paling sedikit sama dengan luas pasar'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Pasar rakyat', unit: 'hektar', max: 65, step: 1, visual: 'neutral', sprite: 'gedung' },
      y: { key: 'y', label: 'Ruang hijau', unit: 'hektar', max: 65, step: 1, visual: 'nature', sprite: 'taman-kota' },
    },
    constraints: [
      c('k_lahan', 'Luas alun-alun', 1, 1, '<=', 60, 'explicit', 'luas pasar dan ruang hijau tidak boleh melebihi 60 hektar', 'hektar'),
      c('k_pedagang', 'Pasar minimal untuk pedagang', 1, 0, '>=', 10, 'explicit', 'luas pasar paling sedikit 10 hektar', 'hektar'),
      c('k_hijau', 'Ruang hijau minimal seluas pasar', -1, 1, '>=', 0, 'explicit', 'luas ruang hijau paling sedikit sama dengan luas pasar'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'continuous',
    numberStyle: 'simple_integer',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pasangan luas pasar dan ruang hijau yang memenuhi ketiga ketentuan, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Memaksimumkan luas pasar rakyat tanpa memperhatikan ruang hijau', correct: false },
      { id: 'g3', text: 'Membagi alun-alun sama rata antara pasar dan ruang hijau', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas pasar rakyat dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas ruang hijau dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Jumlah pedagang di pasar', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas ruang hijau dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas pasar rakyat dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Luas alun-alun seluruhnya', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Bagaimana kamu memastikan rencana penataanmu benar-benar termasuk himpunan penyelesaian?',
        options: [
          { id: 'r0', text: 'Tidak tahu / saya hanya menebak', quality: 0 },
          { id: 'r1', text: 'Karena luas totalnya tidak lebih dari 60 hektar', quality: 1 },
          { id: 'r2', text: 'Saya memeriksa bahwa titiknya berada di daerah yang diarsir pada grafik', quality: 2 },
          {
            id: 'r3',
            text: 'Saya menyubstitusikan titiknya ke ketiga pertidaksamaan: total tidak lebih dari 60 hektar, pasar minimal 10 hektar, dan ruang hijau tidak kurang dari pasar; semuanya terpenuhi',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Jelaskan mengapa rencana "pasar 40 hektar dan ruang hijau 20 hektar" tidak termasuk himpunan penyelesaian, walaupun luas totalnya pas 60 hektar.',
      expectedTerms: ['pasar', 'ruang hijau', 'hijau', 'hektar', 'kurang', 'lebih', 'syarat', 'ketentuan', 'pertidaksamaan', 'kendala'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K2', 'K3'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C4',
      kko: ['menyusun sistem pertidaksamaan', 'menentukan himpunan penyelesaian', 'menganalisis'],
      indikator:
        'Disajikan masalah penataan alun-alun dengan tiga ketentuan, siswa dapat menyusun sistem pertidaksamaan linear dua variabel, menentukan himpunan penyelesaiannya, dan menjelaskan mengapa suatu rencana tidak termasuk himpunan penyelesaian.',
    },
    gameInteraction:
      'Mengalokasikan pasar dan ruang hijau pada peta alun-alun; siswa menggambar grafik himpunan penyelesaian dari pertidaksamaan yang ditulisnya, lalu memilih satu rencana.',
  },

  {
    id: 'L3-SDG13-B',
    level: 3,
    sdgContext: 'SDG13',
    title: 'Armada Pengangkut Sampah Listrik',
    narrative:
      'Dinas Lingkungan Hidup Meridian akan mengganti armada pengangkut sampah dengan kendaraan listrik: x truk listrik dan y motor gerobak listrik. Harga satu truk Rp 400 juta dan satu motor gerobak Rp 100 juta, dengan anggaran paling banyak Rp 6 miliar. Satu truk mengangkut 6 ton sampah per hari dan satu motor gerobak 2 ton per hari, sedangkan sampah yang harus terangkut paling sedikit 60 ton per hari. Garasi dinas hanya muat 30 kendaraan. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu komposisi armada yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Kendaraan', 'Harga per unit', 'Daya angkut per hari'],
      rows: [
        ['Truk listrik (x)', 'Rp 400 juta', '6 ton'],
        ['Motor gerobak listrik (y)', 'Rp 100 juta', '2 ton'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Truk listrik', unit: 'unit', max: 20, step: 1, visual: 'clean', sprite: 'daur-ulang' },
      y: { key: 'y', label: 'Motor gerobak listrik', unit: 'unit', max: 35, step: 1, visual: 'neutral', sprite: 'kompos' },
    },
    constraints: [
      c('k_anggaran', 'Anggaran armada', 400, 100, '<=', 6000, 'explicit', 'anggaran paling banyak Rp 6 miliar', 'juta rupiah'),
      c('k_angkut', 'Sampah terangkut per hari', 6, 2, '>=', 60, 'explicit', 'sampah yang harus terangkut paling sedikit 60 ton per hari', 'ton'),
      c('k_garasi', 'Kapasitas garasi', 1, 1, '<=', 30, 'explicit', 'garasi dinas hanya muat 30 kendaraan', 'unit'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'integer',
    numberStyle: 'large_integer',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua komposisi truk dan motor gerobak yang memenuhi anggaran, daya angkut, dan garasi, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Membeli sebanyak mungkin truk listrik sampai anggaran habis', correct: false },
      { id: 'g3', text: 'Memenuhi daya angkut 60 ton saja tanpa memperhatikan anggaran', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak truk listrik dalam unit', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak motor gerobak listrik dalam unit', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Harga satu truk listrik', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak motor gerobak listrik dalam unit', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak truk listrik dalam unit', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Ton sampah yang terangkut per hari', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Mengapa Dinas tidak cukup membeli motor gerobak saja karena harganya paling murah?',
        options: [
          { id: 'r0', text: 'Tidak tahu', quality: 0 },
          { id: 'r1', text: 'Karena motor gerobak terlalu kecil', quality: 1 },
          { id: 'r2', text: 'Karena dengan garasi yang hanya muat 30 kendaraan, motor gerobak saja tidak cukup mengangkut sampah', quality: 2 },
          {
            id: 'r3',
            text: 'Karena 30 motor gerobak hanya mengangkut 60 ton dan memenuhi garasi tepat penuh; begitu ada satu motor dikurangi, daya angkut di bawah 60 ton, jadi truk dibutuhkan agar daya angkut cukup tanpa melampaui garasi dan anggaran',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Pilih satu komposisi armada dari himpunan penyelesaianmu, lalu tunjukkan dengan perhitungan bahwa komposisi itu memenuhi ketiga ketentuan.',
      expectedTerms: ['truk', 'motor', 'gerobak', 'anggaran', 'garasi', 'ton', 'angkut', 'juta', 'miliar', 'unit'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K2', 'K3'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C4',
      kko: ['menyusun sistem pertidaksamaan', 'menerjemahkan data tabel', 'menentukan himpunan penyelesaian'],
      indikator:
        'Disajikan narasi dan tabel armada pengangkut sampah, siswa dapat menyusun tiga pertidaksamaan (anggaran, daya angkut, garasi), menentukan himpunan penyelesaiannya, dan membuktikan bahwa satu komposisi memenuhi semuanya.',
    },
    gameInteraction:
      'Menyusun armada pada depo kota; siswa menggambar grafik himpunan penyelesaian dari pertidaksamaan yang ditulisnya, lalu memilih satu komposisi armada.',
  },

  {
    id: 'L3-SDG11&13-B',
    level: 3,
    sdgContext: 'SDG11&13',
    title: 'Energi Surya untuk Sekolah dan Gang',
    narrative:
      'Kota Meridian ingin sekolah dan gang kampung memakai energi surya. Akan dipasang x panel surya di atap sekolah dan y lampu jalan tenaga surya di gang. Biaya satu panel Rp 1,5 juta dan satu lampu jalan Rp 0,5 juta, dengan dana paling banyak Rp 60 juta. Satu panel menghasilkan daya 0,4 kW, sedangkan setiap lampu jalan membawa panel kecil 0,1 kW; daya terpasang seluruhnya paling sedikit 8 kW. Demi keamanan warga, lampu jalan yang dipasang paling sedikit 20 buah. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu rencana pemasangan yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Perangkat', 'Biaya per unit', 'Daya per unit'],
      rows: [
        ['Panel surya atap sekolah (x)', 'Rp 1,5 juta', '0,4 kW'],
        ['Lampu jalan tenaga surya (y)', 'Rp 0,5 juta', '0,1 kW'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Panel surya sekolah', unit: 'unit', max: 45, step: 1, visual: 'clean', sprite: 'surya' },
      y: { key: 'y', label: 'Lampu jalan surya', unit: 'unit', max: 125, step: 1, visual: 'neutral', sprite: 'trotoar' },
    },
    constraints: [
      c('k_dana', 'Dana pemasangan', 1.5, 0.5, '<=', 60, 'explicit', 'dana paling banyak Rp 60 juta', 'juta rupiah'),
      c('k_daya', 'Daya terpasang minimal', 0.4, 0.1, '>=', 8, 'explicit', 'daya terpasang seluruhnya paling sedikit 8 kW', 'kW'),
      c('k_keamanan', 'Lampu jalan minimal', 0, 1, '>=', 20, 'explicit', 'lampu jalan paling sedikit 20 buah', 'unit'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'integer',
    numberStyle: 'decimal_mixed',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pasangan banyak panel dan lampu jalan yang memenuhi dana, daya, dan jumlah lampu minimal, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Memaksimumkan daya terpasang tanpa memperhatikan dana', correct: false },
      { id: 'g3', text: 'Memasang lampu jalan saja karena paling murah', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak panel surya di atap sekolah', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak lampu jalan tenaga surya', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Daya satu panel surya dalam kW', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak lampu jalan tenaga surya', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak panel surya di atap sekolah', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Dana yang tersedia dalam juta rupiah', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Rencana "10 panel dan 20 lampu jalan" memenuhi dana dan jumlah lampu minimal. Apakah rencana itu termasuk himpunan penyelesaian?',
        options: [
          { id: 'r0', text: 'Tidak tahu', quality: 0 },
          { id: 'r1', text: 'Ya, karena dananya cukup', quality: 1 },
          { id: 'r2', text: 'Tidak, karena ada ketentuan yang tidak terpenuhi', quality: 2 },
          {
            id: 'r3',
            text: 'Tidak, karena dayanya hanya 0,4 x 10 + 0,1 x 20 = 6 kW, kurang dari 8 kW; panel harus ditambah selama dana Rp 60 juta masih cukup',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Jelaskan bagaimana kamu memeriksa bahwa rencana pemasangan pilihanmu memenuhi ketiga ketentuan, termasuk perhitungan daya dan dananya.',
      expectedTerms: ['panel', 'lampu', 'daya', 'kw', 'dana', 'juta', 'surya', 'ketentuan', 'kendala', 'pertidaksamaan'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K2', 'K3'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C4',
      kko: ['menyusun sistem pertidaksamaan', 'mengolah bilangan desimal', 'menentukan himpunan penyelesaian'],
      indikator:
        'Disajikan masalah pemasangan energi surya dengan koefisien desimal, siswa dapat menyusun sistem pertidaksamaan linear dua variabel, menentukan himpunan penyelesaiannya, dan menunjukkan dengan perhitungan bahwa suatu rencana tidak termasuk himpunan penyelesaian.',
    },
    gameInteraction:
      'Memasang panel surya dan lampu jalan pada peta sekolah dan gang; siswa menggambar grafik himpunan penyelesaian dari pertidaksamaan yang ditulisnya, lalu memilih satu rencana.',
  },
];
