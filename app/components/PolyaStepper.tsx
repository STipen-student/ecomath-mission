import type { Phase } from "../types/game";

const steps = ["Memahami", "Merencanakan", "Melaksanakan", "Melihat kembali"];

export function PolyaStepper({ phase, scores }: { phase: Phase; scores: Array<number | null> }) {
  return (
    <nav className="polya-stepper" aria-label="Langkah Polya">
      {steps.map((label, index) => (
        <div key={label} className={`step ${index === phase ? "current" : ""} ${scores[index] !== null ? "done" : ""}`}>
          <span>{scores[index] !== null ? "✓" : index + 1}</span>
          <div><small>LANGKAH {index + 1}</small><strong>{label}</strong></div>
          {scores[index] !== null && <b>{scores[index]}/25</b>}
        </div>
      ))}
    </nav>
  );
}

