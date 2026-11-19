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
}

const kosong = (): Keadaan => ({
  koin: 0,
  selesai: [],
  punya: [],
  levelSelesai: [],
  levelBertarget: [],
  bukaMisi: 0,
  perpustakaanTerbuka: false,
});

/** Hasil sebuah aksi: misi yang baru selesai beserta koinnya. */
export interface HadiahBaru {
  misi: Misi[];
  koin: number;
}

export class Progres {
  private k: Keadaan;
  private readonly pendengar = new Set<(h: HadiahBaru) => void>();

  constructor(private readonly kunci: string) {
    this.k = kosong();
    try {
      const raw = localStorage.getItem(kunci);
      if (raw) this.k = { ...kosong(), ...(JSON.parse(raw) as Partial<Keadaan>) };
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
    try {
      localStorage.setItem(this.kunci, JSON.stringify(this.k));
    } catch {
      // Diblokir: progres tetap ada selama halaman terbuka.
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

  /** Daftar misi dibuka; membuka tiga kali menemukan misi tersembunyi. */
  bukaDaftarMisi(): HadiahBaru {
    this.k.bukaMisi++;
    this.simpan();
    return this.k.bukaMisi >= 3 ? this.selesaikan('penjelajah-misi') : { misi: [], koin: 0 };
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
