/**
 * Peta Wilayah: kota-kota yang sudah dibangun siswa di setiap level.
 *
 * Menampilkan hasil AKHIR yang sudah diajukan (nilai x dan y saat submit),
 * digambar ulang dengan peta isometrik yang sama, ditambah penduduk yang
 * berjalan. Hanya tampilan: tidak ada event, tidak mengubah apa pun.
 */

import type { VariableVisual } from '../api/types.js';
import type { SpriteKota } from '../game/pixel/spriteKota.js';
import { mountCity, type CityHandle } from '../game/mountCity.js';
import { el, num } from './dom.js';

/** Kota hasil satu level, disimpan saat level diajukan. */
export interface KotaLevel {
  level: number;
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

export function bukaPetaWilayah(kota: KotaLevel[]): void {
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

  tab.replaceChildren(
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
  tampilkan(kota[kota.length - 1]!);
}

/** Tombol pembuka Peta Wilayah untuk layar hasil dan layar akhir. */
export function tombolPetaWilayah(kota: KotaLevel[]): HTMLElement | null {
  if (kota.length === 0) return null;
  const b = el('button', { class: 'btn btn-block' }, `🗺  PETA WILAYAH (${kota.length} kota)`);
  b.addEventListener('click', () => bukaPetaWilayah(kota));
  return b;
}
