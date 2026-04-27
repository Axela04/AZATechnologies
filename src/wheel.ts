// Builds the bottom rotating wheel.
//
// The wheel carries the four scales painted on a real ductulator. Radii are
// chosen so each scale lines up with a cutout window on the top card.

import { el, polar, tick, radialLabel } from "./svg.js";

export const WHEEL_VIEW = 1000; // viewBox is -500..500 in both axes

// Scale spacing — calibrated so visual alignment matches the friction equation.
// (CFM scale × 1.9 deg/decade + friction × 1.0 deg/decade gives a self-consistent
// rotation; see ductulator.ts for the equation.)
const CFM_DEG_PER_LOG = 80;          // 1.9 × ~42 — fits 30..100 000 in ~280°
const FRICTION_DEG_PER_LOG = 80 / 1.9; // ~42 deg per decade of friction loss
const VEL_DEG_PER_LOG = 80;
const DIA_DEG_PER_LOG = 5.02 * (80 / 1.9); // diameter scale, locked to friction math

// Reference rotations: at rotation = 0, these wheel values appear at these
// fixed card angles.
export const WHEEL_NEUTRAL = {
  cfmRefValue: 1000,
  cfmRefAngle: 0,
  velRefValue: 1000,
  velRefAngle: 90,
  diaRefValue: 10,
  diaRefAngle: -90,
};

function logAt(value: number, ref: number, degPerLog: number, refAngle: number): number {
  return refAngle + degPerLog * Math.log10(value / ref);
}

export function cfmAngle(cfm: number): number {
  return logAt(cfm, WHEEL_NEUTRAL.cfmRefValue, CFM_DEG_PER_LOG, WHEEL_NEUTRAL.cfmRefAngle);
}
export function velAngle(v: number): number {
  return logAt(v, WHEEL_NEUTRAL.velRefValue, VEL_DEG_PER_LOG, WHEEL_NEUTRAL.velRefAngle);
}
export function diaAngle(d: number): number {
  return logAt(d, WHEEL_NEUTRAL.diaRefValue, DIA_DEG_PER_LOG, WHEEL_NEUTRAL.diaRefAngle);
}

// Card-side friction-loss scale (printed on the top layer, fixed). Reference
// 0.1 in.wg/100 ft sits at 12 o'clock so the card shows "0.1" near the top.
export function frictionAngle(f: number): number {
  return logAt(f, 0.1, FRICTION_DEG_PER_LOG, 0);
}

// Rotation that aligns input CFM with input friction loss in the top window.
export function rotationFor(cfm: number, friction: number): number {
  return frictionAngle(friction) - cfmAngle(cfm);
}

// Inverse for drag interaction: given current rotation + friction, recover CFM.
export function cfmFromRotation(rot: number, friction: number): number {
  const target = frictionAngle(friction) - rot;
  // target = CFM_DEG_PER_LOG * log10(Q/1000) ⇒ Q = 1000 * 10^(target / CFM_DEG_PER_LOG)
  return 1000 * Math.pow(10, target / CFM_DEG_PER_LOG);
}

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

function formatNum(v: number): string {
  if (v >= 10000) return `${Math.round(v / 1000)},000`;
  if (v >= 1000) return v.toLocaleString();
  return String(v);
}

export function buildWheel(): SVGSVGElement {
  const svg = el("svg", {
    class: "layer-bottom",
    viewBox: `${-WHEEL_VIEW / 2} ${-WHEEL_VIEW / 2} ${WHEEL_VIEW} ${WHEEL_VIEW}`,
    "aria-label": "Ductulator wheel",
  });

  // Disc.
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 488, fill: FACE, stroke: "#c9c2af", "stroke-width": 2 }));
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 482, fill: "none", stroke: "#e6dfca", "stroke-width": 1 }));

  // ----- CFM scale (outermost) -----
  const cfmGroup = el("g", { class: "scale cfm" });
  for (const t of logTicks(30, 100000)) {
    const a = cfmAngle(t.value);
    cfmGroup.appendChild(
      tick(t.major ? 405 : 425, 470, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.6 : 0.8,
      })
    );
    if (t.major) {
      cfmGroup.appendChild(
        radialLabel(390, a, formatNum(t.value), {
          fill: RULE,
          "font-size": t.value >= 10000 ? 18 : 22,
          "font-family": "Arial, Helvetica, sans-serif",
          "font-weight": "700",
        })
      );
    }
  }
  svg.appendChild(cfmGroup);

  // ----- Velocity FPM scale -----
  const velGroup = el("g", { class: "scale vel" });
  for (const t of logTicks(300, 12000)) {
    const a = velAngle(t.value);
    velGroup.appendChild(
      tick(t.major ? 320 : 335, 365, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.4 : 0.6,
      })
    );
    if (t.major) {
      velGroup.appendChild(
        radialLabel(305, a, formatNum(t.value), {
          fill: RULE,
          "font-size": 16,
          "font-family": "Arial, Helvetica, sans-serif",
          "font-weight": "600",
        })
      );
    }
  }
  svg.appendChild(velGroup);

  // ----- Duct Diameter scale -----
  const diaGroup = el("g", { class: "scale dia" });
  for (const t of logTicks(3, 60).filter((t) => t.value <= 60)) {
    const a = diaAngle(t.value);
    diaGroup.appendChild(
      tick(t.major ? 215 : 225, 255, a, {
        stroke: RULE,
        "stroke-width": t.major ? 1.4 : 0.6,
      })
    );
    if (t.major) {
      diaGroup.appendChild(
        radialLabel(200, a, formatNum(t.value), {
          fill: RULE,
          "font-size": 16,
          "font-family": "Arial, Helvetica, sans-serif",
          "font-weight": "600",
        })
      );
    }
  }
  svg.appendChild(diaGroup);

  // ----- Equivalent rectangular curves (fan from a focal point near bottom) -----
  // Each curve emanates from the center (~y=0) and ends at a labeled rectangular
  // size on the wheel rim, so when the wheel rotates the right curve passes
  // through the rectangular scale on the card.
  const fan = el("g", { class: "scale rect-fan" });
  const sizes = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 50, 60, 70, 80];
  for (const s of sizes) {
    // Lay out curves across the bottom 70° span (160°..230° in card coords).
    const t = Math.log10(s / 3) / Math.log10(80 / 3);
    const angle = 160 + 70 * t;
    const end = polar(465, angle);
    const mid = polar(280, angle);
    fan.appendChild(
      el("path", {
        d: `M 0 0 Q ${mid.x} ${mid.y} ${end.x} ${end.y}`,
        fill: "none",
        stroke: RULE_DIM,
        "stroke-width": 0.7,
      })
    );
    fan.appendChild(
      radialLabel(450, angle, String(s), {
        fill: RULE,
        "font-size": 11,
        "font-family": "Arial, Helvetica, sans-serif",
      })
    );
  }
  svg.appendChild(fan);

  // Center hub.
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 18, fill: "#3a3022", stroke: RULE, "stroke-width": 1 }));
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 6, fill: "#181410" }));

  // Tiny scale labels engraved on the wheel center area (visible behind cutouts).
  svg.appendChild(
    el(
      "text",
      {
        x: 0,
        y: 60,
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
        y: 80,
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
