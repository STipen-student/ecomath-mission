export type Difficulty = "Mudah" | "Sedang" | "Menantang";
export type ProviderMode = "local" | "ai";
export type Phase = 0 | 1 | 2 | 3;
export type VariableId = "x" | "y";
export type Operator = "<=" | ">=";
export type ConstraintType = "budget" | "land" | "service" | "emission";
export type Tile = null | VariableId | "park";

export interface DecisionVariable {
  id: VariableId;
  name: string;
  shortName: string;
  kind: "housing" | "transit" | "park" | "solar" | "civic";
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  label: string;
  a: number;
  b: number;
  op: Operator;
  limit: number;
  unit: string;
  explanation: string;
}

export interface CityCase {
  id: string;
  title: string;
  cityName: string;
  scenario: string;
  initialCondition: string;
  difficulty: Difficulty;
  variables: [DecisionVariable, DecisionVariable];
  constraints: Constraint[];
  goal: string;
  facts: Array<{ id: string; text: string; relevant: boolean }>;
  goalOptions: string[];
  correctGoal: number;
  constraintOptions: Array<{ id: string; text: string; correct: boolean }>;
  recommendedRange: {
    xMax: number;
    yMax: number;
    optimalService: number;
    feasibleExample: { x: number; y: number };
  };
  reflectionQuestions: string[];
  sdgFocus: string[];
  evidenceTargets: string[];
  optionalParkLimit: number;
}

export interface GenerationResult {
  caseData: CityCase;
  provider: ProviderMode;
  status: string;
  notice?: string;
}

export interface CasePackGenerationResult {
  cases: CityCase[];
  provider: ProviderMode;
  status: string;
  notice?: string;
}

export interface EvidenceEntry {
  id: string;
  phase: Phase;
  type: "selection" | "model" | "decision" | "warning" | "revision" | "reflection";
  text: string;
  time: string;
}

export interface BuildResult {
  x: number;
  y: number;
  checks: number;
  revisions: number;
  values: Array<{ constraint: Constraint; value: number; met: boolean }>;
}

export interface MissionReport {
  caseId: string;
  caseTitle: string;
  cityName: string;
  difficulty: Difficulty;
  scores: number[];
  total: number;
  status: string;
  evidence: EvidenceEntry[];
  decision: BuildResult | null;
  feedback: string;
}

export interface LearningProfile {
  email: string;
  fullName: string;
  role: "student" | "teacher";
  classCode: string;
  className?: string;
}
