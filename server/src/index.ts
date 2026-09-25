/**
 * Titik masuk server.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { TASK_BANK, validateAgainstAssemblyRule } from './tasks/index.js';
import { findOptimum } from './domain/optimum.js';

/**
 * Pemeriksaan integritas bank soal saat start.
 *
 * Task dengan daerah penyelesaian kosong berarti soal yang mustahil dikerjakan
 * siswa. Kesalahan seperti ini harus ketahuan pada log deploy, BUKAN saat satu
 * kelas sudah duduk di depan layar.
 */
function validateTaskBank(): void {
  const problems: string[] = [];

  for (const task of TASK_BANK) {
    for (const issue of validateAgainstAssemblyRule(task)) {
      problems.push(`${task.id}: ${issue}`);
    }
    const optimum = findOptimum(task);
    if (optimum.empty) {
      problems.push(`${task.id}: daerah penyelesaian KOSONG - task tidak dapat diselesaikan siswa`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Bank skenario tidak valid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  console.log(`[bank] ${TASK_BANK.length} task tervalidasi (assembly rule + daerah penyelesaian).`);
}

async function main(): Promise<void> {
  validateTaskBank();

  await prisma.$connect();
  console.log('[db] Terhubung ke database.');

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] Berjalan di http://localhost:${config.port} (${config.nodeEnv})`);
    console.log(`[cors]   Origin diizinkan: ${config.corsOrigins.join(', ') || '(tidak ada)'}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[server] ${signal} diterima, menutup koneksi...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error('[server] Gagal start:', err);
  process.exit(1);
});
