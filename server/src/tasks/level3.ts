/**
 * Bank Skenario Level 3 (docs/ECD_Framework.md Bagian 8).
 *
 * Karakteristik: 2-3 kendala, bilangan campuran, fungsi tujuan EKSPLISIT
 * (maksimum/minimum), tanpa distraktor. Fokus bukti dominan: K2-K3.
 *
 * Mulai level ini `goalOptions` berisi fungsi tujuan sesungguhnya, sehingga
 * event select_objective menjadi bukti langsung K2 sesuai Evidence Model.
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

export const LEVEL_3_TASKS: TaskDefinition[] = [
  {
    id: 'L3-SDG11-A',
    level: 3,
    sdgContext: 'SDG11',
    title: 'Optimasi Indeks Kenyamanan Kota Meridian',
    narrative:
      'Distrik baru kota Meridian memiliki lahan pengembangan seluas 80 hektar untuk dibagi menjadi Taman Kota seluas x hektar dan Trotoar/Ruang Pejalan Kaki seluas y hektar. Anggaran pembangunan sebesar Rp 2,4 miliar, dengan biaya taman Rp 25 juta/hektar dan trotoar Rp 40 juta/hektar. Untuk memenuhi standar aksesibilitas, luas trotoar minimal 10 hektar. Setiap hektar taman memberi skor kenyamanan warga sebesar 8 poin dan setiap hektar trotoar memberi 5 poin. Tentukan kombinasi x dan y yang memaksimumkan total skor kenyamanan warga.',
    dataTable: {
      headers: ['Peruntukan', 'Biaya per hektar', 'Skor kenyamanan per hektar'],
      rows: [
        ['Taman Kota (x)', 'Rp 25 juta', '8 poin'],
        ['Trotoar/Ruang Pejalan Kaki (y)', 'Rp 40 juta', '5 poin'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Taman Kota', unit: 'hektar', max: 90, step: 1, visual: 'nature' },
      y: { key: 'y', label: 'Trotoar / Ruang Pejalan Kaki', unit: 'hektar', max: 70, step: 1, visual: 'neutral' },
    },
    constraints: [
      c('k_lahan', 'Lahan pengembangan', 1, 1, '<=', 80, 'explicit', 'lahan pengembangan seluas 80 hektar', 'hektar'),
      c('k_anggaran', 'Anggaran pembangunan', 25, 40, '<=', 2400, 'explicit', 'anggaran pembangunan sebesar Rp 2,4 miliar', 'juta rupiah'),
      c('k_aksesibilitas', 'Standar aksesibilitas trotoar', 0, 1, '>=', 10, 'explicit', 'luas trotoar minimal 10 hektar', 'hektar'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'max',
      cx: 8,
      cy: 5,
      label: 'Total skor kenyamanan warga',
      unit: 'poin',
      display: 'Maksimumkan Z = 8x + 5y',
    },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Maksimumkan Z = 8x + 5y (total skor kenyamanan warga)', correct: true },
      { id: 'g2', text: 'Minimumkan Z = 25x + 40y (total biaya pembangunan)', correct: false },
      { id: 'g3', text: 'Maksimumkan Z = 5x + 8y (skor kenyamanan dengan bobot tertukar)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = x + y (total luas lahan terpakai)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Taman Kota dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas Trotoar/Ruang Pejalan Kaki dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Skor kenyamanan per hektar taman', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas Trotoar/Ruang Pejalan Kaki dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Taman Kota dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Total anggaran pembangunan', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Mengapa kombinasi yang kamu pilih memberi skor kenyamanan tertinggi?',
        options: [
          { id: 'r0', text: 'Tidak tahu / saya memilih secara coba-coba', quality: 0 },
          { id: 'r1', text: 'Karena luas totalnya paling besar', quality: 1 },
          { id: 'r2', text: 'Karena nilai Z pada titik itu paling tinggi di antara titik pojok yang saya cek', quality: 2 },
          {
            id: 'r3',
            text: 'Karena taman memberi 8 poin per hektar sedangkan trotoar hanya 5 poin, sehingga trotoar ditekan sampai batas minimum 10 hektar yang masih diizinkan standar aksesibilitas',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: kendala mana yang menahan kota untuk tidak memperluas taman lebih jauh lagi?',
      expectedTerms: ['taman', 'trotoar', 'pejalan kaki', 'aksesibilitas', 'anggaran', 'lahan', 'poin', 'hektar', 'kenyamanan'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K2', 'K3'],
    gameInteraction:
      'Setelah menentukan alokasi lahan, sistem menyorot beberapa titik pojok pada peta sebagai kandidat solusi optimum; siswa memverifikasi dengan menghitung nilai Z pada tiap kandidat.',
  },

  {
    id: 'L3-SDG13-A',
    level: 3,
    sdgContext: 'SDG13',
    title: 'Minimisasi Biaya Pengelolaan Sampah dengan Batas Emisi',
    narrative:
      'Kota Meridian mengelola sampah melalui dua metode: pengomposan sebanyak x ton/hari dan daur ulang sebanyak y ton/hari, dengan total kapasitas pengolahan minimal 50 ton/hari untuk memenuhi kebutuhan kota. Emisi karbon dari pengomposan adalah 0,5 kg CO2/ton dan dari daur ulang 0,2 kg CO2/ton, dengan batas emisi total tidak lebih dari 20 kg CO2/hari. Biaya pengomposan Rp 150 ribu/ton dan daur ulang Rp 220 ribu/ton. Tentukan kombinasi x dan y yang meminimumkan biaya total.',
    dataTable: {
      headers: ['Metode', 'Emisi per ton', 'Biaya per ton'],
      rows: [
        ['Pengomposan (x)', '0,5 kg CO2', 'Rp 150 ribu'],
        ['Daur ulang (y)', '0,2 kg CO2', 'Rp 220 ribu'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Pengomposan', unit: 'ton/hari', max: 60, step: 0.5, visual: 'clean' },
      y: { key: 'y', label: 'Daur ulang', unit: 'ton/hari', max: 110, step: 0.5, visual: 'neutral' },
    },
    constraints: [
      c('k_kapasitas', 'Kapasitas pengolahan minimal', 1, 1, '>=', 50, 'explicit', 'total kapasitas pengolahan minimal 50 ton/hari', 'ton'),
      c('k_emisi', 'Batas emisi harian', 0.5, 0.2, '<=', 20, 'explicit', 'batas emisi total tidak lebih dari 20 kg CO2/hari', 'kg CO2'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'min',
      cx: 150,
      cy: 220,
      label: 'Total biaya pengelolaan sampah',
      unit: 'ribu rupiah',
      display: 'Minimumkan Z = 150x + 220y',
    },
    domain: 'continuous',
    numberStyle: 'decimal_mixed',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Minimumkan Z = 150x + 220y (total biaya pengelolaan)', correct: true },
      { id: 'g2', text: 'Maksimumkan Z = 150x + 220y (total biaya pengelolaan)', correct: false },
      { id: 'g3', text: 'Minimumkan Z = 0,5x + 0,2y (total emisi karbon)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = x + y (total sampah yang diolah)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak sampah yang dikomposkan dalam ton per hari', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak sampah yang didaur ulang dalam ton per hari', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Emisi karbon dari pengomposan', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak sampah yang didaur ulang dalam ton per hari', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak sampah yang dikomposkan dalam ton per hari', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Batas emisi harian kota', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Mengapa kombinasi yang kamu pilih menghasilkan biaya terendah?',
        options: [
          { id: 'r0', text: 'Tidak tahu / saya memilih secara coba-coba', quality: 0 },
          { id: 'r1', text: 'Karena jumlah sampah yang diolah paling sedikit', quality: 1 },
          { id: 'r2', text: 'Karena nilai Z pada titik itu paling rendah di antara titik pojok yang saya cek', quality: 2 },
          {
            id: 'r3',
            text: 'Karena pengomposan lebih murah tetapi emisinya lebih besar, sehingga porsi pengomposan hanya bisa dinaikkan sampai batas emisi 20 kg CO2 tercapai',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: mengapa kota tidak bisa mengomposkan seluruh 50 ton sampah meskipun itu metode termurah?',
      expectedTerms: ['kompos', 'pengomposan', 'daur ulang', 'emisi', 'co2', 'biaya', 'ton', 'kapasitas'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 2,
    dominantClaims: ['K2', 'K3'],
    gameInteraction:
      'Mengatur dua jalur konveyor fasilitas pengolahan sampah kota; sistem menampilkan grafik daerah penyelesaian yang ter-render otomatis sebagai overlay pada peta.',
  },

  {
    id: 'L3-SDG11&13-A',
    level: 3,
    sdgContext: 'SDG11&13',
    title: 'Indeks Kota Berkelanjutan Gabungan',
    narrative:
      'Kota Meridian mengembangkan kawasan campuran seluas 100 hektar untuk Hunian Vertikal Hemat Energi seluas x hektar dan Koridor Hijau seluas y hektar. Total investasi tidak melebihi Rp 5 miliar, dengan biaya hunian vertikal Rp 60 juta/hektar dan koridor hijau Rp 20 juta/hektar. Untuk menjaga kualitas udara, luas koridor hijau tidak boleh kurang dari seperempat luas hunian vertikal. Indeks keberlanjutan kota dihitung dari kontribusi hunian vertikal (mengurangi urban sprawl) sebesar 6 poin/hektar dan koridor hijau (menyerap karbon) sebesar 9 poin/hektar. Tentukan kombinasi yang memaksimumkan indeks keberlanjutan.',
    dataTable: {
      headers: ['Zona', 'Biaya per hektar', 'Kontribusi indeks per hektar'],
      rows: [
        ['Hunian Vertikal Hemat Energi (x)', 'Rp 60 juta', '6 poin'],
        ['Koridor Hijau (y)', 'Rp 20 juta', '9 poin'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Hunian Vertikal Hemat Energi', unit: 'hektar', max: 110, step: 1, visual: 'housing' },
      y: { key: 'y', label: 'Koridor Hijau', unit: 'hektar', max: 120, step: 1, visual: 'nature' },
    },
    constraints: [
      c('k_kawasan', 'Luas kawasan campuran', 1, 1, '<=', 100, 'explicit', 'kawasan campuran seluas 100 hektar', 'hektar'),
      c('k_investasi', 'Total investasi', 60, 20, '<=', 5000, 'explicit', 'total investasi tidak melebihi Rp 5 miliar', 'juta rupiah'),
      c('k_udara', 'Rasio koridor hijau', -0.25, 1, '>=', 0, 'explicit', 'luas koridor hijau tidak boleh kurang dari seperempat luas hunian vertikal'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'max',
      cx: 6,
      cy: 9,
      label: 'Indeks keberlanjutan kota',
      unit: 'poin',
      display: 'Maksimumkan Z = 6x + 9y',
    },
    domain: 'continuous',
    numberStyle: 'decimal_mixed',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Maksimumkan Z = 6x + 9y (indeks keberlanjutan kota)', correct: true },
      { id: 'g2', text: 'Maksimumkan Z = 9x + 6y (indeks dengan bobot tertukar)', correct: false },
      { id: 'g3', text: 'Minimumkan Z = 60x + 20y (total investasi)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = x (luas hunian vertikal)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Hunian Vertikal Hemat Energi dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas Koridor Hijau dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Biaya pembangunan hunian vertikal per hektar', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas Koridor Hijau dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Hunian Vertikal Hemat Energi dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Total indeks keberlanjutan kota', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Mengapa kombinasi yang kamu pilih memberi indeks keberlanjutan tertinggi?',
        options: [
          { id: 'r0', text: 'Tidak tahu / saya memilih secara coba-coba', quality: 0 },
          { id: 'r1', text: 'Karena kawasannya terpakai seluruhnya', quality: 1 },
          { id: 'r2', text: 'Karena nilai Z pada titik itu paling tinggi di antara titik pojok yang saya cek', quality: 2 },
          {
            id: 'r3',
            text: 'Karena koridor hijau memberi 9 poin per hektar dengan biaya hanya Rp 20 juta, sehingga memperluas koridor hijau lebih menguntungkan indeks daripada hunian vertikal meskipun daya tampung penduduk berkurang',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: apa konsekuensi bagi daya tampung penduduk jika kota mengejar indeks keberlanjutan tertinggi?',
      expectedTerms: ['hunian', 'vertikal', 'koridor hijau', 'hijau', 'indeks', 'investasi', 'poin', 'hektar', 'karbon'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K2', 'K3'],
    gameInteraction:
      'Mengatur dua zona pada viewport isometrik; sistem menyorot titik pojok kandidat dan menampilkan nilai indeks Z secara live.',
  },
];
