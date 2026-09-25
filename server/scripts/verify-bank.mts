import { TASK_BANK, validateAgainstAssemblyRule, substantiveConstraintCount } from '../src/tasks/index.js';
import { findOptimum } from '../src/domain/optimum.js';
import { applyPatches } from '../src/domain/feasibility.js';

let problems = 0;
for (const t of TASK_BANK) {
  const opt = findOptimum(t);
  const rule = validateAgainstAssemblyRule(t);
  const n = substantiveConstraintCount(t);
  const p = opt.point ? `(${opt.point.x.toFixed(2)}, ${opt.point.y.toFixed(2)})` : '-';
  const z = opt.z === null ? '-' : opt.z.toFixed(2);
  console.log(`${t.id.padEnd(16)} L${t.level} kendala=${n} pojok=${String(opt.corners.length).padEnd(2)} optimum=${p.padEnd(20)} Z=${z}`);
  if (opt.empty) { console.log(`   !! DAERAH PENYELESAIAN KOSONG`); problems++; }
  if (rule.length) { console.log(`   !! assembly: ${rule.join(' | ')}`); problems++; }

  if (t.distractor) {
    const after = applyPatches(t.constraints, t.distractor.constraintPatches);
    const objAfter = t.distractor.objectivePatch ? { ...t.objective, ...t.distractor.objectivePatch } : t.objective;
    const o2 = findOptimum(t, { constraints: after, objective: objAfter });
    const p2 = o2.point ? `(${o2.point.x.toFixed(2)}, ${o2.point.y.toFixed(2)})` : '-';
    console.log(`   -> pasca-event: optimum=${p2} Z=${o2.z === null ? '-' : o2.z.toFixed(2)}`);
    if (o2.empty) { console.log(`   !! PASCA-EVENT KOSONG`); problems++; }
    if (opt.point && o2.point && opt.point.x === o2.point.x && opt.point.y === o2.point.y) {
      console.log(`   !! optimum TIDAK bergeser setelah event - bukti K4 lemah`); problems++;
    }
  }
}
console.log(`\nTotal masalah: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
