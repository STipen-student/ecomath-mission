/** Uji angka Misi Kota Hijau: target hanya tercapai dengan perencanaan yang efisien. */
import { describe, expect, it } from 'vitest';
import { AKSI, KOTA_AWAL, ringkas, terapkanBadai, terapkanRencana, type KeadaanKota, type Rencana } from '../src/kotaHijau/model.js';

/** Semua rencana sah dan terjangkau dari keadaan k (pencarian menyeluruh). */
function semuaRencana(k: KeadaanKota): Rencana[] {
  const hasil: Rencana[] = [];
  const telusuri = (i: number, r: Rencana, sisa: number): void => {
    if (i === AKSI.length) {
      hasil.push({ ...r });
      return;
    }
    const a = AKSI[i]!;
    for (let n = 0; n <= a.maks(k) && n * a.biaya <= sisa; n++) {
      telusuri(i + 1, { ...r, [a.id]: n }, sisa - n * a.biaya);
    }
  };
  telusuri(0, {}, k.dana);
  return hasil;
}

describe('Misi Kota Hijau - fase 1', () => {
  const lulus = semuaRencana(KOTA_AWAL).filter((r) => ringkas(terapkanRencana(KOTA_AWAL, r)!).jumlahTarget === 3);

  it('kota awal belum memenuhi target', () => {
    const r = ringkas(KOTA_AWAL);
    expect(r.jumlahTarget).toBe(0);
    expect(r.indeks).toBeLessThan(30);
  });

  it('target bisa dicapai, tetapi hanya oleh sedikit rencana', () => {
    expect(lulus.length).toBeGreaterThan(0);
    expect(lulus.length).toBeLessThanOrEqual(3);
  });

  it('setiap rencana yang lulus menghapus emisi, merawat taman, dan menanam pohon', () => {
    for (const r of lulus) {
      expect(r['ganti-bus']).toBe(2);
      expect(r['ganti-mesin']).toBe(1);
      expect(r['rawat-taman']).toBe(2);
      expect(r['tanam-pohon']).toBeGreaterThanOrEqual(1);
    }
  });

  it('membangun taman baru alih-alih merawat taman rusak tidak lulus', () => {
    const k = terapkanRencana(KOTA_AWAL, { 'ganti-bus': 2, 'ganti-mesin': 1, 'taman-baru': 1 })!;
    expect(ringkas(k).jumlahTarget).toBeLessThan(3);
  });

  it('rencana di atas anggaran ditolak', () => {
    expect(terapkanRencana(KOTA_AWAL, { 'ganti-bus': 2, 'ganti-mesin': 1, 'rawat-taman': 2, 'tanam-pohon': 2 })).toBeNull();
  });
});

describe('Misi Kota Hijau - badai dan revisi', () => {
  const fase1 = terapkanRencana(KOTA_AWAL, { 'ganti-bus': 2, 'ganti-mesin': 1, 'rawat-taman': 2, 'tanam-pohon': 1 })!;
  const setelahBadai = terapkanBadai(fase1);

  it('badai membuat target tidak terpenuhi lagi', () => {
    expect(ringkas(setelahBadai).jumlahTarget).toBeLessThan(3);
    expect(setelahBadai.pohonRusak).toBe(2);
  });

  it('merawat pohon yang rusak memulihkan semua target', () => {
    const k = terapkanRencana(setelahBadai, { 'rawat-pohon': 2 })!;
    expect(ringkas(k).jumlahTarget).toBe(3);
  });

  it('hanya menanam pohon baru tanpa merawat yang rusak tidak lulus', () => {
    const k = terapkanRencana(setelahBadai, { 'tanam-pohon': 3 })!;
    expect(ringkas(k).targetRusak).toBe(false);
  });
});

describe('Misi Kota Hijau - salinan model di client', () => {
  it('sama persis dengan model server (kecuali catatan salinan)', async () => {
    const { readFileSync } = await import('node:fs');
    const bersihkan = (s: string): string =>
      s
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter((b) => !b.includes('SALINAN dari') && !b.includes('client/src/kotaHijau/model.ts') && !b.includes('server/src/kotaHijau/model.ts'))
        .join('\n');
    const server = readFileSync('src/kotaHijau/model.ts', 'utf-8');
    const client = readFileSync('../client/src/kotaHijau/model.ts', 'utf-8');
    expect(bersihkan(client)).toBe(bersihkan(server));
  });
});
