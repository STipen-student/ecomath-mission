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
    onComplete(Math.round(score), [`Blueprint code: x=${xDef || "belum ditentukan"}, y=${yDef || "belum ditentukan"}.`, `Rule engine SPtLDV: ${model}${nonNegative ? "; x ≥ 0, y ≥ 0" : ""}.`, strategy ? `Strategi build: ${strategy}` : "Catatan strategi belum ditulis."]);
  };

  return (
    <section className="phase-card">
      <div className="phase-title"><span className="phase-number blue">02</span><div><span className="kicker blue">BLUEPRINT LAB</span><h1>Rakit aturan kota sebelum membangun</h1><p>Setiap game punya rule system. Di sini aturan kota disusun sebagai SPtLDV agar Build Mode bisa membaca batas resource.</p></div></div>
      <div className="variable-builder"><div className="variable-card x"><b>x</b><label>Kode bangunan x<select value={xDef} onChange={(e) => setXDef(e.target.value)}><option value="">Pilih makna x…</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label></div><div className="variable-card y"><b>y</b><label>Kode bangunan y<select value={yDef} onChange={(e) => setYDef(e.target.value)}><option value="">Pilih makna y…</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label></div></div>
      <div className="form-section"><div className="section-label"><span>2</span><div><strong>Program rule engine kota</strong><small>Isi koefisien, operator, dan batas agar sistem tahu kapan kota aman atau rawan.</small></div></div><div className="equation-builder">
        {caseData.constraints.map((constraint, index) => <div className="equation-row" key={constraint.id}><span className={`metric-icon ${constraint.type}`}>{constraint.type === "budget" ? "Rp" : constraint.type === "land" ? "▦" : constraint.type === "service" ? "☺" : "CO₂"}</span><strong>{constraint.label}</strong><input aria-label={`${constraint.label} koefisien x`} type="number" min="0" value={rows[index].a} onChange={(e) => update(index, "a", e.target.value)} /><i>x +</i><input aria-label={`${constraint.label} koefisien y`} type="number" min="0" value={rows[index].b} onChange={(e) => update(index, "b", e.target.value)} /><i>y</i><select aria-label={`${constraint.label} operator`} value={rows[index].op} onChange={(e) => update(index, "op", e.target.value as Operator)}><option value="<=">≤</option><option value=">=">≥</option></select><input aria-label={`${constraint.label} batas`} type="number" min="0" value={rows[index].limit} onChange={(e) => update(index, "limit", e.target.value)} /><small>{constraint.unit}</small></div>)}
      </div></div>
      <label className="nonnegative"><input type="checkbox" checked={nonNegative} onChange={(e) => setNonNegative(e.target.checked)} /><span>✓</span><div><strong>Aktifkan aturan jumlah bangunan</strong><small>x ≥ 0 dan y ≥ 0 karena bangunan tidak bisa bernilai negatif.</small></div></label>
      <label className="strategy-field"><span>Catatan strategi planner</span><textarea value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="Contoh: Saya akan mencari kombinasi x dan y yang aman untuk semua resource, lalu memilih layanan terbesar…" /></label>
      <div className="model-summary"><small>BLUEPRINT SPtLDV</small><p>{rows.map((r) => `${r.a || "a"}x + ${r.b || "b"}y ${symbol(r.op)} ${r.limit || "L"}`).join("  ·  ")}</p></div>
      <div className="phase-actions"><span>Blueprint yang rapi membuka peluang skor reputasi lebih tinggi.</span><button className="primary-btn blue" onClick={submit}>Kirim blueprint ke Build Mode →</button></div>
    </section>
  );
}

