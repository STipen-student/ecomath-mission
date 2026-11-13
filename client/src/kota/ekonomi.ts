/**
 * Model ekonomi kota (branch theotown-ui). Fungsi MURNI: tanpa database, tanpa
 * jam, tanpa event. Dipakai untuk menghitung keadaan kota dari bangunan yang
 * dipilih pemain; tidak menyentuh rubrik K1–K4.
 *
 * Instrumen versi baru. Skor dari versi ini TIDAK sebanding dengan versi 1.1.0.
 */

export type Bangunan = 'rumah' | 'toko' | 'pabrik' | 'taman' | 'surya';

export interface DefinisiBangunan {
  biaya: number;
  hunian: number;
  lapanganKerja: number;
  pajak: number;
  perawatan: number;
  bahagia: number;
  polusi: number;
}

export const BANGUNAN: Record<Bangunan, DefinisiBangunan> = {
  rumah:  { biaya: 80,  hunian: 12, lapanganKerja: 0,  pajak: 3, perawatan: 1, bahagia: 0,  polusi: 0 },
  toko:   { biaya: 120, hunian: 0,  lapanganKerja: 6,  pajak: 4, perawatan: 2, bahagia: 1,  polusi: 0 },
  pabrik: { biaya: 220, hunian: 0,  lapanganKerja: 14, pajak: 9, perawatan: 4, bahagia: -3, polusi: 4 },
  taman:  { biaya: 60,  hunian: 0,  lapanganKerja: 0,  pajak: 0, perawatan: 1, bahagia: 4, polusi: -1 },
  surya:  { biaya: 160, hunian: 0,  lapanganKerja: 2,  pajak: 0, perawatan: 1, bahagia: 0, polusi: -3 },
};

export interface KeadaanKota {
  hunian: number;
  lapanganKerja: number;
  warga: number;
  pekerja: number;
  pengangguran: number;
  pajak: number;
  perawatan: number;
  polusi: number;
  bahagia: number;
}

/**
 * Hitung keadaan kota dari daftar bangunan (satu entri per petak terisi).
 * `tetangga` memberi indeks petak yang berbatasan dengan petak i.
 */
export function hitungKeadaan(
  petak: Array<Bangunan | null>,
  tetangga: (i: number) => number[],
): KeadaanKota {
  let hunian = 0, kerja = 0, pajakKotor = 0, perawatan = 0, polusi = 0, bahagia = 50;

  petak.forEach((b, i) => {
    if (!b) return;
    const d = BANGUNAN[b];
    hunian += d.hunian;
    kerja += d.lapanganKerja;
    pajakKotor += d.pajak;
    perawatan += d.perawatan;
    polusi += d.polusi ?? 0;
    bahagia += d.bahagia;
    tetangga(i).forEach((j) => {
      if (petak[j] !== 'rumah') return;
      if (b === 'taman') bahagia += 2;
      if (b === 'pabrik') bahagia -= 2;
    });
  });

  polusi = Math.max(0, polusi);
  bahagia -= polusi * 2;
  bahagia = Math.max(0, Math.min(100, Math.round(bahagia)));

  // Warga hanya ikut kota selama kebahagiaan cukup; minimum 20% hunian tetap terisi.
  const warga = Math.round(hunian * Math.max(0.2, bahagia / 100));
  const pekerja = Math.min(warga, kerja);
  const pengangguran = warga - pekerja;
  // Pajak dipungut sebanding dengan jumlah yang bekerja; setengah bila kebahagiaan di bawah 40%.
  const pajak = Math.round(pajakKotor * (pekerja / Math.max(1, kerja)) * (bahagia >= 40 ? 1 : 0.5));

  return { hunian, lapanganKerja: kerja, warga, pekerja, pengangguran, pajak, perawatan, polusi, bahagia };
}

/** Dana setelah satu hari: pajak dikurangi perawatan. */
export function danaSehari(dana: number, keadaan: KeadaanKota): number {
  return dana + keadaan.pajak - keadaan.perawatan;
}

/** Apakah dana cukup untuk membangun. */
export function bisaMembangun(dana: number, jenis: Bangunan): boolean {
  return dana >= BANGUNAN[jenis].biaya;
}
