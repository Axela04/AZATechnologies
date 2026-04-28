// Headless visual + interaction test.
// Boots Vite, drives the page in Chromium, snapshots a few states, and
// verifies that drag/touch input rotates the wheel and the indicator plaques
// (drawn into the SVG overlay) update.
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
const url = "http://localhost:5180/";
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

// Read the four indicator plaques from the SVG overlay.
async function readPlaques(page) {
  return page.evaluate(() => {
    const layer = document.querySelector(".layer-indicators");
    const texts = layer ? Array.from(layer.querySelectorAll("text")) : [];
    const big = texts.filter((t) => +t.getAttribute("font-size") >= 18).map((t) => t.textContent);
    return {
      plaques: big,
      rotation: document.querySelector(".layer-bottom").style.transform,
      cfm: document.getElementById("cfmInput").value,
      friction: document.getElementById("frictionInput").value,
    };
  });
}

try {
  console.log("\n[ Desktop @ 1280×900 ]");
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await desk.goto(url, { waitUntil: "networkidle0" });

  const layers = await desk.$$eval("#wheelContainer svg", (s) => s.length);
  check("three SVG layers (wheel, indicators, card)", layers === 3, `got ${layers}`);

  const initial = await readPlaques(desk);
  console.log(`     plaques: ${initial.plaques.join(" | ")}`);
  check("CFM plaque reads ≈ 300", /300/.test(initial.plaques.join(" ")));
  check("FPM plaque reads ≈ 648", /648/.test(initial.plaques.join(" ")));
  check("Diameter plaque reads ≈ 9.21", /9\.2/.test(initial.plaques.join(" ")));
  check("rotation transform present", /rotate/.test(initial.rotation), initial.rotation);

  await shot(desk, "01-desktop-default");

  // Change inputs.
  await desk.evaluate(() => {
    const cfm = document.getElementById("cfmInput");
    cfm.value = "1000";
    cfm.dispatchEvent(new Event("input", { bubbles: true }));
    const f = document.getElementById("frictionInput");
    f.value = "0.10";
    f.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(450);
  const after = await readPlaques(desk);
  console.log(`     plaques: ${after.plaques.join(" | ")}`);
  check("1000 CFM @ 0.10 → CFM plaque ≈ 1,000", /1[,.]?000|1000/.test(after.plaques.join(" ")));
  check("1000 CFM @ 0.10 → FPM plaque ≈ 949", /94[5-9]|95\d/.test(after.plaques.join(" ")));
  check("1000 CFM @ 0.10 → diameter plaque ≈ 13.9", /13\.[89]|14\.0/.test(after.plaques.join(" ")));
  check("rotation changed", after.rotation !== initial.rotation);

  await shot(desk, "02-desktop-1000cfm");

  // Drag.
  const box = await desk.$eval("#wheelContainer", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const beforeDrag = (await readPlaques(desk)).rotation;
  await desk.mouse.move(cx, cy - box.h * 0.4);
  await desk.mouse.down();
  await desk.mouse.move(cx + box.w * 0.4, cy, { steps: 25 });
  await desk.mouse.up();
  await wait(150);
  const afterDrag = await readPlaques(desk);
  console.log(`     drag: ${beforeDrag} → ${afterDrag.rotation}`);
  console.log(`     drag plaques: ${afterDrag.plaques.join(" | ")}`);
  check("rotation updated by drag", afterDrag.rotation !== beforeDrag);
  check("plaques recomputed after drag", afterDrag.plaques.some((p) => /\d/.test(p)));

  await shot(desk, "03-desktop-after-drag");

  // Mobile.
  console.log("\n[ Mobile @ 412×915, touch ]");
  const mob = await browser.newPage();
  await mob.emulate({
    viewport: { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36",
  });
  await mob.goto(url, { waitUntil: "networkidle0" });
  await shot(mob, "10-mobile-default");

  const mbox = await mob.$eval("#wheelContainer", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const mcx = mbox.x + mbox.w / 2;
  const mcy = mbox.y + mbox.h / 2;
  const before = (await readPlaques(mob)).rotation;
  const start = { x: mcx, y: mcy - mbox.h * 0.35 };
  const end = { x: mcx + mbox.w * 0.35, y: mcy };
  await mob.touchscreen.touchStart(start.x, start.y);
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    await mob.touchscreen.touchMove(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t);
  }
  await mob.touchscreen.touchEnd();
  await wait(150);
  const afterTouch = await readPlaques(mob);
  console.log(`     touch: ${before} → ${afterTouch.rotation}`);
  console.log(`     touch plaques: ${afterTouch.plaques.join(" | ")}`);
  check("rotation updated by touch swipe", afterTouch.rotation !== before);
  await shot(mob, "11-mobile-after-swipe");

  // Set inputs on mobile.
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
await writeFile(`${SHOTS}/results.json`, JSON.stringify({ results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
