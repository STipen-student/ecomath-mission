/**
 * Bank Skenario Level 4 (docs/ECD_Framework.md Bagian 9).
 *
 * Karakteristik: 3-4 kendala termasuk 1 kendala IMPLISIT (harus disimpulkan
 * siswa dari narasi), WAJIB ada event distraktor/perubahan kebijakan di tengah
 * pengerjaan, representasi naratif + grafik parsial. Fokus bukti dominan:
 * K3-K4 dengan bobot K4 diperbesar (lihat scoring/composite.ts).
 *
 * REVISI INSTRUMEN pada L4-SDG13-A - disetujui peneliti sebelum implementasi:
 *   Angka asli dokumen (anggaran Rp 900 juta) menghasilkan daerah penyelesaian
 *   KOSONG, karena x + y >= 60 bersama 12x + 18y <= 900 memaksa x >= 30,
 *   sedangkan 15x + 2y <= 400 memaksa x <= 21,5. Anggaran dinaikkan menjadi
 *   Rp 1.080 juta agar daerah penyelesaian tidak kosong sekaligus tetap
 *   mempertahankan kendala emisi 400 kg sebagai kendala pengikat.
 *   Tarif karbon pada event distraktor dinaikkan dari Rp 4 juta menjadi
 *   Rp 8 juta/unit, karena pada Rp 4 juta mesin fosil (12+4=16) masih lebih
 *   murah daripada mesin listrik (18) sehingga titik optimum TIDAK bergeser -
 *   bertentangan dengan bukti K4 yang diharapkan dokumen. Pada Rp 8 juta,
 *   optimum bergeser dari (21 fosil, 39 listrik) ke (0 fosil, 60 listrik).
 */

import type { TaskDefinition } from '../domain/types.js';
import { c, nonNegativity } from './helpers.js';

export const LEVEL_4_TASKS: TaskDefinition[] = [
  {
    id: 'L4-SDG11-A',
    level: 4,
    sdgContext: 'SDG11',
    title: 'Krisis Lahan Meridian Utara',
    narrative:
      'Distrik Meridian Utara memiliki lahan pengembangan 120 hektar untuk Perumahan Padat Terjangkau seluas x hektar dan Ruang Terbuka Hijau seluas y hektar. Anggaran tersedia Rp 3,6 miliar dengan biaya perumahan Rp 25 juta/hektar dan RTH Rp 18 juta/hektar. Standar kota sehat versi WHO yang diadopsi kota ini mensyaratkan RTH minimal 30% dari luas total kawasan. Tiap hektar perumahan menampung 40 kepala keluarga. Tentukan kombinasi yang memaksimumkan jumlah kepala keluarga tertampung.',
    dataTable: {
      headers: ['Zona', 'Biaya per hektar', 'Daya tampung per hektar'],
      rows: [
        ['Perumahan Padat Terjangkau (x)', 'Rp 25 juta', '40 kepala keluarga'],
        ['Ruang Terbuka Hijau (y)', 'Rp 18 juta', '-'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Perumahan Padat Terjangkau', unit: 'hektar', max: 130, step: 1, visual: 'housing' },
      y: { key: 'y', label: 'Ruang Terbuka Hijau', unit: 'hektar', max: 130, step: 1, visual: 'nature' },
    },
    constraints: [
      c('k_lahan', 'Lahan pengembangan', 1, 1, '<=', 120, 'explicit', 'lahan pengembangan 120 hektar', 'hektar'),
      c('k_anggaran', 'Anggaran pembangunan', 25, 18, '<=', 3600, 'explicit', 'anggaran tersedia Rp 3,6 miliar', 'juta rupiah'),
      c('k_rth_who', 'Standar RTH kota sehat (implisit)', 0, 1, '>=', 36, 'implicit', 'RTH minimal 30% dari luas total kawasan - siswa harus menghitung sendiri 30% x 120 = 36 hektar', 'hektar'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'max',
      cx: 40,
      cy: 0,
      label: 'Jumlah kepala keluarga tertampung',
      unit: 'KK',
      display: 'Maksimumkan Z = 40x',
    },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_rth_40',
      narrative:
        'Pemerintah pusat baru saja menaikkan standar minimum RTH kota sehat menjadi 40% dari luas total kawasan akibat revisi kebijakan SDG 11 nasional.',
      constraintPatches: [
        {
          targetId: 'k_rth_who',
          newC: 48,
          newLabel: 'Standar RTH kota sehat - REVISI 40%',
          newDisplay: 'y ≥ 48 hektar',
        },
      ],
      instruction:
        'Revisi alokasi lahanmu agar memenuhi standar baru, lalu jelaskan dampaknya terhadap jumlah kepala keluarga yang dapat tertampung.',
    },
    goalOptions: [
      { id: 'g1', text: 'Maksimumkan Z = 40x (jumlah kepala keluarga tertampung)', correct: true },
      { id: 'g2', text: 'Minimumkan Z = 25x + 18y (total biaya pembangunan)', correct: false },
      { id: 'g3', text: 'Maksimumkan Z = 40y (daya tampung dihitung dari RTH)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = x + y (total luas kawasan terpakai)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Perumahan Padat Terjangkau dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas Ruang Terbuka Hijau dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Jumlah kepala keluarga yang tertampung', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas Ruang Terbuka Hijau dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Perumahan Padat Terjangkau dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Persentase standar RTH kota sehat', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Setelah standar RTH dinaikkan menjadi 40%, apa yang terjadi pada rencana kotamu?',
        options: [
          { id: 'r0', text: 'Tidak ada perubahan berarti', quality: 0 },
          { id: 'r1', text: 'Luas RTH harus ditambah', quality: 1 },
          { id: 'r2', text: 'Luas RTH harus ditambah menjadi minimal 48 hektar sehingga luas perumahan berkurang', quality: 2 },
          {
            id: 'r3',
            text: 'RTH minimal naik dari 36 ke 48 hektar, perumahan turun dari 84 ke 72 hektar, sehingga daya tampung berkurang dari 3.360 menjadi 2.880 kepala keluarga - target lingkungan yang lebih ketat dibayar dengan berkurangnya kapasitas hunian',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Jelaskan dengan kalimatmu sendiri: berapa kepala keluarga yang harus dikorbankan akibat kebijakan baru ini, dan mengapa hal itu terjadi?',
      expectedTerms: ['rth', 'ruang terbuka hijau', 'hijau', 'perumahan', 'hunian', 'kepala keluarga', 'kk', 'daya tampung', 'hektar', 'anggaran'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    gameInteraction:
      'Mengalokasikan dua zona pada peta distrik dengan grafik parsial daerah penyelesaian; setelah submit valid pertama, sistem memunculkan event kebijakan dan meminta revisi.',
  },

  {
    id: 'L4-SDG13-A',
    level: 4,
    sdgContext: 'SDG13',
    title: 'Transisi Energi Mendadak Distrik Industri',
    narrative:
      'Kawasan industri kota Meridian Selatan mengoperasikan x unit mesin produksi bertenaga fosil dan y unit mesin produksi bertenaga listrik. Kapasitas produksi total dibutuhkan minimal 60 unit mesin untuk memenuhi permintaan pasar. Biaya operasional mesin fosil Rp 12 juta/bulan dan mesin listrik Rp 18 juta/bulan, dengan anggaran operasional maksimal Rp 1.080 juta/bulan. Peraturan daerah yang berlaku menyatakan bahwa emisi kawasan industri tidak boleh melebihi separuh dari total emisi maksimum kota yang diizinkan sebesar 800 kg CO2/bulan, dengan emisi mesin fosil 15 kg CO2/unit/bulan dan mesin listrik 2 kg CO2/unit/bulan. Tentukan kombinasi yang meminimumkan biaya operasional.',
    dataTable: {
      headers: ['Jenis Mesin', 'Biaya operasional/bulan', 'Emisi per unit/bulan'],
      rows: [
        ['Mesin fosil (x)', 'Rp 12 juta', '15 kg CO2'],
        ['Mesin listrik (y)', 'Rp 18 juta', '2 kg CO2'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Mesin bertenaga fosil', unit: 'unit', max: 70, step: 1, visual: 'neutral' },
      y: { key: 'y', label: 'Mesin bertenaga listrik', unit: 'unit', max: 70, step: 1, visual: 'clean' },
    },
    constraints: [
      c('k_kapasitas', 'Kapasitas produksi minimal', 1, 1, '>=', 60, 'explicit', 'kapasitas produksi total dibutuhkan minimal 60 unit mesin', 'unit'),
      c('k_anggaran', 'Anggaran operasional bulanan', 12, 18, '<=', 1080, 'explicit', 'anggaran operasional maksimal Rp 1.080 juta/bulan', 'juta rupiah'),
      c('k_emisi', 'Batas emisi kawasan (implisit)', 15, 2, '<=', 400, 'implicit', 'emisi kawasan tidak boleh melebihi separuh dari 800 kg CO2 - siswa harus menyimpulkan angka 400', 'kg CO2'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'min',
      cx: 12,
      cy: 18,
      label: 'Total biaya operasional bulanan',
      unit: 'juta rupiah',
      display: 'Minimumkan Z = 12x + 18y',
    },
    domain: 'integer',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_tarif_karbon',
      narrative:
        'Terjadi kenaikan tarif karbon nasional. Kini setiap unit mesin fosil dikenai biaya tambahan Rp 8 juta/bulan, sehingga biaya operasionalnya menjadi Rp 20 juta/bulan.',
      constraintPatches: [
        {
          targetId: 'k_anggaran',
          newA: 20,
          newLabel: 'Anggaran operasional - SETELAH tarif karbon',
          newDisplay: '20x + 18y ≤ 1080 juta rupiah',
        },
      ],
      objectivePatch: {
        cx: 20,
        label: 'Total biaya operasional bulanan setelah tarif karbon',
        display: 'Minimumkan Z = 20x + 18y',
      },
      instruction:
        'Evaluasi kembali: apakah komposisi mesin yang tadi kamu pilih masih paling murah setelah struktur biaya berubah? Revisi bila perlu.',
    },
    goalOptions: [
      { id: 'g1', text: 'Minimumkan Z = 12x + 18y (total biaya operasional)', correct: true },
      { id: 'g2', text: 'Maksimumkan Z = 12x + 18y (total biaya operasional)', correct: false },
      { id: 'g3', text: 'Minimumkan Z = 15x + 2y (total emisi karbon)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = x + y (jumlah mesin beroperasi)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Banyak unit mesin produksi bertenaga fosil', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Banyak unit mesin produksi bertenaga listrik', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Emisi karbon per unit mesin fosil', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Banyak unit mesin produksi bertenaga listrik', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Banyak unit mesin produksi bertenaga fosil', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Batas emisi maksimum kota', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Setelah tarif karbon naik, apa yang terjadi pada komposisi mesin paling murah?',
        options: [
          { id: 'r0', text: 'Tidak ada perubahan berarti', quality: 0 },
          { id: 'r1', text: 'Biaya operasional kawasan menjadi lebih mahal', quality: 1 },
          { id: 'r2', text: 'Mesin fosil menjadi lebih mahal sehingga jumlahnya perlu dikurangi', quality: 2 },
          {
            id: 'r3',
            text: 'Mesin fosil naik menjadi Rp 20 juta sehingga kini lebih mahal daripada mesin listrik Rp 18 juta; komposisi termurah bergeser dari 21 fosil menjadi seluruhnya listrik, artinya kebijakan karbon mengubah insentif ekonomi yang tadinya membuat fosil menguntungkan',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Jelaskan dengan kalimatmu sendiri: mengapa kebijakan tarif karbon dapat mengubah jawaban yang tadinya sudah paling optimal?',
      expectedTerms: ['fosil', 'listrik', 'emisi', 'co2', 'biaya', 'tarif karbon', 'karbon', 'anggaran', 'mesin', 'unit'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    gameInteraction:
      'Mengatur jumlah dua jenis mesin pada denah kawasan industri dengan grafik parsial daerah penyelesaian; setelah submit valid pertama, sistem memunculkan event tarif karbon.',
  },

  {
    id: 'L4-SDG11&13-A',
    level: 4,
    sdgContext: 'SDG11&13',
    title: 'Rencana Induk Kota Baru Solantis',
    narrative:
      'Kota baru bernama Solantis sedang menyusun rencana induk untuk kawasan seluas 200 hektar, dibagi menjadi Zona Hunian Rendah Karbon seluas x hektar dan Zona Hijau Multifungsi (RTH + jalur sepeda + resapan air) seluas y hektar. Total anggaran pembangunan tahap pertama adalah Rp 8 miliar, dengan biaya zona hunian Rp 45 juta/hektar dan zona hijau Rp 22 juta/hektar. Studi kelayakan lingkungan mensyaratkan kapasitas resapan air kota harus mampu menampung debit hujan wilayah tropis, yang menurut standar teknis berarti zona hijau harus mencakup minimal 35% dari total kawasan. Setiap hektar zona hunian menampung setara 500 poin kapasitas penduduk, dan setiap hektar zona hijau berkontribusi 300 poin indeks ketahanan iklim. Tentukan kombinasi yang memaksimumkan total skor gabungan kapasitas penduduk dan ketahanan iklim dengan bobot yang setara.',
    dataTable: {
      headers: ['Zona', 'Biaya per hektar', 'Kontribusi skor per hektar'],
      rows: [
        ['Zona Hunian Rendah Karbon (x)', 'Rp 45 juta', '500 poin kapasitas penduduk'],
        ['Zona Hijau Multifungsi (y)', 'Rp 22 juta', '300 poin ketahanan iklim'],
      ],
    },
    variables: {
      x: { key: 'x', label: 'Zona Hunian Rendah Karbon', unit: 'hektar', max: 210, step: 1, visual: 'housing' },
      y: { key: 'y', label: 'Zona Hijau Multifungsi', unit: 'hektar', max: 210, step: 1, visual: 'nature' },
    },
    constraints: [
      c('k_kawasan', 'Luas kawasan rencana induk', 1, 1, '<=', 200, 'explicit', 'kawasan seluas 200 hektar', 'hektar'),
      c('k_anggaran', 'Anggaran tahap pertama', 45, 22, '<=', 8000, 'explicit', 'total anggaran pembangunan tahap pertama Rp 8 miliar', 'juta rupiah'),
      c('k_resapan', 'Kapasitas resapan air (implisit)', 0, 1, '>=', 70, 'implicit', 'zona hijau minimal 35% dari total kawasan - siswa harus menghitung sendiri 35% x 200 = 70 hektar', 'hektar'),
      ...nonNegativity(),
    ],
    objective: {
      type: 'max',
      cx: 500,
      cy: 300,
      label: 'Skor gabungan kapasitas penduduk dan ketahanan iklim',
      unit: 'poin',
      display: 'Maksimumkan Z = 500x + 300y',
    },
    domain: 'continuous',
    numberStyle: 'large_integer',
    representation: 'narrative_partial_graph',
    distractor: {
      id: 'ev_resapan_45',
      narrative:
        'Badan Meteorologi merilis proyeksi baru: intensitas hujan ekstrem meningkat 20%, sehingga standar minimum zona hijau direvisi menjadi 45% dari total kawasan.',
      constraintPatches: [
        {
          targetId: 'k_resapan',
          newC: 90,
          newLabel: 'Kapasitas resapan air - REVISI 45%',
          newDisplay: 'y ≥ 90 hektar',
        },
      ],
      instruction:
        'Revisi rencana indukmu agar memenuhi standar resapan baru, lalu jawab pertanyaan reflektif di akhir.',
    },
    goalOptions: [
      { id: 'g1', text: 'Maksimumkan Z = 500x + 300y (skor gabungan)', correct: true },
      { id: 'g2', text: 'Maksimumkan Z = 300x + 500y (skor gabungan dengan bobot tertukar)', correct: false },
      { id: 'g3', text: 'Minimumkan Z = 45x + 22y (total anggaran pembangunan)', correct: false },
      { id: 'g4', text: 'Maksimumkan Z = 300y (indeks ketahanan iklim saja)', correct: false },
    ],
    variableOptions: [
      { id: 'vx1', text: 'Luas Zona Hunian Rendah Karbon dalam hektar', assignsTo: 'x', correct: true },
      { id: 'vx2', text: 'Luas Zona Hijau Multifungsi dalam hektar', assignsTo: 'x', correct: false },
      { id: 'vx3', text: 'Poin kapasitas penduduk per hektar', assignsTo: 'x', correct: false },
      { id: 'vy1', text: 'Luas Zona Hijau Multifungsi dalam hektar', assignsTo: 'y', correct: true },
      { id: 'vy2', text: 'Luas Zona Hunian Rendah Karbon dalam hektar', assignsTo: 'y', correct: false },
      { id: 'vy3', text: 'Persentase minimum zona hijau', assignsTo: 'y', correct: false },
    ],
    reflection: {
      closed: {
        prompt: 'Setelah standar zona hijau dinaikkan menjadi 45%, apa yang terjadi pada rencana indukmu?',
        options: [
          { id: 'r0', text: 'Tidak ada perubahan berarti', quality: 0 },
          { id: 'r1', text: 'Zona hijau harus diperluas', quality: 1 },
          { id: 'r2', text: 'Zona hijau harus diperluas menjadi minimal 90 hektar sehingga zona hunian menyusut', quality: 2 },
          {
            id: 'r3',
            text: 'Zona hijau naik dari 70 ke 90 hektar dan hunian turun dari 130 ke 110 hektar, sehingga skor gabungan turun dari 86.000 menjadi 82.000 poin - kota membayar ketahanan iklim yang lebih tinggi dengan berkurangnya kapasitas penduduk',
            quality: 3,
          },
        ],
      },
      openPrompt:
        'Kebijakan mana yang menurutmu lebih penting dipertahankan pada situasi ini: kapasitas penduduk maksimum atau ketahanan terhadap iklim ekstrem? Jelaskan alasanmu berdasarkan hasil optimasimu.',
      expectedTerms: ['hunian', 'zona hijau', 'hijau', 'resapan', 'iklim', 'ketahanan', 'kapasitas penduduk', 'poin', 'hektar', 'anggaran'],
    },
    expectedConstraintCount: 3,
    blueprintConstraintCount: 3,
    dominantClaims: ['K3', 'K4'],
    gameInteraction:
      'Menyusun rencana induk dua zona pada viewport isometrik kota baru dengan grafik parsial daerah penyelesaian; event proyeksi iklim muncul setelah submit valid pertama.',
  },
];
