/**
 * Bank Skenario Level 2 (docs/ECD_Framework.md Bagian 7).
 *
 * Karakteristik: 2 kendala eksplisit, TANPA distraktor, representasi naratif +
 * tabel data. Fokus bukti dominan: K1-K2.
 *
 * Catatan: dokumen hanya menyertakan tabel data pada varian L2-SDG11-A. Tabel
 * pada dua varian lain ditambahkan agar seluruh varian Level 2 konsisten dengan
 * task feature "cerita + tabel data" pada Aturan Kombinasi Bagian 4.2; isi tabel
 * hanya merangkum angka yang sudah ada di narasi, tidak menambah informasi baru.
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

export const LEVEL_2_TASKS: TaskDefinition[] = [
  {
    id: 'L2-SDG11-A',
    level: 2,
    sdgContext: 'SDG11',
    title: 'Anggaran dan Lahan Perumahan Terjangkau',
    narrative:
      'Pemerintah kota Greenhaven berencana membangun rumah subsidi tipe A sebanyak x unit dan rumah subsidi tipe B sebanyak y unit pada lahan seluas 60 hektar. Anggaran yang tersedia adalah Rp 900 juta, dengan biaya pembangunan tiap unit tipe A Rp 30 juta dan tipe B Rp 20 juta. Setiap unit tipe A membutuhkan lahan 0,04 hektar dan tipe B membutuhkan 0,03 hektar. Tentukan sistem pertidaksamaan yang menggambarkan kendala anggaran dan kendala lahan.',
    dataTable: {
      headers: ['Jenis Rumah', 'Biaya per unit', 'Lahan per unit'],
      rows: [
        ['Tipe A (x)', 'Rp 30 juta', '0,04 hektar'],
        ['Tipe B (y)', 'Rp 20 juta', '0,03 hektar'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Rumah subsidi tipe A', unit: 'unit', max: 40, step: 1, visual: 'housing' },
      y: { key: 'y', label: 'Rumah subsidi tipe B', unit: 'unit', max: 55, step: 1, visual: 'neutral' },
    },
    constraints: [
      c('k_anggaran', 'Anggaran pembangunan', 30, 20, '<=', 900, 'explicit', 'anggaran yang tersedia Rp 900 juta', 'juta rupiah'),
      c('k_lahan', 'Ketersediaan lahan', 0.04, 0.03, '<=', 60, 'explicit', 'lahan seluas 60 hektar', 'hektar'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'integer',
    numberStyle: 'decimal_mixed',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua kombinasi jumlah rumah tipe A dan B yang memenuhi kendala anggaran dan lahan', correct: true },
      { id: 'g2', text: 'Membangun rumah tipe A sebanyak-banyaknya karena lebih besar', correct: false },
      { id: 'g3', text: 'Menghabiskan seluruh lahan 60 hektar tanpa memperhatikan anggaran', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak unit rumah subsidi tipe A yang dibangun', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak unit rumah subsidi tipe B yang dibangun', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Biaya pembangunan satu unit rumah tipe A', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak unit rumah subsidi tipe B yang dibangun', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak unit rumah subsidi tipe A yang dibangun', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Luas lahan yang tersedia', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Apakah rencana pembangunanmu sudah memanfaatkan anggaran secara wajar tanpa melanggar kendala lahan?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Sudah, karena semua rumah muat di lahan yang ada', quality: 1 },
          { id: 'r2', text: 'Masih bisa ditambah, selama total biaya tidak melewati Rp 900 juta', quality: 2 },
          {
            id: 'r3',
            text: 'Masih bisa ditambah, tetapi menambah rumah tipe A akan lebih cepat menghabiskan anggaran daripada tipe B, sehingga jumlah total unit yang terbangun justru berkurang',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: kendala mana yang lebih dulu membatasi jumlah rumah yang dapat dibangun, anggaran atau lahan? Mengapa?',
      expectedTerms: ['anggaran', 'biaya', 'lahan', 'hektar', 'tipe a', 'tipe b', 'unit', 'juta'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 2,
    dominantClaims: ['K1', 'K2'],
    gameInteraction:
      'Mengalokasikan dua tipe rumah pada blok perumahan; dashboard menampilkan sisa anggaran dan sisa lahan secara live sebagai dua progress bar.',
  },

  {
    id: 'L2-SDG13-A',
    level: 2,
    sdgContext: 'SDG13',
    title: 'Sumber Energi Kota Greenhaven',
    narrative:
      'Perusahaan listrik kota Greenhaven merencanakan pembangkit tambahan berupa x unit panel surya komunal dan y unit turbin angin mini untuk memenuhi target bauran energi bersih. Total dana investasi tidak melebihi Rp 1,2 miliar, dengan biaya per unit panel surya Rp 40 juta dan turbin angin Rp 60 juta. Luas lahan atap/ruang terbuka yang tersedia adalah 500 meter persegi, dengan kebutuhan ruang tiap panel surya 8 meter persegi dan tiap turbin angin 20 meter persegi. Susun sistem pertidaksamaannya.',
    dataTable: {
      headers: ['Jenis Pembangkit', 'Biaya per unit', 'Kebutuhan ruang per unit'],
      rows: [
        ['Panel surya komunal (x)', 'Rp 40 juta', '8 m2'],
        ['Turbin angin mini (y)', 'Rp 60 juta', '20 m2'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Panel surya komunal', unit: 'unit', max: 45, step: 1, visual: 'clean' },
      y: { key: 'y', label: 'Turbin angin mini', unit: 'unit', max: 35, step: 1, visual: 'neutral' },
    },
    constraints: [
      c('k_dana', 'Dana investasi', 40, 60, '<=', 1200, 'explicit', 'total dana investasi tidak melebihi Rp 1,2 miliar', 'juta rupiah'),
      c('k_ruang', 'Ketersediaan ruang', 8, 20, '<=', 500, 'explicit', 'luas lahan atap/ruang terbuka yang tersedia adalah 500 meter persegi', 'm2'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'integer',
    numberStyle: 'large_integer',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua kombinasi panel surya dan turbin angin yang memenuhi kendala dana dan ruang', correct: true },
      { id: 'g2', text: 'Memasang turbin angin sebanyak mungkin karena dayanya lebih besar', correct: false },
      { id: 'g3', text: 'Menghabiskan seluruh dana Rp 1,2 miliar tanpa memperhatikan luas ruang', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak unit panel surya komunal yang dipasang', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak unit turbin angin mini yang dipasang', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Biaya pemasangan satu unit panel surya', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak unit turbin angin mini yang dipasang', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak unit panel surya komunal yang dipasang', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Luas ruang terbuka yang tersedia', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Apakah komposisi pembangkit pilihanmu sudah memanfaatkan dana dan ruang secara wajar?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Sudah, karena dananya masih cukup', quality: 1 },
          { id: 'r2', text: 'Masih bisa ditambah, selama dana Rp 1,2 miliar dan ruang 500 m2 tidak terlampaui', quality: 2 },
          {
            id: 'r3',
            text: 'Masih bisa ditambah, tetapi setiap turbin angin memakan ruang 20 m2 dan dana Rp 60 juta, sehingga menambah turbin berarti mengurangi jatah panel surya',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: kendala mana yang lebih dulu habis jika kota memperbanyak turbin angin, dana atau ruang?',
      expectedTerms: ['panel surya', 'surya', 'turbin', 'angin', 'dana', 'investasi', 'ruang', 'lahan', 'unit'],
    },
    expectedConstraintCount: 2,
    blueprintConstraintCount: 2,
    dominantClaims: ['K1', 'K2'],
    gameInteraction:
      'Menempatkan ikon panel surya/turbin pada atap gedung kota dan lahan kosong yang telah disediakan dalam viewport isometrik.',
  },

  {
    id: 'L2-SDG11&13-A',
    level: 2,
    sdgContext: 'SDG11&13',
    title: 'Ruang Hijau vs Zona Industri Rendah Emisi',
    narrative:
      'Kota Greenhaven memiliki kawasan pengembangan seluas 50 hektar yang akan dibagi menjadi Ruang Terbuka Hijau seluas x hektar dan Zona Industri Rendah Emisi seluas y hektar. Setiap hektar RTH membutuhkan biaya perawatan Rp 15 juta per tahun dan setiap hektar zona industri menghasilkan retribusi Rp 25 juta per tahun, dengan biaya operasional kota tidak melebihi Rp 900 juta per tahun untuk kedua area ini. Selain itu, luas zona industri tidak boleh melebihi luas RTH. Tentukan sistem pertidaksamaannya.',
    dataTable: {
      headers: ['Zona', 'Biaya operasional per hektar/tahun', 'Batas'],
      rows: [
        ['Ruang Terbuka Hijau (x)', 'Rp 15 juta', 'luas industri tidak melebihi luas RTH'],
        ['Zona Industri Rendah Emisi (y)', 'Rp 25 juta', 'total kawasan 50 hektar'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Ruang Terbuka Hijau', unit: 'hektar', max: 60, step: 1, visual: 'nature' },
      y: { key: 'y', label: 'Zona Industri Rendah Emisi', unit: 'hektar', max: 60, step: 1, visual: 'neutral' },
    },
    constraints: [
      c('k_kawasan', 'Luas kawasan pengembangan', 1, 1, '<=', 50, 'explicit', 'kawasan pengembangan seluas 50 hektar', 'hektar'),
      c('k_operasional', 'Biaya operasional tahunan', 15, 25, '<=', 900, 'explicit', 'biaya operasional kota tidak melebihi Rp 900 juta per tahun', 'juta rupiah'),
      c('k_rasio', 'Industri tidak melebihi RTH', -1, 1, '<=', 0, 'explicit', 'luas zona industri tidak boleh melebihi luas RTH'),
      ...nonNegativity(),
    ],
    objective: { type: 'none', cx: 0, cy: 0, label: 'Tidak ada fungsi tujuan', unit: '', display: '-' },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_table',
    distractor: null,
    goalOptions: [
      { id: 'g1', text: 'Menentukan semua pembagian kawasan yang memenuhi kendala luas, biaya operasional, dan rasio', correct: true },
      { id: 'g2', text: 'Memperbesar zona industri sebanyak mungkin agar retribusi kota maksimum', correct: false },
      { id: 'g3', text: 'Menjadikan seluruh 50 hektar sebagai RTH', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Ruang Terbuka Hijau dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas Zona Industri Rendah Emisi dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Biaya perawatan RTH per hektar', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas Zona Industri Rendah Emisi dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Ruang Terbuka Hijau dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Total luas kawasan pengembangan', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Apakah pembagian kawasanmu sudah menyeimbangkan kebutuhan lingkungan dan kemampuan anggaran kota?',
        options: [
          { id: 'r0', text: 'Tidak tahu / belum sempat memeriksa', quality: 0 },
          { id: 'r1', text: 'Sudah, karena luas totalnya tidak lebih dari 50 hektar', quality: 1 },
          { id: 'r2', text: 'Bisa disesuaikan, selama biaya operasional Rp 900 juta dan aturan rasio tidak dilanggar', quality: 2 },
          {
            id: 'r3',
            text: 'Bisa disesuaikan, tetapi memperluas zona industri dibatasi aturan bahwa luasnya tidak boleh melebihi RTH, sehingga menambah industri menuntut penambahan RTH juga',
            quality: 3,
          },
        ],
      },
      openPrompt: 'Jelaskan singkat: kendala mana yang paling membatasi luas zona industri pada kawasan ini?',
      expectedTerms: ['rth', 'ruang terbuka hijau', 'hijau', 'industri', 'biaya', 'operasional', 'hektar', 'kawasan'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K1', 'K2'],
    isAnchorItem: true,
    gameInteraction:
      'Membagi kawasan pengembangan menjadi dua zona pada viewport isometrik; sistem menampilkan sisa biaya operasional dan status rasio secara live.',
  },
];
