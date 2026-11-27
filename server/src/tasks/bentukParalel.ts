/**
 * Bentuk paralel: setiap soal punya beberapa set angka (bentuk A, B, C) dengan
 * struktur dan tingkat kesulitan yang SAMA, agar siswa sekelas tidak saling
 * menyalin jawaban. Bentuk A adalah soal asli di bank soal.
 *
 * Bentuk B/C dibuat dengan MENSKALAKAN semua ruas kanan kendala (dan nilai baru
 * pada event kebijakan Level 4) dengan faktor yang sama. Daerah penyelesaian
 * hanya membesar/mengecil: kendala yang membatasi, letak titik optimum, dan
 * langkah penyelesaian tidak berubah. Koefisien (harga, poin, emisi per unit)
 * dan persentase tidak diubah. Teks diganti frasa demi frasa secara eksplisit,
 * sehingga setiap bentuk dapat dibaca dan divalidasi seperti soal biasa.
 *
 * Uji tests/bentukParalel.test.ts memeriksa setiap bentuk: optimum bulat dan
 * di dalam batas slider, kendala pembatas sama dengan bentuk A, beban permukaan
 * sama, dan tidak ada angka lama yang tertinggal di teks.
 */

import type { TaskDefinition } from '../domain/types.js';
import { displayOf } from './helpers.js';

export interface BentukParalel {
  id: 'B' | 'C';
  /** Faktor pengali ruas kanan kendala dan batas slider. */
  skala: number;
  /** Penggantian frasa [lama, baru], diterapkan ke SEMUA teks soal. */
  teks: Array<[string, string]>;
}

export const BENTUK_PARALEL: Record<string, BentukParalel[]> = {
  'L1-SDG11-A': [
    { id: 'B', skala: 0.75, teks: [['40 hektar', '30 hektar']] },
    { id: 'C', skala: 1.25, teks: [['40 hektar', '50 hektar']] },
  ],
  'L1-SDG13-A': [
    { id: 'B', skala: 0.75, teks: [['24 unit', '18 unit']] },
    { id: 'C', skala: 1.25, teks: [['24 unit', '30 unit']] },
  ],
  'L1-SDG11&13-A': [
    { id: 'B', skala: 0.8, teks: [['30 meter', '24 meter'], ['15 meter', '12 meter']] },
    { id: 'C', skala: 1.2, teks: [['30 meter', '36 meter'], ['15 meter', '18 meter']] },
  ],
  'L2-SDG11-A': [
    { id: 'B', skala: 0.8, teks: [['Rp 900 juta', 'Rp 720 juta'], ['60 hektar', '48 hektar']] },
    { id: 'C', skala: 1.2, teks: [['Rp 900 juta', 'Rp 1.080 juta'], ['60 hektar', '72 hektar']] },
  ],
  'L2-SDG13-A': [
    {
      id: 'B',
      skala: 0.8,
      teks: [['Rp 1,2 miliar', 'Rp 960 juta'], ['500 meter persegi', '400 meter persegi'], ['500 m2', '400 m2']],
    },
    {
      id: 'C',
      skala: 1.2,
      teks: [['Rp 1,2 miliar', 'Rp 1,44 miliar'], ['500 meter persegi', '600 meter persegi'], ['500 m2', '600 m2']],
    },
  ],
  'L2-SDG11&13-A': [
    { id: 'B', skala: 0.8, teks: [['50 hektar', '40 hektar'], ['Rp 900 juta', 'Rp 720 juta']] },
    { id: 'C', skala: 1.2, teks: [['50 hektar', '60 hektar'], ['Rp 900 juta', 'Rp 1.080 juta']] },
  ],
  'L3-SDG11-A': [
    { id: 'B', skala: 0.5, teks: [['80 hektar', '40 hektar'], ['Rp 2,4 miliar', 'Rp 1,2 miliar'], ['10 hektar', '5 hektar']] },
    { id: 'C', skala: 1.5, teks: [['80 hektar', '120 hektar'], ['Rp 2,4 miliar', 'Rp 3,6 miliar'], ['10 hektar', '15 hektar']] },
  ],
  'L3-SDG13-A': [
    { id: 'B', skala: 0.5, teks: [['50 ton', '25 ton'], ['19 kg CO2', '9,5 kg CO2']] },
    { id: 'C', skala: 1.5, teks: [['50 ton', '75 ton'], ['19 kg CO2', '28,5 kg CO2']] },
  ],
  'L3-SDG11&13-A': [
    { id: 'B', skala: 0.8, teks: [['100 hektar', '80 hektar'], ['Rp 5 miliar', 'Rp 4 miliar']] },
    { id: 'C', skala: 1.2, teks: [['100 hektar', '120 hektar'], ['Rp 5 miliar', 'Rp 6 miliar']] },
  ],
  'L4-SDG11-A': [
    {
      id: 'B',
      skala: 0.5,
      teks: [
        ['30% x 120 = 36 hektar', '30% x 60 = 18 hektar'],
        ['120 hektar', '60 hektar'],
        ['Rp 3,6 miliar', 'Rp 1,8 miliar'],
        ['dari 36 ke 48 hektar', 'dari 18 ke 24 hektar'],
        ['dari 84 ke 72 hektar', 'dari 42 ke 36 hektar'],
        ['dari 3.360 menjadi 2.880', 'dari 1.680 menjadi 1.440'],
        ['48 hektar', '24 hektar'],
      ],
    },
    {
      id: 'C',
      skala: 1.5,
      teks: [
        ['30% x 120 = 36 hektar', '30% x 180 = 54 hektar'],
        ['120 hektar', '180 hektar'],
        ['Rp 3,6 miliar', 'Rp 5,4 miliar'],
        ['dari 36 ke 48 hektar', 'dari 54 ke 72 hektar'],
        ['dari 84 ke 72 hektar', 'dari 126 ke 108 hektar'],
        ['dari 3.360 menjadi 2.880', 'dari 5.040 menjadi 4.320'],
        ['48 hektar', '72 hektar'],
      ],
    },
  ],
  'L4-SDG13-A': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['separuh dari 800 kg CO2 - siswa harus menyimpulkan angka 400', 'separuh dari 1.600 kg CO2 - siswa harus menyimpulkan angka 800'],
        ['60 unit', '120 unit'],
        ['Rp 1.080 juta', 'Rp 2.160 juta'],
        ['1080 juta', '2160 juta'],
        ['800 kg CO2', '1.600 kg CO2'],
        // Domain bilangan bulat: optimum bulat bentuk ini (43, 77), bukan 2 x (21, 39).
        ['dari 21 fosil', 'dari 43 fosil'],
      ],
    },
  ],
  'L4-SDG11&13-A': [
    {
      id: 'B',
      skala: 0.5,
      teks: [
        ['35% x 200 = 70 hektar', '35% x 100 = 35 hektar'],
        ['200 hektar', '100 hektar'],
        ['Rp 8 miliar', 'Rp 4 miliar'],
        ['dari 70 ke 90 hektar', 'dari 35 ke 45 hektar'],
        ['dari 130 ke 110 hektar', 'dari 65 ke 55 hektar'],
        ['dari 86.000 menjadi 82.000', 'dari 41.000 menjadi 37.000'],
        ['90 hektar', '45 hektar'],
      ],
    },
    {
      id: 'C',
      skala: 1.5,
      teks: [
        ['35% x 200 = 70 hektar', '35% x 300 = 105 hektar'],
        ['200 hektar', '300 hektar'],
        ['Rp 8 miliar', 'Rp 12 miliar'],
        ['dari 70 ke 90 hektar', 'dari 105 ke 135 hektar'],
        ['dari 130 ke 110 hektar', 'dari 195 ke 165 hektar'],
        ['dari 86.000 menjadi 82.000', 'dari 129.000 menjadi 123.000'],
        ['90 hektar', '135 hektar'],
      ],
    },
  ],
  // Instrumen 2.0.0: soal SPtLDV Level 3-4 (tanpa fungsi tujuan). Frasa panjang
  // ditulis lebih dulu agar tidak terpotong oleh frasa pendek di dalamnya.
  'L3-SDG11-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['pasar 40 hektar dan ruang hijau 20 hektar', 'pasar 80 hektar dan ruang hijau 40 hektar'],
        ['60 hektar', '120 hektar'],
        ['10 hektar', '20 hektar'],
      ],
    },
  ],
  'L3-SDG13-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['30 motor gerobak hanya mengangkut 60 ton', '60 motor gerobak hanya mengangkut 120 ton'],
        ['Rp 6 miliar', 'Rp 12 miliar'],
        ['60 ton', '120 ton'],
        ['30 kendaraan', '60 kendaraan'],
      ],
    },
  ],
  'L3-SDG11&13-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['10 panel dan 20 lampu jalan', '20 panel dan 40 lampu jalan'],
        ['0,4 x 10 + 0,1 x 20 = 6 kW, kurang dari 8 kW', '0,4 x 20 + 0,1 x 40 = 12 kW, kurang dari 16 kW'],
        ['Rp 60 juta', 'Rp 120 juta'],
        ['8 kW', '16 kW'],
        ['20 buah', '40 buah'],
      ],
    },
  ],
  'L4-SDG11-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['25% x 100 = 25 hektar', '25% x 200 = 50 hektar'],
        ['angka 25 hektar', 'angka 50 hektar'],
        ['y = 25 ke y = 35', 'y = 50 ke y = 70'],
        ['kurang dari 35 hektar', 'kurang dari 70 hektar'],
        ['y ≥ 35 hektar', 'y ≥ 70 hektar'],
        ['100 hektar', '200 hektar'],
        ['Rp 2.400 miliar', 'Rp 4.800 miliar'],
      ],
    },
  ],
  'L4-SDG13-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['separuh dari 120 ton CO2 - siswa harus menyimpulkan angka 60', 'separuh dari 240 ton CO2 - siswa harus menyimpulkan angka 120'],
        ['separuh dari 120 ton, yaitu 60 ton', 'separuh dari 240 ton, yaitu 120 ton'],
        ['4y ≤ 60 atau y ≤ 15', '4y ≤ 120 atau y ≤ 30'],
        ['4y ≤ 60, bukan 4y ≤ 120', '4y ≤ 120, bukan 4y ≤ 240'],
        ['kuota kota sebesar 120 ton', 'kuota kota sebesar 240 ton'],
        ['dari 120 menjadi 80 ton', 'dari 240 menjadi 160 ton'],
        ['menjadi 80 ton', 'menjadi 160 ton'],
        ['4y ≤ 40 ton CO2', '4y ≤ 80 ton CO2'],
        ['50 angkot', '100 angkot'],
        ['Rp 300 juta', 'Rp 600 juta'],
      ],
    },
  ],
  'L4-SDG11&13-B': [
    {
      id: 'B',
      skala: 2,
      teks: [
        ['150 hektar', '300 hektar'],
        ['Rp 4.800 miliar', 'Rp 9.600 miliar'],
      ],
    },
  ],
};

/** Daftar id bentuk yang tersedia untuk sebuah soal, selalu diawali 'A'. */
export function daftarBentuk(taskId: string): string[] {
  return ['A', ...(BENTUK_PARALEL[taskId] ?? []).map((b) => b.id)];
}

/** Ganti frasa sekaligus (dua tahap) agar hasil penggantian tidak diganti lagi. */
function gantiFrasa(s: string, pasangan: Array<[string, string]>): string {
  let hasil = s;
  pasangan.forEach(([lama], i) => {
    hasil = hasil.split(lama).join(`\u0000${i}\u0000`);
  });
  pasangan.forEach(([, baru], i) => {
    hasil = hasil.split(`\u0000${i}\u0000`).join(baru);
  });
  return hasil;
}

function gantiSemuaTeks<T>(nilai: T, pasangan: Array<[string, string]>): T {
  if (typeof nilai === 'string') return gantiFrasa(nilai, pasangan) as T;
  if (Array.isArray(nilai)) return nilai.map((v) => gantiSemuaTeks(v, pasangan)) as T;
  if (nilai && typeof nilai === 'object') {
    const keluar: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(nilai)) keluar[k] = gantiSemuaTeks(v, pasangan);
    return keluar as T;
  }
  return nilai;
}

const bulatkan = (v: number): number => Math.round(v * 1000) / 1000;

/** Satuan di belakang angka ruas kanan pada teks display (mis. "hektar"). */
function satuanDisplay(display: string): string | undefined {
  const m = display.match(/[≤≥<>]\s*-?[\d.]+\s+(.+)$/);
  return m?.[1];
}

/**
 * Soal pada bentuk tertentu. Bentuk 'A' (atau yang tidak dikenal) adalah soal
 * asli. Fungsi murni: tidak mengubah bank soal.
 */
export function instansiasi(task: TaskDefinition, bentukId: string | null | undefined): TaskDefinition {
  const bentuk = (BENTUK_PARALEL[task.id] ?? []).find((b) => b.id === bentukId);
  if (!bentuk) return task;
  const f = bentuk.skala;
  const t = gantiSemuaTeks(structuredClone(task), bentuk.teks);

  t.constraints = t.constraints.map((k) => {
    if (k.kind === 'nonnegativity' || k.c === 0) return k;
    const c = bulatkan(k.c * f);
    return { ...k, c, display: displayOf(k.a, k.b, k.op, c, satuanDisplay(k.display)) };
  });
  for (const sumbu of ['x', 'y'] as const) {
    const v = t.variables[sumbu];
    v.max = Math.ceil((v.max * f) / v.step) * v.step;
  }
  if (t.distractor) {
    t.distractor.constraintPatches = t.distractor.constraintPatches.map((p) => {
      const asal = t.constraints.find((k) => k.id === p.targetId);
      const baru = { ...p };
      if (typeof p.newC === 'number' && p.newC !== 0) baru.newC = bulatkan(p.newC * f);
      if (asal && p.newDisplay) {
        baru.newDisplay = displayOf(p.newA ?? asal.a, p.newB ?? asal.b, p.newOp ?? asal.op, baru.newC ?? asal.c, satuanDisplay(asal.display));
      }
      return baru;
    });
  }
  return t;
}
