// Fixed indicator overlay — hairlines + dynamic value plaques sitting at the
// "read here" positions on the card. The plaques mirror what the ductulator's
// printed scales would show at the current alignment.

import { el, polar } from "./svg.js";
import { WHEEL_VIEW, frictionAngle, cfmAngle } from "./wheel.js";

export interface IndicatorRefs {
  svg: SVGSVGElement;
  topAlignLine: SVGLineElement;
  topPair: SVGTextElement;
  diaPlaque: SVGTextElement;
  velPlaque: SVGTextElement;
  rectPlaque: SVGTextElement;
}

const ACCENT = "#c43227";
const RULE = "#1a1a1a";

export function buildIndicators(): IndicatorRefs {
  const svg = el("svg", {
    class: "layer-indicators",
    viewBox: `${-WHEEL_VIEW / 2} ${-WHEEL_VIEW / 2} ${WHEEL_VIEW} ${WHEEL_VIEW}`,
    "aria-hidden": "true",
  });

  // The TOP hairline shows the CFM↔friction-loss alignment. Its angle moves
  // with the user's chosen friction loss (so it always sits where the
  // friction-loss tick is on the card).
  const topAlignLine = el("line", {
    x1: 0,
    y1: -360,
    x2: 0,
    y2: -498,
    stroke: ACCENT,
    "stroke-width": 2,
    "stroke-linecap": "round",
    opacity: 0.85,
  });
  svg.appendChild(topAlignLine);

  // Right-window indicator (CFM/FPM read-pair).
  hairline(svg, 100, 285, 460, ACCENT, 1.5);

  // Bottom rectangular indicator.
  hairline(svg, 190, 0, 480, ACCENT, 1.2);

  // Plaques — placed inside the card's masked area near each window.
  const topPair = plaque(svg, polar(335, 0), 240, 64, 26, RULE, "ALIGNMENT");
  const diaPlaque = plaque(svg, { x: -260, y: 70 }, 170, 80, 36, RULE, "DUCT DIAMETER");
  const velPlaque = plaque(svg, { x: 260, y: 70 }, 170, 64, 24, RULE, "VELOCITY");
  const rectPlaque = plaque(svg, polar(180, 190), 180, 64, 24, RULE, "RECTANGULAR");

  return { svg, topAlignLine, topPair, diaPlaque, velPlaque, rectPlaque };

  function hairline(parent: SVGElement, deg: number, r0: number, r1: number, color: string, w: number) {
    const a = polar(r0, deg);
    const b = polar(r1, deg);
    parent.appendChild(
      el("line", {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: color,
        "stroke-width": w,
        "stroke-linecap": "round",
        opacity: 0.85,
      })
    );
  }

  function plaque(
    parent: SVGElement,
    p: { x: number; y: number },
    w: number,
    h: number,
    size: number,
    color: string,
    captionStr: string
  ): SVGTextElement {
    const g = el("g");
    g.appendChild(
      el("rect", {
        x: p.x - w / 2,
        y: p.y - h / 2,
        width: w,
        height: h,
        rx: 8,
        fill: "#fffaf0",
        stroke: ACCENT,
        "stroke-width": 1.4,
        opacity: 0.95,
      })
    );
    g.appendChild(
      el(
        "text",
        {
          x: p.x,
          y: p.y - h / 2 + 14,
          "text-anchor": "middle",
          fill: ACCENT,
          "font-size": 10,
          "font-weight": 800,
          "letter-spacing": "0.18em",
          "font-family": "Arial, Helvetica, sans-serif",
        },
        [captionStr]
      )
    );
    const t = el(
      "text",
      {
        x: p.x,
        y: p.y + 12,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: color,
        "font-size": size,
        "font-weight": 800,
        "font-family": "Arial, Helvetica, sans-serif",
      },
      ["—"]
    );
    g.appendChild(t);
    parent.appendChild(g);
    return t;
  }
}

// Position the top alignment hairline at the card angle of the chosen
// friction-loss value. (No physics, just a scale-position lookup.)
export function placeTopAlign(line: SVGLineElement, friction: number): void {
  const a = frictionAngle(friction);
  line.setAttribute("transform", `rotate(${a})`);
  void cfmAngle; // tree-shake guard for re-exports
}
