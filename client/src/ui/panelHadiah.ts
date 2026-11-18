/**
 * Tampilan elemen permainan: spanduk hadiah, daftar misi, dan toko perlengkapan.
 * Hanya tampilan; aturan dan batasnya ada di game/progres.ts.
 */

import { BARANG, MISI, type HadiahBaru, type Progres } from '../game/progres.js';
import { el } from './dom.js';

/** Spanduk hadiah yang baru didapat. Null bila tidak ada hadiah baru. */
export function spandukHadiah(h: HadiahBaru): HTMLElement | null {
  if (h.misi.length === 0) return null;
  return el(
    'div',
    { class: 'hadiah-spanduk' },
    el('span', { class: 'hadiah-koin' }, `+${h.koin} 🪙`),
    el(
      'div',
      {},
      ...h.misi.map((m) =>
        el('p', { class: 'hadiah-misi' }, m.rahasia ? '🗝 Misi tersembunyi: ' : '✅ Misi selesai: ', el('strong', {}, m.judul)),
      ),
    ),
  );
}

/** Pemberitahuan melayang singkat, dipakai saat misi selesai di tengah permainan. */
export function umumkanHadiah(h: HadiahBaru): void {
  const spanduk = spandukHadiah(h);
  if (!spanduk) return;
  spanduk.classList.add('hadiah-melayang');
  document.body.append(spanduk);
  window.setTimeout(() => spanduk.classList.add('is-leaving'), 3200);
  window.setTimeout(() => spanduk.remove(), 3600);
}

/**
 * Panel misi dan toko. `tempatToko` false menyembunyikan toko (mis. di layar
 * hasil level, supaya siswa tidak berbelanja di tengah alur AaL).
 */
export function panelMisi(progres: Progres, opsi: { toko: boolean } = { toko: true }): HTMLElement {
  const wadah = el('section', { class: 'profile-block hadiah-panel' });

  const gambar = (pesan = ''): void => {
    const daftar = MISI.map((m) => {
      const selesai = progres.sudah(m.id);
      const terlihat = !m.rahasia || selesai;
      return el(
        'li',
        { class: `hadiah-item${selesai ? ' is-done' : ''}` },
        el('span', { class: 'hadiah-cek' }, selesai ? '✅' : m.rahasia ? '🗝' : '⬜'),
        el(
          'span',
          { class: 'hadiah-teks' },
          el('strong', {}, terlihat ? m.judul : '???'),
          el('small', {}, terlihat ? m.keterangan : 'Misi tersembunyi. Temukan sendiri caranya.'),
        ),
        el('span', { class: 'hadiah-nilai' }, `${m.koin} 🪙`),
      );
    });

    const toko = opsi.toko
      ? [
          el('h4', {}, 'TOKO PERLENGKAPAN'),
          el('p', { class: 'hint' }, 'Hiasan hanya mempercantik kota. Alat hanya berlaku di Kota Bebas, tidak di level yang dinilai.'),
          el(
            'ul',
            { class: 'hadiah-daftar' },
            ...BARANG.map((b) => {
              const tombol = el('button', { class: 'btn btn-small' }, progres.punya(b.id) ? 'Dimiliki' : `${b.harga} 🪙`);
              tombol.disabled = progres.punya(b.id) || progres.koin < b.harga;
              tombol.addEventListener('click', () => gambar(progres.beli(b.id).pesan));
              return el(
                'li',
                { class: 'hadiah-item' },
                el('span', { class: 'hadiah-cek' }, b.ikon),
                el('span', { class: 'hadiah-teks' }, el('strong', {}, b.nama), el('small', {}, b.efek)),
                tombol,
              );
            }),
          ),
        ]
      : [];

    wadah.replaceChildren(
      el('h3', {}, `MISI & HADIAH · ${progres.koin} 🪙`),
      el('p', { class: 'hint' }, 'Hadiah tidak bergantung pada skor atau penilaian dirimu. Nilai dirimu dengan jujur.'),
      el('ul', { class: 'hadiah-daftar' }, ...daftar),
      ...toko,
      ...(pesan ? [el('p', { class: 'note' }, pesan)] : []),
    );
  };

  gambar();
  return wadah;
}

/** Daftar misi yang bisa dibuka-tutup. Membukanya dihitung untuk misi tersembunyi. */
export function bukaTutupMisi(progres: Progres, opsi: { toko: boolean }): HTMLElement {
  const isi = panelMisi(progres, opsi);
  const wadah = el('details', { class: 'hadiah-lipat' }, el('summary', {}, `📜 MISI, HADIAH & TOKO · ${progres.koin} 🪙`), isi);
  wadah.addEventListener('toggle', () => {
    if ((wadah as HTMLDetailsElement).open) umumkanHadiah(progres.bukaDaftarMisi());
  });
  return wadah;
}
