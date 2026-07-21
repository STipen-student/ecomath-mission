"use client";

import { useMemo, useState } from "react";
import type { BuildResult, CityCase } from "../types/game";

export function ReflectionPanel({ caseData, result, scores, onComplete }: { caseData: CityCase; result: BuildResult; scores: Array<number | null>; onComplete: (score: number, evidence: string[]) => void }) {
  const [feasible, setFeasible] = useState(""); const [binding, setBinding] = useState(""); const [change, setChange] = useState(""); const [reason, setReason] = useState("");
  const allMet = result.values.every((item) => item.met);
  const bindingId = useMemo(() => [...result.values].sort((left, right) => {
    const slack = (item: typeof left) => item.constraint.op === "<=" ? (item.constraint.limit - item.value) / Math.max(1, item.constraint.limit) : (item.value - item.constraint.limit) / Math.max(1, item.constraint.limit);
    return slack(left) - slack(right);
  })[0]?.constraint.id, [result]);
  const submit = () => {
    let score = feasible === String(allMet) ? 8 : 0;
    score += binding === bindingId ? 6 : 0;
    score += change === "recalculate" ? 5 : 0;
    const text = reason.trim().toLowerCase();
    score += text.length >= 30 ? 3 : text.length >= 15 ? 1 : 0;
    score += /\d/.test(text) ? 1 : 0;
    score += /kendala|feasible|pertidaksamaan|resource|aturan/.test(text) ? 1 : 0;
    score += /anggaran|lahan|layanan|emisi/.test(text) ? 1 : 0;
    onComplete(Math.min(25, score), [`City debrief: rancangan dinilai ${feasible === "true" ? "stabil/feasible" : feasible === "false" ? "belum stabil" : "belum dinilai"}.`, `Resource paling ketat dipilih: ${caseData.constraints.find((c) => c.id === binding)?.label ?? "belum dipilih"}.`, `Catatan debrief: ${reason || "belum ditulis"}`]);
  };
  return (
    <section className="phase-card">
      <div className="phase-title"><span className="phase-number purple">04</span><div><span className="kicker purple">CITY DEBRIEF</span><h1>Cek hasil kota dan klaim reputasi distrik</h1><p>Sebelum distrik dinyatakan selesai, planner harus membaca dashboard akhir dan menjelaskan kenapa desainnya layak.</p></div></div>
      <div className="review-summary"><div><span>x</span><strong>{result.x}</strong><small>{caseData.variables[0].shortName}</small></div><div><span>y</span><strong>{result.y}</strong><small>{caseData.variables[1].shortName}</small></div><div className="constraint-review">{result.values.map((item) => <span className={item.met ? "ok" : "bad"} key={item.constraint.id}>{item.met ? "✓" : "×"} {item.constraint.label}: {item.value} {item.constraint.op === "<=" ? "≤" : "≥"} {item.constraint.limit}</span>)}</div></div>
      <div className="score-preview">{["Intel", "Blueprint", "Build"].map((label, index) => <div key={label}><small>{label}</small><strong>{scores[index] ?? 0}<span>/25</span></strong></div>)}</div>
      <div className="reflection-grid"><label><span>1. Apakah distrik sudah stabil?</span><select value={feasible} onChange={(e) => setFeasible(e.target.value)}><option value="">Pilih kesimpulan…</option><option value="true">Ya, semua resource aman</option><option value="false">Tidak, masih ada alarm resource</option></select></label><label><span>2. Resource mana yang paling ketat?</span><select value={binding} onChange={(e) => setBinding(e.target.value)}><option value="">Pilih resource…</option>{caseData.constraints.map((c) => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label><label><span>3. Jika kas kota berkurang, aksi planner terbaik?</span><select value={change} onChange={(e) => setChange(e.target.value)}><option value="">Pilih tindakan…</option><option value="same">Tetap memakai desain lama tanpa scan ulang</option><option value="spend">Menambah semua bangunan</option><option value="recalculate">Scan ulang wilayah aman dan bandingkan desain</option></select></label><label className="wide"><span>4. Catatan debrief untuk wali kota</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gunakan angka x, y, nilai resource, dan dampaknya pada tujuan kota…" /></label></div>
      <div className="phase-actions"><span>Debrief ini menjadi laporan strategi untuk guru.</span><button className="primary-btn purple" onClick={submit} disabled={!feasible || !binding || !change}>Klaim reward distrik ✦</button></div>
    </section>
  );
}

