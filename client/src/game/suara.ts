/**
 * Efek suara sederhana (WebAudio), tanpa berkas audio.
 *
 * HANYA tampilan: tidak memancarkan event dan tidak memengaruhi skor. Pilihan
 * bisu disimpan per perangkat di localStorage dan aman bila penyimpanan diblokir.
 */

type Bunyi = 'pasang' | 'cabut' | 'terima' | 'tolak';

const KUNCI_BISU = 'ecomath_bisu';
let konteks: AudioContext | null = null;

export function sedangBisu(): boolean {
  try {
    return localStorage.getItem(KUNCI_BISU) === '1';
  } catch {
    return false;
  }
}

export function aturBisu(bisu: boolean): void {
  try {
    localStorage.setItem(KUNCI_BISU, bisu ? '1' : '0');
  } catch {
    // Penyimpanan diblokir: pilihan berlaku sampai halaman ditutup saja.
  }
}

/** Urutan nada (Hz, ms) per jenis bunyi. */
const NADA: Record<Bunyi, Array<[number, number]>> = {
  pasang: [[660, 60]],
  cabut: [[330, 60]],
  terima: [[523, 110], [659, 110], [784, 180]],
  tolak: [[220, 160], [180, 220]],
};

export function bunyikan(jenis: Bunyi): void {
  if (sedangBisu()) return;
  try {
    konteks ??= new AudioContext();
    let t = konteks.currentTime;
    for (const [frek, ms] of NADA[jenis]) {
      const osc = konteks.createOscillator();
      const gain = konteks.createGain();
      osc.type = 'square';
      osc.frequency.value = frek;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(konteks.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch {
    // Peramban tanpa WebAudio: permainan tetap jalan tanpa suara.
  }
}

/* ------------------------------------------------------------------ */
/* Bunyi klik tombol                                                   */
/* ------------------------------------------------------------------ */

/** Jenis bunyi klik menurut peran tombol. Tiap jenis punya pola nada sendiri. */
type JenisKlik = 'utama' | 'ajukan' | 'alat' | 'pilih' | 'kembali' | 'biasa';

/** Pola nada dasar (rasio terhadap frekuensi dasar, ms) dan bentuk gelombang. */
const POLA_KLIK: Record<JenisKlik, { gelombang: OscillatorType; dasar: number; nada: Array<[number, number]> }> = {
  utama: { gelombang: 'square', dasar: 523, nada: [[1, 70], [1.5, 110]] },        // naik, mantap
  ajukan: { gelombang: 'square', dasar: 392, nada: [[1, 60], [1.25, 60], [1.5, 120]] }, // tiga nada
  alat: { gelombang: 'triangle', dasar: 587, nada: [[1, 55]] },                  // blip pendek
  pilih: { gelombang: 'sine', dasar: 880, nada: [[1, 40]] },                    // tik tinggi
  kembali: { gelombang: 'triangle', dasar: 494, nada: [[1, 70], [0.75, 100]] },  // turun
  biasa: { gelombang: 'sine', dasar: 659, nada: [[1, 50]] },
};

function jenisKlik(el: Element): JenisKlik {
  const kelas = el.className && typeof el.className === 'string' ? el.className : '';
  const teks = (el.textContent ?? '').toLowerCase();
  if (kelas.includes('tool-go')) return 'ajukan';
  if (kelas.includes('btn-primary')) return 'utama';
  if (kelas.includes('sheet-close') || teks.includes('kembali') || teks.includes('keluar') || teks.includes('tutup') || teks.includes('✕')) return 'kembali';
  if (kelas.includes('tool')) return 'alat';
  if (el.matches('label, input, select, .choice, .aal-claim, .aal-seg, .zone-pin')) return 'pilih';
  return 'biasa';
}

/** Geser nada sedikit berdasarkan teks tombol, agar tiap tombol terdengar berbeda. */
function geserNada(teks: string): number {
  let h = 0;
  for (let i = 0; i < teks.length; i++) h = (h * 31 + teks.charCodeAt(i)) >>> 0;
  // Langkah semitone -3..+4, dibatasi agar tetap enak didengar.
  return Math.pow(2, ((h % 8) - 3) / 12);
}

function mainkanKlik(el: Element): void {
  if (sedangBisu()) return;
  try {
    konteks ??= new AudioContext();
    const pola = POLA_KLIK[jenisKlik(el)];
    const geser = geserNada((el.textContent ?? '').trim());
    let t = konteks.currentTime;
    for (const [rasio, ms] of pola.nada) {
      const osc = konteks.createOscillator();
      const gain = konteks.createGain();
      osc.type = pola.gelombang;
      osc.frequency.value = pola.dasar * rasio * geser;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(konteks.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch {
    // Tanpa WebAudio: tidak ada bunyi, aplikasi tetap jalan.
  }
}

/**
 * Pasang bunyi klik untuk SEMUA tombol dan pilihan di aplikasi, sekali saja.
 * Memakai satu pendengar pada dokumen, jadi tombol yang dibuat belakangan ikut.
 * Hanya tampilan: tidak memancarkan event dan tidak memengaruhi skor.
 */
export function pasangBunyiKlik(): void {
  // Klik pada <label> memicu klik kedua pada <input> di dalamnya; abaikan yang kedua.
  let terakhir = 0;
  document.addEventListener(
    'click',
    (ev) => {
      const sekarang = performance.now();
      if (sekarang - terakhir < 80) return;
      const sasaran = (ev.target as Element | null)?.closest(
        'button, [role="button"], .choice, .aal-claim, .aal-seg, select',
      );
      if (!sasaran || (sasaran as HTMLButtonElement).disabled) return;
      terakhir = sekarang;
      mainkanKlik(sasaran);
    },
    { capture: true },
  );
}
