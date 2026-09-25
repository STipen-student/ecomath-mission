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

const root = document.getElementById('app');

if (!root) {
  throw new Error('Elemen #app tidak ditemukan pada index.html');
}

new App(root).start();
