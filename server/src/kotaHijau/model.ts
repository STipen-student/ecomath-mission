/**
 * Misi Kota Hijau: tugas kinerja KPMM kedua, terpisah dari K1-K4.
 *
 * Semua siswa mendapat distrik percontohan, anggaran, dan target yang SAMA
 * (tidak memakai koin pribadi), sehingga hasilnya dapat dibandingkan
 * antarsiswa. Model ini murni dan dipakai server untuk menghitung ulang
 * seluruh keadaan dari daftar tindakan siswa; client memakai salinan yang
 * sama persis (client/src/kotaHijau/model.ts) untuk tampilan.
 *
 * Indeks hijau = hijau / (hijau + lainnya + emisi), dengan bobot:
 *   pohon dan taman terawat = 2, bus listrik dan panel surya = 1 (hijau);
 *   rumah dan fasilitas rusak = 1 (lainnya); bus konvensional dan mesin fosil = 1 (emisi).
 */

export const VERSI_KOTA_HIJAU = 'KH-1.0.0';

export interface KeadaanKota {
  rumah: number;
  busKonvensional: number;
  busListrik: number;
  mesinFosil: number;
  surya: number;
  pohon: number;
  pohonRusak: number;
  taman: number;
  tamanRusak: number;
  /** Sisa anggaran (koin Dewan). */
  dana: number;
}

export const KOTA_AWAL: KeadaanKota = {
  rumah: 12,
  busKonvensional: 2,
  busListrik: 0,
  mesinFosil: 1,
  surya: 0,
  pohon: 3,
  pohonRusak: 0,
  taman: 0,
  tamanRusak: 2,
  dana: 150,
};

export const TARGET = { indeksMin: 55 } as const;

/** Badai: merusak sampai 2 pohon, lalu Dewan menambah anggaran. */
export const BADAI = { pohonRusak: 2, tambahanDana: 25 } as const;

export type IdAksi = 'ganti-bus' | 'ganti-mesin' | 'rawat-taman' | 'rawat-pohon' | 'tanam-pohon' | 'taman-baru' | 'surya-baru';

export interface DefinisiAksi {
  id: IdAksi;
  label: string;
  biaya: number;
  /** Banyak paling banyak yang bisa dilakukan pada keadaan k. */
  maks: (k: KeadaanKota) => number;
  terapkan: (k: KeadaanKota, n: number) => void;
}

export const AKSI: DefinisiAksi[] = [
  {
    id: 'ganti-bus', label: 'Ganti bus konvensional ke bus listrik', biaya: 40,
    maks: (k) => k.busKonvensional,
    terapkan: (k, n) => { k.busKonvensional -= n; k.busListrik += n; },
  },
  {
    id: 'ganti-mesin', label: 'Ganti mesin fosil ke panel surya', biaya: 35,
    maks: (k) => k.mesinFosil,
    terapkan: (k, n) => { k.mesinFosil -= n; k.surya += n; },
  },
  {
    id: 'rawat-taman', label: 'Rawat taman yang rusak', biaya: 10,
    maks: (k) => k.tamanRusak,
    terapkan: (k, n) => { k.tamanRusak -= n; k.taman += n; },
  },
  {
    id: 'rawat-pohon', label: 'Rawat pohon yang rusak', biaya: 8,
    maks: (k) => k.pohonRusak,
    terapkan: (k, n) => { k.pohonRusak -= n; k.pohon += n; },
  },
  {
    id: 'tanam-pohon', label: 'Tanam pohon baru', biaya: 10,
    maks: () => 10,
    terapkan: (k, n) => { k.pohon += n; },
  },
  {
    id: 'taman-baru', label: 'Bangun taman baru', biaya: 25,
    maks: () => 5,
    terapkan: (k, n) => { k.taman += n; },
  },
  {
    id: 'surya-baru', label: 'Bangun panel surya baru', biaya: 35,
    maks: () => 5,
    terapkan: (k, n) => { k.surya += n; },
  },
];

export type Rencana = Partial<Record<IdAksi, number>>;

export interface Ringkasan {
  indeks: number;
  emisi: number;
  rusak: number;
  dana: number;
  targetIndeks: boolean;
  targetEmisi: boolean;
  targetRusak: boolean;
  /** Banyak target yang tercapai (0-3). */
  jumlahTarget: number;
}

export function salin(k: KeadaanKota): KeadaanKota {
  return { ...k };
}

export function biayaRencana(r: Rencana): number {
  return AKSI.reduce((n, a) => n + (Math.max(0, Math.floor(r[a.id] ?? 0)) * a.biaya), 0);
}

/** Rencana sah bila setiap jumlah bulat tak negatif dan tidak melebihi batasnya. */
export function rencanaSah(k: KeadaanKota, r: Rencana): boolean {
  return AKSI.every((a) => {
    const n = r[a.id] ?? 0;
    return Number.isInteger(n) && n >= 0 && n <= a.maks(k);
  });
}

/** Terapkan rencana bila sah dan terjangkau; null bila ditolak. */
export function terapkanRencana(k: KeadaanKota, r: Rencana): KeadaanKota | null {
  if (!rencanaSah(k, r)) return null;
  const biaya = biayaRencana(r);
  if (biaya > k.dana) return null;
  const baru = salin(k);
  for (const a of AKSI) {
    const n = r[a.id] ?? 0;
    if (n > 0) a.terapkan(baru, n);
  }
  baru.dana -= biaya;
  return baru;
}

export function terapkanBadai(k: KeadaanKota): KeadaanKota {
  const baru = salin(k);
  const rusak = Math.min(BADAI.pohonRusak, baru.pohon);
  baru.pohon -= rusak;
  baru.pohonRusak += rusak;
  baru.dana += BADAI.tambahanDana;
  return baru;
}

export function ringkas(k: KeadaanKota): Ringkasan {
  const hijau = 2 * (k.pohon + k.taman) + k.busListrik + k.surya;
  const rusak = k.pohonRusak + k.tamanRusak;
  const emisi = k.busKonvensional + k.mesinFosil;
  const total = Math.max(1, hijau + k.rumah + rusak + emisi);
  const indeks = Math.round((hijau / total) * 1000) / 10;
  const targetIndeks = indeks >= TARGET.indeksMin;
  const targetEmisi = emisi === 0;
  const targetRusak = rusak === 0;
  return {
    indeks,
    emisi,
    rusak,
    dana: k.dana,
    targetIndeks,
    targetEmisi,
    targetRusak,
    jumlahTarget: [targetIndeks, targetEmisi, targetRusak].filter(Boolean).length,
  };
}
