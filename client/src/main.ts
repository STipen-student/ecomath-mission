/**
 * Titik masuk aplikasi client.
 */

// Font dibundel dari node_modules, bukan diambil dari CDN Google Fonts.
// Saat pengambilan data, wifi sekolah kerap memblokir atau memperlambat CDN -
// dan antarmuka yang menunggu font gagal termuat akan tampak rusak bagi siswa.
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource/archivo-black/400.css';
import './style.css';
import { App } from './app.js';
import { pasangBunyiKlik } from './game/suara.js';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Elemen #app tidak ditemukan pada index.html');
}

// Bunyi klik untuk semua tombol (hiburan, tanpa event).
pasangBunyiKlik();

// Eksperimen TheoTown (tidak mencatat data): ?mode=kota
if (new URLSearchParams(window.location.search).get('mode') === 'kota') {
  void import('./kota/KotaScreen.js').then((m) => m.mountKotaScreen(root));
} else {
  new App(root).start();
}
