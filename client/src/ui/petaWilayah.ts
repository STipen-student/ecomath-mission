/**
 * Peta Wilayah: kota-kota yang sudah dibangun siswa di setiap level.
 *
 * Menampilkan hasil AKHIR yang sudah diajukan (nilai x dan y saat submit),
 * digambar ulang dengan peta isometrik yang sama, ditambah penduduk yang
 * berjalan. Hanya tampilan: tidak ada event, tidak mengubah apa pun.
 */

import type { VariableVisual } from '../api/types.js';
import { SPRITE_BERASAP, type SpriteKota } from '../game/pixel/spriteKota.js';
import { GRID, plotTiles } from '../game/iso/isoGrid.js';
import { mountCity, type CityHandle } from '../game/mountCity.js';
import { el, num } from './dom.js';
import type { Progres } from '../game/progres.js';
import { jenisDariKode, periksaStandar } from '../game/standarSdg.js';

/** Bangunan yang bisa dibeli dengan koin untuk wilayah gabungan. */
const KATALOG: Array<{ jenis: SpriteKota; nama: string; ikon: string; harga: number }> = [
  { jenis: 'pohon', nama: 'Pohon', ikon: '🌳', harga: 10 },
  { jenis: 'taman-kota', nama: 'Taman', ikon: '🌷', harga: 25 },
  { jenis: 'toko', nama: 'Toko', ikon: '🏪', harga: 40 },
  { jenis: 'surya', nama: 'Panel surya', ikon: '☀️', harga: 35 },
  { jenis: 'turbin', nama: 'Kincir angin', ikon: '🌬️', harga: 45 },
  { jenis: 'pabrik-hijau', nama: 'Pabrik ramah lingkungan', ikon: '🏭', harga: 70 },
];

/** Kota hasil satu level, disimpan saat level diajukan. */
export interface KotaLevel {
  level: number;
  /** Id soal, dipakai untuk menyambung cerita antarkasus. */
  taskId: string;
  judul: string;
  x: number;
  y: number;
  xMax: number;
  yMax: number;
  labelX: string;
  labelY: string;
  unitX: string;
  unitY: string;
  visualX: VariableVisual;
  visualY: VariableVisual;
  spriteX?: SpriteKota;
  spriteY?: SpriteKota;
  /** Rancangan akhir memenuhi semua kendala soal. */
  layak: boolean;
}

/** Wujud yang dihitung sebagai bangunan hijau atau energi bersih. */
const SPRITE_HIJAU: ReadonlySet<SpriteKota> = new Set<SpriteKota>([
  'pabrik-hijau',
  'pohon', 'taman-kota', 'sepeda', 'trotoar', 'surya', 'turbin', 'bus-listrik',
  'mesin-listrik', 'industri-hijau', 'kompos', 'daur-ulang', 'hijau-multifungsi',
  'hunian-rendah-karbon', 'gedung',
]);

/** Distrik tiap level pada wilayah gabungan: seperempat pulau. */
const DISTRIK: Record<number, { nama: string; kolom: 0 | 1; baris: 0 | 1 }> = {
  1: { nama: 'Distrik Barat Laut', kolom: 0, baris: 0 },
  2: { nama: 'Distrik Timur Laut', kolom: 1, baris: 0 },
  3: { nama: 'Distrik Barat Daya', kolom: 0, baris: 1 },
  4: { nama: 'Distrik Tenggara', kolom: 1, baris: 1 },
};

/**
 * Petak bangun satu distrik, diurutkan dari pusat distrik ke tepi, sehingga
 * bangunan tiap kasus mengumpul seperti satu kawasan.
 */
function petakDistrik(level: number): number[] {
  const d = DISTRIK[level];
  if (!d) return [];
  const setengah = GRID / 2;
  const pusatK = d.kolom * setengah + setengah / 2;
  const pusatB = d.baris * setengah + setengah / 2;
  return plotTiles()
    .filter((t) => Math.floor(t.col / setengah) === d.kolom && Math.floor(t.row / setengah) === d.baris)
    .sort((a, b) => Math.hypot(a.col - pusatK, a.row - pusatB) - Math.hypot(b.col - pusatK, b.row - pusatB))
    .map((t) => t.seed);
}

/**
 * Susun wilayah gabungan: setiap kasus mengisi distriknya dengan wujud x dan y.
 * Jumlah ubin sebanding dengan nilai/batas tiap variabel (tampilan, bukan skala
 * satuan), sehingga distrik yang hampir penuh terlihat padat.
 */
function susunGabungan(kota: KotaLevel[]): { petak: Map<number, string>; hijau: number; berasap: number; lainnya: number } {
  const petak = new Map<number, string>();
  let hijau = 0;
  let berasap = 0;
  let lainnya = 0;
  for (const k of kota) {
    const ruang = petakDistrik(k.level);
    const kapasitas = Math.floor(ruang.length / 2);
    const nx = Math.round(Math.min(1, k.x / Math.max(1, k.xMax)) * kapasitas);
    const ny = Math.round(Math.min(1, k.y / Math.max(1, k.yMax)) * kapasitas);
    const kodeX = k.spriteX ? `s:${k.spriteX}` : `v:${k.visualX}`;
    const kodeY = k.spriteY ? `s:${k.spriteY}` : `v:${k.visualY}`;
    // Selang-seling x dan y agar kedua zona tampak bercampur dalam distrik.
    let ix = 0;
    let iy = 0;
    for (const seed of ruang) {
      if (ix < nx && (iy >= ny || ix <= iy)) {
        petak.set(seed, kodeX);
        ix++;
      } else if (iy < ny) {
        petak.set(seed, kodeY);
        iy++;
      } else break;
    }
    for (const [jenis, n] of [[k.spriteX, nx], [k.spriteY, ny]] as const) {
      if (jenis && SPRITE_HIJAU.has(jenis)) hijau += n;
      else if (jenis && SPRITE_BERASAP.has(jenis)) berasap += n;
      else lainnya += n;
    }
  }
  // Pusat kota di tengah pulau: perpustakaan dan beberapa pencakar langit pada
  // petak yang masih kosong. Hanya dekorasi; tidak dihitung dalam indeks hijau.
  const tengah = (GRID - 1) / 2;
  const kosong = plotTiles()
    .filter((t) => !petak.has(t.seed))
    .sort((a, b) => Math.hypot(a.col - tengah, a.row - tengah) - Math.hypot(b.col - tengah, b.row - tengah));
  const [perpus, ...lain] = kosong;
  if (perpus) petak.set(perpus.seed, 's:perpustakaan');
  lain.slice(0, 7).forEach((t, i) => petak.set(t.seed, i % 2 === 0 ? 's:pencakar-a' : 's:pencakar-b'));

  return { petak, hijau, berasap, lainnya };
}

export function bukaPetaWilayah(kota: KotaLevel[], progres?: Progres): void {
  if (kota.length === 0) return;

  let peta: CityHandle | null = null;
  const wadahPeta = el('div', { class: 'peta-wilayah-kanvas' });
  const keterangan = el('div', { class: 'peta-wilayah-ket' });
  const tab = el('div', { class: 'peta-wilayah-tab', ariaLabel: 'Pilih kota' });

  const tutup = el('button', { class: 'btn btn-small', ariaLabel: 'Tutup peta wilayah' }, '✕ TUTUP');
  const latar = el(
    'div',
    { class: 'peta-wilayah' },
    el(
      'div',
      { class: 'plate peta-wilayah-panel' },
      el('header', { class: 'peta-wilayah-kepala' }, el('h2', {}, '🗺 PETA WILAYAH NUSA LESTARI'), tutup),
      tab,
      wadahPeta,
      keterangan,
    ),
  );

  const tampilkan = (k: KotaLevel): void => {
    for (const b of tab.querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.level === String(k.level));
    peta?.destroy();
    wadahPeta.replaceChildren();
    peta = mountCity(wadahPeta);
    peta.render({
      x: k.x,
      y: k.y,
      xMax: k.xMax,
      yMax: k.yMax,
      feasible: k.layak,
      visualX: k.visualX,
      visualY: k.visualY,
      spriteX: k.spriteX,
      spriteY: k.spriteY,
    });
    peta.hidupkan(12 + Math.round((k.x + k.y) / Math.max(1, k.xMax + k.yMax) * 18));

    keterangan.replaceChildren(
      el('h3', {}, `Level ${k.level} · ${k.judul}`),
      el(
        'ul',
        { class: 'peta-wilayah-daftar' },
        el('li', {}, `🟩 ${k.labelX}: `, el('strong', {}, `${num(k.x)} ${k.unitX}`)),
        el('li', {}, `🟧 ${k.labelY}: `, el('strong', {}, `${num(k.y)} ${k.unitY}`)),
      ),
      el(
        'p',
        { class: k.layak ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' },
        k.layak ? '✓ Rancangan disahkan Dewan Kota.' : '✕ Rancangan akhir masih melanggar aturan kota.',
      ),
    );
  };

  const tampilkanGabungan = (): void => {
    for (const b of tab.querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.level === 'semua');
    peta?.destroy();
    wadahPeta.replaceChildren();
    peta = mountCity(wadahPeta);
    const g = susunGabungan(kota);
    const semuaLayak = kota.every((k) => k.layak);
    // Bangunan yang dibeli dengan koin ikut tampil dan ikut dihitung.
    for (const b of progres?.bangunanKota() ?? []) {
      g.petak.set(b.seed, `s:${b.jenis}`);
      if (SPRITE_HIJAU.has(b.jenis as SpriteKota)) g.hijau++;
      else g.lainnya++;
    }
    peta.tampilkanKota(g.petak, semuaLayak);
    peta.hidupkan(20 + kota.length * 6);

    // Palet "Bangun dengan koin": pilih bangunan, lalu ketuk petak kosong.
    let pilihan: (typeof KATALOG)[number] | null = null;
    const infoBeli = el('p', { class: 'hint' }, 'Pilih bangunan, lalu ketuk petak kosong di peta.');
    const palet = el('div', { class: 'peta-beli-palet' });
    const gambarPalet = (): void => {
      palet.replaceChildren(
        ...KATALOG.map((item) => {
          const b = el(
            'button',
            { class: `btn btn-small${pilihan?.jenis === item.jenis ? ' is-active' : ''}` },
            `${item.ikon} ${item.nama} · ${item.harga} 🪙`,
          );
          b.disabled = !progres || progres.koin < item.harga;
          b.addEventListener('click', () => {
            pilihan = pilihan?.jenis === item.jenis ? null : item;
            infoBeli.textContent = pilihan ? `Ketuk petak kosong untuk membangun ${pilihan.nama}.` : 'Pilih bangunan, lalu ketuk petak kosong di peta.';
            gambarPalet();
          });
          return b;
        }),
      );
    };
    gambarPalet();
    peta.setPickMode((titik) => {
      if (!progres || !pilihan) return;
      const seed = titik.row * GRID + titik.col;
      if (g.petak.has(seed)) {
        infoBeli.textContent = 'Petak itu sudah terisi. Pilih petak kosong.';
        return;
      }
      const hasil = progres.bangunDiKota(seed, pilihan.jenis, pilihan.harga, pilihan.nama);
      infoBeli.textContent = hasil.pesan;
      if (hasil.ok) {
        const posisi = (wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null)?.scrollTop ?? 0;
        tampilkanGabungan();
        const panel = wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null;
        if (panel) panel.scrollTop = posisi;
      }
    });

    const total = Math.max(1, g.hijau + g.berasap + g.lainnya);
    const persenHijau = Math.round((g.hijau / total) * 100);
    const status =
      g.berasap === 0
        ? '🌿 Wilayah bebas asap: tidak ada bus berbahan bakar fosil maupun mesin fosil.'
        : `💨 Masih ada ${g.berasap} bangunan berasap. Wilayah belum sepenuhnya bebas karbon.`;

    keterangan.replaceChildren(
      el('h3', {}, `Wilayah Gabungan · ${kota.length} distrik`),
      el(
        'div',
        { class: 'peta-wilayah-indeks' },
        el('span', {}, 'Indeks hijau wilayah'),
        el('div', { class: 'profile-bar' }, (() => {
          const isi = el('div', { class: 'profile-fill' });
          isi.style.width = `${persenHijau}%`;
          return isi;
        })()),
        el('strong', {}, `${persenHijau}%`),
      ),
      el('p', { class: g.berasap === 0 ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' }, status),
      (() => {
        const protes = periksaStandar([...g.petak.values()].map(jenisDariKode));
        return protes.length === 0
          ? el('p', { class: 'peta-wilayah-status ok' }, '😊 Warga puas: kota sesuai semangat SDG 11 dan SDG 13.')
          : el(
              'div',
              { class: 'peta-protes' },
              el('strong', {}, '📢 Warga berdemo:'),
              el('ul', {}, ...protes.map((p) => el('li', {}, `SDG ${p.sdg}: ${p.alasan}.`))),
            );
      })(),
      el(
        'ul',
        { class: 'peta-wilayah-daftar' },
        ...kota.map((k) =>
          el(
            'li',
            {},
            el('strong', {}, `${DISTRIK[k.level]?.nama ?? `Distrik ${k.level}`}: `),
            `${k.judul} — ${num(k.x)} ${k.unitX} ${k.labelX.toLowerCase()}, ${num(k.y)} ${k.unitY} ${k.labelY.toLowerCase()} `,
            k.layak ? '✓' : '✕',
          ),
        ),
      ),
      el('p', { class: 'hint' }, 'Tiap distrik adalah kota dari satu kasus. Kepadatan bangunan menggambarkan seberapa penuh nilai yang kamu pilih, bukan jumlah sebenarnya.'),
      ...(progres
        ? [
            el('h3', {}, `BANGUN DENGAN KOIN · ${progres.koin} 🪙`),
            el('p', { class: 'hint' }, 'Percantik dan lestarikan kotamu. Bangunan ini hanya hiasan dan tidak memengaruhi skor.'),
            palet,
            infoBeli,
          ]
        : []),
    );
  };

  const tabGabungan = el('button', { class: 'btn btn-small', dataset: { level: 'semua' } }, '🗺 WILAYAH GABUNGAN');
  tabGabungan.addEventListener('click', tampilkanGabungan);
  tab.replaceChildren(
    tabGabungan,
    ...kota.map((k) => {
      const b = el('button', { class: 'btn btn-small', dataset: { level: String(k.level) } }, `LV${k.level}`);
      b.addEventListener('click', () => tampilkan(k));
      return b;
    }),
  );

  const keluar = (): void => {
    peta?.destroy();
    latar.remove();
    document.removeEventListener('keydown', esc);
  };
  const esc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') keluar();
  };
  tutup.addEventListener('click', keluar);
  document.addEventListener('keydown', esc);

  document.body.append(latar);
  tampilkanGabungan();
}

/** Tombol pembuka Peta Wilayah untuk layar hasil dan layar akhir. */
export function tombolPetaWilayah(kota: KotaLevel[], progres?: Progres): HTMLElement | null {
  if (kota.length === 0) return null;
  const b = el('button', { class: 'btn btn-block' }, `🗺  PETA WILAYAH (${kota.length} kota)`);
  b.addEventListener('click', () => bukaPetaWilayah(kota, progres));
  return b;
}
