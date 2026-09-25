/**
 * Pembantu penulisan bank skenario agar definisi task tetap ringkas dan seragam.
 * Tidak mengandung logika penilaian - murni konstruksi data.
 */

import type { Constraint, ConstraintKind, InequalityOp } from '../domain/types.js';

const LE = '\u2264';
const GE = '\u2265';

/** Simbol operator siap-tampil. */
export function opSymbol(op: InequalityOp): string {
  return op === '<=' ? LE : op === '>=' ? GE : op;
}

/**
 * Rakit teks tampilan sebuah pertidaksamaan dari koefisiennya,
 * mis. (1, 1, '<=', 40) -> "x + y \u2264 40".
 */
export function displayOf(a: number, b: number, op: InequalityOp, c: number, unit?: string): string {
  const term = (coef: number, name: string): string => {
    if (coef === 0) return '';
    if (coef === 1) return name;
    if (coef === -1) return `-${name}`;
    return `${coef}${name}`;
  };
  const tx = term(a, 'x');
  const ty = term(b, 'y');
  let lhs: string;
  if (tx && ty) {
    lhs = b > 0 ? `${tx} + ${ty}` : `${tx} - ${term(Math.abs(b), 'y')}`;
  } else {
    lhs = tx || ty || '0';
  }
  return `${lhs} ${opSymbol(op)} ${c}${unit ? ` ${unit}` : ''}`;
}

/** Konstruktor kendala. */
export function c(
  id: string,
  label: string,
  a: number,
  b: number,
  op: InequalityOp,
  rhs: number,
  kind: ConstraintKind = 'explicit',
  narrativeHint?: string,
  unit?: string,
): Constraint {
  return {
    id,
    label,
    a,
    b,
    op,
    c: rhs,
    kind,
    display: displayOf(a, b, op, rhs, unit),
    ...(narrativeHint ? { narrativeHint } : {}),
  };
}

/** Pasangan kendala non-negativitas x >= 0 dan y >= 0. */
export function nonNegativity(): Constraint[] {
  return [
    c('nn_x', 'Luas/jumlah tidak negatif (x)', 1, 0, '>=', 0, 'nonnegativity'),
    c('nn_y', 'Luas/jumlah tidak negatif (y)', 0, 1, '>=', 0, 'nonnegativity'),
  ];
}
