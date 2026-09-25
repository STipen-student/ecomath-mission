/**
 * Kisi isometrik dan tata kota.
 *
 * Berkas ini hanya mengurus KOORDINAT dan TATA LETAK - tidak menggambar apa pun
 * dan tidak mengenal aturan kendala. Pemisahan ini membuat tampilan kota dapat
 * diganti total (mis. aset pixel-art buatan tangan) tanpa menyentuh logika
 * alokasi maupun instrumen.
 */

import { TILE_H, TILE_W } from '../pixel/textures.js';

/**
 * Ukuran kisi termasuk cincin air di tepinya.
 *
 * Dipilih 14 (bukan lebih besar) karena lebar kisi 14 x 32 = 448 piksel masih
 * muat pada layar HP 375 piksel dengan pembesaran 0,75 - tanpa memotong sudut
 * pulau. Kisi yang lebih besar memaksa pembesaran turun ke 0,5, dan pada
 * pembesaran itu ubin menjadi terlalu kecil untuk dibaca siswa.
 */
export const GRID = 14;

export type TileKind = 'water' | 'road' | 'plot';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Ubah koordinat kisi menjadi titik tengah ubin di layar. */
export function toIso(col: number, row: number): ScreenPoint {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

/**
 * Jenis ubin pada posisi tertentu.
 *
 * Cincin terluar berupa air sehingga kota terbaca sebagai pulau yang berbatas
 * jelas - siswa langsung melihat bahwa lahan kota memang terbatas, yang persis
 * merupakan inti kendala kapasitas pada setiap skenario.
 *
 * Jalan setiap lima ubin memecah lahan menjadi blok-blok kota. Selain memberi
 * kesan kota sungguhan, blok juga membuat pertumbuhan zona mudah dibaca mata:
 * bertambahnya alokasi terlihat sebagai blok yang terisi, bukan deretan ubin
 * yang meluber tanpa bentuk.
 */
export function tileKind(col: number, row: number): TileKind {
  if (col === 0 || row === 0 || col === GRID - 1 || row === GRID - 1) return 'water';
  if (col % 5 === 3 || row % 5 === 3) return 'road';
  return 'plot';
}

export interface RoadShape {
  alongCol: boolean;
  alongRow: boolean;
}

/** Arah pita jalan pada sebuah ubin jalan. */
export function roadShape(col: number, row: number): RoadShape {
  return { alongCol: row % 5 === 3, alongRow: col % 5 === 3 };
}

export interface PlotTile {
  col: number;
  row: number;
  /** Indeks stabil untuk memilih varian bangunan secara deterministik. */
  seed: number;
}

/**
 * Seluruh petak yang dapat dibangun, diurutkan dari belakang ke depan.
 *
 * Urutan ini juga menjadi urutan penggambaran (painter's algorithm): ubin yang
 * lebih jauh digambar lebih dulu agar bangunan di depan menutupi yang di
 * belakang - syarat mutlak agar tumpukan isometrik terlihat benar.
 */
export function plotTiles(): PlotTile[] {
  const daftar: PlotTile[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (tileKind(col, row) !== 'plot') continue;
      daftar.push({ col, row, seed: row * GRID + col });
    }
  }
  return daftar;
}

export const TOTAL_PLOTS = plotTiles().length;

/** Titik pusat pembangunan sebuah zona pada kisi. */
export interface ZoneCenter {
  col: number;
  row: number;
}

/**
 * Pusat bawaan kedua zona: dua petak di kiri-belakang dan kanan-depan dari
 * tengah pulau. Keduanya berada di TENGAH peta, bukan di pojok, sehingga kota
 * tumbuh melebar dari inti kota - dan siswa dapat memindahkannya sesuka hati.
 */
export function defaultCenters(): { x: ZoneCenter; y: ZoneCenter } {
  const tengah = (GRID - 1) / 2;
  return {
    x: { col: Math.round(tengah) - 2, row: Math.round(tengah) - 2 },
    y: { col: Math.round(tengah) + 2, row: Math.round(tengah) + 2 },
  };
}

/** Kuadrat jarak sebuah petak ke titik pusat. */
function jarakKuadrat(t: PlotTile, pusat: ZoneCenter): number {
  const dc = t.col - pusat.col;
  const dr = t.row - pusat.row;
  return dc * dc + dr * dr;
}

/**
 * Bagi petak menjadi porsi zona x dan zona y.
 *
 * SLIDER MENENTUKAN BERAPA, PETA MENENTUKAN DI MANA. Banyaknya petak dihitung
 * dari nilai slider; letaknya ditentukan titik pusat pilihan siswa. Pemisahan
 * ini disengaja dan penting bagi kesahihan instrumen: bila jumlah zona ikut
 * ditentukan dengan mengecat ubin, nilai x dan y jadi terkunci pada kelipatan
 * satu petak. Peta hanya punya seratusan petak, sedangkan sebagian task menuntut
 * x sampai 210 hektar - dan titik optimum L3-SDG13-A berada di 33,33 ton.
 * Titik optimum akan menjadi tak terjangkau, dan K3 menghukum seluruh siswa
 * karena keterbatasan tampilan, bukan karena penalaran mereka.
 *
 * Tiap zona mengisi petak TERDEKAT dari pusatnya, sehingga tumbuh melebar
 * seperti kawasan yang berkembang dari inti. Zona x memilih lebih dulu; zona y
 * mengambil petak terdekat yang belum terpakai.
 */
export function allocatePlots(
  x: number,
  xMax: number,
  y: number,
  yMax: number,
  pusat?: { x: ZoneCenter; y: ZoneCenter },
): { zonaX: Set<number>; zonaY: Set<number> } {
  const petak = plotTiles();
  const total = petak.length;
  const separuh = Math.floor(total / 2);
  const titik = pusat ?? defaultCenters();

  const porsi = (nilai: number, maks: number): number =>
    maks > 0 ? Math.min(1, Math.max(0, nilai / maks)) : 0;

  let jumlahX = Math.round(porsi(x, xMax) * separuh);
  let jumlahY = Math.round(porsi(y, yMax) * separuh);

  // Pengaman bila pembulatan membuat keduanya melebihi kapasitas peta.
  if (jumlahX + jumlahY > total) {
    jumlahY = Math.max(0, total - jumlahX);
  }

  const zonaX = new Set<number>();
  const zonaY = new Set<number>();

  // Urutan jarak dipakai sebagai antrean pengisian. Seed dipakai sebagai
  // pemecah seri agar hasilnya deterministik - tanpa itu, petak berjarak sama
  // dapat bertukar tempat tiap kali peta digambar ulang dan kota tampak berkedip.
  const dekatX = [...petak].sort((a, b) => jarakKuadrat(a, titik.x) - jarakKuadrat(b, titik.x) || a.seed - b.seed);
  for (let i = 0; i < jumlahX && i < dekatX.length; i++) {
    zonaX.add(dekatX[i]!.seed);
  }

  const dekatY = [...petak]
    .filter((t) => !zonaX.has(t.seed))
    .sort((a, b) => jarakKuadrat(a, titik.y) - jarakKuadrat(b, titik.y) || a.seed - b.seed);
  for (let i = 0; i < jumlahY && i < dekatY.length; i++) {
    zonaY.add(dekatY[i]!.seed);
  }

  return { zonaX, zonaY };
}

/**
 * Ubah titik dunia menjadi koordinat kisi, lalu tarik ke petak terbangun
 * terdekat.
 *
 * Menarik ke petak terdekat - bukan menolak ketukan - membuat peta terasa
 * memaafkan di layar sentuh: menekan tepat di garis jalan atau di air tetap
 * menghasilkan pilihan yang masuk akal.
 */
export function worldToPlot(wx: number, wy: number): ZoneCenter | null {
  const a = (2 * wx) / TILE_W;
  const b = (2 * wy) / TILE_H;
  const col = Math.round((a + b) / 2);
  const row = Math.round((b - a) / 2);

  if (tileKind(col, row) === 'plot') return { col, row };

  let terdekat: ZoneCenter | null = null;
  let jarakTerbaik = Infinity;
  for (const t of plotTiles()) {
    const d = (t.col - col) * (t.col - col) + (t.row - row) * (t.row - row);
    if (d < jarakTerbaik) {
      jarakTerbaik = d;
      terdekat = { col: t.col, row: t.row };
    }
  }
  // Ketukan yang sangat jauh di luar pulau diabaikan.
  return jarakTerbaik <= 36 ? terdekat : null;
}

/** Lebar dan tinggi total kisi dalam piksel (sebelum pembesaran kamera). */
export function gridPixelSize(): { width: number; height: number } {
  return {
    width: GRID * TILE_W,
    height: GRID * TILE_H + 40,
  };
}
