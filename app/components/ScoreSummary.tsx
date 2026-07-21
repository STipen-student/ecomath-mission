import { buildFeedback } from "../lib/assessment";

export function ScoreSummary({ scores, onReplay, onNewCase }: { scores: number[]; onReplay: () => void; onNewCase: () => void }) {
  const total = scores.reduce((sum, value) => sum + value, 0);
  const status = total >= 85 ? "Sangat baik" : total >= 70 ? "Baik" : total >= 55 ? "Cukup" : "Gagal";
  const labels = ["Memahami masalah", "Menyusun rencana", "Melaksanakan rencana", "Melihat kembali"];
  return <div className="modal-backdrop"><section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className={`result-orbit ${status.toLowerCase().replace(" ", "-")}`}><strong>{total}</strong><span>/100</span></div><span className="kicker">MISI SELESAI · LAPORAN TERSIMPAN</span><h2 id="result-title">{status}</h2><p>Skor dibangun dari bukti pada setiap langkah Polya, bukan hanya keputusan akhir.</p><div className="result-bars">{scores.map((score, index) => <div key={labels[index]}><span>{index + 1}</span><div><b>{labels[index]}</b><i><em style={{ width: `${score * 4}%` }} /></i></div><strong>{score}/25</strong></div>)}</div><p className="student-result-feedback">💡 {buildFeedback(scores)}</p><div className="result-actions"><button className="secondary-btn" onClick={onReplay}>Ulangi kasus ini</button><button className="primary-btn" onClick={onNewCase}>Generate kasus baru →</button></div></section></div>;
}
