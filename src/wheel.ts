// Builds the bottom rotating wheel.
//
// The wheel carries the four data scales painted on a real ductulator:
//   • Air Quantity (CFM) — outermost log scale
//   • Velocity (FPM)     — inner log scale
//   • Round Duct Diameter (in) — inner-most log scale
//   • Equivalent rectangular curves — fan at the bottom
//
// All scales rotate together. The angular layout uses log positions so that
// alignment with the fixed friction-loss scale on the top card produces
// correct ductulator behavior in tandem with the math in `ductulator.ts`.

import { el, tick, radialLabel } from "./svg.js";

export const WHEEL_VIEW = 1000; // viewBox is -500..500 in both axes

// Angular layout (degrees clockwise from 12 o'clock).
// Each scale spans ARC_DEG; CFM uses 1.9 deg per log10 unit so it co-rotates
// correctly with the card friction scale (1.0 deg per log10 unit).
const CFM_DEG_PER_LOG = 76;     // 1.9 × 40
const FRICTION_DEG_PER_LOG = 40;
const VEL_DEG_PER_LOG = 76;     // share spacing with CFM (paired display)
const DIA_DEG_PER_LOG = 5.02 * 40; // diameter scale spacing

// A "neutral" rotation places these reference values at these card angles.
// (The card prints friction loss at top, arrow at left.)
export const WHEEL_NEUTRAL = {
  cfmRefValue: 1000,    // 1000 CFM ...
  cfmRefAngle: 0,       // ... at 12 o'clock when rotation = 0.
  velRefValue: 1000,
  velRefAngle: 90,      // 3 o'clock window for velocity/CFM pairing.
  diaRefValue: 10,
  diaRefAngle: 270,     // arrow on the card sits at 9 o'clock.
};

function logAt(value: number, ref: number, degPerLog: number, refAngle: number): number {
  return refAngle + degPerLog * Math.log10(value / ref);
}

export function cfmAngle(cfm: number): number {
  return logAt(cfm, WHEEL_NEUTRAL.cfmRefValue, CFM_DEG_PER_LOG, WHEEL_NEUTRAL.cfmRefAngle);
}

export function velAngle(vel: number): number {
  return logAt(vel, WHEEL_NEUTRAL.velRefValue, VEL_DEG_PER_LOG, WHEEL_NEUTRAL.velRefAngle);
}

export function diaAngle(d: number): number {
  return logAt(d, WHEEL_NEUTRAL.diaRefValue, DIA_DEG_PER_LOG, WHEEL_NEUTRAL.diaRefAngle);
}

export function frictionAngle(f: number): number {
  // Card-side scale: f reference is 0.1 in.wg/100ft at the 12 o'clock window.
  return logAt(f, 0.1, FRICTION_DEG_PER_LOG, 0);
}

// Compute the rotation that aligns input CFM with input friction at the top window.
// θ = frictionAngle(F) - cfmAngle(Q)  (in degrees, clockwise positive)
export function rotationFor(cfm: number, friction: number): number {
  return frictionAngle(friction) - cfmAngle(cfm);
}

// Build major + minor ticks for a log scale across [v0, v1].
function logTicks(v0: number, v1: number): { value: number; major: boolean }[] {
  const out: { value: number; major: boolean }[] = [];
  const startDecade = Math.floor(Math.log10(v0));
  const endDecade = Math.ceil(Math.log10(v1));
  for (let d = startDecade; d <= endDecade; d++) {
    const base = Math.pow(10, d);
    for (let m = 1; m < 10; m++) {
      const v = m * base;
      if (v < v0 || v > v1) continue;
      out.push({ value: v, major: m === 1 || m === 2 || m === 5 });
    }
  }
  return out;
}

const FACE = "#fbf9f3";
const RULE = "#1a1a1a";
const RULE_DIM = "#5a5a5a";
const ACCENT = "#b22222";

export function buildWheel(): SVGSVGElement {
  const svg = el("svg", {
    class: "layer-bottom",
    viewBox: `${-WHEEL_VIEW / 2} ${-WHEEL_VIEW / 2} ${WHEEL_VIEW} ${WHEEL_VIEW}`,
    "aria-label": "Ductulator wheel",
  });

  // Disc.
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 478, fill: FACE, stroke: "#c9c2af", "stroke-width": 2 }));

  // ----- CFM scale (outer) -----
  const cfmInner = 410;
  const cfmOuter = 470;
  const cfmText = 432;
  const cfmTicks = logTicks(30, 100000);
  const cfmGroup = el("g", { class: "scale cfm" });
  for (const t of cfmTicks) {
    const a = cfmAngle(t.value);
    if (Math.abs(a) > 175 && Math.abs(a) < 185) continue; // leave a little gap at bottom
    cfmGroup.appendChild(
      tick(t.major ? cfmInner : cfmInner + 18, cfmOuter, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.4 : 0.6,
      })
    );
    if (t.major) {
      cfmGroup.appendChild(
        radialLabel(cfmText, a, formatNum(t.value), {
          fill: RULE,
          "font-size": 18,
          "font-family": "Arial, Helvetica, sans-serif",
          "font-weight": "600",
        })
      );
    }
  }
  svg.appendChild(cfmGroup);

  // ----- Velocity FPM scale -----
  const velInner = 320;
  const velOuter = 380;
  const velText = 348;
  const velTicks = logTicks(300, 12000);
  const velGroup = el("g", { class: "scale vel" });
  for (const t of velTicks) {
    const a = velAngle(t.value);
    velGroup.appendChild(
      tick(t.major ? velInner : velInner + 16, velOuter, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.2 : 0.5,
      })
    );
    if (t.major) {
      velGroup.appendChild(
        radialLabel(velText, a, formatNum(t.value), {
          fill: RULE,
          "font-size": 14,
          "font-family": "Arial, Helvetica, sans-serif",
        })
      );
    }
  }
  svg.appendChild(velGroup);

  // ----- Duct Diameter scale -----
  const diaInner = 180;
  const diaOuter = 240;
  const diaText = 208;
  const diaTicks = logTicks(3, 60).filter((t) => t.value <= 60);
  const diaGroup = el("g", { class: "scale dia" });
  for (const t of diaTicks) {
    const a = diaAngle(t.value);
    diaGroup.appendChild(
      tick(t.major ? diaInner : diaInner + 14, diaOuter, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.2 : 0.5,
      })
    );
    if (t.major) {
      diaGroup.appendChild(
        radialLabel(diaText, a, formatNum(t.value), {
          fill: RULE,
          "font-size": 13,
          "font-family": "Arial, Helvetica, sans-serif",
        })
      );
    }
  }
  svg.appendChild(diaGroup);

  // ----- Equivalent rectangular curves (decorative fan at bottom) -----
  const fan = el("g", { class: "scale rect-fan", transform: "translate(0,260)" });
  const sizes = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80];
  for (const s of sizes) {
    const t = (s - 3) / (80 - 3);
    const angle = -75 + 150 * t;
    const rad = (angle * Math.PI) / 180;
    const len = 180 + 40 * t;
    const x = len * Math.sin(rad);
    const y = len * Math.cos(rad);
    fan.appendChild(
      el("path", {
        d: `M 0 0 Q ${x * 0.55} ${y * 0.95} ${x} ${y}`,
        fill: "none",
        stroke: RULE_DIM,
        "stroke-width": 0.7,
      })
    );
  }
  svg.appendChild(fan);

  // Center hub.
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 14, fill: "#3a3022", stroke: RULE, "stroke-width": 1 }));
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 4, fill: "#181410" }));

  // Tiny scale labels engraved on the wheel.
  svg.appendChild(
    el(
      "text",
      {
        x: 0,
        y: 50,
        "text-anchor": "middle",
        fill: RULE_DIM,
        "font-size": 11,
        "font-family": "Arial, Helvetica, sans-serif",
        "letter-spacing": "0.18em",
      },
      ["AZA · DUCTULATOR"]
    )
  );
  svg.appendChild(
    el(
      "text",
      {
        x: 0,
        y: 70,
        "text-anchor": "middle",
        fill: ACCENT,
        "font-size": 9,
        "font-family": "Arial, Helvetica, sans-serif",
        "letter-spacing": "0.22em",
      },
      ["MODEL 21 · 18760"]
    )
  );

  return svg;
}

function formatNum(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)},000`.replace(",000", ",000");
  if (v >= 1000) return v.toLocaleString();
  if (v >= 1 && Number.isInteger(v)) return String(v);
  return String(v);
}
