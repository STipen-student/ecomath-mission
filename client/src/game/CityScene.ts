/**
 * Viewport kota isometrik bergaya pixel-art city-builder.
 *
 * Scene ini hanya MENGGAMBAR keadaan alokasi yang diberikan pengendali aplikasi.
 * Tidak ada logika kendala maupun penilaian di sini.
 *
 * NAVIGASI SENGAJA DIKUNCI. Berbeda dari city-builder sandbox, siswa tidak dapat
 * menggeser, memutar, atau membangun langsung di peta - kota hanya berubah lewat
 * dua slider alokasi. Alasannya bukan keterbatasan teknis melainkan kesahihan
 * instrumen: setiap perubahan keadaan harus terekam sebagai event yang dapat
 * dinilai rubrik. Interaksi yang tidak menghasilkan event adalah bukti yang hilang.
 *
 * WARNA MENGIKUTI MAKNA, BUKAN SUMBU. Setiap variabel membawa identitas visual
 * sendiri dari data task (nature / clean / housing / neutral). Sebelumnya warna
 * dikunci ke sumbu, sehingga pada lima dari dua belas skenario - yang menempatkan
 * variabel ramah lingkungan di sumbu y - siswa melihat pepohonan tumbuh saat
 * menambah mesin fosil.
 */

import Phaser from 'phaser';
import type { VariableVisual } from '../api/types.js';
import {
  allocatePlots,
  defaultCenters,
  GRID,
  gridPixelSize,
  plotTiles,
  roadShape,
  tileKind,
  toIso,
  worldToPlot,
  type ZoneCenter,
} from './iso/isoGrid.js';
import {
  makeBuilding,
  makeRoad,
  makeShadow,
  makeTile,
  makeTree,
  TILE_H,
  TILE_SKIRT,
  TILE_W,
} from './pixel/textures.js';
import { buatSpriteKota, kunciSprite, SPRITE_BERASAP, type SpriteKota } from './pixel/spriteKota.js';
import { bunyiProtes } from './suara.js';
import { JENIS_BERASAP, JENIS_HUNIAN, jenisDariKode, periksaStandar, SERUAN } from './standarSdg.js';

export interface AllocationView {
  x: number;
  y: number;
  xMax: number;
  yMax: number;
  feasible: boolean;
  visualX: VariableVisual;
  visualY: VariableVisual;
  /** Titik pusat pembangunan tiap zona; bawaan berada di tengah pulau. */
  pusat?: { x: ZoneCenter; y: ZoneCenter };
  /** Wujud benda tiap zona sesuai makna variabel; bila kosong memakai visual. */
  spriteX?: SpriteKota;
  spriteY?: SpriteKota;
}

/**
 * Palet bangunan per identitas visual.
 *
 *   nature   ruang hijau, taman, jalur sepeda    -> pepohonan + bangunan rendah hijau
 *   clean    energi bersih, teknologi rendah emisi -> blok tosca terang
 *   housing  hunian, perumahan                    -> blok kuning-jingga
 *   neutral  industri, infrastruktur, fosil       -> blok kelabu kebiruan
 */
const PALET_VISUAL: Record<VariableVisual, { top: string; left: string; right: string; window?: string }> = {
  // Bangunan bertubuh krem dengan atap berwarna - mengikuti bahasa visual
  // ilustrasi kota siang hari: cerah, bertepi tegas, mudah dibedakan sekilas.
  nature: { top: '#5fbe57', left: '#3d8a3c', right: '#4ea54a', window: '#e6f7dd' },
  clean: { top: '#35b6ab', left: '#1f7a73', right: '#2a9990', window: '#e0fbf7' },
  housing: { top: '#e2604a', left: '#cbbf9a', right: '#f1e7c8', window: '#8fd0e8' },
  neutral: { top: '#8fa6b2', left: '#7d8f9a', right: '#a4bac6', window: '#dff0f7' },
};

const PALET = {
  // Langit cerah; saat kendala dilanggar berubah ke jingga-merah muda hangat -
  // menandakan bahaya tanpa membuat peta jadi suram.
  // Laut lepas di sekeliling pulau (bukan langit), supaya kota tidak tampak melayang.
  langit: 0x2f86ad,
  langitBahaya: 0xd98b7a,
  air: { base: '#4bb3e0', light: '#6ecdf0', dark: '#3a9ac9', soil: '#2f7fa8', wave: true },
  pasir: '#f2dfa8',
  rumput: { base: '#6fc25a', light: '#85d46e', dark: '#5aa94a', soil: '#c8a86a', speckle: 0.13 },
  jalan: { asphalt: '#b9b4a8', line: '#f5c53f', soil: '#9c9384' },
  pohon: { leaf: '#4eae4a', leafDark: '#3a8c39', leafLight: '#74cc68', trunk: '#8a6a3c' },
} as const;

/** Tinggi bangunan per varian, memberi ragam ketinggian seperti kota sungguhan. */
const TINGGI_BANGUNAN = [6, 10, 15, 21];

const SEMUA_VISUAL: VariableVisual[] = ['nature', 'clean', 'housing', 'neutral'];

export class CityScene extends Phaser.Scene {
  private lapisanDasar!: Phaser.GameObjects.Container;
  private lapisanBayangan!: Phaser.GameObjects.Container;
  private lapisanBangunan!: Phaser.GameObjects.Container;
  private kamera!: Phaser.Cameras.Scene2D.Camera;

  /** Sprite per petak, dipakai ulang agar tidak dibuat-hancurkan terus-menerus. */
  private readonly bangunan = new Map<number, Phaser.GameObjects.Image>();
  private readonly bayangan = new Map<number, Phaser.GameObjects.Image>();
  private penandaX!: Phaser.GameObjects.Container;
  private penandaY!: Phaser.GameObjects.Container;
  private terakhir: AllocationView | null = null;
  private siap = false;

  /** Dipanggil saat siswa mengetuk peta; null berarti mode pilih sedang mati. */
  private onPilihPetak: ((petak: ZoneCenter, seret: boolean) => void) | null = null;
  /** Petak terakhir yang dilewati saat menyeret, agar satu petak tidak dipicu berulang. */
  private petakSeret = -1;

  constructor() {
    super({ key: 'CityScene' });
  }

  create(): void {
    this.kamera = this.cameras.main;
    this.kamera.setBackgroundColor(PALET.langit);

    this.buatTekstur();

    this.lapisanDasar = this.add.container(0, 0);
    this.lapisanBayangan = this.add.container(0, 0);
    this.lapisanBangunan = this.add.container(0, 0);

    this.gambarDasar();
    this.siapkanBangunan();
    this.siapkanPenanda();
    this.siapkanSentuhan();

    this.aturKamera();
    this.scale.on('resize', () => this.aturKamera());

    this.siap = true;
    // Asap dari bus konvensional dan mesin fosil: kepulan naik terus-menerus.
    this.time.addEvent({ delay: 650, loop: true, callback: () => this.kepulkanAsap() });
    // Bus beroperasi: bus berangkat dari depo dan berjalan di jalan kota.
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.jalankanBus() });
    // Komentar warga muncul bergiliran, dan gelembungnya mengikuti warga berjalan.
    this.time.addEvent({ delay: 2200, loop: true, callback: () => this.wargaBerkomentar() });
    // Warga berdemo bila ada bangunan yang tidak sesuai semangat SDG 11/13.
    this.time.addEvent({ delay: 5500, loop: true, callback: () => this.wargaProtes() });
    this.events.on('update', () => {
      for (const g of this.gelembung) g.teks.setPosition(g.warga.x, g.warga.y - 8);
    });
    if (this.terakhir) this.render(this.terakhir);
    if (this.jumlahWargaTertunda > 0) this.hidupkan(this.jumlahWargaTertunda);
  }

  /* ---------------------------------------------------------------- */
  /* Tekstur                                                           */
  /* ---------------------------------------------------------------- */

  private buatTekstur(): void {
    makeTile(this, 'tile_rumput', PALET.rumput);

    // Empat varian air, masing-masing membawa pita pasir pada sisi yang
    // menghadap daratan, sehingga pulau punya garis pantai di keempat sisinya.
    for (const sisi of ['ul', 'ur', 'dl', 'dr'] as const) {
      makeTile(this, `tile_air_${sisi}`, { ...PALET.air, fringe: sisi, fringeColor: PALET.pasir });
    }

    makeRoad(this, 'jalan_col', { alongCol: true, alongRow: false, ...PALET.jalan });
    makeRoad(this, 'jalan_row', { alongCol: false, alongRow: true, ...PALET.jalan });
    makeRoad(this, 'jalan_x', { alongCol: true, alongRow: true, ...PALET.jalan });

    for (const visual of SEMUA_VISUAL) {
      const inset = visual === 'nature' ? 4 : 3;
      TINGGI_BANGUNAN.forEach((tinggi, i) => {
        makeBuilding(this, `bgn_${visual}_${i}`, tinggi, PALET_VISUAL[visual], inset);
      });
    }

    buatSpriteKota(this);
    makeTree(this, 'pohon_besar', PALET.pohon, 'besar');
    makeTree(this, 'pohon_kecil', PALET.pohon, 'kecil');
    makeShadow(this, 'bayangan');
  }

  /* ---------------------------------------------------------------- */
  /* Lapisan dasar - digambar sekali                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Sisi ubin air yang menghadap daratan.
   * Pada kisi isometrik, bertambahnya kolom mengarah ke kanan-bawah layar dan
   * bertambahnya baris ke kiri-bawah.
   */
  private sisiPantai(col: number, row: number): 'ul' | 'ur' | 'dl' | 'dr' {
    if (col === 0) return 'dr';
    if (col === GRID - 1) return 'ul';
    if (row === 0) return 'dl';
    return 'ur';
  }

  private gambarDasar(): void {
    // Titik jangkar diletakkan di tengah permukaan, bukan tengah tekstur,
    // supaya skirt tanah menjulur ke bawah dan bukan menggeser ubin ke atas.
    const jangkar = TILE_H / 2 / (TILE_H + TILE_SKIRT);

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const { x, y } = toIso(col, row);
        const jenis = tileKind(col, row);

        let kunci = 'tile_rumput';
        if (jenis === 'water') {
          kunci = `tile_air_${this.sisiPantai(col, row)}`;
        } else if (jenis === 'road') {
          const bentuk = roadShape(col, row);
          kunci = bentuk.alongCol && bentuk.alongRow ? 'jalan_x' : bentuk.alongCol ? 'jalan_col' : 'jalan_row';
        }

        this.lapisanDasar.add(this.add.image(x, y, kunci).setOrigin(0.5, jangkar));
      }
    }
    this.gambarHutanPulau(jangkar);
  }

  /**
   * Pulau bulat: di luar kisi kota (yang tidak berubah) ditambahkan cincin
   * daratan berbentuk lingkaran yang ditumbuhi hutan, sehingga kota tampak
   * berada di tengah pulau berhutan di laut, bukan papan yang melayang.
   * Hanya dekorasi: tidak bisa diketuk dan tidak dihitung di mana pun.
   */
  private gambarHutanPulau(jangkar: number): void {
    const pusat = (GRID - 1) / 2;
    const jari = Math.hypot(pusat, pusat) + 1.2;
    const lebar = 5;
    const petak: Array<{ col: number; row: number }> = [];
    for (let row = -lebar; row < GRID + lebar; row++) {
      for (let col = -lebar; col < GRID + lebar; col++) {
        const diKisi = col >= 0 && row >= 0 && col < GRID && row < GRID;
        if (diKisi || Math.hypot(col - pusat, row - pusat) > jari) continue;
        petak.push({ col, row });
      }
    }
    // Urut dari belakang ke depan agar tumpukan isometrik benar.
    petak.sort((a, b) => a.col + a.row - (b.col + b.row));
    const adaPohon = this.textures.exists('sk_pohon');
    let urutBelakang = 0;
    for (const { col, row } of petak) {
      const { x, y } = toIso(col, row);
      const depan = col >= GRID || row >= GRID;
      const tanah = this.add.image(x, y, 'tile_rumput').setOrigin(0.5, jangkar);
      if (depan) tanah.setDepth(1 + (col + row) / 1000);
      else this.lapisanDasar.addAt(tanah, urutBelakang++);
      if (!adaPohon) continue;
      const pohon = this.add
        .image(x + (Math.random() - 0.5) * 6, y + TILE_H / 2, 'sk_pohon')
        .setOrigin(0.5, 1)
        .setScale(0.9 + Math.random() * 0.3);
      if (depan) pohon.setDepth(1.5 + (col + row) / 1000);
      else this.lapisanDasar.add(pohon);
    }
  }

  private siapkanBangunan(): void {
    for (const petak of plotTiles()) {
      const { x, y } = toIso(petak.col, petak.row);

      // Bayangan digeser sedikit ke kanan-bawah, searah cahaya dari kiri-atas.
      const bayang = this.add.image(x + 2, y + 2, 'bayangan').setOrigin(0.5, 0.5).setVisible(false);
      this.lapisanBayangan.add(bayang);
      this.bayangan.set(petak.seed, bayang);

      // Origin di dasar sprite: bangunan berdiri di atas permukaan ubin,
      // bukan melayang di tengahnya.
      const sprite = this.add.image(x, y + TILE_H / 2, 'bgn_housing_0').setOrigin(0.5, 1).setVisible(false);
      this.lapisanBangunan.add(sprite);
      this.bangunan.set(petak.seed, sprite);
    }
  }

  /**
   * Penanda pusat zona.
   *
   * Digambar di lapisan paling atas agar tetap terlihat meski tertutup bangunan
   * tinggi - siswa harus selalu tahu di mana inti kotanya berada.
   */
  private siapkanPenanda(): void {
    const buat = (warna: number): Phaser.GameObjects.Container => {
      const wadah = this.add.container(0, 0).setDepth(50).setVisible(false);
      const tiang = this.add.rectangle(0, -14, 3, 18, 0x16323f).setOrigin(0.5, 0);
      const bendera = this.add.rectangle(6, -14, 14, 10, warna).setOrigin(0.5, 0).setStrokeStyle(2, 0x16323f);
      const alas = this.add.ellipse(0, 4, 16, 8, 0x16323f, 0.28);
      wadah.add([alas, tiang, bendera]);
      return wadah;
    };

    this.penandaX = buat(0x5fbe57);
    this.penandaY = buat(0xf0a93e);
  }

  /**
   * Ketukan pada peta.
   *
   * Hanya aktif saat mode pilih dinyalakan pengendali aplikasi. Di luar mode
   * itu, peta tetap TIDAK dapat diubah lewat sentuhan - setiap perubahan
   * keadaan harus melewati kendali yang tercatat sebagai event.
   */
  private siapkanSentuhan(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.onPilihPetak) return;
      const petak = worldToPlot(p.worldX, p.worldY);
      this.petakSeret = petak ? petak.row * GRID + petak.col : -1;
      if (petak) this.onPilihPetak(petak, false);
    });
    // Menyeret melewati petak lain memicu handler sekali per petak (mode 2B).
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.onPilihPetak || !p.isDown) return;
      const petak = worldToPlot(p.worldX, p.worldY);
      if (!petak) return;
      const seed = petak.row * GRID + petak.col;
      if (seed === this.petakSeret) return;
      this.petakSeret = seed;
      this.onPilihPetak(petak, true);
    });
  }

  /** Nyalakan atau matikan mode pilih pusat zona. */
  aturModePilih(handler: ((petak: ZoneCenter, seret: boolean) => void) | null): void {
    this.onPilihPetak = handler;
    this.input.setDefaultCursor(handler ? 'crosshair' : 'default');
  }

  /** Tekstur yang mewakili sebuah petak; stabil terhadap seed. */
  private varian(seed: number, visual: VariableVisual): string {
    if (visual === 'nature') {
      // Zona alam didominasi pepohonan dengan sedikit bangunan rendah, sehingga
      // terbaca sebagai ruang terbuka - bukan sekadar gedung berwarna hijau.
      const r = seed % 5;
      if (r === 0) return 'bgn_nature_0';
      return r % 2 === 0 ? 'pohon_kecil' : 'pohon_besar';
    }
    if (visual === 'clean') return `bgn_clean_${seed % 3}`;
    return `bgn_${visual}_${seed % TINGGI_BANGUNAN.length}`;
  }

  /* ---------------------------------------------------------------- */
  /* Kamera                                                            */
  /* ---------------------------------------------------------------- */

  private aturKamera(): void {
    const { width: lebarKisi, height: tinggiKisi } = gridPixelSize();
    const lebar = this.scale.width;
    const tinggi = this.scale.height;
    if (lebar === 0 || tinggi === 0) return;

    // Pembesaran dibulatkan ke kelipatan 0,25 agar tepi ubin tetap rata; nilai
    // pecahan sembarang membuat piksel tampak bergerigi tidak beraturan.
    //
    // Batas bawah 0,5 - BUKAN 1 - disengaja: pada layar HP, memaksa pembesaran
    // minimal 1 membuat sudut pulau terpotong di luar layar, dan bagian kota
    // yang tidak terlihat adalah alokasi yang tidak dapat dinilai siswa.
    const muat = Math.min(lebar / lebarKisi, tinggi / tinggiKisi) * 0.95;
    const zoom = Math.max(0.5, Math.floor(muat * 4) / 4);
    this.kamera.setZoom(zoom);

    const pusat = toIso((GRID - 1) / 2, (GRID - 1) / 2);
    this.kamera.centerOn(pusat.x, pusat.y);
  }

  /* ---------------------------------------------------------------- */
  /* Penggambaran keadaan                                              */
  /* ---------------------------------------------------------------- */

  render(view: AllocationView): void {
    this.terakhir = view;
    if (!this.siap) return;

    const pusat = view.pusat ?? defaultCenters();
    const { zonaX, zonaY } = allocatePlots(view.x, view.xMax, view.y, view.yMax, pusat);

    for (const [penanda, titik] of [
      [this.penandaX, pusat.x],
      [this.penandaY, pusat.y],
    ] as const) {
      const { x, y } = toIso(titik.col, titik.row);
      penanda.setPosition(x, y).setVisible(true);
    }

    for (const [seed, sprite] of this.bangunan) {
      const bayang = this.bayangan.get(seed);
      const diX = zonaX.has(seed);
      const diY = zonaY.has(seed);

      if (!diX && !diY) {
        sprite.setVisible(false);
        bayang?.setVisible(false);
        continue;
      }

      const wujud = diX ? view.spriteX : view.spriteY;
      const kunci = wujud ? kunciSprite(wujud) : this.varian(seed, diX ? view.visualX : view.visualY);
      if (sprite.texture.key !== kunci) sprite.setTexture(kunci);
      sprite.setData('jenis', wujud ?? (diX ? view.visualX : view.visualY));

      if (!sprite.visible) {
        sprite.setVisible(true);
        bayang?.setVisible(true);
        // Bangunan "tumbuh" saat muncul - umpan balik yang membuat perubahan
        // slider terasa berdampak, bukan sekadar angka yang berubah.
        sprite.setScale(1, 0.4);
        this.tweens.add({ targets: sprite, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
      }
    }

    // Rona kemerahan menandai konfigurasi yang melanggar kendala - penanda yang
    // terbaca sekejap tanpa harus membaca panel. Ronanya sengaja tipis: rona
    // pekat membuat kedua zona nyaris tak terbedakan, padahal justru
    // perbandingan kedua zona itulah yang harus dinilai siswa.
    this.sinkronBilah();
    this.kamera.setBackgroundColor(view.feasible ? PALET.langit : PALET.langitBahaya);
    const rona = view.feasible ? 0xffffff : 0xffc9bd;
    for (const lapisan of [this.lapisanDasar, this.lapisanBangunan]) {
      lapisan.iterate((anak: Phaser.GameObjects.GameObject) => {
        (anak as Phaser.GameObjects.Image).setTint(rona);
        return true;
      });
    }
  }

  /** Getaran singkat saat sistem menolak konfigurasi. */
  guncang(): void {
    if (this.siap) this.kamera.shake(220, 0.006);
  }

  /**
   * Penduduk yang terus berjalan di jalan kota (Peta Wilayah dan Kota Bebas).
   * Setiap warga berjalan dari satu titik jalan ke titik jalan lain tanpa henti.
   * Hanya tampilan: tidak ada event, tidak ada skor.
   */
  hidupkan(jumlah: number): void {
    if (!this.siap) {
      this.jumlahWargaTertunda = jumlah;
      return;
    }
    const jalan: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (tileKind(col, row) === 'road') jalan.push(toIso(col, row));
      }
    }
    if (jalan.length < 2) return;
    this.pasangAwan();
    const acak = () => jalan[Math.floor(Math.random() * jalan.length)]!;

    for (let i = 0; i < jumlah; i++) {
      const awal = acak();
      // Kira-kira sepertiga warga berkeliling kota dengan sepeda.
      const bersepeda = i % 3 === 0;
      const warga: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image = bersepeda
        ? this.add.image(awal.x, awal.y - 3, 'sk_pesepeda').setDepth(40)
        : this.add
            .rectangle(awal.x, awal.y - 3, 3, 5, WARNA_WARGA[i % WARNA_WARGA.length])
            .setDepth(40)
            .setStrokeStyle(1, 0x16323f);
      this.wargaJalan.push(warga);
      const jalankan = (): void => {
        const tujuan = acak();
        const jarak = Math.hypot(tujuan.x - warga.x, tujuan.y - warga.y);
        if (bersepeda) (warga as Phaser.GameObjects.Image).setFlipX(tujuan.x < warga.x);
        this.tweens.add({
          targets: warga,
          x: tujuan.x,
          y: tujuan.y - 3,
          duration: Math.max(bersepeda ? 700 : 1200, jarak * (bersepeda ? 12 : 28)),
          delay: Math.random() * 800,
          ease: 'Linear',
          onComplete: jalankan,
        });
      };
      jalankan();
    }
  }

  /**
   * Satu putaran asap: beberapa sprite berasap yang tampil mengeluarkan kepulan
   * abu-abu yang naik dan memudar. Hanya tampilan.
   */
  private kepulkanAsap(): void {
    const berasap: Phaser.GameObjects.Image[] = [];
    for (const sprite of this.bangunan.values()) {
      if (!sprite.visible) continue;
      const jenis = sprite.texture.key.startsWith('sk_') ? (sprite.texture.key.slice(3) as SpriteKota) : null;
      if (jenis && SPRITE_BERASAP.has(jenis)) berasap.push(sprite);
    }
    for (const bus of this.busBerjalan) {
      if (bus.active && bus.texture.key === 'sk_bus-konvensional') berasap.push(bus);
    }
    for (let i = 0; i < Math.min(8, berasap.length); i++) {
      const s = berasap[Math.floor(Math.random() * berasap.length)]!;
      // Knalpot bus di kiri bawah; cerobong pabrik di kanan atas.
      const bus = s.texture.key === 'sk_bus-konvensional';
      const skala = s.scaleX;
      const asap = this.add
        .circle(s.x + (bus ? -12 : 7) * skala, s.y - (bus ? 12 : 30) * skala, (3 + Math.random() * 2) * skala, 0x5a5a5a, 0.75)
        .setDepth(45);
      this.tweens.add({
        targets: asap,
        y: asap.y - 10 - Math.random() * 8,
        x: asap.x + (Math.random() - 0.5) * 6,
        scale: 2.2,
        alpha: 0,
        duration: 1400,
        ease: 'Sine.easeOut',
        onComplete: () => asap.destroy(),
      });
    }
  }

  /** Bilah kincir per petak, diputar terus selama kincirnya tampil. */
  private readonly bilah = new Map<number, Phaser.GameObjects.Image>();

  /**
   * Pasang atau sembunyikan bilah berputar di atas setiap kincir angin yang
   * tampil. Pusat bilah berada di poros kincir (sk_turbin).
   */
  private sinkronBilah(): void {
    for (const [seed, sprite] of this.bangunan) {
      const kincir = sprite.visible && sprite.texture.key === 'sk_turbin';
      let b = this.bilah.get(seed);
      if (!kincir) {
        b?.setVisible(false);
        continue;
      }
      if (!b) {
        b = this.add.image(sprite.x, sprite.y - 24, 'sk_bilah').setDepth(41);
        this.tweens.add({ targets: b, angle: 360, duration: 1600 + (seed % 5) * 200, repeat: -1 });
        this.bilah.set(seed, b);
      }
      b.setPosition(sprite.x, sprite.y - 24).setVisible(true);
    }
  }

  /** Bus yang sedang berkeliling kota. */
  private busBerjalan: Phaser.GameObjects.Image[] = [];

  /**
   * Rute keliling kota: persegi panjang mengikuti jalan terluar, lalu satu
   * putaran memotong lewat jalan tengah. Titik-titik sudutnya berada di jalan,
   * sehingga garis lurus di antara dua sudut juga berada di jalan.
   */
  private ruteKeliling(): Array<{ x: number; y: number }> {
    const jalanKolom: number[] = [];
    for (let c = 1; c < GRID - 1; c++) if (tileKind(c, 1) === 'road') jalanKolom.push(c);
    if (jalanKolom.length < 2) return [];
    const a = jalanKolom[0]!;
    const z = jalanKolom[jalanKolom.length - 1]!;
    const m = jalanKolom[Math.floor(jalanKolom.length / 2)]!;
    const sudut: Array<[number, number]> = [[a, a], [z, a], [z, m], [a, m], [a, z], [z, z], [z, a], [a, a]];
    return sudut.map(([col, row]) => toIso(col, row));
  }

  /**
   * Bus beroperasi: selama ada depo bus (sprite bus) yang tampil, beberapa bus
   * berkeliling kota terus-menerus di rute jalan. Jumlahnya mengikuti banyaknya
   * depo, paling banyak enam. Bus konvensional ikut berasap. Hanya tampilan.
   */
  private jalankanBus(): void {
    this.busBerjalan = this.busBerjalan.filter((b) => b.active);
    const depo = [...this.bangunan.values()].filter(
      (s) => s.visible && (s.texture.key === 'sk_bus-listrik' || s.texture.key === 'sk_bus-konvensional'),
    );
    if (depo.length === 0) {
      for (const bus of this.busBerjalan) bus.destroy();
      this.busBerjalan = [];
      return;
    }
    const target = Math.min(6, 2 + Math.floor(depo.length / 8));
    if (this.busBerjalan.length >= target) return;

    const rute = this.ruteKeliling();
    if (rute.length < 2) return;
    // Jenis bus mengikuti komposisi depo.
    const asal = depo[Math.floor(Math.random() * depo.length)]!;
    const mulai = Math.floor(Math.random() * (rute.length - 1));
    const awal = rute[mulai]!;
    const bus = this.add.image(awal.x, awal.y + 4, asal.texture.key).setOrigin(0.5, 1).setScale(0.6).setDepth(42).setAlpha(0);
    this.busBerjalan.push(bus);
    this.tweens.add({ targets: bus, alpha: 1, duration: 300 });

    const lanjut = (i: number): void => {
      if (!bus.active) return;
      const dari = rute[i % rute.length]!;
      const ke = rute[(i + 1) % rute.length]!;
      bus.setFlipX(ke.x < dari.x);
      const jarak = Math.hypot(ke.x - dari.x, ke.y - dari.y);
      this.tweens.add({
        targets: bus,
        x: ke.x,
        y: ke.y + 4,
        duration: Math.max(800, jarak * 24),
        ease: 'Linear',
        onComplete: () => lanjut(i + 1),
      });
    };
    lanjut(mulai);
  }

  /** Penduduk yang berjalan terus; menjadi pembicara komentar warga. */
  private readonly wargaJalan: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image> = [];
  /** Gelembung komentar yang sedang tampil, mengikuti wargannya. */
  private gelembung: Array<{ teks: Phaser.GameObjects.Text; warga: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image }> = [];

  /**
   * Satu warga berkomentar tentang fasilitas yang tampil di peta. Komentar
   * dipilih dari jenis bangunan yang benar-benar ada, jadi isinya ikut berubah
   * mengikuti kota yang dibangun siswa. Hanya tampilan.
   */
  private wargaBerkomentar(): void {
    if (this.wargaJalan.length === 0 || this.gelembung.length >= 3) return;
    const jenis = new Set<SpriteKota>();
    for (const sprite of this.bangunan.values()) {
      if (sprite.visible && sprite.texture.key.startsWith('sk_')) jenis.add(sprite.texture.key.slice(3) as SpriteKota);
    }
    const pilihan = [...jenis].filter((j) => KOMENTAR[j]?.length);
    if (pilihan.length === 0) return;
    const daftar = KOMENTAR[pilihan[Math.floor(Math.random() * pilihan.length)]!]!;
    const isi = daftar[Math.floor(Math.random() * daftar.length)]!;
    const warga = this.wargaJalan[Math.floor(Math.random() * this.wargaJalan.length)]!;

    const teks = this.add
      .text(warga.x, warga.y - 8, isi, {
        fontFamily: 'system-ui, sans-serif',
        // Ukuran huruf menyesuaikan pembesaran kamera agar tetap terbaca di layar.
        fontSize: `${Math.round(11 / Math.max(0.25, this.kamera.zoom))}px`,
        color: '#16323f',
        backgroundColor: '#ffffff',
        padding: { x: Math.round(4 / Math.max(0.25, this.kamera.zoom)), y: Math.round(2 / Math.max(0.25, this.kamera.zoom)) },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(60)
      .setAlpha(0);
    const g = { teks, warga };
    this.gelembung.push(g);
    this.tweens.add({ targets: teks, alpha: 1, duration: 200 });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: teks,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          teks.destroy();
          this.gelembung = this.gelembung.filter((x) => x !== g);
        },
      });
    });
  }

  /**
   * Awan yang melayang pelan melintasi kota. Dipasang bersama penduduk
   * (hidupkan), jadi hanya muncul di peta yang bukan level dinilai.
   */
  private awanTerpasang = false;

  private pasangAwan(): void {
    if (this.awanTerpasang) return;
    this.awanTerpasang = true;
    const kiri = toIso(0, GRID - 1).x - 120;
    const kanan = toIso(GRID - 1, 0).x + 120;
    const atas = toIso(0, 0).y - 20;
    const bawah = toIso(GRID - 1, GRID - 1).y;
    // Riak ombak di laut sekitar pulau: garis putih tipis yang timbul-tenggelam.
    for (let i = 0; i < 40; i++) {
      const ox = kiri - 200 + Math.random() * (kanan - kiri + 400);
      const oy = atas - 120 + Math.random() * (bawah - atas + 240);
      const riak = this.add.rectangle(ox, oy, 8 + Math.random() * 8, 1.5, 0xbfe6f5).setDepth(-5).setAlpha(0);
      this.tweens.add({
        targets: riak,
        alpha: 0.6,
        x: ox + 6,
        duration: 1400 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }
    for (let i = 0; i < 4; i++) {
      const y = atas + ((bawah - atas) * i) / 4;
      const awan = this.add
        .image(kiri + Math.random() * (kanan - kiri), y, 'sk_awan')
        .setDepth(70)
        .setAlpha(0.45)
        .setScale(1.2 + Math.random() * 0.8);
      const melintas = (): void => {
        const durasi = 26000 + Math.random() * 16000;
        this.tweens.add({
          targets: awan,
          x: kanan,
          duration: durasi * ((kanan - awan.x) / (kanan - kiri)),
          ease: 'Linear',
          onComplete: () => {
            awan.x = kiri;
            melintas();
          },
        });
      };
      melintas();
    }
  }

  /** Demo yang sedang berlangsung; paling banyak satu dalam satu waktu. */
  private demoBerjalan = false;

  /**
   * Warga berdemo di dekat bangunan yang melanggar: SDG 13 di dekat bangunan
   * berasap, SDG 11 di dekat hunian bila ruang hijau kurang. Hanya di peta yang
   * punya penduduk berjalan (bukan level dinilai). Hanya tampilan.
   */
  private wargaProtes(): void {
    if (this.demoBerjalan || this.wargaJalan.length === 0) return;
    const tampil = [...this.bangunan.values()].filter((s) => s.visible && s.getData('jenis'));
    const pelanggaran = periksaStandar(tampil.map((s) => String(s.getData('jenis'))));
    if (pelanggaran.length === 0) return;

    const p = pelanggaran[Math.floor(Math.random() * pelanggaran.length)]!;
    const kandidat = tampil.filter((s) => {
      const j = String(s.getData('jenis'));
      return p.sdg === 13 ? j === p.jenis || JENIS_BERASAP.has(j) : JENIS_HUNIAN.has(j);
    });
    const sasaran = kandidat[Math.floor(Math.random() * kandidat.length)];
    if (!sasaran) return;

    this.demoBerjalan = true;
    const objek: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < 4; i++) {
      const x = sasaran.x - 12 + i * 8;
      const y = sasaran.y + 4 + (i % 2) * 3;
      const orang = this.add.rectangle(x, y, 3, 5, WARNA_WARGA[i % WARNA_WARGA.length]).setDepth(61).setStrokeStyle(1, 0x16323f);
      const tongkat = this.add.rectangle(x + 1, y - 6, 1, 6, 0x8a6a3c).setDepth(61);
      const papan = this.add.rectangle(x + 1, y - 10, 7, 4, 0xffffff).setDepth(62).setStrokeStyle(1, 0xd9534f);
      // Papan diangkat naik-turun seperti orang berdemo.
      this.tweens.add({ targets: [tongkat, papan], y: '-=2', duration: 280 + i * 40, yoyo: true, repeat: -1 });
      objek.push(orang, tongkat, papan);
    }

    const zoom = Math.max(0.25, this.kamera.zoom);
    bunyiProtes();
    const seruan = SERUAN[p.sdg][Math.floor(Math.random() * SERUAN[p.sdg].length)]!;
    const teks = this.add
      .text(sasaran.x, sasaran.y - 16, `📢 ${seruan}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(11 / zoom)}px`,
        color: '#ffffff',
        backgroundColor: '#d9534f',
        padding: { x: Math.round(4 / zoom), y: Math.round(2 / zoom) },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(63);
    objek.push(teks);

    this.time.delayedCall(4500, () => {
      this.tweens.add({
        targets: objek,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          for (const o of objek) o.destroy();
          this.demoBerjalan = false;
        },
      });
    });
  }

  /** Jumlah warga yang diminta sebelum scene siap; dijalankan di create(). */
  private jumlahWargaTertunda = 0;

  /**
   * Perayaan setelah rancangan disahkan (hiburan, tanpa event).
   *
   * Bangunan memantul bergiliran, kota diberi cahaya hangat sebentar, dan
   * beberapa warga berjalan di jalan. Semua objek perayaan dihapus sendiri.
   */
  rayakan(): void {
    if (!this.siap) return;

    let urutan = 0;
    for (const sprite of this.bangunan.values()) {
      if (!sprite.visible) continue;
      this.tweens.add({
        targets: sprite,
        scaleY: { from: 1, to: 1.18 },
        duration: 140,
        yoyo: true,
        delay: Math.min(urutan * 12, 900),
        ease: 'Sine.easeOut',
      });
      urutan++;
    }

    this.kamera.flash(400, 255, 236, 170);

    const jalan: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (tileKind(col, row) === 'road') jalan.push(toIso(col, row));
      }
    }
    if (jalan.length < 2) return;

    for (let i = 0; i < 14; i++) {
      const awal = jalan[Math.floor(Math.random() * jalan.length)]!;
      const akhir = jalan[Math.floor(Math.random() * jalan.length)]!;
      const warga = this.add
        .rectangle(awal.x, awal.y - 3, 3, 5, WARNA_WARGA[i % WARNA_WARGA.length])
        .setDepth(40)
        .setStrokeStyle(1, 0x16323f);
      this.tweens.add({
        targets: warga,
        x: akhir.x,
        y: akhir.y - 3,
        duration: 2600 + Math.random() * 1600,
        ease: 'Linear',
        onComplete: () => warga.destroy(),
      });
    }
  }

  /**
   * Mode kota (eksperimen TheoTown): bangunan digambar sesuai jenis yang
   * DITARUH pemain pada tiap petak, bukan dari penggeser alokasi.
   * `petak` memetakan seed petak (row * GRID + col) ke jenis bangunan.
   */
  tampilkanKota(petak: Map<number, string>, feasible = true): void {
    if (!this.siap) return;
    for (const penanda of [this.penandaX, this.penandaY]) penanda.setVisible(false);
    for (const [seed, sprite] of this.bangunan) {
      const bayang = this.bayangan.get(seed);
      const jenis = petak.get(seed);
      if (!jenis) {
        sprite.setVisible(false);
        bayang?.setVisible(false);
        continue;
      }
      // 's:<sprite>' = wujud sesuai makna variabel; 'v:<visual>' = cadangan warna
      // makna; selain itu jenis bangunan draf 2 (layar Kota).
      const kunci = jenis.startsWith('s:')
        ? kunciSprite(jenis.slice(2) as SpriteKota)
        : jenis.startsWith('v:')
          ? this.varian(seed, jenis.slice(2) as VariableVisual)
          : (SPRITE_KOTA[jenis] ?? 'bgn_housing_1');
      if (sprite.texture.key !== kunci) sprite.setTexture(kunci);
      sprite.setData('jenis', jenisDariKode(jenis));
      if (!sprite.visible) {
        sprite.setVisible(true);
        bayang?.setVisible(true);
        sprite.setScale(1, 0.4);
        this.tweens.add({ targets: sprite, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
      }
    }
    this.sinkronBilah();
    // Rona kelayakan sama dengan render(): sumbernya tetap ditentukan pemanggil (§7.20).
    this.kamera.setBackgroundColor(feasible ? PALET.langit : PALET.langitBahaya);
    const rona = feasible ? 0xffffff : 0xffc9bd;
    for (const lapisan of [this.lapisanDasar, this.lapisanBangunan]) {
      lapisan.iterate((anak: Phaser.GameObjects.GameObject) => {
        (anak as Phaser.GameObjects.Image).setTint(rona);
        return true;
      });
    }
  }
}

/**
 * Komentar warga per fasilitas yang tampil di peta (hiburan, tanpa event).
 * Hanya muncul di peta yang punya penduduk berjalan (Peta Wilayah, Kota Bebas).
 */
const KOMENTAR: Partial<Record<SpriteKota, string[]>> = {
  'pohon': ['Adem banget di sini!', 'Anak-anak jadi punya tempat main.', 'Udaranya segar ya.'],
  'taman-kota': ['Tamannya cantik!', 'Enak buat piknik sore.', 'Bunganya wangi.'],
  'rumah': ['Akhirnya punya rumah!', 'Tetangganya ramah.'],
  'rumah-a': ['Rumahnya luas, pas buat keluarga.', 'Cicilannya terjangkau!'],
  'rumah-b': ['Mungil tapi nyaman.', 'Pas buat keluarga muda.'],
  'perumahan-padat': ['Dekat ke tempat kerja.', 'Ramai, tapi masih ada taman.'],
  'hunian-rendah-karbon': ['Tagihan listrik turun!', 'Atapnya hijau, keren.'],
  'gedung': ['Pemandangan dari atas bagus!', 'Liftnya hemat energi.'],
  'bus-listrik': ['Bus listriknya senyap!', 'Naik bus jadi nyaman.', 'Nggak ada bau solar lagi.'],
  'bus-konvensional': ['Uhuk... asapnya.', 'Busnya berisik banget.', 'Semoga cepat diganti bus listrik.'],
  'parkir': ['Gampang cari parkir.', 'Parkirnya luas.'],
  'sepeda': ['Bersepeda jadi aman!', 'Ke sekolah naik sepeda, yuk.', 'Lajurnya lebar, mantap.'],
  'trotoar': ['Jalan kaki jadi enak.', 'Trotoarnya rata, nggak becek.'],
  'surya': ['Listrik dari matahari!', 'Nggak padam lagi pas badai.'],
  'turbin': ['Kincirnya berputar terus!', 'Anginnya jadi berguna.'],
  'industri-hijau': ['Kerja dekat rumah, bersih lagi.', 'Pabriknya nggak berasap.'],
  'mesin-fosil': ['Kabutnya bikin sesak.', 'Asap pabrik lagi...', 'Kapan ganti mesin listrik?'],
  'mesin-listrik': ['Pabriknya jadi tenang.', 'Udara di sini makin bersih.'],
  'kompos': ['Sampahnya jadi pupuk!', 'Kebunku subur pakai kompos.'],
  'daur-ulang': ['Botol bekas jadi berguna.', 'Pasar nggak bau lagi.'],
  'hijau-multifungsi': ['Nggak banjir lagi pas hujan!', 'Kolamnya bikin sejuk.'],
};

/** Warna baju warga yang berjalan saat perayaan. */
const WARNA_WARGA = [0xe2604a, 0x35b6ab, 0xf5c53f, 0x6c8ebf, 0xffffff];

/** Sprite per jenis bangunan kota. Toko dan panel surya memakai palet terdekat. */
const SPRITE_KOTA: Record<string, string> = {
  rumah: 'bgn_housing_1',
  toko: 'bgn_clean_1',
  pabrik: 'bgn_neutral_3',
  taman: 'pohon_besar',
  surya: 'bgn_clean_0',
};

/** Warna zona per identitas visual, agar antarmuka HTML konsisten dengan peta. */
export const WARNA_VISUAL: Record<VariableVisual, string> = {
  nature: PALET_VISUAL.nature.top,
  clean: PALET_VISUAL.clean.top,
  housing: PALET_VISUAL.housing.top,
  neutral: PALET_VISUAL.neutral.top,
};

export { TILE_W, TILE_H };
