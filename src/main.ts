// AZA Ductulator — entry point.
//
// Wires the SVG layers (rotating wheel + fixed card overlay), pointer-driven
// rotation, and the input/readout panel.

import { solve } from "./ductulator.js";
import { buildWheel, rotationFor, cfmFromRotation } from "./wheel.js";
import { buildCard } from "./card.js";

interface Inputs {
  cfm: number;
  friction: number;
}

const container = document.getElementById("wheelContainer")!;
const cfmInput = document.getElementById("cfmInput") as HTMLInputElement;
const frictionInput = document.getElementById("frictionInput") as HTMLInputElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const outVel = document.getElementById("rVelocity")!;
const outDia = document.getElementById("rDiameter")!;
const outRect = document.getElementById("rRect")!;

const wheel = buildWheel();
const card = buildCard();
container.appendChild(wheel);
container.appendChild(card);

let rotation = 0; // degrees clockwise

function setRotation(deg: number, animate = false) {
  rotation = wrapDeg(deg);
  wheel.style.transition = animate ? "transform 350ms cubic-bezier(.4,.0,.2,1)" : "none";
  wheel.style.transform = `rotate(${rotation}deg)`;
}

function wrapDeg(d: number): number {
  let v = d % 360;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return v;
}

function inputs(): Inputs {
  const cfm = clamp(parseFloat(cfmInput.value) || 0, 30, 100000);
  const friction = clamp(parseFloat(frictionInput.value) || 0, 0.01, 5);
  return { cfm, friction };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function updateReadout() {
  const { cfm, friction } = inputs();
  const r = solve(cfm, friction);
  outVel.textContent = String(Math.round(r.velocityFpm));
  outDia.textContent = r.diameterIn.toFixed(2);
  outRect.textContent = r.rectangular
    .slice(0, 3)
    .map((p) => `${p.a}″ × ${p.b}″`)
    .join(" · ");
}

function alignFromInputs(animate = true) {
  const { cfm, friction } = inputs();
  setRotation(rotationFor(cfm, friction), animate);
  updateReadout();
}

function inputsFromRotation() {
  // When the user spins the wheel directly, we keep the friction value as-is
  // and infer CFM from the rotation, then recompute the rest.
  const { friction } = inputs();
  const cfm = clamp(cfmFromRotation(rotation, friction), 30, 100000);
  cfmInput.value = String(Math.round(cfm));
  updateReadout();
}

// --- Pointer-driven rotation -------------------------------------------------

let dragging = false;
let dragStartAngle = 0;
let dragStartRotation = 0;

function pointerAngle(ev: PointerEvent): number {
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = ev.clientX - cx;
  const dy = ev.clientY - cy;
  // angle clockwise from 12 o'clock
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

// --- Input bindings ----------------------------------------------------------

cfmInput.addEventListener("input", () => alignFromInputs());
frictionInput.addEventListener("input", () => alignFromInputs());
resetBtn.addEventListener("click", () => {
  cfmInput.value = "300";
  frictionInput.value = "0.08";
  alignFromInputs(true);
});

// Initial render.
alignFromInputs(false);
