/**
 * Tanggapan protes warga sebagai kegiatan Assessment as Learning.
 *
 * Saat warga berdemo di Peta Wilayah, siswa:
 *   1. mendiagnosis penyebab protes (SDG mana yang dilanggar),
 *   2. memilih rencana perbaikan,
 *   3. mengaitkan rencana dengan kendala soal yang pernah dikerjakan,
 *   4. menilai keyakinan dirinya (0-3) SEBELUM melihat hasil pemeriksaan,
 * lalu membandingkan keyakinannya dengan hasil (kalibrasi), seperti cermin
 * diri di akhir level.
 *
 * Jawaban dicatat sebagai event `aal_tanggapan_protes`, yang disaring dari
 * mesin skoring (NON_EVIDENCE_EVENTS): tidak memengaruhi K1-K4.
 */

import type { Pelanggaran } from '../game/standarSdg.js';
import { el } from './dom.js';

export interface TanggapanProtes {
  pelanggaran: string[];
  diagnosis: number[];
  diagnosisTepat: boolean;
  rencana: string;
  rencanaSesuai: boolean;
  kaitanKendala: string;
  keyakinan: number;
  /** Keyakinan cocok dengan hasil: yakin (2-3) dan benar, atau ragu (0-1) dan keliru. */
  terkalibrasi: boolean;
}

const RENCANA = [
  { id: 'ganti-listrik', teks: 'Mengganti bus konvensional/mesin fosil dengan versi listrik, tetap di dalam batas kendala soal', sdg: 13 },
  { id: 'tambah-hijau', teks: 'Menambah ruang hijau di dekat permukiman, tanpa melampaui lahan yang tersedia', sdg: 11 },
  { id: 'tambah-fosil', teks: 'Menambah bus/mesin berbahan bakar fosil agar lebih murah', sdg: 0 },
  { id: 'biarkan', teks: 'Membiarkan saja, karena kota sudah layak menurut Dewan', sdg: 0 },
] as const;

export function formTanggapanProtes(
  pelanggaran: Pelanggaran[],
  kirim: (t: TanggapanProtes) => Promise<void> | void,
  /** Dipanggil bila diagnosis dan rencana tepat: kota diperbaiki sesuai rencana. */
  terapkan?: (rencanaId: string) => void,
): HTMLElement {
  const sdgDilanggar = new Set(pelanggaran.map((p) => p.sdg));
  const pilihanDiagnosis = new Set<number>();
  let rencana: (typeof RENCANA)[number] | null = null;
  let keyakinan: number | null = null;

  const pesan = el('p', { class: 'form-error' });
  const kaitan = el('textarea', {
    class: 'field textarea',
    rows: '3',
    maxLength: 1000,
    placeholder: 'Contoh: kendala kapasitas garasi membatasi jumlah bus, jadi bus konvensional harus dikurangi saat bus listrik ditambah.',
    ariaLabel: 'Kaitan rencana dengan kendala soal',
  });

  const centang = (label: string, nilai: number) => {
    const c = el('input', { type: 'checkbox' });
    c.addEventListener('change', () => (c.checked ? pilihanDiagnosis.add(nilai) : pilihanDiagnosis.delete(nilai)));
    return el('label', { class: 'choice' }, c, el('span', {}, label));
  };

  const pilihRencana = RENCANA.map((r) => {
    const radio = el('input', { type: 'radio', name: 'aal-protes-rencana' });
    radio.addEventListener('change', () => {
      if (radio.checked) rencana = r;
    });
    return el('label', { class: 'choice' }, radio, el('span', {}, r.teks));
  });

  const pilihYakin = [0, 1, 2, 3].map((n) => {
    const radio = el('input', { type: 'radio', name: 'aal-protes-yakin' });
    radio.addEventListener('change', () => {
      if (radio.checked) keyakinan = n;
    });
    const teks = ['Sama sekali tidak yakin', 'Kurang yakin', 'Cukup yakin', 'Sangat yakin'][n]!;
    return el('label', { class: 'choice' }, radio, el('span', {}, `${n} · ${teks}`));
  });

  const tombol = el('button', { class: 'btn btn-primary btn-block' }, 'Kirim tanggapan & lihat hasil');
  const wadah = el(
    'div',
    { class: 'tanggapan-protes' },
    el('p', { class: 'reflect-prompt' }, '1 · Mengapa warga berdemo? (boleh lebih dari satu)'),
    el(
      'div',
      { class: 'choice-group' },
      centang('Ada bangunan yang menghasilkan emisi (SDG 13)', 13),
      centang('Ruang hijau kurang untuk permukiman (SDG 11)', 11),
      centang('Warga tidak suka gedung tinggi', 0),
    ),
    el('p', { class: 'reflect-prompt' }, '2 · Rencana perbaikanmu'),
    el('div', { class: 'choice-group' }, ...pilihRencana),
    el('p', { class: 'reflect-prompt' }, '3 · Kendala mana di soalmu yang membatasi rencana ini? Jelaskan.'),
    kaitan,
    el('p', { class: 'reflect-prompt' }, '4 · Seberapa yakin rencanamu menyelesaikan protes tanpa melanggar kendala soal?'),
    el('div', { class: 'choice-group' }, ...pilihYakin),
    pesan,
    tombol,
  );

  tombol.addEventListener('click', () => {
    if (pilihanDiagnosis.size === 0 || !rencana || keyakinan === null || kaitan.value.trim().length === 0) {
      pesan.textContent = 'Lengkapi keempat bagian dulu.';
      return;
    }
    const diagnosisTepat =
      [...sdgDilanggar].every((s) => pilihanDiagnosis.has(s)) && [...pilihanDiagnosis].every((s) => sdgDilanggar.has(s as 11 | 13));
    const rencanaSesuai = rencana.sdg !== 0 && sdgDilanggar.has(rencana.sdg as 11 | 13);
    const benar = diagnosisTepat && rencanaSesuai;
    const yakin = keyakinan >= 2;
    const t: TanggapanProtes = {
      pelanggaran: pelanggaran.map((p) => `SDG ${p.sdg}: ${p.alasan}`),
      diagnosis: [...pilihanDiagnosis],
      diagnosisTepat,
      rencana: rencana.teks,
      rencanaSesuai,
      kaitanKendala: kaitan.value.trim(),
      keyakinan,
      terkalibrasi: benar === yakin,
    };
    void kirim(t);

    const cermin = benar
      ? yakin
        ? 'Keyakinanmu tepat: diagnosis dan rencanamu sesuai dengan penyebab protes.'
        : 'Kamu lebih mampu daripada yang kamu kira: diagnosis dan rencanamu sudah tepat.'
      : yakin
        ? 'Kamu cukup yakin, tetapi ada bagian yang belum tepat. Bandingkan pilihanmu dengan alasan protes di atas.'
        : 'Keraguanmu beralasan: ada bagian yang belum tepat. Baca lagi alasan protes warga.';

    wadah.replaceChildren(
      el('h4', {}, 'HASIL TANGGAPANMU'),
      el('p', { class: diagnosisTepat ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' }, diagnosisTepat ? '✓ Diagnosis tepat.' : '✕ Diagnosis belum tepat.'),
      el('p', { class: rencanaSesuai ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' }, rencanaSesuai ? '✓ Rencana sesuai SDG yang dilanggar.' : '✕ Rencana belum menjawab penyebab protes.'),
      el('p', { class: 'overall-msg' }, `Keyakinanmu ${keyakinan}/3. ${cermin}`),
      el('p', { class: 'hint' }, 'Tanggapanmu tersimpan untuk refleksi belajar dan tidak memengaruhi skor level.'),
    );
    if (benar && terapkan) {
      const id = rencana.id;
      const tombolTerap = el('button', { class: 'btn btn-small' }, id === 'ganti-listrik' ? '🔧 Terapkan: ganti ke versi listrik' : '🌳 Terapkan: tanam ruang hijau');
      tombolTerap.addEventListener('click', () => terapkan(id));
      wadah.append(tombolTerap);
    }
  });

  return wadah;
}
