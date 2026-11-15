/**
 * Titik masuk Cloudflare Workers.
 *
 * Aplikasi Express yang sama dengan versi Node (src/app.ts) dijalankan lewat
 * httpServerHandler dari 'cloudflare:node'. Bedanya hanya di database: Prisma
 * memakai adapter D1 dari binding `DB`, bukan DATABASE_URL.
 *
 * Konfigurasi (ADMIN_API_KEY, CORS_ORIGIN, dst.) dibaca dari process.env, yang
 * di Workers diisi dari `vars` dan secret wrangler (nodejs_compat).
 */

import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import type { D1Database } from '@cloudflare/workers-types';
import { aturPembuatPrisma } from './db.js';
import { createApp } from './app.js';

aturPembuatPrisma(() => new PrismaClient({ adapter: new PrismaD1((env as unknown as { DB: D1Database }).DB) }));

// Aplikasi dibuat saat modul dimuat, sesuai pola resmi httpServerHandler.
// Ini aman karena pembatas laju dibuat malas (middleware/rateLimit.ts) dan
// klien Prisma baru dibuat saat permintaan pertama (db.ts): tidak ada timer
// atau I/O di lingkup global, yang dilarang Workers.
const app = createApp();
// Port di sini hanya kunci perutean di dalam Workers, bukan port jaringan.
app.listen(3000);

export default httpServerHandler({ port: 3000 });
