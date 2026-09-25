/**
 * Pemasang viewport kota.
 *
 * Dipakai bersama oleh layar permainan dan halaman depan. Diekstrak menjadi satu
 * berkas karena bagian tersulitnya - menunggu elemen induk benar-benar punya
 * ukuran - mudah salah dan sebaiknya hanya ada satu salinannya.
 *
 * MENGAPA MENUNGGU UKURAN. Phaser mengukur elemen induknya saat boot. Bila
 * ukurannya nol, WebGL membuat framebuffer 0x0 dan gagal dengan "Framebuffer
 * status: Incomplete Attachment". Kegagalan itu PERMANEN - canvas tidak pernah
 * terpasang dan peta tinggal kotak kosong, meski elemennya kemudian membesar.
 *
 * Ukuran nol bukan kasus teoretis: tab latar belakang, panel yang belum selesai
 * dibuka, dan sebagian peramban seluler saat memuat halaman semuanya sempat
 * melaporkan viewport nol.
 */

import Phaser from 'phaser';
import { CityScene, type AllocationView } from './CityScene.js';
import type { ZoneCenter } from './iso/isoGrid.js';

export interface CityHandle {
  /** Perbarui tampilan kota. Aman dipanggil sebelum mesin render siap. */
  render(view: AllocationView): void;
  /** Getaran singkat saat sistem menolak konfigurasi. */
  shake(): void;
  /** Nyalakan mode pilih pusat zona; null mematikannya. */
  setPickMode(handler: ((petak: ZoneCenter) => void) | null): void;
  destroy(): void;
}

export function mountCity(mount: HTMLElement): CityHandle {
  let game: Phaser.Game | null = null;
  let scene: CityScene | null = null;
  let terakhir: AllocationView | null = null;
  let modePilih: ((petak: ZoneCenter) => void) | null = null;

  const buat = (lebar: number, tinggi: number): void => {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mount,
      // Piksel dirender tajam tanpa penghalusan - inti dari gaya pixel-art.
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: lebar, height: tinggi },
      scene: [CityScene],
    });

    game.events.once('ready', () => {
      scene = (game?.scene.getScene('CityScene') as CityScene | undefined) ?? null;
      if (terakhir) scene?.render(terakhir);
      if (modePilih) scene?.aturModePilih(modePilih);
    });
  };

  // Satu ResizeObserver menangani dua hal: menunggu sampai elemen punya ukuran,
  // lalu menjaga ukuran itu tetap sinkron.
  const pengamat = new ResizeObserver(() => {
    const lebar = mount.clientWidth;
    const tinggi = mount.clientHeight;
    if (lebar === 0 || tinggi === 0) return;
    if (!game) buat(lebar, tinggi);
    else game.scale.resize(lebar, tinggi);
  });
  pengamat.observe(mount);

  // Jalur cepat bila ukuran sudah tersedia pada frame berikutnya, sehingga peta
  // tidak menunggu satu siklus observer.
  requestAnimationFrame(() => {
    if (!game && mount.isConnected && mount.clientWidth > 0 && mount.clientHeight > 0) {
      buat(mount.clientWidth, mount.clientHeight);
    }
  });

  return {
    render(view: AllocationView): void {
      terakhir = view;
      scene?.render(view);
    },
    shake(): void {
      scene?.guncang();
    },
    setPickMode(handler): void {
      modePilih = handler;
      scene?.aturModePilih(handler);
    },
    destroy(): void {
      pengamat.disconnect();
      game?.destroy(true);
      game = null;
      scene = null;
    },
  };
}
