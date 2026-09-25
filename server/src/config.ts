/**
 * Konfigurasi aplikasi dari environment variable.
 *
 * Seluruh nilai divalidasi saat proses start, bukan saat dipakai, sehingga
 * kesalahan konfigurasi (mis. ADMIN_API_KEY lupa diisi di Railway) langsung
 * ketahuan pada log deploy - bukan baru muncul saat siswa sedang mengerjakan.
 */

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),

  /**
   * Kunci akses endpoint admin. Wajib minimal 16 karakter agar tidak mudah
   * ditebak; sesuai permintaan, ini bukan sistem login penuh - hanya kunci
   * tunggal untuk guru/peneliti yang mengunduh rekap.
   */
  ADMIN_API_KEY: z.string().min(16, 'ADMIN_API_KEY minimal 16 karakter'),

  /**
   * Daftar origin yang diizinkan, dipisah koma.
   * Di production WAJIB diisi - lihat pemeriksaan tambahan di bawah.
   */
  CORS_ORIGIN: z.string().optional(),

  /**
   * Saklar Activity Selection adaptif (docs/SCORING_SPEC.md §7.16).
   *
   * true  - varian dalam satu level dipilih menyesuaikan pita kemampuan siswa.
   * false - varian dipilih acak berstrata (fixed-form): seluruh siswa
   *         menghadapi sebaran soal yang sama secara peluang, sehingga skor
   *         mentah sebanding tanpa perlu kalibrasi IRT.
   *
   * MATIKAN saat pengambilan data skripsi selama butir belum dikalibrasi.
   * Nilai ini hanya menetapkan keadaan AWAL; guru dapat menyalakan/mematikan
   * saat berjalan lewat portal guru untuk keperluan demonstrasi.
   */
  ADAPTIVE_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  /** Batas laju endpoint submit, per sesi, per jendela waktu. */
  RATE_LIMIT_SUBMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_SUBMIT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_LOG_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_LOG_MAX: z.coerce.number().int().positive().default(600),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Konfigurasi environment tidak valid:\n${details}\n\nSalin .env.example menjadi .env lalu lengkapi nilainya.`);
}

const env = parsed.data;

const corsOrigins = (env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (env.NODE_ENV === 'production') {
  if (corsOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGIN wajib diisi di production. Isi dengan URL front-end Vercel, mis. https://ecomath-mission.vercel.app',
    );
  }
  if (corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN tidak boleh "*" di production - sebutkan origin secara eksplisit.');
  }
}

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  adminApiKey: env.ADMIN_API_KEY,
  /** Keadaan AWAL saklar adaptif; keadaan berjalan ada di tasks/adaptiveState.ts. */
  adaptiveModeDefault: env.ADAPTIVE_MODE,
  /** Di development, origin Vite lokal selalu diizinkan agar tidak menghambat pengembangan. */
  corsOrigins:
    env.NODE_ENV === 'production'
      ? corsOrigins
      : [...new Set([...corsOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])],
  rateLimit: {
    submitWindowMs: env.RATE_LIMIT_SUBMIT_WINDOW_MS,
    submitMax: env.RATE_LIMIT_SUBMIT_MAX,
    logWindowMs: env.RATE_LIMIT_LOG_WINDOW_MS,
    logMax: env.RATE_LIMIT_LOG_MAX,
  },
} as const;
