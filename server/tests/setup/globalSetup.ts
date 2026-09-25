/**
 * Menyiapkan database uji sebelum seluruh test dijalankan.
 *
 * `prisma db push` menerapkan skema ke berkas test.db tanpa membuat berkas
 * migrasi baru - berkas migrasi hanya dibuat dari database pengembangan.
 */

import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

export default function setup(): void {
  const testDb = join(process.cwd(), 'prisma', 'test.db');

  // Mulai dari database bersih agar hasil uji tidak bergantung pada sisa data
  // dari eksekusi sebelumnya.
  for (const suffix of ['', '-journal']) {
    try {
      rmSync(`${testDb}${suffix}`, { force: true });
    } catch {
      // Berkas mungkin belum ada - bukan kondisi error.
    }
  }

  // CLI Prisma dipanggil langsung lewat Node, bukan lewat npx. Sejak Node 20,
  // menjalankan berkas .cmd tanpa shell ditolak dengan EINVAL, sedangkan
  // memakai shell memicu peringatan keamanan - memanggil berkas JS-nya
  // langsung menghindari keduanya sekaligus berjalan sama di Windows dan Linux.
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
