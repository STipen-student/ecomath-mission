"use client";

import { useState } from "react";
import type { CityCase, Operator } from "../types/game";

type Row = { a: string; b: string; op: Operator; limit: string };

export function MathPlanningPanel({ caseData, onComplete }: { caseData: CityCase; onComplete: (score: number, evidence: string[]) => void }) {
  const [xDef, setXDef] = useState(""); const [yDef, setYDef] = useState("");
  const [rows, setRows] = useState<Row[]>(caseData.constraints.map(() => ({ a: "", b: "", op: "<=", limit: "" })));
  const [nonNegative, setNonNegative] = useState(false); const [strategy, setStrategy] = useState("");
  const options = [caseData.variables[0].name, caseData.variables[1].name, "Jumlah seluruh warga", "Sisa anggaran"];
  const update = (index: number, key: keyof Row, value: string) => setRows(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const symbol = (op: Operator) => op === "<=" ? "≤" : "≥";

  const submit = () => {
    let score = (xDef === caseData.variables[0].name ? 2.5 : 0) + (yDef === caseData.variables[1].name ? 2.5 : 0);
    rows.forEach((row, index) => {
      const correct = caseData.constraints[index];
      score += Number(row.a) === correct.a ? 1 : 0;
      score += Number(row.b) === correct.b ? 1 : 0;
      score += row.op === correct.op ? 1 : 0;
      score += Number(row.limit) === correct.limit ? 1 : 0;
    });
    score += nonNegative ? 2 : 0;
    score += strategy.trim().length >= 20 ? 2 : 0;
    const model = rows.map((row) => `${row.a || "?"}x + ${row.b || "?"}y ${symbol(row.op)} ${row.limit || "?"}`).join("; ");
    onComplete(Math.round(score), [`Definisi variabel: x=${xDef || "belum ditentukan"}, y=${yDef || "belum ditentukan"}.`, `Model yang disusun: ${model}${nonNegative ? "; x ≥ 0, y ≥ 0" : ""}.`, strategy ? `Strategi: ${strategy}` : "Alasan strategi belum ditulis."]);
  };

  return (
    <section className="phase-card">
      <div className="phase-title"><span className="phase-number blue">02</span><div><span className="kicker blue">LANGKAH POLYA</span><h1>Menyusun rencana</h1><p>Terjemahkan konteks kota menjadi model SPtLDV.</p></div></div>
      <div className="variable-builder"><div className="variable-card x"><b>x</b><label>Definisi variabel x<select value={xDef} onChange={(e) => setXDef(e.target.value)}><option value="">Pilih makna x…</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label></div><div className="variable-card y"><b>y</b><label>Definisi variabel y<select value={yDef} onChange={(e) => setYDef(e.target.value)}><option value="">Pilih makna y…</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label></div></div>
      <div className="form-section"><div className="section-label"><span>2</span><div><strong>Bangun model pertidaksamaan</strong><small>Isi koefisien, operator, dan batas berdasarkan briefing.</small></div></div><div className="equation-builder">
        {caseData.constraints.map((constraint, index) => <div className="equation-row" key={constraint.id}><span className={`metric-icon ${constraint.type}`}>{constraint.type === "budget" ? "Rp" : constraint.type === "land" ? "▦" : constraint.type === "service" ? "☺" : "CO₂"}</span><strong>{constraint.label}</strong><input aria-label={`${constraint.label} koefisien x`} type="number" min="0" value={rows[index].a} onChange={(e) => update(index, "a", e.target.value)} /><i>x +</i><input aria-label={`${constraint.label} koefisien y`} type="number" min="0" value={rows[index].b} onChange={(e) => update(index, "b", e.target.value)} /><i>y</i><select aria-label={`${constraint.label} operator`} value={rows[index].op} onChange={(e) => update(index, "op", e.target.value as Operator)}><option value="<=">≤</option><option value=">=">≥</option></select><input aria-label={`${constraint.label} batas`} type="number" min="0" value={rows[index].limit} onChange={(e) => update(index, "limit", e.target.value)} /><small>{constraint.unit}</small></div>)}
      </div></div>
      <label className="nonnegative"><input type="checkbox" checked={nonNegative} onChange={(e) => setNonNegative(e.target.checked)} /><span>✓</span><div><strong>Tambahkan kendala non-negativitas</strong><small>x ≥ 0 dan y ≥ 0 karena jumlah bangunan tidak mungkin negatif.</small></div></label>
      <label className="strategy-field"><span>Strategi rencana</span><textarea value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="Contoh: Saya akan mencari titik bilangan bulat yang memenuhi semua kendala, lalu membandingkan poin layanannya…" /></label>
      <div className="model-summary"><small>RINGKASAN MODEL</small><p>{rows.map((r) => `${r.a || "a"}x + ${r.b || "b"}y ${symbol(r.op)} ${r.limit || "L"}`).join("  ·  ")}</p></div>
      <div className="phase-actions"><span>Validasi ringan menilai setiap unsur model.</span><button className="primary-btn blue" onClick={submit}>Validasi & bangun kota →</button></div>
    </section>
  );
}

