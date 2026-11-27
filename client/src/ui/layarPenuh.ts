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

/**
 * Pasang penjaga selama pengerjaan: bila siswa keluar dari layar penuh saat
 * `sedangMengerjakan()` benar, soal ditutup sampai siswa kembali. Setiap
 * keluar dan masuk dilaporkan lewat `catat`. Mengembalikan fungsi pelepas.
 */
export function jagaLayarPenuh(sedangMengerjakan: () => boolean, catat: (aksi: 'keluar' | 'masuk') => void): () => void {
  let kotak: HTMLElement | null = null;
  const berubah = (): void => {
    if (!sedangMengerjakan()) return;
    if (!sedangLayarPenuh()) {
      catat('keluar');
      if (kotak) return;
      kotak = penutup(
        '⏸ Pengerjaan dijeda',
        'Kamu keluar dari layar penuh. Soal disembunyikan sampai kamu kembali ke layar penuh. Keluar dari layar penuh tercatat dalam laporan pengerjaanmu.',
        '⛶ KEMBALI KE LAYAR PENUH',
        async (pesan) => {
          if (!(await mintaLayarPenuh())) pesan.textContent = 'Layar penuh belum aktif. Coba tekan tombolnya sekali lagi.';
        },
      );
      document.body.append(kotak);
    } else {
      catat('masuk');
      kotak?.remove();
      kotak = null;
    }
  };
  document.addEventListener('fullscreenchange', berubah);
  document.addEventListener('webkitfullscreenchange', berubah);
  return () => {
    document.removeEventListener('fullscreenchange', berubah);
    document.removeEventListener('webkitfullscreenchange', berubah);
    kotak?.remove();
  };
}
