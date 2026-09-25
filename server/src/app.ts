/**
 * Perakitan aplikasi Express.
 *
 * Dipisahkan dari index.ts supaya uji integrasi (server/tests) dapat memuat
 * aplikasi tanpa membuka port jaringan.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { sessionRouter } from './routes/session.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { distractorRouter } from './routes/distractor.routes.js';
import { logRouter } from './routes/log.routes.js';
import { submitRouter } from './routes/submit.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { teacherRouter } from './routes/teacher.routes.js';
import { errorHandler, HttpError, notFoundHandler } from './middleware/errorHandler.js';
import { SCORING_VERSION } from './scoring/thresholds.js';

export function createApp() {
  const app = express();

  // Di belakang proxy Railway/Vercel, alamat IP asli ada pada X-Forwarded-For.
  // Angka 1 berarti hanya mempercayai satu lapis proxy - mempercayai seluruh
  // lapis (true) memungkinkan header itu dipalsukan untuk memutari rate limit.
  app.set('trust proxy', 1);

  app.use(helmet());

  app.use(
    cors({
      /**
       * Daftar putih eksplisit. Permintaan tanpa Origin (curl, health check
       * Railway, uji integrasi) diizinkan karena bukan permintaan lintas asal
       * dari peramban - kebijakan CORS memang tidak berlaku padanya.
       */
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        // Dilempar sebagai HttpError 403, bukan Error biasa: origin asing yang
        // memindai endpoint adalah kejadian rutin, dan bila diperlakukan sebagai
        // error tak tertangani ia akan membanjiri log produksi dengan stack
        // trace sehingga masalah yang sesungguhnya jadi sulit ditemukan.
        return callback(new HttpError(403, `Origin ${origin} tidak diizinkan oleh kebijakan CORS`));
      },
      credentials: false,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-admin-key', 'Authorization'],
    }),
  );

  // Batas ukuran body: satu kiriman log batch terbesar (200 event) jauh di bawah
  // 512 kb, sehingga batas ini menahan payload berlebih tanpa mengganggu operasi.
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', scoringVersion: SCORING_VERSION, env: config.nodeEnv });
  });

  app.use('/api/session', sessionRouter);
  app.use('/api/task', taskRouter);
  app.use('/api/task', distractorRouter);
  app.use('/api/log', logRouter);
  app.use('/api/submit', submitRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin', teacherRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
