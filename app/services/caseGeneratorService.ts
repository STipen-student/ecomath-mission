import { normalizeGeneratedCase, validateGeneratedCase } from "../lib/caseValidator";
import { generateCaseWithLocalRules } from "../lib/localCaseGenerator";
import { generateCaseWithAI } from "./aiCaseProvider";
import type { GenerationResult, ProviderMode } from "../types/game";

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
};
