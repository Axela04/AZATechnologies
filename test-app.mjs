import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '/tmp/claude-0/-home-user-AZATechnologies/a1c93982-bbd8-5965-9180-7760b6fa3238/scratchpad/ductulator.html';
writeFileSync('/tmp/wrapped.html',
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`+
  `</head><body>${readFileSync(SRC,'utf8')}</body></html>`);

const results = [];
const ok = (n,pass,d='') => { results.push({n,pass}); console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`); };
const ang = p => p.$eval('#card', el => parseFloat((el.style.transform.match(/-?[\d.]+/)||[0])[0]));
const txt = p => p.$eval('#deg', el => el.textContent);
const settle = async (p, ms=1600) => { await new Promise(r=>setTimeout(r,ms)); };

const browser = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-dev-shm-usage'] });
try {
  for (const [label, vp, touch] of [
    ['Desktop 1280x860', {width:1280,height:860,deviceScaleFactor:2}, false],
    ['Mobile 412x915',   {width:412,height:915,deviceScaleFactor:3,isMobile:true,hasTouch:true}, true],
  ]) {
    console.log(`\n[ ${label} ]`);
    const p = await browser.newPage();
    const jsErrs = [], netErrs = [];
    p.on('pageerror', e => jsErrs.push(e.message));
    p.on('console', m => { if (m.type()==='error') {
      (/net::|Failed to load resource/.test(m.text()) ? netErrs : jsErrs).push(m.text()); } });
    await p.setViewport(vp);
    await p.goto('file:///tmp/wrapped.html', { waitUntil:'domcontentloaded' });
    await new Promise(r=>setTimeout(r,300));

    ok('three stacked layers', await p.$$eval('.layer', e=>e.length) === 3);
    const paths = await p.$$eval('svg path', e=>e.length);
    const imgs  = await p.$$eval('img', e=>e.length).catch(()=>0);
    ok('pure vector — no raster images', imgs===0 && paths>=4, `${paths} paths / ${imgs} img`);

    const box = await p.$eval('#rig', el => { const r=el.getBoundingClientRect();
      return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    const cx = box.x+box.w/2, cy = box.y+box.h/2, R = box.h*0.33;
    const discT = () => p.$eval('.layer.disc', el => getComputedStyle(el).transform);
    const discBefore = await discT();

    // quarter turn, measured BEFORE release so inertia doesn't skew it
    let midDrag;
    if (touch) {
      await p.touchscreen.touchStart(cx, cy-R);
      for (let i=1;i<=16;i++){ const t=i/16;
        await p.touchscreen.touchMove(cx+R*Math.sin(t*Math.PI/2), cy-R*Math.cos(t*Math.PI/2)); }
      midDrag = await ang(p);
      await p.touchscreen.touchEnd();
    } else {
      await p.mouse.move(cx, cy-R); await p.mouse.down();
      for (let i=1;i<=16;i++){ const t=i/16;
        await p.mouse.move(cx+R*Math.sin(t*Math.PI/2), cy-R*Math.cos(t*Math.PI/2)); }
      midDrag = await ang(p);
      await p.mouse.up();
    }
    ok('drag rotates the card ~90° for a quarter turn', Math.abs(midDrag-90)<3, `${midDrag.toFixed(2)}°`);
    ok('disc never moves', discBefore === await discT(), await discT());

    // inertia: keeps moving after release, then stops on its own
    const justAfter = await ang(p);
    await new Promise(r=>setTimeout(r,90));
    const coasting = await ang(p);
    await settle(p);
    const a1 = await ang(p); await new Promise(r=>setTimeout(r,180)); const a2 = await ang(p);
    ok('throw carries momentum past release', Math.abs(coasting-justAfter)>0.4,
       `${justAfter.toFixed(1)} -> ${coasting.toFixed(1)}`);
    ok('momentum decays to a full stop', a1===a2, `rests at ${a2.toFixed(1)}°`);

    // keyboard
    await p.focus('#rig');
    const k0 = await ang(p);
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    ok('arrow keys nudge 1° each', Math.abs((await ang(p))-k0-2)<0.001, `${((await ang(p))-k0).toFixed(3)}°`);
    await p.keyboard.down('Shift'); await p.keyboard.press('ArrowLeft'); await p.keyboard.up('Shift');
    ok('shift+arrow gives 0.1° fine control', Math.abs((await ang(p))-k0-1.9)<0.001);

    // reset — click, then verify both the transform and the readout land on zero
    const preReset = await ang(p);
    await p.click('#reset');
    await settle(p, 900);
    const postA = await ang(p), postT = await txt(p);
    ok('reset returns card to 0°', Math.abs(postA)<0.001 && postT.startsWith('0.0'),
       `from ${preReset.toFixed(1)}° -> transform ${postA}°, readout ${postT}`);

    // nudge buttons
    await p.click('#cw'); await p.click('#cw'); await p.click('#ccw');
    ok('nudge buttons step the card', Math.abs((await ang(p))-1)<0.001, `${(await ang(p)).toFixed(2)}°`);

    ok('no JS errors', jsErrs.length===0, jsErrs.join(' | '));
    if (netErrs.length) console.log(`  note: ${netErrs.length} offline resource error(s) — Google Fonts, expected in sandbox`);

    await p.screenshot({ path: touch ? '/tmp/shot-mobile.png' : '/tmp/shot-light.png' });
    if (!touch) {
      await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
      await new Promise(r=>setTimeout(r,150));
      const bg = await p.$eval('body', el=>getComputedStyle(el).backgroundColor);
      ok('dark theme paints its own body ground', bg!=='rgba(0, 0, 0, 0)', bg);
      await p.screenshot({ path:'/tmp/shot-dark.png' });
    }
    await p.close();
  }
} finally { await browser.close(); }
const bad = results.filter(r=>!r.pass);
console.log(`\n${results.length-bad.length}/${results.length} passed`);
process.exit(bad.length?1:0);
