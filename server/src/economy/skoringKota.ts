/**
 * Skoring K1–K4 untuk instrumen TheoTown (draf 2, branch theotown-ui).
 *
 * Fungsi MURNI dari urutan aksi pemain. Ambang batas di bawah adalah USULAN
 * dari docs/DRAF_INSTRUMEN_2_THEOTOWN.md dan belum divalidasi. Ubah lewat
 * SKORING_KOTA_VERSI, lalu uji ulang.
 */

import type { Bangunan } from './ekonomi.js';

export const SKORING_KOTA_VERSI = '2.0.0-draf';

export type AksiKota =
  | { tipe: 'pilih'; jenis: Bangunan; hari: number }
  | { tipe: 'tempatkan'; jenis: Bangunan; petak: number; hari: number; melanggar: boolean }
  | { tipe: 'bongkar'; jenis: Bangunan; petak: number; hari: number; bahagiaSebelum: number; bahagiaSesudah: number }
  | { tipe: 'hari'; bahagia: number; hari: number };

export interface KeadaanAkhir {
  warga: number;
  bahagia: number;
  bangkrut: boolean;
  hariSelesai: number;
}

export interface SkorKota {
  K1: 0 | 1 | 2 | 3;
  K2: 0 | 1 | 2 | 3;
  K3: 0 | 1 | 2 | 3;
  K4: 0 | 1 | 2 | 3;
  versi: string;
}

/** Pelanggaran aturan kota: bangunan kotor di sebelah rumah dianggap melanggar. */
export function skorK1(aksi: AksiKota[]): SkorKota['K1'] {
  const tempat = aksi.filter((a): a is Extract<AksiKota, { tipe: 'tempatkan' }> => a.tipe === 'tempatkan');
  if (tempat.length === 0) return 0;
  const pelanggaran = tempat.filter((t) => t.melanggar).length;
  if (pelanggaran === 0) return 3;
  if (pelanggaran === 1) return 2;
  return 1;
}

/** Rencana: memilih jenis sebelum menaruh, dan tidak menaruh yang tidak terjangkau. */
export function skorK2(aksi: AksiKota[]): SkorKota['K2'] {
  const pertamaTempat = aksi.findIndex((a) => a.tipe === 'tempatkan');
  if (pertamaTempat === -1) return 0;
  const adaRencana = aksi.slice(0, pertamaTempat).some((a) => a.tipe === 'pilih');
  if (!adaRencana) return 1;
  const tempatTanpaRencana = aksi
    .filter((a) => a.tipe === 'tempatkan')
    .filter((t) => !aksi.slice(0, aksi.indexOf(t)).some((a) => a.tipe === 'pilih' && a.jenis === t.jenis)).length;
  return tempatTanpaRencana === 0 ? 3 : 2;
}

/** Tujuan kota: tercapai, dan berapa banyak bongkar-pasang yang dilakukan. */
export function skorK3(aksi: AksiKota[], akhir: KeadaanAkhir, tujuanWarga: number, tujuanBahagia: number): SkorKota['K3'] {
  const bongkar = aksi.filter((a) => a.tipe === 'bongkar').length;
  if (akhir.bangkrut) return 0;
  const tercapai = akhir.warga >= tujuanWarga && akhir.bahagia >= tujuanBahagia;
  if (!tercapai) return akhir.warga > 0 ? 1 : 0;
  return bongkar <= 3 ? 3 : 2;
}

/**
 * Revisi: membongkar setelah kebahagiaan turun, lalu kebahagiaan naik lagi.
 * Tanpa revisi = 0. Revisi yang memperbaiki kota = 2. Revisi berulang yang
 * berhasil = 3.
 */
export function skorK4(aksi: AksiKota[]): SkorKota['K4'] {
  const bongkar = aksi.filter((a): a is Extract<AksiKota, { tipe: 'bongkar' }> => a.tipe === 'bongkar');
  if (bongkar.length === 0) return 0;
  const membaik = bongkar.filter((b) => b.bahagiaSesudah > b.bahagiaSebelum).length;
  if (membaik === 0) return 1;
  return membaik >= 2 ? 3 : 2;
}

export function skorKota(aksi: AksiKota[], akhir: KeadaanAkhir, tujuanWarga = 120, tujuanBahagia = 60): SkorKota {
  return {
    K1: skorK1(aksi),
    K2: skorK2(aksi),
    K3: skorK3(aksi, akhir, tujuanWarga, tujuanBahagia),
    K4: skorK4(aksi),
    versi: SKORING_KOTA_VERSI,
  };
}
