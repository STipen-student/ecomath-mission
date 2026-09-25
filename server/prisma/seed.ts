/**
 * Seed database.
 *
 * Bank skenario TIDAK disalin ke tabel database. Alasannya disengaja: definisi
 * task adalah bagian dari INSTRUMEN penelitian, dan menyimpannya di dua tempat
 * (kode + database) membuka peluang keduanya tidak sinkron - siswa mengerjakan
 * soal versi database sementara mesin skoring memakai kunci versi kode. Bank
 * soal karena itu hanya hidup di server/src/tasks/ sebagai sumber tunggal, dan
 * seed ini bertugas MEMVERIFIKASI integritasnya lalu menyiapkan data contoh.
 *
 * Jalankan dengan: npm run db:seed
 * Sertakan data contoh: npm run db:seed -- --with-demo
 */

import { PrismaClient } from '@prisma/client';
import { TASK_BANK, validateAgainstAssemblyRule, substantiveConstraintCount } from '../src/tasks/index.js';
import { findOptimum } from '../src/domain/optimum.js';

const prisma = new PrismaClient();

function verifyBank(): void {
  console.log('Memverifikasi bank skenario...\n');
  let problems = 0;

  for (const task of TASK_BANK) {
    const issues = validateAgainstAssemblyRule(task);
    const optimum = findOptimum(task);
    if (optimum.empty) issues.push('daerah penyelesaian KOSONG');

    const optimumText = optimum.point
      ? `optimum (${optimum.point.x}, ${optimum.point.y}) Z=${optimum.z}`
      : 'tanpa fungsi tujuan';
    const status = issues.length === 0 ? 'OK  ' : 'GAGAL';

    console.log(
      `  [${status}] ${task.id.padEnd(16)} L${task.level}  ${String(substantiveConstraintCount(task))} kendala  ${optimumText}`,
    );
    for (const issue of issues) {
      console.log(`           -> ${issue}`);
      problems++;
    }
  }

  console.log(`\n${TASK_BANK.length} task diperiksa, ${problems} masalah ditemukan.`);
  if (problems > 0) {
    throw new Error('Bank skenario tidak lolos verifikasi. Perbaiki dulu sebelum pengambilan data.');
  }
}

async function seedDemo(): Promise<void> {
  console.log('\nMenyiapkan data contoh (kelas DEMO)...');

  await prisma.session.deleteMany({ where: { classCode: 'DEMO' } });

  const session = await prisma.session.create({
    data: {
      studentName: 'Siswa Contoh',
      studentId: 'DEMO-001',
      classCode: 'DEMO',
    },
  });

  console.log(`  Sesi contoh dibuat: ${session.id}`);
  console.log('  Kerjakan lewat client, atau panggil API secara manual untuk mengisi log.');
}

async function main(): Promise<void> {
  verifyBank();

  if (process.argv.includes('--with-demo')) {
    await seedDemo();
  } else {
    console.log('\nLewati data contoh. Tambahkan flag --with-demo bila diperlukan.');
  }

  const sessions = await prisma.session.count();
  const attempts = await prisma.taskAttempt.count();
  const events = await prisma.eventLog.count();
  const scores = await prisma.score.count();
  console.log(`\nIsi database saat ini: ${sessions} sesi, ${attempts} percobaan, ${events} event, ${scores} skor.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
