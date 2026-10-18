// Browser smoke test: plays Levels 1 and 2 in every scenario with real DOM clicks
// in headless Chrome, checks for console errors, save/continue, mobile layout,
// uninterrupted music, music preferences and the legacy municipal page.
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
async function playCampaign(scenario, vp) {
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
  check(await evaluate('document.querySelectorAll("#hotspots .hs:not([hidden])").length >= 6 && document.querySelectorAll("#hotspots .node").length === 4'), 'hotspots and resource nodes render');
  check(await evaluate('document.querySelectorAll("#hotspots .hs-survey[hidden]").length === 2'), 'Level 2 survey sites stay hidden in Level 1');
  check(await evaluate('document.getElementById("checklist").hidden'), 'checklist stays out of the way until asked for');
  check(await evaluate('WV.scene.walkerPositions().length >= 5 && WV.scene.walkerPositions().every((w) => /translate/.test(w.transform))'), 'villagers walk the painted routes');
  check(await evaluate(`(() => { const b = document.getElementById('mapbox').getBoundingClientRect(); const hs = [...document.querySelectorAll('#hotspots .hs:not([hidden]) .ring, #hotspots .node .node-chip')]; return hs.every((h) => { const r = h.getBoundingClientRect(); return r.width > 10 && r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1; }); })()`), 'every hotspot sits inside the painting');

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

  // ---- Level 2: investigate the water --------------------------------------------
  const music0 = await evaluate('WV.audio.state().position');
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  await click('#sheet [data-act="open-lab"]'); await sleep(400);
  check(await S('s.flags.labOpened') && await evaluate('document.getElementById("dlg").open && !!document.querySelector(".samples")'), 'field lab opens');
  await click('[data-act="goto"]'); await sleep(400);
  const samples = await S('Object.keys(WV.sim.sceneOf(s).samples)');
  for (const id of samples) {
    await click(`#hotspots [data-id="${id}"]`); await sleep(250);
    if (await evaluate('!!document.querySelector(\'#sheet [data-act="collect-sample"]\')')) await click('#sheet [data-act="collect-sample"]');
    await sleep(250);
  }
  check(await S('s.samples.length === 2'), 'collected two water samples');
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  await click('#sheet [data-act="open-lab"]'); await sleep(400);
  const clearUnsafe = await S('Object.entries(WV.sim.sceneOf(s).samples).find(([, v]) => v.clarity === "clear" && v.germ !== "safe")[0]');
  for (const id of samples) {
    await click(`[data-act="predict"][data-id="${id}"][data-pred="${id === clearUnsafe ? 'safe' : 'unsure'}"]`); await sleep(500);
    if (vp[0] >= 1000 && id === samples[0]) await shot(`${scenario}-7-lab-testing`);
    await sleep(2100);
  }
  check(await S('Object.keys(s.results).length === 2'), 'both samples tested');
  check(await evaluate('document.querySelectorAll(".sample.done").length === 2'), 'lab shows both results');
  check(await evaluate('/clear water isn.t always safe/i.test(document.querySelector(".dlg").textContent)'), 'guessing "safe" on clear-but-unsafe water gets the surprise');
  if (vp[0] >= 1000) await shot(`${scenario}-8-lab-results`);
  await click('[data-act="open-options"]'); await sleep(300);
  check(await evaluate('document.querySelectorAll(".opt.unknown").length > 0'), 'options wait for surveys');
  await click('[data-act="close-dialog"]'); await sleep(300);
  check(await evaluate('document.querySelectorAll("#hotspots .hs-survey:not([hidden])").length === 2'), 'survey sites appear in Level 2');
  for (const id of await S('Object.keys(WV.sim.sceneOf(s).surveys)')) {
    await click(`#hotspots [data-id="${id}"]`); await sleep(250);
    await click('#sheet [data-act="survey"]'); await sleep(1800);
  }
  check(await S('s.surveys.length === 2'), 'both surveys done');
  if (vp[0] >= 1000) await shot(`${scenario}-9-survey`);
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  await click('#sheet [data-act="open-lab"]'); await sleep(300);
  await click('[data-act="open-options"]'); await sleep(300);
  const primary = await S('WV.data.scenarios[s.scenarioId].primaryTech');
  check(await evaluate(`!!document.querySelector('.opt.recommended') && document.querySelectorAll('.opt.recommended').length === 1 && /${primary === 'gravityFed' ? 'Gravity' : primary === 'drilledWell' ? 'Drilled' : 'Rainwater'}/.test(document.querySelector('.opt.recommended').textContent)`), `experts recommend the ${primary}`);
  if (vp[0] >= 1000) await shot(`${scenario}-10-options`);
  await click('[data-act="options-agree"]'); await sleep(1500);
  check(await evaluate('document.getElementById("dlg").open && /Level 2 complete/.test(document.getElementById("dlg").textContent)'), 'Level 2 celebration opens');
  if (vp[0] >= 1000) await shot(`${scenario}-11-level2`);
  await click('[data-act="next-level"]'); await sleep(400);
  check(await S('s.level === 3 && s.completedLevels.join() === "1,2"'), 'advanced to Level 3');
  const music1 = await evaluate('WV.audio.state()');
  check(music1.playing && music1.position > music0, `music kept playing through both levels (${music0.toFixed(1)}s → ${music1.position.toFixed(1)}s)`);

  // save → reload → continue
  await go(`${BASE}/index.html`);
  check(await evaluate('!document.getElementById("continueBtn").hidden'), 'Continue offered after reload');
  await click('#continueBtn'); await sleep(600);
  check(await S(`s.level === 3 && s.builds.lab === 'built' && s.name === 'Smoke Ridge' && s.scenarioId === '${scenario}' && Object.keys(s.results).length === 2 && s.surveys.length === 2 && s.flags.optionsReviewed`), 'continue restores level, buildings, lab results and surveys');
  check(await evaluate('document.querySelector(".site").getAttribute("data-state") === "built"'), 'built station is drawn after continue');
}

for (const sc of ['highland', 'plateau', 'wetland']) await playCampaign(sc, [1440, 900]);
await playCampaign('plateau', [390, 844]);
await playCampaign('wetland', [1024, 768]);

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

// ---- developer route editor (off by default) ---------------------------------------
console.log('\nroute editor');
await viewport(1440, 900);
await go(`${BASE}/index.html?scenario=highland`); await click('#continueBtn'); await sleep(500);
check(await evaluate('!document.querySelector(".dev-panel") && !document.querySelector(".dev-layer")'), 'route editor is off in normal play');
await go(`${BASE}/index.html?dev=routes`); await click('#continueBtn'); await sleep(800);
check(await evaluate('!!document.querySelector(".dev-panel") && document.querySelectorAll(".dev-handle").length > 20 && !!document.querySelector(".dev-grid")'), 'dev=routes shows grid, waypoints and panel');
const beforePt = await evaluate('JSON.stringify(WV.sim.sceneOf(WV.debug.state).routes.collect.points[5])');
const hp = await evaluate(`(() => { const r = document.querySelector('.dev-handle[data-route="collect"][data-i="5"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hp[0], y: hp[1], button: 'left', clickCount: 1 });
for (let i = 1; i <= 5; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hp[0] + i * 8, y: hp[1] + i * 4, button: 'left', buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hp[0] + 40, y: hp[1] + 20, button: 'left', clickCount: 1 });
await sleep(200);
const afterPt = await evaluate('JSON.stringify(WV.sim.sceneOf(WV.debug.state).routes.collect.points[5])');
check(afterPt !== beforePt, `dragging waypoint 5 moves it (${beforePt} → ${afterPt})`);
await click('[data-dev="copy"]'); await sleep(100);
check(await evaluate(`document.querySelector('[data-dev="out"]').value.includes(${JSON.stringify(afterPt)})`), 'copied JSON contains the edited waypoint');
await shot('dev-route-editor');

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
