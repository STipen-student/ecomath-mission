/**
 * Sprite kota sesuai MAKNA variabel soal: bus listrik berbentuk bus listrik,
 * bus konvensional punya knalpot (asapnya digambar bergerak oleh CityScene),
 * lahan parkir berupa parkiran, jalur sepeda berupa lajur bersepeda, dst.
 *
 * Digambar per piksel saat aplikasi dimulai (tanpa berkas gambar), dengan
 * ukuran dan titik jangkar yang sama dengan sprite bangunan lain: lebar TILE_W,
 * tinggi TILE_H + t, alas belah ketupat di bagian bawah tekstur.
 */

import Phaser from 'phaser';
import { makeBuilding, makeTree, TILE_H, TILE_W } from './textures.js';

/** Jenis sprite yang dipakai variabel soal. Harus sama dengan server/src/domain/types.ts. */
export type SpriteKota =
  | 'pabrik-hijau'
  | 'toko'
  | 'pencakar-a'
  | 'pencakar-b'
  | 'perpustakaan'
  | 'pohon'
  | 'taman-kota'
  | 'rumah'
  | 'rumah-a'
  | 'rumah-b'
  | 'perumahan-padat'
  | 'hunian-rendah-karbon'
  | 'gedung'
  | 'bus-listrik'
  | 'bus-konvensional'
  | 'parkir'
  | 'sepeda'
  | 'trotoar'
  | 'surya'
  | 'turbin'
  | 'industri-hijau'
  | 'mesin-fosil'
  | 'mesin-listrik'
  | 'kompos'
  | 'daur-ulang'
  | 'hijau-multifungsi';

/** Sprite yang mengeluarkan asap bergerak. */
export const SPRITE_BERASAP: ReadonlySet<SpriteKota> = new Set<SpriteKota>(['bus-konvensional', 'mesin-fosil']);

const T = 16; // tinggi tambahan di atas alas untuk sprite gambar tangan
const H = TILE_H + T;
const CX = TILE_W / 2;
/** Titik tengah alas belah ketupat pada tekstur. */
const ALAS_Y = H - TILE_H / 2;

type Ctx = CanvasRenderingContext2D;

function kanvas(scene: Phaser.Scene, key: string): Ctx | null {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, TILE_W, H);
  return tex ? tex.getContext() : null;
}

function selesai(scene: Phaser.Scene, key: string): void {
  const tex = scene.textures.get(key);
  if (tex instanceof Phaser.Textures.CanvasTexture) tex.refresh();
}

function kotak(ctx: Ctx, x: number, y: number, w: number, h: number, warna: string): void {
  ctx.fillStyle = warna;
  ctx.fillRect(x, y, w, h);
}

/** Alas belah ketupat (aspal, rumput, paving) selebar ubin. */
function alas(ctx: Ctx, warna: string, tepi?: string): void {
  for (let y = 0; y < TILE_H; y++) {
    const setengah = y < TILE_H / 2 ? (y + 1) * 2 : (TILE_H - y) * 2;
    kotak(ctx, CX - setengah, H - TILE_H + y, setengah * 2, 1, warna);
    if (tepi && (y === 0 || y === TILE_H - 1)) kotak(ctx, CX - setengah, H - TILE_H + y, setengah * 2, 1, tepi);
  }
}

/** Bus dilihat dari samping-depan. */
function bus(ctx: Ctx, badan: string, atap: string, kaca: string, aksen: string | null, knalpot: boolean): void {
  const x0 = 5;
  const y0 = ALAS_Y - 10;
  kotak(ctx, x0, y0, 22, 9, badan);
  kotak(ctx, x0, y0 - 1, 22, 2, atap);
  for (let i = 0; i < 5; i++) kotak(ctx, x0 + 2 + i * 4, y0 + 2, 3, 3, kaca);
  kotak(ctx, x0 + 19, y0 + 2, 2, 5, kaca); // kaca depan
  kotak(ctx, x0, y0 + 7, 22, 1, '#16323f');
  // Roda
  for (const rx of [x0 + 3, x0 + 16]) {
    kotak(ctx, rx, y0 + 8, 4, 3, '#16323f');
    kotak(ctx, rx + 1, y0 + 9, 2, 1, '#8a8a8a');
  }
  if (aksen) {
    // Petir: penanda bus listrik
    kotak(ctx, x0 + 10, y0 + 5, 2, 1, aksen);
    kotak(ctx, x0 + 9, y0 + 6, 2, 1, aksen);
    kotak(ctx, x0 + 11, y0 + 4, 1, 1, aksen);
  }
  if (knalpot) kotak(ctx, x0 - 2, y0 + 6, 2, 2, '#4b4b4b');
}

function pabrik(ctx: Ctx, dinding: string, atap: string, cerobong: string | null, petir: boolean): void {
  kotak(ctx, 6, ALAS_Y - 9, 20, 10, dinding);
  // Atap gergaji
  for (let i = 0; i < 4; i++) {
    kotak(ctx, 6 + i * 5, ALAS_Y - 11, 4, 2, atap);
    kotak(ctx, 6 + i * 5, ALAS_Y - 12, 2, 1, atap);
  }
  kotak(ctx, 8, ALAS_Y - 5, 3, 3, '#dff0f7');
  kotak(ctx, 14, ALAS_Y - 5, 3, 3, '#dff0f7');
  kotak(ctx, 20, ALAS_Y - 5, 3, 3, '#dff0f7');
  if (cerobong) {
    kotak(ctx, 22, ALAS_Y - 19, 3, 9, cerobong);
    kotak(ctx, 22, ALAS_Y - 19, 3, 1, '#2b2b2b');
  }
  if (petir) {
    kotak(ctx, 16, ALAS_Y - 8, 2, 1, '#f5c53f');
    kotak(ctx, 15, ALAS_Y - 7, 2, 1, '#f5c53f');
    kotak(ctx, 17, ALAS_Y - 9, 1, 1, '#f5c53f');
  }
}

/** Buat semua tekstur sprite kota. Kunci: `sk_<jenis>`. */
export function buatSpriteKota(scene: Phaser.Scene): void {
  // Pohon dan hunian memakai penggambar yang sudah ada, dengan palet sendiri.
  const daun = { leaf: '#4eae4a', leafDark: '#3a8c39', leafLight: '#74cc68', trunk: '#8a6a3c' };
  makeTree(scene, 'sk_pohon', daun, 'besar');
  makeBuilding(scene, 'sk_rumah', 10, { top: '#e2604a', left: '#cbbf9a', right: '#f1e7c8', window: '#8fd0e8' }, 6);
  makeBuilding(scene, 'sk_rumah-a', 9, { top: '#d9534f', left: '#c9b48a', right: '#efe2bd', window: '#8fd0e8' }, 7);
  makeBuilding(scene, 'sk_rumah-b', 7, { top: '#4f7fd9', left: '#c9b48a', right: '#efe2bd', window: '#8fd0e8' }, 8);
  makeBuilding(scene, 'sk_perumahan-padat', 15, { top: '#e2604a', left: '#c0b08a', right: '#ece0bd', window: '#8fd0e8' }, 3);
  makeBuilding(scene, 'sk_hunian-rendah-karbon', 11, { top: '#5fbe57', left: '#cbbf9a', right: '#f1e7c8', window: '#8fd0e8' }, 5);
  makeBuilding(scene, 'sk_gedung', 22, { top: '#35b6ab', left: '#9fb4bf', right: '#cfdee6', window: '#e0fbf7' }, 4);

  const gambar = (key: string, fn: (ctx: Ctx) => void): void => {
    const ctx = kanvas(scene, key);
    if (!ctx) return;
    fn(ctx);
    selesai(scene, key);
  };

  gambar('sk_bus-listrik', (c) => {
    alas(c, '#b9b4a8');
    bus(c, '#e9f7f5', '#35b6ab', '#8fd0e8', '#f5c53f', false);
  });
  gambar('sk_bus-konvensional', (c) => {
    alas(c, '#b9b4a8');
    bus(c, '#f0a93e', '#b8761c', '#cfe6ef', null, true);
  });
  gambar('sk_parkir', (c) => {
    alas(c, '#6f6f6f');
    // Garis parkir
    for (const x of [9, 14, 19, 24]) kotak(c, x, ALAS_Y - 2, 1, 6, '#f2f2f2');
    // Mobil kecil
    kotak(c, 15, ALAS_Y - 3, 4, 3, '#d9534f');
    kotak(c, 16, ALAS_Y - 4, 2, 1, '#8fd0e8');
    kotak(c, 20, ALAS_Y - 2, 4, 3, '#4f7fd9');
  });
  gambar('sk_sepeda', (c) => {
    alas(c, '#4aa74e');
    kotak(c, 6, ALAS_Y, 20, 1, '#f2f2f2'); // marka lajur
    // Sepeda: dua roda dan rangka
    const ox = 11;
    const oy = ALAS_Y - 4;
    for (const rx of [ox, ox + 7]) {
      kotak(c, rx, oy, 4, 1, '#16323f');
      kotak(c, rx, oy + 3, 4, 1, '#16323f');
      kotak(c, rx - 1, oy + 1, 1, 2, '#16323f');
      kotak(c, rx + 4, oy + 1, 1, 2, '#16323f');
    }
    kotak(c, ox + 3, oy - 1, 5, 1, '#d9534f');
    kotak(c, ox + 6, oy - 2, 1, 3, '#d9534f');
    kotak(c, ox + 2, oy - 2, 2, 1, '#16323f');
  });
  gambar('sk_trotoar', (c) => {
    alas(c, '#d8d2c4', '#bfb8a8');
    for (let i = 0; i < 4; i++) kotak(c, 8 + i * 5, ALAS_Y - 1, 1, 3, '#bfb8a8');
    // Pejalan kaki dan bangku
    kotak(c, 12, ALAS_Y - 6, 2, 5, '#4f7fd9');
    kotak(c, 12, ALAS_Y - 8, 2, 2, '#f1d2b0');
    kotak(c, 18, ALAS_Y - 2, 7, 1, '#8a6a3c');
    kotak(c, 18, ALAS_Y - 1, 1, 2, '#8a6a3c');
    kotak(c, 24, ALAS_Y - 1, 1, 2, '#8a6a3c');
  });
  gambar('sk_taman-kota', (c) => {
    alas(c, '#6fc25a');
    kotak(c, 14, ALAS_Y - 9, 4, 4, '#4eae4a');
    kotak(c, 13, ALAS_Y - 8, 6, 2, '#74cc68');
    kotak(c, 15, ALAS_Y - 5, 2, 4, '#8a6a3c');
    for (const [x, w] of [[8, '#f5c53f'], [22, '#d9534f'], [10, '#e46fb5'], [24, '#f5c53f']] as const) {
      kotak(c, x, ALAS_Y + (x % 3), 2, 2, w);
    }
  });
  gambar('sk_surya', (c) => {
    alas(c, '#6fc25a');
    // Panel miring
    for (let y = 0; y < 7; y++) kotak(c, 7 + y, ALAS_Y - 9 + y, 18, 1, y % 2 === 0 ? '#2c4fa3' : '#3f66c4');
    for (let x = 0; x < 4; x++) kotak(c, 10 + x * 5, ALAS_Y - 9, 1, 7, '#9fb4d8');
    kotak(c, 15, ALAS_Y - 2, 2, 3, '#555555');
  });
  gambar('sk_turbin', (c) => {
    alas(c, '#6fc25a');
    kotak(c, CX - 1, ALAS_Y - 15, 2, 15, '#e8eef2');
    kotak(c, CX - 1, ALAS_Y - 16, 2, 2, '#9fb4bf');
    // Bilah digambar terpisah (sk_bilah) dan diputar oleh CityScene.
  });

  // Pabrik ramah lingkungan: dinding hijau berdaun, atap panel surya, kincir
  // kecil, dan TANPA cerobong asap.
  gambar('sk_pabrik-hijau', (c) => {
    alas(c, '#6fc25a');
    kotak(c, 6, ALAS_Y - 9, 20, 10, '#dff2e0');
    for (let i = 0; i < 4; i++) {
      kotak(c, 6 + i * 5, ALAS_Y - 12, 4, 3, '#2c4fa3'); // panel surya di atap
      kotak(c, 7 + i * 5, ALAS_Y - 11, 1, 1, '#9fb4d8');
    }
    for (let y = 0; y < 8; y += 2) kotak(c, 6, ALAS_Y - 8 + y, 2, 1, '#4eae4a'); // tanaman rambat
    kotak(c, 11, ALAS_Y - 6, 3, 3, '#8fd0e8');
    kotak(c, 17, ALAS_Y - 6, 3, 3, '#8fd0e8');
    kotak(c, 22, ALAS_Y - 4, 3, 4, '#3a8c39'); // pintu hijau
    kotak(c, 25, ALAS_Y - 19, 1, 8, '#e8eef2'); // tiang kincir kecil
    kotak(c, 25, ALAS_Y - 21, 1, 2, '#ffffff');
    kotak(c, 23, ALAS_Y - 19, 2, 1, '#ffffff');
    kotak(c, 26, ALAS_Y - 19, 2, 1, '#ffffff');
    kotak(c, 13, ALAS_Y - 15, 3, 2, '#4eae4a'); // daun di papan nama
    kotak(c, 14, ALAS_Y - 16, 2, 1, '#74cc68');
  });

  // Toko: bangunan kecil dengan tenda bergaris dan etalase.
  gambar('sk_toko', (c) => {
    alas(c, '#d8d2c4', '#bfb8a8');
    kotak(c, 8, ALAS_Y - 9, 16, 9, '#f1e7c8');
    for (let i = 0; i < 8; i++) kotak(c, 8 + i * 2, ALAS_Y - 11, 2, 2, i % 2 === 0 ? '#d9534f' : '#ffffff');
    kotak(c, 10, ALAS_Y - 7, 7, 4, '#8fd0e8'); // etalase
    kotak(c, 19, ALAS_Y - 6, 3, 6, '#8a6a3c'); // pintu
    kotak(c, 12, ALAS_Y - 14, 8, 2, '#35b6ab'); // papan nama
  });

  // Pencakar langit pusat kota (dekorasi Peta Wilayah).
  makeBuilding(scene, 'sk_pencakar-a', 40, { top: '#8fd0e8', left: '#6f8fa0', right: '#a9c6d4', window: '#e0fbf7' }, 4);
  makeBuilding(scene, 'sk_pencakar-b', 32, { top: '#35b6ab', left: '#7d8f9a', right: '#b9ccd6', window: '#f5e6a8' }, 5);

  // Perpustakaan kota: gedung bertiang dengan atap segitiga dan papan buku.
  gambar('sk_perpustakaan', (c) => {
    alas(c, '#d8d2c4', '#bfb8a8');
    kotak(c, 6, ALAS_Y - 10, 20, 10, '#f1e7c8');
    for (const x of [8, 12, 16, 20, 24]) kotak(c, x, ALAS_Y - 10, 1, 9, '#cbbf9a');
    for (let i = 0; i < 6; i++) kotak(c, 6 + i, ALAS_Y - 11 - i, 20 - i * 2, 1, '#b5562f');
    kotak(c, 14, ALAS_Y - 15, 4, 3, '#4f7fd9'); // papan buku
    kotak(c, 15, ALAS_Y - 14, 2, 1, '#ffffff');
    kotak(c, 14, ALAS_Y - 5, 4, 5, '#8a6a3c'); // pintu
  });

  // Sekolah: gedung krem beratap merah, jam dan tiang bendera.
  gambar('sk_sekolah', (c) => {
    alas(c, '#d8d2c4', '#bfb8a8');
    kotak(c, 4, ALAS_Y - 11, 24, 11, '#f3e2b3');
    for (const x of [6, 10, 20, 24]) kotak(c, x, ALAS_Y - 8, 2, 3, '#7fb6e6');
    for (let i = 0; i < 4; i++) kotak(c, 4 + i, ALAS_Y - 12 - i, 24 - i * 2, 1, '#c0392b');
    kotak(c, 14, ALAS_Y - 15, 4, 4, '#ffffff'); // jam
    kotak(c, 15, ALAS_Y - 14, 1, 2, '#1d3640');
    kotak(c, 14, ALAS_Y - 5, 4, 5, '#8a6a3c'); // pintu
    kotak(c, 29, ALAS_Y - 18, 1, 18, '#7a7a7a'); // tiang bendera
    kotak(c, 30, ALAS_Y - 18, 4, 2, '#d62828');
    kotak(c, 30, ALAS_Y - 16, 4, 2, '#ffffff');
  });

  // Rumah sakit: gedung putih bertingkat dengan tanda palang merah.
  gambar('sk_rumah-sakit', (c) => {
    alas(c, '#d8d2c4', '#bfb8a8');
    kotak(c, 6, ALAS_Y - 18, 20, 18, '#f7f7f2');
    kotak(c, 6, ALAS_Y - 19, 20, 1, '#9fb3bd');
    for (const y of [ALAS_Y - 15, ALAS_Y - 10]) for (const x of [8, 12, 20, 23]) kotak(c, x, y, 2, 3, '#7fb6e6');
    kotak(c, 15, ALAS_Y - 17, 2, 6, '#d62828'); // palang merah
    kotak(c, 13, ALAS_Y - 15, 6, 2, '#d62828');
    kotak(c, 13, ALAS_Y - 5, 6, 5, '#9fd3e6'); // pintu kaca
  });

  // Awan: gumpalan putih untuk langit yang bergerak.
  {
    const key = 'sk_awan';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, 40, 16);
    const c = tex?.getContext();
    if (c) {
      kotak(c, 6, 8, 30, 6, '#ffffff');
      kotak(c, 10, 4, 14, 5, '#ffffff');
      kotak(c, 20, 2, 10, 7, '#ffffff');
      kotak(c, 8, 13, 26, 1, '#dfeef5');
      selesai(scene, key);
    }
  }

  // Pesepeda: warga berkeliling kota dengan sepeda (9x9, pusat di roda).
  {
    const key = 'sk_pesepeda';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, 9, 9);
    const c = tex?.getContext();
    if (c) {
      kotak(c, 0, 6, 3, 1, '#16323f');
      kotak(c, 6, 6, 3, 1, '#16323f');
      kotak(c, 0, 8, 3, 1, '#16323f');
      kotak(c, 6, 8, 3, 1, '#16323f');
      kotak(c, 2, 5, 5, 1, '#d9534f'); // rangka
      kotak(c, 4, 2, 2, 3, '#35b6ab'); // badan pengendara
      kotak(c, 4, 0, 2, 2, '#f1d2b0'); // kepala
      selesai(scene, key);
    }
  }

  // Bilah kincir: tiga bilah 120 derajat di tekstur 15x15, pusat di tengah.
  {
    const key = 'sk_bilah';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, 15, 15);
    const c = tex?.getContext();
    if (c) {
      for (const sudut of [-90, 30, 150]) {
        const r = (sudut * Math.PI) / 180;
        for (let i = 1; i <= 7; i++) kotak(c, Math.round(7 + Math.cos(r) * i), Math.round(7 + Math.sin(r) * i), 1, 1, '#ffffff');
      }
      kotak(c, 6, 6, 3, 3, '#9fb4bf');
      selesai(scene, key);
    }
  }
  gambar('sk_industri-hijau', (c) => {
    alas(c, '#b9b4a8');
    pabrik(c, '#cfe3dd', '#35b6ab', '#8fa6b2', false);
    // Daun: penanda rendah emisi
    kotak(c, 9, ALAS_Y - 15, 3, 2, '#4eae4a');
    kotak(c, 10, ALAS_Y - 16, 2, 1, '#74cc68');
  });
  gambar('sk_mesin-fosil', (c) => {
    alas(c, '#9c9384');
    pabrik(c, '#a4a4a4', '#5b5b5b', '#4b4b4b', false);
  });
  gambar('sk_mesin-listrik', (c) => {
    alas(c, '#b9b4a8');
    pabrik(c, '#e9f7f5', '#35b6ab', null, true);
  });
  gambar('sk_kompos', (c) => {
    alas(c, '#a88b5c');
    // Gundukan kompos dan wadah
    kotak(c, 8, ALAS_Y - 4, 8, 4, '#6b4f2a');
    kotak(c, 9, ALAS_Y - 6, 6, 2, '#7d5d32');
    kotak(c, 11, ALAS_Y - 7, 2, 1, '#5b8f3a');
    kotak(c, 19, ALAS_Y - 7, 6, 7, '#3a8c39');
    kotak(c, 19, ALAS_Y - 8, 6, 1, '#2e6f2e');
  });
  gambar('sk_daur-ulang', (c) => {
    alas(c, '#b9b4a8');
    const warna = ['#4f7fd9', '#4eae4a', '#f5c53f'];
    warna.forEach((w, i) => {
      kotak(c, 8 + i * 6, ALAS_Y - 8, 5, 8, w);
      kotak(c, 8 + i * 6, ALAS_Y - 9, 5, 1, '#16323f');
      kotak(c, 10 + i * 6, ALAS_Y - 5, 1, 2, '#ffffff');
    });
  });
  gambar('sk_hijau-multifungsi', (c) => {
    alas(c, '#6fc25a');
    // Kolam resapan
    kotak(c, 8, ALAS_Y - 1, 8, 3, '#4bb3e0');
    kotak(c, 9, ALAS_Y - 1, 3, 1, '#a3dcef');
    // Pohon kecil dan jalur sepeda
    kotak(c, 20, ALAS_Y - 9, 5, 5, '#4eae4a');
    kotak(c, 22, ALAS_Y - 4, 1, 4, '#8a6a3c');
    kotak(c, 6, ALAS_Y + 3, 20, 1, '#f2f2f2');
  });
}

/** Kunci tekstur untuk satu jenis sprite. */
export function kunciSprite(jenis: SpriteKota): string {
  return `sk_${jenis}`;
}
