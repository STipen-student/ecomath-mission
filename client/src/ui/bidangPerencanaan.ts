/**
 * Bidang perencanaan mini - grafik Kartesius kecil dari pertidaksamaan yang
 * DITULIS SISWA (docs/SCORING_SPEC.md §7.21, usulan U3 pada
 * docs/Draf_Perbaikan_Mekanik_Game.md).
 *
 * Yang digambar:
 *   - garis batas setiap pertidaksamaan tulisan siswa (putus-putus bila < atau >);
 *   - daerah irisan seluruh tulisan itu di dalam kotak batas slider;
 *   - titik (x, y) saat ini, hijau bila memenuhi tulisan siswa, merah bila tidak.
 *
 * KEPUTUSAN DESAIN PENTING - sumbernya tulisan siswa, BUKAN kunci jawaban.
 * Bidang ini menerima kendala yang sama dengan meter HUD dan panel Titik Pojok
 * (`tulisanUntukPerhitungan()` di PlayScreen). Bila tulisannya salah, grafiknya
 * pun salah, dan siswa baru tahu yang sebenarnya saat Kirim. Kendala tersirat
 * Level 4 tidak pernah tergambar kecuali siswa sendiri menuliskannya.
 *
 * Bidang ini hanya TAMPILAN: tidak dapat diketuk, tidak mengubah keadaan, dan
 * tidak memancarkan event apa pun. Membuka-menutupnya setara dengan membuka
 * laci panel - bukan perubahan keadaan task.
 *
 * Aktif hanya bila task.feedback.graphSupport bernilai true (ketiga varian
 * Level 3, lihat server/src/tasks/index.ts → FEEDBACK_FEATURES).
 */

import type { ConstraintDto } from '../api/types.js';
import { evaluate } from '../game/geometry.js';
import { el, num } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ukuran kanvas SVG (satuan viewBox) dan tepi untuk label sumbu. */
const W = 220;
const H = 168;
const TEPI = { kiri: 34, kanan: 10, atas: 10, bawah: 24 } as const;
const EPS = 1e-9;

export interface DataBidang {
  /** Tulisan siswa + non-negativitas, persis yang dipakai meter HUD. */
  kendala: ConstraintDto[];
  /** Banyak pertidaksamaan yang sudah ditulis siswa (tanpa non-negativitas). */
  jumlahTulisan: number;
  x: number;
  y: number;
  xMax: number;
  yMax: number;
}

type Titik = { x: number; y: number };

/** Satu setengah-bidang dalam bentuk a·x + b·y ≤ c. */
interface SetengahBidang {
  a: number;
  b: number;
  c: number;
}

function keBentukKurangDari(k: ConstraintDto): SetengahBidang {
  return k.op === '>=' || k.op === '>' ? { a: -k.a, b: -k.b, c: -k.c } : { a: k.a, b: k.b, c: k.c };
}

/**
 * Potong poligon dengan satu setengah-bidang (Sutherland–Hodgman).
 * Pertidaksamaan tegas digambar seperti tak-tegas; bedanya ditunjukkan oleh
 * garis putus-putus, sesuai kebiasaan buku pelajaran SPtLDV.
 */
function potong(poligon: Titik[], h: SetengahBidang): Titik[] {
  const hasil: Titik[] = [];
  const nilai = (p: Titik): number => h.a * p.x + h.b * p.y - h.c;

  for (let i = 0; i < poligon.length; i++) {
    const p = poligon[i]!;
    const q = poligon[(i + 1) % poligon.length]!;
    const vp = nilai(p);
    const vq = nilai(q);
    const pDalam = vp <= EPS;
    const qDalam = vq <= EPS;

    if (pDalam) hasil.push(p);
    if (pDalam !== qDalam) {
      const t = vp / (vp - vq);
      hasil.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
    }
  }
  return hasil;
}

/** Daerah irisan seluruh kendala di dalam kotak [0, xMax] × [0, yMax]. */
export function daerahIrisan(kendala: ConstraintDto[], xMax: number, yMax: number): Titik[] {
  let poligon: Titik[] = [
    { x: 0, y: 0 },
    { x: xMax, y: 0 },
    { x: xMax, y: yMax },
    { x: 0, y: yMax },
  ];
  for (const k of kendala) {
    if (k.kind === 'bounding_box' || (k.a === 0 && k.b === 0)) continue;
    poligon = potong(poligon, keBentukKurangDari(k));
    if (poligon.length === 0) break;
  }
  return poligon;
}

/** Ruas garis a·x + b·y = c yang berada di dalam kotak batas; null bila di luar. */
export function ruasGaris(k: ConstraintDto, xMax: number, yMax: number): [Titik, Titik] | null {
  if (k.a === 0 && k.b === 0) return null;
  const kandidat: Titik[] = [];
  const dalam = (p: Titik): boolean => p.x >= -EPS && p.x <= xMax + EPS && p.y >= -EPS && p.y <= yMax + EPS;

  if (Math.abs(k.b) > EPS) {
    for (const x of [0, xMax]) kandidat.push({ x, y: (k.c - k.a * x) / k.b });
  }
  if (Math.abs(k.a) > EPS) {
    for (const y of [0, yMax]) kandidat.push({ x: (k.c - k.b * y) / k.a, y });
  }

  const unik: Titik[] = [];
  for (const p of kandidat.filter(dalam)) {
    if (!unik.some((u) => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6)) unik.push(p);
  }
  if (unik.length < 2) return null;

  // Ambil dua titik terjauh agar ruas mencakup seluruh potongan di kotak.
  let terbaik: [Titik, Titik] = [unik[0]!, unik[1]!];
  let jarak = -1;
  for (let i = 0; i < unik.length; i++) {
    for (let j = i + 1; j < unik.length; j++) {
      const d = (unik[i]!.x - unik[j]!.x) ** 2 + (unik[i]!.y - unik[j]!.y) ** 2;
      if (d > jarak) {
        jarak = d;
        terbaik = [unik[i]!, unik[j]!];
      }
    }
  }
  return terbaik;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export class BidangPerencanaan {
  readonly root: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly catatan: HTMLElement;
  private readonly tombol: HTMLButtonElement;
  private terbuka: boolean;

  constructor() {
    // Selalu dimulai TERBUKA, di layar apa pun. Bila di ponsel dimulai tertutup,
    // siswa yang mengerjakan lewat ponsel menerima bantuan representasi lebih
    // sedikit daripada siswa di laptop pada varian yang sama - kondisi tugas
    // tidak lagi setara antarperangkat. Siswa boleh menutupnya sendiri.
    this.terbuka = true;

    this.tombol = el('button', { class: 'graph-toggle', ariaLabel: 'Buka atau tutup bidang perencanaan' });
    this.tombol.addEventListener('click', () => {
      this.terbuka = !this.terbuka;
      this.aturTerbuka();
    });

    this.svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'graph-svg',
      role: 'img',
      'aria-label': 'Grafik pertidaksamaan yang kamu tulis dan posisi rencanamu',
    });
    this.catatan = el('p', { class: 'graph-note' });

    this.root = el('div', { class: 'plate plate-graph' }, this.tombol, el('div', { class: 'graph-body' }, this.svg, this.catatan));
    this.aturTerbuka();
  }

  private aturTerbuka(): void {
    this.root.classList.toggle('is-collapsed', !this.terbuka);
    this.tombol.textContent = `${this.terbuka ? '▾' : '▸'} Bidang perencanaan`;
    this.tombol.setAttribute('aria-expanded', String(this.terbuka));
  }

  gambar(d: DataBidang): void {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const lebar = W - TEPI.kiri - TEPI.kanan;
    const tinggi = H - TEPI.atas - TEPI.bawah;
    const sx = (v: number): number => TEPI.kiri + (d.xMax > 0 ? v / d.xMax : 0) * lebar;
    const sy = (v: number): number => H - TEPI.bawah - (d.yMax > 0 ? v / d.yMax : 0) * tinggi;

    // Kotak batas slider.
    this.svg.append(svgEl('rect', { x: sx(0), y: sy(d.yMax), width: lebar, height: tinggi, class: 'graph-box' }));

    // Daerah irisan tulisan siswa.
    const daerah = daerahIrisan(d.kendala, d.xMax, d.yMax);
    if (daerah.length >= 3) {
      this.svg.append(
        svgEl('polygon', {
          points: daerah.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' '),
          class: 'graph-region',
        }),
      );
    }

    // Garis batas setiap pertidaksamaan tulisan siswa (bukan non-negativitas).
    for (const k of d.kendala) {
      if (k.kind === 'nonnegativity' || k.kind === 'bounding_box') continue;
      const ruas = ruasGaris(k, d.xMax, d.yMax);
      if (!ruas) continue;
      const tegas = k.op === '<' || k.op === '>';
      this.svg.append(
        svgEl('line', {
          x1: sx(ruas[0].x).toFixed(1),
          y1: sy(ruas[0].y).toFixed(1),
          x2: sx(ruas[1].x).toFixed(1),
          y2: sy(ruas[1].y).toFixed(1),
          class: tegas ? 'graph-line is-strict' : 'graph-line',
        }),
      );
    }

    // Label sumbu: 0 dan nilai maksimum slider.
    const label = (x: number, y: number, teks: string, anchor: string): void => {
      const t = svgEl('text', { x, y, 'text-anchor': anchor, class: 'graph-tick' });
      t.textContent = teks;
      this.svg.append(t);
    };
    label(sx(0), H - 8, '0', 'middle');
    label(sx(d.xMax), H - 8, num(d.xMax), 'end');
    label(sx(d.xMax) - lebar / 2, H - 8, 'x', 'middle');
    label(TEPI.kiri - 4, sy(d.yMax) + 9, num(d.yMax), 'end');
    label(TEPI.kiri - 4, sy(d.yMax / 2) + 4, 'y', 'end');

    // Posisi rencana saat ini, dinilai terhadap tulisan siswa.
    const layak = evaluate(d.kendala, d.x, d.y).feasible;
    this.svg.append(
      svgEl('circle', {
        cx: sx(Math.min(Math.max(d.x, 0), d.xMax)).toFixed(1),
        cy: sy(Math.min(Math.max(d.y, 0), d.yMax)).toFixed(1),
        r: 5,
        class: layak ? 'graph-point is-ok' : 'graph-point is-bad',
      }),
    );

    if (d.jumlahTulisan === 0) {
      this.catatan.textContent = 'Tulis kendala di panel Kendala untuk melihat garis dan daerahnya di sini.';
    } else if (daerah.length < 3) {
      this.catatan.textContent = 'Kendala yang kamu tulis belum punya daerah bersama di dalam peta.';
    } else {
      this.catatan.textContent = 'Daerah berwarna = irisan pertidaksamaan yang kamu tulis.';
    }
  }
}
