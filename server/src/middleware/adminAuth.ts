/**
 * Proteksi endpoint admin dengan API key tunggal.
 *
 * Sesuai permintaan, ini BUKAN sistem autentikasi penuh - hanya kunci untuk
 * guru/peneliti. Perbandingan memakai timingSafeEqual agar kunci tidak dapat
 * ditebak karakter demi karakter lewat pengukuran waktu respons.
 */

import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Panjang berbeda tetap dibandingkan terhadap dirinya sendiri supaya waktu
  // eksekusi tidak membocorkan panjang kunci yang benar.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('x-admin-key');
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = header ?? bearer ?? '';

  if (!provided || !safeEqual(provided, config.adminApiKey)) {
    res.status(401).json({ error: 'Akses admin ditolak: API key tidak valid' });
    return;
  }
  next();
}
