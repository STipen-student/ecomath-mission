/**
 * Penskoran Misi Kota Hijau: rubrik KH1-KH4 (Polya), masing-masing 0-3.
 * TERPISAH dari K1-K4: tidak dijumlahkan ke skor level, komposit sesi, atau
 * pemilihan soal adaptif. Rubrik lengkap: docs/RUBRIK_KOTA_HIJAU.md.
 *
 * Seluruh keadaan kota dihitung ulang di server dari daftar tindakan siswa,
 * sehingga skor tidak bergantung pada angka yang dikirim client.
 */

import {
  KOTA_AWAL,
  ringkas,
  terapkanBadai,
  terapkanRencana,
  VERSI_KOTA_HIJAU,
  type KeadaanKota,
  type Rencana,
  type Ringkasan,
} from './model.js';

/** Syarat misi yang benar (KH1) dan pengecohnya. */
export const SYARAT_BENAR = ['indeks', 'emisi', 'rusak', 'anggaran'] as const;
export const SYARAT_PENGECOH = ['jual-bus', 'wajib-surya'] as const;

/** Pilihan refleksi akhir (KH4) dan mutunya 0-3. */
export const REFLEKSI_KH: Record<string, number> = {
  r0: 0,
  r1: 1,
  r2: 2,
  r3: 3,
};

export interface LangkahMisi {
  fase: 1 | 2;
  tipe: 'hitung' | 'jalankan';
  rencana: Rencana;
}

export interface KirimanMisi {
  pemahaman: string[];
  langkah: LangkahMisi[];
  refleksi: { pilihan: string; teks?: string };
}

export interface SkorKotaHijau {
  versi: string;
  KH1: number;
  KH2: number;
  KH3: number;
  KH4: number;
  total: number;
  rincian: {
    syaratBenar: number;
    pengecohDipilih: number;
    hitungSebelumJalankan: boolean;
    rencanaPertama: 'tidak-ada' | 'ditolak' | 'diterima';
    rencanaPertamaTarget: number;
    akhirFase1: Ringkasan;
    setelahBadai: Ringkasan;
    akhirFase2: Ringkasan;
    revisiDiterima: number;
    mutuRefleksi: number;
    ditolak: number;
  };
}

function jalankanFase(awal: KeadaanKota, langkah: LangkahMisi[], fase: 1 | 2): { akhir: KeadaanKota; diterima: number; ditolak: number } {
  let k = awal;
  let diterima = 0;
  let ditolak = 0;
  for (const l of langkah) {
    if (l.fase !== fase || l.tipe !== 'jalankan') continue;
    const hasil = terapkanRencana(k, l.rencana);
    if (hasil) {
      k = hasil;
      diterima++;
    } else {
      ditolak++;
    }
  }
  return { akhir: k, diterima, ditolak };
}

export function skorKotaHijau(m: KirimanMisi): SkorKotaHijau {
  // KH1 Memahami masalah: syarat misi yang dikenali, dikurangi pengecoh.
  const dipilih = new Set(m.pemahaman);
  const syaratBenar = SYARAT_BENAR.filter((s) => dipilih.has(s)).length;
  const pengecohDipilih = SYARAT_PENGECOH.filter((s) => dipilih.has(s)).length;
  const KH1 =
    syaratBenar === 4 && pengecohDipilih === 0 ? 3 : syaratBenar >= 3 && pengecohDipilih <= 1 ? 2 : syaratBenar >= 2 ? 1 : 0;

  // KH2 Menyusun rencana: mutu rencana PERTAMA yang dijalankan, dan apakah
  // siswa menghitung perkiraan dulu sebelum menjalankannya.
  const fase1 = m.langkah.filter((l) => l.fase === 1);
  const iPertama = fase1.findIndex((l) => l.tipe === 'jalankan');
  const hitungSebelumJalankan = iPertama > 0 && fase1.slice(0, iPertama).some((l) => l.tipe === 'hitung');
  let rencanaPertama: SkorKotaHijau['rincian']['rencanaPertama'] = 'tidak-ada';
  let rencanaPertamaTarget = 0;
  if (iPertama >= 0) {
    const hasil = terapkanRencana(KOTA_AWAL, fase1[iPertama]!.rencana);
    rencanaPertama = hasil ? 'diterima' : 'ditolak';
    rencanaPertamaTarget = hasil ? ringkas(hasil).jumlahTarget : 0;
  }
  const KH2 =
    rencanaPertama !== 'diterima'
      ? 0
      : hitungSebelumJalankan && rencanaPertamaTarget === 3
        ? 3
        : rencanaPertamaTarget >= 2
          ? 2
          : 1;

  // KH3 Melaksanakan rencana: banyak target tercapai di akhir fase 1, dalam anggaran.
  const f1 = jalankanFase(KOTA_AWAL, m.langkah, 1);
  const akhirFase1 = ringkas(f1.akhir);
  const KH3 = akhirFase1.jumlahTarget;

  // KH4 Memeriksa kembali: revisi setelah badai dan mutu refleksi.
  const badai = terapkanBadai(f1.akhir);
  const setelahBadai = ringkas(badai);
  const f2 = jalankanFase(badai, m.langkah, 2);
  const akhirFase2 = ringkas(f2.akhir);
  const mutuRefleksi = REFLEKSI_KH[m.refleksi.pilihan] ?? 0;
  const pulih = akhirFase2.jumlahTarget === 3;
  const membaik = akhirFase2.jumlahTarget > setelahBadai.jumlahTarget || akhirFase2.indeks > setelahBadai.indeks;
  const KH4 = pulih && mutuRefleksi >= 2 ? 3 : pulih || (membaik && mutuRefleksi >= 2) ? 2 : f2.diterima > 0 || mutuRefleksi >= 1 ? 1 : 0;

  return {
    versi: VERSI_KOTA_HIJAU,
    KH1,
    KH2,
    KH3,
    KH4,
    total: KH1 + KH2 + KH3 + KH4,
    rincian: {
      syaratBenar,
      pengecohDipilih,
      hitungSebelumJalankan,
      rencanaPertama,
      rencanaPertamaTarget,
      akhirFase1,
      setelahBadai,
      akhirFase2,
      revisiDiterima: f2.diterima,
      mutuRefleksi,
      ditolak: f1.ditolak + f2.ditolak,
    },
  };
}
