/**
 * Prisma Client tunggal untuk seluruh aplikasi.
 *
 * Klien dibuat MALAS (saat pertama dipakai) lewat sebuah pembuat yang dapat
 * diganti. Di Node.js pembuat bawaan memakai DATABASE_URL. Di Cloudflare
 * Workers, src/worker.ts mengganti pembuat dengan klien beradapter D1, karena
 * koneksi ke D1 hanya tersedia lewat binding, bukan URL.
 *
 * Di mode pengembangan instance disimpan pada globalThis supaya hot-reload tsx
 * tidak membuka koneksi database baru pada setiap perubahan berkas.
 */

import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let pembuat: () => PrismaClient = () =>
  new PrismaClient({ log: ['error', 'warn'] });

/** Ganti cara membuat klien (dipakai entri Cloudflare Workers). */
export function aturPembuatPrisma(baru: () => PrismaClient): void {
  pembuat = baru;
  globalForPrisma.prisma = undefined;
}

function klien(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = pembuat();
  }
  return globalForPrisma.prisma;
}

/**
 * Proksi ke klien sebenarnya, sehingga seluruh kode tetap menulis
 * `prisma.session.findMany(...)` tanpa tahu klien dibuat kapan dan di mana.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const nilai = (klien() as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof nilai === 'function' ? (nilai as (...a: unknown[]) => unknown).bind(klien()) : nilai;
  },
});

// Hindari peringatan "config tidak dipakai" pada build yang memangkas impor.
void config;
