/**
 * Layar Kota (eksperimen, branch theotown-ui).
 *
 * Tampilan mengikuti layar utama (HUD, panel, bilah alat, huruf pixel), tetapi
 * mekaniknya baru: pemain menaruh bangunan di peta dengan dana terbatas.
 *
 * Data hanya dikirim saat permainan selesai, ke /api/kota/submit, dan dipisah
 * dari instrumen 1.1.0 (kode kelas DRAF2-). Lihat docs/DRAF_INSTRUMEN_2_THEOTOWN.md.
 */

import { BANGUNAN, bisaMembangun, danaSehari, hitungKeadaan, type Bangunan } from './ekonomi.js';
import { mountCity, type CityHandle } from '../game/mountCity.js';
import { GRID, plotTiles } from '../game/iso/isoGrid.js';

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:4000';

/** Aksi yang dicatat untuk dikirim ke /api/kota/submit (draf 2). */
type AksiKirim =
  | { tipe: 'pilih'; jenis: Bangunan; hari: number }
  | { tipe: 'tempatkan'; jenis: Bangunan; petak: number; hari: number; melanggar: boolean }
  | { tipe: 'bongkar'; jenis: Bangunan; petak: number; hari: number; bahagiaSebelum: number; bahagiaSesudah: number };

const DANA_AWAL = 600;
const HARI_MAKS = 40;
const TARGET_WARGA = 35;

const LABEL: Record<Bangunan, string> = {
  rumah: 'Rumah', toko: 'Toko', pabrik: 'Pabrik', taman: 'Taman', surya: 'Panel surya',
};
const IKON: Record<Bangunan, string> = {
  rumah: '🏠', toko: '🏪', pabrik: '🏭', taman: '🌳', surya: '☀️',
};

/** Petak kota = seed kisi (row * GRID + col). Hanya petak 'plot' yang bisa dibangun. */
const PETAK_BANGUN = new Set(plotTiles().map((t) => t.seed));

/** Tetangga sisi (4 arah) yang juga petak bangun, pada kisi isometrik. */
function tetangga(i: number): number[] {
  const col = i % GRID, row = Math.floor(i / GRID), hasil: number[] = [];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const seed = (row + dr) * GRID + (col + dc);
    if (PETAK_BANGUN.has(seed)) hasil.push(seed);
  }
  return hasil;
}

/** Kode jenis bangunan untuk CityScene (kunci sama dengan SPRITE_KOTA). */
function kodeJenis(b: Bangunan): string {
  return b;
}

export interface OpsiKota {
  /** false = Kota Bebas: tidak ada data yang dikirim ke server. */
  simpan?: boolean;
  /** Bila diisi, bilah alat menampilkan tombol Keluar. */
  onKeluar?: () => void;
}

export function mountKotaScreen(root: HTMLElement, opsi: OpsiKota = {}): void {
  const simpan = opsi.simpan ?? true;
  let petak: Array<Bangunan | null> = Array(GRID * GRID).fill(null);
  let dana = DANA_AWAL;
  let hari = 1;
  let pilihan: Bangunan = 'rumah';
  let hapus = false;
  let selesai = false;
  let pesan = 'Bangun rumah dan toko, lalu jaga kebahagiaan di atas 60%.';
  const aksi: AksiKirim[] = [];
  const parameter = new URLSearchParams(window.location.search);
  const namaSiswa = parameter.get('nama') ?? 'Siswa uji';
  const kodeKelas = `DRAF2-${parameter.get('kelas') ?? 'LOKAL'}`;

  // Kerangka layar: sama dengan layar utama (app-shell, HUD di atas, bilah di bawah).
  root.replaceChildren();
  const shell = document.createElement('div');
  shell.className = 'app-shell kota-shell';

  const hud = document.createElement('header');
  hud.className = 'hud kota-hud';

  const peta = document.createElement('div');
  peta.className = 'kota-peta';
  // Peta isometrik dari layar utama (CityScene), dalam mode kota.
  const kota: CityHandle = mountCity(peta);

  const panel = document.createElement('div');
  panel.className = 'plate kota-panel';

  const bilah = document.createElement('nav');
  bilah.className = 'toolbar kota-bilah';

  shell.append(hud, peta, panel, bilah);
  root.append(shell);

  function keadaan() {
    return hitungKeadaan(petak, tetangga);
  }

  /** Satu kotak HUD bergaya plate, sama dengan lencana level di layar utama. */
  function plat(judul: string, nilai: string): HTMLElement {
    const p = document.createElement('div');
    p.className = 'plate kota-stat';
    p.innerHTML = `<span class="kota-stat-judul">${judul}</span><span class="kota-stat-nilai">${nilai}</span>`;
    return p;
  }

  function tool(ikon: string, label: string, aksiKlik: () => void, aktif = false, kelas = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = `tool ${kelas}${aktif ? ' is-active' : ''}`.trim();
    b.innerHTML = `<span class="tool-ico">${ikon}</span><span class="tool-label">${label}</span>`;
    b.addEventListener('click', aksiKlik);
    return b;
  }

  function gambar(): void {
    const k = keadaan();

    hud.replaceChildren(
      (() => {
        const id = document.createElement('div');
        id.className = 'plate plate-identity';
        id.innerHTML = `<span class="lvl-badge">HARI</span><span class="identity-text"><span class="identity-city">Kota ${namaSiswa}</span><span class="identity-who">${hari} / ${HARI_MAKS}</span></span>`;
        return id;
      })(),
      plat('Dana', String(dana)),
      plat('Warga', `${k.warga} / ${TARGET_WARGA}`),
      plat('Pekerjaan', `${k.pekerja} / ${k.lapanganKerja}`),
      plat('Bahagia', `${k.bahagia}%`),
    );

    const peton = new Map<number, string>();
    petak.forEach((b, i) => { if (b) peton.set(i, kodeJenis(b)); });
    kota.tampilkanKota(peton);

    panel.replaceChildren(
      (() => {
        const p = document.createElement('p');
        p.className = 'kota-pesan';
        p.textContent = pesan;
        return p;
      })(),
    );

    bilah.replaceChildren(
      ...(Object.keys(BANGUNAN) as Bangunan[]).map((jenis) =>
        tool(IKON[jenis], `${LABEL[jenis]} ${BANGUNAN[jenis].biaya}`, () => {
          pilihan = jenis;
          hapus = false;
          aksi.push({ tipe: 'pilih', jenis, hari });
          gambar();
        }, !hapus && pilihan === jenis),
      ),
      tool('🗑', hapus ? 'Hapus (aktif)' : 'Hapus', () => { hapus = !hapus; gambar(); }, hapus),
      tool('↺', 'Ulang', mulaiUlang, false, opsi.onKeluar ? '' : 'tool-go'),
      ...(opsi.onKeluar
        ? [tool('✕', 'Keluar', () => {
            window.clearInterval(pewaktu);
            kota.destroy();
            opsi.onKeluar?.();
          }, false, 'tool-go')]
        : []),
    );
  }

  // Ketukan pada peta: ubah koordinat kisi menjadi seed petak.
  kota.setPickMode((titik) => klik(titik.row * GRID + titik.col));

  function klik(i: number): void {
    if (selesai) return;
    if (hapus) {
      const b = petak[i];
      if (!b) return;
      const sebelum = keadaan().bahagia;
      dana += Math.floor(BANGUNAN[b].biaya / 2);
      petak[i] = null;
      aksi.push({ tipe: 'bongkar', jenis: b, petak: i, hari, bahagiaSebelum: sebelum, bahagiaSesudah: keadaan().bahagia });
      pesan = `${LABEL[b]} dibongkar.`;
      return gambar();
    }
    if (petak[i]) { pesan = 'Petak ini sudah terisi. Pilih Hapus untuk membongkarnya.'; return gambar(); }
    if (!bisaMembangun(dana, pilihan)) { pesan = `Dana kurang: ${LABEL[pilihan]} butuh ${BANGUNAN[pilihan].biaya}.`; return gambar(); }
    dana -= BANGUNAN[pilihan].biaya;
    const melanggar = pilihan === 'pabrik' && tetangga(i).some((j) => petak[j] === 'rumah');
    aksi.push({ tipe: 'tempatkan', jenis: pilihan, petak: i, hari, melanggar });
    petak[i] = pilihan;
    pesan = `${LABEL[pilihan]} dibangun.`;
    gambar();
  }

  function berhari(): void {
    if (selesai) return;
    dana = danaSehari(dana, keadaan());
    hari++;
    if (dana < 0) { selesai = true; pesan = 'Dana kota habis. Kota bangkrut.'; }
    else if (hari > HARI_MAKS) {
      const k = keadaan();
      selesai = true;
      pesan = k.warga >= TARGET_WARGA && k.bahagia >= 60
        ? 'Kota berkelanjutan tercapai!'
        : `Belum cukup: butuh ${TARGET_WARGA} warga dan kebahagiaan 60%.`;
    }
    if (selesai && simpan) void kirimHasil();
    gambar();
  }

  /** Kirim sesi ke /api/kota/submit. Gagal kirim tidak menghentikan permainan. */
  async function kirimHasil(): Promise<void> {
    const k = keadaan();
    try {
      const res = await fetch(`${API_URL}/api/kota/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentName: namaSiswa,
          classCode: kodeKelas,
          aksi,
          akhir: { warga: k.warga, bahagia: k.bahagia, bangkrut: dana < 0, hariSelesai: hari },
        }),
      });
      pesan = `${pesan} ${res.ok ? 'Tersimpan untuk eksperimen (draf 2).' : `Gagal menyimpan (${res.status}).`}`;
    } catch {
      pesan = `${pesan} Tidak bisa terhubung ke server.`;
    }
    gambar();
  }

  function mulaiUlang(): void {
    petak = Array(GRID * GRID).fill(null);
    dana = DANA_AWAL; hari = 1; selesai = false; hapus = false; pilihan = 'rumah';
    aksi.length = 0;
    pesan = 'Mulai ulang.';
    gambar();
  }

  gambar();
  const pewaktu = window.setInterval(berhari, 2000);
}
