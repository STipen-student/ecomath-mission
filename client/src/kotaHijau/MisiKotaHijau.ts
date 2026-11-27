/**
 * Layar Misi Kota Hijau: tugas kinerja KPMM kedua (rubrik KH1-KH4), setelah
 * Level 4. Semua siswa mendapat distrik, anggaran, dan target yang sama.
 *
 * Alur: cerita -> memahami syarat (KH1) -> rencana fase 1 dengan perkiraan
 * (KH2, KH3) -> badai dan revisi (KH4) -> refleksi -> penilaian diri ->
 * kirim. Langkah siswa disimpan lokal lalu dikirim sekali; server menghitung
 * ulang skor dari tindakan itu (server/src/kotaHijau/skor.ts).
 */

import { api } from '../api/client.js';
import { ringkasPergi } from '../ui/layarPenuh.js';
import { el } from '../ui/dom.js';
import { mountCity, type CityHandle } from '../game/mountCity.js';
import { GRID, plotTiles } from '../game/iso/isoGrid.js';
import {
  AKSI,
  BADAI,
  KOTA_AWAL,
  TARGET,
  biayaRencana,
  ringkas,
  salin,
  terapkanBadai,
  terapkanRencana,
  type IdAksi,
  type KeadaanKota,
  type Rencana,
  type Ringkasan,
} from './model.js';

const SYARAT = [
  { id: 'indeks', teks: `Indeks hijau minimal ${TARGET.indeksMin}%` },
  { id: 'jual-bus', teks: 'Semua bus harus dijual' },
  { id: 'emisi', teks: 'Tidak ada lagi sumber emisi (bus konvensional dan mesin fosil)' },
  { id: 'wajib-surya', teks: 'Harus membangun panel surya baru' },
  { id: 'rusak', teks: 'Tidak ada taman atau pohon yang rusak' },
  { id: 'anggaran', teks: `Biaya tidak melebihi anggaran ${KOTA_AWAL.dana} koin` },
];

const REFLEKSI = [
  { id: 'r0', teks: 'Tidak tahu / saya mencoba-coba' },
  { id: 'r1', teks: 'Karena saya membangun sebanyak mungkin bangunan baru' },
  { id: 'r2', teks: 'Karena saya memeriksa indeks, emisi, dan fasilitas rusak sebelum melapor' },
  {
    id: 'r3',
    teks: 'Karena merawat fasilitas yang rusak lebih murah daripada membangun baru, sehingga sisa anggaran cukup untuk menghapus semua sumber emisi',
  },
];

const KRITERIA_KH = [
  { id: 'KH1', nama: 'Memahami masalah', kriteria: 'Aku mengenali semua syarat misi dan tidak terkecoh.' },
  { id: 'KH2', nama: 'Menyusun rencana', kriteria: 'Aku menghitung perkiraan dulu, dan rencana pertamaku memenuhi semua target dalam anggaran.' },
  { id: 'KH3', nama: 'Melaksanakan rencana', kriteria: 'Saat melapor ke Dewan, ketiga target tercapai dalam anggaran.' },
  { id: 'KH4', nama: 'Memeriksa kembali', kriteria: 'Setelah badai aku merevisi sampai target pulih dan bisa menjelaskan alasannya.' },
] as const;

type Langkah = { fase: 1 | 2; tipe: 'hitung' | 'jalankan'; rencana: Rencana };

export interface OpsiMisi {
  sessionId: string;
  studentName: string;
  /** Dipanggil setelah hasil ditampilkan dan siswa menekan Lanjut. */
  selesai: () => void;
}

/** Ubah keadaan kota menjadi petak peta (dekat pusat) dan daftar petak rusak. */
function petakDari(k: KeadaanKota): { petak: Map<number, string>; rusak: Set<number> } {
  const tengah = (GRID - 1) / 2;
  const urut = plotTiles().sort((a, b) => Math.hypot(a.col - tengah, a.row - tengah) - Math.hypot(b.col - tengah, b.row - tengah));
  const petak = new Map<number, string>();
  const rusak = new Set<number>();
  let i = 0;
  const taruh = (kode: string, n: number, rusakJuga = false): void => {
    for (let j = 0; j < n && i < urut.length; j++) {
      const seed = urut[i++]!.seed;
      petak.set(seed, kode);
      if (rusakJuga) rusak.add(seed);
    }
  };
  taruh('s:rumah-a', k.rumah);
  taruh('s:bus-konvensional', k.busKonvensional);
  taruh('s:bus-listrik', k.busListrik);
  taruh('s:mesin-fosil', k.mesinFosil);
  taruh('s:surya', k.surya);
  taruh('s:pohon', k.pohon);
  taruh('s:pohon', k.pohonRusak, true);
  taruh('s:taman-kota', k.taman);
  taruh('s:taman-kota', k.tamanRusak, true);
  return { petak, rusak };
}

function tabelKeadaan(r: Ringkasan): HTMLElement {
  const tanda = (ok: boolean): string => (ok ? '✓' : '✕');
  return el(
    'div',
    { class: 'kh-status' },
    el('span', { class: r.targetIndeks ? 'ok' : 'bad' }, `${tanda(r.targetIndeks)} Indeks hijau ${r.indeks}% (target ≥ ${TARGET.indeksMin}%)`),
    el('span', { class: r.targetEmisi ? 'ok' : 'bad' }, `${tanda(r.targetEmisi)} Sumber emisi: ${r.emisi}`),
    el('span', { class: r.targetRusak ? 'ok' : 'bad' }, `${tanda(r.targetRusak)} Fasilitas rusak: ${r.rusak}`),
    el('span', {}, `💰 Sisa anggaran: ${r.dana} koin`),
  );
}

export function mountMisiKotaHijau(root: HTMLElement, opsi: OpsiMisi): void {
  // Untuk ringkasan integritas: berapa kali dan berapa lama siswa meninggalkan misi.
  const mulaiMisi = Date.now();
  const pemahaman = new Set<string>();
  const langkah: Langkah[] = [];
  let keadaan = salin(KOTA_AWAL);
  let fase: 1 | 2 = 1;
  let kota: CityHandle | null = null;
  let refleksi: { pilihan: string; teks: string } = { pilihan: '', teks: '' };

  const layar = (...isi: Array<HTMLElement | null>): HTMLElement => {
    kota?.destroy();
    kota = null;
    const kartu = el('div', { class: 'plate card kh-kartu' }, ...isi.filter((x): x is HTMLElement => x !== null));
    root.replaceChildren(el('div', { class: 'screen-center kh-layar' }, kartu));
    return kartu;
  };

  const gambarPeta = (wadah: HTMLElement, k: KeadaanKota): void => {
    kota?.destroy();
    kota = mountCity(wadah);
    const { petak, rusak } = petakDari(k);
    kota.tampilkanKota(petak, ringkas(k).jumlahTarget === 3, rusak);
    kota.hidupkan(10);
  };

  // 1. Cerita dan data misi
  const tampilkanCerita = (): void => {
    const tabelAksi = el(
      'table',
      { class: 'data-table' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Tindakan'), el('th', {}, 'Biaya'))),
      el('tbody', {}, ...AKSI.filter((a) => a.id !== 'rawat-pohon').map((a) => el('tr', {}, el('td', {}, a.label), el('td', {}, `${a.biaya} koin`)))),
    );
    const mulai = el('button', { class: 'btn btn-primary btn-block' }, '▶ TERIMA MISI');
    mulai.addEventListener('click', tampilkanPemahaman);
    layar(
      el('div', { class: 'alert-ticker' }, el('span', { class: 'alert-tag' }, 'MISI KHUSUS'), 'DISTRIK PERCONTOHAN'),
      el('h2', {}, '🌳 Misi Kota Hijau'),
      el(
        'p',
        { class: 'prose' },
        `${opsi.studentName}, Dewan Wilayah memberimu satu distrik percontohan. Udaranya kotor, tamannya rusak, dan ruang hijaunya sedikit. Dewan memberi anggaran ${KOTA_AWAL.dana} koin. Hasilmu akan dinilai terpisah dari keempat level sebelumnya.`,
      ),
      el(
        'p',
        { class: 'prose' },
        `Keadaan awal: ${KOTA_AWAL.rumah} rumah, ${KOTA_AWAL.busKonvensional} bus konvensional, ${KOTA_AWAL.mesinFosil} mesin fosil, ${KOTA_AWAL.pohon} pohon, dan ${KOTA_AWAL.tamanRusak} taman yang rusak. Indeks hijau saat ini ${ringkas(KOTA_AWAL).indeks}%.`,
      ),
      el(
        'p',
        { class: 'hint' },
        'Cara menghitung indeks hijau: hijau ÷ (hijau + lainnya + emisi). Pohon dan taman terawat bernilai 2, bus listrik dan panel surya bernilai 1 (hijau). Rumah dan fasilitas rusak masuk "lainnya" (1), bus konvensional dan mesin fosil masuk "emisi" (1).',
      ),
      tabelAksi,
      mulai,
    );
  };

  // 2. Memahami masalah (KH1)
  const tampilkanPemahaman = (): void => {
    const pilihan = SYARAT.map((s) => {
      const c = el('input', { type: 'checkbox' });
      c.checked = pemahaman.has(s.id);
      c.addEventListener('change', () => (c.checked ? pemahaman.add(s.id) : pemahaman.delete(s.id)));
      return el('label', { class: 'choice' }, c, el('span', {}, s.teks));
    });
    const pesan = el('p', { class: 'form-error' });
    const lanjut = el('button', { class: 'btn btn-primary btn-block' }, 'LANJUT KE RENCANA');
    lanjut.addEventListener('click', () => {
      if (pemahaman.size === 0) {
        pesan.textContent = 'Pilih minimal satu syarat.';
        return;
      }
      tampilkanRencana();
    });
    layar(
      el('h3', {}, '1 · Pahami misinya'),
      el('p', { class: 'prose' }, 'Syarat mana saja yang harus dipenuhi agar Dewan menerima laporanmu? Pilih semua yang benar.'),
      ...pilihan,
      pesan,
      lanjut,
    );
  };

  // 3 & 4. Rencana (fase 1) dan revisi setelah badai (fase 2)
  const tampilkanRencana = (): void => {
    const masukan = new Map<IdAksi, HTMLInputElement>();
    const barisAksi = AKSI.map((a) => {
      const maks = a.maks(keadaan);
      const input = el('input', { type: 'number', min: '0', max: String(maks), step: '1', value: '0', class: 'uji-hp-input', ariaLabel: a.label });
      input.disabled = maks === 0;
      masukan.set(a.id, input);
      return el('tr', {}, el('td', {}, a.label), el('td', {}, `${a.biaya}`), el('td', {}, maks === 0 ? '—' : `≤ ${maks}`), el('td', {}, input));
    });
    const bacaRencana = (): Rencana => {
      const r: Rencana = {};
      for (const [id, input] of masukan) {
        const n = Math.floor(Number(input.value) || 0);
        if (n > 0) r[id] = n;
      }
      return r;
    };
    const perkiraan = el('div', { class: 'kh-perkiraan' });
    const pesan = el('p', { class: 'hint' });
    const wadahPeta = el('div', { class: 'kh-peta' });
    const statusKini = el('div', {});
    const perbaruiStatus = (): void => {
      statusKini.replaceChildren(el('strong', {}, 'Keadaan distrik sekarang'), tabelKeadaan(ringkas(keadaan)));
      gambarPeta(wadahPeta, keadaan);
    };

    const hitung = el('button', { class: 'btn btn-small' }, '🧮 Hitung perkiraan');
    hitung.addEventListener('click', () => {
      const r = bacaRencana();
      langkah.push({ fase, tipe: 'hitung', rencana: r });
      const biaya = biayaRencana(r);
      const hasil = terapkanRencana(keadaan, r);
      perkiraan.replaceChildren(
        el('strong', {}, `Perkiraan: biaya ${biaya} koin dari sisa ${keadaan.dana} koin`),
        hasil ? tabelKeadaan(ringkas(hasil)) : el('p', { class: 'peta-wilayah-status bad' }, 'Rencana ini tidak bisa dijalankan: biayanya melebihi anggaran atau jumlahnya melebihi batas.'),
      );
    });

    const jalankan = el('button', { class: 'btn btn-small btn-primary' }, '▶ Jalankan rencana');
    jalankan.addEventListener('click', () => {
      const r = bacaRencana();
      if (Object.keys(r).length === 0) {
        pesan.textContent = 'Isi dulu banyaknya tindakan.';
        return;
      }
      langkah.push({ fase, tipe: 'jalankan', rencana: r });
      const hasil = terapkanRencana(keadaan, r);
      if (!hasil) {
        pesan.className = 'peta-wilayah-status bad';
        pesan.textContent = `✕ Dewan menolak: biaya ${biayaRencana(r)} koin melebihi sisa anggaran ${keadaan.dana} koin, atau jumlahnya melebihi batas.`;
        return;
      }
      keadaan = hasil;
      pesan.className = 'peta-wilayah-status ok';
      pesan.textContent = '✓ Rencana dijalankan.';
      tampilkanRencana();
    });

    const lapor = el('button', { class: 'btn btn-primary btn-block' }, fase === 1 ? '📋 LAPORKAN KE DEWAN' : '📋 SELESAI REVISI');
    lapor.addEventListener('click', () => {
      if (!window.confirm(fase === 1 ? 'Laporkan keadaan distrik sekarang ke Dewan? Setelah ini kamu tidak bisa mengubah fase 1.' : 'Selesaikan revisi dan lanjut ke refleksi?')) return;
      if (fase === 1) {
        fase = 2;
        keadaan = terapkanBadai(keadaan);
        tampilkanBadai();
      } else {
        tampilkanRefleksi();
      }
    });

    layar(
      el('h3', {}, fase === 1 ? '2 · Susun dan jalankan rencanamu' : '4 · Revisi setelah badai'),
      el(
        'p',
        { class: 'prose' },
        fase === 1
          ? 'Isi banyaknya tiap tindakan. Tekan "Hitung perkiraan" untuk melihat hasilnya tanpa membelanjakan anggaran, lalu "Jalankan rencana". Kamu boleh menjalankan beberapa rencana sebelum melapor.'
          : 'Perbaiki distrikmu dengan sisa anggaran supaya ketiga target kembali tercapai.',
      ),
      wadahPeta,
      statusKini,
      el(
        'table',
        { class: 'data-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Tindakan'), el('th', {}, 'Biaya'), el('th', {}, 'Batas'), el('th', {}, 'Banyak'))),
        el('tbody', {}, ...barisAksi),
      ),
      el('div', { class: 'uji-hp-baris' }, hitung, jalankan),
      perkiraan,
      pesan,
      lapor,
    );
    perbaruiStatus();
  };

  const tampilkanBadai = (): void => {
    const lanjut = el('button', { class: 'btn btn-primary btn-block' }, '▶ MULAI REVISI');
    lanjut.addEventListener('click', tampilkanRencana);
    const wadahPeta = el('div', { class: 'kh-peta' });
    layar(
      el('div', { class: 'alert-ticker' }, el('span', { class: 'alert-tag' }, 'KABAR DEWAN'), 'BADAI MELANDA DISTRIK'),
      el('h3', {}, '3 · Badai!'),
      el(
        'p',
        { class: 'prose' },
        `Badai semalam merusak ${BADAI.pohonRusak} pohon. Dewan menambah anggaran ${BADAI.tambahanDana} koin untuk perbaikan. Periksa kembali apakah targetmu masih tercapai.`,
      ),
      wadahPeta,
      tabelKeadaan(ringkas(keadaan)),
      lanjut,
    );
    gambarPeta(wadahPeta, keadaan);
  };

  // 5. Refleksi (KH4)
  const tampilkanRefleksi = (): void => {
    const pilihan = REFLEKSI.map((r) => {
      const radio = el('input', { type: 'radio', name: 'kh-refleksi' });
      radio.checked = refleksi.pilihan === r.id;
      radio.addEventListener('change', () => {
        if (radio.checked) refleksi.pilihan = r.id;
      });
      return el('label', { class: 'choice' }, radio, el('span', {}, r.teks));
    });
    const teks = el('textarea', { class: 'field', rows: '3', ariaLabel: 'Penjelasan refleksi', placeholder: 'Jelaskan dengan kalimatmu sendiri.' });
    teks.value = refleksi.teks;
    const pesan = el('p', { class: 'form-error' });
    const lanjut = el('button', { class: 'btn btn-primary btn-block' }, 'LANJUT: NILAI DIRIKU');
    lanjut.addEventListener('click', () => {
      refleksi.teks = teks.value.trim();
      if (!refleksi.pilihan) {
        pesan.textContent = 'Pilih satu jawaban.';
        return;
      }
      tampilkanPenilaianDiri();
    });
    layar(
      el('h3', {}, '5 · Refleksi'),
      el('p', { class: 'prose' }, 'Mengapa rencanamu berhasil (atau belum berhasil) memenuhi target?'),
      ...pilihan,
      teks,
      pesan,
      lanjut,
    );
  };

  // 6. Penilaian diri (AaL; tidak memengaruhi skor), lalu kirim
  const tampilkanPenilaianDiri = (): void => {
    const nilai: Record<string, number | null> = { KH1: null, KH2: null, KH3: null, KH4: null };
    const grup = KRITERIA_KH.map((k) =>
      el(
        'div',
        { class: 'kh-diri' },
        el('strong', {}, `${k.id} · ${k.nama}`),
        el('small', { class: 'hint' }, `Skor 3 bila: ${k.kriteria}`),
        el(
          'div',
          { class: 'uji-hp-baris' },
          ...[0, 1, 2, 3].map((n) => {
            const radio = el('input', { type: 'radio', name: `kh-diri-${k.id}` });
            radio.addEventListener('change', () => {
              if (radio.checked) nilai[k.id] = n;
            });
            return el('label', { class: 'choice' }, radio, el('span', {}, String(n)));
          }),
        ),
      ),
    );
    const pesan = el('p', { class: 'form-error' });
    const kirim = el('button', { class: 'btn btn-primary btn-block' }, 'KIRIM DAN LIHAT HASIL');
    kirim.addEventListener('click', async () => {
      if (Object.values(nilai).some((v) => v === null)) {
        pesan.textContent = 'Nilai keempat aspek dulu.';
        return;
      }
      kirim.disabled = true;
      kirim.textContent = 'MENGIRIM...';
      try {
        const hasil = await api.kirimKotaHijau({
          sessionId: opsi.sessionId,
          pemahaman: [...pemahaman],
          langkah,
          refleksi,
          penilaianDiri: nilai as { KH1: number; KH2: number; KH3: number; KH4: number },
          integritas: ringkasPergi(mulaiMisi),
        });
        tampilkanHasil(hasil, nilai as Record<string, number>);
      } catch (err) {
        pesan.textContent = err instanceof Error ? err.message : 'Gagal mengirim. Coba lagi.';
        kirim.disabled = false;
        kirim.textContent = 'KIRIM DAN LIHAT HASIL';
      }
    });
    layar(
      el('h3', {}, '6 · Nilai dirimu dulu'),
      el('p', { class: 'prose' }, 'Sebelum melihat skor dari sistem, beri skor 0–3 untuk tiap aspek. Penilaian dirimu tidak mengubah skor.'),
      ...grup,
      pesan,
      kirim,
    );
  };

  // 7. Hasil
  const tampilkanHasil = (hasil: { KH1: number; KH2: number; KH3: number; KH4: number; total: number }, diri: Record<string, number>): void => {
    const baris = KRITERIA_KH.map((k) => {
      const sistem = hasil[k.id];
      const selisih = diri[k.id]! - sistem;
      const cermin = selisih === 0 ? 'tepat' : selisih > 0 ? 'terlalu tinggi' : 'terlalu rendah';
      return el('tr', {}, el('td', {}, `${k.id} · ${k.nama}`), el('td', {}, String(sistem)), el('td', {}, String(diri[k.id])), el('td', {}, cermin));
    });
    const lanjut = el('button', { class: 'btn btn-primary btn-block' }, '▶ LANJUT');
    lanjut.addEventListener('click', () => {
      kota?.destroy();
      opsi.selesai();
    });
    layar(
      el('h2', {}, `Hasil Misi Kota Hijau · ${hasil.total}/12`),
      el('p', { class: 'hint' }, 'Skor ini dinilai terpisah dari keempat level sebelumnya.'),
      el(
        'table',
        { class: 'data-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Aspek'), el('th', {}, 'Sistem'), el('th', {}, 'Penilaianmu'), el('th', {}, 'Cermin'))),
        el('tbody', {}, ...baris),
      ),
      lanjut,
    );
  };

  tampilkanCerita();
}
