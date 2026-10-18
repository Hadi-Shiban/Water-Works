// Browser smoke test: plays Level 1 in every scenario with real DOM clicks in
// headless Chrome, checks for console errors, save/continue, mobile layout,
// music preferences and the legacy municipal page.
//
// Run:  node --experimental-websocket tests/smoke.mjs
// Env:  CHROME=/path/to/chrome   SMOKE_OUT=/dir/for/screenshots
// Dev-only. Needs a local Chrome; no npm packages.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SMOKE_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'ww-smoke-'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };

// ---- static server (mimics GitHub Pages) -------------------------------------
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---- chrome + CDP ------------------------------------------------------------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''; chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
  setTimeout(() => reject(new Error('Chrome did not start')), 15000);
});
const port = new URL(wsUrl).port;
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + msg.params.args.map((a) => a.value || a.description).join(' '));
  // favicon.ico: the untouched legacy page has no icon link, so the browser probes for one.
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/favicon\.ico/.test(msg.params.entry.url || '')) errors.push('log: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.result.exceptionDetails) throw new Error('evaluate failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '\n' + expr);
  return r.result.result.value;
}
async function go(url) { await send('Page.navigate', { url }); await sleep(900); }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); }
async function viewport(w, h, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(200); }
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

let failures = 0;
const check = (cond, label) => { console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`); if (!cond) failures++; };
const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('missing ${sel.replace(/'/g, '')}'); el.click(); return true; })()`);
const S = (expr) => evaluate(`(() => { const s = WV.debug.state; return ${expr}; })()`);

// ---- play Level 1 in each scenario with real clicks ----------------------------
async function playLevel1(scenario, vp) {
  console.log(`\n${scenario} @ ${vp[0]}x${vp[1]}`);
  await viewport(vp[0], vp[1], vp[0] < 600);
  await go(`${BASE}/index.html?scenario=${scenario}`);
  await evaluate('localStorage.clear(); true'); await go(`${BASE}/index.html?scenario=${scenario}`);
  check(await evaluate('!document.getElementById("start").hidden && document.getElementById("continueBtn").hidden'), 'start screen shows, no Continue without a save');
  await click('[data-act="start-game"]');
  await evaluate('document.getElementById("villageName").value = "Smoke Ridge"; true');
  await click('#nameForm button[type="submit"]'); await sleep(700);
  check(await S('s.scenarioId') === scenario, 'village created in the requested scenario');
  check(await evaluate('document.getElementById("dlg").open'), 'briefing opens');
  if (vp[0] >= 1000) await shot(`${scenario}-1-briefing`);
  check(await evaluate('WV.audio.state().available'), 'music file loads');
  await click('[data-act="begin"]'); await sleep(400);
  await shot(`${scenario}-2-map-${vp[0]}`);
  check(await evaluate('document.querySelectorAll("#hotspots .hs").length >= 5 && document.querySelectorAll("#hotspots .node").length === 4'), 'hotspots and resource nodes render');
  check(await evaluate(`(() => { const b = document.getElementById('mapbox').getBoundingClientRect(); const hs = [...document.querySelectorAll('#hotspots .hs .ring, #hotspots .node .node-chip')]; return hs.every((h) => { const r = h.getBoundingClientRect(); return r.width > 10 && r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1; }); })()`), 'every hotspot sits inside the painting');

  // explore: committee via the sheet, source, one more place
  await click('#hotspots [data-id="committee"]'); await sleep(250);
  check(await evaluate('!document.getElementById("sheet").hidden'), 'inspecting opens the sheet');
  await click('#sheet [data-act="meet-committee"]'); await sleep(300);
  check(await evaluate('document.querySelectorAll(".member-card").length === 3'), 'committee dialog shows three members');
  await click('[data-act="committee-agree"]'); await sleep(300);
  check(await S('s.flags.committeeMet'), 'committee met');
  await click('#hotspots [data-id="source"]'); await sleep(250);
  await click('#sheet [data-act="watch-walk"]'); await sleep(1200);
  check(await S('s.flags.walkWatched'), 'walk watched');
  if (vp[0] >= 1000) await shot(`${scenario}-3-walk`);
  await click('#hotspots [data-id="homes"]'); await sleep(200);
  await click('#sheet [data-act="close-sheet"]');
  check(await S('s.inspected.length >= 3'), 'three places explored');

  // building before gathering explains itself and changes nothing
  await click('#hotspots [data-id="lab"]'); await sleep(200);
  await click('#sheet [data-act="build"]'); await sleep(200);
  check(await S('s.builds.lab') === 'site', 'cannot build without materials');

  // gather everything
  const nodes = await evaluate('[...document.querySelectorAll("#hotspots .node")].map((n) => n.dataset.id)');
  for (const n of nodes) for (let i = 0; i < 3; i++) { await click(`#hotspots [data-id="${n}"]`); await sleep(420); }
  check(await S('s.gathered.wood >= 6 && s.gathered.stone >= 4'), 'gathered 6 wood and 4 stone');
  check(await evaluate('document.querySelectorAll("#hotspots .node.empty").length === 4'), 'cleared nodes show as empty');

  await click('#hotspots [data-id="lab"]'); await sleep(200);
  await click('#sheet [data-act="build"]'); await sleep(900);
  check(await S('s.builds.lab') === 'building', 'construction starts');
  if (vp[0] >= 1000) await shot(`${scenario}-4-building`);
  await sleep(2400);
  check(await S('s.builds.lab') === 'built', 'construction completes');
  await sleep(1300);
  check(await evaluate('document.getElementById("dlg").open && !!document.querySelector(".dlg .summary")'), 'level-complete celebration opens');
  if (vp[0] >= 1000) await shot(`${scenario}-5-complete`);
  await click('[data-act="next-level"]'); await sleep(400);
  check(await S('s.level === 2 && s.completedLevels.includes(1)'), 'advanced to Level 2');
  if (vp[0] >= 1000) await shot(`${scenario}-6-after`);

  // save → reload → continue
  await go(`${BASE}/index.html`);
  check(await evaluate('!document.getElementById("continueBtn").hidden'), 'Continue offered after reload');
  await click('#continueBtn'); await sleep(600);
  check(await S(`s.level === 2 && s.builds.lab === 'built' && s.name === 'Smoke Ridge' && s.scenarioId === '${scenario}' && Object.values(s.nodes).every((n) => n.charges === 0)`), 'continue restores level, buildings, nodes and scenario');
  check(await evaluate('document.querySelector(".site").getAttribute("data-state") === "built"'), 'built station is drawn after continue');
}

for (const sc of ['highland', 'plateau', 'wetland']) await playLevel1(sc, [1440, 900]);
await playLevel1('plateau', [390, 844]);
await playLevel1('wetland', [1024, 768]);

// ---- music preferences persist and never duplicate -----------------------------
console.log('\nmusic');
await viewport(1440, 900);
await click('[data-act="toggle-music"]'); await sleep(200);
check(await evaluate('WV.audio.state().muted === true'), 'mute works');
await go(`${BASE}/index.html`); await click('#continueBtn'); await sleep(500);
check(await evaluate('WV.audio.state().muted === true'), 'mute persists across reloads');
await click('[data-act="toggle-music"]'); await sleep(600);
check(await evaluate('WV.audio.state().playing === true'), 'music plays after unmute');
await evaluate('WV.audio.start(); WV.audio.start(); true');
check(await evaluate('WV.audio.state().playing === true'), 'repeated start() keeps one player');

// ---- keyboard: hotspots are tabbable buttons ------------------------------------
check(await evaluate('[...document.querySelectorAll("#hotspots button")].every((b) => b.tabIndex === 0)'), 'all hotspots are keyboard focusable');

// ---- legacy prototype ---------------------------------------------------------------
console.log('\nmunicipal.html');
const before = errors.length;
await go(`${BASE}/municipal.html`); await sleep(600);
check(await evaluate('!!window.WW && !!document.querySelector("#map")'), 'municipal prototype loads');
// Known, pre-existing in the baseline (legacy js/app.js sets a relative url() in --env-image,
// which resolves against css/). Legacy files are intentionally left unchanged.
const legacy = errors.splice(before);
const known = legacy.filter((e) => /404.*\/css\/assets\/environments\//.test(e));
check(legacy.length === known.length, 'municipal prototype: no script errors');
if (known.length) console.log(`  note  municipal prototype: ${known.length} known pre-existing background-image 404(s)`);

console.log(`\nconsole errors: ${errors.length ? errors.join('\n  ') : 'none'}`);
if (errors.length) failures++;
console.log(`screenshots: ${OUT}`);
console.log(failures ? `\n${failures} check(s) failed` : '\nall smoke checks passed');
ws.close(); chrome.kill(); server.close();
process.exit(failures ? 1 : 0);
