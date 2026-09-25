/**
 * Menukar datasource provider pada prisma/schema.prisma antara sqlite dan
 * postgresql. Dipakai lewat `npm run db:use-postgres` / `npm run db:use-sqlite`.
 *
 * Skema sengaja ditulis pada subset yang didukung kedua provider, sehingga
 * penukaran ini tidak menuntut perubahan model apa pun.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const target = process.argv[2];
if (target !== 'sqlite' && target !== 'postgresql') {
  console.error('Pakai: node scripts/switch-provider.mjs <sqlite|postgresql>');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'prisma', 'schema.prisma');
const original = readFileSync(schemaPath, 'utf8');
const updated = original.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`);

if (original === updated) {
  console.log(`Provider sudah "${target}", tidak ada perubahan.`);
  process.exit(0);
}

writeFileSync(schemaPath, updated, 'utf8');
console.log(`Provider diubah menjadi "${target}".`);
console.log('Langkah berikutnya:');
console.log('  1. Sesuaikan DATABASE_URL pada .env');
console.log('  2. Jalankan: npx prisma migrate dev   (lokal) atau  npx prisma migrate deploy  (produksi)');
