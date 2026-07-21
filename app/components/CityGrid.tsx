"use client";

import { useMemo, useState } from "react";
import { satisfies } from "../lib/localCaseGenerator";
import type { BuildResult, CityCase, EvidenceEntry, Tile } from "../types/game";

const typeIcon = { budget: "Rp", land: "▦", service: "☺", emission: "CO₂" };

export function Dashboard({ caseData, x, y }: { caseData: CityCase; x: number; y: number }) {
  return <div className="dashboard-grid">{caseData.constraints.map((constraint) => {
    const value = constraint.a * x + constraint.b * y; const met = satisfies(constraint, x, y);
    const ratio = constraint.op === "<=" ? Math.min(100, value / constraint.limit * 100) : Math.min(100, value / constraint.limit * 100);
    return <article className={`metric-card ${met ? "met" : "unmet"}`} key={constraint.id}><div><span className={`metric-icon ${constraint.type}`}>{typeIcon[constraint.type]}</span><small>{constraint.label}</small><b>{met ? "AMAN" : "RAWAN"}</b></div><strong>{value}<small> / {constraint.op === "<=" ? "maks." : "min."} {constraint.limit} {constraint.unit}</small></strong><div className="meter"><i style={{ width: `${ratio}%` }} /></div><p>{constraint.a}x + {constraint.b}y {constraint.op === "<=" ? "≤" : "≥"} {constraint.limit}</p></article>;
  })}</div>;
}

export function CityGrid({ caseData, onEvidence, onComplete }: { caseData: CityCase; onEvidence: (type: EvidenceEntry["type"], text: string) => void; onComplete: (score: number, result: BuildResult) => void }) {
  const [grid, setGrid] = useState<Tile[]>(Array(35).fill(null)); const [tool, setTool] = useState<Tile>("x");
  const [lastSignature, setLastSignature] = useState(""); const [checks, setChecks] = useState(0); const [revisions, setRevisions] = useState(0); const [flash, setFlash] = useState("");
  const x = grid.filter((tile) => tile === "x").length; const y = grid.filter((tile) => tile === "y").length; const parks = grid.filter((tile) => tile === "park").length;
  const values = useMemo(() => caseData.constraints.map((constraint) => ({ constraint, value: constraint.a * x + constraint.b * y, met: satisfies(constraint, x, y) })), [caseData, x, y]);
  const allMet = values.every((item) => item.met);
  const metCount = values.filter((item) => item.met).length;
  const cityMood = allMet && x + y > 0 ? { label: "Kota hidup", detail: "Warga mulai merasakan layanan tanpa resource jebol.", tone: "good" } : checks > 0 ? { label: "Kota rawan", detail: "Ada resource yang perlu ditata ulang sebelum distrik dikunci.", tone: "risk" } : { label: "Zona rencana", detail: "Tempatkan bangunan, lalu scan kota untuk melihat dampaknya.", tone: "idle" };

  const place = (index: number) => {
    const next = [...grid];
    if (tool === "park" && grid[index] !== "park" && parks >= caseData.optionalParkLimit) { setFlash(`Slot bonus ruang hijau dibatasi ${caseData.optionalParkLimit} petak.`); return; }
    next[index] = tool === null ? null : (grid[index] === tool ? null : tool);
    setGrid(next); setFlash("");
  };
  const checkPlan = () => {
    const signature = `${x}-${y}-${parks}`;
    let nextRevisions = revisions;
    if (lastSignature && signature !== lastSignature) { nextRevisions += 1; setRevisions(nextRevisions); onEvidence("revision", `Build direvisi menjadi x=${x}, y=${y} setelah scan kota sebelumnya.`); }
    const violations = values.filter((item) => !item.met).map((item) => item.constraint.label);
    onEvidence(violations.length ? "warning" : "decision", violations.length ? `City scan x=${x}, y=${y}: zona rawan pada ${violations.join(", ")}.` : `City scan x=${x}, y=${y}: semua resource aman.`);
    setLastSignature(signature); setChecks(checks + 1); setFlash(violations.length ? `Alarm kota: ${violations.join(", ")} perlu diperbaiki.` : "Distrik stabil. Desain bisa dikunci.");
  };
  const lock = () => {
    const metPoints = Math.round(values.filter((item) => item.met).length / values.length * 16);
    const service = values.find((item) => item.constraint.type === "service")?.value ?? 0;
    const ratio = caseData.recommendedRange.optimalService ? service / caseData.recommendedRange.optimalService : 0;
    const efficiency = allMet ? ratio >= .9 ? 6 : ratio >= .75 ? 4 : ratio >= .6 ? 3 : 1 : 0;
    const diversity = x > 0 && y > 0 ? 1 : 0;
    const process = (checks > 0 ? 1 : 0) + (revisions > 0 || (checks > 0 && allMet) ? 1 : 0);
    const score = Math.min(25, metPoints + efficiency + diversity + process);
    if (checks === 0) onEvidence("warning", "Desain dikunci tanpa scan kota; reputasi proses berkurang karena tidak ada uji resource.");
    onEvidence("decision", `Desain distrik dikunci: x=${x}, y=${y}; ${metCount}/${values.length} resource aman.`);
    onComplete(score, { x, y, checks, revisions, values });
  };

  const toolButton = (value: Tile, label: string, kind: string) => <button className={tool === value ? `tool active ${kind}` : `tool ${kind}`} onClick={() => setTool(value)}><span className={`building-symbol ${kind}`} />{label}</button>;
  return (
    <section className="phase-card execute-card">
      <div className="phase-title"><span className="phase-number orange">03</span><div><span className="kicker orange">BUILD MODE</span><h1>Bangun distrik dan jaga resource tetap aman</h1><p>Tempatkan bangunan seperti city-builder. Setiap tile mengubah x dan y, lalu dashboard menunjukkan apakah kota stabil.</p></div></div>
      <Dashboard caseData={caseData} x={x} y={y} />
      <div className="builder-layout"><div className="map-panel"><div className="map-toolbar"><span className="map-title"><i/> DISTRIK A-07</span><span>x = <b>{x}</b> · y = <b>{y}</b></span></div><div className="city-viewport"><div className="map-coordinate top">N</div><div className="map-coordinate bottom">GRID 7×5</div><span className="map-cloud one"/><span className="map-cloud two"/><div className="city-grid" role="grid" aria-label="Peta kota 7 kali 5">{grid.map((tile, index) => <button key={index} role="gridcell" aria-label={`Petak ${index + 1}: ${tile ?? "kosong"}`} className={`city-tile ${tile ? `filled ${tile}` : ""}`} onClick={() => place(index)}><span className="lot-code">{index + 1}</span>{tile && <span className={`building-shape ${tile === "x" ? caseData.variables[0].kind : tile === "y" ? caseData.variables[1].kind : tile}`}><i /><b /><em /></span>}</button>)}</div></div><div className="build-dock"><small>BUILD MENU</small><div>{toolButton("x", caseData.variables[0].shortName, caseData.variables[0].kind)}{toolButton("y", caseData.variables[1].shortName, caseData.variables[1].kind)}{toolButton("park", "Ruang hijau", "park")}{toolButton(null, "Bulldozer", "erase")}</div></div><p className="map-note">Ruang hijau adalah bonus visual (maks. {caseData.optionalParkLimit}) dan tidak menambah variabel baru.</p></div>
        <aside className="decision-panel"><span className="kicker">CITY STATUS</span><div className="xy-total"><div><b>x</b><strong>{x}</strong><small>{caseData.variables[0].shortName}</small></div><div><b>y</b><strong>{y}</strong><small>{caseData.variables[1].shortName}</small></div></div><div className={`feasible-state ${allMet ? "ok" : ""}`}><span>{allMet ? "✓" : "!"}</span><div><strong>{allMet ? "Distrik stabil" : "Alarm resource"}</strong><small>{metCount}/{values.length} resource aman</small></div></div><div className={`city-mood ${cityMood.tone}`}><b>{cityMood.label}</b><small>{cityMood.detail}</small></div>{flash && <p className="feedback-box">{flash}</p>}<button className="secondary-btn full" onClick={checkPlan}>Scan kota</button><button className="primary-btn full" onClick={lock} disabled={x + y === 0}>Lock desain distrik →</button><small className="attempts">{checks} scan · {revisions} revisi build terekam</small></aside>
      </div>
    </section>
  );
}