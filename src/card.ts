// Builds the top fixed card overlay — a cream-colored disc with cutout
// windows that expose the rotating wheel beneath. The card carries the
// printed friction-loss scale, the duct-diameter arrow, the rectangular
// dimensions scale, AZA branding, and the instructions block.

import { el, polar, tick, radialLabel } from "./svg.js";
import { frictionAngle, WHEEL_VIEW } from "./wheel.js";

const FACE = "#f4f1ea";
const RULE = "#1a1a1a";
const ACCENT = "#c43227";

// Cutout window definitions — angle in deg clockwise from 12, radii in SVG units.
const TOP_CUT = { aFrom: -55, aTo: 55, rIn: 370, rOut: 460 };
const RIGHT_CUT = { aFrom: 60, aTo: 135, rIn: 285, rOut: 460 };
const LEFT_CUT = { aFrom: -110, aTo: -70, rIn: 195, rOut: 270 };
const BOTTOM_CUT = { aFrom: 155, aTo: 225, rIn: 0, rOut: 480 };

export function buildCard(): SVGSVGElement {
  const svg = el("svg", {
    class: "layer-top",
    viewBox: `${-WHEEL_VIEW / 2} ${-WHEEL_VIEW / 2} ${WHEEL_VIEW} ${WHEEL_VIEW}`,
    "aria-hidden": "true",
  });

  // The top layer is a cream disc with arc-shaped cutouts (even-odd fill rule).
  const path = [
    `M 488 0 A 488 488 0 1 0 -488 0 A 488 488 0 1 0 488 0 Z`,
    cutoutWedge(TOP_CUT),
    cutoutWedge(RIGHT_CUT),
    cutoutWedge(LEFT_CUT),
    // Bottom is a true wedge (open all the way to center) so the rect-fan curves
    // are clearly visible.
    bottomWedge(BOTTOM_CUT),
  ].join(" ");
  svg.appendChild(
    el("path", {
      d: path,
      fill: FACE,
      "fill-rule": "evenodd",
      stroke: "#bcb39e",
      "stroke-width": 2,
    })
  );

  // Subtle inner trim ring on the card.
  svg.appendChild(el("circle", { cx: 0, cy: 0, r: 480, fill: "none", stroke: "#e0d8c4", "stroke-width": 1 }));

  // ===================== TOP WINDOW =====================
  // Friction-loss scale printed ABOVE the cutout (radii > rOut).
  const fGroup = el("g", { class: "card friction" });
  const fInner = TOP_CUT.rOut + 5;
  const fOuter = fInner + 18;
  const fText = fOuter + 8;
  const fValues: [number, boolean][] = [
    [0.01, true], [0.015, false], [0.02, true], [0.03, false], [0.04, false],
    [0.05, true], [0.06, false], [0.08, false], [0.10, true], [0.15, false],
    [0.20, true], [0.30, false], [0.40, false], [0.50, true], [0.70, false],
    [1.0, true], [1.5, false], [2.0, true], [3.0, false], [5.0, true],
  ];
  for (const [v, major] of fValues) {
    const a = frictionAngle(v);
    if (a < TOP_CUT.aFrom + 2 || a > TOP_CUT.aTo - 2) continue;
    fGroup.appendChild(tick(fInner, fOuter, a, { stroke: RULE, "stroke-width": major ? 1.4 : 0.6 }));
    if (major) {
      fGroup.appendChild(
        radialLabel(fText, a, fmtFric(v), {
          fill: RULE,
          "font-size": 12,
          "font-family": "Arial, Helvetica, sans-serif",
          "font-weight": "600",
        })
      );
    }
  }
  svg.appendChild(fGroup);

  svg.appendChild(
    textArc(fText + 16, TOP_CUT.aFrom + 8, TOP_CUT.aTo - 8, "FRICTION LOSS · In. of Water · per 100 ft of duct", {
      fill: ACCENT,
      "font-size": 13,
      "font-weight": 700,
      "letter-spacing": "0.04em",
    })
  );
  // CFM legend printed inside the cutout's lower edge.
  svg.appendChild(
    textArc(TOP_CUT.rIn - 10, TOP_CUT.aFrom + 12, TOP_CUT.aTo - 12, "AIR QUANTITY · CFM", {
      fill: ACCENT,
      "font-size": 12,
      "font-weight": 700,
      "letter-spacing": "0.18em",
    })
  );

  // ===================== RIGHT WINDOW =====================
  svg.appendChild(
    textArc(TOP_CUT.rOut + 8, RIGHT_CUT.aFrom + 6, RIGHT_CUT.aTo - 6, "AIR QUANTITY · CFM", {
      fill: ACCENT,
      "font-size": 12,
      "font-weight": 700,
      "letter-spacing": "0.16em",
    })
  );
  svg.appendChild(
    textArc(RIGHT_CUT.rIn - 14, RIGHT_CUT.aFrom + 6, RIGHT_CUT.aTo - 6, "VELOCITY · FPM", {
      fill: ACCENT,
      "font-size": 12,
      "font-weight": 700,
      "letter-spacing": "0.16em",
    })
  );

  // ===================== LEFT ARROW =====================
  const arrowTip = polar(LEFT_CUT.rOut + 4, -90);
  const arrowBase1 = polar(LEFT_CUT.rOut + 30, -97);
  const arrowBase2 = polar(LEFT_CUT.rOut + 30, -83);
  svg.appendChild(
    el("polygon", {
      points: `${arrowTip.x},${arrowTip.y} ${arrowBase1.x},${arrowBase1.y} ${arrowBase2.x},${arrowBase2.y}`,
      fill: RULE,
    })
  );
  svg.appendChild(
    textArc(LEFT_CUT.rOut + 50, -130, -50, "DUCT DIAMETER · In.", {
      fill: ACCENT,
      "font-size": 12,
      "font-weight": 700,
      "letter-spacing": "0.16em",
    })
  );

  // ===================== BOTTOM RECT SCALE (printed on card edge above wedge) =====================
  svg.appendChild(
    textArc(490, BOTTOM_CUT.aFrom - 18, BOTTOM_CUT.aTo + 18, "RECTANGULAR DUCT DIMENSIONS · INCHES", {
      fill: ACCENT,
      "font-size": 11,
      "font-weight": 700,
      "letter-spacing": "0.14em",
    })
  );
  // Small tick row just inside the wedge mouth so the rectangular scale is
  // readable next to the wheel's curve fan.
  const rectVals = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 40, 50, 60, 80];
  const rectGroup = el("g", { class: "card rect" });
  for (const s of rectVals) {
    const t = Math.log10(s / 3) / Math.log10(80 / 3);
    const a = BOTTOM_CUT.aFrom + (BOTTOM_CUT.aTo - BOTTOM_CUT.aFrom) * t;
    rectGroup.appendChild(tick(485, 472, a, { stroke: RULE, "stroke-width": 1 }));
    rectGroup.appendChild(
      radialLabel(465, a, String(s), {
        fill: RULE,
        "font-size": 11,
        "font-family": "Arial, Helvetica, sans-serif",
        "font-weight": "600",
      })
    );
  }
  svg.appendChild(rectGroup);

  // ===================== CENTER BRANDING + INSTRUCTIONS =====================
  const center = el("g", { class: "center-print" });
  center.appendChild(text(0, -110, "AZA TECHNOLOGIES", {
    fill: ACCENT,
    "font-size": 18,
    "font-weight": 800,
    "font-family": "Arial Black, Arial, sans-serif",
    "letter-spacing": "0.08em",
    "text-anchor": "middle",
  }));
  center.appendChild(text(0, -78, "AIR DUCT", {
    fill: ACCENT,
    "font-size": 30,
    "font-weight": 900,
    "font-family": "Arial Black, Arial, sans-serif",
    "text-anchor": "middle",
  }));
  center.appendChild(text(0, -42, "CALCULATOR", {
    fill: ACCENT,
    "font-size": 30,
    "font-weight": 900,
    "font-family": "Arial Black, Arial, sans-serif",
    "text-anchor": "middle",
  }));
  center.appendChild(text(0, -10, "Metal Duct Only", {
    fill: RULE,
    "font-size": 18,
    "font-weight": 700,
    "font-family": "Arial, Helvetica, sans-serif",
    "text-anchor": "middle",
  }));

  center.appendChild(
    text(0, 28, "Spin to align CFM with Friction Loss · read D, FPM, Rectangular at the indicators", {
      fill: RULE,
      "font-size": 11,
      "font-family": "Arial, Helvetica, sans-serif",
      "letter-spacing": "0.04em",
      "text-anchor": "middle",
      opacity: 0.65,
    })
  );
  svg.appendChild(center);

  return svg;
}

function fmtFric(v: number): string {
  if (v < 0.1) return v.toFixed(2).replace(/^0/, ".");
  if (v < 1) return v.toFixed(1).replace(/^0/, ".");
  return v.toFixed(1);
}

function text(x: number, y: number, str: string, attrs: Record<string, string | number> = {}): SVGTextElement {
  return el("text", { x, y, ...attrs }, [str]);
}

// Cut a curved annular wedge.
function cutoutWedge({ aFrom, aTo, rIn, rOut }: { aFrom: number; aTo: number; rIn: number; rOut: number }): string {
  const a = polar(rOut, aFrom);
  const b = polar(rOut, aTo);
  const c = polar(rIn, aTo);
  const d = polar(rIn, aFrom);
  const sweep = aTo - aFrom;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return [
    `M ${a.x} ${a.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${d.x} ${d.y}`,
    `Z`,
  ].join(" ");
}

// Cut a pie wedge that goes all the way to the center (used for the bottom).
function bottomWedge({ aFrom, aTo, rOut }: { aFrom: number; aTo: number; rIn: number; rOut: number }): string {
  const a = polar(rOut, aFrom);
  const b = polar(rOut, aTo);
  const sweep = aTo - aFrom;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return [
    `M 0 0`,
    `L ${a.x} ${a.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${b.x} ${b.y}`,
    `Z`,
  ].join(" ");
}

let arcId = 0;
function textArc(
  r: number,
  startDeg: number,
  endDeg: number,
  str: string,
  attrs: Record<string, string | number> = {}
): SVGGElement {
  const g = el("g");
  const id = `arc-${arcId++}`;
  const start = polar(r, startDeg);
  const end = polar(r, endDeg);
  const sweep = endDeg - startDeg;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  const defs = el("defs");
  defs.appendChild(
    el("path", {
      id,
      d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${sweepFlag} ${end.x} ${end.y}`,
      fill: "none",
    })
  );
  g.appendChild(defs);
  const t = el("text", { "font-family": "Arial, Helvetica, sans-serif", ...attrs });
  t.appendChild(el("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, [str]));
  g.appendChild(t);
  return g;
}
