"use client";

import { useState } from "react";
import type { CityCase } from "../types/game";

export function CaseBriefPanel({ caseData, onComplete }: { caseData: CityCase; onComplete: (score: number, evidence: string[]) => void }) {
  const [facts, setFacts] = useState<string[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [constraints, setConstraints] = useState<string[]>([]);

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) => setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const submit = () => {
    const relevant = caseData.facts.filter((fact) => fact.relevant);
    const selectedRelevant = relevant.filter((fact) => facts.includes(fact.id)).length;
    const selectedNoise = caseData.facts.filter((fact) => !fact.relevant && facts.includes(fact.id)).length;
    const factScore = Math.max(0, Math.round((selectedRelevant / relevant.length) * 10 - selectedNoise * 1.5));
    const goalScore = goal === caseData.correctGoal ? 7 : 0;
    const correctConstraints = caseData.constraintOptions.filter((item) => item.correct);
    const selectedCorrect = correctConstraints.filter((item) => constraints.includes(item.id)).length;
    const selectedWrong = caseData.constraintOptions.filter((item) => !item.correct && constraints.includes(item.id)).length;
    const constraintScore = Math.max(0, Math.round((selectedCorrect / correctConstraints.length) * 8 - selectedWrong * 1.5));
    const score = Math.min(25, factScore + goalScore + constraintScore);
    onComplete(score, [
      `Intel scan: ${facts.length} kartu dibuka; ${selectedRelevant} intel relevan dan ${selectedNoise} rumor terambil.`,
      `Quest utama ${goal === caseData.correctGoal ? "terkunci tepat" : "belum tepat"}; ${selectedCorrect}/${correctConstraints.length} aturan kota dikenali.`,
    ]);
  };

  return (
    <section className="phase-card">
      <div className="phase-title"><span className="phase-number">01</span><div><span className="kicker">QUEST PHASE</span><h1>Intel Scan: baca kota, temukan petunjuk</h1><p>Kamu tidak sedang menjawab soal; kamu sedang memilah rumor dan intel agar blueprint kota tidak salah arah.</p></div></div>
      <div className="brief-banner"><div><span className="difficulty">{caseData.difficulty}</span><h2>{caseData.title}</h2><p>{caseData.scenario}</p></div><div className="sdg-stack">{caseData.sdgFocus.map((sdg) => <span key={sdg}>{sdg}</span>)}</div></div>
      <div className="form-section">
        <div className="section-label"><span>1</span><div><strong>Kumpulkan intel penting</strong><small>Ada rumor pengalih. Pilih kartu yang benar-benar memengaruhi pembangunan.</small></div></div>
        <div className="choice-grid facts">
          {caseData.facts.map((fact) => <label className={facts.includes(fact.id) ? "choice checked" : "choice"} key={fact.id}><input type="checkbox" checked={facts.includes(fact.id)} onChange={() => toggle(fact.id, facts, setFacts)} /><span className="checkmark">✓</span><span>{fact.text}</span></label>)}
        </div>
      </div>
      <div className="form-section two-up">
        <div><div className="section-label"><span>2</span><div><strong>Kunci quest utama</strong><small>Pilih objektif kota yang harus kamu menangkan.</small></div></div><div className="radio-list">{caseData.goalOptions.map((option, index) => <label className={goal === index ? "radio-choice checked" : "radio-choice"} key={option}><input type="radio" name="goal" checked={goal === index} onChange={() => setGoal(index)} /><i />{option}</label>)}</div></div>
        <div><div className="section-label"><span>3</span><div><strong>Kenali aturan level</strong><small>Ini adalah batas resource game: kas, lahan, layanan, dan emisi.</small></div></div><div className="chip-list">{caseData.constraintOptions.map((item) => <button type="button" className={constraints.includes(item.id) ? "chip active" : "chip"} key={item.id} onClick={() => toggle(item.id, constraints, setConstraints)}>{constraints.includes(item.id) ? "✓ " : "+ "}{item.text}</button>)}</div></div>
      </div>
      <div className="phase-actions"><span>{facts.length} kartu intel · {constraints.length} aturan level dipilih</span><button className="primary-btn" onClick={submit} disabled={goal === null}>Masuk Blueprint Lab →</button></div>
    </section>
  );
}

