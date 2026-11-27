/**
 * Layar persetujuan (assent) siswa sebelum ikut penelitian.
 *
 * Siswa SMA umumnya di bawah umur, jadi persetujuan siswa di layar ini TIDAK
 * menggantikan izin tertulis orang tua/wali; siswa hanya menyatakan bahwa izin
 * itu sudah diberikan. Lembar izin tertulis disimpan oleh peneliti/sekolah.
 */

import { el } from './dom.js';
import { KONTAK_PENELITI, LAMA_PENYIMPANAN, PENELITI } from '../penelitian.js';

export function renderPersetujuan(
  root: HTMLElement,
  onSetuju: (izinWali: boolean) => Promise<void>,
  onTolak: () => void,
): void {
  const setuju = el('input', { type: 'checkbox' });
  const izin = el('input', { type: 'checkbox' });
  const pesan = el('p', { class: 'form-error' });
  const lanjut = el('button', { class: 'btn btn-primary btn-block' }, '✓ SAYA BERSEDIA, LANJUTKAN');
  const tolak = el('button', { class: 'btn btn-block btn-ghost' }, 'Saya tidak bersedia');

  lanjut.addEventListener('click', async () => {
    if (!setuju.checked) {
      pesan.textContent = 'Centang pernyataan bersedia dulu, atau pilih "Saya tidak bersedia".';
      return;
    }
    lanjut.disabled = true;
    try {
      await onSetuju(izin.checked);
    } catch (err) {
      pesan.textContent = err instanceof Error ? err.message : 'Gagal menyimpan persetujuan. Coba lagi.';
      lanjut.disabled = false;
    }
  });
  tolak.addEventListener('click', onTolak);

  const butir = (judul: string, isi: string): HTMLElement => el('li', {}, el('strong', {}, `${judul} `), isi);

  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center persetujuan-layar' },
      el(
        'div',
        { class: 'plate card persetujuan-kartu' },
        el('h2', {}, '📄 Persetujuan ikut penelitian'),
        el(
          'p',
          { class: 'prose' },
          `Game ini adalah bagian dari penelitian tesis oleh ${PENELITI}. Bacalah dulu, lalu putuskan apakah kamu bersedia ikut.`,
        ),
        el(
          'ul',
          { class: 'persetujuan-daftar' },
          butir('Tujuan:', 'mengetahui kemampuan pemecahan masalah matematis pada materi pertidaksamaan dan program linear.'),
          butir('Yang kamu lakukan:', 'mengerjakan 4 level dan satu misi kota hijau, sekitar satu sampai dua jam pelajaran.'),
          butir(
            'Data yang dicatat:',
            'inisial atau kode, NIS, kode kelas, setiap langkah dan jawabanmu, penilaian dirimu, dan kapan serta berapa lama kamu keluar dari layar penuh atau berpindah tab/aplikasi.',
          ),
          butir('Penyimpanan:', `data disimpan di server Cloudflare (wilayah Asia-Pasifik) dan hanya dibuka oleh peneliti dan gurumu. Data identitas disimpan ${LAMA_PENYIMPANAN}.`),
          butir('Nilai sekolah:', 'skor di game ini untuk penelitian, tidak menjadi nilai rapor kecuali gurumu menyatakan lain.'),
          butir('Sukarela:', 'kamu boleh menolak atau berhenti kapan saja tanpa akibat apa pun. Bila ingin datamu dihapus, sampaikan ke guru atau peneliti.'),
          butir('Kontak:', KONTAK_PENELITI),
        ),
        el('label', { class: 'choice' }, setuju, el('span', {}, 'Saya sudah membaca penjelasan di atas dan bersedia ikut penelitian ini.')),
        el('label', { class: 'choice' }, izin, el('span', {}, 'Orang tua/wali saya sudah memberi izin tertulis untuk saya ikut penelitian ini.')),
        pesan,
        lanjut,
        tolak,
      ),
    ),
  );
}

/** Layar untuk siswa yang tidak bersedia: tidak ada data pengerjaan yang dibuat. */
export function renderTidakBersedia(root: HTMLElement, kembali: () => void): void {
  const tombol = el('button', { class: 'btn btn-block' }, 'Kembali ke halaman depan');
  tombol.addEventListener('click', kembali);
  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card' },
        el('h2', {}, 'Terima kasih'),
        el(
          'p',
          { class: 'prose' },
          'Kamu memilih tidak ikut penelitian, dan itu tidak apa-apa. Tidak ada pekerjaan yang dicatat. Sampaikan ke gurumu agar ia tahu, dan bila kamu sudah sempat masuk, minta guru menghapus datamu.',
        ),
        tombol,
      ),
    ),
  );
}
