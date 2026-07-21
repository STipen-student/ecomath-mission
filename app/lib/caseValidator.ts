import { calculateRecommendations } from "./localCaseGenerator";
import type { CityCase, Constraint } from "../types/game";

export function validateGeneratedCase(value: unknown): value is CityCase {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CityCase>;
  if (!item.title || !item.cityName || !item.scenario || !item.goal) return false;
  if (!Array.isArray(item.variables) || item.variables.length !== 2 || item.variables[0]?.id !== "x" || item.variables[1]?.id !== "y") return false;
  if (!Array.isArray(item.constraints) || item.constraints.length < 3) return false;
  if (!item.constraints.every((c) => Number.isFinite(c.a) && Number.isFinite(c.b) && Number.isFinite(c.limit) && (c.op === "<=" || c.op === ">="))) return false;
  const types = new Set(item.constraints.map((c) => c.type));
  if (!["budget", "land", "service"].every((type) => types.has(type as never))) return false;
  if (!Array.isArray(item.sdgFocus) || !item.sdgFocus.some((s) => /SDG\s*(11|13)/i.test(s))) return false;
  if (!Array.isArray(item.reflectionQuestions) || item.reflectionQuestions.length === 0) return false;
  if (!Array.isArray(item.evidenceTargets) || item.evidenceTargets.length === 0) return false;
  return calculateRecommendations(item.constraints).optimalService > 0;
}

export function normalizeGeneratedCase(raw: unknown): CityCase | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const sourceVariables = Array.isArray(data.variables) ? data.variables : [];
  const sourceConstraints = Array.isArray(data.constraints) ? data.constraints : [];
  if (sourceVariables.length !== 2 || sourceConstraints.length < 3) return null;
  const variables = sourceVariables.map((source, index) => {
    const v = source as Record<string, unknown>;
    const name = String(v.name ?? v.label ?? `Variabel ${index ? "y" : "x"}`);
    const lower = name.toLowerCase();
    return { id: index ? "y" : "x", name, shortName: String(v.shortName ?? name), kind: lower.includes("bus") || lower.includes("trans") || lower.includes("koridor") ? "transit" : lower.includes("taman") ? "park" : lower.includes("surya") ? "solar" : lower.includes("pusat") || lower.includes("stasiun") ? "civic" : "housing" };
  }) as CityCase["variables"];
  const constraints = sourceConstraints.map((source, index) => {
    const c = source as Record<string, unknown>;
    const hint = `${c.type ?? ""} ${c.label ?? ""}`.toLowerCase();
    const type = /budget|anggaran|biaya/.test(hint) ? "budget" : /land|lahan|ruang/.test(hint) ? "land" : /service|layan|akses|kapasitas/.test(hint) ? "service" : /emisi|emission|co2|karbon/.test(hint) ? "emission" : (["budget", "land", "service", "emission"][index] ?? "emission");
    const op = c.op === ">=" || c.operator === ">=" ? ">=" : "<=";
    const a = Number(c.a ?? c.coefficientX); const b = Number(c.b ?? c.coefficientY); const limit = Number(c.limit ?? c.rhs);
    return { id: String(c.id ?? `${type}-${index}`), type, label: String(c.label ?? type), a, b, op, limit, unit: String(c.unit ?? "unit"), explanation: String(c.explanation ?? `${a}x + ${b}y ${op} ${limit}`) };
  }) as Constraint[];
  const goal = typeof data.goal === "string" ? data.goal : String((data.goal as Record<string, unknown> | undefined)?.summary ?? "Memaksimalkan layanan tanpa melanggar kendala.");
  const normalized: CityCase = {
    id: String(data.id ?? `ai-${Date.now()}`), title: String(data.title ?? "Misi Kota Berkelanjutan"), cityName: String(data.cityName ?? "Kota Harmoni"), scenario: String(data.scenario ?? "Rancang pembangunan kota berkelanjutan."), initialCondition: String(data.initialCondition ?? "Kota memerlukan keputusan pembangunan terukur."), difficulty: data.difficulty === "Mudah" || data.difficulty === "Menantang" ? data.difficulty : "Sedang",
    variables, constraints, goal,
    facts: constraints.map((c) => ({ id: `fact-${c.id}`, text: `${c.a}x + ${c.b}y ${c.op} ${c.limit} (${c.label})`, relevant: true })),
    goalOptions: [goal, "Menghabiskan semua anggaran.", "Membangun tanpa memeriksa kendala."], correctGoal: 0,
    constraintOptions: [...constraints.map((c) => ({ id: c.id, text: c.label, correct: true })), { id: "decor", text: "Dekorasi kota", correct: false }],
    recommendedRange: calculateRecommendations(constraints),
    reflectionQuestions: Array.isArray(data.reflectionQuestions) ? data.reflectionQuestions.map(String) : ["Apakah solusi feasible?"],
    sdgFocus: Array.isArray(data.sdgFocus) ? data.sdgFocus.map(String) : ["SDG 11", "SDG 13"],
    evidenceTargets: Array.isArray(data.evidenceTargets) ? data.evidenceTargets.map(String) : ["Model SPtLDV", "Solusi feasible", "Refleksi"], optionalParkLimit: 2,
  };
  return validateGeneratedCase(normalized) ? normalized : null;
}

