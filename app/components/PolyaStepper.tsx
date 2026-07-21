import type { Phase } from "../types/game";

const steps = [
  { label: "Intel Scan", hint: "Cari petunjuk" },
  { label: "Blueprint Lab", hint: "Rakit aturan" },
  { label: "Build Mode", hint: "Bangun distrik" },
  { label: "City Debrief", hint: "Klaim reputasi" },
];

export function PolyaStepper({ phase, scores }: { phase: Phase; scores: Array<number | null> }) {
  return (
    <nav className="polya-stepper" aria-label="Siklus quest kota">
      {steps.map((step, index) => (
        <div key={step.label} className={`step ${index === phase ? "current" : ""} ${scores[index] !== null ? "done" : ""}`}>
          <span>{scores[index] !== null ? "★" : index + 1}</span>
          <div><small>QUEST LOOP</small><strong>{step.label}</strong><small>{step.hint}</small></div>
          {scores[index] !== null && <b>{scores[index]} XP</b>}
        </div>
      ))}
    </nav>
  );
}

