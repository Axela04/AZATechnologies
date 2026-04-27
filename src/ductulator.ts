// AZA Ductulator math.
//
// Approximates friction loss in straight, round, galvanized metal duct
// (absolute roughness ≈ 0.0003 ft) over the practical HVAC range. The Wright
// form used by manual ductulators:
//
//   ΔP/100ft (in. wg) ≈ 0.109136 · Q^1.9 / D^5.02
//
// where Q is airflow in CFM and D is round-duct inside diameter in inches.
// Velocity: V (FPM) = 183.346 · Q / D²  (Q in CFM, D in in.).
// Equivalent rectangular: Huebscher's equation,
//   De = 1.30 · (a·b)^0.625 / (a+b)^0.25.
//
// Self-check (matches the printed example: 300 CFM @ 0.08 in.wg/100 ft):
//   D ≈ 9.21 in,  V ≈ 648 FPM,  6×12 or 5×15 rectangular.

export interface DuctSolution {
  cfm: number;
  friction: number; // in. wg per 100 equivalent ft of duct
  velocityFpm: number;
  diameterIn: number;
  rectangular: { a: number; b: number }[]; // a few common aspect-ratio pairs
}

export const FRICTION_K = 0.109136;
export const FRICTION_Q_EXP = 1.9;
export const FRICTION_D_EXP = 5.02;

export function frictionLoss(cfm: number, diameterIn: number): number {
  return (FRICTION_K * Math.pow(cfm, FRICTION_Q_EXP)) / Math.pow(diameterIn, FRICTION_D_EXP);
}

export function diameterFor(cfm: number, friction: number): number {
  const d5 = (FRICTION_K * Math.pow(cfm, FRICTION_Q_EXP)) / friction;
  return Math.pow(d5, 1 / FRICTION_D_EXP);
}

export function velocity(cfm: number, diameterIn: number): number {
  return (183.346 * cfm) / (diameterIn * diameterIn);
}

// Huebscher: equivalent round diameter for a rectangular duct of sides a, b.
export function equivalentRound(a: number, b: number): number {
  return 1.3 * Math.pow(a * b, 0.625) * Math.pow(a + b, -0.25);
}

// For a target equivalent round diameter, return practical rectangular pairs.
// We pick a handful of standard aspect ratios and snap each side to the
// nearest 1-inch increment used by sheet-metal shops.
export function rectangularPairs(deIn: number): { a: number; b: number }[] {
  const aspects = [1, 1.5, 2, 3, 4];
  const seen = new Set<string>();
  const out: { a: number; b: number }[] = [];
  for (const r of aspects) {
    // Solve b such that 1.3 · (rb·b)^0.625 / (rb+b)^0.25 = de
    // Numerically — bisection on b.
    let lo = 1;
    let hi = 200;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const de = equivalentRound(r * mid, mid);
      if (de < deIn) lo = mid;
      else hi = mid;
    }
    const b = Math.max(1, Math.round((lo + hi) / 2));
    const a = Math.max(1, Math.round(r * b));
    const key = `${Math.min(a, b)}x${Math.max(a, b)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ a, b });
    }
  }
  return out;
}

export function solve(cfm: number, friction: number): DuctSolution {
  const diameterIn = diameterFor(cfm, friction);
  return {
    cfm,
    friction,
    velocityFpm: velocity(cfm, diameterIn),
    diameterIn,
    rectangular: rectangularPairs(diameterIn),
  };
}
