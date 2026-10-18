// Unit tests for the village model. Run: node --test tests/
// No dependencies: the browser scripts attach to globalThis when `window` is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../js/village/data.js');
require('../js/village/sim.js');
const { data: D, sim } = globalThis.WV;
const SCENARIOS = Object.keys(D.scenarios);

const village = (name, salt, sc) => sim.generateVillage(name, salt, sc);
function play(s, fn) { const r = fn(s); assert.ok(r.ok, r.reason || 'action failed'); return r.state; }

test('generation is deterministic for the same name and salt', () => {
  assert.deepEqual(village('Kesi Hill', 42), village('Kesi Hill', 42));
  assert.deepEqual(village('  kesi   hill ', 42).seed, village('Kesi Hill', 42).seed, 'case and spacing do not change the seed');
});

test('all three scenarios are reachable from random salts, and populations stay in range', () => {
  const seen = new Set();
  for (let salt = 0; salt < 300; salt++) {
    const v = village('Tolu Ridge', salt);
    seen.add(v.scenarioId);
    const [lo, hi] = D.scenarios[v.scenarioId].population;
    assert.ok(v.population >= lo && v.population <= hi);
    const [rlo, rhi] = D.scenarios[v.scenarioId].roundTripMin;
    assert.ok(v.baseline.roundTripMin >= rlo && v.baseline.roundTripMin <= rhi);
  }
  assert.deepEqual([...seen].sort(), [...SCENARIOS].sort());
});

test('a forced scenario is honoured and unknown ones are ignored', () => {
  for (const id of SCENARIOS) assert.equal(village('Amo Bend', 7, id).scenarioId, id);
  assert.ok(SCENARIOS.includes(village('Amo Bend', 7, 'nope').scenarioId));
});

test('names are cleaned and validated', () => {
  assert.equal(sim.cleanName('  <b>Kesi</b>  Hill!! '), 'bKesib Hill');
  assert.equal(sim.validName('a'), false);
  assert.equal(sim.validName('Ña Ruri'), true);
  assert.throws(() => village('!', 1));
  assert.ok(sim.validName(sim.suggestName(sim.rng(3))));
});

const routesOf = (sc) => sim.allRoutes(sc);

test('every hotspot and route point lies inside its scene crop, away from the edges', () => {
  for (const [id, sc] of Object.entries(D.scenes)) {
    const c = sc.crop;
    const inside = (x, y) => x >= c.x + 3 && x <= c.x + c.w - 3 && y >= c.y + 3 && y <= c.y + c.h - 3;
    sc.hotspots.forEach((h) => assert.ok(inside(h.x, h.y), `${id}/${h.id} outside crop`));
    routesOf(sc).forEach(([rid, r]) => r.points.forEach(([x, y], i) => assert.ok(inside(x, y), `${id}/${rid} point ${i} outside crop`)));
    assert.ok(sc.hotspots.some((h) => h.id === 'committee') && sc.hotspots.some((h) => h.id === 'source') && sc.hotspots.some((h) => h.id === 'lab'), `${id} missing a required hotspot`);
    sc.hotspots.filter((h) => h.kind !== 'node').forEach((h) => assert.ok(sc.places[h.id], `${id}/${h.id} has no panel text`));
  }
});

test('the new art is used at its own aspect ratio', () => {
  for (const [id, sc] of Object.entries(D.scenes)) {
    assert.match(sc.image, /^assets\/images\/village\/[a-z-]+\/bg-main\.png$/, id);
    assert.equal(sc.w / sc.h, 1672 / 941, `${id} declared size does not match the painting`);
  }
});

test('routes are well formed and the collection route links the village to the water', () => {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const [id, sc] of Object.entries(D.scenes)) {
    for (const [rid, r] of routesOf(sc)) {
      assert.ok(r.points.length >= 2 && r.speed > 0 && r.walkers >= 1 && r.spacing >= 0, `${id}/${rid} needs points, speed, walkers, spacing`);
      assert.equal(r.mode, 'outAndBack', `${id}/${rid} mode`);
      for (let i = 1; i < r.points.length; i++) assert.ok(dist(r.points[i], r.points[i - 1]) < 12, `${id}/${rid} has a long straight jump at point ${i}`);
    }
    const h = (hid) => { const x = sc.hotspots.find((y) => y.id === hid); return [x.x, x.y]; };
    const c = sc.routes.waterCollection.points;
    assert.ok(dist(c[c.length - 1], h('source')) < 8, `${id}: collection route should end at the water source`);
    assert.ok(dist(c[0], h('committee')) < 8, `${id}: collection route should start in the village centre`);
    assert.ok(sc.routes.waterCollection.cans && sc.routes.waterCollectionAfter.cans && !sc.routes.ambient.some((a) => a.cans) && !sc.routes.labApproach.cans, `${id}: only collectors carry jerry cans`);
    const l = sc.routes.labApproach.points;
    assert.ok(dist(l[l.length - 1], h('lab')) < 6, `${id}: lab approach should end at the field-testing station`);
  }
});

test('Phase 1 villages are unchanged by the Level 2 additions', () => {
  // Captured from the Phase 1 commit (f8600ee) with the same names and salts.
  const before = {
    'Kesi Hill|42': { scenarioId: 'wetland', population: 173, households: 29, roundTripMin: 45, people: { chair: 'Lina', treasurer: 'Tomas', caretaker: 'Mara', officer: 'Ayo' } },
    'Tolu Ridge|7': { scenarioId: 'plateau', population: 338, households: 56, roundTripMin: 76, people: { chair: 'Daniel', treasurer: 'Sela', caretaker: 'Kito', officer: 'Mei' } },
    'Sefa Fields|123456': { scenarioId: 'wetland', population: 159, households: 27, roundTripMin: 29, people: { chair: 'Esi', treasurer: 'Kito', caretaker: 'Ines', officer: 'Kofi' } },
  };
  for (const [key, exp] of Object.entries(before)) {
    const [name, salt] = key.split('|'); const v = village(name, +salt);
    assert.equal(v.scenarioId, exp.scenarioId); assert.equal(v.population, exp.population);
    assert.equal(v.households, exp.households); assert.equal(v.baseline.roundTripMin, exp.roundTripMin);
    for (const [role, n] of Object.entries(exp.people)) assert.equal(v.people[role].name, n, `${key} ${role}`);
    assert.ok(v.people.engineer.name && !Object.values(exp.people).includes(v.people.engineer.name), 'engineer gets a different name');
  }
});

test('a save from Phase 1 loads, keeps its progress and gains the Level 2 fields', () => {
  const v = village('Kesi Hill', 42);
  const old = JSON.parse(JSON.stringify(v));
  delete old.samples; delete old.results; delete old.surveys; delete old.site; delete old.people.engineer;
  delete old.flags.labUnlocked; delete old.flags.optionsReviewed;
  Object.assign(old, { level: 2, completedLevels: [1], builds: { lab: 'built' }, inspected: ['barn', 'source', 'committee'] });
  const loaded = sim.deserialize(JSON.stringify(old));
  assert.ok(loaded, 'old save loads');
  assert.equal(loaded.level, 2); assert.equal(loaded.builds.lab, 'built');
  assert.deepEqual(loaded.site, v.site, 'site facts regenerate deterministically');
  assert.deepEqual(loaded.samples, []); assert.equal(loaded.flags.labUnlocked, false); assert.equal(loaded.flags.clearSampleInspected, false);
  assert.equal(loaded.people.chair.name, 'Lina');
  assert.ok(loaded.people.engineer.name && loaded.people.engineer.name !== loaded.people.officer.name);
});

test('each scenario names a primary technology that exists in the registry and is playable', () => {
  for (const sc of Object.values(D.scenarios)) assert.equal(D.technologies[sc.primaryTech].playable, true);
});

test('gathering adds resources, spends charges, and stops at zero', () => {
  let s = village('Kesi Hill', 1, 'highland');
  for (let i = 0; i < 3; i++) s = play(s, (x) => sim.gather(x, 'wood1'));
  assert.equal(s.resources.wood, 6); assert.equal(s.gathered.wood, 6); assert.equal(s.nodes.wood1.charges, 0);
  const r = sim.gather(s, 'wood1');
  assert.equal(r.ok, false); assert.equal(r.state, s, 'failed action returns the same state');
  assert.equal(sim.gather(s, 'committee').ok, false, 'only nodes can be gathered');
});

test('actions never mutate their input state', () => {
  const s = village('Kesi Hill', 1, 'highland');
  const before = JSON.stringify(s);
  sim.gather(s, 'stone1'); sim.inspect(s, 'lake'); sim.setFlag(s, 'committeeMet');
  assert.equal(JSON.stringify(s), before);
});

test('building needs the committee and resources, changes nothing on failure, and goes site → building → built', () => {
  let s = village('Kesi Hill', 1, 'highland');
  assert.equal(sim.startBuild(s, 'lab').ok, false);
  assert.match(sim.canBuild(s, 'lab').reason, /committee/i);
  s = sim.setFlag(s, 'committeeMet');
  const poor = sim.startBuild(s, 'lab');
  assert.equal(poor.ok, false); assert.match(poor.reason, /more wood/);
  assert.equal(poor.state.builds.lab, 'site'); assert.equal(poor.state.resources.wood, 0);
  for (const n of ['wood1', 'wood1', 'stone1', 'stone1']) s = play(s, (x) => sim.gather(x, n));
  s = play(s, (x) => sim.startBuild(x, 'lab'));
  assert.equal(s.builds.lab, 'building'); assert.deepEqual(s.resources, { wood: 0, stone: 1 });
  assert.equal(sim.startBuild(s, 'lab').ok, false, 'cannot build twice');
  s = play(s, (x) => sim.finishBuild(x, 'lab'));
  assert.equal(s.builds.lab, 'built');
});

test('every scenario offers enough wood and stone for Level 1', () => {
  for (const [id, sc] of Object.entries(D.scenes)) {
    const supply = { wood: 0, stone: 0 };
    sc.hotspots.filter((h) => h.kind === 'node').forEach((h) => (supply[h.res] += h.charges * h.yield));
    const cost = D.builds.lab.cost;
    assert.ok(supply.wood >= Math.max(6, cost.wood) && supply.stone >= Math.max(4, cost.stone), `${id} lacks materials`);
    assert.ok(sc.hotspots.filter((h) => h.kind !== 'node').length >= 4, `${id} has too few places to explore`);
  }
});

test('Level 1 can be completed in every scenario, and objective texts match their checks', () => {
  for (const id of SCENARIOS) {
    let s = village('Sefa Fields', 9, id);
    assert.equal(sim.levelReady(s), false);
    assert.equal(sim.nextObjective(s).id, 'explore', 'naming is already done');
    for (const h of ['source', 'committee', 'homes']) s = play(s, (x) => sim.inspect(x, h));
    s = sim.setFlag(s, 'committeeMet');
    s = sim.setFlag(s, 'walkWatched');
    const nodes = D.scenes[D.scenarios[id].scene].hotspots.filter((h) => h.kind === 'node');
    for (const n of nodes) for (let i = 0; i < n.charges; i++) s = play(s, (x) => sim.gather(x, n.id));
    assert.equal(sim.nextObjective(s).id, 'lab');
    assert.match(sim.nextObjective(s).text, /4 wood, 3 stone/);
    s = play(s, (x) => sim.startBuild(x, 'lab'));
    s = play(s, (x) => sim.finishBuild(x, 'lab'));
    assert.equal(sim.levelReady(s), true);
    s = play(s, sim.completeLevel);
    assert.equal(s.level, 2); assert.deepEqual(s.completedLevels, [1]);
    assert.equal(sim.levelReady(s), false, 'a level with no objectives yet is never "complete"');
    assert.equal(sim.completeLevel(s).ok, false);
  }
});

test('objective progress text reflects the state', () => {
  let s = village('Kesi Hill', 1, 'highland');
  s = play(s, (x) => sim.gather(x, 'wood1'));
  const g = sim.objectives(s).find((o) => o.id === 'gather');
  assert.match(g.text, /wood 2\/6 · stone 0\/4/);
});

test('save → load round trip is lossless, and a mid-construction save loads as built', () => {
  let s = village('Kesi Hill', 5, 'wetland');
  s = play(s, (x) => sim.inspect(x, 'school'));
  s = play(s, (x) => sim.gather(x, 'stone2'));
  assert.deepEqual(sim.deserialize(sim.serialize(s)), s);
  const mid = { ...s, builds: { lab: 'building' } };
  assert.equal(sim.deserialize(sim.serialize(mid)).builds.lab, 'built');
  assert.equal(sim.deserialize('not json'), null);
  assert.equal(sim.deserialize(JSON.stringify({ ...s, v: 99 })), null);
  assert.equal(sim.deserialize(JSON.stringify({ ...s, scenarioId: 'moon' })), null);
});

test('metrics are consistent with the baseline', () => {
  const s = village('Kesi Hill', 1, 'plateau');
  const m = sim.metrics(s);
  assert.ok(m.litresPerPerson > 5 && m.litresPerPerson < 30);
  assert.equal(m.hoursPerHousehold, (2 * s.baseline.roundTripMin) / 60);
  assert.equal(m.peopleWithWater, 0);
});

/* ---- Level 2: investigate the water --------------------------------------------------------- */
function finishLevel1(id, salt = 9) {
  let s = village('Sefa Fields', salt, id);
  for (const h of ['source', 'committee', 'homes']) s = play(s, (x) => sim.inspect(x, h));
  s = sim.setFlag(sim.setFlag(s, 'committeeMet'), 'walkWatched');
  for (const n of D.scenes[D.scenarios[id].scene].hotspots.filter((h) => h.kind === 'node')) for (let i = 0; i < n.charges; i++) s = play(s, (x) => sim.gather(x, n.id));
  s = play(s, (x) => sim.startBuild(x, 'lab')); s = play(s, (x) => sim.finishBuild(x, 'lab'));
  return play(s, sim.completeLevel);
}
const statusOf = (s, id) => sim.technologyOptions(s).find((c) => c.id === id).status;
const surveyAll = (s) => Object.keys(sim.sceneOf(s).surveys).reduce((x, sv) => play(x, (y) => sim.survey(y, sv)), s);
function benchWork(s, guess = 'unsure') {
  s = play(s, (x) => sim.inspectJar(x, 'clear', guess));
  s = play(s, (x) => sim.inspectJar(x, 'dirty'));
  s = play(s, sim.useMicroscope);
  return play(s, sim.runFilter);
}

test('Level 2 actions are locked during Level 1, and survey sites stay hidden', () => {
  const s = village('Kesi Hill', 1, 'highland');
  assert.equal(sim.collectSample(s, 'source').ok, false);
  assert.equal(sim.survey(s, 'survey1').ok, false);
  assert.equal(sim.openLab(s).ok, false);
  assert.equal(sim.inspect(s, 'survey1').ok, false, 'survey sites are not visible yet');
});

test('the sample comes from today’s collection point, and the lab needs it', () => {
  let s = finishLevel1('plateau');
  assert.equal(sim.nextObjective(s).id, 'sample');
  assert.equal(sim.openLab(s).ok, false, 'no sample yet');
  assert.equal(sim.collectSample(s, 'well').ok, false, 'only the collection point');
  s = play(s, (x) => sim.collectSample(x, 'source'));
  assert.equal(sim.collectSample(s, 'source').ok, false, 'one sample');
  assert.equal(sim.nextObjective(s).id, 'bring');
  s = play(s, sim.openLab);
  assert.equal(s.flags.labUnlocked, true);
  assert.equal(sim.nextObjective(s).id, 'clear');
});

test('lab steps run in order, and the clear sample needs a guess', () => {
  let s = finishLevel1('highland');
  assert.equal(sim.inspectJar(s, 'clear', 'safe').ok, false, 'lab not unlocked');
  s = play(s, (x) => sim.collectSample(x, 'source')); s = play(s, sim.openLab);
  assert.match(sim.inspectJar(s, 'dirty').reason, /clear sample/);
  assert.match(sim.useMicroscope(s).reason, /clear sample/);
  assert.equal(sim.inspectJar(s, 'clear').ok, false, 'needs a guess');
  s = play(s, (x) => sim.inspectJar(x, 'clear', 'safe'));
  assert.deepEqual(s.results.source, { prediction: 'safe', clarity: 'clear', germ: 'unsafe', salty: false });
  assert.match(sim.runFilter(s).reason, /cloudy sample/);
  s = play(s, (x) => sim.inspectJar(x, 'dirty'));
  assert.equal(s.results.river.clarity, 'cloudy');
  assert.match(sim.runFilter(s).reason, /microscope/);
  s = play(s, sim.useMicroscope); s = play(s, sim.runFilter);
  assert.match(sim.reviewNotes(s).reason, /surveys/);
  assert.equal(sim.reviewOptions(s).ok, false);
  s = surveyAll(s);
  s = play(s, sim.reviewNotes);
  assert.equal(sim.nextObjective(s).id, 'options');
});

test('the filter makes the cloudy water clearer but not safe', () => {
  for (const id of SCENARIOS) {
    const f = sim.filterResult(finishLevel1(id));
    assert.equal(f.before.clarity, 'cloudy'); assert.equal(f.after.clarity, 'clear');
    assert.notEqual(f.after.germ, 'safe');
  }
});

test('every lab shows a clear jar that is not safe and a cloudy jar with more germs', () => {
  for (const [sid, sc] of Object.entries(D.scenes)) {
    const clear = sc.samples[sc.lab.clear], dirty = sc.samples[sc.lab.dirty];
    assert.equal(clear.clarity, 'clear', sid); assert.notEqual(clear.germ, 'safe', sid);
    assert.equal(dirty.clarity, 'cloudy', sid);
    assert.ok((dirty.colonies || 0) > (clear.colonies || D.results.germ[clear.germ].colonies), `${sid}: the cloudy jar shows more colonies`);
    assert.ok(sc.lab.clear === 'source' || sc.lab.dirty === 'source', `${sid}: one jar is the player's sample`);
    assert.equal(Object.keys(sc.surveys).length, 2);
    for (const k of [sc.lab.clear, sc.lab.dirty, ...Object.keys(sc.surveys)]) assert.ok(sc.hotspots.some((h) => h.id === k), `${sid}: missing hotspot ${k}`);
  }
});

test('lab scenes: one image per scenario, every required hotspot, all inside the painting', () => {
  const required = ['clear', 'dirty', 'microscope', 'filter', 'reagents', 'notebook', 'map'];
  const ids = D.lab.hotspots.map((h) => h.id);
  required.forEach((r) => assert.ok(ids.includes(r), `missing lab hotspot ${r}`));
  D.lab.hotspots.forEach(({ id, rect: [x, y, w, h] }) => assert.ok(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100 && w > 2 && h > 2, `${id} out of bounds`));
  for (const sid of Object.keys(D.scenes)) {
    const lab = D.lab.scenes[sid];
    assert.match(lab.image, /^assets\/images\/lab\/[a-z-]+\/lab-scene\.png$/);
    assert.ok(lab.insets.clear && lab.insets.dirty, `${sid} insets`);
    assert.equal(lab.covers.length, 2, `${sid}: both logos covered`);
  }
});

test('Level 2 can be completed in every scenario; the experts recommend exactly the primary technology', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel1(id);
    s = play(s, (x) => sim.collectSample(x, 'source')); s = play(s, sim.openLab);
    s = benchWork(s);
    assert.equal(sim.nextObjective(s).id, 'surveys');
    s = surveyAll(s);
    s = play(s, sim.reviewNotes);
    const cards = sim.technologyOptions(s);
    const rec = cards.filter((c) => c.status === 'recommended').map((c) => c.id);
    assert.deepEqual(rec, [D.scenarios[id].primaryTech], `${id} recommends ${rec}`);
    assert.ok(cards.filter((c) => c.status === 'no').length >= 4, `${id}: at least four options rejected`);
    assert.ok(cards.every((c) => c.status !== 'unknown'), `${id}: everything is judged once tests and surveys are done`);
    assert.ok(cards.every((c) => c.reason && c.reason.length > 10), `${id}: every option explains itself`);
    s = play(s, sim.reviewOptions);
    assert.equal(sim.levelReady(s), true);
    s = play(s, sim.completeLevel);
    assert.equal(s.level, 3); assert.equal(s.flags.level2Completed, true);
    const back = sim.deserialize(sim.serialize(s));
    assert.deepEqual(back, s, `${id}: Level 2 progress survives save/load`);
  }
});

test('the recommendation holds for 1,000 villages in each scenario', () => {
  for (const id of SCENARIOS) {
    const sc = D.scenes[D.scenarios[id].scene];
    for (let salt = 0; salt < 1000; salt++) {
      const s = village('Amo Bend', salt, id);
      const all = { ...s, level: 2, results: {}, surveys: Object.keys(sc.surveys) };
      for (const k of [sc.lab.clear, sc.lab.dirty]) { const v = sc.samples[k]; all.results[k] = { prediction: 'unsure', clarity: v.clarity, germ: v.germ, salty: !!v.salty }; }
      const rec = sim.technologyOptions(all).filter((c) => c.status === 'recommended').map((c) => c.id);
      assert.deepEqual(rec, [D.scenarios[id].primaryTech], `${id} salt ${salt}`);
    }
  }
});

test('lab tests change the experts’ judgement', () => {
  let s = finishLevel1('wetland');
  s = play(s, (x) => sim.collectSample(x, 'source')); s = play(s, sim.openLab);
  s = surveyAll(s);
  assert.equal(statusOf(s, 'statusQuo'), 'unknown', 'today’s source needs a test before it can be judged');
  assert.equal(statusOf(s, 'handDugWell'), 'unknown', 'well options wait for the salt test');
  assert.equal(statusOf(s, 'bioSand'), 'unknown');
  s = play(s, (x) => sim.inspectJar(x, 'clear', 'safe')); // the clear jar is the village well: salty
  assert.equal(statusOf(s, 'handDugWell'), 'no', 'the salt test rules out a hand-dug well');
  assert.match(sim.technologyOptions(s).find((c) => c.id === 'drilledWell').reason, /salty/);
  s = play(s, (x) => sim.inspectJar(x, 'dirty'));
  assert.equal(statusOf(s, 'statusQuo'), 'no');
  assert.match(sim.technologyOptions(s).find((c) => c.id === 'statusQuo').reason, /Lab test: unsafe/);
});

test('the walker plan grows from collection trips to closer trips plus village life', () => {
  const s = village('Kesi Hill', 1, 'highland');
  const before = sim.walkerPlan(s); const after = sim.walkerPlan({ ...s, flags: { ...s.flags, systemActive: true } });
  assert.equal(before[0].id, 'waterCollection'); assert.equal(after[0].id, 'waterCollectionAfter');
  assert.ok(!before.some((p) => p.id === 'labApproach'), 'no lab walker before the station exists');
  const l2 = sim.walkerPlan({ ...s, level: 2, builds: { lab: 'built' } });
  assert.ok(l2.some((p) => p.id === 'labApproach' && p.route.jar), 'a villager carries samples to the station in Level 2');
  const len = (r) => r.points.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r.points[i][0], p[1] - r.points[i][1]), 0);
  assert.ok(len(after[0].route) < len(before[0].route) / 2, 'the trip gets much shorter');
  assert.ok(after[0].route.walkers <= before[0].route.walkers, 'fewer long collection trips');
  assert.ok(after.slice(1).every((p) => p.extra === 1), 'more people out and about in the village');
});

/* ---- Three-hit gathering ------------------------------------------------------------------ */
test('one or two hits award nothing; exactly the third awards the normal yield', () => {
  const s = village('Kesi Hill', 1, 'highland');
  const a = sim.strike(s, 'wood1', 0);
  assert.equal(a.ok, true); assert.equal(a.done, false); assert.equal(a.hits, 1); assert.equal(a.state, s, 'no state change');
  const b = sim.strike(s, 'wood1', a.hits);
  assert.equal(b.done, false); assert.equal(b.hits, 2); assert.equal(b.state.resources.wood, 0);
  const c = sim.strike(s, 'wood1', b.hits);
  assert.equal(c.done, true); assert.equal(c.amount, 2);
  assert.equal(c.state.resources.wood, 2); assert.equal(c.state.gathered.wood, 2); assert.equal(c.state.nodes.wood1.charges, 2);
  assert.equal(JSON.stringify(s.resources), JSON.stringify({ wood: 0, stone: 0 }), 'input not mutated');
});

test('wood and stone break independently, totals stay exact, and cleared nodes refuse hits', () => {
  let s = village('Kesi Hill', 1, 'wetland');
  const hits = {};
  const hit = (id) => { const r = sim.strike(s, id, hits[id] || 0); assert.ok(r.ok, r.reason); hits[id] = r.done ? 0 : r.hits; s = r.state; return r; };
  hit('wood1'); hit('stone1'); hit('wood1'); hit('stone1');
  assert.deepEqual(s.resources, { wood: 0, stone: 0 }, 'interleaved hits award nothing yet');
  assert.equal(hit('wood1').done, true); assert.deepEqual(s.resources, { wood: 2, stone: 0 });
  assert.equal(hit('stone1').done, true); assert.deepEqual(s.resources, { wood: 2, stone: 2 });
  for (let i = 0; i < 6; i++) hit('wood1');
  assert.equal(s.nodes.wood1.charges, 0); assert.equal(s.resources.wood, 6);
  assert.equal(sim.strike(s, 'wood1', 0).ok, false, 'a cleared node takes no hits');
  assert.equal(sim.strike(s, 'committee', 0).ok, false, 'only resource nodes can be hit');
  assert.equal(sim.strike(s, 'stone1', 99).hits, 3, 'a bogus hit count cannot skip past the break');
  assert.deepEqual(sim.deserialize(sim.serialize(s)).resources, s.resources, 'totals survive save/load');
});

test('Level 1 needs only 15 hits of gathering (5 breaks) in every scenario', () => {
  for (const id of SCENARIOS) {
    const nodes = D.scenes[D.scenarios[id].scene].hotspots.filter((h) => h.kind === 'node');
    const per = (res) => nodes.filter((n) => n.res === res)[0].yield;
    const breaks = Math.ceil(6 / per('wood')) + Math.ceil(4 / per('stone'));
    assert.equal(breaks * sim.HITS_TO_BREAK, 15, id);
  }
});

/* ---- Level 3: build the water solution ------------------------------------------------------- */
function finishLevel2(id, salt = 9) {
  let s = finishLevel1(id, salt);
  s = play(s, (x) => sim.collectSample(x, 'source')); s = play(s, sim.openLab);
  s = benchWork(s); s = surveyAll(s);
  s = play(s, sim.reviewNotes); s = play(s, sim.reviewOptions);
  return play(s, sim.completeLevel);
}
function gatherUntil(s, need) {
  const nodes = D.scenes[D.scenarios[s.scenarioId].scene].hotspots.filter((h) => h.kind === 'node');
  let breaks = 0;
  for (const n of nodes) while (s.resources[n.res] < need[n.res] && s.nodes[n.id].charges > 0) { s = play(s, (x) => sim.gather(x, n.id)); breaks++; }
  return { s, breaks };
}

test('Level 3 starts with refilled gathering spots and the water point hidden until a choice is made', () => {
  for (const id of SCENARIOS) {
    const s = finishLevel2(id);
    assert.equal(s.level, 3);
    assert.ok(Object.values(s.nodes).every((n) => n.charges === 3), `${id}: nodes refilled`);
    assert.equal(sim.visible(s, sim.hotspot(s, 'waterPoint')), false);
    assert.equal(sim.visible(s, sim.hotspot(s, 'survey1')), false, 'survey markers are gone after Level 2');
    assert.equal(sim.nextObjective(s).id, 'meeting');
  }
});

test('only suitable technologies are offered, and only the recommended one can be built', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel2(id);
    assert.equal(sim.chooseTech(s, D.scenarios[id].primaryTech).ok, false, 'meeting first');
    s = play(s, sim.planMeeting);
    const choices = sim.techChoices(s);
    const all = sim.technologyOptions(s);
    for (const c of choices) assert.notEqual(all.find((x) => x.id === c.id).status, 'no', `${id}: ${c.id} unsuitable but offered`);
    assert.deepEqual(choices.filter((c) => c.selectable).map((c) => c.id), [D.scenarios[id].primaryTech]);
    for (const c of choices.filter((x) => !x.selectable)) {
      const r = sim.chooseTech(s, c.id); assert.equal(r.ok, false); assert.ok(r.reason.length > 10, 'explains why'); assert.equal(r.state, s, 'not trapped');
    }
    const bad = all.find((x) => x.status === 'no' && x.id !== 'statusQuo');
    assert.equal(sim.chooseTech(s, bad.id).ok, false, `${id}: unsuitable ${bad.id} refused`);
    s = play(s, (x) => sim.chooseTech(x, D.scenarios[id].primaryTech));
    assert.equal(sim.visible(s, sim.hotspot(s, 'waterPoint')), true, 'the site appears once chosen');
  }
});

test('Level 3 is completable in every scenario with little extra gathering; resources are spent once', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel2(id);
    s = play(s, sim.planMeeting); s = play(s, (x) => sim.chooseTech(x, D.scenarios[id].primaryTech));
    s = play(s, (x) => sim.inspect(x, 'waterPoint'));
    const need = D.technologies[s.tech].cost;
    assert.equal(sim.nextObjective(s).id, 'materials');
    assert.match(sim.nextObjective(s).text, new RegExp(`wood \\d+/${need.wood} · stone \\d+/${need.stone}`));
    const g = gatherUntil(s, need); s = g.s;
    assert.ok(g.breaks <= 2, `${id}: needed ${g.breaks} extra gathers`);
    const before = { ...s.resources };
    s = play(s, (x) => sim.startBuild(x, 'waterPoint'));
    assert.deepEqual(s.resources, { wood: before.wood - need.wood, stone: before.stone - need.stone });
    assert.equal(sim.startBuild(s, 'waterPoint').ok, false, 'no double spend');
    const again = sim.chooseTech(s, 'rehabilitation'); assert.equal(again.ok, false); assert.equal(again.state, s, 'the choice is locked once building starts');
    s = play(s, (x) => sim.finishBuild(x, 'waterPoint'));
    const steps = sim.activationSteps(s);
    assert.equal(steps.length, 3);
    assert.equal(sim.activate(s, steps[2].id).ok, false, 'steps run in order');
    for (const st of steps) s = play(s, (x) => sim.activate(x, st.id));
    assert.equal(s.flags.systemActive, true);
    assert.ok(s.peopleWithWater > s.population * 0.5 && s.peopleWithWater <= s.population, `${id}: served ${s.peopleWithWater}/${s.population}`);
    const m = sim.metrics(s);
    assert.ok(m.roundTripAfter < s.baseline.roundTripMin && m.hoursSavedPerDay > 0);
    assert.equal(sim.walkerPlan(s)[0].id, 'waterCollectionAfter', 'collectors switch to the close water point');
    assert.ok(sim.walkerPlan(s).length >= 3, 'the village stays busy');
    assert.equal(sim.levelReady(s), true);
    s = play(s, sim.completeLevel);
    assert.equal(s.level, 4); assert.equal(s.flags.level3Completed, true);
    assert.deepEqual(sim.deserialize(sim.serialize(s)), s);
  }
});

test('an interrupted water-point build loads as built, and activation progress is saved', () => {
  let s = finishLevel2('highland');
  s = play(s, sim.planMeeting); s = play(s, (x) => sim.chooseTech(x, 'gravityFed'));
  s = gatherUntil(s, D.technologies.gravityFed.cost).s;
  s = play(s, (x) => sim.startBuild(x, 'waterPoint'));
  let back = sim.deserialize(sim.serialize(s));
  assert.equal(back.builds.waterPoint, 'built'); assert.equal(back.tech, 'gravityFed');
  back = play(back, (x) => sim.activate(x, 'valve'));
  const again = sim.deserialize(sim.serialize(back));
  assert.deepEqual(again.activation, ['valve']); assert.equal(sim.nextActivation(again).id, 'trace');
});

test('animals are placed inside each scene, 3–6 per scenario, of the requested kinds', () => {
  const kinds = { highland: ['sheep', 'chicken', 'bird'], plateau: ['lizard', 'goat', 'bird'], wetland: ['duck', 'frog', 'heron'] };
  for (const [id, sc] of Object.entries(D.scenes)) {
    assert.ok(sc.animals.length >= 3 && sc.animals.length <= 6, id);
    assert.deepEqual([...new Set(sc.animals.map((a) => a.kind))].sort(), kinds[id].sort());
    sc.animals.forEach((a) => assert.ok(a.x > 2 && a.x < 98 && a.y > 2 && a.y < 98));
    const spots = sc.hotspots.filter((h) => h.kind !== 'node');
    sc.animals.filter((a) => a.anim !== 'fly').forEach((a) => spots.forEach((h) => assert.ok(Math.hypot(a.x - h.x, a.y - h.y) > 3, `${id}: ${a.kind} sits on hotspot ${h.id}`)));
  }
});
