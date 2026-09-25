/**
 * Konversi baris EventLog dari database menjadi RawEvent yang dipahami mesin
 * skoring.
 *
 * Payload disimpan sebagai TEXT berisi JSON demi portabilitas SQLite <->
 * PostgreSQL, sehingga perlu di-parse di sini. Payload yang rusak TIDAK
 * menggagalkan seluruh penskoran - event tersebut hanya kehilangan isinya dan
 * dicatat sebagai objek kosong, supaya satu baris cacat tidak menghanguskan
 * data satu siswa.
 */

import type { EventType, RawEvent } from '../domain/events.js';
import { EVENT_TYPES } from '../domain/events.js';

export interface EventLogRow {
  sessionId: string;
  taskId: string;
  timestampMs: number;
  eventType: string;
  payload: string;
  isValidAtTime: boolean;
  durationSinceLastEventMs: number;
}

const VALID_TYPES = new Set<string>(EVENT_TYPES);

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function rowsToRawEvents(rows: EventLogRow[]): RawEvent[] {
  return rows
    .filter((r) => VALID_TYPES.has(r.eventType))
    .map((r) => ({
      session_id: r.sessionId,
      task_id: r.taskId,
      timestamp_ms: r.timestampMs,
      event_type: r.eventType as EventType,
      payload: parsePayload(r.payload),
      is_valid_at_time: r.isValidAtTime,
      duration_since_last_event_ms: r.durationSinceLastEventMs,
    }));
}
