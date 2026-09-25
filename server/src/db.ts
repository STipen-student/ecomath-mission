/**
 * Prisma Client tunggal untuk seluruh aplikasi.
 *
 * Di mode pengembangan instance disimpan pada globalThis supaya hot-reload tsx
 * tidak membuka koneksi database baru pada setiap perubahan berkas.
 */

import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!config.isProduction) globalForPrisma.prisma = prisma;
