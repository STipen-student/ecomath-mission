/**
 * Penjaga layar penuh: pengerjaan level dan Misi Kota Hijau hanya dapat dimulai
 * dan dilanjutkan dalam mode layar penuh, agar siswa tidak berpindah ke tab lain
 * selama mengerjakan.
 *
 * Browser hanya mengizinkan layar penuh dibuka oleh klik siswa, jadi penjaga ini
 * menampilkan tombol, bukan membukanya otomatis. Perangkat yang tidak mendukung
 * layar penuh (mis. Safari di iPhone) tetap boleh mengerjakan; hal itu dicatat
 * oleh pemanggil sebagai data proses.
 */

import { el } from './dom.js';

type DokumenVendor = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean };
type ElemenVendor = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

/** Apakah perangkat ini mendukung layar penuh untuk halaman web? */
export function layarPenuhDidukung(): boolean {
  const d = document as DokumenVendor;
  return Boolean(document.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function sedangLayarPenuh(): boolean {
  const d = document as DokumenVendor;
  return Boolean(document.fullscreenElement || d.webkitFullscreenElement);
}

async function mintaLayarPenuh(): Promise<boolean> {
  const akar = document.documentElement as ElemenVendor;
  try {
    if (akar.requestFullscreen) await akar.requestFullscreen({ navigationUI: 'hide' });
    else if (akar.webkitRequestFullscreen) await akar.webkitRequestFullscreen();
  } catch {
    return false;
  }
  return sedangLayarPenuh();
}

function penutup(judul: string, isi: string, labelTombol: string, onKlik: (pesan: HTMLElement) => void): HTMLElement {
  const pesan = el('p', { class: 'form-error' });
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, labelTombol);
  tombol.addEventListener('click', () => onKlik(pesan));
  return el(
    'div',
    { class: 'layar-penuh-penutup', ariaLabel: judul },
    el('div', { class: 'plate card layar-penuh-kartu' }, el('h2', {}, judul), el('p', { class: 'prose' }, isi), tombol, pesan),
  );
}

/**
 * Jalankan `lanjut` hanya setelah layar penuh aktif. Bila sudah layar penuh,
 * atau perangkat tidak mendukungnya, `lanjut` langsung dijalankan.
 */
export function pastikanLayarPenuh(lanjut: () => void): void {
  if (!layarPenuhDidukung() || sedangLayarPenuh()) {
    lanjut();
    return;
  }
  const kotak = penutup(
    '⛶ Masuk layar penuh',
    'Soal hanya bisa dikerjakan dalam mode layar penuh. Tekan tombol di bawah untuk mulai. Selama mengerjakan, jangan keluar dari layar penuh atau berpindah ke tab lain.',
    '⛶ MASUK LAYAR PENUH DAN MULAI',
    async (pesan) => {
      if (await mintaLayarPenuh()) {
        kotak.remove();
        lanjut();
      } else {
        pesan.textContent = 'Layar penuh belum aktif. Coba tekan tombolnya sekali lagi.';
      }
    },
  );
  document.body.append(kotak);
}

/** Penyebab siswa meninggalkan pengerjaan. */
export type SebabPergi = 'layar-penuh' | 'tab' | 'fokus';

export interface CatatanPergi {
  aksi: 'pergi' | 'kembali';
  sebab: SebabPergi;
  /** Lama meninggalkan pengerjaan (ms), hanya pada aksi 'kembali'. */
  durasiMs?: number;
}

/** Riwayat setiap kali siswa pergi, untuk ringkasan (mis. Misi Kota Hijau). */
const riwayatPergi: Array<{ mulai: number; selesai: number | null; sebab: SebabPergi }> = [];

/** Jumlah dan total lama pergi sejak waktu `sejak` (ms, Date.now()). */
export function ringkasPergi(sejak: number, sekarang = Date.now()): { jumlah: number; durasiMs: number } {
  const milik = riwayatPergi.filter((r) => r.mulai >= sejak);
  return {
    jumlah: milik.length,
    durasiMs: milik.reduce((n, r) => n + ((r.selesai ?? sekarang) - r.mulai), 0),
  };
}

/**
 * Sebab siswa sedang tidak berada di pengerjaan, atau null bila sedang di sana:
 *  - 'layar-penuh': keluar dari layar penuh (perangkat yang mendukung);
 *  - 'tab': halaman tidak terlihat (pindah tab, aplikasi lain di HP, layar dikunci);
 *  - 'fokus': jendela browser kehilangan fokus (mis. Alt+Tab ke aplikasi lain
 *    sementara browser tetap layar penuh di belakang).
 */
function sebabPergi(): SebabPergi | null {
  if (document.hidden) return 'tab';
  if (layarPenuhDidukung() && !sedangLayarPenuh()) return 'layar-penuh';
  if (!document.hasFocus()) return 'fokus';
  return null;
}

/**
 * Pasang penjaga selama pengerjaan. Saat `sedangMengerjakan()` benar dan siswa
 * pergi (keluar layar penuh, pindah tab/aplikasi, atau jendela kehilangan
 * fokus), soal ditutup layar jeda; setiap pergi dan kembali dilaporkan lewat
 * `catat`, termasuk lamanya. Mengembalikan fungsi pelepas.
 */
export function jagaLayarPenuh(sedangMengerjakan: () => boolean, catat: (c: CatatanPergi) => void): () => void {
  let kotak: HTMLElement | null = null;
  let pergiSejak: { mulai: number; sebab: SebabPergi } | null = null;

  const tampilkanJeda = (): void => {
    kotak?.remove();
    const perluLayarPenuh = layarPenuhDidukung() && !sedangLayarPenuh();
    kotak = penutup(
      '⏸ Pengerjaan dijeda',
      perluLayarPenuh
        ? 'Kamu meninggalkan pengerjaan. Soal disembunyikan sampai kamu kembali ke layar penuh. Setiap kali meninggalkan pengerjaan, beserta lamanya, tercatat dalam laporanmu.'
        : 'Kamu sempat meninggalkan pengerjaan (pindah tab, aplikasi, atau jendela). Setiap kali meninggalkan pengerjaan, beserta lamanya, tercatat dalam laporanmu.',
      perluLayarPenuh ? '⛶ KEMBALI KE LAYAR PENUH' : '▶ LANJUTKAN MENGERJAKAN',
      async (pesan) => {
        if (layarPenuhDidukung() && !sedangLayarPenuh() && !(await mintaLayarPenuh())) {
          pesan.textContent = 'Layar penuh belum aktif. Coba tekan tombolnya sekali lagi.';
          return;
        }
        if (sebabPergi() === null) {
          kotak?.remove();
          kotak = null;
        }
      },
    );
    document.body.append(kotak);
  };

  const berubah = (): void => {
    if (!sedangMengerjakan()) return;
    const sebab = sebabPergi();
    if (sebab && !pergiSejak) {
      pergiSejak = { mulai: Date.now(), sebab };
      riwayatPergi.push({ mulai: pergiSejak.mulai, selesai: null, sebab });
      catat({ aksi: 'pergi', sebab });
      tampilkanJeda();
    } else if (!sebab && pergiSejak) {
      const durasiMs = Date.now() - pergiSejak.mulai;
      const terakhir = riwayatPergi[riwayatPergi.length - 1];
      if (terakhir) terakhir.selesai = Date.now();
      catat({ aksi: 'kembali', sebab: pergiSejak.sebab, durasiMs });
      pergiSejak = null;
      // Layar jeda tetap tampil sampai siswa menekan tombolnya, agar ia sadar
      // kepergiannya tercatat; tombolnya langsung menutup jeda bila sudah kembali.
      if (!kotak) tampilkanJeda();
    } else if (sebab && kotak && sebab === 'layar-penuh') {
      tampilkanJeda();
    }
  };

  const peristiwa: Array<[EventTarget, string]> = [
    [document, 'fullscreenchange'],
    [document, 'webkitfullscreenchange'],
    [document, 'visibilitychange'],
    [window, 'blur'],
    [window, 'focus'],
  ];
  for (const [sasaran, nama] of peristiwa) sasaran.addEventListener(nama, berubah);
  return () => {
    for (const [sasaran, nama] of peristiwa) sasaran.removeEventListener(nama, berubah);
    kotak?.remove();
  };
}
