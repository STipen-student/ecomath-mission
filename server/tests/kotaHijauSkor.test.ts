/** Uji rubrik KH1-KH4 Misi Kota Hijau. */
import { describe, expect, it } from 'vitest';
import { skorKotaHijau, type KirimanMisi } from '../src/kotaHijau/skor.js';

const OPTIMAL = { 'ganti-bus': 2, 'ganti-mesin': 1, 'rawat-taman': 2, 'tanam-pohon': 1 };

const ideal: KirimanMisi = {
  pemahaman: ['indeks', 'emisi', 'rusak', 'anggaran'],
  langkah: [
    { fase: 1, tipe: 'hitung', rencana: OPTIMAL },
    { fase: 1, tipe: 'jalankan', rencana: OPTIMAL },
    { fase: 2, tipe: 'hitung', rencana: { 'rawat-pohon': 2 } },
    { fase: 2, tipe: 'jalankan', rencana: { 'rawat-pohon': 2 } },
  ],
  refleksi: { pilihan: 'r3' },
};

describe('skorKotaHijau', () => {
  it('pengerjaan ideal mendapat 12', () => {
    const s = skorKotaHijau(ideal);
    expect([s.KH1, s.KH2, s.KH3, s.KH4]).toEqual([3, 3, 3, 3]);
    expect(s.total).toBe(12);
  });

  it('KH1 turun bila memilih pengecoh atau melewatkan syarat', () => {
    expect(skorKotaHijau({ ...ideal, pemahaman: ['indeks', 'emisi', 'rusak', 'anggaran', 'jual-bus'] }).KH1).toBe(2);
    expect(skorKotaHijau({ ...ideal, pemahaman: ['indeks', 'emisi'] }).KH1).toBe(1);
    expect(skorKotaHijau({ ...ideal, pemahaman: ['jual-bus', 'wajib-surya'] }).KH1).toBe(0);
  });

  it('KH2 = 2 bila rencana benar dijalankan tanpa menghitung perkiraan dulu', () => {
    const s = skorKotaHijau({ ...ideal, langkah: ideal.langkah.filter((l, i) => i !== 0) });
    expect(s.KH2).toBe(2);
  });

  it('KH2 = 0 bila rencana pertama melebihi anggaran', () => {
    const s = skorKotaHijau({
      ...ideal,
      langkah: [{ fase: 1, tipe: 'jalankan', rencana: { 'ganti-bus': 2, 'ganti-mesin': 1, 'surya-baru': 2 } }, ...ideal.langkah.slice(1)],
    });
    expect(s.KH2).toBe(0);
    expect(s.rincian.ditolak).toBe(1);
  });

  it('KH3 mengikuti banyak target yang tercapai di akhir fase 1', () => {
    const tanpaRawat = { 'ganti-bus': 2, 'ganti-mesin': 1, 'tanam-pohon': 3 };
    const s = skorKotaHijau({ ...ideal, langkah: [{ fase: 1, tipe: 'jalankan', rencana: tanpaRawat }] });
    expect(s.KH3).toBeLessThan(3);
    expect(s.rincian.akhirFase1.targetRusak).toBe(false);
  });

  it('KH4 rendah bila tidak merevisi setelah badai dan refleksinya lemah', () => {
    const s = skorKotaHijau({ ...ideal, langkah: ideal.langkah.slice(0, 2), refleksi: { pilihan: 'r0' } });
    expect(s.KH4).toBe(0);
    expect(s.rincian.setelahBadai.jumlahTarget).toBeLessThan(3);
  });

  it('skor dihitung ulang dari tindakan, bukan dari klaim client', () => {
    const s = skorKotaHijau({ ...ideal, langkah: [{ fase: 1, tipe: 'jalankan', rencana: { 'ganti-bus': 99 } }] });
    expect(s.rincian.rencanaPertama).toBe('ditolak');
    expect(s.KH3).toBe(0);
  });
});
