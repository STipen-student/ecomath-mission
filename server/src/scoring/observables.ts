/**
 * Ekstraksi Observable Variables dari log mentah (docs/ECD_Framework.md Bagian 3 & 5.1).
 *
 * Berkas ini tidak memberi skor apa pun. Tugasnya semata-mata merekonstruksi
 * TIMELINE pengerjaan siswa menjadi variabel agregat per sesi yang disebut
 * dokumen: jumlah_revisi, waktu_perencanaan_awal, jumlah_pelanggaran_kendala,
 * jumlah_titik_pojok_dicek, ada_tidaknya_respons_reflektif, dan
 * konsistensi_setelah_event_distraktor.
 *
 * Pemisahan ini disengaja: rubrik K1-K4 hanya membaca objek Observables, tidak
 * pernah menyentuh log mentah, sehingga tiap klaim dapat diuji unit dengan
 * observable buatan tanpa harus menyusun log lengkap.
 */

import type { Constraint, Point, TaskDefinition } from '../domain/types.js';
import type {
  IdentifyVariablePayload,
  PointPayload,
  RawEvent,
  ReflectionPayload,
  SelectObjectivePayload,
  SubmitPayload,
  WriteConstraintPayload,
} from '../domain/events.js';
import { allOf, firstOf, lastOf, payloadOf, sortEvents } from '../domain/events.js';
import { applyPatches, evaluate } from '../domain/feasibility.js';
import { findOptimum, relativeGap } from '../domain/optimum.js';
import type { MisconceptionKind } from '../domain/types.js';
import { THRESHOLDS } from './thresholds.js';

/* ------------------------------------------------------------------ */
/* Pencocokan pertidaksamaan susunan siswa dengan kunci                */
/* ------------------------------------------------------------------ */

interface Coeffs {
  a: number;
  b: number;
  op: '<=' | '>=' | '<' | '>';
  c: number;
}

/**
 * Bentuk kanonik sebuah pertidaksamaan: diarahkan ke "<=" lalu dinormalisasi
 * skalanya, sehingga "x >= 2y", "x - 2y >= 0" dan "2y - x <= 0" dikenali sebagai
 * pertidaksamaan yang SAMA. Tanpa normalisasi ini, siswa yang menulis bentuk
 * ekuivalen tetapi tidak identik akan salah dinilai sebagai miskonsepsi.
 */
function canonical(k: Coeffs): { a: number; b: number; c: number } {
  const flip = k.op === '>=' || k.op === '>';
  let a = flip ? -k.a : k.a;
  let b = flip ? -k.b : k.b;
  let c = flip ? -k.c : k.c;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale > THRESHOLDS.constraintMatchTolerance) {
    a /= scale;
    b /= scale;
    c /= scale;
  }
  return { a, b, c };
}

const near = (p: number, q: number) => Math.abs(p - q) <= THRESHOLDS.constraintMatchTolerance;

function sameDirection(u: Coeffs, v: Coeffs): boolean {
  const cu = canonical(u);
  const cv = canonical(v);
  return near(cu.a, cv.a) && near(cu.b, cv.b);
}

function identical(u: Coeffs, v: Coeffs): boolean {
  const cu = canonical(u);
  const cv = canonical(v);
  return near(cu.a, cv.a) && near(cu.b, cv.b) && near(cu.c, cv.c);
}

function flipOp(op: Coeffs['op']): Coeffs['op'] {
  return op === '<=' ? '>=' : op === '>=' ? '<=' : op === '<' ? '>' : '<';
}

/** Hasil pencocokan satu pertidaksamaan siswa terhadap seluruh kunci task. */
export interface ConstraintMatch {
  /** Kendala kunci yang paling mendekati, null bila tidak ada yang menyerupai. */
  targetId: string | null;
  kind: MisconceptionKind;
}

/**
 * Klasifikasikan satu pertidaksamaan susunan siswa.
 *
 * Urutan pemeriksaan mengikuti tingkat keparahan pada rubrik K1:
 *   identik      -> 'none'        (benar)
 *   salah skala  -> 'unit_scale'  (arah benar, konstanta meleset -> skor 2)
 *   arah terbalik-> 'sign_flip'   (miskonsepsi besar -> skor 1)
 *   x/y tertukar -> 'swap_vars'   (miskonsepsi besar -> skor 1)
 *   selain itu   -> 'structural'
 */
export function classifyConstraint(written: Coeffs, targets: Constraint[]): ConstraintMatch {
  for (const t of targets) {
    if (identical(written, t)) return { targetId: t.id, kind: 'none' };
  }
  for (const t of targets) {
    if (sameDirection(written, t)) return { targetId: t.id, kind: 'unit_scale' };
  }
  for (const t of targets) {
    if (identical({ ...written, op: flipOp(written.op) }, t)) return { targetId: t.id, kind: 'sign_flip' };
  }
  for (const t of targets) {
    if (identical({ ...written, a: written.b, b: written.a }, t)) return { targetId: t.id, kind: 'swap_vars' };
  }
  for (const t of targets) {
    if (sameDirection({ ...written, a: written.b, b: written.a }, t)) return { targetId: t.id, kind: 'swap_vars' };
  }
  return { targetId: null, kind: 'structural' };
}

/* ------------------------------------------------------------------ */
/* Observable Variables                                                */
/* ------------------------------------------------------------------ */

export interface Observables {
  /* --- K1: Memahami Masalah --- */
  identifyVariableCount: number;
  /** Kedua variabel ditetapkan dan keduanya sesuai konteks. */
  variablesCorrect: boolean;
  /** Identifikasi variabel dilakukan sebelum slider pertama digeser. */
  identifyBeforeFirstMove: boolean;
  /** Klasifikasi write_constraint PERTAMA - inti deskriptor K1 skor 1. */
  firstConstraintMisconception: MisconceptionKind;
  /** Revisi yang mengubah struktur (koefisien/arah) sebuah kendala. */
  structuralRevisionCount: number;
  /** Revisi yang hanya mengubah konstanta (indikasi kekeliruan satuan/skala). */
  minorRevisionCount: number;
  /** Seluruh kendala tepat pada percobaan pertama, tanpa revisi struktural. */
  allConstraintsCorrectFirstTry: boolean;

  /* --- K2: Merencanakan Penyelesaian --- */
  objectiveSelected: boolean;
  objectiveCorrect: boolean;
  /** Fungsi tujuan/rumusan tujuan dipilih sebelum slider pertama digeser. */
  objectiveBeforeFirstMove: boolean;
  /** Banyak kendala BERBEDA yang berhasil disusun benar. */
  constraintCountCorrect: number;
  /** Banyak kendala BERBEDA yang dicoba disusun (benar maupun salah). */
  constraintCountWritten: number;
  /** Ada pengecekan titik pojok sebelum attempt_submit pertama. */
  cornerCheckBeforeFirstSubmit: boolean;
  cornerPointsChecked: number;
  /** waktu_perencanaan_awal: milidetik sampai aksi konstruksi pertama. */
  planningTimeMs: number;

  /* --- K3: Melaksanakan Rencana --- */
  submitCount: number;
  /** Posisi pada attempt_submit terakhir. */
  finalPosition: Point | null;
  finalPositionValid: boolean;
  /** Nilai fungsi tujuan pada posisi akhir (null bila task tanpa fungsi tujuan). */
  finalZ: number | null;
  optimalZ: number | null;
  optimalPoint: Point | null;
  /** Selisih relatif terhadap optimum, 0 = tepat optimum. */
  relativeGap: number | null;
  /** jumlah_pelanggaran_kendala: banyak reject_by_system. */
  boundaryViolationCount: number;

  /* --- K4: Memeriksa Kembali --- */
  distractorFired: boolean;
  distractorAtMs: number | null;
  reviseAfterEventCount: number;
  /** Submit setelah event distraktor memenuhi SELURUH kendala baru. */
  postEventValid: boolean;
  /** post_solution_edit_count: penyesuaian setelah solusi valid pertama. */
  postSolutionEditCount: number;
  reflectionAnswered: boolean;
  reflectionClosedQuality: 0 | 1 | 2 | 3 | null;
  reflectionOpenText: string | null;

  /* --- Konteks --- */
  /** Kendala yang berlaku pada saat submit terakhir (pasca-event bila ada). */
  activeConstraints: Constraint[];
  totalDurationMs: number;
}

/**
 * Turunkan seluruh observable variables dari log satu percobaan task.
 *
 * @param task    definisi task yang dikerjakan
 * @param rawLog  seluruh event pada percobaan tersebut (urutan bebas)
 */
export function deriveObservables(task: TaskDefinition, rawLog: RawEvent[]): Observables {
  const events = sortEvents(rawLog);

  const substantive = task.constraints.filter((k) => k.kind === 'explicit' || k.kind === 'implicit');

  /* ---------- Penanda waktu utama ---------- */
  const firstMove = firstOf(events, 'move_slider');
  const firstSubmit = firstOf(events, 'attempt_submit');
  const distractorEvent = firstOf(events, 'distractor_shown');
  const distractorAtMs = distractorEvent ? distractorEvent.timestamp_ms : null;

  /* ---------- K1: identifikasi variabel ---------- */
  const identifyEvents = allOf(events, 'identify_variable');
  const lastAssign: Record<'x' | 'y', string | null> = { x: null, y: null };
  for (const e of identifyEvents) {
    const p = payloadOf<IdentifyVariablePayload>(e);
    if (p.variable === 'x' || p.variable === 'y') {
      lastAssign[p.variable] = p.optionId ?? null;
    }
  }
  const isCorrectOption = (optionId: string | null, variable: 'x' | 'y') =>
    optionId !== null &&
    task.variableOptions.some((o) => o.id === optionId && o.assignsTo === variable && o.correct);
  const variablesCorrect = isCorrectOption(lastAssign.x, 'x') && isCorrectOption(lastAssign.y, 'y');

  const firstIdentify = identifyEvents[0];
  const identifyBeforeFirstMove =
    firstIdentify !== undefined && (firstMove === undefined || firstIdentify.timestamp_ms <= firstMove.timestamp_ms);

  /* ---------- K1/K2: penyusunan kendala ---------- */
  const writeEvents = allOf(events, 'write_constraint');
  const written = writeEvents.map((e) => {
    const p = payloadOf<WriteConstraintPayload>(e);
    const coeffs: Coeffs = {
      a: Number(p.a ?? 0),
      b: Number(p.b ?? 0),
      op: (p.op ?? '<=') as Coeffs['op'],
      c: Number(p.c ?? 0),
    };
    return { event: e, slot: Number(p.slot ?? 0), coeffs, match: classifyConstraint(coeffs, substantive) };
  });

  const firstConstraintMisconception: MisconceptionKind = written[0]?.match.kind ?? 'none';

  // Revisi = penulisan ulang pada slot yang sama. Perubahan koefisien/arah
  // dihitung sebagai revisi struktural; perubahan konstanta saja sebagai minor.
  let structuralRevisionCount = 0;
  let minorRevisionCount = 0;
  const lastBySlot = new Map<number, Coeffs>();
  for (const w of written) {
    const prev = lastBySlot.get(w.slot);
    if (prev) {
      if (sameDirection(prev, w.coeffs) && !identical(prev, w.coeffs)) minorRevisionCount++;
      else if (!identical(prev, w.coeffs)) structuralRevisionCount++;
    }
    lastBySlot.set(w.slot, w.coeffs);
  }

  // Kendala yang berhasil disusun benar: berdasarkan penulisan TERAKHIR per slot.
  const finalBySlot = new Map<number, (typeof written)[number]>();
  for (const w of written) finalBySlot.set(w.slot, w);
  const correctTargets = new Set<string>();
  const attemptedTargets = new Set<string>();
  for (const w of finalBySlot.values()) {
    if (w.match.targetId) attemptedTargets.add(w.match.targetId);
    if (w.match.kind === 'none' && w.match.targetId) correctTargets.add(w.match.targetId);
  }
  // Slot yang tidak menyerupai kendala mana pun tetap dihitung sebagai upaya.
  const structuralOnlySlots = [...finalBySlot.values()].filter((w) => w.match.targetId === null).length;
  const constraintCountWritten = attemptedTargets.size + structuralOnlySlots;

  // Benar pada percobaan pertama: penulisan PERTAMA tiap slot sudah tepat,
  // seluruh kendala tercakup, dan tidak ada revisi struktural sesudahnya.
  const firstBySlot = new Map<number, (typeof written)[number]>();
  for (const w of written) if (!firstBySlot.has(w.slot)) firstBySlot.set(w.slot, w);
  const firstTryCorrect = new Set(
    [...firstBySlot.values()].filter((w) => w.match.kind === 'none' && w.match.targetId).map((w) => w.match.targetId!),
  );
  const allConstraintsCorrectFirstTry =
    firstTryCorrect.size >= substantive.length && structuralRevisionCount === 0;

  /* ---------- K2: fungsi tujuan & titik pojok ---------- */
  const objectiveEvents = allOf(events, 'select_objective');
  const lastObjective = objectiveEvents[objectiveEvents.length - 1];
  const objectiveSelected = objectiveEvents.length > 0;
  const chosenGoalId = lastObjective ? payloadOf<SelectObjectivePayload>(lastObjective).optionId : undefined;
  const objectiveCorrect = task.goalOptions.some((g) => g.id === chosenGoalId && g.correct);
  const firstObjective = objectiveEvents[0];
  const objectiveBeforeFirstMove =
    firstObjective !== undefined && (firstMove === undefined || firstObjective.timestamp_ms <= firstMove.timestamp_ms);

  const cornerEvents = allOf(events, 'check_corner_point');
  const cornerPointsChecked = new Set(
    cornerEvents.map((e) => {
      const p = payloadOf<PointPayload>(e);
      return `${p.x},${p.y}`;
    }),
  ).size;
  const cornerCheckBeforeFirstSubmit =
    cornerEvents.length > 0 && firstSubmit !== undefined && cornerEvents[0]!.timestamp_ms < firstSubmit.timestamp_ms;

  /**
   * waktu_perencanaan_awal: rentang dari awal task sampai aksi konstruksi
   * pertama (menggeser slider atau langsung submit). Dicatat dan diekspor
   * sebagai variabel deskriptif; sesuai keputusan peneliti, nilai ini TIDAK
   * dipakai sebagai gerbang skor K2 karena rubrik K2 berbasis urutan aksi.
   */
  const firstConstructive = firstMove ?? firstSubmit;
  const planningTimeMs = firstConstructive ? firstConstructive.timestamp_ms : 0;

  /* ---------- K3: pelaksanaan ---------- */
  const submitEvents = allOf(events, 'attempt_submit');
  const lastSubmit = lastOf(events, 'attempt_submit');
  const finalPosition: Point | null = lastSubmit
    ? {
        x: Number(payloadOf<SubmitPayload>(lastSubmit).x ?? 0),
        y: Number(payloadOf<SubmitPayload>(lastSubmit).y ?? 0),
      }
    : null;

  // Kendala yang berlaku pada saat submit terakhir. Bila event distraktor sudah
  // muncul, K3 dinilai terhadap kendala PASCA-event - itulah aturan main yang
  // dihadapi siswa pada saat submit terakhirnya.
  const activeConstraints =
    distractorEvent && task.distractor
      ? applyPatches(task.constraints, task.distractor.constraintPatches)
      : task.constraints;
  const activeObjective =
    distractorEvent && task.distractor?.objectivePatch
      ? { ...task.objective, ...task.distractor.objectivePatch }
      : task.objective;

  const finalPositionValid = finalPosition ? evaluate(activeConstraints, finalPosition).feasible : false;

  const optimum = findOptimum(task, { constraints: activeConstraints, objective: activeObjective });
  const finalZ =
    finalPosition && activeObjective.type !== 'none'
      ? activeObjective.cx * finalPosition.x + activeObjective.cy * finalPosition.y
      : null;
  const gap =
    finalPosition && finalPositionValid ? relativeGap(task, finalPosition, optimum, activeObjective) : null;

  const boundaryViolationCount = allOf(events, 'reject_by_system').length;

  /* ---------- K4: pemeriksaan kembali ---------- */
  const reviseEvents = allOf(events, 'revise_after_event');
  const reviseAfterEventCount = distractorAtMs === null
    ? 0
    : reviseEvents.filter((e) => e.timestamp_ms >= distractorAtMs).length;

  const postEventSubmits = distractorAtMs === null
    ? []
    : submitEvents.filter((e) => e.timestamp_ms >= distractorAtMs);
  const lastPostEventSubmit = postEventSubmits[postEventSubmits.length - 1];
  const postEventValid = lastPostEventSubmit
    ? evaluate(activeConstraints, {
        x: Number(payloadOf<SubmitPayload>(lastPostEventSubmit).x ?? 0),
        y: Number(payloadOf<SubmitPayload>(lastPostEventSubmit).y ?? 0),
      }).feasible
    : false;

  // post_solution_edit_count: penyesuaian slider setelah solusi valid pertama.
  const firstValidSubmit = submitEvents.find((e) => e.is_valid_at_time);
  const postSolutionEditCount = firstValidSubmit
    ? allOf(events, 'move_slider').filter((e) => e.timestamp_ms > firstValidSubmit.timestamp_ms).length
    : 0;

  const reflectionEvent = lastOf(events, 'reflection_response');
  const reflectionPayload = reflectionEvent ? payloadOf<ReflectionPayload>(reflectionEvent) : {};
  const closedOption = task.reflection.closed.options.find((o) => o.id === reflectionPayload.closedOptionId);
  const openText =
    typeof reflectionPayload.openText === 'string' && reflectionPayload.openText.trim().length > 0
      ? reflectionPayload.openText.trim()
      : null;

  const totalDurationMs = events.length > 0 ? events[events.length - 1]!.timestamp_ms : 0;

  return {
    identifyVariableCount: identifyEvents.length,
    variablesCorrect,
    identifyBeforeFirstMove,
    firstConstraintMisconception,
    structuralRevisionCount,
    minorRevisionCount,
    allConstraintsCorrectFirstTry,

    objectiveSelected,
    objectiveCorrect,
    objectiveBeforeFirstMove,
    constraintCountCorrect: correctTargets.size,
    constraintCountWritten,
    cornerCheckBeforeFirstSubmit,
    cornerPointsChecked,
    planningTimeMs,

    submitCount: submitEvents.length,
    finalPosition,
    finalPositionValid,
    finalZ,
    optimalZ: optimum.z,
    optimalPoint: optimum.point,
    relativeGap: gap,
    boundaryViolationCount,

    distractorFired: distractorEvent !== undefined,
    distractorAtMs,
    reviseAfterEventCount,
    postEventValid,
    postSolutionEditCount,
    reflectionAnswered: reflectionEvent !== undefined && (closedOption !== undefined || openText !== null),
    reflectionClosedQuality: closedOption ? closedOption.quality : null,
    reflectionOpenText: openText,

    activeConstraints,
    totalDurationMs,
  };
}
