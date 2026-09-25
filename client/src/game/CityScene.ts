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
  langit: 0x7cc4dd,
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
  private onPilihPetak: ((petak: ZoneCenter) => void) | null = null;

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
    if (this.terakhir) this.render(this.terakhir);
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
      if (petak) this.onPilihPetak(petak);
    });
  }

  /** Nyalakan atau matikan mode pilih pusat zona. */
  aturModePilih(handler: ((petak: ZoneCenter) => void) | null): void {
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

      const kunci = this.varian(seed, diX ? view.visualX : view.visualY);
      if (sprite.texture.key !== kunci) sprite.setTexture(kunci);

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
}

/** Warna zona per identitas visual, agar antarmuka HTML konsisten dengan peta. */
export const WARNA_VISUAL: Record<VariableVisual, string> = {
  nature: PALET_VISUAL.nature.top,
  clean: PALET_VISUAL.clean.top,
  housing: PALET_VISUAL.housing.top,
  neutral: PALET_VISUAL.neutral.top,
};

export { TILE_W, TILE_H };
