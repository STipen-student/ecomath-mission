/**
 * Uji model ekonomi versi theotown-ui. Fungsi murni: uji tanpa database.
 */
import { describe, expect, it } from 'vitest';
import { bisaMembangun, danaSehari, hitungKeadaan, type Bangunan } from '../src/economy/ekonomi.js';

const tanpaTetangga = (): number[] => [];

describe('model ekonomi kota', () => {
  it('kota kosong: tidak ada warga, pajak, atau perawatan', () => {
    const k = hitungKeadaan(Array(64).fill(null), tanpaTetangga);
    expect(k.warga).toBe(0);
    expect(k.pajak).toBe(0);
    expect(k.perawatan).toBe(0);
  });

  it('rumah tanpa pekerjaan: warga ada tetapi semuanya menganggur', () => {
    const p: Array<Bangunan | null> = Array(4).fill(null);
    p[0] = 'rumah';
    const k = hitungKeadaan(p, tanpaTetangga);
    expect(k.warga).toBeGreaterThan(0);
    expect(k.pekerja).toBe(0);
    expect(k.pengangguran).toBe(k.warga);
    expect(k.pajak).toBe(0);
  });

  it('pabrik memberi pekerjaan dan pajak bagi warga yang bekerja', () => {
    const p: Array<Bangunan | null> = Array(4).fill(null);
    p[0] = 'rumah';
    p[1] = 'pabrik';
    const k = hitungKeadaan(p, (i) => (i === 0 ? [1] : i === 1 ? [0] : []));
    expect(k.pekerja).toBeGreaterThan(0);
    expect(k.pajak).toBeGreaterThan(0);
  });

  it('taman di sebelah rumah menaikkan kebahagiaan; pabrik menurunkannya', () => {
    const dasar: Array<Bangunan | null> = Array(4).fill(null);
    dasar[0] = 'rumah';
    const denganTaman = [...dasar];
    denganTaman[1] = 'taman';
    const denganPabrik = [...dasar];
    denganPabrik[1] = 'pabrik';
    const tetangga = (i: number) => (i === 0 ? [1] : i === 1 ? [0] : []);
    const bTaman = hitungKeadaan(denganTaman, tetangga).bahagia;
    const bPabrik = hitungKeadaan(denganPabrik, tetangga).bahagia;
    expect(bTaman).toBeGreaterThan(bPabrik);
  });

  it('dana berkurang saat membangun dan berubah harian sesuai pajak dikurangi perawatan', () => {
    expect(bisaMembangun(80, 'rumah')).toBe(true);
    expect(bisaMembangun(79, 'rumah')).toBe(false);
    const p: Array<Bangunan | null> = Array(4).fill(null);
    p[0] = 'rumah';
    p[1] = 'pabrik';
    const k = hitungKeadaan(p, (i) => (i === 0 ? [1] : i === 1 ? [0] : []));
    expect(danaSehari(100, k)).toBe(100 + k.pajak - k.perawatan);
  });

  it('hasil deterministik: input sama menghasilkan keadaan sama', () => {
    const p: Array<Bangunan | null> = ['rumah', 'toko', null, 'taman'];
    const t = (i: number) => (i === 0 ? [1] : i === 1 ? [0, 2] : i === 3 ? [2] : [1, 3]);
    expect(hitungKeadaan(p, t)).toEqual(hitungKeadaan(p, t));
  });
});
