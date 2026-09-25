/**
 * Pembangun log sintetis untuk pengujian rubrik.
 *
 * Setiap uji rubrik menyusun timeline siswa secara eksplisit, sehingga yang
 * diuji adalah HUBUNGAN antara perilaku dan skor - bukan sekadar apakah kode
 * berjalan. Bila suatu hari deskriptor rubrik direvisi, uji yang gagal akan
 * langsung menunjukkan perilaku siswa mana yang berubah penilaiannya.
 */

import type { EventType, RawEvent } from '../../src/domain/events.js';

export class LogBuilder {
  private t = 0;
  private readonly events: RawEvent[] = [];

  constructor(
    private readonly sessionId = 'sesi-uji',
    private readonly taskId = 'task-uji',
  ) {}

  private push(
    eventType: EventType,
    payload: Record<string, unknown>,
    isValid = true,
    dt = 1000,
  ): this {
    this.t += dt;
    this.events.push({
      session_id: this.sessionId,
      task_id: this.taskId,
      timestamp_ms: this.t,
      event_type: eventType,
      payload,
      is_valid_at_time: isValid,
      duration_since_last_event_ms: dt,
    });
    return this;
  }

  /** Majukan jam tanpa mencatat event (mensimulasikan siswa membaca soal). */
  wait(ms: number): this {
    this.t += ms;
    return this;
  }

  identifyVariable(variable: 'x' | 'y', optionId: string, dt = 1000): this {
    return this.push('identify_variable', { variable, optionId }, true, dt);
  }

  /** Identifikasi kedua variabel dengan opsi yang benar (vx1 / vy1 pada bank soal). */
  identifyBothCorrect(dt = 1000): this {
    return this.identifyVariable('x', 'vx1', dt).identifyVariable('y', 'vy1', dt);
  }

  writeConstraint(
    slot: number,
    a: number,
    b: number,
    op: '<=' | '>=' | '<' | '>',
    c: number,
    dt = 1500,
  ): this {
    return this.push(
      'write_constraint',
      { slot, a, b, op, c, constraint_text: `${a}x + ${b}y ${op} ${c}` },
      true,
      dt,
    );
  }

  selectObjective(optionId: string, dt = 1000): this {
    return this.push('select_objective', { optionId }, true, dt);
  }

  moveSlider(x: number, y: number, isValid = true, dt = 500): this {
    return this.push('move_slider', { x, y }, isValid, dt);
  }

  checkCorner(x: number, y: number, z?: number, dt = 800): this {
    return this.push('check_corner_point', z === undefined ? { x, y } : { x, y, z }, true, dt);
  }

  submit(x: number, y: number, phase: 'initial' | 'post_event' = 'initial', isValid = true, dt = 700): this {
    return this.push('attempt_submit', { x, y, phase }, isValid, dt);
  }

  reject(x: number, y: number, violated: string[], dt = 300): this {
    return this.push('reject_by_system', { x, y, violated }, false, dt);
  }

  distractorShown(eventId: string, trigger: 'first_valid_submit' | 'time_fallback' = 'first_valid_submit', dt = 500): this {
    return this.push('distractor_shown', { eventId, trigger }, true, dt);
  }

  reviseAfterEvent(x: number, y: number, isValid = true, dt = 900): this {
    return this.push('revise_after_event', { x, y }, isValid, dt);
  }

  reflection(closedOptionId?: string, openText?: string, dt = 2000): this {
    return this.push('reflection_response', { closedOptionId, openText }, true, dt);
  }

  build(): RawEvent[] {
    return [...this.events];
  }
}

/** Pintasan pembuat builder. */
export function log(taskId: string): LogBuilder {
  return new LogBuilder('sesi-uji', taskId);
}

/* ------------------------------------------------------------------ */
/* Koefisien kunci untuk task yang dipakai pada pengujian              */
/* ------------------------------------------------------------------ */

/** L1-SDG11-A: x + y <= 40 ; x - 2y >= 0 (tanpa fungsi tujuan) */
export const L1_KEY = {
  lahan: [1, 1, '<=', 40] as const,
  rasio: [1, -2, '>=', 0] as const,
};

/** L3-SDG11-A: x + y <= 80 ; 25x + 40y <= 2400 ; y >= 10 ; Maks Z = 8x + 5y */
export const L3_KEY = {
  lahan: [1, 1, '<=', 80] as const,
  anggaran: [25, 40, '<=', 2400] as const,
  akses: [0, 1, '>=', 10] as const,
  /** Titik optimum yang benar. */
  optimum: { x: 70, y: 10 },
  optimumZ: 610,
};

/** L4-SDG11-A: x + y <= 120 ; 25x + 18y <= 3600 ; y >= 36 (implisit) ; Maks Z = 40x */
export const L4_KEY = {
  lahan: [1, 1, '<=', 120] as const,
  anggaran: [25, 18, '<=', 3600] as const,
  rth: [0, 1, '>=', 36] as const,
  optimum: { x: 84, y: 36 },
  /** Optimum setelah event menaikkan standar RTH menjadi y >= 48. */
  optimumAfterEvent: { x: 72, y: 48 },
};
