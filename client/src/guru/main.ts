/**
 * Halaman laporan guru.
 *
 * Berjalan sebagai halaman terpisah pada bundel client yang sama (`/guru.html`),
 * sehingga tidak memerlukan server tambahan maupun proses deploy tersendiri -
 * cukup satu berkas HTML lagi di host statis yang sama dengan halaman siswa.
 *
 * Halaman ini TIDAK ditautkan dari halaman siswa. Alamatnya diketik guru secara
 * langsung, dan isinya baru tampil setelah kunci admin dimasukkan.
 */

import './guru.css';
import {
  adminApi,
  AdminError,
  ambilKunci,
  lupakanKunci,
  simpanKunci,
  type BarisLevelSiswa,
  type LaporanSiswa,
  type RincianPercobaan,
  type Ringkasan,
  type StatusAdaptif,
} from './api.js';
import { clear, el, num } from '../ui/dom.js';

const NAMA_KLAIM: Record<string, string> = {
  K1: 'Memahami Masalah',
  K2: 'Merencanakan',
  K3: 'Melaksanakan',
  K4: 'Memeriksa Kembali',
};

const root = document.getElementById('guru');
if (!root) throw new Error('Elemen #guru tidak ditemukan pada guru.html');

let kunci = ambilKunci();
let kelasAktif = '';
let ringkasan: Ringkasan | null = null;
let statusAdaptif: StatusAdaptif | null = null;

/* ================================================================== */
/* Layar masuk                                                         */
/* ================================================================== */

function layarMasuk(pesanAwal = ''): void {
  const input = el('input', {
    class: 'field',
    type: 'password',
    placeholder: 'Tempel kunci admin di sini',
    ariaLabel: 'Kunci admin',
  });
  const pesan = el('p', { class: 'form-error' }, pesanAwal);
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, 'BUKA LAPORAN');

  async function masuk(): Promise<void> {
    const nilai = input.value.trim();
    if (!nilai) {
      pesan.textContent = 'Kunci admin wajib diisi.';
      return;
    }
    tombol.disabled = true;
    tombol.textContent = 'MEMERIKSA...';
    try {
      await adminApi.ringkasan(nilai);
      kunci = nilai;
      simpanKunci(nilai);
      await muatLaporan();
    } catch (err) {
      pesan.textContent = err instanceof Error ? err.message : 'Gagal membuka laporan.';
      tombol.disabled = false;
      tombol.textContent = 'BUKA LAPORAN';
    }
  }

  tombol.addEventListener('click', () => void masuk());
  input.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key === 'Enter') void masuk();
  });

  root!.replaceChildren(
    el(
      'div',
      { class: 'guru-center' },
      el(
        'div',
        { class: 'plate card' },
        el('div', { class: 'brand-badge' }, 'RUANG GURU'),
        el('h1', { class: 'brand-title' }, 'LAPORAN KELAS'),
        el('div', { class: 'brand-sub' }, 'ECOMATH MISSION'),
        el(
          'p',
          { class: 'prose' },
          'Masukkan kunci admin (ADMIN_API_KEY) yang dipakai server. Kunci hanya disimpan selama tab ini terbuka dan tidak pernah dikirim ke pihak lain.',
        ),
        el('label', { class: 'label' }, 'Kunci admin'),
        input,
        pesan,
        tombol,
        el(
          'p',
          { class: 'note' },
          'Jangan bagikan alamat halaman ini beserta kuncinya kepada siswa - kunci yang sama membuka seluruh data kelas.',
        ),
      ),
    ),
  );

  input.focus();
}

/* ================================================================== */
/* Laporan                                                             */
/* ================================================================== */

async function muatLaporan(): Promise<void> {
  root!.replaceChildren(el('div', { class: 'guru-center' }, el('div', { class: 'plate card' }, el('p', { class: 'prose' }, 'Memuat laporan...'))));

  try {
    ringkasan = await adminApi.ringkasan(kunci, kelasAktif || undefined);
    // Kegagalan mengambil status adaptif tidak boleh menjatuhkan seluruh
    // laporan - panelnya sekadar tidak ditampilkan.
    statusAdaptif = await adminApi.statusAdaptif(kunci).catch(() => null);
    gambarLaporan();
  } catch (err) {
    if (err instanceof AdminError && err.status === 401) {
      lupakanKunci();
      layarMasuk('Kunci admin ditolak server. Masukkan ulang.');
      return;
    }
    root!.replaceChildren(
      el(
        'div',
        { class: 'guru-center' },
        el(
          'div',
          { class: 'plate card' },
          el('h2', {}, 'GAGAL MEMUAT'),
          el('p', { class: 'form-error' }, err instanceof Error ? err.message : 'Kesalahan tidak dikenal.'),
          (() => {
            const b = el('button', { class: 'btn btn-block' }, 'Coba lagi');
            b.addEventListener('click', () => void muatLaporan());
            return b;
          })(),
        ),
      ),
    );
  }
}

function gambarLaporan(): void {
  const d = ringkasan!;

  const pilihKelas = el('select', { class: 'field field-inline', ariaLabel: 'Saring kode kelas' });
  pilihKelas.append(el('option', { value: '' }, 'Semua kelas'));
  for (const k of d.daftarKelas) pilihKelas.append(el('option', { value: k }, k));
  pilihKelas.value = kelasAktif;
  pilihKelas.addEventListener('change', () => {
    kelasAktif = pilihKelas.value;
    void muatLaporan();
  });

  // Pintu masuk utama ke laporan per siswa: guru memilih nama, laporan lengkap
  // langsung terbuka. Daftar mengikuti saringan kelas yang aktif.
  const pilihSiswa = el('select', { class: 'field field-inline', ariaLabel: 'Pilih laporan siswa' });
  pilihSiswa.append(el('option', { value: '' }, d.siswa.length > 0 ? 'Laporan siswa...' : 'Belum ada siswa'));
  for (const s of [...d.siswa].sort((a, b) => a.studentName.localeCompare(b.studentName, 'id'))) {
    const label = `${s.studentName}${s.studentId ? ` (${s.studentId})` : ''} · ${s.classCode}`;
    pilihSiswa.append(el('option', { value: s.sessionId }, label));
  }
  pilihSiswa.disabled = d.siswa.length === 0;
  pilihSiswa.addEventListener('change', () => {
    if (pilihSiswa.value) void bukaLaporanSiswa(pilihSiswa.value);
    pilihSiswa.value = '';
  });

  const unduhSkor = el('button', { class: 'btn btn-small' }, 'Unduh skor (CSV)');
  unduhSkor.addEventListener('click', () => void adminApi.unduhCsv(kunci, 'results', kelasAktif || undefined));

  const unduhLog = el('button', { class: 'btn btn-small' }, 'Unduh log (CSV)');
  unduhLog.addEventListener('click', () => void adminApi.unduhCsv(kunci, 'events', kelasAktif || undefined));

  const keluar = el('button', { class: 'btn btn-small btn-ghost' }, 'Keluar');
  keluar.addEventListener('click', () => {
    lupakanKunci();
    kunci = '';
    layarMasuk();
  });

  root!.replaceChildren(
    el(
      'div',
      { class: 'guru-page' },
      el(
        'header',
        { class: 'plate guru-head' },
        el(
          'div',
          { class: 'guru-title' },
          el('span', { class: 'brand-badge' }, 'RUANG GURU'),
          el('h1', {}, 'LAPORAN KELAS'),
        ),
        el('div', { class: 'guru-actions' }, pilihSiswa, pilihKelas, unduhSkor, unduhLog, keluar),
      ),
      kartuAngka(d),
      statusAdaptif ? panelAdaptif(statusAdaptif) : null,
      d.jumlahPercobaan === 0
        ? el(
            'section',
            { class: 'plate card' },
            el('h2', {}, 'BELUM ADA DATA'),
            el('p', { class: 'prose' }, 'Belum ada siswa yang menyelesaikan level pada saringan ini. Laporan akan terisi otomatis setelah siswa menekan tombol Kirim.'),
          )
        : el('div', {}, panelKlaim(d), panelLevel(d), panelTask(d), panelSiswa(d)),
      el(
        'p',
        { class: 'note' },
        `Versi rubrik ${d.scoringVersion}. Angka pada laporan ini dihitung dari sumber yang sama dengan berkas ekspor CSV.`,
      ),
    ),
  );
}

/**
 * Panel saklar Activity Selection adaptif.
 *
 * Sengaja menampilkan peringatan validitasnya berdampingan dengan saklarnya,
 * bukan menyembunyikannya di dokumentasi: orang yang menyalakan mode ini harus
 * membaca konsekuensinya pada saat yang sama ia menyalakannya.
 */
function panelAdaptif(s: StatusAdaptif): HTMLElement {
  const saklar = el('button', {
    class: `btn btn-small ${s.enabled ? 'btn-primary' : 'btn-ghost'}`,
  }, s.enabled ? '● ADAPTIF: NYALA' : '○ ADAPTIF: MATI');

  saklar.addEventListener('click', () => {
    saklar.disabled = true;
    void adminApi
      .setAdaptif(kunci, !s.enabled)
      .then((baru) => {
        statusAdaptif = baru;
        gambarLaporan();
      })
      .catch((err: unknown) => {
        saklar.disabled = false;
        saklar.textContent = err instanceof Error ? err.message : 'Gagal mengubah';
      });
  });

  const tanpaRuang = s.perLevel.filter((p) => !p.adaRuangAdaptif).map((p) => p.level);

  return el(
    'section',
    { class: 'plate card' },
    el('h2', {}, 'MODE PEMILIHAN SOAL'),
    el(
      'div',
      { class: 'adaptive-head' },
      saklar,
      el(
        'p',
        { class: 'hint' },
        s.enabled
          ? 'Varian soal dalam satu level dipilih menyesuaikan pita kemampuan siswa dari level sebelumnya.'
          : 'Fixed-form: varian dipilih acak berstrata. Skor mentah antar siswa sebanding tanpa kalibrasi IRT.',
      ),
    ),
    s.enabled
      ? el(
          'p',
          { class: 'adaptive-warning' },
          'PERINGATAN VALIDITAS — beban permukaan varian adalah peringkat rasional dari fitur task, bukan kesulitan butir hasil kalibrasi empiris. Selama butir belum dikalibrasi (Rasch/IRT), skor mentah siswa yang menerima varian berbeda tidak sepenuhnya sebanding. Matikan saat pengambilan data skripsi.',
        )
      : null,
    tanpaRuang.length > 0
      ? el(
          'p',
          { class: 'hint' },
          `Level ${tanpaRuang.join(' dan ')} tidak terpengaruh: ketiga variannya berbeban permukaan sama (bentuk paralel setara), sehingga pemilihannya tetap acak berstrata.`,
        )
      : null,
    el(
      'div',
      { class: 'table-scroll' },
      (() => {
        const tabel = el('table', { class: 'data-table' });
        tabel.append(
          el('thead', {}, el('tr', {}, el('th', {}, 'Level'), el('th', {}, 'Varian (termudah → tersulit)'), el('th', {}, 'Ruang adaptif'))),
        );
        const tbody = el('tbody');
        for (const p of s.perLevel) {
          tbody.append(
            el(
              'tr',
              {},
              el('td', {}, `Level ${p.level}`),
              el('td', {}, p.varian.map((v) => `${v.taskId} (${num(v.bebanPermukaan)})`).join('  →  ')),
              el('td', {}, p.adaRuangAdaptif ? 'Ada' : 'Tidak ada'),
            ),
          );
        }
        tabel.append(tbody);
        return tabel;
      })(),
    ),
    el(
      'p',
      { class: 'note' },
      `Ambang pita: rendah ≤ ${num(s.thresholds.bandRendahMax)}, tinggi ≥ ${num(s.thresholds.bandTinggiMin)} (skala klaim 0-3). Setelan awal server ADAPTIVE_MODE=${s.defaultFromEnv ? 'true' : 'false'}; perubahan di sini kembali ke setelan itu bila server dijalankan ulang. Setiap pemberian soal tercatat sebagai event adaptive_selection pada log.`,
    ),
  );
}

function kartuAngka(d: Ringkasan): HTMLElement {
  const kartu = (label: string, nilai: string | number, catatan?: string): HTMLElement =>
    el(
      'div',
      { class: 'plate stat' },
      el('span', { class: 'stat-label' }, label),
      el('strong', { class: 'stat-value' }, String(nilai)),
      catatan ? el('span', { class: 'stat-note' }, catatan) : null,
    );

  return el(
    'section',
    { class: 'stat-row' },
    kartu('Siswa', d.jumlahSiswa),
    kartu('Sesi selesai', d.jumlahSelesai, `dari ${d.jumlahSiswa} siswa`),
    kartu('Level dikerjakan', d.jumlahPercobaan),
    kartu('Perlu tinjau K4', d.perluTinjauK4, 'skor K4 masih otomatis'),
  );
}

/** Bar 0-3 untuk rata-rata sebuah klaim. */
function barNilai(mean: number | null): HTMLElement {
  const bar = el('div', { class: 'meter-bar' });
  const isi = el('div', { class: 'meter-fill' });
  isi.style.width = `${Math.max(0, Math.min(100, ((mean ?? 0) / 3) * 100))}%`;
  bar.append(isi);
  return bar;
}

function panelKlaim(d: Ringkasan): HTMLElement {
  const baris = d.perKlaim.map((k) => {
    const total = k.distribusi.reduce((a, b) => a + b, 0) || 1;
    const sebaran = el(
      'div',
      { class: 'dist' },
      ...k.distribusi.map((n, skor) => {
        const seg = el('span', { class: `dist-seg dist-${skor}`, ariaLabel: `${n} siswa mendapat skor ${skor}` }, n > 0 ? String(n) : '');
        seg.style.flexGrow = String(Math.max(n, 0.06));
        seg.title = `Skor ${skor}: ${n} percobaan (${Math.round((n / total) * 100)}%)`;
        return seg;
      }),
    );

    return el(
      'div',
      { class: 'claim-row' },
      el(
        'div',
        { class: 'claim-head' },
        el('span', { class: 'claim-name' }, `${k.claim} · ${NAMA_KLAIM[k.claim] ?? ''}`),
        el('span', { class: 'claim-mean' }, k.mean === null ? '—' : `${num(k.mean)} / 3`),
      ),
      barNilai(k.mean),
      sebaran,
    );
  });

  return el(
    'section',
    { class: 'plate card' },
    el('h2', {}, 'RATA-RATA PER KLAIM'),
    el(
      'p',
      { class: 'hint' },
      'Batang bawah menunjukkan sebaran skor 0-3. Rata-rata yang sama bisa berarti dua kelas yang sangat berbeda: semua siswa di tengah, atau separuh di nol dan separuh sempurna.',
    ),
    ...baris,
    el(
      'div',
      { class: 'legend-dist' },
      ...[0, 1, 2, 3].map((s) => el('span', { class: 'legend-item' }, el('i', { class: `dist-key dist-${s}` }), `skor ${s}`)),
    ),
  );
}

function panelLevel(d: Ringkasan): HTMLElement {
  const rows = d.perLevel
    .filter((l) => l.jumlahPercobaan > 0)
    .map((l) =>
      el(
        'tr',
        {},
        el('td', {}, `Level ${l.level}`),
        el('td', {}, String(l.jumlahPercobaan)),
        el('td', {}, l.meanRawSum === null ? '—' : `${num(l.meanRawSum)} / 12`),
        el('td', {}, l.K1 === null ? '—' : num(l.K1)),
        el('td', {}, l.K2 === null ? '—' : num(l.K2)),
        el('td', {}, l.K3 === null ? '—' : num(l.K3)),
        el('td', {}, l.K4 === null ? '—' : num(l.K4)),
      ),
    );

  return el(
    'section',
    { class: 'plate card' },
    el('h2', {}, 'RATA-RATA PER LEVEL'),
    el(
      'table',
      { class: 'data-table' },
      el(
        'thead',
        {},
        el('tr', {}, ...['Level', 'n', 'Jumlah skor', 'K1', 'K2', 'K3', 'K4'].map((h) => el('th', {}, h))),
      ),
      el('tbody', {}, ...rows),
    ),
  );
}

function panelTask(d: Ringkasan): HTMLElement {
  const urut = [...d.perTask].sort((a, b) => (a.tingkatKemudahan ?? 1) - (b.tingkatKemudahan ?? 1));

  const rows = urut.map((t) => {
    const p = Math.round((t.tingkatKemudahan ?? 0) * 100);
    const bar = el('div', { class: 'meter-bar meter-bar-sm' });
    const isi = el('div', { class: 'meter-fill' });
    isi.style.width = `${p}%`;
    bar.append(isi);

    return el(
      'tr',
      {},
      el('td', {}, el('code', {}, t.taskId)),
      el('td', { class: 'cell-wrap' }, t.judul),
      el('td', {}, String(t.jumlahPercobaan)),
      el('td', {}, t.meanRawSum === null ? '—' : num(t.meanRawSum)),
      el('td', { class: 'cell-bar' }, bar, el('span', { class: 'cell-pct' }, `${p}%`)),
    );
  });

  return el(
    'section',
    { class: 'plate card' },
    el('h2', {}, 'TINGKAT KEMUDAHAN PER SOAL'),
    el(
      'p',
      { class: 'hint' },
      'Proporsi skor maksimum yang tercapai kelas pada tiap soal, diurutkan dari yang tersulit. Soal paling atas adalah yang paling menantang bagi kelas ini.',
    ),
    el(
      'table',
      { class: 'data-table' },
      el('thead', {}, el('tr', {}, ...['Kode', 'Judul', 'n', 'Rerata', 'Kemudahan'].map((h) => el('th', {}, h)))),
      el('tbody', {}, ...rows),
    ),
  );
}

function panelSiswa(d: Ringkasan): HTMLElement {
  const rows = d.siswa.map((s) => {
    const sel = (b: BarisLevelSiswa | undefined): HTMLElement => {
      if (!b) return el('td', { class: 'lv lv-kosong' }, '—');
      const td = el(
        'td',
        { class: `lv lv-${Math.min(3, Math.round(b.rawSum / 4))}` },
        el('span', { class: 'lv-sum' }, String(b.rawSum)),
        b.K4overridden ? el('span', { class: 'lv-flag', ariaLabel: 'K4 dikoreksi manual' }, '✎') : null,
      );
      td.title = `Level ${b.level} · ${b.taskId}\nK1 ${b.K1} · K2 ${b.K2} · K3 ${b.K3} · K4 ${b.K4}\nKlik untuk melihat rincian`;
      td.addEventListener('click', () => void bukaRincian(b.attemptId));
      td.classList.add('is-clickable');
      return td;
    };

    const namaSel = el(
      'td',
      { class: 'cell-wrap is-clickable', ariaLabel: `Buka laporan lengkap ${s.studentName}` },
      el('strong', {}, s.studentName),
      s.studentId ? el('span', { class: 'sub' }, ` ${s.studentId}`) : null,
    );
    namaSel.title = 'Klik untuk membuka laporan lengkap siswa ini';
    namaSel.addEventListener('click', () => void bukaLaporanSiswa(s.sessionId));

    return el(
      'tr',
      {},
      namaSel,
      el('td', {}, s.classCode),
      sel(s.perLevel.find((x) => x.level === 1)),
      sel(s.perLevel.find((x) => x.level === 2)),
      sel(s.perLevel.find((x) => x.level === 3)),
      sel(s.perLevel.find((x) => x.level === 4)),
      el('td', {}, `${s.totalRaw}`),
      el('td', {}, s.sessionComposite === null ? '—' : num(s.sessionComposite)),
      el('td', {}, s.finishedAt ? 'selesai' : `${s.levelsCompleted}/4`),
    );
  });

  return el(
    'section',
    { class: 'plate card' },
    el('h2', {}, 'PEKERJAAN SISWA'),
    el('p', { class: 'hint' }, 'Angka pada kolom level adalah jumlah skor 0-12 untuk level itu. Klik salah satu untuk membaca rincian pekerjaan siswa dan meninjau skor K4.'),
    el(
      'div',
      { class: 'table-scroll' },
      el(
        'table',
        { class: 'data-table table-siswa' },
        el(
          'thead',
          {},
          el('tr', {}, ...['Siswa', 'Kelas', 'L1', 'L2', 'L3', 'L4', 'Total', 'Komposit', 'Status'].map((h) => el('th', {}, h))),
        ),
        el('tbody', {}, ...rows),
      ),
    ),
  );
}

/* ================================================================== */
/* Laporan satu siswa                                                  */
/* ================================================================== */

/**
 * Buka laporan lengkap satu siswa: skor tiap level, profil klaim (rata-rata
 * K1-K4 lintas level), dan satu kalimat kesimpulan.
 *
 * Dipicu dari dropdown "Laporan siswa..." di kepala halaman maupun dengan
 * mengklik nama siswa pada tabel "PEKERJAAN SISWA" - keduanya membuka panel
 * yang sama.
 */
async function bukaLaporanSiswa(sessionId: string): Promise<void> {
  const panel = el('div', { class: 'plate modal-panel' }, el('p', { class: 'prose' }, 'Memuat laporan siswa...'));
  const backdrop = el('div', { class: 'modal-wrap' }, panel);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) backdrop.remove();
  });
  document.body.append(backdrop);

  try {
    const lap = await adminApi.laporanSiswa(kunci, sessionId);
    clear(panel);
    panel.append(...isiLaporanSiswa(lap, () => backdrop.remove()));
  } catch (err) {
    clear(panel);
    panel.append(
      el('h2', {}, 'GAGAL MEMUAT'),
      el('p', { class: 'form-error' }, err instanceof Error ? err.message : 'Kesalahan tidak dikenal.'),
    );
  }
}

function isiLaporanSiswa(lap: LaporanSiswa, tutup: () => void): HTMLElement[] {
  const tombolTutup = el('button', { class: 'btn btn-small', ariaLabel: 'Tutup laporan' }, '✕');
  tombolTutup.addEventListener('click', tutup);

  const rentangWaktu = lap.finishedAt
    ? `${new Date(lap.startedAt).toLocaleString('id-ID')} - ${new Date(lap.finishedAt).toLocaleString('id-ID')}`
    : `Dimulai ${new Date(lap.startedAt).toLocaleString('id-ID')} - belum selesai`;

  const bagian: HTMLElement[] = [
    el(
      'header',
      { class: 'modal-head' },
      el(
        'div',
        {},
        el('h2', {}, lap.studentName.toUpperCase()),
        el(
          'p',
          { class: 'sub' },
          `${lap.classCode}${lap.studentId ? ` · NIS ${lap.studentId}` : ''} · ${rentangWaktu}`,
        ),
      ),
      tombolTutup,
    ),
    el('p', { class: 'overall-msg' }, lap.kesimpulan),
  ];

  /**
   * Catatan tutorial ditampilkan hanya bila ia PERLU jadi bahan pertimbangan:
   * siswa melewati tutorial, atau banyak salah langkah. Bila tutorialnya lancar,
   * antarmuka bukan faktor dan menampilkannya cuma menambah kebisingan.
   */
  if (lap.tutorial) {
    const t = lap.tutorial;
    const banyakSalah = (t.missteps ?? 0) >= 5;
    if (t.status === 'skipped' || banyakSalah) {
      bagian.push(
        el(
          'p',
          { class: 'tutorial-flag' },
          el('strong', {}, 'CATATAN TAFSIR — '),
          t.status === 'skipped'
            ? 'Siswa melewati tutorial antarmuka. Skor rendah pada level awal dapat sebagian berasal dari ketidakbiasaan memakai aplikasi, bukan dari kemampuan matematisnya.'
            : `Siswa menyelesaikan tutorial tetapi dengan ${t.missteps} salah langkah. Pertimbangkan kemungkinan sebagian kesulitannya berasal dari antarmuka.`,
        ),
      );
    }
  }

  if (lap.perLevel.length === 0) {
    bagian.push(el('p', { class: 'prose' }, 'Siswa ini belum menyelesaikan satu level pun.'));
    return bagian;
  }

  bagian.push(
    el(
      'div',
      { class: 'result-summary' },
      el('div', { class: 'summary-item' }, el('span', {}, 'LEVEL SELESAI'), el('strong', {}, `${lap.levelsCompleted}/4`)),
      el('div', { class: 'summary-item' }, el('span', {}, 'TOTAL SKOR'), el('strong', {}, `${lap.totalRaw}/${lap.levelsCompleted * 12}`)),
      el(
        'div',
        { class: 'summary-item' },
        el('span', {}, 'RATA-RATA KOMPOSIT'),
        el('strong', {}, lap.sessionComposite === null ? '—' : `${num(lap.sessionComposite)}/3`),
      ),
    ),
  );

  // Profil klaim: rata-rata K1-K4 lintas seluruh level yang dikerjakan siswa
  // ini - memakai gaya bar yang sama dengan layar "selesai" milik siswa sendiri,
  // supaya guru melihat representasi yang konsisten dengan yang dilihat siswa.
  bagian.push(
    el(
      'section',
      { class: 'sub-card' },
      el('h3', {}, 'PROFIL KEMAMPUAN (RATA-RATA LINTAS LEVEL)'),
      ...lap.profilKlaim
        .filter((p) => p.levelCount > 0)
        .map((p) => {
          const bar = el('div', { class: 'profile-bar' });
          const isi = el('div', { class: 'profile-fill' });
          isi.style.width = `${(p.mean / 3) * 100}%`;
          bar.append(isi);
          return el(
            'div',
            { class: 'profile-row' },
            el('span', { class: 'profile-name' }, `${p.claim} · ${p.title}`),
            bar,
            el('span', { class: 'profile-val' }, num(p.mean)),
          );
        }),
    ),
  );

  // Skor tiap level, dengan pintasan ke rincian teknis (jejak audit, refleksi,
  // log) bagi guru yang ingin menyelami satu percobaan tertentu.
  const rows = lap.perLevel.map((p) => {
    const lihat = el('button', { class: 'btn btn-tiny' }, 'Lihat rincian');
    lihat.addEventListener('click', () => void bukaRincian(p.attemptId));

    return el(
      'tr',
      {},
      el('td', {}, `Level ${p.level}`),
      el('td', { class: 'cell-wrap' }, p.taskTitle),
      el('td', {}, String(p.K1)),
      el('td', {}, String(p.K2)),
      el('td', {}, String(p.K3)),
      el('td', {}, p.K4overridden ? `${p.K4} ✎` : String(p.K4)),
      el('td', {}, `${p.rawSum}/12`),
      el('td', {}, num(p.weightedComposite)),
      el('td', {}, lihat),
    );
  });

  bagian.push(
    el(
      'section',
      { class: 'sub-card' },
      el('h3', {}, 'SKOR PER LEVEL'),
      el(
        'div',
        { class: 'table-scroll' },
        el(
          'table',
          { class: 'data-table' },
          el('thead', {}, el('tr', {}, ...['Level', 'Soal', 'K1', 'K2', 'K3', 'K4', 'Jumlah', 'Komposit', ''].map((h) => el('th', {}, h)))),
          el('tbody', {}, ...rows),
        ),
      ),
    ),
  );

  // Kalimat penutup PER LEVEL, persis seperti yang dilihat siswa saat submit -
  // berbeda dari kesimpulan di atas yang merangkum SELURUH level sekaligus.
  const catatan = lap.perLevel.filter((p) => p.overallMessage);
  if (catatan.length > 0) {
    bagian.push(
      el(
        'section',
        { class: 'sub-card' },
        el('h3', {}, 'CATATAN PER LEVEL'),
        el('p', { class: 'hint' }, 'Kalimat penutup yang dilihat siswa di akhir tiap level.'),
        el('ul', { class: 'trace-reasons' }, ...catatan.map((p) => el('li', {}, el('strong', {}, `Level ${p.level}: `), p.overallMessage))),
      ),
    );
  }

  return bagian;
}

/* ================================================================== */
/* Rincian satu percobaan                                              */
/* ================================================================== */

async function bukaRincian(attemptId: string): Promise<void> {
  const panel = el('div', { class: 'plate modal-panel' }, el('p', { class: 'prose' }, 'Memuat rincian...'));
  const backdrop = el('div', { class: 'modal-wrap' }, panel);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) backdrop.remove();
  });
  document.body.append(backdrop);

  try {
    const r = await adminApi.percobaan(kunci, attemptId);
    clear(panel);
    panel.append(...isiRincian(r, () => backdrop.remove()));
  } catch (err) {
    clear(panel);
    panel.append(
      el('h2', {}, 'GAGAL MEMUAT'),
      el('p', { class: 'form-error' }, err instanceof Error ? err.message : 'Kesalahan tidak dikenal.'),
    );
  }
}

function isiRincian(r: RincianPercobaan, tutup: () => void): HTMLElement[] {
  const tombolTutup = el('button', { class: 'btn btn-small', ariaLabel: 'Tutup rincian' }, '✕');
  tombolTutup.addEventListener('click', tutup);

  const bagian: HTMLElement[] = [
    el(
      'header',
      { class: 'modal-head' },
      el(
        'div',
        {},
        el('h2', {}, r.studentName.toUpperCase()),
        el('p', { class: 'sub' }, `Level ${r.level} · ${r.taskTitle} · ${r.taskId}${r.durasiMenit !== null ? ` · ${r.durasiMenit} menit` : ''}`),
      ),
      tombolTutup,
    ),
  ];

  if (!r.score) {
    bagian.push(el('p', { class: 'prose' }, 'Percobaan ini belum diselesaikan siswa, sehingga belum ada skor.'));
    return bagian;
  }

  // Jejak audit per klaim: deskriptor rubrik yang cocok beserta alasannya.
  const jejak = r.score.trace.claims ?? [];
  bagian.push(
    el(
      'section',
      { class: 'sub-card' },
      el('h3', {}, 'JEJAK PENILAIAN'),
      el('p', { class: 'hint' }, 'Deskriptor rubrik yang dipenuhi beserta bukti yang membuatnya cocok. Inilah dasar setiap angka skor.'),
      ...jejak.map((c) =>
        el(
          'div',
          { class: 'trace-row' },
          el(
            'div',
            { class: 'trace-head' },
            el('span', { class: 'trace-claim' }, `${c.claim} · ${NAMA_KLAIM[c.claim] ?? ''}`),
            el('span', { class: `trace-score s-${c.score}` }, `${c.score}/3`),
          ),
          el('p', { class: 'trace-desc' }, c.descriptor),
          el('ul', { class: 'trace-reasons' }, ...c.reasons.map((x) => el('li', {}, x))),
        ),
      ),
    ),
  );

  // Umpan balik yang BENAR-BENAR dilihat siswa, disimpan apa adanya saat submit -
  // bukan dihitung ulang dari trace. scoring/feedback.ts dapat direvisi nanti;
  // ini menunjukkan kalimat persis yang muncul di layar siswa saat itu.
  const umpanBalik = r.score.studentFeedback.claims ?? [];
  if (umpanBalik.length > 0) {
    bagian.push(
      el(
        'section',
        { class: 'sub-card' },
        el('h3', {}, 'UMPAN BALIK YANG DILIHAT SISWA'),
        el('p', { class: 'hint' }, 'Persis kalimat yang muncul di layar siswa saat submit, disimpan apa adanya.'),
        r.score.studentFeedback.overallMessage
          ? el('p', { class: 'overall-msg' }, r.score.studentFeedback.overallMessage)
          : null,
        ...umpanBalik.map((f) =>
          el(
            'div',
            { class: 'score-row' },
            el(
              'div',
              { class: 'score-head' },
              el('span', {}, `${f.claim} · ${f.title}`),
              el('span', { class: 'score-num' }, `${f.score}/3`),
            ),
            el('p', { class: 'fb-summary' }, f.summary),
            el('p', { class: 'fb-suggestion' }, el('span', { class: 'fb-tag' }, 'LANGKAH BERIKUTNYA'), f.suggestion),
          ),
        ),
      ),
    );
  }

  // Refleksi siswa + peninjauan K4.
  bagian.push(panelRefleksi(r));

  // Garis waktu ringkas: memperlihatkan pola kerja siswa tanpa membaca CSV.
  const ringkasEvent = new Map<string, number>();
  for (const e of r.events) ringkasEvent.set(e.eventType, (ringkasEvent.get(e.eventType) ?? 0) + 1);

  bagian.push(
    el(
      'section',
      { class: 'sub-card' },
      el('h3', {}, `POLA KERJA (${r.jumlahEvent} event)`),
      el(
        'div',
        { class: 'chip-row' },
        ...[...ringkasEvent.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([jenis, n]) => el('span', { class: 'chip-count' }, `${jenis} × ${n}`)),
      ),
    ),
  );

  return bagian;
}

function panelRefleksi(r: RincianPercobaan): HTMLElement {
  const skor = r.score!;

  const pilih = el('select', { class: 'field field-inline', ariaLabel: 'Koreksi skor K4' });
  pilih.append(el('option', { value: '' }, `Pakai skor otomatis (${skor.k4Auto})`));
  for (const v of [0, 1, 2, 3]) pilih.append(el('option', { value: String(v) }, `Koreksi jadi ${v}`));
  pilih.value = skor.overridden ? String(skor.k4) : '';

  const catatan = el('input', {
    class: 'field',
    type: 'text',
    maxLength: 300,
    placeholder: 'Catatan peninjauan (opsional)',
    value: skor.k4ReviewNote ?? '',
    ariaLabel: 'Catatan peninjauan K4',
  });

  const status = el('p', { class: 'hint' });
  const simpan = el('button', { class: 'btn btn-small btn-primary' }, 'Simpan koreksi');

  simpan.addEventListener('click', () => {
    simpan.disabled = true;
    status.textContent = 'Menyimpan...';
    const nilai = pilih.value === '' ? null : Number(pilih.value);
    void adminApi
      .koreksiK4(kunci, skor.scoreId, nilai, catatan.value.trim())
      .then((hasil) => {
        status.textContent = `Tersimpan. K4 sekarang ${hasil.k4}, jumlah skor ${hasil.rawSum}/12, komposit ${num(hasil.weightedComposite)}.`;
        simpan.disabled = false;
        // Muat ulang ringkasan agar tabel kelas ikut memperbarui angkanya.
        void muatLaporan();
      })
      .catch((err: unknown) => {
        status.textContent = err instanceof Error ? err.message : 'Gagal menyimpan koreksi.';
        simpan.disabled = false;
      });
  });

  return el(
    'section',
    { class: 'sub-card' },
    el('h3', {}, 'REFLEKSI SISWA & PENINJAUAN K4'),
    el(
      'p',
      { class: 'hint' },
      'Skor K4 dihitung otomatis dari penanda bahasa pada jawaban terbuka. Heuristik itu dapat keliru menilai penalaran - bacalah tulisan siswa di bawah, lalu koreksi bila perlu. Skor otomatis tidak ditimpa, sehingga selisih keduanya tetap dapat dihitung sebagai bukti reliabilitas antar-penilai.',
    ),
    el(
      'div',
      { class: 'reflect-block' },
      el('span', { class: 'reflect-label' }, 'Pilihan tertutup'),
      el(
        'p',
        { class: 'reflect-text' },
        r.refleksi.closedOptionText ?? 'Tidak dijawab',
        r.refleksi.closedOptionQuality !== null
          ? el('span', { class: 'reflect-q' }, ` (bobot ${r.refleksi.closedOptionQuality}/3)`)
          : null,
      ),
    ),
    el(
      'div',
      { class: 'reflect-block' },
      el('span', { class: 'reflect-label' }, r.refleksi.openPrompt || 'Jawaban terbuka'),
      el('p', { class: 'reflect-text reflect-open' }, r.refleksi.openText ?? 'Tidak dijawab'),
    ),
    el(
      'div',
      { class: 'override-row' },
      el('span', { class: 'reflect-label' }, `K4 otomatis: ${skor.k4Auto}${skor.overridden ? ` · berlaku: ${skor.k4}` : ''}`),
      pilih,
      catatan,
      simpan,
    ),
    status,
  );
}

/* ================================================================== */

if (kunci) void muatLaporan();
else layarMasuk();
