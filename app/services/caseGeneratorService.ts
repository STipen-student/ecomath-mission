import { normalizeGeneratedCase, validateGeneratedCase } from "../lib/caseValidator";
import { generateCasePack, generateCaseWithLocalRules } from "../lib/localCaseGenerator";
import { generateCaseWithAI } from "./aiCaseProvider";
import type { CasePackGenerationResult, GenerationResult, ProviderMode } from "../types/game";

export const caseGeneratorService = {
  async generate(provider: ProviderMode): Promise<GenerationResult> {
    if (provider === "local") return { caseData: generateCaseWithLocalRules(), provider: "local", status: "Local Case Generation" };
    try {
      const normalized = normalizeGeneratedCase(await generateCaseWithAI());
      if (!normalized || !validateGeneratedCase(normalized)) throw new Error("Invalid AI case");
      return { caseData: normalized, provider: "ai", status: "AI Case Generation" };
    } catch {
      return { caseData: generateCaseWithLocalRules(), provider: "local", status: "Local Case Generation", notice: "AI unavailable, switched to Local" };
    }
  },

  async generatePack(provider: ProviderMode, count = 10): Promise<CasePackGenerationResult> {
    if (provider === "local") {
      return { cases: generateCasePack(count), provider: "local", status: "Local Mission Pack" };
    }

    try {
      // Untuk integrasi AI lanjutan, endpoint aman /api/generate-case boleh diperluas
      // agar menerima { count } dan mengembalikan beberapa kasus sekaligus. Saat ini
      // kita memakai satu kasus AI sebagai boss mission lalu melengkapi peta dengan
      // generator lokal agar sesi tetap punya 10 kasus dan tetap jalan tanpa API.
      const normalized = normalizeGeneratedCase(await generateCaseWithAI());
      if (!normalized || !validateGeneratedCase(normalized)) throw new Error("Invalid AI case");
      const localCases = generateCasePack(Math.max(0, count - 1));
      return {
        cases: [normalized, ...localCases].slice(0, count),
        provider: "ai",
        status: "AI Mission Pack",
        notice: "1 kasus AI siap. Distrik lain dibuat lokal agar campaign tetap lengkap.",
      };
    } catch {
      return {
        cases: generateCasePack(count),
        provider: "local",
        status: "Local Mission Pack",
        notice: "AI unavailable, switched to Local Mission Pack",
      };
    }
  },
};
