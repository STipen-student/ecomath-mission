/**
 * Keadaan berjalan saklar adaptif.
 *
 * Disimpan di memori proses, disemai dari `ADAPTIVE_MODE` saat start. Guru dapat
 * mengubahnya saat berjalan lewat portal guru — berguna untuk demonstrasi tanpa
 * perlu men-deploy ulang.
 *
 * KONSEKUENSI YANG DISENGAJA: perubahan saat berjalan TIDAK bertahan melewati
 * restart server; setelah restart, nilainya kembali ke `ADAPTIVE_MODE`. Itulah
 * alasan variabel environment tetap menjadi setelan yang mengikat untuk
 * pengambilan data — seseorang yang menyalakan mode adaptif saat demonstrasi
 * tidak dapat tanpa sengaja meninggalkannya menyala pada sesi pengambilan data
 * berikutnya setelah server berputar ulang.
 *
 * Setiap percobaan task menyimpan mode yang berlaku saat itu pada event
 * `adaptive_selection`, sehingga analisis selalu dapat memisahkan data
 * fixed-form dari data adaptif walau saklarnya pernah berubah di tengah jalan.
 */

import { config } from '../config.js';

let adaptiveAktif: boolean = config.adaptiveModeDefault;

export function isAdaptiveEnabled(): boolean {
  return adaptiveAktif;
}

export function setAdaptiveEnabled(nilai: boolean): boolean {
  adaptiveAktif = nilai;
  return adaptiveAktif;
}

/** Kembalikan ke nilai environment; dipakai pembersihan antar-uji. */
export function resetAdaptiveEnabled(): void {
  adaptiveAktif = config.adaptiveModeDefault;
}
