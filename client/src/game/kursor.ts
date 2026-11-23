/**
 * Kursor kustom yang tetap terlihat di atas latar putih maupun gelap: badan
 * gelap dengan garis tepi putih tebal. Dipakai CSS (lewat variabel di :root)
 * dan oleh Phaser pada mode memilih petak.
 */
export const KURSOR_PANAH = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\' viewBox=\'0 0 28 28\'%3E%3Cpath d=\'M3 2 L3 22 L8.5 17 L12.5 26 L16.5 24.2 L12.6 15.5 L20 15.5 Z\' fill=\'%2316323f\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linejoin=\'round\'/%3E%3Cpath d=\'M5 6 L5 17\' stroke=\'%23f5c542\' stroke-width=\'1.5\'/%3E%3C/svg%3E") 3 2, auto';
export const KURSOR_TANGAN = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\' viewBox=\'0 0 28 28\'%3E%3Cpath d=\'M10 3.5 a2 2 0 0 1 4 0 V12 l1-0.2 a2 2 0 0 1 3.5 0.8 l0.5 0.1 a2 2 0 0 1 3.3 1.3 a2 2 0 0 1 2.7 1.8 V20 c0 3.5 -2.5 6 -6 6 h-3.5 c-2.4 0 -3.8 -1 -5 -2.6 L4.6 17.6 a2 2 0 0 1 3 -2.6 L10 17 Z\' fill=\'%2316323f\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") 12 3, pointer';
export const KURSOR_BIDIK = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cg fill=\'none\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'8\' stroke=\'%23ffffff\' stroke-width=\'5\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'8\' stroke=\'%2316323f\' stroke-width=\'2.5\'/%3E%3Cpath d=\'M16 2 V9 M16 23 V30 M2 16 H9 M23 16 H30\' stroke=\'%23ffffff\' stroke-width=\'5\'/%3E%3Cpath d=\'M16 2 V9 M16 23 V30 M2 16 H9 M23 16 H30\' stroke=\'%2316323f\' stroke-width=\'2.5\'/%3E%3C/g%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'2.5\' fill=\'%23f5c542\' stroke=\'%2316323f\' stroke-width=\'1\'/%3E%3C/svg%3E") 16 16, crosshair';

/** Pasang variabel CSS kursor sekali saat aplikasi mulai. */
export function pasangKursor(): void {
  const akar = document.documentElement.style;
  akar.setProperty('--kursor', KURSOR_PANAH);
  akar.setProperty('--kursor-tangan', KURSOR_TANGAN);
  akar.setProperty('--kursor-bidik', KURSOR_BIDIK);
}
