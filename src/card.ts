// Builds the top fixed card overlay (the cream-colored mask with cutouts,
// printed friction-loss scale, AZA Technologies branding, instructions, and
// the indicator arrow that points to the duct-diameter on the wheel beneath).

import { el, polar, tick, radialLabel } from "./svg.js";
import { frictionAngle, WHEEL_VIEW } from "./wheel.js";

const FACE = "#f4f1ea";
const RULE = "#1a1a1a";
const ACCENT = "#c43227";

export function buildCard(): SVGSVGElement {
  const svg = el("svg", {
    class: "layer-top",
    viewBox: `${-WHEEL_VIEW / 2} ${-WHEEL_VIEW / 2} ${WHEEL_VIEW} ${WHEEL_VIEW}`,
    "aria-hidden": "true",
  });

  // The top layer is a cream-colored disc with arc-shaped cutouts so the wheel
  // beneath shows through. We use even-odd fill to punch holes.
  const path = [
    // Outer card boundary — slightly larger circle.
    `M 495 0 A 495 495 0 1 0 -495 0 A 495 495 0 1 0 495 0 Z`,
    // Inner mask circle that exposes the wheel rim (we keep most of the disc
    // covered but expose a wide ring at the rim with the scale labels).
    cutoutWindow(370, 470, -38, 38),     // top window — friction loss / CFM
    cutoutWindow(290, 390, 50, 130),     // right window — velocity / CFM
    cutoutWindow(160, 250, -100, -50),   // left arrow window — duct diameter
    cutoutWindow(120, 250, 150, 220),    // bottom window — rectangular dimensions
  ].join(" ");

  svg.appendChild(
    el("path", {
      d: path,
      fill: FACE,
      "fill-rule": "evenodd",
      stroke: "#c9c2af",
      "stroke-width": 2,
    })
  );

  // ----- Top window: printed friction-loss scale around the cutout -----
  const fInner = 472;
  const fOuter = 492;
  const fText = 484;
  const frictionGroup = el("g", { class: "card friction" });
  const fValues = [
    [0.01, true],
    [0.02, false],
    [0.03, false],
    [0.04, false],
    [0.05, true],
    [0.06, false],
    [0.07, false],
    [0.08, false],
    [0.09, false],
    [0.1, true],
    [0.15, false],
    [0.2, true],
    [0.3, false],
    [0.4, false],
    [0.5, true],
    [0.7, false],
    [1.0, true],
    [1.5, false],
    [2.0, true],
    [3.0, false],
    [5.0, true],
  ] as const;
  for (const [v, major] of fValues) {
    const a = frictionAngle(v);
    if (a < -36 || a > 36) continue;
    frictionGroup.appendChild(
      tick(fInner, fOuter, a, { stroke: RULE, "stroke-width": major ? 1.2 : 0.6 })
    );
    if (major) {
      frictionGroup.appendChild(
        radialLabel(fText, a, v < 0.1 ? v.toFixed(2) : v < 1 ? v.toFixed(1) : v.toFixed(1), {
          fill: RULE,
          "font-size": 12,
          "font-family": "Arial, Helvetica, sans-serif",
        })
      );
    }
  }
  svg.appendChild(frictionGroup);

  // Friction loss label arc text.
  svg.appendChild(textArcLabel(440, -70, 70, "FRICTION LOSS, In. of Water · per 100 ft of duct", {
    fill: ACCENT,
    "font-size": 14,
    "font-weight": 600,
  }));

  // CFM label above top cutout.
  svg.appendChild(textArcLabel(498, -55, 55, "AIR QUANTITY · CFM", {
    fill: ACCENT,
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.16em",
  }));

  // ----- Right window labels -----
  svg.appendChild(textArcLabel(498, 60, 130, "AIR QUANTITY · CFM", {
    fill: ACCENT,
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.16em",
  }));
  svg.appendChild(textArcLabel(282, 60, 130, "VELOCITY · FPM", {
    fill: ACCENT,
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.16em",
  }));

  // ----- Left arrow + label (Duct Diameter) -----
  const arrowAt = polar(255, -90);
  svg.appendChild(
    el("polygon", {
      points: `${arrowAt.x},${arrowAt.y} ${arrowAt.x + 22},${arrowAt.y - 12} ${arrowAt.x + 22},${arrowAt.y + 12}`,
      fill: RULE,
    })
  );
  svg.appendChild(textArcLabel(298, -120, -60, "DUCT DIAMETER · In.", {
    fill: ACCENT,
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.16em",
  }));

  // ----- Bottom rectangular scale -----
  svg.appendChild(textArcLabel(498, 150, 220, "RECTANGULAR DUCT DIMENSIONS · INCHES", {
    fill: ACCENT,
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.14em",
  }));
  const rectInner = 462;
  const rectOuter = 482;
  const rectText = 472;
  const rectVals = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
  const rectGroup = el("g", { class: "card rect" });
  for (let i = 0; i < rectVals.length; i++) {
    const v = rectVals[i];
    const t = i / (rectVals.length - 1);
    const a = 150 + 70 * t;
    rectGroup.appendChild(
      tick(rectInner, rectOuter, a, { stroke: RULE, "stroke-width": v % 5 === 0 || v < 10 ? 1.2 : 0.6 })
    );
    rectGroup.appendChild(
      radialLabel(rectText, a, String(v), {
        fill: RULE,
        "font-size": 11,
        "font-family": "Arial, Helvetica, sans-serif",
      })
    );
  }
  svg.appendChild(rectGroup);

  // ----- Center branding & instructions -----
  const center = el("g", { class: "center-print" });
  center.appendChild(
    el(
      "text",
      {
        x: 0,
        y: -120,
        "text-anchor": "middle",
        fill: ACCENT,
        "font-size": 22,
        "font-weight": 800,
        "font-family": "Arial Black, Arial, sans-serif",
        "letter-spacing": "0.04em",
      },
      ["AZA TECHNOLOGIES"]
    )
  );
  center.appendChild(
    el(
      "text",
      {
        x: 0,
        y: -90,
        "text-anchor": "middle",
        fill: ACCENT,
        "font-size": 28,
        "font-weight": 800,
        "font-family": "Arial Black, Arial, sans-serif",
      },
      ["AIR DUCT"]
    )
  );
  center.appendChild(
    el(
      "text",
      {
        x: 0,
        y: -58,
        "text-anchor": "middle",
        fill: ACCENT,
        "font-size": 28,
        "font-weight": 800,
        "font-family": "Arial Black, Arial, sans-serif",
      },
      ["CALCULATOR"]
    )
  );
  center.appendChild(
    el(
      "text",
      {
        x: 0,
        y: -22,
        "text-anchor": "middle",
        fill: RULE,
        "font-size": 18,
        "font-weight": 700,
        "font-family": "Arial, Helvetica, sans-serif",
      },
      ["Metal Duct Only"]
    )
  );

  const instr: [string, string][] = [
    ["A", "Establish Air Quantity (CFM) and Friction Loss."],
    ["B", "Set Air Quantity (CFM) opposite of Friction Loss."],
    ["C", "Read Velocity (FPM) opposite of Air Quantity (CFM)."],
    ["D", "Read Duct Diameter opposite of arrow."],
    ["E", "Read Equivalent Rectangular Duct Dimensions."],
  ];
  center.appendChild(
    el(
      "text",
      {
        x: -160,
        y: 18,
        fill: RULE,
        "font-size": 11,
        "font-weight": 700,
        "font-family": "Arial, Helvetica, sans-serif",
        "letter-spacing": "0.06em",
      },
      ["INSTRUCTIONS:"]
    )
  );
  instr.forEach(([k, t], i) => {
    const y = 36 + i * 14;
    center.appendChild(
      el(
        "text",
        { x: -160, y, fill: RULE, "font-size": 10, "font-family": "Arial, Helvetica, sans-serif", "font-weight": 700 },
        [k]
      )
    );
    center.appendChild(
      el(
        "text",
        { x: -148, y, fill: RULE, "font-size": 10, "font-family": "Arial, Helvetica, sans-serif" },
        [t]
      )
    );
  });
  svg.appendChild(center);

  return svg;
}

// Inverse arc — used to subtract a window cutout from the card.
function cutoutWindow(rIn: number, rOut: number, startDeg: number, endDeg: number): string {
  const a = polar(rOut, startDeg);
  const b = polar(rOut, endDeg);
  const c = polar(rIn, endDeg);
  const d = polar(rIn, startDeg);
  const sweep = endDeg - startDeg;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return [
    `M ${a.x} ${a.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${d.x} ${d.y}`,
    `Z`,
  ].join(" ");
}

// Curved label that follows an arc using a hidden defs path.
let arcId = 0;
function textArcLabel(
  r: number,
  startDeg: number,
  endDeg: number,
  text: string,
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
  const tp = el("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, [text]);
  t.appendChild(tp);
  g.appendChild(t);
  return g;
}
