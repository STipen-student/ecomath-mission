/**
 * Hash PIN siswa (4-6 angka) dengan PBKDF2-SHA256 bergaram.
 *
 * Jumlah iterasi sengaja sedang: Cloudflare Workers paket gratis membatasi
 * waktu CPU per permintaan, dan PIN berdigit pendek memang tidak tahan serangan
 * luring. Perlindungan utamanya adalah pembatas percobaan login per NIS/kelas
 * (middleware/rateLimit.ts) dan PIN yang tidak pernah disimpan sebagai teks.
 */

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERASI = 20000;
const PANJANG = 32;

/** Penanda bahwa guru mereset PIN; PIN baru ditetapkan saat login berikutnya. */
export const PIN_DIRESET = 'RESET';

export function hashPin(pin: string): string {
  const garam = randomBytes(16);
  const hasil = pbkdf2Sync(pin, garam, ITERASI, PANJANG, 'sha256');
  return `pbkdf2$${ITERASI}$${garam.toString('hex')}$${hasil.toString('hex')}`;
}

export function cocokPin(pin: string, tersimpan: string): boolean {
  const [jenis, iterasi, garamHex, hashHex] = tersimpan.split('$');
  if (jenis !== 'pbkdf2' || !iterasi || !garamHex || !hashHex) return false;
  const harapan = Buffer.from(hashHex, 'hex');
  const hasil = pbkdf2Sync(pin, Buffer.from(garamHex, 'hex'), Number(iterasi), harapan.length, 'sha256');
  return hasil.length === harapan.length && timingSafeEqual(hasil, harapan);
}
