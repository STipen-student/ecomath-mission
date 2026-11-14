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
