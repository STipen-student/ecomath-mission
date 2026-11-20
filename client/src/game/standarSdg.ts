/**
 * Pemeriksaan sederhana bangunan kota terhadap semangat SDG 11 dan SDG 13,
 * dipakai untuk protes warga di peta. Hanya tampilan: tidak menilai siswa,
 * tidak mencatat event, dan tidak memengaruhi skor.
 *
 * Aturan:
 *   - SDG 13 (penanganan perubahan iklim): bangunan yang mengeluarkan emisi
 *     (bus konvensional, mesin fosil, pabrik biasa) diprotes.
 *   - SDG 11 (kota berkelanjutan): bila ada hunian tetapi ruang hijau kurang
 *     dari seperlima seluruh bangunan, warga menuntut ruang hijau.
 */

/** Jenis bangunan dinormalkan dari kode petak ('s:pohon' -> 'pohon'). */
export function jenisDariKode(kode: string): string {
  return kode.startsWith('s:') || kode.startsWith('v:') ? kode.slice(2) : kode;
}

export const JENIS_BERASAP: ReadonlySet<string> = new Set(['bus-konvensional', 'mesin-fosil', 'pabrik']);
export const JENIS_HIJAU: ReadonlySet<string> = new Set([
  'pohon', 'taman-kota', 'taman', 'hijau-multifungsi', 'nature', 'sepeda', 'trotoar',
]);
export const JENIS_HUNIAN: ReadonlySet<string> = new Set([
  'rumah', 'rumah-a', 'rumah-b', 'perumahan-padat', 'hunian-rendah-karbon', 'gedung', 'housing',
]);

const NAMA: Record<string, string> = {
  'bus-konvensional': 'bus konvensional',
  'mesin-fosil': 'mesin fosil',
  pabrik: 'pabrik berasap',
};

export interface Pelanggaran {
  sdg: 11 | 13;
  /** Jenis bangunan yang diprotes. */
  jenis: string;
  alasan: string;
}

export function periksaStandar(jenisDaftar: string[]): Pelanggaran[] {
  const hasil: Pelanggaran[] = [];
  const ada = new Set(jenisDaftar);
  for (const j of JENIS_BERASAP) {
    if (ada.has(j)) {
      hasil.push({ sdg: 13, jenis: j, alasan: `${NAMA[j] ?? j} menghasilkan emisi dan polusi udara` });
    }
  }
  const hunian = jenisDaftar.filter((j) => JENIS_HUNIAN.has(j)).length;
  const hijau = jenisDaftar.filter((j) => JENIS_HIJAU.has(j)).length;
  if (hunian > 0 && hijau / Math.max(1, jenisDaftar.length) < 0.2) {
    hasil.push({ sdg: 11, jenis: 'hunian', alasan: 'permukiman tidak diimbangi ruang hijau yang cukup' });
  }
  return hasil;
}

/** Seruan protes warga per SDG. */
export const SERUAN: Record<11 | 13, string[]> = {
  13: ['Kotanya makin panas!', 'Asapnya bikin sesak napas!', 'Udaranya kotor, anak-anak batuk!', 'Langit jadi abu-abu!', 'Ganti ke energi bersih!'],
  11: ['Panas, tidak ada pohon!', 'Anak-anak main di mana?', 'Kota untuk warga, bukan beton!', 'Kami butuh taman!', 'Tidak ada tempat berteduh!'],
};
