/**
 * Layar Kota (eksperimen TheoTown, branch theotown-ui).
 *
 * TIDAK memancarkan event, TIDAK memanggil API, dan TIDAK mencatat skor.
 * Hanya untuk mencoba mekanik penempatan bangunan dan ekonomi di browser.
 * Dibuka lewat ?mode=kota. Lihat docs/DRAF_INSTRUMEN_2_THEOTOWN.md.
 */

import { BANGUNAN, bisaMembangun, danaSehari, hitungKeadaan, type Bangunan } from './ekonomi.js';

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:4000';

/** Aksi yang dicatat untuk dikirim ke /api/kota/submit (draf 2). */
type AksiKirim =
  | { tipe: 'pilih'; jenis: Bangunan; hari: number }
  | { tipe: 'tempatkan'; jenis: Bangunan; petak: number; hari: number; melanggar: boolean }
  | { tipe: 'bongkar'; jenis: Bangunan; petak: number; hari: number; bahagiaSebelum: number; bahagiaSesudah: number };

const UKURAN = 8;
const DANA_AWAL = 600;
const HARI_MAKS = 40;
const TARGET_WARGA = 120;

const LABEL: Record<Bangunan, string> = {
  rumah: 'Rumah', toko: 'Toko', pabrik: 'Pabrik', taman: 'Taman', surya: 'Panel surya',
};
const IKON: Record<Bangunan, string> = {
  rumah: '🏠', toko: '🏪', pabrik: '🏭', taman: '🌳', surya: '☀️',
};

function tetangga(i: number): number[] {
  const x = i % UKURAN, y = Math.floor(i / UKURAN), hasil: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < UKURAN && ny < UKURAN) hasil.push(ny * UKURAN + nx);
  }
  return hasil;
}

export function mountKotaScreen(root: HTMLElement): void {
  let petak: Array<Bangunan | null> = Array(UKURAN * UKURAN).fill(null);
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

  root.replaceChildren();
  root.style.cssText = 'padding:12px;max-width:720px;margin:0 auto;font-family:system-ui,sans-serif;';

  const hud = document.createElement('div');
  hud.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px;';
  const peta = document.createElement('div');
  peta.style.cssText = `display:grid;grid-template-columns:repeat(${UKURAN},1fr);gap:4px;margin-bottom:10px;`;
  const palet = document.createElement('div');
  palet.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:10px;';
  const kontrol = document.createElement('div');
  kontrol.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
  const log = document.createElement('p');
  log.style.cssText = 'background:#fff;border:3px solid #1d3b4a;border-radius:10px;padding:8px;min-height:3em;';
  root.append(hud, peta, palet, kontrol, log);

  const tombol = (teks: string, aksi: () => void, aktif = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = teks;
    b.style.cssText = `min-height:44px;padding:8px;border:3px solid #1d3b4a;border-radius:12px;background:${aktif ? '#2fb36b' : '#fff'};color:${aktif ? '#fff' : '#1d3b4a'};cursor:pointer;font:inherit;`;
    b.addEventListener('click', aksi);
    return b;
  };

  function keadaan() {
    return hitungKeadaan(petak, tetangga);
  }

  function gambar(): void {
    const k = keadaan();
    hud.replaceChildren(
      statistik('Dana', String(dana)),
      statistik('Warga', `${k.warga} / ${TARGET_WARGA}`),
      statistik('Pekerjaan', `${k.pekerja} / ${k.lapanganKerja}`),
      statistik('Kebahagiaan', `${k.bahagia}%`),
      statistik('Hari', `${hari} / ${HARI_MAKS}`),
    );

    peta.replaceChildren(...petak.map((b, i) => {
      const sel = document.createElement('button');
      sel.textContent = b ? IKON[b] : '';
      sel.setAttribute('aria-label', b ? LABEL[b] : 'Kosong');
      sel.style.cssText = 'aspect-ratio:1;font-size:22px;border:2px solid #1d3b4a;border-radius:8px;background:#c7e8c0;cursor:pointer;';
      sel.addEventListener('click', () => klik(i));
      return sel;
    }));

    palet.replaceChildren(...(Object.keys(BANGUNAN) as Bangunan[]).map((jenis) => {
      const d = BANGUNAN[jenis];
      return tombol(`${IKON[jenis]} ${LABEL[jenis]} (${d.biaya})`, () => {
        pilihan = jenis;
        hapus = false;
        aksi.push({ tipe: 'pilih', jenis, hari });
        gambar();
      }, !hapus && pilihan === jenis);
    }));

    kontrol.replaceChildren(
      tombol(hapus ? '🗑 Hapus (aktif)' : '🗑 Hapus', () => { hapus = !hapus; gambar(); }, hapus),
      tombol('↺ Mulai ulang', mulaiUlang),
    );
    log.textContent = pesan;
  }

  function statistik(judul: string, nilai: string): HTMLElement {
    const s = document.createElement('div');
    s.style.cssText = 'background:#fff8e6;border:3px solid #1d3b4a;border-radius:10px;padding:6px 8px;';
    s.innerHTML = `<small>${judul}</small><br><b style="font-size:18px">${nilai}</b>`;
    return s;
  }

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
    if (selesai) void kirimHasil();
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
      pesan = res.ok ? `${pesan} Tersimpan untuk eksperimen (draf 2).` : `${pesan} Gagal menyimpan (${res.status}).`;
    } catch {
      pesan = `${pesan} Tidak bisa terhubung ke server.`;
    }
    gambar();
  }

  function mulaiUlang(): void {
    petak = Array(UKURAN * UKURAN).fill(null);
    dana = DANA_AWAL; hari = 1; selesai = false; hapus = false; pilihan = 'rumah';
    aksi.length = 0;
    pesan = 'Mulai ulang.';
    gambar();
  }

  gambar();
  window.setInterval(berhari, 2000);
}
