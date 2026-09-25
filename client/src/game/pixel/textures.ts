/**
 * Pabrik tekstur pixel-art isometrik.
 *
 * Seluruh aset digambar per-piksel ke dalam canvas saat aplikasi dimulai, lalu
 * didaftarkan sebagai tekstur Phaser. Pendekatan ini dipilih daripada memuat
 * berkas gambar karena tiga alasan praktis:
 *
 *   1. Tidak ada aset yang perlu diunduh - penting saat 30 siswa membuka aplikasi
 *      bersamaan lewat wifi sekolah.
 *   2. Warna zona dapat disesuaikan per task tanpa membuat berkas gambar baru.
 *   3. Bentuk bangunan dihasilkan dari ekstrusi jejak ubin, sehingga ubin dan
 *      bangunan dijamin sejajar sempurna pada kisi isometrik.
 *
 * Ukuran ubin 32x16 piksel (rasio 2:1, standar isometrik). Kamera menampilkan
 * dengan pembesaran bilangan bulat dan `pixelArt: true`, sehingga piksel tetap
 * tajam dan tidak buram.
 */

import Phaser from 'phaser';

export const TILE_W = 32;
export const TILE_H = 16;
/** Tinggi "tanah" di bawah permukaan ubin, memberi kesan ubin sebagai balok. */
export const TILE_SKIRT = 4;

type Ctx = CanvasRenderingContext2D;

/** Gambar satu piksel. */
function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

/**
 * Derau deterministik dari koordinat.
 *
 * Dipakai untuk menaburkan piksel gelap/terang pada rumput dan air. Harus
 * deterministik - bila memakai Math.random(), tekstur akan berubah tiap kali
 * halaman dimuat dan peta terlihat "berkedip" saat digambar ulang.
 */
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Setengah lebar baris ke-y pada belah ketupat isometrik. */
function rowHalfWidth(y: number): number {
  return y < TILE_H / 2 ? (y + 1) * 2 : (TILE_H - y) * 2;
}

/** Rentang kolom yang terisi pada baris ke-y. */
function rowSpan(y: number): { start: number; end: number } {
  const half = rowHalfWidth(y);
  return { start: TILE_W / 2 - half, end: TILE_W / 2 + half };
}

/** Baris terbawah yang terisi pada kolom x - dipakai untuk membuat skirt/ekstrusi. */
function bottomRowAt(x: number): number {
  for (let y = TILE_H - 1; y >= 0; y--) {
    const { start, end } = rowSpan(y);
    if (x >= start && x < end) return y;
  }
  return -1;
}

function createCanvas(scene: Phaser.Scene, key: string, w: number, h: number): Ctx | null {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  return tex ? tex.getContext() : null;
}

function refresh(scene: Phaser.Scene, key: string): void {
  const tex = scene.textures.get(key);
  if (tex instanceof Phaser.Textures.CanvasTexture) tex.refresh();
}

/* ------------------------------------------------------------------ */
/* Ubin dasar                                                          */
/* ------------------------------------------------------------------ */

export interface TilePalette {
  /** Warna permukaan utama. */
  base: string;
  /** Warna taburan yang sedikit lebih terang. */
  light: string;
  /** Warna taburan yang sedikit lebih gelap. */
  dark: string;
  /** Warna sisi tanah di bawah permukaan. */
  soil: string;
  /** Kerapatan taburan 0..1. */
  speckle?: number;
  /**
   * Gambar pola riak mendatar alih-alih taburan acak.
   *
   * Taburan acak pada permukaan seluas air membuat peta terlihat seperti derau
   * layar, bukan air. Riak berpola memberi arah dan ketenangan, sekaligus tetap
   * deterministik sehingga tidak berkedip antar penggambaran.
   */
  wave?: boolean;
  /**
   * Sisi belah ketupat yang digambar sebagai pasir pantai.
   * 'ul' kiri-atas, 'ur' kanan-atas, 'dl' kiri-bawah, 'dr' kanan-bawah.
   */
  fringe?: 'ul' | 'ur' | 'dl' | 'dr';
  fringeColor?: string;
}

/**
 * Ubin permukaan datar (rumput, air, tanah kosong).
 * Tekstur berukuran TILE_W x (TILE_H + TILE_SKIRT); skirt digambar dengan
 * mengekstrusi siluet bawah belah ketupat ke bawah.
 */
export function makeTile(scene: Phaser.Scene, key: string, p: TilePalette): void {
  const ctx = createCanvas(scene, key, TILE_W, TILE_H + TILE_SKIRT);
  if (!ctx) return;

  const speckle = p.speckle ?? 0.18;

  for (let y = 0; y < TILE_H; y++) {
    const { start, end } = rowSpan(y);
    for (let x = start; x < end; x++) {
      let warna = p.base;

      if (p.wave) {
        // Riak: garis terang tiap tiga baris, digeser mengikuti x agar
        // mengalir menyerong seperti permukaan air.
        const fase = (y * 2 + Math.floor(x / 2)) % 7;
        if (fase === 0) warna = p.light;
        else if (fase === 3) warna = p.dark;
      } else {
        const n = noise(x, y);
        if (n < speckle) warna = p.dark;
        else if (n > 1 - speckle * 0.7) warna = p.light;
      }

      px(ctx, x, y, warna);
    }
  }

  // Tepi pasir: pita sempit di satu sisi belah ketupat, menghadap daratan.
  // Memberi garis pantai sehingga peralihan air ke rumput tidak terlihat
  // seperti potongan mendadak.
  if (p.fringe && p.fringeColor) {
    const tebal = 3;
    for (let y = 0; y < TILE_H; y++) {
      const { start, end } = rowSpan(y);
      const atas = y < TILE_H / 2;
      for (let x = start; x < end; x++) {
        const dariKiri = x - start;
        const dariKanan = end - 1 - x;
        const kena =
          p.fringe === 'ul' ? atas && dariKiri < tebal
          : p.fringe === 'ur' ? atas && dariKanan < tebal
          : p.fringe === 'dl' ? !atas && dariKiri < tebal
          : !atas && dariKanan < tebal;
        if (kena) px(ctx, x, y, dariKiri < 1 || dariKanan < 1 ? shade(p.fringeColor, -18) : p.fringeColor);
      }
    }
  }

  // Skirt tanah: perpanjang tiap kolom ke bawah dari baris terbawahnya.
  for (let x = 0; x < TILE_W; x++) {
    const yb = bottomRowAt(x);
    if (yb < 0) continue;
    for (let s = 1; s <= TILE_SKIRT; s++) {
      // Sisi kiri sedikit lebih gelap daripada sisi kanan - meniru arah cahaya
      // dari kanan atas, konvensi yang dipakai hampir semua game isometrik.
      const kiri = x < TILE_W / 2;
      px(ctx, x, yb + s, kiri ? shade(p.soil, -14) : p.soil);
    }
  }

  refresh(scene, key);
}

/* ------------------------------------------------------------------ */
/* Jalan                                                               */
/* ------------------------------------------------------------------ */

/**
 * Ubin jalan.
 *
 * `alongCol` menggambar pita menuju kanan-bawah (arah bertambahnya kolom pada
 * kisi isometrik), `alongRow` menuju kiri-bawah. Persimpangan menyalakan keduanya.
 */
export function makeRoad(
  scene: Phaser.Scene,
  key: string,
  opts: { alongCol: boolean; alongRow: boolean; asphalt: string; line: string; soil: string },
): void {
  const ctx = createCanvas(scene, key, TILE_W, TILE_H + TILE_SKIRT);
  if (!ctx) return;

  const cx = TILE_W / 2;
  const cy = TILE_H / 2 - 0.5;

  for (let y = 0; y < TILE_H; y++) {
    const { start, end } = rowSpan(y);
    for (let x = start; x < end; x++) {
      px(ctx, x, y, noise(x, y) < 0.12 ? shade(opts.asphalt, 8) : opts.asphalt);
    }
  }

  // Marka putus-putus di sepanjang sumbu jalan.
  const garis = (arah: 1 | -1): void => {
    for (let x = 2; x < TILE_W - 2; x++) {
      const y = Math.round(cy + arah * 0.5 * (x - cx));
      if (y < 0 || y >= TILE_H) continue;
      const { start, end } = rowSpan(y);
      if (x < start || x >= end) continue;
      // Pola putus-putus: gambar 3 piksel, lewati 3 piksel.
      if (Math.floor(x / 3) % 2 === 0) px(ctx, x, y, opts.line);
    }
  };

  if (opts.alongCol) garis(1);
  if (opts.alongRow) garis(-1);

  for (let x = 0; x < TILE_W; x++) {
    const yb = bottomRowAt(x);
    if (yb < 0) continue;
    for (let s = 1; s <= TILE_SKIRT; s++) {
      px(ctx, x, yb + s, x < TILE_W / 2 ? shade(opts.soil, -14) : opts.soil);
    }
  }

  refresh(scene, key);
}

/* ------------------------------------------------------------------ */
/* Bangunan                                                            */
/* ------------------------------------------------------------------ */

export interface BuildingPalette {
  /** Warna atap. */
  top: string;
  /** Dinding menghadap kiri-bawah (lebih gelap). */
  left: string;
  /** Dinding menghadap kanan-bawah. */
  right: string;
  /** Warna jendela; kosongkan untuk bangunan tanpa jendela. */
  window?: string;
}

/**
 * Bangunan sebagai balok isometrik.
 *
 * Dibentuk dengan mengekstrusi siluet bawah belah ketupat ubin sejauh `height`
 * piksel ke bawah, lalu menaikkan seluruh gambar. Hasilnya dijamin menempel
 * persis pada jejak ubin - tidak mungkin meleset seperti bila digambar manual.
 *
 * @param inset  penyusutan jejak agar bangunan tidak memenuhi ubin (0-6 piksel)
 */
export function makeBuilding(
  scene: Phaser.Scene,
  key: string,
  height: number,
  p: BuildingPalette,
  inset = 3,
): void {
  const H = TILE_H + height;
  const ctx = createCanvas(scene, key, TILE_W, H);
  if (!ctx) return;

  const skalaX = (TILE_W - inset * 2) / TILE_W;
  const petaX = (x: number): number => Math.round(TILE_W / 2 + (x - TILE_W / 2) * skalaX);

  // Dinding: ekstrusi ke bawah dari siluet atap.
  for (let x = 0; x < TILE_W; x++) {
    const yb = bottomRowAt(x);
    if (yb < 0) continue;
    const xd = petaX(x);
    const kiri = x < TILE_W / 2;
    const dinding = kiri ? p.left : p.right;

    for (let s = 1; s <= height; s++) {
      px(ctx, xd, yb + s, dinding);
    }

    // Jendela: kisi 2 piksel dengan jeda, dimulai agak di bawah atap.
    if (p.window) {
      for (let s = 3; s <= height - 3; s += 4) {
        const barisJendela = Math.floor((x + (kiri ? 0 : 2)) / 3) % 2 === 0;
        if (barisJendela) px(ctx, xd, yb + s, p.window);
      }
    }
  }

  // Garis gelap tipis di kaki dinding - membuat bangunan terasa menapak tanah
  // dan bukan melayang di atas ubin.
  for (let x = 0; x < TILE_W; x++) {
    const yb = bottomRowAt(x);
    if (yb < 0 || height < 2) continue;
    px(ctx, petaX(x), yb + height, shade(x < TILE_W / 2 ? p.left : p.right, -26));
  }

  // Atap digambar terakhir supaya menutup ujung atas dinding.
  for (let y = 0; y < TILE_H; y++) {
    const { start, end } = rowSpan(y);
    for (let x = start; x < end; x++) {
      const xd = petaX(x);
      // Rim terang di kedua sisi atas atap: sorotan cahaya yang membuat siluet
      // bangunan tetap terbaca meski berimpitan dengan bangunan tetangga.
      const diTepiAtas = y < TILE_H / 2 && (x - start < 2 || end - 1 - x < 2);
      const warna = diTepiAtas ? shade(p.top, 34) : noise(x, y) < 0.14 ? shade(p.top, -10) : p.top;
      px(ctx, xd, y, warna);
    }
  }

  refresh(scene, key);
}

/**
 * Pohon: batang tipis dengan tajuk membulat.
 * Digambar tangan (bukan hasil ekstrusi) karena bentuk organik terlihat jauh
 * lebih hidup daripada balok, dan zona hijau adalah inti pesan SDG 11.
 */
export function makeTree(
  scene: Phaser.Scene,
  key: string,
  p: { leaf: string; leafDark: string; leafLight: string; trunk: string },
  ukuran: 'kecil' | 'besar' = 'besar',
): void {
  const tinggi = ukuran === 'besar' ? 18 : 13;
  const H = TILE_H + tinggi;
  const ctx = createCanvas(scene, key, TILE_W, H);
  if (!ctx) return;

  const cx = TILE_W / 2;
  const dasarY = TILE_H / 2 + tinggi - 1;

  // Batang
  const tinggiBatang = ukuran === 'besar' ? 5 : 4;
  for (let s = 0; s < tinggiBatang; s++) {
    px(ctx, cx - 1, dasarY - s, p.trunk);
    px(ctx, cx, dasarY - s, shade(p.trunk, 12));
  }

  // Tajuk: lingkaran kasar dengan sisi kiri lebih gelap.
  const pusatY = dasarY - (ukuran === 'besar' ? 10 : 7);
  const r = ukuran === 'besar' ? 6 : 4;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx;
      const y = pusatY + dy;
      if (x < 0 || x >= TILE_W || y < 0 || y >= H) continue;
      let warna = p.leaf;
      if (dx + dy < -3) warna = p.leafLight;
      else if (dx - dy > 3) warna = p.leafDark;
      else if (noise(x, y) < 0.2) warna = p.leafDark;
      px(ctx, x, y, warna);
    }
  }

  refresh(scene, key);
}

/**
 * Bayangan jatuh sebuah bangunan.
 *
 * Belah ketupat gelap semi-transparan yang digambar di atas ubin, sedikit
 * bergeser ke kanan-bawah mengikuti arah cahaya. Tanpa bayangan, bangunan
 * tampak menempel datar pada peta; dengan bayangan, kota langsung terbaca
 * memiliki kedalaman.
 */
export function makeShadow(scene: Phaser.Scene, key: string, inset = 3): void {
  const ctx = createCanvas(scene, key, TILE_W, TILE_H);
  if (!ctx) return;

  const skalaX = (TILE_W - inset * 2) / TILE_W;
  for (let y = 0; y < TILE_H; y++) {
    const { start, end } = rowSpan(y);
    for (let x = start; x < end; x++) {
      const xd = Math.round(TILE_W / 2 + (x - TILE_W / 2) * skalaX);
      px(ctx, xd, y, 'rgba(0,0,0,0.26)');
    }
  }

  refresh(scene, key);
}

/* ------------------------------------------------------------------ */
/* Penanda pilihan                                                     */
/* ------------------------------------------------------------------ */

/** Bingkai belah ketupat untuk menyorot ubin (dipakai saat kendala dilanggar). */
export function makeTileOutline(scene: Phaser.Scene, key: string, color: string): void {
  const ctx = createCanvas(scene, key, TILE_W, TILE_H);
  if (!ctx) return;

  for (let y = 0; y < TILE_H; y++) {
    const { start, end } = rowSpan(y);
    px(ctx, start, y, color);
    px(ctx, end - 1, y, color);
  }

  refresh(scene, key);
}

/* ------------------------------------------------------------------ */
/* Utilitas warna                                                      */
/* ------------------------------------------------------------------ */

/** Gelapkan (negatif) atau terangkan (positif) sebuah warna heksadesimal. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number): number => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
