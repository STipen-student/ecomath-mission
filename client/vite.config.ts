import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Diikat ke localhost saja saat pengembangan; saat pengambilan data siswa
    // mengakses versi produksi di Vercel, bukan server pengembangan ini.
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Phaser sendiri berukuran ~1,5 MB (sekitar 340 kB setelah gzip). Ini
    // memang di atas ambang peringatan bawaan Vite, tetapi wajar untuk sebuah
    // pustaka game dan hanya diunduh sekali lalu di-cache peramban siswa.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // Dua halaman terpisah pada satu bundel: halaman siswa (index.html) dan
      // halaman laporan guru (guru.html). Keduanya di-deploy sebagai berkas
      // statis ke host yang sama - tidak ada server tambahan yang perlu diurus.
      input: {
        main: resolve(__dirname, 'index.html'),
        guru: resolve(__dirname, 'guru.html'),
      },
      output: {
        manualChunks: {
          // Phaser dipisah ke berkas sendiri supaya kode game yang sering
          // berubah tidak membatalkan cache pustaka yang berukuran besar.
          phaser: ['phaser'],
        },
      },
    },
  },
});
