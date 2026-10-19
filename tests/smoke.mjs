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
  await sleep(600); await shot(`${scenario}-0-start-${vp[0]}`);
  check(await evaluate('document.fonts.check("700 40px Fredoka") && getComputedStyle(document.querySelector("#startTitle")).fontFamily.includes("Fredoka")'), 'start title uses Fredoka');
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
  // three-hit gathering: hits 1 and 2 award nothing, the 3rd does; rapid clicks cannot double-award
  if (await evaluate('!document.getElementById("sheet").hidden')) await click('#sheet [data-act="close-sheet"]');
  const w0 = nodes.find((n) => n.startsWith('wood'));
  await click(`#hotspots [data-id="${w0}"]`); await sleep(150);
  await click(`#hotspots [data-id="${w0}"]`); await sleep(150);
  check(await S('s.resources.wood === 0') && await evaluate(`document.querySelector('#hotspots [data-id="${w0}"]').dataset.hits === '2' && document.querySelector('#hotspots [data-id="${w0}"] .hitcount').textContent === '2/3'`), 'two hits: cracks and "2/3", no wood yet');
  if (vp[0] >= 1000) { const r = await evaluate(`(() => { const b = document.querySelector('#hotspots [data-id="${w0}"]').getBoundingClientRect(); return [b.x, b.y]; })()`);
    const c = await send('Page.captureScreenshot', { format: 'png', clip: { x: r[0] - 60, y: r[1] - 50, width: 180, height: 150, scale: 2 } }); fs.writeFileSync(path.join(OUT, `${scenario}-3b-cracks.png`), Buffer.from(c.result.data, 'base64')); }
  await evaluate(`(() => { const b = document.querySelector('#hotspots [data-id="${w0}"]'); for (let i = 0; i < 6; i++) b.click(); return true; })()`);
  check(await S('s.resources.wood === 2 && s.nodes.' + w0 + '.charges === 2'), 'third hit awards +2 once, even with rapid extra clicks');
  await sleep(700);
  check(await evaluate(`!document.querySelector('#hotspots [data-id="${w0}"]').classList.contains('breaking') && document.querySelector('#hotspots [data-id="${w0}"]').dataset.hits === '0'`), 'the node resets after its break animation');
  const charges = await S('JSON.stringify(Object.fromEntries(Object.entries(s.nodes).map(([k, v]) => [k, v.charges])))');
  for (const n of nodes) for (let i = 0; i < JSON.parse(charges)[n]; i++) {
    for (let h = 0; h < 3; h++) { await click(`#hotspots [data-id="${n}"]`); await sleep(110); }
    await sleep(620);
  }
  check(await S('s.gathered.wood >= 6 && s.gathered.stone >= 4'), 'gathered 6 wood and 4 stone');
  check(await evaluate('document.querySelectorAll("#hotspots .node.regrowing").length >= 1'), 'gathered spots show they are growing back');
  if (vp[0] >= 1000) {
    const emptyId = await S('Object.keys(s.nodes).find((k) => s.nodes[k].charges === 0) || null');
    if (emptyId) {
      check(await evaluate(`document.querySelector('#hotspots [data-id="${emptyId}"]').classList.contains('empty')`), 'an emptied spot is marked "growing back"');
      await go(`${BASE}/index.html`); await click('#continueBtn'); await sleep(300); // reload mid-regrowth
      await sleep(6800);
      check(await S(`s.nodes['${emptyId}'].charges >= 1`), 'after reloading, the emptied spot regrows within ~6 s');
    }
  }

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
  check(await evaluate('WV.scene.walkerPositions().some((w) => w.route === "labApproach")'), 'a villager walks samples to the station in Level 2');
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  check(await evaluate('!document.querySelector(\'#sheet [data-act="open-lab"]\')'), 'lab stays closed until a sample is collected');
  await click('#hotspots [data-id="source"]'); await sleep(250);
  await click('#sheet [data-act="collect-sample"]'); await sleep(300);
  check(await S('s.samples.includes("source")'), 'collected a water sample at the collection point');
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  await click('#sheet [data-act="open-lab"]'); await sleep(500);
  check(await S('s.flags.labUnlocked') && await evaluate('document.getElementById("dlg").classList.contains("dlg-labscene")'), 'bringing the sample opens the lab scene');
  const labImg = await evaluate('document.querySelector(".lab-art img").getAttribute("src")');
  const wantImg = { highland: 'highland-springs', plateau: 'red-rock-plateau', wetland: 'wetland-crossroads' }[scenario];
  check(labImg.includes(`assets/images/lab/${wantImg}/lab-scene.png`) && await evaluate('document.querySelector(".lab-art img").naturalWidth === 1672'), `the ${wantImg} lab image loads`);
  check(await evaluate('[...document.querySelectorAll(".lab-hs")].every((b) => b.tagName === "BUTTON" && b.tabIndex === 0 && b.getAttribute("aria-label"))'), 'every lab hotspot is a labelled, focusable button');
  check(await evaluate('document.querySelectorAll(".lab-hs").length >= 10 && document.querySelectorAll(".lab-cover").length === 0'), 'lab hotspots render, with the charity: water wordmarks shown');
  check(await evaluate('document.querySelector(".lab-hs.next").dataset.id === "clear"'), 'the clear jar glows as the next step');
  if (vp[0] >= 1000) await shot(`${scenario}-7-lab`);
  // clear sample: guess "safe" on clear-but-unsafe water
  await evaluate('document.querySelector(\'.lab-hs[data-id="clear"]\').focus(); true');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(300);
  check(await evaluate('!!document.querySelector(\'[data-act="lab-guess"]\')'), 'keyboard Enter opens the clear jar');
  await click('[data-act="lab-guess"][data-pred="safe"]'); await sleep(2300);
  check(await S('s.flags.clearSampleInspected'), 'clear sample inspected');
  check(await evaluate('/Looks clean doesn.t mean safe to drink/.test(document.querySelector(".callout").textContent) && !!document.querySelector(".callout .health")'), 'the clear sample teaches looks-clean-isn’t-safe, with a health note');
  await shot(`${scenario}-8-clear-${vp[0]}`);
  if (vp[0] < 600) check(await evaluate(`(() => { const st = document.querySelector('.lab-stage'), b = document.querySelector('.lab-hs.next').getBoundingClientRect(), r = st.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; })()`), 'on phones the lab pans to the next hotspot');
  await click('.lab-hs[data-id="dirty"]'); await sleep(250);
  await click('[data-act="lab-test"]'); await sleep(2300);
  check(await S('s.flags.dirtySampleInspected'), 'cloudy sample inspected');
  check(await evaluate('document.querySelectorAll(".callout .colonies circle").length >= 18'), 'the cloudy sample shows many more germ colonies');
  await click('.lab-hs[data-id="microscope"]'); await sleep(250);
  check(await evaluate('document.querySelectorAll(".callout .magnifier").length === 2'), 'the microscope shows both magnified views');
  if (vp[0] >= 1000) await shot(`${scenario}-9-microscope`);
  await click('[data-act="lab-step"][data-id="microscope"]'); await sleep(300);
  check(await S('s.flags.microscopeUsed'), 'microscope used');
  await click('[data-act="lab-step"][data-id="filter"]'); await sleep(2300);
  check(await S('s.flags.filterTestCompleted') && await evaluate('/Clearer isn.t the same as safe/.test(document.querySelector(".callout").textContent)'), 'the filter makes it clearer, not safe');
  if (vp[0] >= 1000) await shot(`${scenario}-10-filter`);
  await click('.lab-hs[data-id="notebook"]'); await sleep(250);
  check(await evaluate('/survey/i.test(document.querySelector(".callout").textContent)'), 'notes ask for the surveys first');
  await click('[data-act="lab-goto-survey"]'); await sleep(500);
  check(await evaluate('document.querySelectorAll("#hotspots .hs-survey:not([hidden])").length === 2'), 'survey sites appear in Level 2');
  for (const id of await S('Object.keys(WV.sim.sceneOf(s).surveys)')) {
    await click(`#hotspots [data-id="${id}"]`); await sleep(250);
    await click('#sheet [data-act="survey"]'); await sleep(1800);
  }
  check(await S('s.surveys.length === 2'), 'both surveys done');
  const musicMid = await evaluate('WV.audio.state()');
  check(musicMid.playing && musicMid.position > music0 + 5, `music kept playing through the lab and surveys (${music0.toFixed(1)}s → ${musicMid.position.toFixed(1)}s)`);
  // save mid-level, reload, continue: lab progress must survive
  await go(`${BASE}/index.html`); await click('#continueBtn'); await sleep(600);
  check(await S('s.level === 2 && s.flags.labUnlocked && s.flags.clearSampleInspected && s.flags.dirtySampleInspected && s.flags.microscopeUsed && s.flags.filterTestCompleted && s.surveys.length === 2'), 'continue restores mid-Level-2 lab progress');
  await click('#hotspots [data-id="lab"]'); await sleep(250);
  await click('#sheet [data-act="open-lab"]'); await sleep(400);
  check(await evaluate('document.querySelectorAll(".lab-hs.done").length === 4 && document.querySelector(".lab-hs.next").dataset.id === "notebook"'), 'the lab shows four finished steps and the notebook next');
  await click('.lab-hs[data-id="notebook"]'); await sleep(250);
  if (vp[0] >= 1000) await shot(`${scenario}-11-notes`);
  await click('[data-act="lab-notes"]'); await sleep(400);
  check(await S('s.flags.notesReviewed'), 'field notes reviewed');
  const primary = await S('WV.data.scenarios[s.scenarioId].primaryTech');
  check(await evaluate(`!!document.querySelector('.opt.recommended') && document.querySelectorAll('.opt.recommended').length === 1 && /${primary === 'gravityFed' ? 'Gravity' : primary === 'drilledWell' ? 'Drilled' : 'Rainwater'}/.test(document.querySelector('.opt.recommended').textContent)`), `experts recommend the ${primary}`);
  if (vp[0] >= 1000) await shot(`${scenario}-12-options`);
  await click('[data-act="options-agree"]'); await sleep(1500);
  check(await evaluate('document.getElementById("dlg").open && /Level 2 complete/.test(document.getElementById("dlg").textContent)'), 'Level 2 celebration opens');
  if (vp[0] >= 1000) await shot(`${scenario}-13-level2`);
  await click('[data-act="next-level"]'); await sleep(400);
  check(await S('s.level === 3 && s.completedLevels.join() === "1,2"'), 'advanced to Level 3');
  check(await evaluate('WV.audio.state().playing'), 'music still playing after Continue and the level change');

  // ---- Level 3: build the water solution -------------------------------------------
  const musicL3 = await evaluate('WV.audio.state().position');
  check(await evaluate('document.querySelectorAll(".animal").length >= 3'), 'ambient animals are on the map');
  check(await evaluate('document.querySelector(\'#hotspots [data-id="waterPoint"]\').hidden'), 'the water point site waits for a choice');
  await click('#hotspots [data-id="committee"]'); await sleep(250);
  await click('#sheet [data-act="plan-meeting"]'); await sleep(400);
  check(await S('s.flags.planningMet') && await evaluate('/From findings to a plan/.test(document.getElementById("dlg").textContent)'), 'planning meeting opens');
  if (vp[0] >= 1000) await shot(`${scenario}-14-planning`);
  await click('[data-act="open-tech"]'); await sleep(300);
  const primary3 = await S('WV.data.scenarios[s.scenarioId].primaryTech');
  check(await evaluate(`document.querySelectorAll('.tcard.pick').length === 1 && !!document.querySelector('.tcard.pick [data-id="${primary3}"]')`), 'one recommended technology card can be chosen');
  check(await evaluate(`[...document.querySelectorAll('.tcard [data-act="choose-tech"]')].every((b) => !['rehabilitation'].includes(b.dataset.id))`), 'unsuitable technologies are not offered');
  if (vp[0] >= 1000) await shot(`${scenario}-15-tech`);
  const alt = await evaluate(`(() => { const b = document.querySelector('.tcard.alt [data-act="choose-tech"]'); return b ? b.dataset.id : null; })()`);
  if (alt) { await click(`.tcard.alt [data-id="${alt}"]`); await sleep(300); check(await S('s.tech === null') && await evaluate('!!document.querySelector(".dlg-tech .person-line")'), 'asking about an alternative explains, without trapping'); }
  await click(`.tcard.pick [data-id="${primary3}"]`); await sleep(400);
  check(await S(`s.tech === '${primary3}'`) && await evaluate('!document.querySelector(\'#hotspots [data-id="waterPoint"]\').hidden'), 'choice made; the construction site appears');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(300);
  // gather the few missing materials (three hits each), then build
  for (let guard = 0; guard < 6 && !(await S('s.resources.wood >= WV.data.technologies[s.tech].cost.wood && s.resources.stone >= WV.data.technologies[s.tech].cost.stone')); guard++) {
    const target = await S('(() => { const c = WV.data.technologies[s.tech].cost; const res = s.resources.wood < c.wood ? "wood" : "stone"; return WV.sim.sceneOf(s).hotspots.find((h) => h.kind === "node" && h.res === res && s.nodes[h.id].charges > 0).id; })()');
    for (let h = 0; h < 3; h++) { await click(`#hotspots [data-id="${target}"]`); await sleep(110); }
    await sleep(620);
  }
  const before3 = await S('JSON.stringify(s.resources)');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(250);
  await click('#sheet [data-act="build"]'); await sleep(200);
  await evaluate('document.querySelector(\'#sheet [data-act="build"]\') && document.querySelector(\'#sheet [data-act="build"]\').click(); true');
  check(await S(`s.builds.waterPoint === 'building' && (JSON.parse('${before3}').wood - s.resources.wood) === WV.data.technologies[s.tech].cost.wood`), 'construction starts and materials are spent once');
  await sleep(1500); if (vp[0] >= 1000) await shot(`${scenario}-16-building`);
  await sleep(3300);
  check(await S('s.builds.waterPoint === "built"'), 'construction completes');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(250);
  for (let guard = 0; guard < 12 && !(await S('s.flags.systemActive')); guard++) {
    await click('#sheet [data-act="activate"]'); await sleep(scenario === 'highland' ? 1500 : 500);
    if (guard === 1 && vp[0] >= 1000) await shot(`${scenario}-17-activating`);
    await sleep(2600);
  }
  check(await S('s.flags.systemActive && s.activation.length === 3 && s.water.active && s.water.capacityCans > 0'), 'the system activates after its three steps');
  check(await S('WV.water.residents(s).project === 0 && WV.sim.metrics(s).peopleWithWater === WV.water.residents(s).existing'), 'activation adds capacity, not instant access');
  check(await evaluate('WV.scene.walkerPositions().some((w) => w.route === "waterCollectionAfter") && WV.scene.walkerPositions().some((w) => w.route === "waterCollection")'), 'a few families try the new point while most still walk the long route');
  check(await evaluate('WV.scene.walkerPositions().length >= 5'), 'the village stays lively');
  if (vp[0] >= 1000) {
    await evaluate('document.querySelectorAll(".toasts .toast").forEach((x) => x.remove()); document.getElementById("sheet").hidden = true; true');
    await shot(`${scenario}-18-active`);
    const wp = await evaluate(`(() => { const b = document.querySelector('.site.wp').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
    const c = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, wp[0] - 160), y: Math.max(0, wp[1] - 110), width: 320, height: 200, scale: 2 } });
    fs.writeFileSync(path.join(OUT, `${scenario}-18b-wp.png`), Buffer.from(c.result.data, 'base64'));
  }
  await sleep(4500);
  check(await evaluate('/Water Project Activated!/.test(document.getElementById("dlg").textContent)'), 'Water Project Activated! milestone');
  if (vp[0] >= 1000) await shot(`${scenario}-19-milestone`);
  const musicL3b = await evaluate('WV.audio.state()');
  check(musicL3b.playing && musicL3b.position > musicL3 + 8, `music kept playing through Level 3 (${musicL3.toFixed(1)}s → ${musicL3b.position.toFixed(1)}s)`);
  await click('[data-act="next-level"]'); await sleep(400);
  check(await S('s.level === 4 && s.flags.level3Completed'), 'Level 4 unlocked');

  // ---- Level 4: manage the water ----------------------------------------------------
  for (let i = 0; i < 20 && !(await S('s.water.hh.project > 0')); i++) await sleep(1000);
  check(await S('s.water.hh.project > 0'), 'the first households are verified after a short while');
  const c0 = await evaluate('Number(document.getElementById("reliableCount").textContent.replace(/,/g, ""))');
  await click('.stat-btn[data-act="open-population"]'); await sleep(400);
  check(await evaluate('document.querySelectorAll(".cats .cat").length === 5 && !!document.querySelector(".distbar .seg-existing")'), 'community panel shows five categories and a distribution bar');
  check(await evaluate(`[...document.querySelectorAll('.cats .n')].reduce((t, n) => t + Number(n.textContent.replace(/,/g, '')), 0) === ${await S('s.population')}`), 'panel categories add up to the population');
  check(await S('s.flags.populationPanelSeen'), 'review objective done');
  if (vp[0] >= 1000 || vp[0] < 600) await shot(`${scenario}-20-population-${vp[0]}`);
  await click('[data-act="close-dialog"]'); await sleep(250);
  await click('#hotspots [data-id="waterPoint"]'); await sleep(250);
  await click('#sheet [data-act="open-allocation"]'); await sleep(350);
  check(await evaluate('document.querySelectorAll(".alloc-row input[type=range]").length === 4 && !!document.querySelector("#allocBudget .budget-nums")'), 'sharing panel: four sliders and a shared budget');
  const vals = () => evaluate('JSON.stringify(Object.fromEntries([...document.querySelectorAll(\'[data-act="alloc"]\')].map((r) => [r.dataset.id, Number(r.value)])))').then(JSON.parse);
  const confirmed = await vals();
  const centre = (id) => evaluate(`(() => { const r = document.querySelector('[data-act="alloc"][data-id="${id}"]').getBoundingClientRect(); return [r.left, r.right, r.top + r.height / 2]; })()`);
  // 1) keyboard: push homes up until the pool is empty
  await evaluate('document.querySelector(\'[data-act="alloc"][data-id="homes"]\').focus(); true');
  for (let i = 0; i < 25; i++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  await sleep(150);
  let v = await vals();
  check(v.school === confirmed.school && v.clinic === confirmed.clinic && v.garden === confirmed.garden, 'keyboard: moving homes leaves the other sliders alone');
  const draft1 = await evaluate('JSON.stringify(WV.debug.ui.allocDraft)').then(JSON.parse);
  check(v.homes === draft1.homes && await evaluate(`WV.water.sum(WV.debug.ui.allocDraft) <= WV.debug.state.water.capacityCans`), 'keyboard: homes stops within the shared supply');
  // 2) mouse: drag school all the way right
  let [l, r, y] = await centre('school');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: l + 4, y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 12; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: l + 4 + ((r - l) * i) / 12, y, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r, y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(150);
  const v2 = await vals();
  check(v2.homes === v.homes && v2.clinic === v.clinic && v2.garden === v.garden, 'mouse drag: moving school leaves the others alone');
  check(await evaluate('WV.water.sum(WV.debug.ui.allocDraft) <= WV.debug.state.water.capacityCans && WV.debug.ui.allocDraft.school <= WV.water.needs(WV.debug.state).school'), 'mouse drag: school stops at its demand or the remaining water');
  if (await evaluate('WV.water.budget(WV.debug.state, WV.debug.ui.allocDraft).remaining === 0')) check(await evaluate('/All available water has been allocated/.test(document.getElementById("allocBudget").textContent)'), 'empty pool says so plainly');
  // 3) touch: drag homes down, which frees water; nothing else moves
  [l, r, y] = await centre('homes');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r - 6, y }] });
  for (let i = 1; i <= 8; i++) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r - 6 - ((r - l) * 0.4 * i) / 8, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(150);
  const v3 = await vals();
  check(v3.school === v2.school && v3.clinic === v2.clinic && v3.garden === v2.garden, 'touch drag: moving homes leaves the others alone');
  check(v3.homes < v2.homes && await evaluate('WV.water.budget(WV.debug.state, WV.debug.ui.allocDraft).remaining > 0'), `touch drag: lowering homes returns water to the pool (${v2.homes} → ${v3.homes})`);
  if (vp[0] >= 1000 || vp[0] < 600) await shot(`${scenario}-21-share-${vp[0]}`);
  // 4) cancel restores the confirmed plan
  await click('.dlg-foot [data-act="alloc-cancel"]'); await sleep(300);
  check(await evaluate(`JSON.stringify(WV.debug.state.water.allocation) === ${JSON.stringify(JSON.stringify(confirmed))}`) || await evaluate('JSON.stringify(WV.debug.state.water.allocation)').then((x) => { const a = JSON.parse(x); return ['homes', 'school', 'clinic', 'garden'].every((k) => a[k] === confirmed[k]); }), 'Cancel keeps the confirmed plan');
  await click('#sheet [data-act="open-allocation"]'); await sleep(350);
  check(JSON.stringify(await vals()) === JSON.stringify(confirmed), 'reopening shows the confirmed values, not the cancelled draft');
  // 5) apply commits exactly the draft
  await evaluate(`(() => { const r = document.querySelector('[data-act="alloc"][data-id="garden"]'); r.value = String(Math.max(0, Number(r.value) - 2)); r.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const draftFinal = await evaluate('JSON.stringify(WV.debug.ui.allocDraft)');
  await click('[data-act="alloc-confirm"]'); await sleep(350);
  check(await S('s.water.allocationSet') && await S('JSON.stringify(s.water.allocation)') === draftFinal, 'Apply commits exactly the draft');
  check(await S('WV.water.validate(s, s.water.allocation).valid'), 'the applied plan is valid');
  await click('#hotspots [data-id="committee"]'); await sleep(250);
  await click('#sheet [data-act="open-decision"]'); await sleep(350);
  check(await evaluate('document.querySelectorAll(\'[data-act="decide"]\').length === 2'), 'committee offers two options');
  if (vp[0] >= 1000) await shot(`${scenario}-22-committee`);
  await click(`[data-act="decide"][data-id="${scenario === 'plateau' ? 'reliability' : 'extend'}"]`); await sleep(350);
  check(await S('!!s.water.decision'), 'committee decision recorded');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(250);
  const r0 = await S('WV.sim.metrics(s).peopleWithWater');
  await click('#sheet [data-act="run-week"]'); await sleep(1650);
  const mid = await evaluate('Number(document.getElementById("reliableCount").textContent.replace(/,/g, ""))');
  await sleep(1300);
  const r1 = await S('WV.sim.metrics(s).peopleWithWater');
  const shownNow = await evaluate('Number(document.getElementById("reliableCount").textContent.replace(/,/g, ""))');
  check(r1 >= r0 && shownNow === r1, `reliable access after week 1: ${r0} → ${r1} (counter eased through ${mid})`);
  await click('#sheet [data-act="run-week"]'); await sleep(1700);
  check(await S('s.water.weeksRun >= 2'), 'two weeks run');
  if (vp[0] >= 1000) { await evaluate('document.querySelectorAll(".toasts .toast").forEach((x) => x.remove()); true'); await shot(`${scenario}-23-week`); }
  await sleep(1400);
  check(await evaluate('/The water is shared/.test(document.getElementById("dlg").textContent)'), 'Level 4 milestone');
  if (vp[0] >= 1000) await shot(`${scenario}-24-level4`);
  await click('[data-act="next-level"]'); await sleep(300);
  check(await S('s.level === 5 && s.completedLevels.includes(4)'), 'Level 5 unlocked');

  // ---- Level 5: keep the water flowing ---------------------------------------------
  const musicL5 = await evaluate('WV.audio.state().position');
  check(await S('!!s.maint && s.water.supplyFactor < 1 && WV.water.residents(s).reliable < s.maint.reliableBefore'), 'a maintenance problem reduces service');
  check(await evaluate('document.querySelector("svg.scene").classList.contains("maint-issue")'), 'the map shows the problem');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(300);
  check(await evaluate('/Needs attention/.test(document.getElementById("sheet").textContent) && !!document.querySelector("#sheet .condbar")'), 'inspection panel shows condition, flow, access and status');
  await click('#sheet [data-act="maint-inspect"]'); await sleep(300);
  check(await S('s.maint.inspected') && await evaluate('!document.querySelector(\'#hotspots [data-id="issue"]\').hidden'), 'the problem spot appears');
  if (vp[0] >= 1000) await shot(`${scenario}-25-inspect`);
  await click('#sheet [data-act="goto-issue"]'); await sleep(400);
  const wrongOpt = await S('WV.maint.def(s).options.find((o) => !o.correct).id');
  await click(`#sheet [data-act="maint-diagnose"][data-id="${wrongOpt}"]`); await sleep(250);
  check(await S('!s.maint.diagnosed && s.maint.wrong.length === 1') && await evaluate('!!document.querySelector("#sheet .why")'), 'a wrong diagnosis is explained, no penalty');
  const rightOpt = await S('WV.maint.def(s).options.find((o) => o.correct).id');
  await click(`#sheet [data-act="maint-diagnose"][data-id="${rightOpt}"]`); await sleep(300);
  check(await S('s.maint.diagnosed'), 'diagnosis confirmed');
  if (vp[0] >= 1000) await shot(`${scenario}-26-diagnose`);
  for (let guard = 0; guard < 40 && !(await S('s.maint.repaired')); guard++) {
    const short = await S('s.maint.steps.length === 0 && Object.keys(WV.maint.def(s).cost).some((k) => s.resources[k] < WV.maint.def(s).cost[k])');
    if (short) {
      const target = await S('(() => { const c = WV.maint.def(s).cost; const res = Object.keys(c).find((k) => s.resources[k] < c[k]); const h = WV.sim.sceneOf(s).hotspots.find((x) => x.kind === "node" && x.res === res && s.nodes[x.id].charges > 0); return h ? h.id : null; })()');
      if (target) { for (let h = 0; h < 3; h++) { await click(`#hotspots [data-id="${target}"]`); await sleep(110); } await sleep(620); } else await sleep(1000);
      await click('#hotspots [data-id="issue"]'); await sleep(250); continue;
    }
    await click('#sheet [data-act="maint-step"]'); await sleep(1500);
  }
  check(await S('s.maint.repaired && s.maint.condition >= 0.9 && s.water.supplyFactor === 1'), 'repair restores condition and supply');
  check(await S('s.maint.reliableAtRepair < s.maint.reliableBefore'), 'access is not restored instantly by the repair');
  check(await evaluate('!document.querySelector("svg.scene").classList.contains("maint-issue") && document.querySelector(\'#hotspots [data-id="issue"]\').hidden'), 'the warning disappears');
  for (let i = 0; i < 30 && !(await S('WV.water.residents(s).reliable >= s.maint.reliableBefore')); i++) await sleep(1000);
  check(await S('WV.water.residents(s).reliable >= s.maint.reliableBefore'), 'reliable service recovers over the next periods');
  await click('#hotspots [data-id="committee"]'); await sleep(250);
  await click('#sheet [data-act="open-review"]'); await sleep(350);
  check(await evaluate('document.querySelectorAll(\'[data-act="choose-priority"]\').length === 3'), 'project review with three community priorities');
  await click('[data-act="choose-priority"][data-id="garden"]'); await sleep(200);
  if (vp[0] >= 1000) await shot(`${scenario}-27-review`);
  await click('[data-act="complete-project"]'); await sleep(1200);
  check(await evaluate('/Water Changes Everything/.test(document.getElementById("dlg").textContent) && /more than a water system/.test(document.getElementById("dlg").textContent)'), 'finale screen');
  const shownReliable = await evaluate('Number(document.querySelector(".finale-stats li b").textContent.split(" of ")[0].replace(/,/g, ""))');
  check(shownReliable === await S('s.maint.report.reliable') && await S('s.maint.report.reliable + s.maint.report.stillWaiting === s.population'), 'finale numbers come from the saved simulation report');
  check(await evaluate('document.querySelector(\'.finale-foot a\').href === "https://www.charitywater.org/our-work" && document.querySelector(\'.finale-foot a\').target === "_blank"'), 'learn link opens charity: water’s project page in a new tab');
  await sleep(1200); await shot(`${scenario}-28-finale-${vp[0]}`);
  const musicEnd = await evaluate('WV.audio.state()');
  check(musicEnd.playing && musicEnd.position > musicL5 + 5, `music kept playing through Level 5 (${musicL5.toFixed(1)}s → ${musicEnd.position.toFixed(1)}s)`);
  await click('.finale-foot [data-act="next-level"]'); await sleep(500);
  check(await S('s.flags.campaignComplete && s.completedLevels.includes(5)'), 'campaign complete; exploring the village');
  check(await evaluate('/Project complete/.test(document.getElementById("hudObjective").textContent) && WV.scene.walkerPositions().length >= 4 && document.querySelectorAll(".animal").length >= 3'), 'the finished village stays alive');
  await click('#hotspots [data-id="waterPoint"]'); await sleep(250);
  check(await evaluate('!!document.querySelector(\'#sheet [data-act="open-allocation"]\')'), 'allocations can still be adjusted');
  await click('#sheet [data-act="close-sheet"]');

  // save → reload → continue
  const waterBefore = await S('JSON.stringify({ hh: s.water.hh, far: s.water.far, decision: s.water.decision, allocation: s.water.allocation, weeksRun: s.water.weeksRun, periods: s.water.periods, households: s.households })');
  await go(`${BASE}/index.html`);
  check(await evaluate('!document.getElementById("continueBtn").hidden'), 'Continue offered after reload');
  await click('#continueBtn'); await sleep(600);
  check(await S(`s.level === 5 && s.flags.campaignComplete && s.maint.repaired && s.builds.waterPoint === 'built' && s.name === 'Smoke Ridge' && s.scenarioId === '${scenario}'`), 'a completed village reopens with everything intact');
  const waterAfter = await S('JSON.stringify({ hh: s.water.hh, far: s.water.far, decision: s.water.decision, allocation: s.water.allocation, weeksRun: s.water.weeksRun, periods: s.water.periods, households: s.households })');
  { const b = JSON.parse(waterBefore), a = JSON.parse(waterAfter); const tot = (x) => Object.values(x.hh).reduce((p, v) => p + v, 0);
    check((waterAfter === waterBefore || a.periods === b.periods + 1) && tot(a) === b.households && JSON.stringify(a.allocation) === JSON.stringify(b.allocation),
      `continue restores household access without duplicating it (periods ${b.periods} → ${a.periods})`); }
  check(JSON.parse(waterAfter).weeksRun === JSON.parse(waterBefore).weeksRun && JSON.parse(waterAfter).decision === JSON.parse(waterBefore).decision, 'continue keeps the committee decision and weeks run');
  check(await evaluate('document.querySelector(".site.wp").getAttribute("data-state") === "built" && document.querySelector("svg.scene").classList.contains("system-active")'), 'the active water system is drawn after continue');
  check(await evaluate('document.querySelector(".site").getAttribute("data-state") === "built"'), 'built station is drawn after continue');
}

for (const sc of ['highland', 'plateau', 'wetland']) await playCampaign(sc, [1440, 900]);
await playCampaign('plateau', [390, 844]);
await playCampaign('wetland', [1024, 768]);

// ---- a new village starts from scratch ----------------------------------------------
console.log('\nnew village');
await go(`${BASE}/index.html`); await click('#continueBtn'); await sleep(400);
await evaluate('window.confirm = () => true; true');
await click('[data-act="open-menu"]'); await sleep(200); await click('[data-act="new-village"]'); await sleep(300);
await evaluate('document.getElementById("villageName").value = "Second Valley"; true'); await click('#nameForm button[type="submit"]'); await sleep(600);
check(await S('s.name === "Second Valley" && s.level === 1 && !s.maint && !s.flags.campaignComplete && s.builds.lab === "site" && s.resources.wood === 0'), 'a new village resets progression');
await click('[data-act="begin"]'); await sleep(300);

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
const beforePt = await evaluate('JSON.stringify(WV.sim.sceneOf(WV.debug.state).routes.waterCollection.points[5])');
const hp = await evaluate(`(() => { const r = document.querySelector('.dev-handle[data-route="waterCollection"][data-i="5"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hp[0], y: hp[1], button: 'left', clickCount: 1 });
for (let i = 1; i <= 5; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hp[0] + i * 8, y: hp[1] + i * 4, button: 'left', buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hp[0] + 40, y: hp[1] + 20, button: 'left', clickCount: 1 });
await sleep(200);
const afterPt = await evaluate('JSON.stringify(WV.sim.sceneOf(WV.debug.state).routes.waterCollection.points[5])');
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
