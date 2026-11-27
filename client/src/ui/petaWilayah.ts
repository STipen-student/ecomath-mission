/**
 * Peta Wilayah: kota-kota yang sudah dibangun siswa di setiap level.
 *
 * Menampilkan hasil AKHIR yang sudah diajukan (nilai x dan y saat submit),
 * digambar ulang dengan peta isometrik yang sama, ditambah penduduk yang
 * berjalan. Hanya tampilan: tidak ada event, tidak mengubah apa pun.
 */

import type { VariableVisual } from '../api/types.js';
import { SPRITE_BERASAP, type SpriteKota } from '../game/pixel/spriteKota.js';
import { GRID, plotTiles } from '../game/iso/isoGrid.js';
import { mountCity, type CityHandle } from '../game/mountCity.js';
import { el, num } from './dom.js';
import { BATAS_RUSAK, kondisiBangunan, PENDAPATAN_BANGUNAN, PENDAPATAN_DASAR, type BangunanKota, type Progres } from '../game/progres.js';
import { JENIS_HIJAU, JENIS_HUNIAN, jenisDariKode, periksaStandar, type Pelanggaran } from '../game/standarSdg.js';
import { formTanggapanProtes, type TanggapanProtes } from './tanggapanProtes.js';

/** Bangunan yang bisa dibeli dengan koin untuk wilayah gabungan. */
const KATALOG: Array<{ jenis: SpriteKota; nama: string; ikon: string; harga: number }> = [
  { jenis: 'pohon', nama: 'Pohon', ikon: '🌳', harga: 10 },
  { jenis: 'taman-kota', nama: 'Taman', ikon: '🌷', harga: 25 },
  { jenis: 'toko', nama: 'Toko', ikon: '🏪', harga: 40 },
  { jenis: 'surya', nama: 'Panel surya', ikon: '☀️', harga: 35 },
  { jenis: 'turbin', nama: 'Kincir angin', ikon: '🌬️', harga: 45 },
  { jenis: 'pabrik-hijau', nama: 'Pabrik ramah lingkungan', ikon: '🏭', harga: 70 },
  // Hiasan: mempercantik kota; tidak dihitung dalam indeks hijau.
  { jenis: 'air-mancur', nama: 'Air mancur', ikon: '⛲', harga: 30 },
  { jenis: 'lampu-kota', nama: 'Lampu kota', ikon: '🏮', harga: 15 },
  { jenis: 'bendera-kota', nama: 'Bendera kota', ikon: '🚩', harga: 15 },
];

/** Pohon dan taman: bernilai ganda dalam indeks hijau. */
const POHON: ReadonlySet<string> = new Set(['pohon', 'taman-kota', 'taman', 'hijau-multifungsi']);

/** Hiasan Toko Perlengkapan: dekorasi, tidak dihitung dalam indeks hijau. */
const HIASAN: ReadonlySet<string> = new Set(['air-mancur', 'lampu-kota', 'bendera-kota']);

/** Kota hasil satu level, disimpan saat level diajukan. */
export interface KotaLevel {
  level: number;
  /** Id soal, dipakai untuk menyambung cerita antarkasus. */
  taskId: string;
  judul: string;
  x: number;
  y: number;
  xMax: number;
  yMax: number;
  labelX: string;
  labelY: string;
  unitX: string;
  unitY: string;
  visualX: VariableVisual;
  visualY: VariableVisual;
  spriteX?: SpriteKota;
  spriteY?: SpriteKota;
  /** Rancangan akhir memenuhi semua kendala soal. */
  layak: boolean;
}

/** Wujud yang dihitung sebagai bangunan hijau atau energi bersih. */
const SPRITE_HIJAU: ReadonlySet<SpriteKota> = new Set<SpriteKota>([
  'pabrik-hijau',
  'pohon', 'taman-kota', 'sepeda', 'trotoar', 'surya', 'turbin', 'bus-listrik',
  'mesin-listrik', 'industri-hijau', 'kompos', 'daur-ulang', 'hijau-multifungsi',
  'hunian-rendah-karbon', 'gedung',
]);

/** Distrik tiap level pada wilayah gabungan: seperempat pulau. */
const DISTRIK: Record<number, { nama: string; kolom: 0 | 1; baris: 0 | 1 }> = {
  1: { nama: 'Distrik Barat Laut', kolom: 0, baris: 0 },
  2: { nama: 'Distrik Timur Laut', kolom: 1, baris: 0 },
  3: { nama: 'Distrik Barat Daya', kolom: 0, baris: 1 },
  4: { nama: 'Distrik Tenggara', kolom: 1, baris: 1 },
};

/**
 * Petak bangun satu distrik, diurutkan dari pusat distrik ke tepi, sehingga
 * bangunan tiap kasus mengumpul seperti satu kawasan.
 */
function petakDistrik(level: number): number[] {
  const d = DISTRIK[level];
  if (!d) return [];
  const setengah = GRID / 2;
  const pusatK = d.kolom * setengah + setengah / 2;
  const pusatB = d.baris * setengah + setengah / 2;
  return plotTiles()
    .filter((t) => Math.floor(t.col / setengah) === d.kolom && Math.floor(t.row / setengah) === d.baris)
    .sort((a, b) => Math.hypot(a.col - pusatK, a.row - pusatB) - Math.hypot(b.col - pusatK, b.row - pusatB))
    .map((t) => t.seed);
}

/**
 * Susun wilayah gabungan: setiap kasus mengisi distriknya dengan wujud x dan y.
 * Jumlah ubin sebanding dengan nilai/batas tiap variabel (tampilan, bukan skala
 * satuan), sehingga distrik yang hampir penuh terlihat padat.
 */
function susunGabungan(kota: KotaLevel[]): { petak: Map<number, string>; hijau: number; berasap: number; lainnya: number } {
  const petak = new Map<number, string>();
  let hijau = 0;
  let berasap = 0;
  let lainnya = 0;
  for (const k of kota) {
    const ruang = petakDistrik(k.level);
    const kapasitas = Math.floor(ruang.length / 2);
    const nx = Math.round(Math.min(1, k.x / Math.max(1, k.xMax)) * kapasitas);
    const ny = Math.round(Math.min(1, k.y / Math.max(1, k.yMax)) * kapasitas);
    const kodeX = k.spriteX ? `s:${k.spriteX}` : `v:${k.visualX}`;
    const kodeY = k.spriteY ? `s:${k.spriteY}` : `v:${k.visualY}`;
    // Selang-seling x dan y agar kedua zona tampak bercampur dalam distrik.
    let ix = 0;
    let iy = 0;
    for (const seed of ruang) {
      if (ix < nx && (iy >= ny || ix <= iy)) {
        petak.set(seed, kodeX);
        ix++;
      } else if (iy < ny) {
        petak.set(seed, kodeY);
        iy++;
      } else break;
    }
    for (const [jenis, n] of [[k.spriteX, nx], [k.spriteY, ny]] as const) {
      if (jenis && SPRITE_HIJAU.has(jenis)) hijau += n;
      else if (jenis && SPRITE_BERASAP.has(jenis)) berasap += n;
      else lainnya += n;
    }
  }
  // Pusat kota di tengah pulau: perpustakaan dan beberapa pencakar langit pada
  // petak yang masih kosong. Hanya dekorasi; tidak dihitung dalam indeks hijau.
  const tengah = (GRID - 1) / 2;
  const kosong = plotTiles()
    .filter((t) => !petak.has(t.seed))
    .sort((a, b) => Math.hypot(a.col - tengah, a.row - tengah) - Math.hypot(b.col - tengah, b.row - tengah));
  const [perpus, ...lain] = kosong;
  if (perpus) petak.set(perpus.seed, 's:perpustakaan');
  lain.slice(0, 7).forEach((t, i) => petak.set(t.seed, i % 2 === 0 ? 's:pencakar-a' : 's:pencakar-b'));

  return { petak, hijau, berasap, lainnya };
}

export function bukaPetaWilayah(
  kota: KotaLevel[],
  progres?: Progres,
  onTanggapan?: (t: TanggapanProtes) => Promise<void> | void,
  /** Untuk tampilan guru: keadaan kota siswa yang dikirim ke server. */
  kotaSiswa?: { bangunan: BangunanKota[]; perbaikan: string[] } | null,
): void {
  if (kota.length === 0) return;

  let peta: CityHandle | null = null;
  const wadahPeta = el('div', { class: 'peta-wilayah-kanvas' });
  const keterangan = el('div', { class: 'peta-wilayah-ket' });
  const tab = el('div', { class: 'peta-wilayah-tab', ariaLabel: 'Pilih kota' });

  const tutup = el('button', { class: 'btn btn-small', ariaLabel: 'Tutup peta wilayah' }, '✕ TUTUP');
  const latar = el(
    'div',
    { class: 'peta-wilayah' },
    el(
      'div',
      { class: 'plate peta-wilayah-panel' },
      el('header', { class: 'peta-wilayah-kepala' }, el('h2', {}, '🗺 PETA WILAYAH NUSA LESTARI'), tutup),
      tab,
      wadahPeta,
      keterangan,
    ),
  );

  const tampilkan = (k: KotaLevel): void => {
    for (const b of tab.querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.level === String(k.level));
    peta?.destroy();
    wadahPeta.replaceChildren();
    peta = mountCity(wadahPeta);
    peta.render({
      x: k.x,
      y: k.y,
      xMax: k.xMax,
      yMax: k.yMax,
      feasible: k.layak,
      visualX: k.visualX,
      visualY: k.visualY,
      spriteX: k.spriteX,
      spriteY: k.spriteY,
    });
    peta.hidupkan(12 + Math.round((k.x + k.y) / Math.max(1, k.xMax + k.yMax) * 18));

    keterangan.replaceChildren(
      el('h3', {}, `Level ${k.level} · ${k.judul}`),
      el(
        'ul',
        { class: 'peta-wilayah-daftar' },
        el('li', {}, `🟩 ${k.labelX}: `, el('strong', {}, `${num(k.x)} ${k.unitX}`)),
        el('li', {}, `🟧 ${k.labelY}: `, el('strong', {}, `${num(k.y)} ${k.unitY}`)),
      ),
      el(
        'p',
        { class: k.layak ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' },
        k.layak ? '✓ Rancangan disahkan Dewan Kota.' : '✕ Rancangan akhir masih melanggar aturan kota.',
      ),
    );
  };

  const tampilkanGabungan = (): void => {
    for (const b of tab.querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.level === 'semua');
    peta?.destroy();
    wadahPeta.replaceChildren();
    peta = mountCity(wadahPeta);
    const g = susunGabungan(kota);
    // Bangunan yang dibeli dengan koin ikut tampil dan ikut dihitung.
    // Sarana-prasarana yang dibeli dengan koin; yang kondisinya di bawah
    // BATAS_RUSAK tetap tampil (kusam) tetapi tidak dihitung sebagai ruang hijau.
    // Hiasan dari Toko Perlengkapan berdiri di alun-alun, di petak kosong
    // terdekat ke pusat kota. Dekorasi saja: tidak dihitung dalam indeks hijau.
    const hiasan = progres?.hiasan() ?? [];
    if (hiasan.length > 0) {
      const tengah = (GRID - 1) / 2;
      const kosongPusat = plotTiles()
        .filter((t) => !g.petak.has(t.seed))
        .sort((a, b) => Math.hypot(a.col - tengah, a.row - tengah) - Math.hypot(b.col - tengah, b.row - tengah));
      hiasan.forEach((h, i) => {
        const t = kosongPusat[i];
        if (t) g.petak.set(t.seed, `s:${h.id}`);
      });
    }
    const sarpras = progres?.bangunanKota() ?? kotaSiswa?.bangunan ?? [];
    const rusak = new Set<number>();
    for (const b of sarpras) {
      g.petak.set(b.seed, `s:${b.jenis}`);
      if ((progres ? progres.kondisi(b) : kondisiBangunan(b)) < BATAS_RUSAK) rusak.add(b.seed);
    }
    // Perbaikan kota dari tanggapan protes yang tepat (AaL): kota ikut berubah.
    const perbaikan = progres?.perbaikanKota() ?? kotaSiswa?.perbaikan ?? [];
    if (perbaikan.includes('ganti-listrik')) {
      const GANTI: Record<string, string> = { 'bus-konvensional': 'bus-listrik', 'mesin-fosil': 'surya', pabrik: 'pabrik-hijau' };
      for (const [seed, kode] of g.petak) {
        const baru = GANTI[jenisDariKode(kode)];
        if (baru) {
          g.petak.set(seed, `s:${baru}`);
          g.berasap = Math.max(0, g.berasap - 1);
          g.lainnya++;
        }
      }
    }
    if (perbaikan.includes('tambah-hijau')) {
      // Tanam pohon/taman di petak kosong dekat hunian sampai ruang hijau >= 25%.
      const jenisSemua = (): string[] => [...g.petak.values()].map(jenisDariKode);
      const hijauKini = (): number => jenisSemua().filter((j) => JENIS_HIJAU.has(j)).length;
      const hunian = [...g.petak].filter(([, k]) => JENIS_HUNIAN.has(jenisDariKode(k))).map(([s]) => s);
      // Hanya petak bangun (bukan jalan/air) yang masih kosong, terdekat ke hunian dulu.
      const jarak = (seed: number): number =>
        Math.min(...hunian.map((h) => Math.hypot((h % GRID) - (seed % GRID), Math.floor(h / GRID) - Math.floor(seed / GRID))));
      const kosong = plotTiles()
        .map((t) => t.seed)
        .filter((seed) => !g.petak.has(seed))
        .sort((a, b) => jarak(a) - jarak(b));
      let i = 0;
      for (const seed of kosong) {
        if (hunian.length === 0 || hijauKini() / g.petak.size >= 0.25) break;
        g.petak.set(seed, i++ % 2 ? 's:taman-kota' : 's:pohon');
      }
    }
    // Hitung ulang indeks dari isi peta akhir, sehingga pembelian bangunan hijau
    // dan perbaikan kota hasil tanggapan protes langsung menaikkan indeks.
    // Pusat kota (perpustakaan, pencakar langit) tidak dihitung.
    g.hijau = 0;
    g.berasap = 0;
    g.lainnya = 0;
    // Indeks hijau berbobot:
    //  - pohon dan taman bernilai ganda (paling banyak menyerap panas dan karbon);
    //  - sarana yang dibeli dengan koin menyumbang sebesar kondisinya (70% -> 0,7);
    //  - fasilitas rusak tidak menyumbang ruang hijau sama sekali.
    const kondisiSeed = new Map<number, number>();
    for (const b of sarpras) kondisiSeed.set(b.seed, (progres ? progres.kondisi(b) : kondisiBangunan(b)) / 100);
    for (const [seed, kode] of g.petak) {
      const j = jenisDariKode(kode);
      if (j === 'perpustakaan' || j.startsWith('pencakar') || HIASAN.has(j)) continue;
      const bobot = POHON.has(j) ? 2 : 1;
      if (rusak.has(seed)) g.lainnya += 1;
      else if (SPRITE_HIJAU.has(j as SpriteKota) || JENIS_HIJAU.has(j)) {
        const kondisi = kondisiSeed.get(seed) ?? 1;
        g.hijau += bobot * kondisi;
        g.lainnya += bobot * (1 - kondisi);
      } else if (SPRITE_BERASAP.has(j as SpriteKota)) g.berasap++;
      else g.lainnya++;
    }
    // Latar mengikuti keadaan wilayah akhir: hijau bila tidak ada protes warga
    // (bebas asap dan ruang hijau cukup), merah bila masih ada masalah.
    const pelanggaranKota = (): Pelanggaran[] => [
      ...periksaStandar([...g.petak.values()].map(jenisDariKode)),
      ...(rusak.size > 0
        ? [{ sdg: 11 as const, jenis: 'rusak', alasan: `${rusak.size} taman dan fasilitas kota rusak karena tidak dirawat` }]
        : []),
    ];
    const wilayahSehat = pelanggaranKota().length === 0;
    peta.tampilkanKota(g.petak, wilayahSehat, rusak);
    peta.hidupkan(20 + kota.length * 6);

    // Palet "Bangun dengan koin": pilih bangunan, lalu ketuk petak kosong.
    let pilihan: (typeof KATALOG)[number] | null = null;
    const infoBeli = el('p', { class: 'hint' }, 'Pilih bangunan, lalu ketuk petak kosong di peta.');
    const palet = el('div', { class: 'peta-beli-palet' });
    const gambarPalet = (): void => {
      palet.replaceChildren(
        ...KATALOG.map((item) => {
          const b = el(
            'button',
            { class: `btn btn-small${pilihan?.jenis === item.jenis ? ' is-active' : ''}` },
            `${item.ikon} ${item.nama} · ${item.harga} 🪙`,
          );
          b.disabled = !progres || progres.koin < item.harga;
          b.addEventListener('click', () => {
            pilihan = pilihan?.jenis === item.jenis ? null : item;
            infoBeli.textContent = pilihan ? `Ketuk petak kosong untuk membangun ${pilihan.nama}.` : 'Pilih bangunan, lalu ketuk petak kosong di peta.';
            gambarPalet();
          });
          return b;
        }),
      );
    };
    gambarPalet();
    peta.setPickMode((titik) => {
      if (!progres || !pilihan) return;
      const seed = titik.row * GRID + titik.col;
      if (g.petak.has(seed)) {
        infoBeli.textContent = 'Petak itu sudah terisi. Pilih petak kosong.';
        return;
      }
      const hasil = progres.bangunDiKota(seed, pilihan.jenis, pilihan.harga, pilihan.nama);
      infoBeli.textContent = hasil.pesan;
      if (hasil.ok) {
        const posisi = (wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null)?.scrollTop ?? 0;
        tampilkanGabungan();
        const panel = wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null;
        if (panel) panel.scrollTop = posisi;
      }
    });

    const total = Math.max(1, g.hijau + g.berasap + g.lainnya);
    const persenHijau = Math.round((g.hijau / total) * 100);
    const status =
      g.berasap === 0
        ? '🌿 Wilayah bebas asap: tidak ada bus berbahan bakar fosil maupun mesin fosil.'
        : `💨 Masih ada ${g.berasap} bangunan berasap. Wilayah belum sepenuhnya bebas karbon.`;

    keterangan.replaceChildren(
      el('h3', {}, `Wilayah Gabungan · ${kota.length} distrik`),
      el(
        'div',
        { class: 'peta-wilayah-indeks' },
        el('span', {}, 'Indeks hijau wilayah'),
        el('div', { class: 'profile-bar' }, (() => {
          const isi = el('div', { class: 'profile-fill' });
          isi.style.width = `${persenHijau}%`;
          return isi;
        })()),
        el('strong', {}, `${persenHijau}%`),
      ),
      !progres
        ? el('span', {})
        : persenHijau < 100
        ? el('p', { class: 'hint' }, '🌱 Naikkan indeks hijau: bangun pohon, taman, panel surya, kincir angin, atau pabrik ramah lingkungan dengan koin di bawah, atau tanggapi protes warga dengan tepat lalu terapkan rencanamu.')
        : el('p', { class: 'peta-wilayah-status ok' }, '🏆 Indeks hijau penuh!'),
      el('p', { class: g.berasap === 0 ? 'peta-wilayah-status ok' : 'peta-wilayah-status bad' }, status),
      (() => {
        const protes = pelanggaranKota();
        return protes.length === 0
          ? el('p', { class: 'peta-wilayah-status ok' }, '😊 Warga puas: kota sesuai semangat SDG 11 dan SDG 13.')
          : (() => {
              const kotak = el(
                'div',
                { class: 'peta-protes' },
                el('strong', {}, '📢 Warga berdemo:'),
                el('ul', {}, ...protes.map((p) => el('li', {}, `SDG ${p.sdg}: ${p.alasan}.`))),
              );
              if (onTanggapan) {
                const tombol = el('button', { class: 'btn btn-small' }, '✍ Tanggapi protes warga');
                tombol.addEventListener('click', () => tombol.replaceWith(
                    formTanggapanProtes(protes, onTanggapan, (id) => {
                      if (id === 'rawat-fasilitas') {
                        // Merawat memakai anggaran kota (koin), sama seperti tombol Rawat semua.
                        const h = progres?.rawatSemua();
                        if (h && !h.ok) window.alert(h.pesan);
                      } else {
                        progres?.perbaikiKota(id);
                      }
                      tampilkanGabungan();
                    }),
                  ),
                );
                kotak.append(tombol);
              }
              return kotak;
            })();
      })(),
      kabarWarga(g.petak, persenHijau, rusak.size),
      el(
        'ul',
        { class: 'peta-wilayah-daftar' },
        ...kota.map((k) =>
          el(
            'li',
            {},
            el('strong', {}, `${DISTRIK[k.level]?.nama ?? `Distrik ${k.level}`}: `),
            `${k.judul} — ${num(k.x)} ${k.unitX} ${k.labelX.toLowerCase()}, ${num(k.y)} ${k.unitY} ${k.labelY.toLowerCase()} `,
            k.layak ? '✓' : '✕',
          ),
        ),
      ),
      el('p', { class: 'hint' }, 'Tiap distrik adalah kota dari satu kasus. Kepadatan bangunan menggambarkan seberapa penuh nilai yang kamu pilih, bukan jumlah sebenarnya.'),
      ...(progres
        ? [
            perawatanSarpras(progres, sarpras, rusak.size, () => {
              const posisi = (wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null)?.scrollTop ?? 0;
              tampilkanGabungan();
              const panel = wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null;
              if (panel) panel.scrollTop = posisi;
            }),
            kasKota(progres, periksaStandar([...g.petak.values()].map(jenisDariKode)).length === 0, () => {
              const posisi = (wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null)?.scrollTop ?? 0;
              tampilkanGabungan();
              const panel = wadahPeta.closest('.peta-wilayah-panel') as HTMLElement | null;
              if (panel) panel.scrollTop = posisi;
            }),
            el('h3', {}, `BANGUN DENGAN KOIN · ${progres.koin} 🪙`),
            el('p', { class: 'hint' }, 'Percantik dan lestarikan kotamu. Bangunan ini hanya hiasan dan tidak memengaruhi skor.'),
            palet,
            infoBeli,
          ]
        : []),
    );
  };

  const tabGabungan = el('button', { class: 'btn btn-small', dataset: { level: 'semua' } }, '🗺 WILAYAH GABUNGAN');
  tabGabungan.addEventListener('click', tampilkanGabungan);
  tab.replaceChildren(
    tabGabungan,
    ...kota.map((k) => {
      const b = el('button', { class: 'btn btn-small', dataset: { level: String(k.level) } }, `LV${k.level}`);
      b.addEventListener('click', () => tampilkan(k));
      return b;
    }),
  );

  const keluar = (): void => {
    peta?.destroy();
    latar.remove();
    document.removeEventListener('keydown', esc);
  };
  const esc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') keluar();
  };
  tutup.addEventListener('click', keluar);
  document.addEventListener('keydown', esc);

  document.body.append(latar);
  tampilkanGabungan();
}

/** Tombol pembuka Peta Wilayah untuk layar hasil dan layar akhir. */
export function tombolPetaWilayah(
  kota: KotaLevel[],
  progres?: Progres,
  onTanggapan?: (t: TanggapanProtes) => Promise<void> | void,
): HTMLElement | null {
  if (kota.length === 0) return null;
  const b = el('button', { class: 'btn btn-block' }, `🗺  PETA WILAYAH (${kota.length} kota)`);
  b.addEventListener('click', () => bukaPetaWilayah(kota, progres, onTanggapan));
  return b;
}

/**
 * "Kabar Warga": linimasa pendek unggahan warga yang bereaksi terhadap kota
 * akhir (kepuasan, keluhan, tren). Hanya tampilan; tidak mencatat event dan
 * tidak memengaruhi skor.
 */
const NAMA_WARGA = ['@bu_sari', '@raka.gowes', '@pak_darto', '@nina_taman', '@ojik_bus', '@mbak_lusi', '@dimas.kecil', '@oma_reni'];

function kabarWarga(petak: Map<number, string>, persenHijau: number, jumlahRusak = 0): HTMLElement {
  const jenis = new Set([...petak.values()].map(jenisDariKode));
  const ada = (j: string): boolean => jenis.has(j);
  const unggahan: Array<{ teks: string; suka: boolean }> = [];
  if (jumlahRusak > 0) unggahan.push({ teks: `Taman dan fasilitas kota mulai rusak, ${jumlahRusak} tempat belum dirawat. Tolong diperbaiki! 🛠️`, suka: false });
  if (ada('bus-konvensional')) unggahan.push({ teks: 'Nunggu di halte, asap busnya bikin batuk terus. 😷', suka: false });
  if (ada('mesin-fosil') || ada('pabrik')) unggahan.push({ teks: 'Siang ini kotanya panas banget, langitnya abu-abu. 🥵', suka: false });
  if (persenHijau < 50) unggahan.push({ teks: 'Pohonnya sedikit, mau berteduh saja susah. 🌡️', suka: false });
  if (ada('bus-listrik')) unggahan.push({ teks: 'Naik bus listrik pagi ini, sepi suaranya dan adem. 🚌⚡', suka: true });
  if (ada('surya') || ada('turbin')) unggahan.push({ teks: 'Listrik dari panel surya dan kincir angin, tagihan jadi hemat! ☀️🌬️', suka: true });
  if (ada('sepeda') || ada('trotoar')) unggahan.push({ teks: 'Gowes ke sekolah lewat jalur sepeda, aman dan cepat. 🚲', suka: true });
  if (persenHijau >= 50) unggahan.push({ teks: 'Sore-sore jalan di taman, udaranya segar. 🌳', suka: true });
  if (ada('air-mancur')) unggahan.push({ teks: 'Sore-sore anak-anak main di dekat air mancur alun-alun. ⛲', suka: true });
  if (ada('lampu-kota')) unggahan.push({ teks: 'Jalan pulang malam jadi terang dan aman berkat lampu kota. 🏮', suka: true });
  if (ada('bendera-kota')) unggahan.push({ teks: 'Bendera di balai kota berkibar, bangga jadi warga sini! 🚩', suka: true });
  if (ada('perpustakaan')) unggahan.push({ teks: 'Perpustakaan kota ramai, ada pojok buku tentang iklim. 📚', suka: true });
  if (ada('pabrik-hijau') || ada('toko')) unggahan.push({ teks: 'Toko dan pabrik baru buka, tetangga dapat kerja. 💼', suka: true });

  return el(
    'div',
    { class: 'kabar-warga' },
    el('strong', {}, '📱 Kabar Warga'),
    ...unggahan.slice(0, 6).map((u, i) =>
      el(
        'div',
        { class: `kabar-warga-item ${u.suka ? 'suka' : 'keluh'}` },
        el('span', { class: 'kabar-warga-nama' }, NAMA_WARGA[i % NAMA_WARGA.length]!),
        el('span', {}, u.teks),
      ),
    ),
  );
}

/**
 * Kas kota: koin bertambah tiap menit dari toko, pabrik ramah lingkungan,
 * panel surya, dan kincir angin yang dibangun, plus bonus bila warga puas.
 * Siswa mengambilnya dengan tombol. Hanya ekonomi permainan.
 */
function kasKota(progres: Progres, wargaPuas: boolean, segarkan: () => void): HTMLElement {
  const perMenit = progres.pendapatanPerMenit(wargaPuas);
  const angka = el('strong', {}, '0 🪙');
  const tombol = el('button', { class: 'btn btn-small' }, '💰 Ambil kas');
  const perbarui = (): void => {
    const ada = progres.kasTersedia(perMenit);
    angka.textContent = `${ada} 🪙`;
    tombol.disabled = ada <= 0;
  };
  tombol.addEventListener('click', () => {
    if (progres.ambilKas(perMenit) > 0) segarkan();
  });
  perbarui();
  const pewaktu = window.setInterval(() => {
    if (!tombol.isConnected) window.clearInterval(pewaktu);
    else perbarui();
  }, 5000);

  return el(
    'div',
    { class: 'kas-kota' },
    el('div', { class: 'kas-kota-baris' }, el('span', {}, '🏦 Kas kota: '), angka, tombol),
    el(
      'small',
      { class: 'hint' },
      `Pendapatan ${perMenit} 🪙/menit: dasar ${PENDAPATAN_DASAR}${wargaPuas ? ', bonus warga puas +2' : ''}, toko +${PENDAPATAN_BANGUNAN.toko}, pabrik ramah lingkungan +${PENDAPATAN_BANGUNAN['pabrik-hijau']}, panel surya dan kincir angin +1 per bangunan. Kas menampung paling banyak ${progres.batasKasMenit} menit pendapatan.`,
    ),
  );
}

/**
 * Perawatan sarana-prasarana: kondisi bangunan koin menurun 2% per menit.
 * Di bawah 40% fasilitas rusak: tidak dihitung ruang hijau, tidak menghasilkan
 * kas, dan warga mengeluh. Siswa merawat semuanya sekaligus dengan koin.
 */
function perawatanSarpras(progres: Progres, sarpras: BangunanKota[], jumlahRusak: number, segarkan: () => void): HTMLElement {
  if (sarpras.length === 0) return el('span', {});
  const rerata = Math.round(sarpras.reduce((n, b) => n + progres.kondisi(b), 0) / sarpras.length);
  const biaya = progres.biayaRawatSemua();
  const pesan = el('p', { class: 'hint' });
  const tombol = el('button', { class: 'btn btn-small' }, biaya > 0 ? `🔧 Rawat semua · ${biaya} 🪙` : '✓ Kondisi baik');
  tombol.disabled = biaya <= 0 || progres.koin < biaya;
  tombol.addEventListener('click', () => {
    const h = progres.rawatSemua();
    pesan.textContent = h.pesan;
    if (h.ok) segarkan();
  });
  const isi = el('div', { class: 'profile-fill' });
  isi.style.width = `${rerata}%`;
  return el(
    'div',
    { class: `kas-kota sarpras${jumlahRusak > 0 ? ' is-rusak' : ''}` },
    el('div', { class: 'kas-kota-baris' }, el('span', {}, '🛠️ Kondisi sarana-prasarana:'), el('div', { class: 'profile-bar' }, isi), el('strong', {}, `${rerata}%`), tombol),
    el(
      'small',
      { class: 'hint' },
      jumlahRusak > 0
        ? `${jumlahRusak} fasilitas rusak (kondisi di bawah ${BATAS_RUSAK}%): tidak dihitung sebagai ruang hijau dan tidak menghasilkan kas. Rawat agar indeks hijau naik lagi.`
        : `Kondisi fasilitas yang kamu bangun turun sedikit demi sedikit. Di bawah ${BATAS_RUSAK}% fasilitas rusak dan indeks hijau turun, jadi rawatlah secara berkala.`,
    ),
    pesan,
  );
}
