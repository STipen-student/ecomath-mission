/** Uji skoring K1–K4 draf 2 (theotown-ui). Fungsi murni, tanpa database. */
import { describe, expect, it } from 'vitest';
import { skorKota, skorK1, skorK2, skorK3, skorK4, type AksiKota } from '../src/economy/skoringKota.js';

const akhirBagus = { warga: 130, bahagia: 70, bangkrut: false, hariSelesai: 40 };

describe('skoring K1–K4 draf 2', () => {
  it('tanpa aksi, semua skor 0', () => {
    const s = skorKota([], { warga: 0, bahagia: 0, bangkrut: false, hariSelesai: 40 });
    expect([s.K1, s.K2, s.K3, s.K4]).toEqual([0, 0, 0, 0]);
  });

  it('K1 turun bila ada penempatan yang melanggar aturan kota', () => {
    const bersih: AksiKota[] = [{ tipe: 'tempatkan', jenis: 'rumah', petak: 1, hari: 1, melanggar: false }];
    const kotor: AksiKota[] = [{ tipe: 'tempatkan', jenis: 'pabrik', petak: 2, hari: 1, melanggar: true }];
    expect(skorK1(bersih)).toBe(3);
    expect(skorK1(kotor)).toBe(2);
  });

  it('K2 menghargai jenis yang sudah dipilih sebelum ditaruh', () => {
    const berencana: AksiKota[] = [
      { tipe: 'pilih', jenis: 'rumah', hari: 1 },
      { tipe: 'tempatkan', jenis: 'rumah', petak: 1, hari: 1, melanggar: false },
    ];
    const langsung: AksiKota[] = [{ tipe: 'tempatkan', jenis: 'rumah', petak: 1, hari: 1, melanggar: false }];
    expect(skorK2(berencana)).toBe(3);
    expect(skorK2(langsung)).toBe(1);
  });

  it('K3 mengukur tujuan tercapai dan bongkar-pasang yang sedikit', () => {
    expect(skorK3([], akhirBagus, 120, 60)).toBe(3);
    expect(skorK3([], { ...akhirBagus, bangkrut: true }, 120, 60)).toBe(0);
    expect(skorK3([], { warga: 50, bahagia: 40, bangkrut: false, hariSelesai: 40 }, 120, 60)).toBe(1);
    const banyakBongkar: AksiKota[] = Array.from({ length: 4 }, (_, i) => ({ tipe: 'bongkar' as const, jenis: 'toko' as const, petak: i, hari: 1, bahagiaSebelum: 50, bahagiaSesudah: 50 }));
    expect(skorK3(banyakBongkar, akhirBagus, 120, 60)).toBe(2);
  });

  it('K4 membutuhkan revisi yang benar-benar memperbaiki kota', () => {
    expect(skorK4([])).toBe(0);
    const sekaliSia: AksiKota[] = [{ tipe: 'bongkar', jenis: 'pabrik', petak: 1, hari: 3, bahagiaSebelum: 40, bahagiaSesudah: 38 }];
    expect(skorK4(sekaliSia)).toBe(1);
    const dua: AksiKota[] = [
      { tipe: 'bongkar', jenis: 'pabrik', petak: 1, hari: 3, bahagiaSebelum: 40, bahagiaSesudah: 45 },
      { tipe: 'bongkar', jenis: 'pabrik', petak: 2, hari: 5, bahagiaSebelum: 45, bahagiaSesudah: 50 },
    ];
    expect(skorK4(dua)).toBe(3);
  });

  it('versi skoring tercatat pada setiap hasil', () => {
    expect(skorKota([], akhirBagus).versi).toMatch(/^2\./);
  });
});
