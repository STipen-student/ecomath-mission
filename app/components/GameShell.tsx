"use client";

import { useState } from "react";
import { CaseBriefPanel } from "./CaseBriefPanel";
import { CityGrid } from "./CityGrid";
import { EvidenceLog } from "./EvidenceLog";
import { MathPlanningPanel } from "./MathPlanningPanel";
import { PolyaStepper } from "./PolyaStepper";
import { ReflectionPanel } from "./ReflectionPanel";
import { ScoreSummary } from "./ScoreSummary";
import type { BuildResult, CityCase, EvidenceEntry, MissionReport, Phase } from "../types/game";
import { buildFeedback, missionStatus } from "../lib/assessment";

export function GameShell({ caseData, modeStatus, onReset, onNewCase, studentName, onMissionComplete }: { caseData: CityCase; modeStatus: string; onReset: () => void; onNewCase: () => void; studentName?: string; onMissionComplete?: (report: MissionReport) => void | Promise<void> }) {
  const [phase, setPhase] = useState<Phase>(0); const [scores, setScores] = useState<Array<number | null>>([null, null, null, null]); const [evidence, setEvidence] = useState<EvidenceEntry[]>([]); const [buildResult, setBuildResult] = useState<BuildResult | null>(null); const [complete, setComplete] = useState(false);
  const addEvidence = (atPhase: Phase, type: EvidenceEntry["type"], text: string) => setEvidence((items) => [{ id: `${Date.now()}-${Math.random()}`, phase: atPhase, type, text, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }, ...items]);
  const finishPhase = (index: Phase, score: number, messages: string[]) => {
    setScores((values) => values.map((value, i) => i === index ? score : value));
    messages.forEach((message) => addEvidence(index, index === 0 ? "selection" : index === 1 ? "model" : index === 3 ? "reflection" : "decision", message));
    if (index < 3) setPhase((index + 1) as Phase); else {
      const finalScores = scores.map((value, scoreIndex) => scoreIndex === index ? score : value ?? 0);
      const finalEvidence = [...messages.map((message) => ({ id: `${Date.now()}-${Math.random()}`, phase: index, type: "reflection" as const, text: message, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) })), ...evidence];
      const total = finalScores.reduce((sum, value) => sum + value, 0);
      void onMissionComplete?.({ caseId: caseData.id, caseTitle: caseData.title, cityName: caseData.cityName, difficulty: caseData.difficulty, scores: finalScores, total, status: missionStatus(total), evidence: finalEvidence, decision: buildResult, feedback: buildFeedback(finalScores, finalEvidence) });
      setComplete(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const replay = () => { setPhase(0); setScores([null, null, null, null]); setEvidence([]); setBuildResult(null); setComplete(false); };
  const total = scores.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const resource = (type: "budget" | "land" | "service" | "emission") => caseData.constraints.find((item) => item.type === type);
  return <main className="game-page pixel-game-theme"><header className="game-header"><button className="brand-button" onClick={onReset}><span className="brand-mark"><i /><b /><em /></span><span><strong>EcoMath Mission</strong><small>Sustainability City Challenge</small></span></button><div className="mission-title"><small>MISSION CONTROL</small><strong>{caseData.cityName}</strong><span>{caseData.difficulty}</span></div><div className="header-actions">{studentName && <span className="student-playing">♟ {studentName}</span>}<span className="mode-status"><i />{modeStatus}</span><button onClick={onNewCase}>↻ Kasus baru</button><button onClick={replay}>Reset</button></div></header>
    <section className="city-resource-bar" aria-label="Sumber daya kota"><div><span className="pixel-resource coin">◆</span><small>ANGGARAN</small><strong>{resource("budget")?.limit ?? 0} M</strong></div><div><span className="pixel-resource land">▦</span><small>LAHAN</small><strong>{resource("land")?.limit ?? 0} petak</strong></div><div><span className="pixel-resource people">♟</span><small>TARGET LAYANAN</small><strong>{resource("service")?.limit ?? 0} poin</strong></div><div><span className="pixel-resource carbon">◌</span><small>BATAS EMISI</small><strong>{resource("emission")?.limit ?? 0} CO₂e</strong></div><div className="sim-speed"><small>SIMULATION</small><strong>▮▮ ▶</strong></div></section>
    <PolyaStepper phase={phase} scores={scores} />
    <div className="ecd-score-strip"><span>SKOR ECD</span>{scores.map((score, index) => <i className={score !== null ? "filled" : ""} key={index} />)}<strong>{total}<small>/100</small></strong></div>
    <div className="game-layout"><div className="game-main"><aside className="case-ribbon"><span className="difficulty">{caseData.difficulty}</span><div><small>{caseData.initialCondition}</small><strong>{caseData.variables[0].name} (x) + {caseData.variables[1].name} (y)</strong></div>{caseData.sdgFocus.map((sdg) => <span className="sdg-pill" key={sdg}>{sdg.split("·")[0]}</span>)}</aside>
      {phase === 0 && <CaseBriefPanel key={`${caseData.id}-brief`} caseData={caseData} onComplete={(score, messages) => finishPhase(0, score, messages)} />}
      {phase === 1 && <MathPlanningPanel key={`${caseData.id}-plan`} caseData={caseData} onComplete={(score, messages) => finishPhase(1, score, messages)} />}
      {phase === 2 && <CityGrid key={`${caseData.id}-grid`} caseData={caseData} onEvidence={(type, text) => addEvidence(2, type, text)} onComplete={(score, result) => { setBuildResult(result); finishPhase(2, score, []); }} />}
      {phase === 3 && buildResult && <ReflectionPanel key={`${caseData.id}-reflect`} caseData={caseData} result={buildResult} scores={scores} onComplete={(score, messages) => finishPhase(3, score, messages)} />}
    </div><EvidenceLog entries={evidence} /></div>
    {complete && <ScoreSummary scores={scores.map((score) => score ?? 0)} onReplay={replay} onNewCase={onNewCase} />}
  </main>;
}
