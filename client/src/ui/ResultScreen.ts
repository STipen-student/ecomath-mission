/**
 * Layar hasil satu level dan ringkasan akhir sesi.
 *
 * Umpan balik ditampilkan sebagai PROFIL empat klaim, bukan satu angka tunggal,
 * sesuai Student Model pada dokumen ECD.
 *
 * Yang dibaca siswa adalah kalimat dari scoring/feedback.ts - bukan deskriptor
 * rubrik mentah. Deskriptor asli ditulis untuk peneliti dan memuat istilah
 * seperti "boundary_violation_count"; kalimat seperti itu tidak dapat
 * ditindaklanjuti siswa SMA yang baru selesai mengerjakan. Deskriptor tetap
 * dikirim server pada field `rubric` dan dapat dibaca guru di halaman laporan.
 */

import type { StudentFeedback, SubmitResponse, TaskDto } from '../api/types.js';
import { cornerCandidates, objectiveValue } from '../game/geometry.js';
import { el, num } from './dom.js';

/** Riwayat satu level untuk ringkasan akhir sesi. */
export interface RiwayatLevel {
  level: number;
  rawSum: number;
  feedback: StudentFeedback[];
}

function barSkor(score: number): HTMLElement {
  const bar = el('div', { class: 'score-bar' });
  for (let i = 1; i <= 3; i++) {
    bar.append(el('span', { class: `score-seg ${i <= score ? 'is-filled' : ''}` }));
  }
  return bar;
}

function barisKlaim(f: StudentFeedback): HTMLElement {
  return el(
    'div',
    { class: 'score-row' },
    el(
      'div',
      { class: 'score-head' },
      el('span', {}, `${f.claim} · ${f.title}`),
      el('span', { class: 'score-num' }, `${f.score}/3`),
    ),
    barSkor(f.score),
    el('p', { class: 'fb-summary' }, f.summary),
    el('p', { class: 'fb-suggestion' }, el('span', { class: 'fb-tag' }, 'LANGKAH BERIKUTNYA'), f.suggestion),
  );
}

/**
 * Kunci jawaban lengkap, ditampilkan hanya SETELAH level disubmit.
 *
 * Amannya membocorkan kendala tersirat di sini berbeda dari saat bermain:
 * `task.constraints` sudah ada di memori client sejak task dimuat (lihat
 * `server/src/routes/task.routes.ts`), tetapi selama pengerjaan UI sengaja
 * menyembunyikannya (`PlayScreen.disembunyikan()`) supaya siswa menyimpulkan
 * sendiri. Begitu level selesai, tujuan berbalik: siswa perlu bahan belajar
 * yang lengkap untuk mencocokkan hasil kerjanya dengan jawaban yang benar.
 */
function kunciJawabanSection(task: TaskDto, hasil: SubmitResponse): HTMLElement {
  const kendalaBaris = task.constraints
    .filter((k) => k.kind !== 'bounding_box')
    .map((k) =>
      el(
        'li',
        { class: 'key-constraint' },
        el('span', { class: 'key-constraint-label' }, k.label),
        el('code', {}, k.display),
        k.kind === 'implicit' ? el('span', { class: 'key-tag' }, 'TERSIRAT') : null,
      ),
    );

  const adaTujuan = task.objective.type !== 'none';
  const kandidat = cornerCandidates(task.constraints, task.variables.x.max, task.variables.y.max);

  const titikBaris = kandidat.map((p) => {
    const z = adaTujuan ? objectiveValue(task.objective, p.x, p.y) : null;
    const isTerbaik =
      adaTujuan &&
      hasil.optimum?.point !== null &&
      hasil.optimum?.point !== undefined &&
      Math.abs(p.x - hasil.optimum.point.x) < 0.01 &&
      Math.abs(p.y - hasil.optimum.point.y) < 0.01;

    return el(
      'div',
      { class: `key-corner${isTerbaik ? ' is-best' : ''}` },
      el('code', {}, `(${num(p.x)}, ${num(p.y)})`),
      z !== null ? el('span', { class: 'key-corner-z' }, `Z = ${num(z)}`) : null,
      isTerbaik ? el('span', { class: 'key-tag key-tag-best' }, '★ TERBAIK') : null,
    );
  });

  const kesimpulan =
    adaTujuan && hasil.optimum?.point
      ? el(
          'p',
          { class: 'key-conclusion' },
          `${task.objective.type === 'max' ? 'Karena tujuannya memaksimalkan' : 'Karena tujuannya meminimalkan'} ${task.objective.label}, titik terbaiknya adalah (${num(
            hasil.optimum.point.x,
          )}, ${num(hasil.optimum.point.y)})${hasil.optimum.z !== null ? ` dengan Z = ${num(hasil.optimum.z)}` : ''}.`,
        )
      : el(
          'p',
          { class: 'key-conclusion' },
          'Level ini tidak punya fungsi tujuan untuk dimaksimalkan atau diminimalkan — SEMUA titik di dalam atau di batas daerah penyelesaian (bukan cuma titik pojoknya) adalah jawaban yang benar.',
        );

  return el(
    'details',
    { class: 'answer-key' },
    el('summary', {}, '📘  LIHAT KUNCI JAWABAN'),
    el('div', { class: 'key-body' }, el('h4', {}, 'Kendala yang seharusnya ditulis'), el('ul', { class: 'key-constraint-list' }, ...kendalaBaris)),
    adaTujuan ? el('p', { class: 'key-objective' }, task.objective.display) : null,
    kandidat.length > 0
      ? el('div', { class: 'key-body' }, el('h4', {}, 'Titik pojok daerah penyelesaian'), ...titikBaris)
      : null,
    kesimpulan,
  );
}

export function renderResultScreen(
  root: HTMLElement,
  data: {
    hasil: SubmitResponse;
    task: TaskDto;
    level: number;
    totalLevels: number;
    adaLevelBerikutnya: boolean;
  },
  onLanjut: () => void,
): void {
  const { hasil, task } = data;

  const catatanOptimum =
    hasil.optimum && hasil.optimum.point
      ? el(
          'p',
          { class: 'optimum-note' },
          `TITIK TERBAIK: (${num(hasil.optimum.point.x)}, ${num(hasil.optimum.point.y)})`,
          hasil.optimum.z !== null ? `  ·  Z = ${num(hasil.optimum.z)}` : '',
        )
      : null;

  const tombol = el(
    'button',
    { class: 'btn btn-primary btn-block' },
    data.adaLevelBerikutnya ? `▶  LANJUT KE LEVEL ${data.level + 1}` : '▶  RINGKASAN AKHIR',
  );
  tombol.addEventListener('click', onLanjut);

  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card' },
        el(
          'div',
          { class: 'result-head' },
          el('span', { class: 'lvl-badge' }, `LV${data.level}`),
          el('h2', {}, 'LEVEL SELESAI'),
        ),
        hasil.overallMessage ? el('p', { class: 'overall-msg' }, hasil.overallMessage) : null,
        el(
          'div',
          { class: 'result-summary' },
          el('div', { class: 'summary-item' }, el('span', {}, 'SKOR'), el('strong', {}, `${hasil.rawSum}/12`)),
          el('div', { class: 'summary-item' }, el('span', {}, 'KOMPOSIT'), el('strong', {}, `${num(hasil.weightedComposite)}/3`)),
          el(
            'div',
            { class: 'summary-item' },
            el('span', {}, 'SOLUSI'),
            el(
              'strong',
              { class: hasil.finalPositionValid ? 'ok' : 'bad' },
              hasil.finalPositionValid ? 'VALID' : 'MELANGGAR',
            ),
          ),
        ),
        ...hasil.feedback.map(barisKlaim),
        catatanOptimum,
        kunciJawabanSection(task, hasil),
        tombol,
      ),
    ),
  );
}

/**
 * Ringkasan akhir sesi.
 *
 * Menampilkan perkembangan tiap klaim lintas level, bukan sekadar total. Bagi
 * siswa inilah gambaran paling berguna: klaim mana yang konsisten kuat dan
 * klaim mana yang selalu tertinggal di setiap level.
 */
export function renderFinishScreen(
  root: HTMLElement,
  data: {
    studentName: string;
    sessionComposite: number | null;
    riwayat: RiwayatLevel[];
  },
): void {
  const klaim = ['K1', 'K2', 'K3', 'K4'] as const;

  const rerata = (k: string): number | null => {
    const nilai = data.riwayat.flatMap((r) => r.feedback.filter((f) => f.claim === k).map((f) => f.score));
    if (nilai.length === 0) return null;
    return Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10) / 10;
  };

  const judulKlaim: Record<string, string> = {
    K1: 'Memahami masalah',
    K2: 'Menyusun rencana',
    K3: 'Menjalankan rencana',
    K4: 'Memeriksa kembali',
  };

  const tersedia = klaim.map((k) => ({ k, mean: rerata(k) })).filter((x) => x.mean !== null);
  const terurut = [...tersedia].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  const terbaik = terurut[0];
  const terlemah = terurut[terurut.length - 1];

  const barisProfil = tersedia.map(({ k, mean }) => {
    const bar = el('div', { class: 'profile-bar' });
    const isi = el('div', { class: 'profile-fill' });
    isi.style.width = `${((mean ?? 0) / 3) * 100}%`;
    bar.append(isi);

    return el(
      'div',
      { class: 'profile-row' },
      el('span', { class: 'profile-name' }, `${k} · ${judulKlaim[k] ?? ''}`),
      bar,
      el('span', { class: 'profile-val' }, `${num(mean ?? 0)}`),
    );
  });

  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card' },
        el(
          'div',
          { class: 'brand' },
          el('div', { class: 'brand-badge' }, 'MISI SELESAI'),
          el('h1', { class: 'brand-title' }, 'TERIMA KASIH'),
          el('div', { class: 'brand-sub' }, data.studentName.toUpperCase()),
        ),
        el('p', { class: 'prose' }, 'Seluruh jawabanmu sudah tersimpan. Kamu boleh menutup halaman ini.'),

        el(
          'div',
          { class: 'result-summary' },
          ...data.riwayat.map((r) =>
            el('div', { class: 'summary-item' }, el('span', {}, `LEVEL ${r.level}`), el('strong', {}, `${r.rawSum}/12`)),
          ),
        ),

        tersedia.length > 0
          ? el(
              'section',
              { class: 'profile-block' },
              el('h3', {}, 'PROFIL KEMAMPUANMU'),
              el('p', { class: 'hint' }, 'Rata-rata tiap tahap pemecahan masalah dari seluruh level yang kamu kerjakan.'),
              ...barisProfil,
            )
          : null,

        terbaik && terlemah && terbaik.k !== terlemah.k
          ? el(
              'p',
              { class: 'optimum-note' },
              `Paling kuat: ${judulKlaim[terbaik.k]?.toLowerCase()}. Paling perlu dilatih: ${judulKlaim[terlemah.k]?.toLowerCase()}.`,
            )
          : null,

        data.sessionComposite !== null
          ? el('p', { class: 'note' }, `Rata-rata komposit seluruh level: ${num(data.sessionComposite)} dari 3.`)
          : null,
      ),
    ),
  );
}
