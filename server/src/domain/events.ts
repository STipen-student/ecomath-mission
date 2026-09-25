/**
 * Skema log event (docs/ECD_Framework.md Bagian 5.1).
 *
 * Nama field mengikuti dokumen PERSIS - session_id, task_id, timestamp_ms,
 * event_type, payload, is_valid_at_time, duration_since_last_event_ms - supaya
 * data mentah yang diekspor untuk analisis skripsi dapat dipetakan langsung ke
 * tabel skema log pada dokumen tanpa penerjemahan nama kolom.
 */

/**
 * Jenis event.
 *
 * Sembilan jenis pertama berasal langsung dari Bagian 5.1 dokumen ECD.
 *
 * `distractor_shown` DITAMBAHKAN (bukan dari dokumen) dan dipancarkan oleh
 * sistem, bukan oleh siswa: mesin skoring memerlukan penanda waktu kapan event
 * kebijakan muncul untuk dapat membedakan aksi "sebelum" dan "sesudah" event -
 * syarat mutlak menilai K4 ("revisi setelah event distraktor").
 *
 * `set_zone_center` DITAMBAHKAN dan mencatat saat siswa memindahkan titik pusat
 * pembangunan sebuah zona di peta. Event ini TIDAK dipakai rubrik mana pun -
 * letak zona adalah pilihan tata kota, bukan bagian dari model matematis, dan
 * tidak memengaruhi nilai x maupun y. Ia tetap dicatat karena mengubah keadaan
 * yang terlihat siswa, dan prinsip instrumen ini adalah setiap perubahan
 * keadaan harus meninggalkan jejak. Bagi peneliti, jejak itu tersedia sebagai
 * data proses tambahan (mis. apakah siswa menata kota atau membiarkannya).
 */
export const EVENT_TYPES = [
  'identify_variable',
  'write_constraint',
  'select_objective',
  'move_slider',
  'check_corner_point',
  'attempt_submit',
  'reject_by_system',
  'reflection_response',
  'revise_after_event',
  'distractor_shown',
  'set_zone_center',
  'adaptive_selection',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Satu baris log mentah sesuai Bagian 5.1. */
export interface RawEvent {
  session_id: string;
  task_id: string;
  timestamp_ms: number;
  event_type: EventType;
  payload: Record<string, unknown>;
  is_valid_at_time: boolean;
  duration_since_last_event_ms: number;
}

/* ------------------------------------------------------------------ */
/* Bentuk payload per jenis event                                      */
/* ------------------------------------------------------------------ */

/** identify_variable: siswa menetapkan makna variabel x atau y. */
export interface IdentifyVariablePayload {
  variable: 'x' | 'y';
  optionId: string;
}

/**
 * write_constraint: siswa menyusun satu pertidaksamaan lewat constraint builder.
 *
 * Koefisien dikirim terstruktur (bukan teks bebas) supaya miskonsepsi dapat
 * dideteksi deterministik: salah arah pertidaksamaan, tertukarnya peran x dan y,
 * atau salah skala konstanta. `constraint_text` tetap disertakan agar log mentah
 * terbaca manusia sesuai contoh pada dokumen.
 */
export interface WriteConstraintPayload {
  slot: number;
  a: number;
  b: number;
  op: '<=' | '>=' | '<' | '>';
  c: number;
  constraint_text: string;
}

/** select_objective: siswa memilih rumusan tujuan sebelum mulai membangun. */
export interface SelectObjectivePayload {
  optionId: string;
}

/** move_slider / check_corner_point / attempt_submit / revise_after_event. */
export interface PointPayload {
  x: number;
  y: number;
  z?: number;
}

/** attempt_submit menandai fase pengerjaan (sebelum / sesudah event distraktor). */
export interface SubmitPayload extends PointPayload {
  phase: 'initial' | 'post_event';
}

/** reject_by_system: sistem menolak konfigurasi karena melanggar kendala. */
export interface RejectPayload extends PointPayload {
  violated: string[];
}

/** reflection_response: jawaban tertutup dan/atau terbuka. */
export interface ReflectionPayload {
  closedOptionId?: string;
  openText?: string;
}

/** set_zone_center: siswa memindahkan titik pusat pembangunan sebuah zona. */
export interface ZoneCenterPayload {
  variable: 'x' | 'y';
  col: number;
  row: number;
}

/** distractor_shown: sistem memunculkan event kebijakan Level 4. */
export interface DistractorShownPayload {
  eventId: string;
  /** 'first_valid_submit' atau 'time_fallback' - dicatat untuk audit. */
  trigger: 'first_valid_submit' | 'time_fallback';
}

/**
 * adaptive_selection: sistem memilihkan varian task untuk sebuah level.
 *
 * Dipancarkan SERVER, bukan siswa, dan dicatat pada setiap percobaan - baik
 * saat mode adaptif menyala maupun mati. Alasannya: tanpa baris ini, data
 * hasil administrasi adaptif dan fixed-form tidak dapat dipisahkan saat
 * analisis, dan tidak ada cara mengaudit mengapa seorang siswa menerima
 * varian tertentu.
 *
 * SEPERTI set_zone_center, event ini TIDAK dibaca rubrik mana pun - ia adalah
 * keputusan sistem, bukan perilaku siswa, sehingga tidak boleh menjadi bukti
 * atas klaim apa pun tentang siswa.
 */
export interface AdaptiveSelectionPayload {
  level: number;
  /** Mode yang berlaku saat varian ini dipilih. */
  mode: 'adaptive' | 'fixed';
  chosenTaskId: string;
  /** Pita kemampuan hasil pembacaan skor klaim terdahulu. */
  band: 'rendah' | 'sedang' | 'tinggi' | 'belum_ada';
  /** Rerata klaim dominan level ini dari level-level sebelumnya. */
  claimMean: number | null;
  basedOnClaims: string[];
  /** Seluruh kandidat beserta beban permukaannya, terurut menaik. */
  ranked: Array<{ taskId: string; surfaceLoad: number }>;
  /** True bila seluruh varian level ini berbeban sama (Level 1 dan 4). */
  tanpaRuangAdaptif: boolean;
}

/** Ambil payload sebuah event dengan bentuk yang diharapkan (tanpa lempar). */
export function payloadOf<T>(event: RawEvent): Partial<T> {
  return (event.payload ?? {}) as Partial<T>;
}

/** Event pertama dengan jenis tertentu, atau undefined. */
export function firstOf(events: RawEvent[], type: EventType): RawEvent | undefined {
  return events.find((e) => e.event_type === type);
}

/** Event terakhir dengan jenis tertentu, atau undefined. */
export function lastOf(events: RawEvent[], type: EventType): RawEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.event_type === type) return events[i];
  }
  return undefined;
}

/** Seluruh event dengan jenis tertentu, urut waktu. */
export function allOf(events: RawEvent[], type: EventType): RawEvent[] {
  return events.filter((e) => e.event_type === type);
}

/** Urutkan log menurut timestamp_ms (stabil terhadap event bersamaan). */
export function sortEvents(events: RawEvent[]): RawEvent[] {
  return [...events].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
}
