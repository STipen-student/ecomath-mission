import type { EvidenceEntry } from "../types/game";

export const POLYA_LABELS = ["Memahami masalah", "Menyusun rencana", "Melaksanakan rencana", "Melihat kembali"];

export function missionStatus(total: number) {
  return total >= 85 ? "Sangat baik" : total >= 70 ? "Baik" : total >= 55 ? "Cukup" : "Perlu bimbingan";
}

export function buildFeedback(scores: number[], evidence: EvidenceEntry[] = []) {
  const lowest = scores.indexOf(Math.min(...scores));
  const strengths = scores.map((score, index) => ({ score, label: POLYA_LABELS[index] })).sort((a, b) => b.score - a.score)[0];
  const revised = evidence.some((item) => item.type === "revision");
  return `Kekuatan utama: ${strengths.label} (${strengths.score}/25). Fokus berikutnya: ${POLYA_LABELS[lowest]} (${scores[lowest]}/25). ${revised ? "Kamu sudah menunjukkan revisi strategi setelah evaluasi." : "Coba uji rancangan, baca pelanggaran, lalu revisi strategi sebelum mengunci keputusan."}`;
}

export function safeJson(value: unknown, maxLength = 24000) {
  const json = JSON.stringify(value);
  if (json.length > maxLength) throw new Error("Data laporan terlalu besar.");
  return json;
}
