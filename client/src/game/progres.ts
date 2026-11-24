/**
 * Elemen permainan: koin, misi, misi tersembunyi, perlengkapan, dan tantangan kilat.
 *
 * BATAS TERHADAP PENGUKURAN DAN AaL (docs/SCORING_SPEC.md §7.30):
 *   - Hadiah TIDAK bergantung pada skor K1-K4, bintang, atau kalibrasi penilaian
 *     diri. Siswa tidak punya alasan menilai dirinya lebih tinggi atau lebih
 *     rendah demi hadiah, dan tidak punya alasan mengubah cara kerja di level.
 *   - Misi di level hanya menghargai hal yang SUDAH wajib (menyelesaikan level,
 *     menetapkan target). Tidak ada misi untuk perilaku yang dinilai rubrik,
 *     misalnya mengecek titik pojok atau menulis refleksi panjang.
 *   - Tantangan berbatas waktu dan efek perlengkapan HANYA berlaku di Kota Bebas,
 *     yang tidak dinilai. Kecepatan tidak pernah masuk ke level yang dinilai.
 *   - Tidak ada event yang dicatat dan tidak ada data yang dikirim ke server.
 *     Progres disimpan per sesi di perangkat (localStorage), dan aman bila
 *     penyimpanan diblokir: progres hanya berlaku selama halaman terbuka.
 */

export type IdMisi =
  | 'level-1'
  | 'semua-level'
  | 'punya-rencana'
  | 'kota-hijau'
  | 'kota-ramai'
  | 'tantangan-kilat';

export type IdRahasia = 'arsitek-rahasia' | 'kota-tanpa-asap' | 'penjelajah-misi' | 'tiket-jalan-pintas' | 'bantu-perpustakaan';

/** Skor rubrik minimal satu level untuk membuka misi perpustakaan. */
export const SKOR_BUKA_PERPUSTAKAAN = 10;

export type IdBarang = 'air-mancur' | 'lampu-kota' | 'bendera-kota' | 'subsidi-hijau' | 'panel-efisien';

export interface Misi {
  id: IdMisi | IdRahasia;
  judul: string;
  /** Untuk misi tersembunyi, keterangan baru tampil setelah ditemukan. */
  keterangan: string;
  koin: number;
  rahasia: boolean;
  /** Di mana misi ini bisa diselesaikan. */
  tempat: 'level' | 'kota-bebas' | 'di-mana-saja';
}

export const MISI: Misi[] = [
  { id: 'level-1', judul: 'Wali kota pemula', keterangan: 'Selesaikan Level 1.', koin: 50, rahasia: false, tempat: 'level' },
  { id: 'semua-level', judul: 'Perencana tangguh', keterangan: 'Selesaikan keempat level.', koin: 150, rahasia: false, tempat: 'level' },
  { id: 'punya-rencana', judul: 'Selalu punya rencana', keterangan: 'Tetapkan target belajar di keempat level.', koin: 60, rahasia: false, tempat: 'level' },
  { id: 'kota-hijau', judul: 'Kota hijau', keterangan: 'Di Kota Bebas, bangun 5 taman.', koin: 40, rahasia: false, tempat: 'kota-bebas' },
  { id: 'kota-ramai', judul: 'Kota ramai', keterangan: 'Di Kota Bebas, capai 30 warga.', koin: 60, rahasia: false, tempat: 'kota-bebas' },
  { id: 'tantangan-kilat', judul: 'Gesit tapi bijak', keterangan: 'Menangkan Tantangan Kilat di Kota Bebas.', koin: 100, rahasia: false, tempat: 'kota-bebas' },
  { id: 'arsitek-rahasia', judul: 'Arsitek rahasia', keterangan: 'Mengetuk lencana level lima kali.', koin: 30, rahasia: true, tempat: 'di-mana-saja' },
  { id: 'kota-tanpa-asap', judul: 'Kota tanpa asap', keterangan: 'Di Kota Bebas, punya 20 warga tanpa satu pabrik pun.', koin: 80, rahasia: true, tempat: 'kota-bebas' },
  { id: 'penjelajah-misi', judul: 'Penjelajah', keterangan: 'Membuka daftar misi tiga kali.', koin: 20, rahasia: true, tempat: 'di-mana-saja' },
  {
    id: 'bantu-perpustakaan',
    judul: 'Sahabat perpustakaan',
    keterangan: `Terbuka bila satu level mendapat skor minimal 10/12. Bantu Bu Rani merapikan rak buku perpustakaan kota.`,
    koin: 80,
    rahasia: true,
    tempat: 'di-mana-saja',
  },
  {
    id: 'tiket-jalan-pintas',
    judul: 'Tiket jalan pintas',
    keterangan: 'Mengetuk ilustrasi cerita tiga kali. Hadiah: layar cerita dan jeda perayaan berikutnya dilewati. Level, target, refleksi, dan penilaian diri tetap dikerjakan.',
    koin: 25,
    rahasia: true,
    tempat: 'di-mana-saja',
  },
];

export interface Barang {
  id: IdBarang;
  nama: string;
  ikon: string;
  harga: number;
  /** Penjelasan efek; efek permainan hanya berlaku di Kota Bebas. */
  efek: string;
  jenis: 'hiasan' | 'alat';
}

export const BARANG: Barang[] = [
  { id: 'air-mancur', nama: 'Air mancur', ikon: '⛲', harga: 60, efek: 'Hiasan alun-alun kota.', jenis: 'hiasan' },
  { id: 'lampu-kota', nama: 'Lampu kota', ikon: '🏮', harga: 40, efek: 'Hiasan: kota terang di malam hari.', jenis: 'hiasan' },
  { id: 'bendera-kota', nama: 'Bendera kota', ikon: '🚩', harga: 30, efek: 'Hiasan: bendera di balai kota.', jenis: 'hiasan' },
  { id: 'subsidi-hijau', nama: 'Subsidi hijau', ikon: '🌱', harga: 90, efek: 'Kota Bebas: biaya taman 20% lebih murah.', jenis: 'alat' },
  { id: 'panel-efisien', nama: 'Panel efisien', ikon: '🔆', harga: 110, efek: 'Kota Bebas: biaya panel surya 20% lebih murah.', jenis: 'alat' },
];

interface Keadaan {
  koin: number;
  selesai: string[];
  punya: IdBarang[];
  levelSelesai: number[];
  levelBertarget: number[];
  bukaMisi: number;
  /** Misi perpustakaan sudah terbuka (skor rubrik >= SKOR_BUKA_PERPUSTAKAAN). */
  perpustakaanTerbuka: boolean;
  /** Bangunan yang dibeli dengan koin dan ditaruh di wilayah gabungan. */
  bangunanKota: BangunanKota[];
  /** Perbaikan kota hasil tanggapan protes yang tepat ('ganti-listrik' | 'tambah-hijau'). */
  perbaikanKota: string[];
  /** Tiket Kotak Kejutan, didapat dari MENGIKUTI kegiatan AaL (bukan dari isinya). */
  tiketGacha: number;
  /** Kartu warga yang sudah dikumpulkan dari Kotak Kejutan. */
  koleksi: string[];
  /** Waktu (ms) terakhir kas kota dikumpulkan; 0 = belum mulai. */
  kasTerakhir: number;
}

const kosong = (): Keadaan => ({
  koin: 0,
  selesai: [],
  punya: [],
  levelSelesai: [],
  levelBertarget: [],
  bukaMisi: 0,
  perpustakaanTerbuka: false,
  bangunanKota: [],
  perbaikanKota: [],
  tiketGacha: 0,
  koleksi: [],
  kasTerakhir: 0,
});

/** Pendapatan kas kota per menit dari bangunan yang dibangun dengan koin. */
export const PENDAPATAN_BANGUNAN: Record<string, number> = {
  toko: 3,
  'pabrik-hijau': 4,
  surya: 1,
  turbin: 1,
};
/** Pendapatan dasar per menit, dan batas akumulasi (menit) agar tidak menumpuk tanpa batas. */
export const PENDAPATAN_DASAR = 1;
export const BATAS_KAS_MENIT = 60;

/**
 * Kotak Kejutan (gacha). Peluangnya ditampilkan apa adanya kepada siswa.
 * Isinya hanya koin dan kartu warga koleksi: tidak ada yang memengaruhi
 * skor K1-K4, level, atau data AaL. Tidak ada uang sungguhan.
 */
export const KARTU_WARGA = [
  {
    id: 'bu-sari', nama: 'Bu Sari, pesepeda pagi', ikon: '🚲', langka: false,
    kisah: 'Setiap pagi Bu Sari bersepeda ke pasar. Makin banyak warga ikut bersepeda, jalanan tidak macet dan udara lebih bersih (SDG 11 dan 13).',
    manfaat: 'Kas kota +1 🪙/menit',
  },
  {
    id: 'pak-darto', nama: 'Pak Darto, sopir bus listrik', ikon: '🚌', langka: false,
    kisah: 'Bus listrik Pak Darto senyap dan tanpa asap. Warga yang pindah ke transportasi umum mengurangi emisi kendaraan pribadi (SDG 13).',
    manfaat: 'Kas kota +1 🪙/menit',
  },
  {
    id: 'nina', nama: 'Nina, perawat taman', ikon: '🌷', langka: false,
    kisah: 'Nina menyiram dan memangkas pohon kota. Ruang hijau yang terawat menyerap panas dan karbon (SDG 11.7).',
    manfaat: 'Pohon dan taman aus 2× lebih lambat',
  },
  {
    id: 'dimas', nama: 'Dimas, pelajar SD', ikon: '🎒', langka: false,
    kisah: 'Dimas dan teman-temannya mengelola tabungan sampah daur ulang di sekolah, hasilnya masuk kas kota.',
    manfaat: 'Kas kota menampung 90 menit, bukan 60',
  },
  {
    id: 'oma-reni', nama: 'Oma Reni, penjaga perpustakaan', ikon: '📚', langka: false,
    kisah: 'Oma Reni membagikan kupon membaca untuk anak-anak yang rajin merefleksikan belajarnya.',
    manfaat: 'Langsung mendapat 1 tiket Kotak Kejutan',
  },
  {
    id: 'mbak-lusi', nama: 'Mbak Lusi, teknisi panel surya', ikon: '☀️', langka: true,
    kisah: 'Mbak Lusi membersihkan dan memeriksa panel surya serta kincir angin kota, agar energi bersih terus mengalir (SDG 7 dan 13).',
    manfaat: 'Panel surya dan kincir angin tidak aus',
  },
  {
    id: 'bu-laras', nama: 'Bu Laras, Kepala Perencanaan', ikon: '🗺️', langka: true,
    kisah: 'Bu Laras menyusun jadwal perawatan rutin. Perencanaan yang baik membuat biaya perbaikan lebih murah.',
    manfaat: 'Biaya perawatan sarana-prasarana −30%',
  },
  {
    id: 'dr-andi', nama: 'dr. Andi, dokter rumah sakit kota', ikon: '🩺', langka: true,
    kisah: 'Udara bersih dan ruang hijau membuat pasien dr. Andi berkurang. Warga yang sehat lebih bahagia dan produktif (SDG 3 dan 11).',
    manfaat: 'Bonus warga puas di kas kota menjadi +4',
  },
] as const;

export const HARGA_GACHA_KOIN = 40;

/**
 * Sarana-prasarana yang dibangun dengan koin. Kondisinya menurun seiring waktu
 * (lihat LAJU_AUS_PER_MENIT) dan perlu dirawat agar tetap berfungsi.
 */
export interface BangunanKota {
  seed: number;
  jenis: string;
  /** Harga beli, dasar biaya perawatan. */
  harga?: number;
  /** Waktu (ms) terakhir dibangun atau dirawat. */
  dirawat?: number;
}

/** Kondisi turun 2% per menit; di bawah BATAS_RUSAK fasilitas dianggap rusak. */
export const LAJU_AUS_PER_MENIT = 2;
export const BATAS_RUSAK = 40;

/** Kondisi (0-100) satu bangunan pada waktu `sekarang`. */
export function kondisiBangunan(b: BangunanKota, sekarang = Date.now(), faktorLaju = 1): number {
  if (!b.dirawat) return 100;
  const menit = Math.max(0, (sekarang - b.dirawat) / 60000);
  return Math.max(0, Math.round(100 - menit * LAJU_AUS_PER_MENIT * faktorLaju));
}

/** Biaya mengembalikan satu bangunan ke kondisi 100%: 30% harga beli dikali kerusakan. */
export function biayaRawat(b: BangunanKota, sekarang = Date.now()): number {
  const rusak = 100 - kondisiBangunan(b, sekarang);
  if (rusak <= 0) return 0;
  return Math.max(1, Math.ceil(((b.harga ?? 20) * 0.3 * rusak) / 100));
}

/** Keadaan kota yang dikirim ke server agar guru dapat melihatnya. */
export interface SnapshotKota {
  bangunan: BangunanKota[];
  perbaikan: string[];
  koin: number;
}

/** Peluang tiap hasil (jumlah = 100). Ditampilkan di layar. */
export const PELUANG_GACHA = [
  { hasil: '10 koin', persen: 35 },
  { hasil: '25 koin', persen: 20 },
  { hasil: '60 koin', persen: 5 },
  { hasil: 'Kartu warga biasa', persen: 30 },
  { hasil: 'Kartu warga langka', persen: 10 },
] as const;

export interface HasilGacha {
  ok: boolean;
  pesan: string;
  ikon?: string;
  langka?: boolean;
}

/** Hasil sebuah aksi: misi yang baru selesai beserta koinnya. */
export interface HadiahBaru {
  misi: Misi[];
  koin: number;
}

export class Progres {
  private k: Keadaan;
  private readonly pendengar = new Set<(h: HadiahBaru) => void>();
  private readonly pendengarKota = new Set<(s: SnapshotKota) => void>();

  constructor(private readonly kunci: string) {
    this.k = kosong();
    try {
      const raw = localStorage.getItem(kunci);
      if (raw) this.k = { ...kosong(), ...(JSON.parse(raw) as Partial<Keadaan>) };
      for (const b of this.k.bangunanKota) b.dirawat ??= Date.now();
    } catch {
      // Penyimpanan diblokir atau rusak: mulai dari kosong.
    }
  }

  get koin(): number {
    return this.k.koin;
  }

  punya(id: IdBarang): boolean {
    return this.k.punya.includes(id);
  }

  sudah(id: string): boolean {
    return this.k.selesai.includes(id);
  }

  /** Dipanggil saat ada hadiah baru, misalnya untuk menampilkan pemberitahuan. */
  dengar(fn: (h: HadiahBaru) => void): () => void {
    this.pendengar.add(fn);
    return () => this.pendengar.delete(fn);
  }

  private simpan(): void {
    const json = JSON.stringify(this.k);
    try {
      localStorage.setItem(this.kunci, json);
    } catch {
      // Diblokir: progres tetap ada selama halaman terbuka.
    }
    for (const fn of this.pendengarSimpan) fn(json);
  }

  private readonly pendengarSimpan = new Set<(json: string) => void>();

  /** Dipanggil setiap progres disimpan, misalnya untuk mengirimnya ke server. */
  dengarSimpan(fn: (json: string) => void): () => void {
    this.pendengarSimpan.add(fn);
    return () => this.pendengarSimpan.delete(fn);
  }

  /** Muat progres dari server (login di perangkat lain). Data rusak diabaikan. */
  impor(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<Keadaan>;
      this.k = { ...kosong(), ...data };
      localStorage.setItem(this.kunci, JSON.stringify(this.k));
    } catch {
      // Tetap memakai progres lokal.
    }
  }

  /** Tandai misi selesai (sekali saja) dan beri koinnya. */
  selesaikan(...ids: string[]): HadiahBaru {
    const baru = MISI.filter((m) => ids.includes(m.id) && !this.sudah(m.id));
    if (baru.length === 0) return { misi: [], koin: 0 };
    const koin = baru.reduce((n, m) => n + m.koin, 0);
    this.k.selesai.push(...baru.map((m) => m.id));
    this.k.koin += koin;
    this.simpan();
    const hadiah = { misi: baru, koin };
    for (const fn of this.pendengar) fn(hadiah);
    return hadiah;
  }

  /** Level selesai. Hadiah TIDAK bergantung pada skor. */
  levelSelesai(level: number, totalLevel: number, punyaTarget: boolean): HadiahBaru {
    if (!this.k.levelSelesai.includes(level)) this.k.levelSelesai.push(level);
    if (punyaTarget && !this.k.levelBertarget.includes(level)) this.k.levelBertarget.push(level);
    this.simpan();
    const ids: string[] = [];
    if (level === 1) ids.push('level-1');
    if (this.k.levelSelesai.length >= totalLevel) ids.push('semua-level');
    if (this.k.levelBertarget.length >= totalLevel) ids.push('punya-rencana');
    return this.selesaikan(...ids);
  }

  get perpustakaanTerbuka(): boolean {
    return this.k.perpustakaanTerbuka;
  }

  /**
   * SATU-SATUNYA syarat yang membaca skor: skor rubrik satu level (bukan penilaian
   * diri) minimal SKOR_BUKA_PERPUSTAKAAN membuka misi perpustakaan. Penilaian diri
   * sudah diisi sebelum skor muncul, jadi tidak bisa dipengaruhi syarat ini.
   * Mengembalikan true bila misi baru saja terbuka.
   */
  catatSkorLevel(rawSum: number): boolean {
    if (this.k.perpustakaanTerbuka || rawSum < SKOR_BUKA_PERPUSTAKAAN) return false;
    this.k.perpustakaanTerbuka = true;
    this.simpan();
    return true;
  }

  /** Bangunan yang sudah dibeli dan ditaruh di wilayah gabungan. */
  /** Catat perbaikan kota dari tanggapan protes yang tepat. Hanya tampilan. */
  perbaikiKota(id: string): void {
    if (this.k.perbaikanKota.includes(id)) return;
    this.k.perbaikanKota.push(id);
    this.simpan();
    this.beritahuKota();
  }

  /** Keadaan kota saat ini (bangunan koin dan perbaikan), untuk dikirim ke guru. */
  snapshotKota(): SnapshotKota {
    return { bangunan: [...this.k.bangunanKota], perbaikan: [...this.k.perbaikanKota], koin: this.k.koin };
  }

  /** Dipanggil setiap kali kota berubah karena pembelian atau perbaikan. */
  dengarKota(fn: (s: SnapshotKota) => void): () => void {
    this.pendengarKota.add(fn);
    return () => this.pendengarKota.delete(fn);
  }

  private beritahuKota(): void {
    const s = this.snapshotKota();
    for (const fn of this.pendengarKota) fn(s);
  }

  perbaikanKota(): string[] {
    return [...this.k.perbaikanKota];
  }

  /**
   * Kas kota: koin bertambah seiring waktu dari bangunan produktif (toko,
   * pabrik ramah lingkungan, energi bersih) plus bonus bila warga puas.
   * Hanya ekonomi permainan; tidak memengaruhi skor.
   */
  pendapatanPerMenit(wargaPuas: boolean): number {
    let n = PENDAPATAN_DASAR + (wargaPuas ? (this.punyaKartu('dr-andi') ? 4 : 2) : 0);
    if (this.punyaKartu('bu-sari')) n += 1;
    if (this.punyaKartu('pak-darto')) n += 1;
    // Fasilitas yang rusak tidak menghasilkan apa-apa sampai dirawat.
    for (const b of this.k.bangunanKota) if (this.kondisi(b) >= BATAS_RUSAK) n += PENDAPATAN_BANGUNAN[b.jenis] ?? 0;
    return n;
  }

  /** Kartu warga dimiliki? Kartu memberi manfaat kecil pada ekonomi kota. */
  punyaKartu(id: string): boolean {
    return this.k.koleksi.includes(id);
  }

  /** Kondisi bangunan dengan memperhitungkan manfaat kartu (Nina, Mbak Lusi). */
  kondisi(b: BangunanKota, sekarang = Date.now()): number {
    if (this.punyaKartu('mbak-lusi') && (b.jenis === 'surya' || b.jenis === 'turbin')) return 100;
    const lambat = this.punyaKartu('nina') && (b.jenis === 'pohon' || b.jenis === 'taman-kota');
    return kondisiBangunan(b, sekarang, lambat ? 0.5 : 1);
  }

  /** Biaya merawat satu bangunan, dengan potongan kartu Bu Laras. */
  biayaRawat(b: BangunanKota, sekarang = Date.now()): number {
    const rusak = 100 - this.kondisi(b, sekarang);
    if (rusak <= 0) return 0;
    const potongan = this.punyaKartu('bu-laras') ? 0.7 : 1;
    return Math.max(1, Math.ceil(((b.harga ?? 20) * 0.3 * rusak * potongan) / 100));
  }

  /** Batas tampung kas kota (menit); kartu Dimas menambahnya. */
  get batasKasMenit(): number {
    return this.punyaKartu('dimas') ? 90 : BATAS_KAS_MENIT;
  }

  /** Koin yang sudah terkumpul di kas dan siap diambil. */
  kasTersedia(perMenit: number, sekarang = Date.now()): number {
    if (this.k.kasTerakhir === 0) {
      this.k.kasTerakhir = sekarang;
      this.simpan();
      return 0;
    }
    const menit = Math.min(this.batasKasMenit, (sekarang - this.k.kasTerakhir) / 60000);
    return Math.floor(menit * perMenit);
  }

  ambilKas(perMenit: number, sekarang = Date.now()): number {
    const koin = this.kasTersedia(perMenit, sekarang);
    if (koin <= 0) return 0;
    this.k.koin += koin;
    this.k.kasTerakhir = sekarang;
    this.simpan();
    return koin;
  }

  /** Total biaya merawat semua sarana-prasarana kembali ke 100%. */
  biayaRawatSemua(sekarang = Date.now()): number {
    return this.k.bangunanKota.reduce((n, b) => n + this.biayaRawat(b, sekarang), 0);
  }

  /** Rawat (perbarui) semua sarana-prasarana dengan koin. */
  rawatSemua(sekarang = Date.now()): { ok: boolean; pesan: string } {
    const biaya = this.biayaRawatSemua(sekarang);
    if (biaya <= 0) return { ok: false, pesan: 'Semua fasilitas masih dalam kondisi baik.' };
    if (this.k.koin < biaya) return { ok: false, pesan: `Koin kurang: perawatan butuh ${biaya} 🪙.` };
    this.k.koin -= biaya;
    for (const b of this.k.bangunanKota) b.dirawat = sekarang;
    this.simpan();
    this.beritahuKota();
    return { ok: true, pesan: `🔧 Semua fasilitas dirawat (${biaya} 🪙). Kondisinya kembali 100%.` };
  }

  bangunanKota(): BangunanKota[] {
    return [...this.k.bangunanKota];
  }

  /**
   * Beli bangunan dengan koin dan taruh di satu petak wilayah gabungan.
   * Hanya tampilan; tidak menyentuh skor maupun data penelitian.
   */
  bangunDiKota(seed: number, jenis: string, harga: number, nama: string): { ok: boolean; pesan: string } {
    if (this.k.bangunanKota.some((b) => b.seed === seed)) return { ok: false, pesan: 'Petak ini sudah terisi.' };
    if (this.k.koin < harga) return { ok: false, pesan: `Koin kurang: ${nama} seharga ${harga} 🪙.` };
    this.k.koin -= harga;
    this.k.bangunanKota.push({ seed, jenis, harga, dirawat: Date.now() });
    this.simpan();
    this.beritahuKota();
    return { ok: true, pesan: `${nama} dibangun.` };
  }

  /** Daftar misi dibuka; membuka tiga kali menemukan misi tersembunyi. */
  bukaDaftarMisi(): HadiahBaru {
    this.k.bukaMisi++;
    this.simpan();
    return this.k.bukaMisi >= 3 ? this.selesaikan('penjelajah-misi') : { misi: [], koin: 0 };
  }

  get tiketGacha(): number {
    return this.k.tiketGacha;
  }

  koleksi(): string[] {
    return [...this.k.koleksi];
  }

  /**
   * Satu tiket untuk setiap kegiatan AaL yang DIIKUTI (penilaian diri,
   * tanggapan protes, refleksi akhir). Isi jawaban tidak dibaca sama sekali,
   * jadi tidak ada alasan menilai diri lebih tinggi atau lebih rendah.
   */
  beriTiket(): void {
    this.k.tiketGacha++;
    this.simpan();
  }

  /** Buka satu Kotak Kejutan dengan tiket (bila ada) atau koin. */
  tarikGacha(pakai: 'tiket' | 'koin'): HasilGacha {
    if (pakai === 'tiket') {
      if (this.k.tiketGacha < 1) return { ok: false, pesan: 'Tiketmu habis. Ikuti kegiatan refleksi untuk mendapat tiket.' };
      this.k.tiketGacha--;
    } else {
      if (this.k.koin < HARGA_GACHA_KOIN) return { ok: false, pesan: `Koin kurang: perlu ${HARGA_GACHA_KOIN} 🪙.` };
      this.k.koin -= HARGA_GACHA_KOIN;
    }
    const r = Math.random() * 100;
    let hasil: HasilGacha;
    if (r < 60) {
      const koin = r < 35 ? 10 : r < 55 ? 25 : 60;
      this.k.koin += koin;
      hasil = { ok: true, pesan: `Kamu mendapat ${koin} koin!`, ikon: '🪙', langka: koin === 60 };
    } else {
      const langka = r >= 90;
      const kumpulan = KARTU_WARGA.filter((k) => k.langka === langka);
      const kartu = kumpulan[Math.floor(Math.random() * kumpulan.length)]!;
      if (this.k.koleksi.includes(kartu.id)) {
        this.k.koin += 15;
        hasil = { ok: true, pesan: `Kartu ${kartu.nama} sudah kamu punya, ditukar 15 koin.`, ikon: kartu.ikon, langka };
      } else {
        this.k.koleksi.push(kartu.id);
        if (kartu.id === 'oma-reni') this.k.tiketGacha++;
        hasil = { ok: true, pesan: `Kartu baru${langka ? ' LANGKA' : ''}: ${kartu.nama}! Manfaat: ${kartu.manfaat}.`, ikon: kartu.ikon, langka };
      }
    }
    this.simpan();
    return hasil;
  }

  /** Beli barang dengan koin. Mengembalikan pesan untuk ditampilkan. */
  beli(id: IdBarang): { ok: boolean; pesan: string } {
    const b = BARANG.find((x) => x.id === id);
    if (!b) return { ok: false, pesan: 'Barang tidak ditemukan.' };
    if (this.punya(id)) return { ok: false, pesan: `${b.nama} sudah kamu miliki.` };
    if (this.k.koin < b.harga) return { ok: false, pesan: `Koin kurang: ${b.nama} seharga ${b.harga}.` };
    this.k.koin -= b.harga;
    this.k.punya.push(id);
    this.simpan();
    return { ok: true, pesan: `${b.ikon} ${b.nama} dibeli.` };
  }

  /** Potongan biaya Kota Bebas dari perlengkapan yang dimiliki (0-1). */
  potongan(jenisBangunan: string): number {
    if (jenisBangunan === 'taman' && this.punya('subsidi-hijau')) return 0.2;
    if (jenisBangunan === 'surya' && this.punya('panel-efisien')) return 0.2;
    return 0;
  }

  hiasan(): Barang[] {
    return BARANG.filter((b) => b.jenis === 'hiasan' && this.punya(b.id));
  }
}

/** Progres per sesi siswa. Sesi baru = progres baru. */
let aktif: Progres | null = null;

export function progresUntuk(sessionId: string): Progres {
  if (!aktif || (aktif as unknown as { kunci: string }).kunci !== `ecomath_progres_${sessionId}`) {
    aktif = new Progres(`ecomath_progres_${sessionId}`);
  }
  return aktif;
}

export function progresAktif(): Progres | null {
  return aktif;
}
