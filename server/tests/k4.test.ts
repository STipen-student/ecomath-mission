/**
 * Uji rubrik K4 - Memeriksa Kembali.
 *
 * Mencakup tiga varian aturan: 'standard' (Level 4 dengan event distraktor),
 * 'reflection_only' (Level 1-3), dan 'distractor_not_fired' (Level 4 saat event
 * tidak sempat muncul).
 *
 * Blok terakhir sengaja menguji BATAS heuristik teks terbuka - termasuk kasus
 * di mana heuristik keliru - supaya keterbatasannya terdokumentasi dalam kode,
 * bukan hanya dalam catatan.
 */

import { describe, expect, it } from 'vitest';
import { getTaskById } from '../src/tasks/index.js';
import { deriveObservables } from '../src/scoring/observables.js';
import { analyzeOpenText, combineReflectionQuality, scoreK4 } from '../src/scoring/k4.js';
import { log } from './fixtures/logBuilder.js';

const l4 = getTaskById('L4-SDG11-A')!;
const l1 = getTaskById('L1-SDG11-A')!;

function k4(task: typeof l4, events: ReturnType<ReturnType<typeof log>['build']>) {
  return scoreK4(task, deriveObservables(task, events));
}

/** Jawaban terbuka lengkap: istilah domain + trade-off + justifikasi + angka. */
const JAWABAN_LENGKAP =
  'Luas RTH harus naik dari 36 ke 48 hektar sehingga perumahan berkurang menjadi 72 hektar, akibatnya daya tampung turun sekitar 480 kepala keluarga karena lahan hunian dikorbankan demi target lingkungan.';

/** Jawaban yang menyebut konteks tetapi tanpa kesadaran trade-off. */
const JAWABAN_DANGKAL = 'Luas RTH kota ditambah supaya lingkungan lebih baik dan sehat bagi warga.';

describe('analyzeOpenText - heuristik jawaban terbuka', () => {
  const terms = l4.reflection.expectedTerms;

  it('memberi 0 untuk jawaban kosong atau terlalu pendek', () => {
    expect(analyzeOpenText(null, terms).score).toBe(0);
    expect(analyzeOpenText('ok', terms).score).toBe(0);
    expect(analyzeOpenText('tidak tahu', terms).score).toBe(0);
  });

  it('memberi 0 untuk jawaban panjang yang tidak menyentuh konteks maupun trade-off', () => {
    expect(analyzeOpenText('Saya menjawab sesuai perintah yang ada pada layar ini.', terms).score).toBe(0);
  });

  it('memberi 1 untuk jawaban yang menyebut konteks tanpa mengenali trade-off', () => {
    const a = analyzeOpenText(JAWABAN_DANGKAL, terms);
    expect(a.score).toBe(1);
    expect(a.mentionsDomainTerm).toBe(true);
    expect(a.hasTradeoffMarker).toBe(false);
  });

  it('memberi 2 untuk trade-off yang dikenali tanpa justifikasi maupun angka', () => {
    const a = analyzeOpenText('RTH bertambah tetapi luas perumahan berkurang.', terms);
    expect(a.score).toBe(2);
    expect(a.hasTradeoffMarker).toBe(true);
    expect(a.hasJustificationMarker).toBe(false);
  });

  it('memberi 3 untuk trade-off disertai justifikasi dan rujukan kuantitatif', () => {
    const a = analyzeOpenText(JAWABAN_LENGKAP, terms);
    expect(a.score).toBe(3);
    expect(a.hasTradeoffMarker).toBe(true);
    expect(a.hasJustificationMarker).toBe(true);
    expect(a.hasQuantitativeReference).toBe(true);
  });
});

describe('combineReflectionQuality - penggabungan jawaban tertutup dan terbuka', () => {
  it('menuntut kedua bentuk jawaban bermutu 3 untuk mencapai 3', () => {
    expect(combineReflectionQuality(3, 3)).toBe(3);
    expect(combineReflectionQuality(3, 2)).toBe(2);
    expect(combineReflectionQuality(2, 3)).toBe(2);
  });

  it('memakai satu-satunya jawaban yang tersedia bila salah satunya kosong', () => {
    expect(combineReflectionQuality(3, null)).toBe(3);
    expect(combineReflectionQuality(null, 2)).toBe(2);
    expect(combineReflectionQuality(null, null)).toBe(0);
  });
});

describe('K4 varian standard (Level 4, event distraktor muncul)', () => {
  function sampaiEvent() {
    return log(l4.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(84, 36)
      .submit(84, 36)
      .distractorShown('ev_rth_40');
  }

  it('memberi 0 bila siswa tidak merevisi apa pun setelah event', () => {
    const events = sampaiEvent().reflection('r3', JAWABAN_LENGKAP).build();

    const r = k4(l4, events);
    expect(r.score).toBe(0);
    expect(r.criterion).toBe('standard');
    expect(r.reasons.join(' ')).toContain('tidak melakukan revisi');
  });

  it('memberi 1 bila ada revisi tetapi solusi baru tetap melanggar kendala baru', () => {
    const events = sampaiEvent()
      .reviseAfterEvent(80, 40, false) // y = 40 masih di bawah standar baru 48
      .submit(80, 40, 'post_event', false)
      .reflection('r3', JAWABAN_LENGKAP)
      .build();

    const r = k4(l4, events);
    expect(r.score).toBe(1);
    expect(r.evidence.postEventValid).toBe(false);
  });

  it('memberi 0 bila revisi berhasil tetapi refleksi tidak dijawab', () => {
    const events = sampaiEvent().reviseAfterEvent(72, 48).submit(72, 48, 'post_event').build();

    const r = k4(l4, events);
    expect(r.score).toBe(0);
    expect(r.evidence.postEventValid).toBe(true);
  });

  it('memberi 0 bila revisi berhasil tetapi siswa memilih opsi refleksi asal', () => {
    const events = sampaiEvent()
      .reviseAfterEvent(72, 48)
      .submit(72, 48, 'post_event')
      .reflection('r0', 'tidak tahu')
      .build();

    expect(k4(l4, events).score).toBe(0);
  });

  it('memberi 2 bila revisi berhasil tetapi pemahaman trade-off belum lengkap', () => {
    const events = sampaiEvent()
      .reviseAfterEvent(72, 48)
      .submit(72, 48, 'post_event')
      .reflection('r2', JAWABAN_DANGKAL)
      .build();

    const r = k4(l4, events);
    expect(r.score).toBe(2);
    expect(r.evidence.reflectionQuality).toBe(1);
  });

  it('memberi 3 bila revisi berhasil dan refleksi mengidentifikasi trade-off dengan justifikasi', () => {
    const events = sampaiEvent()
      .reviseAfterEvent(72, 48)
      .submit(72, 48, 'post_event')
      .reflection('r3', JAWABAN_LENGKAP)
      .build();

    const r = k4(l4, events);
    expect(r.score).toBe(3);
    expect(r.evidence.reflectionQuality).toBe(3);
  });
});

describe('K4 varian reflection_only (Level 1-3, tanpa event distraktor)', () => {
  function dasarL1() {
    return log(l1.id).identifyBothCorrect().selectObjective('g1').moveSlider(30, 10).submit(30, 10);
  }

  it('memakai kriteria reflection_only dan memberi 0 bila refleksi tidak dijawab', () => {
    const r = k4(l1, dasarL1().build());
    expect(r.criterion).toBe('reflection_only');
    expect(r.score).toBe(0);
  });

  it('memberi skor sesuai mutu refleksi tanpa menuntut adanya revisi', () => {
    const terbaik = dasarL1()
      .reflection(
        'r3',
        'Untuk menambah RTH kota harus mengurangi luas permukiman, karena total lahan hanya 40 hektar sehingga daya tampung hunian berkurang.',
      )
      .build();
    const sedang = dasarL1().reflection('r2', 'RTH bisa ditambah tetapi permukiman berkurang.').build();
    const rendah = dasarL1().reflection('r1', 'RTH sebaiknya diperluas agar kota lebih hijau.').build();

    expect(k4(l1, terbaik).score).toBe(3);
    expect(k4(l1, sedang).score).toBe(2);
    expect(k4(l1, rendah).score).toBe(1);
  });
});

describe('K4 varian distractor_not_fired (Level 4, event tidak sempat muncul)', () => {
  it('menilai dari refleksi saja dan mencatat sebabnya pada jejak audit', () => {
    const events = log(l4.id)
      .identifyBothCorrect()
      .selectObjective('g1')
      .moveSlider(50, 40)
      .submit(50, 40)
      .reflection('r3', JAWABAN_LENGKAP)
      .build();

    const r = k4(l4, events);
    expect(r.criterion).toBe('distractor_not_fired');
    expect(r.score).toBe(3);
    expect(r.reasons.join(' ')).toContain('tidak sempat muncul');
  });
});

describe('K4 - batas heuristik teks terbuka (didokumentasikan, bukan diperbaiki)', () => {
  const terms = l4.reflection.expectedTerms;

  it('kalimat hafalan berisi penanda yang tepat tetap memperoleh skor tinggi', () => {
    // Perilaku yang DIHARAPKAN dari heuristik leksikal: kalimat ini tidak
    // menunjukkan penalaran atas hasil optimasi siswa, tetapi memuat seluruh
    // penanda yang dicari. Inilah alasan kolom Score.k4ManualOverride ada.
    const hafalan = 'RTH bertambah tetapi perumahan berkurang karena luasnya 48 hektar.';
    expect(analyzeOpenText(hafalan, terms).score).toBe(3);
  });

  it('penalaran benar yang ditulis tanpa penanda trade-off memperoleh skor rendah', () => {
    const tanpaPenanda = 'Perumahan 72 hektar dan RTH 48 hektar, daya tampung 2880 kepala keluarga.';
    const a = analyzeOpenText(tanpaPenanda, terms);
    expect(a.mentionsDomainTerm).toBe(true);
    expect(a.hasTradeoffMarker).toBe(false);
    expect(a.score).toBe(1);
  });
});
