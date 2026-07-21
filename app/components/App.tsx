"use client";

import { useState } from "react";
import { GameShell } from "./GameShell";
import { DEFAULT_CASE, DEFAULT_CASE_PACK } from "../lib/localCaseGenerator";
import { caseGeneratorService } from "../services/caseGeneratorService";
import type { CityCase, MissionReport, ProviderMode } from "../types/game";

const getLimit = (mission: CityCase, type: "budget" | "land" | "service" | "emission") => mission.constraints.find((item) => item.type === type)?.limit ?? 0;

export function App({ embedded = false, studentName, onMissionComplete }: { embedded?: boolean; studentName?: string; onMissionComplete?: (report: MissionReport) => void | Promise<void> }) {
  const [caseData, setCaseData] = useState<CityCase>(DEFAULT_CASE);
  const [casePack, setCasePack] = useState<CityCase[]>(DEFAULT_CASE_PACK);
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_CASE_PACK.slice(0, 4).map((mission) => mission.id));
  const [sessionCases, setSessionCases] = useState<CityCase[]>([]);
  const [missionIndex, setMissionIndex] = useState(0);
  const [sessionReports, setSessionReports] = useState<MissionReport[]>([]);
  const [provider, setProvider] = useState<ProviderMode>("local");
  const [modeStatus, setModeStatus] = useState("Local Mission Pack");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [help, setHelp] = useState(false);

  const selectedCases = casePack.filter((mission) => selectedIds.includes(mission.id));
  const canStart = selectedIds.length >= 4 && selectedIds.length <= 5;

  const toggleMission = (missionId: string) => {
    setSelectedIds((ids) => {
      if (ids.includes(missionId)) return ids.filter((id) => id !== missionId);
      if (ids.length >= 5) return ids;
      return [...ids, missionId];
    });
  };

  const startCampaign = () => {
    if (!canStart) {
      setNotice("Pilih 4–5 distrik untuk memulai satu sesi permainan.");
      return;
    }
    const missions = selectedCases.length ? selectedCases : casePack.slice(0, 4);
    setSessionCases(missions);
    setCaseData(missions[0]);
    setMissionIndex(0);
    setSessionReports([]);
    setNotice("");
    setPlaying(true);
  };

  const generate = async (startAfter = false) => {
    setLoading(true);
    setNotice("");
    const result = await caseGeneratorService.generatePack(provider, 10);
    const nextPack = result.cases.length ? result.cases : DEFAULT_CASE_PACK;
    const nextSelection = nextPack.slice(0, 4).map((mission) => mission.id);
    setCasePack(nextPack);
    setSelectedIds(nextSelection);
    setCaseData(nextPack[0]);
    setModeStatus(result.status);
    setNotice(result.notice ?? "10 distrik baru siap. Pilih 4–5 misi untuk satu sesi.");
    setLoading(false);
    if (startAfter) {
      setSessionCases(nextPack.slice(0, 4));
      setMissionIndex(0);
      setSessionReports([]);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  };

  const advanceMission = () => {
    if (missionIndex < sessionCases.length - 1) {
      const nextIndex = missionIndex + 1;
      setMissionIndex(nextIndex);
      setCaseData(sessionCases[nextIndex]);
    } else {
      const average = sessionReports.length ? Math.round(sessionReports.reduce((sum, report) => sum + report.total, 0) / sessionReports.length) : 0;
      setPlaying(false);
      setNotice(`Campaign selesai. Rata-rata reputasi kota: ${average}/100. Kamu bisa pilih distrik lain atau generate peta baru.`);
    }
  };

  const activeCase = sessionCases[missionIndex] ?? caseData;

  if (playing) {
    return <GameShell key={`${activeCase.id}-${missionIndex}`} caseData={activeCase} modeStatus={modeStatus} onReset={() => setPlaying(false)} onNewCase={advanceMission} nextActionLabel={missionIndex < sessionCases.length - 1 ? "Lanjut distrik berikutnya →" : "Selesai & kembali ke peta"} missionMeta={{ current: missionIndex + 1, total: sessionCases.length, completed: sessionReports.length }} studentName={studentName} onMissionComplete={async (report) => {
      setSessionReports((reports) => [...reports, report]);
      await onMissionComplete?.(report);
    }} />;
  }

  return <main className={`landing-page pixel-game-theme ${embedded ? "embedded-game" : ""}`}><header className="landing-header"><div className="brand-static"><span className="brand-mark"><i /><b /><em /></span><span><strong>EcoMath Mission</strong><small>Sustainability City Challenge</small></span></div><div className="landing-badges"><span className="mode-status"><i />{modeStatus}</span><span className="sdg-pill">10 Distrik</span><span className="sdg-pill blue">Pilih 4–5 Misi</span></div></header>
    <section className="hero campaign-hero"><div className="hero-copy"><span className="kicker"><i /> ORIGINAL ISOMETRIC CITY CAMPAIGN · SPtLDV</span><h1>EcoMath Mission.<br /><em>Taklukkan peta kota.</em></h1><p>Pilih jalur distrik, kelola resource, bangun kota, dan naikkan reputasi planner. Semua keputusanmu terekam sebagai jejak strategi permainan untuk laporan guru.</p><div className="hero-actions account-actions">{embedded ? <button className="primary-btn jumbo" onClick={startCampaign}>▶ MULAI CAMPAIGN</button> : <><a className="primary-btn jumbo" href="/portal?role=student">🎒 MASUK SISWA</a><a className="secondary-btn jumbo" href="/portal?role=teacher">📋 PORTAL GURU</a></>}<button className="secondary-btn jumbo" onClick={() => setHelp(true)}>? PANDUAN</button></div>{!embedded && <button className="guest-play" onClick={startCampaign}>Coba campaign tanpa menyimpan laporan →</button>}
      <div className="generator-box"><div><small>GENERATOR PETA MISI</small><div className="provider-toggle"><button className={provider === "local" ? "active" : ""} onClick={() => setProvider("local")}>Local</button><button className={provider === "ai" ? "active" : ""} onClick={() => setProvider("ai")}>AI <small>if available</small></button></div></div><button className="generate-link" onClick={() => generate(false)} disabled={loading}><span className={loading ? "spin" : ""}>↻</span>{loading ? "Menyiapkan…" : "Generate 10 distrik"}</button></div>
      {notice && <div className={notice.startsWith("AI unavailable") || notice.startsWith("Pilih") ? "landing-notice warning" : "landing-notice"}>{notice}</div>}
      <div className="microcopy"><span>✓ 10 kasus lokal</span><span>✓ Pilih 4–5 misi</span><span>✓ Jejak strategi tersimpan</span><span>✓ Gameplay lebih dominan</span></div>
    </div>
    <div className="hero-visual"><div className="visual-halo" /><span className="pixel-cloud cloud-a"/><span className="pixel-cloud cloud-b"/><div className="float-card mission"><span>◎</span><div><small>DISTRIK TERPILIH</small><strong>{selectedIds.length}/5 misi</strong></div></div><div className="city-board"><div className="terrain-patch patch-a"/><div className="terrain-patch patch-b"/><div className="road horizontal"/><div className="road vertical"/><div className="css-building a"><i/><i/><i/></div><div className="css-building b"><i/><i/></div><div className="css-building c"><i/><i/></div><div className="css-tree one"><i/></div><div className="css-tree two"><i/></div><div className="blue-route"><i/><b/><em/></div></div><div className="float-card target"><div className="target-ring">{Math.max(0, selectedIds.length)}</div><div><small>QUEST CHAIN</small><strong>4–5 distrik</strong></div></div><div className="pixel-mini-hud"><span><small>KAS</small><b>{getLimit(caseData, "budget")} M</b></span><span><small>LAHAN</small><b>{getLimit(caseData, "land")}</b></span><span><small>EMISI</small><b>{getLimit(caseData, "emission")}</b></span></div><article className="case-preview"><div><span className="difficulty">{caseData.difficulty}</span><small>PREVIEW DISTRIK</small></div><h2>{caseData.title}</h2><p>{caseData.initialCondition}</p><footer>{caseData.sdgFocus.map((item) => <span key={item}>{item.split("·")[0]}</span>)}</footer></article></div></section>
    <PlayPrinciples />
    <MissionBoard missions={casePack} selectedIds={selectedIds} loading={loading} onToggle={toggleMission} onPreview={setCaseData} onStart={startCampaign} onGenerate={() => generate(false)} />
    <footer className="page-footer"><span>EcoMath Mission</span><i>•</i><span>Campaign City Builder</span><i>•</i><span>SDG 11 & 13</span></footer>
    {help && <div className="modal-backdrop" onMouseDown={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" aria-label="Tutup" onClick={() => setHelp(false)}>×</button><span className="kicker">CARA BERMAIN</span><h2 id="help-title">Satu campaign, beberapa distrik</h2><ol><li><b>01</b><div><strong>Pilih 4–5 distrik</strong><p>Setiap distrik adalah kasus kota berbeda dengan angka dan kendala sendiri.</p></div></li><li><b>02</b><div><strong>Mainkan quest kota</strong><p>Buka intel, buat blueprint, lalu bangun distrik di grid.</p></div></li><li><b>03</b><div><strong>Jaga resource</strong><p>Kas, lahan, layanan, dan emisi menjadi aturan permainan.</p></div></li><li><b>04</b><div><strong>Naikkan reputasi</strong><p>Reward distrik muncul dari strategi, scan resource, revisi, dan keputusan akhir.</p></div></li></ol><button className="primary-btn full" onClick={() => { setHelp(false); startCampaign(); }}>Saya siap mulai →</button></section></div>}
  </main>;
}

function PlayPrinciples() {
  const items = [
    ["Tujuan", "Naikkan reputasi kota dengan distrik yang stabil."],
    ["Aturan", "Kas, lahan, layanan, dan emisi menjadi batas permainan."],
    ["Pilihan", "Pemain bebas memilih 4–5 distrik dan menyusun bangunan."],
    ["Feedback", "Scan kota memberi alarm resource secara langsung."],
    ["Reward", "Badge dan XP muncul dari strategi, revisi, dan keputusan."],
  ];
  return <section className="play-principles"><div><span className="kicker orange"><i />GAME ASSESSMENT LOOP</span><h2>Bermain dulu, berpikir Polya tanpa terasa</h2><p>Polya tidak diposisikan sebagai halaman tes. Ia menjadi alur alami di balik gameplay: pemain membaca situasi, menyusun aturan, mencoba desain, lalu mengecek hasil kota.</p></div><div>{items.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}</div></section>;
}

function MissionBoard({ missions, selectedIds, loading, onToggle, onPreview, onStart, onGenerate }: { missions: CityCase[]; selectedIds: string[]; loading: boolean; onToggle: (missionId: string) => void; onPreview: (mission: CityCase) => void; onStart: () => void; onGenerate: () => void }) {
  const totalBudget = missions.filter((mission) => selectedIds.includes(mission.id)).reduce((sum, mission) => sum + getLimit(mission, "budget"), 0);
  return <section className="mission-board" id="mission-board"><div className="mission-board-head"><div><span className="kicker blue"><i />PETA MISI</span><h2>Pilih 4–5 distrik untuk satu permainan</h2><p>Setiap kartu adalah level city-building berbeda. Siswa bebas menentukan jalur bermainnya, sementara sistem menyimpan quest trace per misi untuk laporan guru.</p></div><aside><small>DIPILIH</small><strong>{selectedIds.length}/5</strong><span>Total kas peta: {totalBudget} M</span></aside></div><div className="mission-grid-select">{missions.map((mission, index) => {
    const selected = selectedIds.includes(mission.id);
    const locked = !selected && selectedIds.length >= 5;
    return <article className={`mission-node ${selected ? "selected" : ""} ${locked ? "locked" : ""}`} key={mission.id} onMouseEnter={() => onPreview(mission)}><button type="button" onClick={() => onToggle(mission.id)} disabled={locked}><span className="node-number">{String(index + 1).padStart(2, "0")}</span><span className="node-map-icon">{mission.variables[0].kind === "park" ? "🌳" : mission.variables[0].kind === "solar" ? "☀" : mission.variables[0].kind === "transit" ? "🚌" : "🏙"}</span><b>{selected ? "TERPILIH" : locked ? "MAKS" : "PILIH"}</b></button><div><small>{mission.cityName} · {mission.difficulty}</small><h3>{mission.title}</h3><p>{mission.initialCondition}</p><footer><span>Kas {getLimit(mission, "budget")}M</span><span>Lahan {getLimit(mission, "land")}</span><span>Emisi {getLimit(mission, "emission")}</span></footer></div></article>;
  })}</div><div className="mission-board-actions"><button className="secondary-btn" onClick={onGenerate} disabled={loading}>{loading ? "Menyiapkan peta…" : "↻ Generate peta 10 distrik"}</button><button className="primary-btn" onClick={onStart} disabled={selectedIds.length < 4 || selectedIds.length > 5}>▶ Mulai {selectedIds.length || 0} misi terpilih</button></div></section>;
}
