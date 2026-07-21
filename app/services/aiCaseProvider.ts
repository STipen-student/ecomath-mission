export const AI_CASE_GENERATOR_PROMPT = `
Hasilkan satu kasus city-building edukatif untuk siswa. Fokuskan pada SDG 11
dan/atau SDG 13 serta asesmen SPtLDV dengan empat langkah Polya. Gunakan tepat
dua variabel keputusan (x dan y), koefisien bilangan bulat sederhana, kendala
anggaran, lahan, target layanan minimum, dan batas emisi. Pastikan ada solusi
feasible. Kasus harus singkat, aman, nonpolitis, tanpa merek/IP pihak lain.
Kembalikan JSON konsisten dengan field title, cityName, scenario,
initialCondition, difficulty, variables, constraints, goal, recommendedRange,
reflectionQuestions, sdgFocus, dan evidenceTargets. Setiap constraint memuat
type, label, a, b, op (<= atau >=), limit, unit, dan explanation. JSON saja.
`.trim();

/**
 * Contract endpoint aman (contoh):
 * POST /api/generate-case
 * body: { difficulty: "adaptive", promptVersion: "ecocity-v1" }
 * response: { title, cityName, scenario, variables, constraints, goal,
 *   reflectionQuestions, sdgFocus, difficulty, evidenceTargets }
 *
 * OPENAI_API_KEY hanya disimpan sebagai secret server-side. Browser tidak pernah
 * mengirim standard API key. Endpoint server memakai prompt di atas, moderasi,
 * validasi schema, rate limit, lalu mengembalikan JSON terstruktur.
 */
export async function generateCaseWithAI(timeoutMs = 4500): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/api/generate-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: "adaptive", promptVersion: "ecocity-v1" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

