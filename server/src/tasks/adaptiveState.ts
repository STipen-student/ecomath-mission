/**
 * Saklar mode adaptif (Activity Selection).
 *
 * Disimpan di DATABASE (tabel Pengaturan), bukan di memori. Di Cloudflare
 * Workers server berjalan sebagai banyak salinan yang dibuat ulang setiap
 * beberapa menit; saklar di memori hanya mengubah satu salinan dan cepat
 * kembali ke bawaan, sehingga siswa dalam satu kelas bisa mendapat mode yang
 * berbeda. Dengan database, semua salinan membaca keadaan yang sama.
 *
 * Bila belum pernah diatur, nilai bawaan diambil dari ADAPTIVE_MODE.
 */

import { config } from '../config.js';
import { prisma } from '../db.js';

const KUNCI = 'adaptiveMode';

export async function isAdaptiveEnabled(): Promise<boolean> {
  const baris = await prisma.pengaturan.findUnique({ where: { kunci: KUNCI } });
  return baris ? baris.nilai === 'true' : config.adaptiveModeDefault;
}

export async function setAdaptiveEnabled(nilai: boolean): Promise<boolean> {
  await prisma.pengaturan.upsert({
    where: { kunci: KUNCI },
    create: { kunci: KUNCI, nilai: String(nilai) },
    update: { nilai: String(nilai), diubahPada: new Date() },
  });
  return nilai;
}

/** Hapus pengaturan tersimpan sehingga kembali ke ADAPTIVE_MODE (dipakai uji). */
export async function resetAdaptiveEnabled(): Promise<void> {
  await prisma.pengaturan.deleteMany({ where: { kunci: KUNCI } });
}
