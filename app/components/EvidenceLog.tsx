import type { EvidenceEntry } from "../types/game";

const icons = { selection: "✓", model: "ƒ", decision: "⌂", warning: "!", revision: "↻", reflection: "✦" };
const phaseNames = ["Intel", "Blueprint", "Build", "Debrief"];

export function EvidenceLog({ entries }: { entries: EvidenceEntry[] }) {
  return (
    <aside className="evidence-panel">
      <div className="panel-heading"><div><span className="kicker">LIVE QUEST TRACE</span><h2>Quest Log</h2></div><span className="live-pill"><i /> LIVE</span></div>
      <p className="panel-intro">Log ini seperti catatan misi: pilihan, scan, alarm, revisi, dan keputusanmu muncul selama bermain.</p>
      <div className="evidence-list" aria-live="polite">
        {entries.length === 0 ? (
          <div className="empty-evidence"><span>◎</span><p>Quest log akan aktif setelah kamu membuka intel atau membangun distrik.</p></div>
        ) : entries.map((entry) => (
          <article className={`evidence-item ${entry.type}`} key={entry.id}>
            <span className="evidence-icon">{icons[entry.type]}</span>
            <div><small>{phaseNames[entry.phase]} · {entry.time}</small><p>{entry.text}</p></div>
          </article>
        ))}
      </div>
    </aside>
  );
}

