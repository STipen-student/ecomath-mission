/**
 * Penyusun umpan balik formatif untuk siswa.
 *
 * Deskriptor rubrik ditulis untuk PENELITI - berisi istilah seperti
 * "boundary_violation_count" dan "check_corner_point_action". Kalimat seperti itu
 * tidak berguna bagi siswa SMA yang baru selesai mengerjakan.
 *
 * Modul ini menerjemahkan setiap kombinasi (klaim, skor, bukti) menjadi satu
 * kalimat saran dalam bahasa yang dapat ditindaklanjuti siswa. Skor TIDAK
 * berubah sedikit pun di sini - hanya cara menyampaikannya.
 *
 * Prinsip penulisan saran:
 *   - sebut perilaku konkret, bukan label kemampuan ("kamu belum mengecek titik
 *     pojok", bukan "kemampuan perencanaanmu rendah");
 *   - selalu beri langkah berikutnya, termasuk pada skor 3;
 *   - pakai angka dari pekerjaan siswa sendiri bila ada, supaya terasa spesifik.
 */

import type { TaskDefinition } from '../domain/types.js';
import type { ClaimResult, RubricScore } from './types.js';
import type { Observables } from './observables.js';

/** Ringkasan satu klaim dalam bahasa siswa. */
export interface StudentFeedback {
  claim: 'K1' | 'K2' | 'K3' | 'K4';
  /** Nama klaim dalam bahasa sehari-hari. */
  title: string;
  score: RubricScore;
  /** Satu kalimat: apa yang terjadi pada pekerjaanmu. */
  summary: string;
  /** Satu kalimat: apa yang bisa dilakukan lain kali. */
  suggestion: string;
}

/** Nama klaim dalam bahasa sehari-hari - dipakai layar siswa maupun laporan guru. */
export const JUDUL_KLAIM: Record<string, string> = {
  K1: 'Memahami masalah',
  K2: 'Menyusun rencana',
  K3: 'Menjalankan rencana',
  K4: 'Memeriksa kembali',
};

function angka(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/* ------------------------------------------------------------------ */
/* K1 - Memahami masalah                                               */
/* ------------------------------------------------------------------ */

function k1(task: TaskDefinition, r: ClaimResult, o: Observables): Omit<StudentFeedback, 'claim' | 'title' | 'score'> {
  const miskonsepsi = String(r.evidence.firstConstraintMisconception ?? 'none');

  if (r.score === 0) {
    return o.identifyVariableCount === 0
      ? {
          summary: 'Kamu langsung membangun tanpa menetapkan makna variabel x dan y.',
          suggestion: `Sebelum menggeser slider, buka panel "Variabel" dan tentukan bahwa x adalah ${task.variables.x.label.toLowerCase()} dan y adalah ${task.variables.y.label.toLowerCase()}.`,
        }
      : {
          summary: 'Makna variabel x dan y tertukar dari yang dimaksud soal.',
          suggestion: `Baca ulang kalimat pertama narasi: soal menyebut x untuk ${task.variables.x.label.toLowerCase()} dan y untuk ${task.variables.y.label.toLowerCase()}.`,
        };
  }

  if (r.score === 1) {
    if (o.constraintCountWritten === 0) {
      return {
        summary: 'Variabelmu sudah benar, tetapi kamu belum menuliskan satu pun pertidaksamaan.',
        suggestion: `Buka panel "Kendala" dan susun ${task.expectedConstraintCount} pertidaksamaan dari narasi - itulah inti dari memahami soal.`,
      };
    }
    if (miskonsepsi === 'sign_flip') {
      return {
        summary: 'Arah pertidaksamaan pertamamu terbalik.',
        suggestion:
          'Perhatikan kata kuncinya: "minimal" dan "paling sedikit" berarti ≥, sedangkan "tidak lebih dari" dan "maksimal" berarti ≤.',
      };
    }
    if (miskonsepsi === 'swap_vars') {
      return {
        summary: 'Peran x dan y tertukar di dalam pertidaksamaan yang kamu susun.',
        suggestion: `Tulis ulang pelan-pelan: besaran mana yang dikalikan, ${task.variables.x.label.toLowerCase()} atau ${task.variables.y.label.toLowerCase()}?`,
      };
    }
    return {
      summary: 'Pertidaksamaan yang kamu susun belum menyerupai kendala mana pun pada narasi.',
      suggestion: 'Ambil satu kalimat narasi, tandai angkanya, lalu ubah kalimat itu saja menjadi satu pertidaksamaan.',
    };
  }

  if (r.score === 2) {
    const kurang = task.expectedConstraintCount - Number(r.evidence.constraintCountCorrect ?? 0);
    return {
      summary:
        miskonsepsi === 'unit_scale'
          ? 'Arah pertidaksamaanmu benar, tetapi angkanya meleset skalanya.'
          : `Kamu menerjemahkan ${angka(r.evidence.constraintCountCorrect)} dari ${task.expectedConstraintCount} kendala dengan benar.`,
      suggestion:
        kurang > 0
          ? 'Periksa lagi kendala yang belum tepat: cocokkan setiap angka pada pertidaksamaanmu dengan angka pada narasi, termasuk satuannya.'
          : 'Sebelum menekan Simpan, baca ulang pertidaksamaanmu sekali - revisi berulang menandakan terjemahan pertamamu belum mantap.',
    };
  }

  return {
    summary: 'Seluruh kendala kamu terjemahkan tepat pada percobaan pertama.',
    suggestion: 'Pertahankan kebiasaan ini: baca narasi sampai habis dulu, baru menulis pertidaksamaan.',
  };
}

/* ------------------------------------------------------------------ */
/* K2 - Menyusun rencana                                               */
/* ------------------------------------------------------------------ */

function k2(task: TaskDefinition, r: ClaimResult, o: Observables): Omit<StudentFeedback, 'claim' | 'title' | 'score'> {
  const punyaTujuan = task.objective.type !== 'none';

  if (r.score === 0) {
    return o.objectiveSelected
      ? {
          summary: 'Kamu menggeser slider lebih dulu, baru menentukan tujuan.',
          suggestion: 'Lain kali tentukan tujuan dan kendala dulu, baru membangun - itu membedakan merencanakan dari menebak.',
        }
      : {
          summary: 'Kamu mengerjakan tanpa memilih rumusan tujuan sama sekali.',
          suggestion: 'Buka panel "Tujuan" di awal dan pilih apa sebenarnya yang diminta soal sebelum menyentuh slider.',
        };
  }

  if (r.score === 1) {
    return {
      summary: `Rencanamu belum lengkap: baru ${angka(r.evidence.constraintCountWritten)} dari ${task.expectedConstraintCount} kendala yang disusun.`,
      suggestion: 'Telusuri narasi kalimat per kalimat - tiap batasan yang disebut soal harus jadi satu pertidaksamaan.',
    };
  }

  if (r.score === 2) {
    if (!r.evidence.objectiveCorrect) {
      return {
        summary: 'Urutan kerjamu sudah rapi, tetapi rumusan tujuan yang kamu pilih bukan yang diminta soal.',
        suggestion: punyaTujuan
          ? `Perhatikan kalimat terakhir narasi: soal meminta ${task.objective.display.toLowerCase()}.`
          : 'Perhatikan kalimat perintah pada narasi - itulah tujuan yang harus kamu pilih.',
      };
    }
    return {
      summary: 'Kendala lengkap dan tujuan dipilih di awal, tetapi kamu langsung submit tanpa menguji titik pojok.',
      suggestion: punyaTujuan
        ? 'Buka panel "Titik pojok" dan hitung nilai Z pada beberapa kandidat dulu - solusi terbaik selalu berada di salah satu titik pojok.'
        : 'Buka panel "Titik pojok" untuk memeriksa batas daerah penyelesaian sebelum menentukan jawaban akhirmu.',
    };
  }

  return {
    summary: `Kamu merencanakan sebelum bertindak dan menguji ${angka(r.evidence.cornerPointsChecked)} titik pojok sebelum submit pertama.`,
    suggestion: 'Cara kerja seperti ini yang membuat soal level berikutnya terasa jauh lebih mudah.',
  };
}

/* ------------------------------------------------------------------ */
/* K3 - Menjalankan rencana                                            */
/* ------------------------------------------------------------------ */

function k3(task: TaskDefinition, r: ClaimResult, o: Observables): Omit<StudentFeedback, 'claim' | 'title' | 'score'> {
  const namaDilanggar = o.activeConstraints
    .filter((k) => (k.kind === 'explicit' || k.kind === 'implicit') && !cocok(k, o))
    .map((k) => (k.kind === 'implicit' ? 'kendala tersirat' : k.label.toLowerCase()));

  if (r.score === 0) {
    if (o.finalPosition === null) {
      return {
        summary: 'Kamu tidak sempat mengirimkan jawaban akhir.',
        suggestion: 'Tekan tombol Kirim setelah alokasimu memenuhi semua kendala - jawaban yang tidak dikirim tidak dapat dinilai.',
      };
    }
    return {
      summary:
        namaDilanggar.length > 0
          ? `Jawaban akhirmu masih melanggar: ${namaDilanggar.join(', ')}.`
          : 'Jawaban akhirmu masih berada di luar daerah penyelesaian.',
      suggestion: 'Perhatikan meter kendala di bagian atas layar - selama masih ada yang merah, jawabanmu belum sah.',
    };
  }

  if (r.criterion === 'feasibility_only') {
    if (r.score === 1) {
      return {
        summary: `Jawabanmu sah, tetapi ditemukan setelah ${angka(r.evidence.boundaryViolationCount)} kali ditolak sistem.`,
        suggestion: 'Susun dulu kendalanya di panel "Kendala", lalu gunakan meter di atas layar sebagai pemandu - jauh lebih cepat daripada mencoba-coba.',
      };
    }
    if (r.score === 2) {
      return {
        summary: `Jawabanmu sah dengan ${angka(r.evidence.boundaryViolationCount)} kali penolakan sistem.`,
        suggestion: 'Sebelum menekan Kirim, pastikan semua meter kendala sudah hijau - itu menghemat percobaan.',
      };
    }
    return {
      summary: 'Alokasi akhirmu memenuhi seluruh kendala dengan sedikit sekali percobaan gagal.',
      suggestion: 'Coba juga cari kombinasi lain yang tetap sah - memahami seluruh daerah penyelesaian, bukan satu titik saja.',
    };
  }

  if (r.score === 1) {
    return {
      summary: `Jawabanmu sah tetapi belum yang terbaik: nilai ${task.objective.label.toLowerCase()} kamu ${angka(r.evidence.finalZ)}, sedangkan yang terbaik ${angka(r.evidence.optimalZ)}.`,
      suggestion: 'Hitung nilai Z pada SEMUA titik pojok, lalu pilih yang paling menguntungkan - jangan berhenti di titik pertama yang sah.',
    };
  }

  if (r.score === 2) {
    return {
      summary: `Kamu menemukan titik terbaik, tetapi lewat ${angka(r.evidence.boundaryViolationCount)} kali penolakan sistem.`,
      suggestion: 'Uji titik pojok lebih dulu di panel, baru geser slider ke sana - hasilnya sama tapi tanpa coba-coba.',
    };
  }

  return {
    summary: `Kamu mendarat tepat di titik terbaik dengan nilai ${angka(r.evidence.finalZ)}.`,
    suggestion: 'Coba jelaskan ke dirimu sendiri mengapa titik itu yang terbaik - itu yang membuat pemahamanmu bertahan.',
  };
}

/** Apakah kendala terpenuhi pada posisi akhir siswa? */
function cocok(k: Observables['activeConstraints'][number], o: Observables): boolean {
  if (!o.finalPosition) return true;
  const kiri = k.a * o.finalPosition.x + k.b * o.finalPosition.y;
  const eps = 1e-9;
  switch (k.op) {
    case '<=':
      return kiri <= k.c + eps;
    case '>=':
      return kiri >= k.c - eps;
    case '<':
      return kiri < k.c - eps;
    case '>':
      return kiri > k.c + eps;
  }
}

/* ------------------------------------------------------------------ */
/* K4 - Memeriksa kembali                                              */
/* ------------------------------------------------------------------ */

function k4(task: TaskDefinition, r: ClaimResult, o: Observables): Omit<StudentFeedback, 'claim' | 'title' | 'score'> {
  const adaEvent = r.criterion === 'standard';

  if (adaEvent) {
    if (r.score === 0 && !r.evidence.postEventValid && o.reviseAfterEventCount === 0) {
      return {
        summary: 'Aturan kota berubah di tengah pengerjaan, tetapi kamu tidak merevisi rencanamu.',
        suggestion: 'Saat kendala berubah, jawaban lama hampir selalu ikut berubah - periksa ulang meter kendala setiap kali ada pengumuman baru.',
      };
    }
    if (r.score === 0) {
      return {
        summary: o.reflectionAnswered
          ? 'Revisimu berhasil, tetapi jawaban refleksimu belum menyentuh dampak kebijakan barunya.'
          : 'Revisimu berhasil, tetapi pertanyaan refleksi tidak kamu jawab.',
        suggestion: 'Refleksi bukan formalitas: tuliskan apa yang berkurang dan apa yang bertambah akibat kebijakan baru itu.',
      };
    }
    if (r.score === 1) {
      return {
        summary: 'Kamu mencoba merevisi setelah aturan berubah, tetapi jawaban barumu masih melanggar kendala yang baru.',
        suggestion: 'Setelah pengumuman, baca dulu kendala mana yang angkanya berubah, baru geser slider - bukan sebaliknya.',
      };
    }
    if (r.score === 2) {
      return {
        summary: 'Revisimu tepat, tetapi penjelasanmu belum menyebut apa yang harus dikorbankan.',
        suggestion: 'Sebut dua sisi sekaligus: apa yang bertambah, apa yang berkurang, dan berapa banyak.',
      };
    }
    return {
      summary: 'Kamu merevisi dengan tepat dan menjelaskan trade-off-nya secara eksplisit.',
      suggestion: 'Inilah cara berpikir yang dicari soal ini - solusi matematis yang juga masuk akal secara nyata.',
    };
  }

  if (r.score === 0) {
    // Membedakan "tidak menjawab" dari "menjawab tetapi belum bermutu" itu
    // penting: mengatakan siswa tidak menjawab padahal ia menulis sesuatu
    // membuat seluruh umpan balik terasa tidak dapat dipercaya.
    if (!o.reflectionAnswered) {
      return {
        summary: 'Kamu tidak menjawab pertanyaan refleksi di akhir.',
        suggestion: `Coba jawab singkat saja: apa yang harus dikorbankan kota jika ${task.variables.x.label.toLowerCase()} diperbesar?`,
      };
    }
    return {
      summary: 'Kamu menjawab refleksi, tetapi jawabannya belum menyentuh persoalan pada soal ini.',
      suggestion: `Sebut hal yang konkret dari soal ini - misalnya ${task.variables.x.label.toLowerCase()} dan ${task.variables.y.label.toLowerCase()} - lalu jelaskan mana yang berkurang ketika yang lain bertambah.`,
    };
  }
  if (r.score === 1) {
    return {
      summary: 'Refleksimu menyebut konteks soal, tetapi belum mengenali adanya pertukaran antar-kepentingan.',
      suggestion: 'Setiap alokasi selalu punya harga: bila satu zona diperbesar, zona lain pasti mengecil. Sebutkan itu.',
    };
  }
  if (r.score === 2) {
    return {
      summary: 'Kamu mengenali adanya trade-off, tetapi belum menjelaskan alasannya.',
      suggestion: 'Tambahkan satu kata "karena" beserta angka dari pekerjaanmu sendiri - itu yang membedakan menjelaskan dari menebak.',
    };
  }
  return {
    summary: 'Refleksimu menyebut trade-off sekaligus alasannya dengan angka.',
    suggestion: 'Kebiasaan memeriksa kewajaran jawaban ini berlaku jauh di luar soal matematika.',
  };
}

/* ------------------------------------------------------------------ */

const PENYUSUN = { K1: k1, K2: k2, K3: k3, K4: k4 } as const;

/** Susun umpan balik siswa untuk seluruh klaim. */
export function buildStudentFeedback(
  task: TaskDefinition,
  claims: ClaimResult[],
  observables: Observables,
): StudentFeedback[] {
  return claims.map((r) => {
    const penyusun = PENYUSUN[r.claim];
    const isi = penyusun(task, r, observables);
    return {
      claim: r.claim,
      title: JUDUL_KLAIM[r.claim] ?? r.claim,
      score: r.score,
      ...isi,
    };
  });
}

/**
 * Satu kalimat penutup untuk seluruh percobaan: menyebut klaim terkuat dan
 * klaim yang paling perlu dilatih. Dipakai pada layar hasil agar siswa membawa
 * pulang satu pesan, bukan empat.
 */
export function buildOverallMessage(feedback: StudentFeedback[]): string {
  if (feedback.length === 0) return '';

  const terurut = [...feedback].sort((a, b) => b.score - a.score);
  const terbaik = terurut[0]!;
  const terlemah = terurut[terurut.length - 1]!;

  if (terlemah.score === 3) {
    return 'Empat tahap pemecahan masalah kamu jalankan dengan lengkap. Coba level berikutnya yang kendalanya lebih banyak.';
  }
  if (terbaik.score === 0) {
    return 'Belum ada tahap yang tuntas pada level ini. Mulai dari satu hal saja: tetapkan makna x dan y sebelum menyentuh slider.';
  }
  return `Bagian terkuatmu: ${terbaik.title.toLowerCase()}. Yang paling perlu dilatih: ${terlemah.title.toLowerCase()}.`;
}

/** Rata-rata satu klaim lintas seluruh level yang dikerjakan siswa - dipakai laporan guru. */
export interface ClaimProfile {
  claim: 'K1' | 'K2' | 'K3' | 'K4';
  title: string;
  /** Rata-rata skor 0-3 klaim ini, dari level yang sudah dikerjakan saja. */
  mean: number;
  /** Banyak level yang menyumbang rata-rata ini. */
  levelCount: number;
}

/**
 * Kesimpulan satu siswa lintas seluruh level yang dikerjakan - dipakai laporan
 * guru, BUKAN layar siswa.
 *
 * Ditulis orang ketiga karena pembacanya guru, bukan siswa yang bersangkutan -
 * berbeda dari buildOverallMessage() di atas yang menyapa siswa langsung.
 * Ambang batas 2,5 dan 0,5 sengaja diberi jarak dari ujung skala (3 dan 0):
 * seorang siswa yang secara konsisten berada di skor 3 pada satu level tetapi
 * turun ke 2 pada level lain sudah pantas disebut "menguasai", bukan ditahan
 * menunggu rata-rata sempurna yang jarang tercapai pada instrumen empat level.
 */
export function buildSessionConclusion(profil: ClaimProfile[]): string {
  const terisi = profil.filter((p) => p.levelCount > 0);
  if (terisi.length === 0) return 'Siswa ini belum menyelesaikan satu level pun.';

  const terurut = [...terisi].sort((a, b) => b.mean - a.mean);
  const terbaik = terurut[0]!;
  const terlemah = terurut[terurut.length - 1]!;

  if (terlemah.mean >= 2.5) {
    return 'Siswa ini menguasai keempat tahap pemecahan masalah secara konsisten di seluruh level yang dikerjakan.';
  }
  if (terbaik.mean <= 0.5) {
    return 'Siswa ini belum menunjukkan penguasaan pada tahap mana pun secara konsisten. Pendampingan sebaiknya dimulai dari memahami masalah (K1) sebelum lanjut ke tahap berikutnya.';
  }
  if (terbaik.claim === terlemah.claim) {
    return `Siswa ini konsisten pada ${terbaik.title.toLowerCase()} di seluruh level yang dikerjakan.`;
  }
  return `Paling konsisten kuat pada ${terbaik.title.toLowerCase()} (rata-rata ${terbaik.mean.toFixed(1)} dari 3). Paling perlu dilatih: ${terlemah.title.toLowerCase()} (rata-rata ${terlemah.mean.toFixed(1)} dari 3).`;
}
