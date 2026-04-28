// AZA Ductulator — entry point.
//
// The wheel and card are a mechanical alignment instrument: spin the wheel so
// the chosen CFM aligns with the chosen friction loss; the diameter, velocity,
// and equivalent rectangular dimensions are read at the indicators printed on
// the card. (Scale spacing is calibrated so the readings stay self-consistent.)

import { buildWheel, rotationFor, cfmFromRotation } from "./wheel.js";
import { buildCard } from "./card.js";
import { buildIndicators, placeTopAlign } from "./indicators.js";

// --- helpers -----------------------------------------------------------------

const FRICTION_K = 0.109136;
const Q_EXP = 1.9;
const D_EXP = 5.02;
function diameterFor(cfm: number, friction: number): number {
  return Math.pow((FRICTION_K * Math.pow(cfm, Q_EXP)) / friction, 1 / D_EXP);
}
function velocityFor(cfm: number, d: number): number {
  return (183.346 * cfm) / (d * d);
}

// Pick a representative rectangular pair off the printed scale based on D.
function rectFor(d: number): string {
  const t: Array<[number, string]> = [
    [4, "4 × 4"],
    [5, "5 × 4"],
    [6, "6 × 5"],
    [7, "8 × 5"],
    [8, "8 × 7"],
    [9, "10 × 6"],
    [10, "12 × 6"],
    [11, "12 × 8"],
    [12, "14 × 8"],
    [13, "14 × 10"],
    [14, "16 × 10"],
    [15, "16 × 12"],
    [16, "18 × 12"],
    [18, "20 × 14"],
    [20, "24 × 14"],
    [22, "26 × 16"],
    [25, "30 × 18"],
    [28, "32 × 22"],
    [32, "38 × 24"],
    [36, "42 × 28"],
  ];
  for (const [b, s] of t) if (d <= b) return s;
  return "—";
}

// --- DOM wiring --------------------------------------------------------------

const container = document.getElementById("wheelContainer")!;
const cfmInput = document.getElementById("cfmInput") as HTMLInputElement;
const frictionInput = document.getElementById("frictionInput") as HTMLInputElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

const wheel = buildWheel();
const card = buildCard();
const indicators = buildIndicators();
container.appendChild(wheel);
container.appendChild(card);
container.appendChild(indicators.svg);

let rotation = 0;

function setRotation(deg: number, animate = false) {
  rotation = wrap(deg);
  wheel.style.transition = animate ? "transform 350ms cubic-bezier(.4,.0,.2,1)" : "none";
  wheel.style.transform = `rotate(${rotation}deg)`;
  refresh();
}

function wrap(d: number): number {
  let v = d % 360;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return v;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function inputs() {
  return {
    cfm: clamp(parseFloat(cfmInput.value) || 0, 30, 100000),
    friction: clamp(parseFloat(frictionInput.value) || 0, 0.01, 5),
  };
}

function refresh() {
  const { cfm, friction } = inputs();
  const d = diameterFor(cfm, friction);
  const v = velocityFor(cfm, d);
  indicators.topPair.textContent = `${formatCfm(cfm)} CFM ↔ ${formatFric(friction)}`;
  indicators.diaPlaque.textContent = `${d.toFixed(2)}″`;
  indicators.velPlaque.textContent = `${Math.round(v)} FPM`;
  indicators.rectPlaque.textContent = rectFor(d);
  placeTopAlign(indicators.topAlignLine, friction);
}

function formatCfm(v: number): string {
  if (v >= 10000) return `${Math.round(v / 1000)},000`;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(Math.round(v));
}
function formatFric(v: number): string {
  if (v < 0.1) return v.toFixed(3).replace(/^0/, "");
  if (v < 1) return v.toFixed(2).replace(/^0/, "");
  return v.toFixed(2);
}

function alignFromInputs(animate = true) {
  const { cfm, friction } = inputs();
  setRotation(rotationFor(cfm, friction), animate);
}

function inputsFromRotation() {
  const { friction } = inputs();
  const cfm = clamp(cfmFromRotation(rotation, friction), 30, 100000);
  cfmInput.value = String(Math.round(cfm));
  refresh();
}

// --- pointer-driven rotation -------------------------------------------------

let dragging = false;
let dragStartAngle = 0;
let dragStartRotation = 0;
function pointerAngle(ev: PointerEvent): number {
  const r = container.getBoundingClientRect();
  const dx = ev.clientX - (r.left + r.width / 2);
  const dy = ev.clientY - (r.top + r.height / 2);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}
container.addEventListener("pointerdown", (ev) => {
  dragging = true;
  container.setPointerCapture(ev.pointerId);
  dragStartAngle = pointerAngle(ev);
  dragStartRotation = rotation;
});
container.addEventListener("pointermove", (ev) => {
  if (!dragging) return;
  const delta = pointerAngle(ev) - dragStartAngle;
  setRotation(dragStartRotation + delta);
  inputsFromRotation();
});
function endDrag(ev: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  try {
    container.releasePointerCapture(ev.pointerId);
  } catch {
    /* noop */
  }
}
container.addEventListener("pointerup", endDrag);
container.addEventListener("pointercancel", endDrag);

cfmInput.addEventListener("input", () => alignFromInputs());
frictionInput.addEventListener("input", () => alignFromInputs());
resetBtn.addEventListener("click", () => {
  cfmInput.value = "300";
  frictionInput.value = "0.08";
  alignFromInputs(true);
});

alignFromInputs(false);
