/**
 * Halaman depan.
 *
 * Menyediakan dua pintu masuk yang setara - siswa dan guru - sehingga guru tidak
 * perlu menghafal alamat tersembunyi, dan siswa tidak pernah tersasar ke laporan
 * kelas. Sebelum ini, halaman guru hanya dapat dicapai dengan mengetik URL.
 *
 * Ilustrasi di sisi kanan memakai mesin peta yang sama dengan permainannya -
 * bukan gambar terpisah - sehingga siswa melihat persis apa yang akan mereka
 * mainkan, dan tampilannya tidak mungkin melenceng dari permainan sesungguhnya.
 */

import { mountCity, type CityHandle } from '../game/mountCity.js';
import { el } from './dom.js';

export interface LandingActions {
  onMasukSiswa: () => void;
  onPortalGuru: () => void;
}

export interface LandingHandle {
  destroy(): void;
}

export function renderLandingScreen(root: HTMLElement, aksi: LandingActions): LandingHandle {
  const mountArt = el('div', { class: 'map-layer' });

  const tombolSiswa = el(
    'button',
    { class: 'btn btn-primary btn-hero' },
    el('span', { class: 'ico' }, '\u{1f3d9}\u{fe0f}'),
    'MASUK SISWA',
  );
  tombolSiswa.addEventListener('click', aksi.onMasukSiswa);

  const tombolGuru = el(
    'button',
    { class: 'btn btn-hero' },
    el('span', { class: 'ico' }, '\u{1f4cb}'),
    'PORTAL GURU',
  );
  tombolGuru.addEventListener('click', aksi.onPortalGuru);

  const tombolPanduan = el('button', { class: 'btn btn-hero btn-ghost' }, '?  PANDUAN');
  tombolPanduan.addEventListener('click', () => bukaPanduan(root));

  root.replaceChildren(
    el(
      'div',
      { class: 'landing' },
      el(
        'header',
        { class: 'landing-bar' },
        el(
          'div',
          { class: 'landing-logo' },
          el('div', { class: 'logo-mark' }, '\u{1f4ca}'),
          el(
            'div',
            { class: 'logo-text' },
            el('span', { class: 'logo-name' }, 'Ecomath Mission'),
            el('span', { class: 'logo-tag' }, 'SUSTAINABLE CITY CHALLENGE'),
          ),
        ),
        el(
          'div',
          { class: 'chip-row-top' },
          el('span', { class: 'chip chip-live' }, '●  SPtLDV'),
          el('span', { class: 'chip chip-yellow' }, '12 Skenario'),
          el('span', { class: 'chip chip-sky' }, '4 Level'),
        ),
      ),

      el(
        'main',
        { class: 'landing-main' },
        el(
          'section',
          { class: 'plate hero' },
          el('div', { class: 'hero-eyebrow' }, 'KOTA ISOMETRIK · SDG 11 & SDG 13'),
          el(
            'h1',
            { class: 'hero-title' },
            el('span', { class: 't-yellow' }, 'ECOMATH'),
            el('span', { class: 't-yellow' }, 'MISSION.'),
            el('span', { class: 't-green' }, 'BANGUN'),
            el('span', { class: 't-green' }, 'KOTAMU.'),
          ),
          el(
            'p',
            { class: 'hero-lead' },
            'Bagi lahan kota, penuhi kendala anggaran dan lingkungan, lalu cari kombinasi terbaik. Setiap keputusanmu terekam dan langsung diberi umpan balik.',
          ),
          el('div', { class: 'hero-actions' }, tombolSiswa, tombolGuru, tombolPanduan),
          el(
            'p',
            { class: 'hero-note' },
            'Guru: portal laporan memerlukan kunci admin. Siswa cukup memasukkan nama dan kode kelas.',
          ),
        ),

        el(
          'section',
          { class: 'plate hero-art' },
          mountArt,
          el(
            'div',
            { class: 'art-card art-card-a' },
            el('div', { class: 'art-badge' }, '4'),
            el(
              'div',
              { class: 'art-text' },
              el('span', { class: 'art-label' }, 'LEVEL MISI'),
              el('span', { class: 'art-value' }, 'L1 sampai L4'),
            ),
          ),
          el(
            'div',
            { class: 'art-stats' },
            el('div', { class: 'art-stat' }, el('span', {}, 'LAHAN'), el('strong', {}, '200')),
            el('div', { class: 'art-stat' }, el('span', {}, 'DANA'), el('strong', {}, '8 M')),
            el('div', { class: 'art-stat' }, el('span', {}, 'HIJAU'), el('strong', {}, '70')),
          ),
          el(
            'div',
            { class: 'art-card art-card-b' },
            el('div', { class: 'art-badge' }, '✓'),
            el(
              'div',
              { class: 'art-text' },
              el('span', { class: 'art-label' }, 'SKOR OTOMATIS' ),
              el('span', { class: 'art-value' }, 'K1 · K2 · K3 · K4'),
            ),
          ),
        ),
      ),
    ),
  );

  // Kota contoh: alokasi tetap, tanpa interaksi. Angkanya sengaja memenuhi
  // kendala agar peta tampil dalam keadaan sehat (bukan rona merah pelanggaran).
  const kota: CityHandle = mountCity(mountArt);
  kota.render({
    x: 130,
    y: 70,
    xMax: 210,
    yMax: 210,
    feasible: true,
    visualX: 'housing',
    visualY: 'nature',
  });

  return {
    destroy(): void {
      kota.destroy();
    },
  };
}

/** Panel panduan singkat, muncul di atas halaman depan. */
function bukaPanduan(root: HTMLElement): void {
  const tutup = el('button', { class: 'btn btn-block' }, 'TUTUP');

  const backdrop = el(
    'div',
    { class: 'alert-backdrop panduan-backdrop' },
    el(
      'div',
      { class: 'plate alert-panel' },
      el('div', { class: 'alert-ticker panduan-ticker' }, el('span', { class: 'alert-tag' }, 'PANDUAN'), 'CARA BERMAIN'),
      el('h3', { class: 'alert-title' }, 'Empat langkah tiap misi'),
      el(
        'ol',
        { class: 'panduan-list' },
        el('li', {}, el('strong', {}, 'Pahami masalah.'), ' Baca misi, lalu tentukan apa yang diwakili variabel x dan y.'),
        el('li', {}, el('strong', {}, 'Susun rencana.'), ' Pilih tujuan yang diminta soal, lalu terjemahkan tiap batasan menjadi pertidaksamaan.'),
        el('li', {}, el('strong', {}, 'Jalankan rencana.'), ' Uji titik pojok, geser slider, dan perhatikan meter kendala di atas layar.'),
        el('li', {}, el('strong', {}, 'Periksa kembali.'), ' Jawab refleksi di akhir - dan bila aturan kota mendadak berubah, revisi rencanamu.'),
      ),
      el(
        'p',
        { class: 'hint' },
        'Urutannya tidak dipaksakan. Kamu boleh membuka alat mana pun kapan saja; sistem mencatat cara kerjamu yang sebenarnya.',
      ),
      tutup,
    ),
  );

  tutup.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) backdrop.remove();
  });

  root.querySelector('.landing')?.append(backdrop);
}
