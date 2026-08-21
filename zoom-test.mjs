import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync('/tmp/z.html', `<!doctype html><html><head><meta charset="utf-8"></head><body>${readFileSync('ductulator.html','utf8')}</body></html>`);
const ok=(n,p,d='')=>console.log(`  ${p?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const b = await puppeteer.launch({headless:'new',args:['--no-sandbox']});
let fails = 0; const chk=(n,p,d)=>{ if(!p) fails++; ok(n,p,d); };

// --- desktop: wheel zoom, buttons, keys, dblclick ---
const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:1280,height:900});
await p.goto('file:///tmp/z.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,300));
const zt = () => p.$eval('#zoomval', e=>e.textContent);
const zx = () => p.$eval('#zoomer', e=>{const m=e.style.transform.match(/scale\(([\d.]+)\)/); return m?+m[1]:1;});

chk('starts at 1.0x', (await zt()).startsWith('1.0'), await zt());
const box = await p.$eval('#zoomer', e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
await p.mouse.move(box.x+box.w/2, box.y+box.h/2);
await p.mouse.wheel({deltaY:-600});
await new Promise(r=>setTimeout(r,150));
chk('scroll zooms in', await zx() > 1.3, `${(await zx()).toFixed(2)}x`);
await p.mouse.wheel({deltaY:600});
await new Promise(r=>setTimeout(r,150));
chk('scroll zooms back out', Math.abs(await zx()-1) < 0.15, `${(await zx()).toFixed(2)}x`);

await p.click('#zoomin'); await p.click('#zoomin');
chk('zoom-in button steps up', Math.abs(await zx()-1.96)<0.02, `${(await zx()).toFixed(2)}x`);
await p.click('#zoomout'); await p.click('#zoomout');
chk('zoom-out button returns', Math.abs(await zx()-1)<0.01, `${(await zx()).toFixed(2)}x`);

await p.focus('#rig');
await p.keyboard.press('Equal');
chk('"+" key zooms', await zx()>1.3, `${(await zx()).toFixed(2)}x`);
await p.keyboard.press('Digit0');
chk('"0" key resets zoom', Math.abs(await zx()-1)<0.01, `${(await zx()).toFixed(2)}x`);

// rotation must still work, and must NOT be disturbed by zooming
const ang = () => p.$eval('#card', e=>parseFloat((e.style.transform.match(/-?[\d.]+/)||[0])[0]));
await p.click('#zoomin');                       // rotate while zoomed
const R = box.h*0.30, cx=box.x+box.w/2, cy=box.y+box.h/2;
await p.mouse.move(cx, cy-R); await p.mouse.down();
for(let i=1;i<=16;i++){const t=i/16; await p.mouse.move(cx+R*Math.sin(t*Math.PI/2), cy-R*Math.cos(t*Math.PI/2));}
const a = await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>
  r(parseFloat(document.getElementById('card').style.transform.match(/-?[\d.]+/)[0])))));
await p.mouse.up();
chk('rotation still ~90° for a quarter turn while zoomed', Math.abs(a-90)<4, `${a.toFixed(1)}°`);

await p.click('#reset'); await new Promise(r=>setTimeout(r,700));
chk('reset clears both zoom and angle', Math.abs(await zx()-1)<0.01 && Math.abs(await ang())<0.01,
    `${(await zx()).toFixed(2)}x / ${(await ang()).toFixed(2)}°`);
chk('no JS errors', errs.length===0, errs.join(' | '));
await p.screenshot({path:'/tmp/aza-light.png'});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
await new Promise(r=>setTimeout(r,150));
await p.screenshot({path:'/tmp/aza-dark.png'});
await p.close();

// --- mobile: two-finger pinch ---
const m = await b.newPage();
const merr=[]; m.on('pageerror',e=>merr.push(e.message));
await m.emulate({viewport:{width:412,height:915,deviceScaleFactor:3,isMobile:true,hasTouch:true},
  userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile Safari/537.36'});
await m.goto('file:///tmp/z.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,300));
const mz = () => m.$eval('#zoomer', e=>{const s=e.style.transform.match(/scale\(([\d.]+)\)/); return s?+s[1]:1;});
const mb = await m.$eval('#zoomer', e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
const mcx=mb.x+mb.w/2, mcy=mb.y+mb.h/2;
// CDP touch: two pointers spreading apart
const t = await m.target().createCDPSession();
const pt=(x,y)=>({x,y,radiusX:5,radiusY:5,force:1});
await t.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(mcx-40,mcy),pt(mcx+40,mcy)]});
for(let i=1;i<=10;i++){ const d=40+i*11;
  await t.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(mcx-d,mcy),pt(mcx+d,mcy)]}); }
await new Promise(r=>setTimeout(r,80));
const pinched = await mz();
await t.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
chk('two-finger pinch zooms in', pinched > 1.5, `${pinched.toFixed(2)}x`);
chk('no JS errors (mobile)', merr.length===0, merr.join(' | '));
await m.screenshot({path:'/tmp/aza-mobile.png'});
await m.close();

await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall zoom checks passed');
process.exit(fails?1:0);
