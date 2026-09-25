/**
 * Penanganan error terpusat.
 *
 * Di production, detail internal TIDAK dikirim ke client - hanya pesan ringkas
 * dan kode status. Detail lengkap tetap tercatat di log server agar dapat
 * ditelusuri lewat dashboard Railway.
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config.js';

/** Error dengan kode status HTTP yang disengaja. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Data yang dikirim tidak valid',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details && !config.isProduction ? { details: err.details } : {}),
    });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: 'Terjadi kesalahan pada server',
    ...(config.isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}

/** Pembungkus handler async agar error-nya sampai ke errorHandler. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}
