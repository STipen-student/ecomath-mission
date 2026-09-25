/**
 * K2 - Merencanakan Penyelesaian (docs/ECD_Framework.md Bagian 5.2).
 *
 * Deskriptor rubrik:
 *   0  select_objective tidak dilakukan sebelum siswa mulai memindah slider/zona
 *      (indikasi trial-error tanpa rencana)
 *   1  Fungsi tujuan dipilih tetapi jumlah kendala yang dituliskan/disusun tidak
 *      lengkap dibanding task_id
 *   2  Seluruh kendala disusun dan fungsi tujuan dipilih, tetapi strategi
 *      penyelesaian tidak efisien (tidak mengecek titik pojok sebelum submit pertama)
 *   3  Seluruh kendala tersusun lengkap, fungsi tujuan dipilih di awal, dan
 *      check_corner_point muncul sebelum attempt_submit pertama
 *
 * CATATAN PENGUKURAN - kelengkapan vs ketepatan:
 * Skor 1 dibedakan dari skor 2 memakai jumlah kendala yang DISUSUN
 * (constraintCountWritten), bukan yang benar. Ketepatan terjemahan sudah
 * dinilai pada K1; memakainya lagi di sini berarti satu kesalahan siswa
 * dihukum dua kali dan membuat K1 dan K2 berkorelasi secara artifisial,
 * sehingga merusak validitas diskriminan antar-klaim saat analisis butir.
 * K2 di sini murni menilai KELENGKAPAN dan URUTAN perencanaan.
 */

import type { TaskDefinition } from '../domain/types.js';
import type { Observables } from './observables.js';
import type { ClaimResult, RubricScore } from './types.js';

const DESCRIPTORS: Record<RubricScore, string> = {
  0: 'select_objective tidak dilakukan sebelum siswa mulai memindah slider/zona (indikasi trial-error tanpa rencana)',
  1: 'Fungsi tujuan dipilih tetapi jumlah kendala yang disusun tidak lengkap dibanding task',
  2: 'Seluruh kendala disusun dan fungsi tujuan dipilih, tetapi strategi penyelesaian yang tersirat tidak efisien',
  3: 'Seluruh kendala tersusun lengkap, fungsi tujuan dipilih di awal, dan check_corner_point muncul sebelum attempt_submit pertama',
};

export function scoreK2(task: TaskDefinition, o: Observables): ClaimResult {
  const reasons: string[] = [];
  let score: RubricScore;

  const evidence = {
    objectiveSelected: o.objectiveSelected,
    objectiveCorrect: o.objectiveCorrect,
    objectiveBeforeFirstMove: o.objectiveBeforeFirstMove,
    constraintCountWritten: o.constraintCountWritten,
    expectedConstraintCount: task.expectedConstraintCount,
    cornerCheckBeforeFirstSubmit: o.cornerCheckBeforeFirstSubmit,
    cornerPointsChecked: o.cornerPointsChecked,
    planningTimeMs: o.planningTimeMs,
    hasObjectiveFunction: task.objective.type !== 'none',
  };

  if (!o.objectiveSelected) {
    score = 0;
    reasons.push('Siswa tidak pernah memilih rumusan tujuan (select_objective tidak muncul).');
  } else if (!o.objectiveBeforeFirstMove) {
    score = 0;
    reasons.push('Rumusan tujuan baru dipilih SETELAH slider digeser - pola trial-error tanpa rencana.');
  } else if (o.constraintCountWritten < task.expectedConstraintCount) {
    score = 1;
    reasons.push(
      `Baru ${o.constraintCountWritten} dari ${task.expectedConstraintCount} kendala yang disusun sebelum menyelesaikan task.`,
    );
  } else if (!o.cornerCheckBeforeFirstSubmit) {
    score = 2;
    reasons.push('Seluruh kendala disusun dan tujuan dipilih di awal, tetapi tidak ada pengecekan titik pojok sebelum submit pertama.');
  } else if (!o.objectiveCorrect) {
    // Urutan aksi sudah efisien, tetapi rumusan tujuan yang dipilih keliru,
    // sehingga strategi tidak "sesuai dengan fungsi tujuan" seperti dituntut
    // Student Model K2. Ditahan di skor 2.
    score = 2;
    reasons.push('Urutan perencanaan sudah efisien, tetapi rumusan tujuan yang dipilih tidak sesuai dengan yang diminta task.');
  } else {
    score = 3;
    reasons.push(
      `Tujuan dipilih di awal, ${o.constraintCountWritten} kendala tersusun lengkap, dan ${o.cornerPointsChecked} titik pojok dicek sebelum submit pertama.`,
    );
  }

  return { claim: 'K2', score, descriptor: DESCRIPTORS[score], reasons, criterion: 'standard', evidence };
}
