import type { EvidenceEntry } from "../types/game";

const icons = { selection: "✓", model: "ƒ", decision: "⌂", warning: "!", revision: "↻", reflection: "✦" };

export function EvidenceLog({ entries }: { entries: EvidenceEntry[] }) {
  return (
    <aside className="evidence-panel">
      <div className="panel-heading"><div><span className="kicker">ECD · EVIDENCE MODEL</span><h2>Evidence Log</h2></div><span className="live-pill"><i /> LIVE</span></div>
      <p className="panel-intro">Tindakanmu direkam sebagai bukti proses berpikir, bukan hanya jawaban akhir.</p>
      <div className="evidence-list" aria-live="polite">
        {entries.length === 0 ? (
          <div className="empty-evidence"><span>◎</span><p>Bukti akan muncul saat kamu mulai memilih informasi.</p></div>
        ) : entries.map((entry) => (
          <article className={`evidence-item ${entry.type}`} key={entry.id}>
            <span className="evidence-icon">{icons[entry.type]}</span>
            <div><small>LANGKAH {entry.phase + 1} · {entry.time}</small><p>{entry.text}</p></div>
          </article>
        ))}
      </div>
    </aside>
  );
}

