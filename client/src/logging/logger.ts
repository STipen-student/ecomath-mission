/**
 * Pencatat event siswa.
 *
 * Kehilangan log berarti kehilangan bukti penelitian, sehingga pencatat ini
 * dirancang bertahan terhadap kondisi jaringan sekolah yang tidak stabil:
 *
 *   1. Event diantre di memori, dikirim berkelompok tiap 2 detik - bukan satu
 *      permintaan HTTP per geseran slider.
 *   2. Antrean yang gagal terkirim disimpan ke localStorage, lalu dicoba lagi
 *      pada flush berikutnya dan saat aplikasi dibuka kembali.
 *   3. Saat halaman ditutup, sisa antrean dikirim dengan sendBeacon yang tetap
 *      berjalan setelah tab ditutup.
 *
 * `timestamp_ms` dihitung sejak task dimulai (bukan jam dinding perangkat),
 * sesuai definisi pada Bagian 5.1 dokumen ECD dan agar jam perangkat siswa yang
 * salah setel tidak merusak rekonstruksi timeline.
 */

import { api } from '../api/client.js';
import type { EventType, LogEvent } from '../api/types.js';

const BUFFER_KEY = 'ecomath_log_buffer_v1';
const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 200;

export class EventLogger {
  private queue: LogEvent[] = [];
  private taskStartedAt = 0;
  private lastEventAt = 0;
  private timer: number | null = null;
  private sessionId = '';
  private taskId = '';
  private flushing = false;

  /** Mulai mencatat untuk satu percobaan task; menyetel ulang jam relatif. */
  start(sessionId: string, taskId: string): void {
    this.sessionId = sessionId;
    this.taskId = taskId;
    this.taskStartedAt = performance.now();
    this.lastEventAt = this.taskStartedAt;
    this.restoreBuffer();
    this.startTimer();
  }

  /** Milidetik sejak task ini dimulai. */
  elapsedMs(): number {
    return Math.max(0, Math.round(performance.now() - this.taskStartedAt));
  }

  /**
   * Catat satu event.
   *
   * @param isValidAtTime apakah konfigurasi siswa memenuhi seluruh kendala saat
   *                      event terjadi - field wajib pada skema log ECD
   */
  record(eventType: EventType, payload: Record<string, unknown>, isValidAtTime: boolean): void {
    if (!this.sessionId || !this.taskId) return;

    const now = performance.now();
    const event: LogEvent = {
      session_id: this.sessionId,
      task_id: this.taskId,
      timestamp_ms: Math.max(0, Math.round(now - this.taskStartedAt)),
      event_type: eventType,
      payload,
      is_valid_at_time: isValidAtTime,
      duration_since_last_event_ms: Math.max(0, Math.round(now - this.lastEventAt)),
    };
    this.lastEventAt = now;

    this.queue.push(event);
    this.persistBuffer();

    // Event penanda babak dikirim segera; menundanya berisiko hilang bila siswa
    // menutup tab tepat setelah menekan tombol.
    if (eventType === 'attempt_submit' || eventType === 'reflection_response') {
      void this.flush();
    }
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  /** Kirim antrean ke server. Aman dipanggil berulang. */
  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;

    const batch = this.queue.slice(0, MAX_BATCH);
    try {
      await api.sendLogs(batch);
      this.queue = this.queue.slice(batch.length);
      this.persistBuffer();
    } catch {
      // Biarkan tetap di antrean; percobaan berikutnya akan mengirim ulang.
      // Tidak ada pesan error ke siswa - gangguan jaringan sesaat tidak boleh
      // mengganggu pengerjaan, dan log tetap aman di localStorage.
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Kirim sisa antrean saat halaman ditutup.
   * sendBeacon tetap berjalan setelah tab ditutup, tidak seperti fetch biasa.
   */
  flushOnUnload(): void {
    if (this.queue.length === 0) return;
    try {
      const blob = new Blob([JSON.stringify(this.queue)], { type: 'application/json' });
      navigator.sendBeacon(`${api.baseUrl}/api/log`, blob);
    } catch {
      // sendBeacon dapat ditolak peramban; antrean tetap tersimpan di
      // localStorage dan akan dikirim saat aplikasi dibuka kembali.
    }
  }

  private persistBuffer(): void {
    try {
      if (this.queue.length === 0) localStorage.removeItem(BUFFER_KEY);
      else localStorage.setItem(BUFFER_KEY, JSON.stringify(this.queue));
    } catch {
      // Kuota penyimpanan penuh atau mode privat - log tetap ada di memori.
    }
  }

  private restoreBuffer(): void {
    try {
      const raw = localStorage.getItem(BUFFER_KEY);
      if (!raw) return;
      const tersimpan = JSON.parse(raw) as LogEvent[];
      // Hanya pulihkan event milik sesi dan task yang sedang berjalan, supaya
      // sisa log siswa sebelumnya di perangkat bersama tidak ikut terkirim.
      const relevan = tersimpan.filter((e) => e.session_id === this.sessionId && e.task_id === this.taskId);
      if (relevan.length > 0) this.queue.unshift(...relevan);
    } catch {
      // Buffer rusak - buang saja daripada menggagalkan aplikasi.
      try {
        localStorage.removeItem(BUFFER_KEY);
      } catch {
        /* diabaikan */
      }
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const logger = new EventLogger();

// Dipasang sekali saat modul dimuat. 'pagehide' lebih andal daripada
// 'beforeunload' di Safari iOS, yang banyak dipakai siswa lewat HP.
window.addEventListener('pagehide', () => logger.flushOnUnload());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void logger.flush();
});
