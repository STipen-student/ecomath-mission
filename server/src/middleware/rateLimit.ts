/**
 * Pembatasan laju permintaan.
 *
 * KEPUTUSAN PENTING - kunci pembatas adalah sessionId, BUKAN alamat IP.
 * Satu kelas mengakses sistem dari satu jaringan sekolah, sehingga seluruh siswa
 * tampak berasal dari alamat IP yang sama (NAT). Pembatasan per-IP akan
 * memblokir seluruh kelas begitu beberapa siswa submit hampir bersamaan -
 * kegagalan yang persis terjadi pada kondisi pengambilan data sesungguhnya.
 * Alamat IP hanya dipakai sebagai cadangan bila sessionId tidak ada.
 */

import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { config } from '../config.js';

/**
 * Normalisasi alamat IP untuk dipakai sebagai kunci cadangan.
 *
 * Alamat IPv6 dipangkas ke blok /64 (empat kelompok pertama), karena satu
 * perangkat umumnya memegang banyak alamat di dalam blok yang sama dan dapat
 * berpindah-pindah di antaranya - tanpa pemangkasan, pembatas laju dapat
 * dilewati hanya dengan berganti alamat.
 */
function normalizeIp(ip: string): string {
  if (!ip) return 'unknown';
  const bare = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (!bare.includes(':')) return bare;
  return bare.split(':').slice(0, 4).join(':');
}

function sessionKey(req: Request): string {
  const body = req.body as { sessionId?: unknown } | undefined;
  const fromBody = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
  const fromQuery = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const sessionId = fromBody ?? fromQuery;
  if (sessionId) return `session:${sessionId}`;
  return `ip:${normalizeIp(req.ip ?? '')}`;
}

const base: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  // Pembatasan dinonaktifkan pada test agar uji integrasi tidak terhambat.
  skip: () => config.isTest,
};

/**
 * Pembatas dibuat MALAS, saat permintaan pertama masuk. express-rate-limit
 * memasang setInterval saat dibuat, dan Cloudflare Workers melarang timer di
 * lingkup global (saat modul dimuat). Di Node.js perilakunya tetap sama.
 */
function malas(buat: () => RequestHandler): RequestHandler {
  let pembatas: RequestHandler | null = null;
  return (req, res, next) => {
    pembatas ??= buat();
    return pembatas(req, res, next);
  };
}

/**
 * Pembatas percobaan login, dihitung per NIS + kode kelas (bukan per IP):
 * satu sekolah sering keluar lewat satu alamat IP, sehingga batas per IP akan
 * menghalangi satu kelas yang login bersamaan. Dengan kunci NIS + kelas,
 * menebak PIN satu siswa dibatasi tanpa mengganggu siswa lain.
 */
export const loginLimiter = malas(() =>
  rateLimit({
    ...base,
    windowMs: 10 * 60 * 1000,
    limit: 8,
    keyGenerator: (req) => {
      const b = (req.body ?? {}) as { studentId?: unknown; classCode?: unknown };
      return `login:${String(b.studentId ?? '').trim()}|${String(b.classCode ?? '').trim().toUpperCase()}`;
    },
    message: { error: 'Terlalu banyak percobaan login. Tunggu 10 menit, atau minta guru mereset PIN-mu.' },
  }),
);

export const submitLimiter = malas(() =>
  rateLimit({
    ...base,
    windowMs: config.rateLimit.submitWindowMs,
    limit: config.rateLimit.submitMax,
    message: { error: 'Terlalu banyak percobaan submit. Tunggu sebentar lalu coba lagi.' },
  }),
);

/**
 * Batas untuk endpoint log jauh lebih longgar: satu siswa dapat menghasilkan
 * ratusan event (setiap geseran slider) dalam beberapa menit, dan event yang
 * tertolak berarti bukti penelitian yang hilang.
 */
export const logLimiter = malas(() =>
  rateLimit({
    ...base,
    windowMs: config.rateLimit.logWindowMs,
    limit: config.rateLimit.logMax,
    message: { error: 'Terlalu banyak event log dalam waktu singkat.' },
  }),
);
