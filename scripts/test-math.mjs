// Math sanity tests against the Wright friction equation + Huebscher rectangular.
// Run: node scripts/test-math.mjs
//
// Anchors that DON'T come from us: the printed example on the physical card
// (300 CFM @ 0.08 in.wg → D=9.125", V=650 FPM, 6×12 / 5×15) and three
// cross-check rows derived from a published ASHRAE-style friction chart.

const FRICTION_K = 0.109136;
const Q_EXP = 1.9;
const D_EXP = 5.02;
const dia = (q, f) => Math.pow((FRICTION_K * Math.pow(q, Q_EXP)) / f, 1 / D_EXP);
const vel = (q, d) => (183.346 * q) / (d * d);
const huebscher = (a, b) => 1.3 * Math.pow(a * b, 0.625) * Math.pow(a + b, -0.25);

const cases = [
  // Card-printed truth
  ["Card example", 300, 0.08, 9.125, 650, 0.25, 10],
  // Cross-checks against ASHRAE-style chart readings (typical accuracy ±2%)
  ["1000 cfm @ 0.10", 1000, 0.10, 13.9, 950, 0.4, 50],
  ["5000 cfm @ 0.10", 5000, 0.10, 25.6, 1400, 0.6, 60],
  ["500 cfm @ 0.10", 500, 0.10, 10.7, 800, 0.4, 40],
];

let pass = 0,
  fail = 0;
for (const [name, q, f, eD, eV, tD, tV] of cases) {
  const d = dia(q, f);
  const v = vel(q, d);
  const okD = Math.abs(d - eD) <= tD;
  const okV = Math.abs(v - eV) <= tV;
  const ok = okD && okV;
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "OK  " : "FAIL"}  ${name.padEnd(18)}  D=${d.toFixed(2)} (exp ${eD})  V=${v.toFixed(0)} (exp ${eV})`
  );
}

const r612 = huebscher(6, 12);
const r515 = huebscher(5, 15);
const okHb = Math.abs(r612 - 9.13) < 0.05 && Math.abs(r515 - 9.13) < 0.1;
okHb ? pass++ : fail++;
console.log(`${okHb ? "OK  " : "FAIL"}  Huebscher 6×12=${r612.toFixed(2)}  5×15=${r515.toFixed(2)}`);

// Huebscher round-trip via the bisection used in src.
function rectPairsFor(de) {
  const aspects = [1, 1.5, 2, 3, 4];
  const seen = new Set();
  const out = [];
  for (const r of aspects) {
    let lo = 1,
      hi = 200;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      huebscher(r * mid, mid) < de ? (lo = mid) : (hi = mid);
    }
    const b = Math.max(1, Math.round((lo + hi) / 2));
    const a = Math.max(1, Math.round(r * b));
    const k = `${Math.min(a, b)}x${Math.max(a, b)}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push([a, b]);
    }
  }
  return out;
}
const pairs = rectPairsFor(9.21);
console.log(`Pairs for D=9.21: ${pairs.map((p) => p.join("×")).join(", ")}`);
const has612or515 = pairs.some(([a, b]) => (a === 6 && b === 12) || (a === 5 && b === 15) || (a === 12 && b === 6));
has612or515 ? pass++ : fail++;
console.log(`${has612or515 ? "OK  " : "FAIL"}  Pairs include 6×12 or 5×15 (card example)`);

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
