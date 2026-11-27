/**
 * Pembungkus pemanggilan API backend.
 *
 * Seluruh permintaan melewati satu fungsi `request` agar penanganan error,
 * batas waktu, dan alamat basis terpusat di satu tempat.
 */

import type {
  DistractorResponse,
  LogEvent,
  SessionResponse,
  LoginResponse,
  SkorKlaim,
  SubmitResponse,
  TaskResponse,
} from './types.js';
import { INSTRUMENT_VERSION } from '../version.js';

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:4000';

/** Kesalahan dari API, membawa kode status agar pemanggil dapat membedakannya. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Batas waktu 15 detik. Tanpa batas waktu, koneksi sekolah yang menggantung
 * membuat antarmuka membeku tanpa pesan apa pun ke siswa.
 */
const TIMEOUT_MS = 15_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });

    if (!res.ok) {
      let pesan = `Permintaan gagal (${res.status})`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) pesan = body.error;
      } catch {
        // Respons bukan JSON - pakai pesan bawaan.
      }
      throw new ApiError(res.status, pesan);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Server tidak merespons. Periksa koneksi internetmu lalu coba lagi.');
    }
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  baseUrl: API_URL,

  /** Login NIS + kode kelas + PIN: membuat sesi baru atau melanjutkan sesi lama. */
  login(input: { studentName?: string; studentId: string; classCode: string; pin: string }): Promise<LoginResponse> {
    return request<LoginResponse>('/api/session/login', {
      method: 'POST',
      body: JSON.stringify({ ...input, instrumentVersion: INSTRUMENT_VERSION }),
    });
  },

  /** Kirim pengerjaan Misi Kota Hijau; server menilai KH1-KH4. */
  kirimKotaHijau(body: {
    sessionId: string;
    pemahaman: string[];
    langkah: Array<{ fase: 1 | 2; tipe: 'hitung' | 'jalankan'; rencana: Record<string, number> }>;
    refleksi: { pilihan: string; teks?: string };
    penilaianDiri: { KH1: number; KH2: number; KH3: number; KH4: number };
    integritas?: { jumlah: number; durasiMs: number };
  }): Promise<{ KH1: number; KH2: number; KH3: number; KH4: number; total: number; versi: string }> {
    return request('/api/kota-hijau/submit', { method: 'POST', body: JSON.stringify(body) });
  },

  /** Catat persetujuan siswa ikut penelitian (versi teks dan izin wali). */
  simpanPersetujuan(sessionId: string, body: { versi: string; setuju: true; izinWali: boolean }): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/session/${sessionId}/persetujuan`, { method: 'POST', body: JSON.stringify(body) });
  },

  /** Simpan progres permainan (koin, misi, bangunan) agar ikut ke perangkat lain. */
  simpanProgres(sessionId: string, progres: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/session/${sessionId}/progres`, {
      method: 'PUT',
      body: JSON.stringify({ progres }),
    });
  },

  createSession(input: { studentName: string; studentId?: string; classCode: string }): Promise<SessionResponse> {
    // Versi instrumen ikut dikirim agar setiap sesi dapat dipilah menurut
    // tampilan yang benar-benar dijalankan siswa (docs/SCORING_SPEC.md §7.22).
    return request<SessionResponse>('/api/session', {
      method: 'POST',
      body: JSON.stringify({ ...input, instrumentVersion: INSTRUMENT_VERSION }),
    });
  },

  /**
   * Ringkasan tutorial antarmuka - kovariat penelitian, bukan bukti klaim.
   * Tutorial tidak memancarkan event apa pun; hanya ringkasan ini yang dikirim.
   */
  recordTutorial(
    sessionId: string,
    hasil: { status: 'completed' | 'skipped'; durationMs: number; missteps: number; stepsCompleted: number },
  ): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/session/${sessionId}/tutorial`, {
      method: 'POST',
      body: JSON.stringify(hasil),
    });
  },

  getTask(level: number, sessionId: string, taskId?: string): Promise<TaskResponse> {
    const params = new URLSearchParams({ sessionId });
    if (taskId) params.set('taskId', taskId);
    return request<TaskResponse>(`/api/task/${level}?${params.toString()}`);
  },

  /** Pengiriman log memakai fetch biasa; kegagalan ditangani oleh EventLogger. */
  sendLogs(events: LogEvent[]): Promise<{ accepted: number }> {
    return request<{ accepted: number }>('/api/log', { method: 'POST', body: JSON.stringify(events) });
  },

  triggerDistractor(attemptId: string, body: { x: number; y: number; elapsedMs: number }): Promise<DistractorResponse> {
    return request<DistractorResponse>(`/api/task/${attemptId}/distractor`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  submit(input: {
    sessionId: string;
    taskId: string;
    finalX: number;
    finalY: number;
    reflectionClosedOptionId?: string;
    reflectionOpenText?: string;
    selfAssessment?: SkorKlaim;
    finishSession?: boolean;
  }): Promise<SubmitResponse> {
    return request<SubmitResponse>('/api/submit', { method: 'POST', body: JSON.stringify(input) });
  },
};
