/**
 * Assessment as Learning - siswa sebagai penilai pekerjaannya sendiri.
 *
 * Sebelumnya siswa hanya MENERIMA umpan balik setelah level selesai
 * (Assessment for Learning). Modul ini menambahkan tiga kebiasaan
 * metakognitif yang dikerjakan siswa sendiri pada setiap level:
 *
 *   1. SEBELUM level  - membaca kriteria sukses, memilih satu tahap yang ingin
 *                       ditingkatkan, menetapkan target skor dan strategi.
 *   2. SEBELUM skor   - menilai pekerjaannya sendiri 0-3 pada keempat tahap
 *                       dengan kriteria yang sama persis.
 *   3. SETELAH skor   - membandingkan penilaian diri dengan bukti (kalibrasi)
 *                       dan memeriksa apakah targetnya tercapai.
 *
 * KRITERIA DI SINI ADALAH TERJEMAHAN RUBRIK, BUKAN KUNCI JAWABAN. Setiap
 * kalimat menyebut perilaku yang dapat diperiksa siswa sendiri ("aku mengecek
 * titik pojok sebelum mengirim"), tanpa menyebut angka atau pertidaksamaan
 * soal mana pun. Rubrik asli tetap di server/src/scoring/k1-k4.ts; bila
 * deskriptornya direvisi, kalimat di bawah wajib ikut ditinjau.
 */

import type { AsesmenSebagaiBelajar, Klaim, SkorKlaim, StudentFeedback, TargetBelajar, TaskDto } from '../api/types.js';
import { el } from './dom.js';

export const KLAIM: readonly Klaim[] = ['K1', 'K2', 'K3', 'K4'];

export const JUDUL_KLAIM: Record<Klaim, string> = {
  K1: 'Memahami masalah',
  K2: 'Menyusun rencana',
  K3: 'Menjalankan rencana',
  K4: 'Memeriksa kembali',
};

/* ================================================================== */
/* Kriteria sukses per tahap - bahasa siswa, mengikuti rubrik 0-3      */
/* ================================================================== */

/**
 * Kriteria skor 0-3 satu tahap untuk task tertentu.
 *
 * K3 dan K4 bergantung pada bentuk task, sama seperti rubriknya: tanpa fungsi
 * tujuan (Level 1-2) K3 hanya menilai kelayakan, dan tanpa event distraktor
 * (Level 1-3) K4 hanya menilai refleksi.
 */
export function kriteria(klaim: Klaim, task: Pick<TaskDto, 'objective' | 'hasDistractor'>): [string, string, string, string] {
  switch (klaim) {
    case 'K1':
      return [
        'Aku belum menetapkan arti x dan y, atau artinya tertukar.',
        'Arti x dan y sudah benar, tetapi pertidaksamaanku belum ada atau arah/angkanya keliru.',
        'x, y, dan sebagian besar pertidaksamaan benar, tetapi aku sempat salah lalu memperbaikinya.',
        'x, y, dan semua pertidaksamaan langsung benar sejak pertama kali kutulis.',
      ];
    case 'K2':
      return [
        'Aku langsung menggeser slider tanpa memilih tujuan lebih dulu.',
        'Aku memilih tujuan, tetapi pertidaksamaan yang kutulis belum lengkap.',
        'Tujuan dan semua pertidaksamaan lengkap, tetapi aku tidak mengecek titik pojok sebelum mengirim.',
        'Aku memilih tujuan di awal, menulis semua pertidaksamaan, dan mengecek titik pojok sebelum mengirim.',
      ];
    case 'K3':
      return task.objective.type === 'none'
        ? [
            'Jawaban akhirku masih melanggar kendala.',
            'Jawabanku memenuhi kendala, tetapi baru tercapai setelah sangat sering ditolak sistem.',
            'Jawabanku memenuhi kendala, tetapi aku beberapa kali ditolak sistem dulu.',
            'Jawabanku memenuhi semua kendala dan aku hampir tidak pernah ditolak sistem.',
          ]
        : [
            'Jawaban akhirku masih melanggar kendala.',
            'Jawabanku memenuhi kendala, tetapi bukan titik terbaik.',
            'Jawabanku titik terbaik, tetapi aku sering ditolak sistem sebelum sampai ke sana.',
            'Jawabanku titik terbaik dan aku hampir tidak pernah ditolak sistem.',
          ];
    case 'K4':
      return task.hasDistractor
        ? [
            'Aku tidak merevisi setelah kebijakan kota berubah, atau refleksiku asal.',
            'Aku merevisi setelah kebijakan berubah, tetapi jawaban baruku masih melanggar.',
            'Revisiku memenuhi kendala baru, tetapi refleksiku belum menjelaskan apa yang dikorbankan.',
            'Revisiku memenuhi kendala baru dan refleksiku menjelaskan untung-ruginya beserta alasannya.',
          ]
        : [
            'Refleksiku kosong atau asal pilih.',
            'Refleksiku menyebut konteks soal, tetapi belum menyebut apa yang dikorbankan.',
            'Refleksiku menyebut untung-rugi (apa yang naik dan apa yang turun), tetapi tanpa alasan.',
            'Refleksiku menyebut untung-rugi dan memberi alasan mengapa jawabanku masuk akal.',
          ];
  }
}

/* ================================================================== */
/* Strategi yang dapat dipilih sebagai rencana belajar                 */
/* ================================================================== */

export const STRATEGI: Record<Klaim, Array<{ id: string; text: string }>> = {
  K1: [
    { id: 'k1-variabel', text: 'Menetapkan arti x dan y sebelum menyentuh slider' },
    { id: 'k1-kata-kunci', text: 'Menandai kata kunci "minimal", "paling banyak", "tidak lebih dari" sebelum menulis pertidaksamaan' },
    { id: 'k1-baca-ulang', text: 'Mencocokkan setiap kalimat soal dengan satu pertidaksamaan' },
  ],
  K2: [
    { id: 'k2-tujuan', text: 'Memilih tujuan sebelum menggeser slider' },
    { id: 'k2-lengkap', text: 'Menghitung dulu berapa kendala yang diminta soal, lalu menulis semuanya' },
    { id: 'k2-pojok', text: 'Mengecek titik pojok sebelum menekan Kirim' },
  ],
  K3: [
    { id: 'k3-banding-z', text: 'Membandingkan nilai Z di setiap titik pojok sebelum memilih' },
    { id: 'k3-meter', text: 'Memastikan semua meter kendala hijau sebelum mengirim' },
    { id: 'k3-hitung', text: 'Menghitung satu titik secara manual sebelum menggeser slider' },
  ],
  K4: [
    { id: 'k4-untung-rugi', text: 'Menulis apa yang bertambah dan apa yang berkurang di refleksi' },
    { id: 'k4-karena', text: 'Menambahkan kata "karena" untuk menjelaskan alasan jawabanku' },
    { id: 'k4-cek-ulang', text: 'Mengecek ulang jawabanku terhadap setiap kendala sebelum menyelesaikan level' },
  ],
};

/* ================================================================== */
/* 1. Layar penetapan target - sebelum level dimulai                   */
/* ================================================================== */

export interface LevelSebelumnya {
  level: number;
  scores: SkorKlaim;
  feedback: StudentFeedback[];
  suggestedNextFocus: Klaim;
}

function kotakKriteria(klaim: Klaim, task: TaskDto, sorot: number | null = null): HTMLElement {
  return el(
    'ol',
    { class: 'aal-criteria' },
    ...kriteria(klaim, task).map((teks, skor) =>
      el(
        'li',
        { class: `aal-criterion${sorot === skor ? ' is-target' : ''}` },
        el('span', { class: 'aal-crit-score' }, String(skor)),
        el('span', {}, teks),
      ),
    ),
  );
}

/**
 * Layar "Tetapkan targetmu".
 *
 * Tahap fokus diisi otomatis dengan saran sistem dari level sebelumnya, tetapi
 * siswa bebas menggantinya - memilih sendiri adalah inti Assessment as Learning.
 * Target skor diisi awal satu di atas skor sebelumnya (maks. 3).
 */
export function renderLayarTarget(
  root: HTMLElement,
  data: { level: number; totalLevels: number; task: TaskDto; sebelumnya: LevelSebelumnya | null },
  onMulai: (target: TargetBelajar, disarankan: Klaim | null) => void,
): void {
  const { task, sebelumnya } = data;
  const disarankan = sebelumnya?.suggestedNextFocus ?? null;

  let fokus: Klaim = disarankan ?? 'K1';
  let target = 2;
  let strategiId = '';

  const wadahKlaim = el('div', { class: 'aal-claim-grid' });
  const wadahTarget = el('div', { class: 'aal-target-row' });
  const wadahStrategi = el('div', { class: 'choice-group' });
  const wadahKriteria = el('div', {});
  const pesan = el('p', { class: 'form-error' });

  const targetAwal = (k: Klaim): number => (sebelumnya ? Math.min(3, Math.max(1, sebelumnya.scores[k] + 1)) : 2);

  const gambar = (): void => {
    wadahKlaim.replaceChildren(
      ...KLAIM.map((k) => {
        const tombol = el(
          'button',
          {
            class: `aal-claim${k === fokus ? ' is-active' : ''}`,
            type: 'button',
            ariaLabel: `${k} ${JUDUL_KLAIM[k]}${sebelumnya ? `, skor Level ${sebelumnya.level}: ${sebelumnya.scores[k]}` : ''}${k === disarankan ? ', disarankan' : ''}`,
          },
          el('span', { class: 'aal-claim-key' }, k),
          el('span', { class: 'aal-claim-title' }, JUDUL_KLAIM[k]),
          sebelumnya ? el('span', { class: 'aal-claim-prev' }, `Level ${sebelumnya.level}: ${sebelumnya.scores[k]}/3`) : null,
          k === disarankan ? el('span', { class: 'key-tag' }, 'SARAN') : null,
        );
        tombol.addEventListener('click', () => {
          fokus = k;
          target = targetAwal(k);
          strategiId = '';
          gambar();
        });
        return tombol;
      }),
    );

    wadahTarget.replaceChildren(
      ...[1, 2, 3].map((v) => {
        const tombol = el(
          'button',
          { class: `aal-seg${v === target ? ' is-active' : ''}`, type: 'button', ariaLabel: `Target skor ${v}` },
          String(v),
        );
        tombol.addEventListener('click', () => {
          target = v;
          gambar();
        });
        return tombol;
      }),
    );

    wadahStrategi.replaceChildren(
      ...STRATEGI[fokus].map((s) => {
        const radio = el('input', { type: 'radio', name: 'aal-strategi' });
        radio.checked = s.id === strategiId;
        radio.addEventListener('change', () => {
          if (radio.checked) strategiId = s.id;
        });
        return el('label', { class: 'choice' }, radio, el('span', {}, s.text));
      }),
    );

    wadahKriteria.replaceChildren(
      el('p', { class: 'reflect-prompt' }, `Kriteria ${fokus} · ${JUDUL_KLAIM[fokus]} — targetmu disorot`),
      kotakKriteria(fokus, task, target),
    );
  };

  target = targetAwal(fokus);
  gambar();

  const saranSebelumnya = sebelumnya && disarankan ? sebelumnya.feedback.find((f) => f.claim === disarankan) : undefined;

  const mulai = el('button', { class: 'btn btn-primary btn-block' }, `▶  MULAI LEVEL ${data.level}`);
  mulai.addEventListener('click', () => {
    const s = STRATEGI[fokus].find((x) => x.id === strategiId);
    if (!s) {
      pesan.textContent = 'Pilih satu strategi yang akan kamu jalankan.';
      return;
    }
    onMulai({ focusClaim: fokus, targetScore: target, strategyId: s.id, strategyText: s.text }, disarankan);
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
          { class: 'result-head' },
          el('span', { class: 'lvl-badge' }, `LV${data.level}`),
          el('h2', {}, 'TETAPKAN TARGETMU'),
        ),
        el(
          'p',
          { class: 'prose' },
          sebelumnya
            ? `Lihat lagi hasil Level ${sebelumnya.level}, lalu pilih SATU tahap yang ingin kamu tingkatkan di level ini. Di akhir level kamu akan menilai pekerjaanmu sendiri dengan kriteria yang sama.`
            : 'Sebelum mulai, pilih SATU tahap pemecahan masalah yang ingin kamu kuasai di level ini. Di akhir level kamu akan menilai pekerjaanmu sendiri dengan kriteria yang sama, lalu membandingkannya dengan hasil dari sistem.',
        ),
        saranSebelumnya
          ? el(
              'p',
              { class: 'fb-suggestion' },
              el('span', { class: 'fb-tag' }, `SARAN DARI LEVEL ${sebelumnya!.level} · ${saranSebelumnya.claim}`),
              saranSebelumnya.suggestion,
            )
          : null,
        el('p', { class: 'reflect-prompt' }, '1 · Tahap yang ingin kutingkatkan'),
        wadahKlaim,
        el('p', { class: 'reflect-prompt' }, '2 · Target skorku pada tahap itu'),
        wadahTarget,
        wadahKriteria,
        el('p', { class: 'reflect-prompt' }, '3 · Strategi yang akan kujalankan'),
        wadahStrategi,
        pesan,
        mulai,
      ),
    ),
  );
}

/* ================================================================== */
/* 2. Formulir penilaian diri - sebelum skor ditampilkan               */
/* ================================================================== */

/**
 * Formulir menilai diri 0-3 pada keempat tahap, memakai kriteria yang sama
 * dengan layar target. Keempat tahap wajib diisi: penilaian diri yang bolong
 * tidak dapat dibandingkan dengan bukti.
 */
export function formPenilaianDiri(
  task: TaskDto,
  target: TargetBelajar | null,
  kirim: (skor: SkorKlaim) => Promise<void>,
): HTMLElement {
  const pilihan: Partial<SkorKlaim> = {};
  const pesan = el('p', { class: 'form-error' });
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, 'Lihat hasil & bandingkan');

  const blok: HTMLElement[] = [];

  /**
   * Di HP keempat tahap tidak muat sekaligus di layar. Setelah satu tahap
   * dinilai, tahap berikutnya yang belum dinilai digulir ke atas otomatis,
   * supaya siswa tidak perlu mencari-cari sambil menggulir panjang.
   */
  const keTahapBerikutnya = (i: number): void => {
    const berikut = KLAIM.findIndex((k, j) => j > i && pilihan[k] === undefined);
    const tujuan = berikut >= 0 ? blok[berikut] : tombol;
    tujuan?.scrollIntoView({ behavior: 'smooth', block: berikut >= 0 ? 'start' : 'center' });
  };

  KLAIM.forEach((k, i) => {
    const opsi = kriteria(k, task).map((teks, skor) => {
      const radio = el('input', { type: 'radio', name: `aal-diri-${k}` });
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const pertamaKali = pilihan[k] === undefined;
        pilihan[k] = skor;
        blok[i]?.classList.add('is-answered');
        if (pertamaKali) window.setTimeout(() => keTahapBerikutnya(i), 180);
      });
      return el('label', { class: 'choice aal-self-choice' }, radio, el('span', { class: 'aal-crit-score' }, String(skor)), el('span', {}, teks));
    });
    const fokus = target?.focusClaim === k;
    blok.push(
      el(
        'fieldset',
        { class: `aal-self${fokus ? ' is-focus' : ''}` },
        el(
          'legend',
          {},
          el('span', { class: 'aal-self-step' }, `${i + 1}/4`),
          `${k} · ${JUDUL_KLAIM[k]}`,
          fokus ? el('span', { class: 'key-tag' }, `🎯 TARGET ${target!.targetScore}`) : null,
        ),
        el('div', { class: 'choice-group' }, ...opsi),
      ),
    );
  });

  tombol.addEventListener('click', () => {
    const kosong = KLAIM.filter((k) => pilihan[k] === undefined);
    if (kosong.length > 0) {
      pesan.textContent = `Nilai dulu tahap ${kosong.join(', ')}.`;
      return;
    }
    tombol.disabled = true;
    tombol.textContent = 'Menghitung skor...';
    pesan.textContent = '';
    kirim(pilihan as SkorKlaim).catch((err: unknown) => {
      pesan.textContent = err instanceof Error ? err.message : 'Gagal mengirim jawaban.';
      tombol.disabled = false;
      tombol.textContent = 'Lihat hasil & bandingkan';
    });
  });

  return el(
    'div',
    { class: 'reflection' },
    el(
      'p',
      { class: 'hint' },
      'Sebelum melihat skor, nilai dulu pekerjaanmu sendiri. Pilih kalimat yang PALING JUJUR menggambarkan apa yang benar-benar kamu lakukan — bukan yang kamu harapkan.',
    ),
    ...blok,
    pesan,
    tombol,
  );
}

/* ================================================================== */
/* 3. Cermin diri - di layar hasil                                     */
/* ================================================================== */

const LABEL_STATUS: Record<string, string> = {
  tepat: '✓ TEPAT',
  terlalu_tinggi: '▲ TERLALU TINGGI',
  terlalu_rendah: '▼ TERLALU RENDAH',
  tercapai: '🎯 TERCAPAI',
  meningkat: '↗ MENINGKAT',
  tetap: '→ TETAP',
  menurun: '↘ MENURUN',
  belum_tercapai: '○ BELUM TERCAPAI',
};

/** Bagian "Target" dan "Cermin diri" pada layar hasil satu level. */
export function bagianCerminDiri(aal: AsesmenSebagaiBelajar | undefined): HTMLElement | null {
  if (!aal || (!aal.goalReview && !aal.calibration)) return null;

  const t = aal.goalReview;
  const k = aal.calibration;

  return el(
    'section',
    { class: 'aal-mirror' },
    t
      ? el(
          'div',
          { class: `aal-goal is-${t.status}` },
          el(
            'div',
            { class: 'score-head' },
            el('span', {}, `TARGETMU · ${t.focusClaim} ${t.title}`),
            el('span', { class: 'aal-status' }, LABEL_STATUS[t.status] ?? t.status),
          ),
          el('p', { class: 'fb-summary' }, t.message),
        )
      : null,
    k
      ? el(
          'div',
          { class: 'aal-calibration' },
          el('h3', {}, 'CERMIN DIRI: PENILAIANMU vs BUKTI'),
          el('p', { class: 'fb-summary' }, k.summary),
          el(
            'div',
            { class: 'aal-cal-table' },
            ...k.perClaim.map((c) =>
              el(
                'div',
                { class: `aal-cal-row is-${c.status}` },
                el('span', { class: 'aal-cal-name' }, `${c.claim} · ${c.title}`),
                el('span', { class: 'aal-cal-num' }, `Kamu ${c.self}`),
                el('span', { class: 'aal-cal-num' }, `Bukti ${c.actual}`),
                el('span', { class: 'aal-status' }, LABEL_STATUS[c.status] ?? c.status),
                c.status !== 'tepat' ? el('p', { class: 'aal-cal-msg' }, c.message) : null,
              ),
            ),
          ),
        )
      : null,
  );
}

/* ================================================================== */
/* 4. Refleksi belajar akhir sesi                                       */
/* ================================================================== */

export interface RefleksiBelajar {
  mostImprovedClaim?: Klaim;
  openText?: string;
}

export function formRefleksiBelajar(kirim: (r: RefleksiBelajar) => Promise<void>): HTMLElement {
  let klaim: Klaim | undefined;
  const opsi = KLAIM.map((k) => {
    const radio = el('input', { type: 'radio', name: 'aal-berkembang' });
    radio.addEventListener('change', () => {
      if (radio.checked) klaim = k;
    });
    return el('label', { class: 'choice' }, radio, el('span', {}, `${k} · ${JUDUL_KLAIM[k]}`));
  });

  const teks = el('textarea', {
    class: 'field textarea',
    rows: '4',
    maxLength: 2000,
    placeholder: 'Contoh: Aku jadi sadar sering langsung menggeser slider. Lain kali aku akan...',
    ariaLabel: 'Refleksi belajar',
  });
  const pesan = el('p', { class: 'form-error' });
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, 'Simpan refleksiku');

  const wadah = el(
    'section',
    { class: 'profile-block' },
    el('h3', {}, 'REFLEKSI BELAJARMU'),
    el('p', { class: 'reflect-prompt' }, 'Menurutmu, tahap mana yang paling berkembang selama misi ini?'),
    el('div', { class: 'choice-group' }, ...opsi),
    el(
      'p',
      { class: 'reflect-prompt' },
      'Apa yang kamu pelajari tentang CARAMU memecahkan masalah? Apa yang akan kamu lakukan berbeda lain kali?',
    ),
    teks,
    pesan,
    tombol,
  );

  tombol.addEventListener('click', () => {
    const isi = teks.value.trim();
    if (!klaim && isi.length === 0) {
      pesan.textContent = 'Jawab minimal salah satu pertanyaan.';
      return;
    }
    tombol.disabled = true;
    tombol.textContent = 'Menyimpan...';
    kirim({ mostImprovedClaim: klaim, openText: isi || undefined })
      .then(() => {
        wadah.replaceChildren(
          el('h3', {}, 'REFLEKSI BELAJARMU'),
          el('p', { class: 'overall-msg' }, 'Refleksimu tersimpan. Kebiasaan menilai dan merencanakan belajarmu sendiri inilah yang membuatmu makin mandiri.'),
        );
      })
      .catch(() => {
        pesan.textContent = 'Gagal menyimpan. Coba lagi.';
        tombol.disabled = false;
        tombol.textContent = 'Simpan refleksiku';
      });
  });

  return wadah;
}
