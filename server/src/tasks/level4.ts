/**
 * Bank Skenario Level 4 (instrumen 2.0.0): SISTEM PERTIDAKSAMAAN LINEAR DUA
 * VARIABEL tanpa fungsi tujuan, sesuai materi kelas X.
 *
 * Karakteristik: dua kendala eksplisit + satu kendala IMPLISIT yang harus
 * disimpulkan siswa dari narasi (persentase, separuh batas, perbandingan),
 * lalu muncul EVENT DISTRAKTOR yang mengubah salah satu kendala. Siswa harus
 * memeriksa ulang apakah rencananya masih di dalam himpunan penyelesaian dan
 * merevisinya. Fokus bukti dominan: K3-K4. Soal program linear Level 4
 * instrumen 1.x diarsipkan di level4ProgramLinear.ts.
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

const TANPA_TUJUAN = { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' } as const;

export const LEVEL_4_TASKS: TaskDefinition[] = [
  {
    id: 'L4-SDG11-B',
    level: 4,
    sdgContext: 'SDG11',
    title: 'Kampung Susun Tepi Sungai',
    narrative:
      'Kampung di tepi sungai Meridian akan ditata menjadi kampung susun di atas lahan 100 hektar: x hektar untuk blok hunian susun dan y hektar untuk ruang terbuka hijau (RTH). Biaya pembangunan blok hunian Rp 30 miliar per hektar dan RTH Rp 10 miliar per hektar, dengan dana paling banyak Rp 2.400 miliar. Peraturan daerah mensyaratkan RTH paling sedikit 25% dari luas lahan kampung. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu rencana penataan yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Peruntukan', 'Biaya per hektar'],
      rows: [
        ['Blok hunian susun (x)', 'Rp 30 miliar'],
        ['Ruang terbuka hijau (y)', 'Rp 10 miliar'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Blok hunian susun', unit: 'hektar', max: 110, step: 1, visual: 'neutral', sprite: 'perumahan-padat' },
      y: { key: 'y', label: 'Ruang terbuka hijau', unit: 'hektar', max: 110, step: 1, visual: 'nature', sprite: 'pohon' },
    },
    constraints: [
      c('k_lahan', 'Luas lahan kampung', 1, 1, '<=', 100, 'explicit', 'luas hunian dan RTH tidak boleh melebihi 100 hektar', 'hektar'),
      c('k_dana', 'Dana pembangunan', 30, 10, '<=', 2400, 'explicit', 'dana paling banyak Rp 2.400 miliar', 'miliar rupiah'),
      c('k_rth', 'RTH minimal (implisit)', 0, 1, '>=', 25, 'implicit', 'RTH paling sedikit 25% dari lahan - siswa harus menghitung sendiri 25% x 100 = 25 hektar', 'hektar'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_rth_35',
      narrative: 'Peraturan daerah direvisi setelah banjir besar: RTH kampung kini paling sedikit 35% dari luas lahan.',
      constraintPatches: [
        { targetId: 'k_rth', newC: 35, newLabel: 'RTH minimal - REVISI 35%', newDisplay: 'y ≥ 35 hektar' },
      ],
      instruction:
        'Periksa apakah rencanamu masih termasuk himpunan penyelesaian yang baru. Bila tidak, revisi rencanamu dan jelaskan bagian grafik mana yang berubah.',
    },
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pasangan luas hunian dan RTH yang memenuhi lahan, dana, dan syarat RTH, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Membangun hunian seluas mungkin sampai dana habis', correct: false },
      { id: 'g3', text: 'Menjadikan seluruh lahan RTH agar kampung paling hijau', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas blok hunian susun dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas RTH dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Banyak keluarga yang tinggal di kampung', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas RTH dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas blok hunian susun dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Biaya pembangunan per hektar', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Setelah standar RTH naik menjadi 35%, apa yang terjadi pada himpunan penyelesaian?',
        options: [
          { id: 'r0', text: 'Tidak tahu', quality: 0 },
          { id: 'r1', text: 'Tidak berubah, karena lahan tetap 100 hektar', quality: 1 },
          { id: 'r2', text: 'Daerahnya menyempit, jadi rencana harus diperiksa ulang', quality: 2 },
          {
            id: 'r3',
            text: 'Garis batas RTH bergeser dari y = 25 ke y = 35, sehingga daerah penyelesaian menyempit; rencana dengan RTH kurang dari 35 hektar keluar dari himpunan penyelesaian dan harus direvisi',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Dari mana kamu memperoleh angka 25 hektar? Lalu jelaskan apakah rencanamu masih memenuhi semua ketentuan setelah standar RTH direvisi.',
      expectedTerms: ['25%', '35%', 'rth', 'hijau', 'hektar', 'revisi', 'bergeser', 'menyempit', 'himpunan', 'penyelesaian'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C5',
      kko: ['menyimpulkan kendala implisit', 'menentukan himpunan penyelesaian', 'mengevaluasi dan merevisi rencana'],
      indikator:
        'Disajikan masalah penataan kampung susun dengan syarat RTH dalam persen, siswa dapat menyimpulkan kendala implisit, menentukan himpunan penyelesaian, dan merevisi rencana setelah standar berubah.',
    },
    gameInteraction:
      'Menata kampung susun di peta tepi sungai; di tengah misi muncul kabar revisi perda RTH yang menggeser satu garis batas, dan siswa memeriksa ulang rencananya.',
  },

  {
    id: 'L4-SDG13-B',
    level: 4,
    sdgContext: 'SDG13',
    title: 'Angkot Rendah Emisi',
    narrative:
      'Koperasi angkot Meridian menyusun armada baru: x angkot listrik dan y angkot bensin. Agar semua trayek terlayani, armada paling sedikit 50 angkot. Angkot listrik membutuhkan dana Rp 5 juta per bulan dan angkot bensin Rp 3 juta per bulan, dengan dana operasional paling banyak Rp 300 juta per bulan. Satu angkot bensin menghasilkan emisi 4 ton CO2 per bulan, sedangkan angkot listrik tidak beremisi di jalan. Pemerintah kota menetapkan bahwa emisi armada koperasi paling banyak separuh dari kuota kota sebesar 120 ton CO2 per bulan. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu komposisi armada yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Angkot', 'Dana operasional per bulan', 'Emisi per bulan'],
      rows: [
        ['Angkot listrik (x)', 'Rp 5 juta', '0 ton CO2'],
        ['Angkot bensin (y)', 'Rp 3 juta', '4 ton CO2'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Angkot listrik', unit: 'unit', max: 65, step: 1, visual: 'clean', sprite: 'bus-listrik' },
      y: { key: 'y', label: 'Angkot bensin', unit: 'unit', max: 30, step: 1, visual: 'neutral', sprite: 'bus-konvensional' },
    },
    constraints: [
      c('k_trayek', 'Armada minimal untuk trayek', 1, 1, '>=', 50, 'explicit', 'armada paling sedikit 50 angkot', 'unit'),
      c('k_dana', 'Dana operasional bulanan', 5, 3, '<=', 300, 'explicit', 'dana operasional paling banyak Rp 300 juta per bulan', 'juta rupiah'),
      c('k_emisi', 'Batas emisi armada (implisit)', 0, 4, '<=', 60, 'implicit', 'emisi paling banyak separuh dari 120 ton CO2 - siswa harus menyimpulkan angka 60', 'ton CO2'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'integer',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_kuota_80',
      narrative: 'Kota Meridian memperketat target iklimnya: kuota emisi kota diturunkan dari 120 menjadi 80 ton CO2 per bulan.',
      constraintPatches: [
        { targetId: 'k_emisi', newC: 40, newLabel: 'Batas emisi armada - SETELAH kuota turun', newDisplay: '4y ≤ 40 ton CO2' },
      ],
      instruction:
        'Periksa apakah komposisi armadamu masih termasuk himpunan penyelesaian yang baru. Bila tidak, revisi komposisinya dan jelaskan alasannya.',
    },
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua komposisi angkot listrik dan bensin yang memenuhi trayek, dana, dan batas emisi, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Memakai angkot bensin sebanyak mungkin karena dananya paling murah', correct: false },
      { id: 'g3', text: 'Memenuhi 50 angkot saja tanpa memperhatikan emisi', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak angkot listrik dalam unit', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak angkot bensin dalam unit', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Dana operasional satu angkot listrik', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak angkot bensin dalam unit', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak angkot listrik dalam unit', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Ton CO2 yang dihasilkan armada', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Mengapa kendala emisinya ditulis 4y ≤ 60, bukan 4y ≤ 120?',
        options: [
          { id: 'r0', text: 'Tidak tahu', quality: 0 },
          { id: 'r1', text: 'Karena angkot listrik tidak beremisi', quality: 1 },
          { id: 'r2', text: 'Karena koperasi hanya boleh memakai separuh kuota kota', quality: 2 },
          {
            id: 'r3',
            text: 'Karena batasnya separuh dari 120 ton, yaitu 60 ton, dan hanya angkot bensin yang beremisi 4 ton per unit, sehingga 4y ≤ 60 atau y ≤ 15',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Setelah kuota kota turun menjadi 80 ton, apakah komposisi armadamu masih memenuhi semua ketentuan? Tunjukkan perhitungannya dan jelaskan revisimu.',
      expectedTerms: ['separuh', 'emisi', 'co2', 'kuota', 'bensin', 'listrik', 'revisi', 'trayek', 'dana'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C5',
      kko: ['menyimpulkan kendala implisit', 'menentukan himpunan penyelesaian', 'mengevaluasi dan merevisi rencana'],
      indikator:
        'Disajikan masalah armada angkot dengan batas emisi berupa separuh kuota kota, siswa dapat menyimpulkan kendala implisit, menentukan himpunan penyelesaian, dan merevisi komposisi armada setelah kuota berubah.',
    },
    gameInteraction:
      'Menyusun armada angkot di terminal kota; di tengah misi kuota emisi kota diturunkan, dan siswa memeriksa ulang komposisi armadanya.',
  },

  {
    id: 'L4-SDG11&13-B',
    level: 4,
    sdgContext: 'SDG11&13',
    title: 'Kawasan Hunian Tangguh Iklim',
    narrative:
      'Meridian membuka kawasan baru seluas 150 hektar: x hektar untuk hunian rendah karbon dan y hektar untuk kawasan hijau multifungsi (taman, kolam retensi, kebun kota). Biaya pengembangan hunian Rp 40 miliar per hektar dan kawasan hijau Rp 20 miliar per hektar, dengan dana paling banyak Rp 4.800 miliar. Pedoman ketahanan iklim kota menyebutkan bahwa setiap 2 hektar hunian harus diimbangi paling sedikit 1 hektar kawasan hijau. Susun sistem pertidaksamaannya, gambar himpunan penyelesaiannya, lalu tentukan satu rencana kawasan yang memenuhi semua ketentuan.',
    dataTable: {
      headers: ['Peruntukan', 'Biaya per hektar'],
      rows: [
        ['Hunian rendah karbon (x)', 'Rp 40 miliar'],
        ['Kawasan hijau multifungsi (y)', 'Rp 20 miliar'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Hunian rendah karbon', unit: 'hektar', max: 160, step: 1, visual: 'neutral', sprite: 'hunian-rendah-karbon' },
      y: { key: 'y', label: 'Kawasan hijau multifungsi', unit: 'hektar', max: 160, step: 1, visual: 'nature', sprite: 'hijau-multifungsi' },
    },
    constraints: [
      c('k_lahan', 'Luas kawasan', 1, 1, '<=', 150, 'explicit', 'luas hunian dan kawasan hijau tidak boleh melebihi 150 hektar', 'hektar'),
      c('k_dana', 'Dana pengembangan', 40, 20, '<=', 4800, 'explicit', 'dana paling banyak Rp 4.800 miliar', 'miliar rupiah'),
      c('k_imbang', 'Imbangan hunian dan hijau (implisit)', 1, -2, '<=', 0, 'implicit', 'setiap 2 hektar hunian diimbangi paling sedikit 1 hektar hijau - siswa harus menyimpulkan y ≥ x/2, yaitu x - 2y ≤ 0', 'hektar'),
      ...nonNegativity(),
    ],
    objective: { ...TANPA_TUJUAN },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_imbang_1banding1',
      narrative: 'Kajian risiko banjir terbaru membuat pedoman diperketat: kini setiap 1 hektar hunian harus diimbangi paling sedikit 1 hektar kawasan hijau.',
      constraintPatches: [
        { targetId: 'k_imbang', newB: -1, newLabel: 'Imbangan hunian dan hijau - REVISI 1 : 1', newDisplay: 'x - y ≤ 0' },
      ],
      instruction:
        'Periksa apakah rencanamu masih termasuk himpunan penyelesaian yang baru. Bila tidak, revisi rencanamu dan jelaskan bagaimana garis batasnya berubah.',
    },
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pasangan luas hunian dan kawasan hijau yang memenuhi lahan, dana, dan pedoman imbangan, lalu memilih satu di antaranya', correct: true },
      { id: 'g2', text: 'Membangun hunian seluas mungkin agar penduduk tertampung', correct: false },
      { id: 'g3', text: 'Membagi kawasan sama rata tanpa memeriksa dana', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas hunian rendah karbon dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas kawasan hijau multifungsi dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Banyak rumah yang dibangun', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas kawasan hijau multifungsi dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas hunian rendah karbon dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Dana pengembangan dalam miliar rupiah', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Bagaimana pedoman "setiap 2 hektar hunian diimbangi paling sedikit 1 hektar hijau" ditulis sebagai pertidaksamaan?',
        options: [
          { id: 'r0', text: 'Tidak tahu', quality: 0 },
          { id: 'r1', text: '2x ≤ y', quality: 1 },
          { id: 'r2', text: 'y ≥ x/2', quality: 2 },
          {
            id: 'r3',
            text: 'y ≥ x/2, atau x - 2y ≤ 0; misalnya hunian 60 hektar membutuhkan hijau paling sedikit 30 hektar',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Setelah pedoman menjadi 1 : 1, jelaskan perubahan garis batas imbangan pada grafik dan apakah rencanamu masih memenuhi semua ketentuan.',
      expectedTerms: ['imbang', 'perbandingan', 'x - 2y', 'x - y', 'hijau', 'hunian', 'hektar', 'garis', 'revisi', 'himpunan'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    bloom: {
      tugasUtama: 'C4',
      refleksi: 'C5',
      kko: ['menerjemahkan perbandingan menjadi pertidaksamaan', 'menentukan himpunan penyelesaian', 'mengevaluasi dan merevisi rencana'],
      indikator:
        'Disajikan masalah kawasan hunian dengan pedoman perbandingan hunian dan kawasan hijau, siswa dapat menyimpulkan kendala implisit, menentukan himpunan penyelesaian, dan merevisi rencana setelah pedoman diperketat.',
    },
    gameInteraction:
      'Merancang kawasan baru di peta kota; di tengah misi pedoman imbangan diperketat sehingga garis batas berputar, dan siswa memeriksa ulang rencananya.',
  },
];
