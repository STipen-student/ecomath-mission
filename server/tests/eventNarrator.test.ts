/**
 * Uji penerjemah narasi event (lib/eventNarrator.ts).
 *
 * Yang dijaga: setiap jenis event menghasilkan kalimat yang benar-benar
 * menyebutkan apa yang terjadi (bukan kalimat kosong atau nama event mentah),
 * opsi jawaban diterjemahkan ke teksnya lewat bank soal (bukan id mentah), dan
 * payload yang rusak tidak membuat fungsi ini gagal.
 */

import { describe, expect, it } from 'vitest';
import { narrateEvent } from '../src/lib/eventNarrator.js';
import { getTaskById } from '../src/tasks/index.js';

const l1 = getTaskById('L1-SDG11-A')!;
const l4 = getTaskById('L4-SDG11-A')!;

describe('narrateEvent - setiap jenis event menghasilkan kalimat bermakna', () => {
  it('identify_variable menyebut label variabel dari bank soal, bukan id mentah', () => {
    const d = narrateEvent(l1.id, 'identify_variable', JSON.stringify({ variable: 'x', optionId: 'vx1' }));
    expect(d.keterangan).toContain('Ruang Terbuka Hijau');
    expect(d.keterangan).not.toContain('vx1');
    expect(d.pilihan_teks).toBe(l1.variableOptions.find((o) => o.id === 'vx1')!.text);
  });

  it('select_objective menyebut teks rumusan tujuan', () => {
    const d = narrateEvent(l1.id, 'select_objective', JSON.stringify({ optionId: 'g1' }));
    expect(d.keterangan).toContain(l1.goalOptions.find((o) => o.id === 'g1')!.text);
  });

  it('write_constraint menguraikan koefisien ke kolom terpisah', () => {
    const d = narrateEvent(
      l1.id,
      'write_constraint',
      JSON.stringify({ slot: 0, a: 1, b: 1, op: '<=', c: 40, constraint_text: '1x + 1y <= 40' }),
    );
    expect(d.a).toBe(1);
    expect(d.b).toBe(1);
    expect(d.c).toBe(40);
    expect(d.operator).toBe('<=');
    expect(d.keterangan).toContain('kendala ke-1');
  });

  it('move_slider dan check_corner_point menguraikan koordinat', () => {
    const geser = narrateEvent(l1.id, 'move_slider', JSON.stringify({ x: 30, y: 10 }));
    expect(geser.x).toBe(30);
    expect(geser.y).toBe(10);
    expect(geser.keterangan).toContain('(30, 10)');

    const pojok = narrateEvent(l1.id, 'check_corner_point', JSON.stringify({ x: 70, y: 10, z: 610 }));
    expect(pojok.z).toBe(610);
    expect(pojok.keterangan).toContain('Z = 610');
  });

  it('attempt_submit membedakan tahap awal dari pasca-event', () => {
    const awal = narrateEvent(l1.id, 'attempt_submit', JSON.stringify({ x: 30, y: 10, phase: 'initial' }));
    expect(awal.keterangan).toContain('tahap awal');

    const pasca = narrateEvent(l4.id, 'attempt_submit', JSON.stringify({ x: 72, y: 48, phase: 'post_event' }));
    expect(pasca.keterangan).toContain('setelah kebijakan berubah');
  });

  it('reject_by_system menyebutkan kendala yang dilanggar', () => {
    const d = narrateEvent(l1.id, 'reject_by_system', JSON.stringify({ x: 10, y: 20, violated: ['k_rasio'] }));
    expect(d.keterangan).toContain('k_rasio');
    expect(d.catatan).toBe('k_rasio');
  });

  it('reflection_response menggabungkan pilihan tertutup dan jawaban terbuka', () => {
    const d = narrateEvent(
      l1.id,
      'reflection_response',
      JSON.stringify({ closedOptionId: 'r3', openText: 'RTH bertambah tetapi permukiman berkurang.' }),
    );
    expect(d.keterangan).toContain('pilihan:');
    expect(d.keterangan).toContain('tulisan:');
    expect(d.pilihan_teks).toBe(l1.reflection.closed.options.find((o) => o.id === 'r3')!.text);
  });

  it('reflection_response yang kosong tetap menghasilkan kalimat, bukan string kosong', () => {
    const d = narrateEvent(l1.id, 'reflection_response', JSON.stringify({}));
    expect(d.keterangan).toBe('Tidak menjawab refleksi');
  });

  it('distractor_shown membedakan pemicu submit valid dari batas waktu cadangan', () => {
    const a = narrateEvent(l4.id, 'distractor_shown', JSON.stringify({ eventId: 'ev_rth_40', trigger: 'first_valid_submit' }));
    expect(a.keterangan).toContain('submit valid pertama');

    const b = narrateEvent(l4.id, 'distractor_shown', JSON.stringify({ eventId: 'ev_rth_40', trigger: 'time_fallback' }));
    expect(b.keterangan).toContain('batas waktu cadangan');
  });

  it('set_zone_center menyebut label variabel dan posisi petak', () => {
    const d = narrateEvent(l1.id, 'set_zone_center', JSON.stringify({ variable: 'x', col: 5, row: 7 }));
    expect(d.keterangan).toContain('Ruang Terbuka Hijau');
    expect(d.keterangan).toContain('kolom 5');
    expect(d.keterangan).toContain('baris 7');
  });

  it('jenis event yang tidak dikenal tetap menghasilkan sesuatu, tidak kosong', () => {
    const d = narrateEvent(l1.id, 'jenis_masa_depan', JSON.stringify({}));
    expect(d.keterangan).toBe('jenis_masa_depan');
  });
});

describe('narrateEvent - bertahan terhadap data rusak', () => {
  it('tidak melempar error pada payload JSON yang rusak', () => {
    expect(() => narrateEvent(l1.id, 'move_slider', '{tidak valid')).not.toThrow();
    const d = narrateEvent(l1.id, 'move_slider', '{tidak valid');
    expect(d.keterangan).toContain('(');
  });

  it('tidak melempar error pada taskId yang tidak dikenal', () => {
    expect(() => narrateEvent('task-tidak-ada', 'identify_variable', JSON.stringify({ variable: 'x', optionId: 'vx1' }))).not.toThrow();
    const d = narrateEvent('task-tidak-ada', 'identify_variable', JSON.stringify({ variable: 'x', optionId: 'vx1' }));
    // Tanpa task, id opsi ditampilkan apa adanya - lebih baik daripada kosong.
    expect(d.keterangan).toContain('vx1');
  });
});
