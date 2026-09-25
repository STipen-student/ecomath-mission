/**
 * Menerjemahkan satu event log menjadi kalimat berbahasa Indonesia dan beberapa
 * kolom terurai, supaya ekspor CSV dapat dibaca langsung di Excel tanpa
 * membongkar payload JSON satu per satu.
 *
 * MENGAPA INI DIPERLUKAN. Kolom `payload` berisi JSON mentah, dan bentuknya
 * berbeda untuk tiap jenis event ({"variable":"x","optionId":"vx1"} untuk
 * identify_variable, {"x":30,"y":10} untuk move_slider, dst). Dibaca baris demi
 * baris di Excel, itu terlihat acak - padahal setiap baris sebenarnya
 * menceritakan satu keputusan siswa yang jelas maknanya.
 *
 * Dipakai bersama oleh endpoint unduh langsung (GET /api/admin/events) dan
 * skrip ekspor luring (docs/EXPORT/export_to_csv.ts), sehingga kedua jalur
 * ekspor selalu menghasilkan narasi yang sama persis.
 *
 * Fungsi ini murni presentasi - tidak menyentuh skor, dan tidak menjadi sumber
 * kebenaran apa pun. Kolom `payload_json` tetap disertakan di ekspor sebagai
 * data mentah, untuk pemrosesan ulang terprogram bila suatu saat diperlukan.
 */

import { getTaskById } from '../tasks/index.js';

export interface DecodedEvent {
  keterangan: string;
  x: number | '';
  y: number | '';
  z: number | '';
  a: number | '';
  b: number | '';
  operator: string;
  c: number | '';
  pilihan_teks: string;
  catatan: string;
}

const KOSONG: DecodedEvent = {
  keterangan: '',
  x: '',
  y: '',
  z: '',
  a: '',
  b: '',
  operator: '',
  c: '',
  pilihan_teks: '',
  catatan: '',
};

function angka(v: unknown): number | '' {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

function teks(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(raw);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Terjemahkan satu event menjadi kalimat dan kolom terurai.
 *
 * @param taskId      kode task pemilik event, dipakai mencari teks opsi jawaban
 * @param eventType   nilai event_type, sesuai enum di domain/events.ts
 * @param payloadJson isi kolom payload apa adanya (string JSON dari database)
 */
export function narrateEvent(taskId: string, eventType: string, payloadJson: string): DecodedEvent {
  const task = getTaskById(taskId);
  const p = parsePayload(payloadJson);

  switch (eventType) {
    case 'identify_variable': {
      const variabel = teks(p.variable) || String(p.variable ?? '');
      const opsi = task?.variableOptions.find((o) => o.id === p.optionId);
      const label = opsi?.text ?? teks(p.optionId);
      return { ...KOSONG, pilihan_teks: label, catatan: `variabel ${variabel}`, keterangan: `Menetapkan variabel ${variabel} = ${label || '(tidak diketahui)'}` };
    }

    case 'select_objective': {
      const opsi = task?.goalOptions.find((o) => o.id === p.optionId);
      const label = opsi?.text ?? teks(p.optionId);
      return { ...KOSONG, pilihan_teks: label, keterangan: `Memilih rumusan tujuan: ${label || '(tidak diketahui)'}` };
    }

    case 'write_constraint': {
      const a = angka(p.a);
      const b = angka(p.b);
      const c = angka(p.c);
      const op = teks(p.op);
      const slot = Number(p.slot ?? 0) + 1;
      const ekspresi = teks(p.constraint_text) || `${a}x + ${b}y ${op} ${c}`;
      return { ...KOSONG, a, b, operator: op, c, keterangan: `Menulis kendala ke-${slot}: ${ekspresi}` };
    }

    case 'move_slider': {
      const x = angka(p.x);
      const y = angka(p.y);
      return { ...KOSONG, x, y, keterangan: `Menggeser slider ke (${x}, ${y})` };
    }

    case 'check_corner_point': {
      const x = angka(p.x);
      const y = angka(p.y);
      const z = angka(p.z);
      return { ...KOSONG, x, y, z, keterangan: `Menguji titik pojok (${x}, ${y})${z !== '' ? `, Z = ${z}` : ''}` };
    }

    case 'attempt_submit': {
      const x = angka(p.x);
      const y = angka(p.y);
      const fase = p.phase === 'post_event' ? 'setelah kebijakan berubah' : 'tahap awal';
      return { ...KOSONG, x, y, catatan: teks(p.phase), keterangan: `Mengirim jawaban (${x}, ${y}) - ${fase}` };
    }

    case 'reject_by_system': {
      const x = angka(p.x);
      const y = angka(p.y);
      const dilanggar = Array.isArray(p.violated) ? p.violated.map(String).join(', ') : '';
      return { ...KOSONG, x, y, catatan: dilanggar, keterangan: `Ditolak sistem di (${x}, ${y}) - melanggar: ${dilanggar || '(tidak tercatat)'}` };
    }

    case 'reflection_response': {
      const opsi = task?.reflection.closed.options.find((o) => o.id === p.closedOptionId);
      const tertutup = opsi?.text ?? '';
      const terbuka = teks(p.openText);
      const ringkas = terbuka.length > 80 ? `${terbuka.slice(0, 80)}...` : terbuka;
      const bagian = [tertutup && `pilihan: "${tertutup}"`, ringkas && `tulisan: "${ringkas}"`].filter(Boolean);
      return {
        ...KOSONG,
        pilihan_teks: tertutup,
        catatan: terbuka,
        keterangan: bagian.length > 0 ? `Menjawab refleksi - ${bagian.join(', ')}` : 'Tidak menjawab refleksi',
      };
    }

    case 'revise_after_event': {
      const x = angka(p.x);
      const y = angka(p.y);
      return { ...KOSONG, x, y, keterangan: `Merevisi rencana ke (${x}, ${y}) setelah kebijakan berubah` };
    }

    case 'distractor_shown': {
      const pemicu = p.trigger === 'time_fallback' ? 'batas waktu cadangan' : 'submit valid pertama';
      return { ...KOSONG, catatan: teks(p.trigger), keterangan: `Sistem memunculkan kebijakan baru (dipicu oleh ${pemicu})` };
    }

    case 'set_zone_center': {
      const variabel = teks(p.variable) || String(p.variable ?? '');
      const label = variabel === 'x' || variabel === 'y' ? (task?.variables[variabel]?.label ?? variabel) : variabel;
      return {
        ...KOSONG,
        catatan: `kolom ${p.col}, baris ${p.row}`,
        keterangan: `Memindahkan pusat zona ${label} di peta (kolom ${p.col}, baris ${p.row})`,
      };
    }

    case 'adaptive_selection': {
      const mode = p.mode === 'adaptive' ? 'adaptif' : 'acak berstrata';
      if (p.mode !== 'adaptive') {
        return {
          ...KOSONG,
          catatan: 'fixed-form',
          keterangan: `Sistem memberikan soal secara ${mode} (mode adaptif mati)`,
        };
      }
      const pita =
        p.band === 'belum_ada' ? 'belum ada data level sebelumnya' : `pita kemampuan ${teks(p.band)}`;
      const rerata = p.claimMean === null || p.claimMean === undefined ? '-' : String(p.claimMean);
      const klaim = Array.isArray(p.basedOnClaims) ? p.basedOnClaims.join('/') : '';
      const tanpaRuang = p.tanpaRuangAdaptif
        ? '; seluruh varian level ini berbeban sama sehingga dipilih acak'
        : '';
      return {
        ...KOSONG,
        catatan: `${teks(p.band)}, rerata ${klaim} = ${rerata}`,
        keterangan: `Sistem memilih soal secara ${mode} berdasarkan ${pita} (rerata ${klaim} = ${rerata})${tanpaRuang}`,
      };
    }

    default:
      // Jenis event yang belum dikenal tetap muncul apa adanya, tidak disembunyikan.
      return { ...KOSONG, keterangan: eventType };
  }
}
