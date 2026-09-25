/**
 * Tipe data yang dipertukarkan dengan backend.
 *
 * Bentuknya sengaja mencerminkan respons API apa adanya, bukan menyalin tipe
 * domain server. Client memang TIDAK boleh mengetahui kunci jawaban: perhatikan
 * bahwa GoalOption dan VariableOption di sini tidak punya field `correct`, dan
 * ConstraintDto tidak membawa titik optimum.
 */

export type InequalityOp = '<=' | '>=' | '<' | '>';

export interface ConstraintDto {
  id: string;
  label: string;
  a: number;
  b: number;
  op: InequalityOp;
  c: number;
  kind: 'explicit' | 'implicit' | 'nonnegativity' | 'bounding_box';
  display: string;
}

export interface ObjectiveDto {
  type: 'max' | 'min' | 'none';
  cx: number;
  cy: number;
  label: string;
  unit: string;
  display: string;
}

/** Identitas visual variabel; menentukan bentuk dan warna zona di peta. */
export type VariableVisual = 'nature' | 'clean' | 'housing' | 'neutral';

export interface VariableDto {
  key: 'x' | 'y';
  label: string;
  unit: string;
  max: number;
  step: number;
  visual: VariableVisual;
}

export interface TaskDto {
  id: string;
  level: 1 | 2 | 3 | 4;
  sdgContext: 'SDG11' | 'SDG13' | 'SDG11&13';
  title: string;
  narrative: string;
  dataTable: { headers: string[]; rows: string[][] } | null;
  variables: { x: VariableDto; y: VariableDto };
  constraints: ConstraintDto[];
  objective: ObjectiveDto;
  domain: 'continuous' | 'integer';
  representation: string;
  goalOptions: Array<{ id: string; text: string }>;
  variableOptions: Array<{ id: string; text: string; assignsTo: 'x' | 'y' }>;
  reflection: {
    closed: { prompt: string; options: Array<{ id: string; text: string }> };
    openPrompt: string;
  };
  expectedConstraintCount: number;
  gameInteraction: string;
  hasDistractor: boolean;
}

export interface TaskResponse {
  attemptId: string | null;
  task: TaskDto;
  resumed: boolean;
}

export interface SessionResponse {
  sessionId: string;
  studentName: string;
  classCode: string;
  startedAt: string;
}

export interface DistractorResponse {
  eventId: string;
  narrative: string;
  instruction: string;
  constraints: ConstraintDto[];
  objective: ObjectiveDto;
  changedConstraintIds: string[];
  alreadyShown: boolean;
  trigger: 'first_valid_submit' | 'time_fallback';
}

/** Umpan balik formatif satu klaim, sudah dalam bahasa siswa. */
export interface StudentFeedback {
  claim: 'K1' | 'K2' | 'K3' | 'K4';
  title: string;
  score: number;
  /** Apa yang terjadi pada pekerjaanmu. */
  summary: string;
  /** Apa yang bisa dilakukan lain kali. */
  suggestion: string;
}

export interface SubmitResponse {
  scoreId: string;
  taskId: string;
  level: number;
  scores: { K1: number; K2: number; K3: number; K4: number };
  rawSum: number;
  weightedComposite: number;
  sessionComposite: number | null;
  finalPositionValid: boolean;
  /** Umpan balik untuk siswa. */
  feedback: StudentFeedback[];
  /** Satu kalimat penutup: bagian terkuat dan yang perlu dilatih. */
  overallMessage: string;
  /** Deskriptor rubrik asli - dipakai layar guru, bukan ditampilkan ke siswa. */
  rubric: Array<{ claim: string; score: number; descriptor: string; reasons: string[] }>;
  optimum: { point: { x: number; y: number } | null; z: number | null } | null;
  scoringVersion: string;
}

/** Jenis event log - harus sama persis dengan enum di server. */
export type EventType =
  | 'identify_variable'
  | 'write_constraint'
  | 'select_objective'
  | 'move_slider'
  | 'check_corner_point'
  | 'attempt_submit'
  | 'reject_by_system'
  | 'reflection_response'
  | 'revise_after_event'
  | 'distractor_shown'
  | 'set_zone_center';

/** Satu baris log, mengikuti skema Bagian 5.1 dokumen ECD. */
export interface LogEvent {
  session_id: string;
  task_id: string;
  timestamp_ms: number;
  event_type: EventType;
  payload: Record<string, unknown>;
  is_valid_at_time: boolean;
  duration_since_last_event_ms: number;
}
