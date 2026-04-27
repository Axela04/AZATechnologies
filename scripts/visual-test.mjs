// Headless visual + interaction test.
// Boots Vite, drives the page in Chromium, snapshots a few states, and
// verifies that drag/touch input rotates the wheel and updates the readout.
// Run: node scripts/visual-test.mjs

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const SHOTS = "screenshots";
await mkdir(SHOTS, { recursive: true });

const vite = spawn("npx", ["vite", "--port", "5180", "--strictPort"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let viteOut = "";
vite.stdout.on("data", (b) => (viteOut += b.toString()));
vite.stderr.on("data", (b) => (viteOut += b.toString()));

let url = "http://localhost:5180/";
for (let i = 0; i < 50 && !viteOut.includes("Local:"); i++) await wait(100);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${path}`);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

try {
  // ---- Desktop viewport ----
  console.log("\n[ Desktop @ 1280×900 ]");
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await desk.goto(url, { waitUntil: "networkidle0" });

  // App boots, SVGs are present.
  const layers = await desk.$$eval("#wheelContainer svg", (s) => s.length);
  check("two SVG layers mounted", layers === 2, `got ${layers}`);

  // Initial readout for the printed example values (300 CFM, 0.08 in.wg).
  const initial = await desk.evaluate(() => ({
    cfm: document.getElementById("cfmInput").value,
    fric: document.getElementById("frictionInput").value,
    vel: document.getElementById("rVelocity").textContent,
    dia: document.getElementById("rDiameter").textContent,
    rect: document.getElementById("rRect").textContent,
    rot: document.querySelector(".layer-bottom").style.transform,
  }));
  console.log(`     readout: V=${initial.vel} D=${initial.dia} R=${initial.rect}`);
  check("velocity ≈ 648 FPM", initial.vel === "648");
  check("diameter ≈ 9.21 in", initial.dia === "9.21");
  check(
    "rect includes 12×6 or 6×12 or 15×5",
    /(12.×.6|6.×.12|15.×.5|5.×.15)/.test(initial.rect),
    initial.rect
  );
  check("wheel got a rotation transform", /rotate/.test(initial.rot), initial.rot);

  await shot(desk, "01-desktop-default");

  // Change inputs → wheel should rotate to a different angle.
  await desk.evaluate(() => {
    const cfm = document.getElementById("cfmInput");
    cfm.value = "1000";
    cfm.dispatchEvent(new Event("input", { bubbles: true }));
    const f = document.getElementById("frictionInput");
    f.value = "0.10";
    f.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(450);
  const afterInput = await desk.evaluate(() => ({
    vel: document.getElementById("rVelocity").textContent,
    dia: document.getElementById("rDiameter").textContent,
    rot: document.querySelector(".layer-bottom").style.transform,
  }));
  console.log(`     readout: V=${afterInput.vel} D=${afterInput.dia}`);
  check("1000 CFM @ 0.10 → D ≈ 13.90", afterInput.dia === "13.90");
  check("1000 CFM @ 0.10 → V ≈ 949", afterInput.vel === "949");
  check("rotation changed after input", afterInput.rot !== initial.rot);

  await shot(desk, "02-desktop-1000cfm");

  // ---- Pointer-drag rotation ----
  const box = await desk.$eval("#wheelContainer", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const beforeDrag = await desk.evaluate(() => ({
    rot: document.querySelector(".layer-bottom").style.transform,
    cfm: document.getElementById("cfmInput").value,
  }));
  // Drag from 12 o'clock to 3 o'clock — 90° clockwise.
  await desk.mouse.move(cx, cy - box.h * 0.4);
  await desk.mouse.down();
  await desk.mouse.move(cx + box.w * 0.4, cy, { steps: 25 });
  await desk.mouse.up();
  await wait(150);
  const afterDrag = await desk.evaluate(() => ({
    rot: document.querySelector(".layer-bottom").style.transform,
    cfm: document.getElementById("cfmInput").value,
  }));
  console.log(`     drag: rot ${beforeDrag.rot} → ${afterDrag.rot}`);
  console.log(`     drag: cfm ${beforeDrag.cfm} → ${afterDrag.cfm}`);
  check("rotation updated by drag", afterDrag.rot !== beforeDrag.rot);
  check("CFM input updated by drag", afterDrag.cfm !== beforeDrag.cfm);

  await shot(desk, "03-desktop-after-drag");

  // ---- Mobile viewport (Pixel-ish) with touch emulation ----
  console.log("\n[ Mobile @ 412×915, touch ]");
  const mob = await browser.newPage();
  await mob.emulate({
    viewport: { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36",
  });
  await mob.goto(url, { waitUntil: "networkidle0" });
  await shot(mob, "10-mobile-default");

  // Touch drag using the CDP touch input pipeline.
  const mbox = await mob.$eval("#wheelContainer", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const mcx = mbox.x + mbox.w / 2;
  const mcy = mbox.y + mbox.h / 2;
  const beforeTouch = await mob.evaluate(() => ({
    rot: document.querySelector(".layer-bottom").style.transform,
    cfm: document.getElementById("cfmInput").value,
  }));
  const start = { x: mcx, y: mcy - mbox.h * 0.35 };
  const end = { x: mcx + mbox.w * 0.35, y: mcy };
  await mob.touchscreen.touchStart(start.x, start.y);
  // Move in steps to simulate a real swipe.
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    await mob.touchscreen.touchMove(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t);
  }
  await mob.touchscreen.touchEnd();
  await wait(150);
  const afterTouch = await mob.evaluate(() => ({
    rot: document.querySelector(".layer-bottom").style.transform,
    cfm: document.getElementById("cfmInput").value,
  }));
  console.log(`     touch: rot ${beforeTouch.rot} → ${afterTouch.rot}`);
  console.log(`     touch: cfm ${beforeTouch.cfm} → ${afterTouch.cfm}`);
  check("rotation updated by touch swipe", afterTouch.rot !== beforeTouch.rot);
  check("CFM input updated by touch swipe", afterTouch.cfm !== beforeTouch.cfm);

  await shot(mob, "11-mobile-after-swipe");

  // Mobile inputs.
  await mob.evaluate(() => {
    const f = document.getElementById("frictionInput");
    f.value = "0.05";
    f.dispatchEvent(new Event("input", { bubbles: true }));
    const c = document.getElementById("cfmInput");
    c.value = "300";
    c.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(400);
  await shot(mob, "12-mobile-300cfm-005");

  // ---- Console error sweep ----
  const errs = [];
  for (const p of [desk, mob]) {
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errs.push(m.text());
    });
  }
  await wait(100);
  check("no JS errors during run", errs.length === 0, errs.join(" | "));
} finally {
  await browser.close();
  vite.kill("SIGTERM");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
await writeFile(
  `${SHOTS}/results.json`,
  JSON.stringify({ results, summary: `${results.length - failed.length}/${results.length}` }, null, 2)
);
process.exit(failed.length === 0 ? 0 : 1);
