// Tiny SVG helpers — no framework, just builders.

export const SVG_NS = "http://www.w3.org/2000/svg";

export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  children: (Node | string)[] = []
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

// Polar → Cartesian where angle is degrees clockwise from 12 o'clock.
export function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

// Build an SVG arc path between two angles (clockwise).
export function arcPath(r: number, startDeg: number, endDeg: number): string {
  const start = polar(r, startDeg);
  const end = polar(r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

// A radial tick mark from r0 → r1 at angle deg.
export function tick(r0: number, r1: number, deg: number, attrs: Record<string, string | number> = {}) {
  const a = polar(r0, deg);
  const b = polar(r1, deg);
  return el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...attrs });
}

// A label rotated tangentially at given radius/angle.
export function radialLabel(
  r: number,
  deg: number,
  text: string,
  attrs: Record<string, string | number> = {},
  flip = false
) {
  const p = polar(r, deg);
  const rotate = deg + (flip ? 90 : -90);
  return el(
    "text",
    {
      x: p.x,
      y: p.y,
      transform: `rotate(${rotate} ${p.x} ${p.y})`,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      ...attrs,
    },
    [text]
  );
}
