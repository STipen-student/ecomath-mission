/**
 * Pemanggilan API admin dari halaman guru.
 *
 * KEAMANAN KUNCI ADMIN.
 * Kunci TIDAK PERNAH dibundel ke dalam berkas JavaScript. Variabel berawalan
 * VITE_ ikut terkompilasi ke berkas yang dapat dibaca siapa pun - termasuk
 * siswa - sehingga menaruh kunci di sana sama dengan menempelkannya di papan
 * pengumuman. Kunci diketik guru saat membuka halaman dan hanya disimpan di
 * sessionStorage: hilang begitu tab ditutup, dan tidak ikut berpindah ke tab lain.
 */

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:4000';

const KUNCI_SESI = 'ecomath_admin_key';

export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export function simpanKunci(kunci: string): void {
  try {
    sessionStorage.setItem(KUNCI_SESI, kunci);
  } catch {
    // Mode privat menolak penyimpanan - kunci tetap dipakai selama halaman hidup.
  }
}

export function ambilKunci(): string {
  try {
    return sessionStorage.getItem(KUNCI_SESI) ?? '';
  } catch {
    return '';
  }
}

export function lupakanKunci(): void {
  try {
    sessionStorage.removeItem(KUNCI_SESI);
  } catch {
    /* diabaikan */
  }
}

async function minta<T>(path: string, kunci: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'x-admin-key': kunci },
      signal: controller.signal,
    });

    if (!res.ok) {
      let pesan = `Permintaan gagal (${res.status})`;
      if (res.status === 401) pesan = 'Kunci admin salah atau sudah diganti.';
      else {
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) pesan = body.error;
        } catch {
          /* respons bukan JSON */
        }
      }
      throw new AdminError(res.status, pesan);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AdminError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AdminError(0, 'Server tidak merespons. Periksa apakah backend sedang berjalan.');
    }
    throw new AdminError(0, 'Tidak dapat terhubung ke server backend.');
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Bentuk data                                                         */
/* ------------------------------------------------------------------ */

export interface RingkasanKlaim {
  claim: 'K1' | 'K2' | 'K3' | 'K4';
  mean: number | null;
  distribusi: number[];
}

export interface RingkasanLevel {
  level: number;
  jumlahPercobaan: number;
  meanRawSum: number | null;
  K1: number | null;
  K2: number | null;
  K3: number | null;
  K4: number | null;
}

/** Keadaan saklar Activity Selection adaptif (docs/SCORING_SPEC.md §7.16). */
export interface StatusAdaptif {
  enabled: boolean;
  /** Nilai ADAPTIVE_MODE; keadaan kembali ke sini setiap server restart. */
  defaultFromEnv: boolean;
  thresholds: { bandRendahMax: number; bandTinggiMin: number };
  perLevel: Array<{
    level: number;
    varian: Array<{ taskId: string; bebanPermukaan: number }>;
    adaRuangAdaptif: boolean;
  }>;
}

export interface RingkasanTask {
  taskId: string;
  judul: string;
  level: number;
  jumlahPercobaan: number;
  meanRawSum: number | null;
  tingkatKemudahan: number | null;
}

export interface BarisLevelSiswa {
  level: number;
  taskId: string;
  scoreId: string;
  attemptId: string;
  K1: number;
  K2: number;
  K3: number;
  K4: number;
  K4auto: number;
  K4overridden: boolean;
  rawSum: number;
  weightedComposite: number;
}

export interface RingkasanSiswa {
  sessionId: string;
  studentName: string;
  studentId: string;
  classCode: string;
  startedAt: string;
  finishedAt: string | null;
  levelsCompleted: number;
  totalRaw: number;
  sessionComposite: number | null;
  perLevel: BarisLevelSiswa[];
}

export interface Ringkasan {
  scoringVersion: string;
  classCode: string | null;
  daftarKelas: string[];
  jumlahSiswa: number;
  jumlahSelesai: number;
  jumlahPercobaan: number;
  perluTinjauK4: number;
  perKlaim: RingkasanKlaim[];
  perLevel: RingkasanLevel[];
  perTask: RingkasanTask[];
  siswa: RingkasanSiswa[];
}

export interface JejakKlaim {
  claim: string;
  score: number;
  descriptor: string;
  reasons: string[];
  criterion: string;
  evidence: Record<string, unknown>;
}

/** Umpan balik satu klaim persis seperti yang dilihat siswa - lihat scoring/feedback.ts. */
export interface UmpanBalikKlaim {
  claim: string;
  title: string;
  score: number;
  summary: string;
  suggestion: string;
}

export interface RincianPercobaan {
  attemptId: string;
  sessionId: string;
  studentName: string;
  classCode: string;
  level: number;
  taskId: string;
  taskTitle: string;
  narrative: string;
  startedAt: string;
  finishedAt: string | null;
  durasiMenit: number | null;
  score: {
    scoreId: string;
    k1: number;
    k2: number;
    k3: number;
    k4: number;
    rawSum: number;
    weightedComposite: number;
    overridden: boolean;
    k4Auto: number;
    k4ReviewNote: string | null;
    scoringVersion: string;
    trace: { claims?: JejakKlaim[]; observablesRingkas?: Record<string, unknown> };
    /** Persis kalimat yang dilihat siswa saat submit - disimpan apa adanya, bukan dihitung ulang. */
    studentFeedback: { claims?: UmpanBalikKlaim[]; overallMessage?: string };
  } | null;
  refleksi: {
    closedOptionId: string | null;
    closedOptionText: string | null;
    closedOptionQuality: number | null;
    openText: string | null;
    openPrompt: string;
  };
  jumlahEvent: number;
  events: Array<{
    timestampMs: number;
    eventType: string;
    payload: Record<string, unknown>;
    isValidAtTime: boolean;
    durationSinceLastEventMs: number;
  }>;
}

/** Skor satu level di dalam laporan satu siswa. */
export interface BarisLaporanLevel {
  level: number;
  taskId: string;
  taskTitle: string;
  attemptId: string;
  scoreId: string;
  K1: number;
  K2: number;
  K3: number;
  K4: number;
  K4auto: number;
  K4overridden: boolean;
  rawSum: number;
  weightedComposite: number;
  /** Kalimat penutup level ini, persis seperti yang dilihat siswa saat submit. */
  overallMessage: string;
}

/** Rata-rata satu klaim lintas seluruh level yang dikerjakan siswa. */
export interface ProfilKlaim {
  claim: 'K1' | 'K2' | 'K3' | 'K4';
  title: string;
  mean: number;
  levelCount: number;
}

/** Laporan lengkap satu siswa - dipakai layar "Laporan Siswa" halaman guru. */
export interface LaporanSiswa {
  sessionId: string;
  studentName: string;
  studentId: string;
  classCode: string;
  startedAt: string;
  finishedAt: string | null;
  sessionComposite: number | null;
  /** Kovariat tutorial antarmuka; null bila sesi dibuat sebelum tutorial ada. */
  tutorial: {
    status: 'completed' | 'skipped';
    durationMs: number | null;
    missteps: number | null;
    stepsCompleted: number | null;
  } | null;
  levelsCompleted: number;
  totalRaw: number;
  perLevel: BarisLaporanLevel[];
  profilKlaim: ProfilKlaim[];
  kesimpulan: string;
}

/* ------------------------------------------------------------------ */

export const adminApi = {
  baseUrl: API_URL,

  ringkasan(kunci: string, classCode?: string): Promise<Ringkasan> {
    const q = classCode ? `?classCode=${encodeURIComponent(classCode)}` : '';
    return minta<Ringkasan>(`/api/admin/summary${q}`, kunci);
  },

  laporanSiswa(kunci: string, sessionId: string): Promise<LaporanSiswa> {
    return minta<LaporanSiswa>(`/api/admin/student/${encodeURIComponent(sessionId)}`, kunci);
  },

  percobaan(kunci: string, attemptId: string): Promise<RincianPercobaan> {
    return minta<RincianPercobaan>(`/api/admin/attempt/${encodeURIComponent(attemptId)}`, kunci);
  },

  async koreksiK4(
    kunci: string,
    scoreId: string,
    nilai: number | null,
    catatan: string,
  ): Promise<{ k4: number; rawSum: number; weightedComposite: number; overridden: boolean }> {
    const res = await fetch(`${API_URL}/api/admin/k4-override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': kunci },
      body: JSON.stringify({ scoreId, k4ManualOverride: nilai, note: catatan || undefined }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new AdminError(res.status, body.error ?? `Gagal menyimpan koreksi (${res.status})`);
    }
    return (await res.json()) as { k4: number; rawSum: number; weightedComposite: number; overridden: boolean };
  },

  /** Keadaan saklar Activity Selection adaptif. */
  async statusAdaptif(kunci: string): Promise<StatusAdaptif> {
    return minta<StatusAdaptif>('/api/admin/adaptive', kunci);
  },

  /** Nyalakan/matikan mode adaptif saat berjalan. */
  async setAdaptif(kunci: string, enabled: boolean): Promise<StatusAdaptif> {
    const res = await fetch(`${API_URL}/api/admin/adaptive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': kunci },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new AdminError(res.status, body.error ?? `Gagal mengubah mode adaptif (${res.status})`);
    }
    return (await res.json()) as StatusAdaptif;
  },

  /**
   * Alamat unduhan CSV.
   *
   * Kunci admin sengaja TIDAK ditempel pada URL: alamat lengkap tersimpan di
   * riwayat peramban dan log server, sehingga kunci akan bocor ke tempat yang
   * tidak terkendali. Berkas diambil lewat fetch berheader lalu disimpan
   * sebagai blob.
   */
  async unduhCsv(kunci: string, jenis: 'results' | 'events', classCode?: string): Promise<void> {
    const q = new URLSearchParams({ format: 'csv', limit: '5000' });
    if (classCode) q.set('classCode', classCode);

    const res = await fetch(`${API_URL}/api/admin/${jenis}?${q.toString()}`, {
      headers: { 'x-admin-key': kunci },
    });
    if (!res.ok) throw new AdminError(res.status, `Gagal mengunduh CSV (${res.status})`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecomath_${jenis}${classCode ? `_${classCode}` : ''}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
