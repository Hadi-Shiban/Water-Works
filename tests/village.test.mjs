// Unit tests for the village model. Run: node --test tests/
// No dependencies: the browser scripts attach to globalThis when `window` is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../js/village/data.js');
require('../js/village/sim.js');
require('../js/village/water.js');
require('../js/village/maint.js');
const { data: D, sim } = globalThis.WV; const WV = globalThis.WV;
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
  assert.equal(m.peopleWithWater, WV.water.residents(s).existing, 'at the start only verified existing household solutions count');
  assert.ok(m.peopleWithWater > 0 && m.peopleWithWater < s.population * 0.15);
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
  const before = sim.walkerPlan(s);
  const opened = WV.water.open({ ...s, flags: { ...s.flags, systemActive: true }, tech: 'gravityFed' }, 0);
  let later = opened; for (let i = 0; i < 12; i++) later = WV.water.step(later).state;
  const mid = sim.walkerPlan(opened), after = sim.walkerPlan(later);
  assert.equal(before[0].id, 'waterCollection');
  assert.ok(mid.find((p) => p.id === 'waterCollection').count >= 2, 'right after opening most families still walk the long route');
  assert.ok(after.find((p) => p.id === 'waterCollectionAfter').count > mid.find((p) => p.id === 'waterCollectionAfter').count, 'more trips to the new point as adoption grows');
  assert.ok(!after.some((p) => p.id === 'waterCollection') || after.find((p) => p.id === 'waterCollection').count < 3, 'long trips become less frequent');
  assert.ok(!before.some((p) => p.id === 'labApproach'), 'no lab walker before the station exists');
  const l2 = sim.walkerPlan({ ...s, level: 2, builds: { lab: 'built' } });
  assert.ok(l2.some((p) => p.id === 'labApproach' && p.route.jar), 'a villager carries samples to the station in Level 2');
  const len = (r) => r.points.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r.points[i][0], p[1] - r.points[i][1]), 0);
  const near = after.find((p) => p.id === 'waterCollectionAfter');
  assert.ok(len(near.route) < len(before[0].route) / 2, 'the new trip is much shorter');
  assert.ok(after.filter((p) => p.route.ambient !== false && !['waterCollection', 'waterCollectionAfter', 'labApproach'].includes(p.id)).every((p) => p.extra === 1), 'more people out and about in the village');
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
    const m0 = sim.metrics(s);
    assert.equal(m0.peopleWithWater, WV.water.residents(s).existing, `${id}: activation adds capacity, not instant access`);
    assert.ok(s.water.active && s.water.capacityCans > 0);
    for (let i = 0; i < 3; i++) s = WV.water.step(s).state;
    const m = sim.metrics(s);
    assert.ok(m.peopleWithWater > m0.peopleWithWater && m.peopleWithWater < s.population, `${id}: access grows gradually`);
    assert.ok(m.roundTripAfter < s.baseline.roundTripMin && m.hoursSavedPerDay > 0);
    assert.ok(sim.walkerPlan(s).some((p) => p.id === 'waterCollectionAfter'), 'collectors start using the close water point');
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

/* ---- Regression: resource softlock (spots regrow; saves heal; every build is reachable) ------ */
const MS = D.regrowMs;
function breakNode(s, id, now) { let h = 0, r; do { r = sim.strike(s, id, h, now); assert.ok(r.ok, r.reason); h = r.hits; s = r.state; } while (!r.done); return { s, amount: r.amount }; }

test('regression 1: stone can be gathered again after the spot regrows', () => {
  let s = village('Kesi Hill', 1, 'plateau'); const t0 = 1e12;
  for (let i = 0; i < 3; i++) s = breakNode(s, 'stone1', t0).s;
  assert.equal(s.nodes.stone1.charges, 0); assert.equal(sim.strike(s, 'stone1', 0, t0).ok, false);
  assert.equal(sim.regrow(s, t0 + MS - 1).changed, false, 'not before the cooldown');
  s = sim.regrow(s, t0 + MS).state; assert.equal(s.nodes.stone1.charges, 1);
  s = breakNode(s, 'stone1', t0 + MS).s; assert.equal(s.resources.stone, 8);
  s = sim.regrow(s, t0 + 10 * MS).state; assert.equal(s.nodes.stone1.charges, 3, 'fully regrown, never above max');
  assert.equal(s.nodes.stone1.regrowAt, null);
  assert.ok(MS >= 5000 && MS <= 8000, 'cooldown is 5–8 s');
});

test('regression 2: three hits award exactly one reward, even with a stale or bogus hit count', () => {
  let s = village('Kesi Hill', 1, 'highland');
  const r1 = sim.strike(s, 'stone1', 0, 0), r2 = sim.strike(s, 'stone1', 1, 0), r3 = sim.strike(s, 'stone1', 2, 0);
  assert.equal(r1.state.resources.stone + r2.state.resources.stone, 0);
  assert.equal(r3.state.resources.stone, 2); assert.equal(r3.state.nodes.stone1.charges, 2);
  assert.equal(sim.strike(s, 'stone1', 99, 0).state.resources.stone, 2, 'one reward per break');
});

test('regression 3: every mandatory Level 1–3 structure is buildable in every scenario, from zero', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel2(id);
    s.resources = { wood: 0, stone: 0 }; for (const k in s.nodes) s.nodes[k] = { charges: 0, regrowAt: null }; // worst case
    s = sim.deserialize(sim.serialize(s)); // the empty spots heal on load
    s = play(s, sim.planMeeting); s = play(s, (x) => sim.chooseTech(x, D.scenarios[id].primaryTech));
    const need = D.technologies[s.tech].cost; let now = 2e12, secs = 0;
    const nodes = D.scenes[D.scenarios[id].scene].hotspots.filter((h) => h.kind === 'node');
    while (s.resources.wood < need.wood || s.resources.stone < need.stone) {
      s = sim.regrow(s, now).state;
      const n = nodes.find((h) => s.nodes[h.id].charges > 0 && s.resources[h.res] < need[h.res]);
      if (n) { s = breakNode(s, n.id, now).s; now += 1500; secs += 1.5; } else { now += 1000; secs += 1; }
      assert.ok(secs < 120, `${id}: stuck gathering`);
    }
    assert.ok(secs <= 60, `${id}: ${secs}s of gathering from zero for ${JSON.stringify(need)}`);
    s = play(s, (x) => sim.startBuild(x, 'waterPoint'));
    assert.ok(s.resources.wood >= 0 && s.resources.stone >= 0);
  }
});

test('regression 4: recovering from zero wood and zero stone in Level 1', () => {
  let s = village('Kesi Hill', 2, 'wetland'); s = sim.setFlag(s, 'committeeMet'); let now = 5e11;
  for (const k in s.nodes) s.nodes[k] = { charges: 0, regrowAt: now };
  for (let i = 0; i < 40 && (s.resources.wood < 4 || s.resources.stone < 3); i++) {
    s = sim.regrow(s, now).state;
    for (const k of Object.keys(s.nodes)) if (s.nodes[k].charges > 0) s = breakNode(s, k, now).s;
    now += 1000;
  }
  s = play(s, (x) => sim.startBuild(x, 'lab'));
  assert.equal(s.builds.lab, 'building');
});

test('regression 5: reloading while a spot regrows keeps the timer, and old saves heal', () => {
  let s = village('Kesi Hill', 1, 'highland'); const t0 = 3e12;
  s = breakNode(s, 'wood1', t0).s;
  const back = sim.deserialize(sim.serialize(s));
  assert.equal(back.nodes.wood1.regrowAt, t0 + MS, 'timer survives save/load');
  assert.equal(sim.regrow(back, t0 + 30 * MS).state.nodes.wood1.charges, 3, 'time away still counts');
  // a save from before regrowth: depleted, no timer, short of stone (the reported softlock)
  const old = JSON.parse(sim.serialize(village('Old Save', 1, 'plateau')));
  Object.assign(old, { level: 3, completedLevels: [1, 2], resources: { wood: 8, stone: 9 }, tech: 'drilledWell' });
  old.builds.lab = 'built'; old.flags.planningMet = true;
  for (const k in old.nodes) old.nodes[k] = { charges: 0 };
  const healed = sim.regrow(sim.deserialize(JSON.stringify(old)), Date.now()).state;
  assert.ok(Object.values(healed.nodes).every((n) => n.charges >= 1), 'depleted spots come back on load');
  const r = sim.deserialize(JSON.stringify({ ...old, resources: { wood: -3, stone: 'x' } }));
  assert.deepEqual(r.resources, { wood: 0, stone: 0 }, 'resources can never load negative or invalid');
});

test('regression 6: all three scenarios complete Levels 1–3 with no resource softlock, spending exactly once', () => {
  for (const id of SCENARIOS) {
    let s = village('Full Run', 4, id); let now = 4e12; const spent = { wood: 0, stone: 0 }, got = { wood: 0, stone: 0 };
    const nodes = D.scenes[D.scenarios[id].scene].hotspots.filter((h) => h.kind === 'node');
    const gatherTo = (need) => { for (let i = 0; i < 200 && (s.resources.wood < need.wood || s.resources.stone < need.stone); i++) {
      s = sim.regrow(s, now).state; const n = nodes.find((h) => s.nodes[h.id].charges > 0 && s.resources[h.res] < need[h.res]);
      if (n) { const b = breakNode(s, n.id, now); s = b.s; got[n.res] += b.amount; } now += 1500; } };
    const build = (bid) => { const c = sim.buildDef(s, bid).cost; gatherTo(c); const before = { ...s.resources }; s = play(s, (x) => sim.startBuild(x, bid));
      spent.wood += before.wood - s.resources.wood; spent.stone += before.stone - s.resources.stone; assert.deepEqual(before.wood - s.resources.wood, c.wood); s = play(s, (x) => sim.finishBuild(x, bid)); };
    for (const h of ['source', 'committee', 'homes']) s = play(s, (x) => sim.inspect(x, h));
    s = sim.setFlag(sim.setFlag(s, 'committeeMet'), 'walkWatched');
    gatherTo({ wood: 6, stone: 4 }); build('lab'); s = play(s, sim.completeLevel);
    s = play(s, (x) => sim.collectSample(x, 'source')); s = play(s, sim.openLab); s = benchWork(s); s = surveyAll(s);
    s = play(s, sim.reviewNotes); s = play(s, sim.reviewOptions); s = play(s, sim.completeLevel);
    s = play(s, sim.planMeeting); s = play(s, (x) => sim.chooseTech(x, D.scenarios[id].primaryTech)); s = play(s, (x) => sim.inspect(x, 'waterPoint'));
    build('waterPoint');
    for (const st of sim.activationSteps(s)) s = play(s, (x) => sim.activate(x, st.id));
    s = play(s, sim.completeLevel);
    assert.equal(s.level, 4, id);
    assert.equal(s.resources.wood, got.wood - spent.wood, `${id}: wood balance exact`);
    assert.equal(s.resources.stone, got.stone - spent.stone, `${id}: stone balance exact`);
  }
});

/* ---- Phase 4: gradual access, households, sharing, committee, Level 4 ------------------------ */
const W = WV.water;
function finishLevel3(id, salt = 9) {
  let s = finishLevel2(id, salt);
  s = play(s, sim.planMeeting); s = play(s, (x) => sim.chooseTech(x, D.scenarios[id].primaryTech));
  s = play(s, (x) => sim.inspect(x, 'waterPoint'));
  s = gatherUntil(s, D.technologies[s.tech].cost).s;
  s = play(s, (x) => sim.startBuild(x, 'waterPoint')); s = play(s, (x) => sim.finishBuild(x, 'waterPoint'));
  for (const st of sim.activationSteps(s)) s = play(s, (x) => sim.activate(x, st.id, 1000));
  return play(s, sim.completeLevel);
}
const accounted = (s) => {
  const r = W.residents(s); const hh = s.water.hh;
  assert.equal(W.CATS.reduce((t, k) => t + hh[k], 0), s.households, 'households in exactly one category');
  assert.equal(r.total, s.population, 'every resident counted once');
  W.CATS.forEach((k) => assert.ok(hh[k] >= 0 && r[k] >= 0, `${k} non-negative`));
  assert.equal(r.reliable, r.project + r.existing);
  assert.ok(s.water.far >= 0 && s.water.far <= hh.none);
  return r;
};

test('P4-1 activating a water point adds capacity, not immediate access', () => {
  for (const id of SCENARIOS) {
    const s = finishLevel3(id);
    const r = accounted(s);
    assert.ok(s.water.capacityCans >= s.population * 0.5, `${id}: capacity ${s.water.capacityCans}`);
    assert.equal(r.project, 0); assert.equal(r.reliable, r.existing);
    assert.equal(sim.metrics(s).peopleWithWater, r.existing);
  }
});

test('P4-2/3/4 reliable access grows step by step, categories stay exclusive and complete', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel3(id); let prev = accounted(s).reliable; const jumps = [];
    for (let i = 0; i < 20; i++) { s = W.step(s).state; const r = accounted(s); assert.ok(r.reliable >= prev, 'never goes down'); jumps.push(r.reliable - prev); prev = r.reliable; }
    assert.ok(Math.max(...jumps) <= Math.ceil(s.population * 0.25), `${id}: no huge jump (${Math.max(...jumps)})`);
    assert.ok(jumps.filter((j) => j > 0).length >= 3, `${id}: several visible increases`);
    assert.ok(prev > W.residents(finishLevel3(id)).reliable, 'progress happened');
  }
});

test('P4-5/6 existing household solutions count; partial treatment and trying do not', () => {
  for (const id of SCENARIOS) {
    const s = village('Base Line', 7, id); const r = accounted(s);
    assert.ok(r.existing > 0 && r.partial > 0 && r.none > 0, `${id}: varied starting practices`);
    assert.equal(sim.metrics(s).peopleWithWater, r.existing, 'only verified existing methods are reliable');
    const b = D.water.baselines[id];
    assert.ok(r.existing <= Math.ceil(s.population * (b.existing[1] + 0.05)) && r.partial >= Math.floor(s.population * (b.partial[0] - 0.05)));
    let t = finishLevel3(id); t = W.step(t).state; const rt = accounted(t);
    assert.ok(rt.trying > 0); assert.equal(rt.reliable, rt.project + rt.existing, 'trying households are not yet reliable');
  }
  assert.deepEqual(village('Base Line', 7, 'wetland').water, village('Base Line', 7, 'wetland').water, 'baseline is deterministic');
});

test('P4-7 walkers mirror the counts and cannot change them', () => {
  let s = finishLevel3('highland'); for (let i = 0; i < 4; i++) s = W.step(s).state;
  const before = JSON.stringify(s);
  for (let i = 0; i < 50; i++) { sim.walkerPlan(s); W.walkerCounts(s); }
  assert.equal(JSON.stringify(s), before, 'reading the walker plan never mutates state');
  const c = W.walkerCounts(s);
  assert.ok(c.long + c.near <= 7, 'a handful of walkers stand for many households');
});

test('P4-8/9 save/continue keeps adoption, and reloading cannot duplicate progress', () => {
  let s = finishLevel3('plateau'); const t0 = 1e12;
  s = W.open(s, t0); // schedule from a known time
  let a = W.stepIfDue(s, t0 + D.water.stepMs); assert.equal(a.changed, true); s = a.state;
  const saved = sim.serialize(s); const loaded = sim.deserialize(saved);
  assert.deepEqual(loaded.water, s.water, 'adoption survives save/load');
  const now = t0 + D.water.stepMs + 1000;
  assert.equal(W.stepIfDue(loaded, now).changed, false, 'reloading right away adds nothing');
  const twice = W.stepIfDue(W.stepIfDue(loaded, now + 10 * D.water.stepMs).state, now + 10 * D.water.stepMs);
  assert.equal(twice.changed, false, 'one step per due time, even after a long break');
  assert.equal(twice.state.water.periods, s.water.periods + 1);
  const old = JSON.parse(saved); delete old.water; old.peopleWithWater = old.population;
  const migrated = sim.deserialize(JSON.stringify(old));
  accounted(migrated);
  assert.ok(sim.metrics(migrated).peopleWithWater < migrated.population, 'old instant-access saves are not over-counted');
  assert.equal(migrated.level, 4, 'the village itself is kept');
});

test('P4-10 sharing the water changes service outcomes', () => {
  const s = finishLevel3('highland'); const def = W.defaultAllocation(s);
  assert.ok(W.sum(def) <= s.water.capacityCans);
  const lowHomes = { ...def, homes: Math.floor(def.homes / 3) };
  assert.ok(W.outcome(s, lowHomes).homesHouseholds < W.outcome(s, def).homesHouseholds);
  let a = play(s, (x) => W.setAllocation(x, lowHomes)); let b = play(s, (x) => W.setAllocation(x, def));
  for (let i = 0; i < 30; i++) { a = W.step(a).state; b = W.step(b).state; }
  assert.ok(W.residents(a).project < W.residents(b).project, 'less water for homes caps household access');
  assert.equal(W.outcome(s, { ...def, school: 0 }).sectors.school.status, 'short');
});

test('P4 committee options: extension reaches far homes; reliability verifies faster with more water', () => {
  const base = play(finishLevel3('wetland'), (x) => W.setAllocation(x, W.defaultAllocation(x)));
  let ext = play(base, (x) => W.decide(x, 'extend')); let rel = play(base, (x) => W.decide(x, 'reliability'));
  assert.equal(W.decide(ext, 'reliability').ok, false, 'one decision');
  assert.ok(rel.water.capacityCans > base.water.capacityCans, 'reliability adds daily water');
  assert.deepEqual(rel.water.allocation, base.water.allocation, 'more supply is never poured into a sector silently');
  assert.ok(W.budget(rel, rel.water.allocation).remaining > W.budget(base, base.water.allocation).remaining, 'it shows up as unused water');
  for (let i = 0; i < 40; i++) { ext = W.step(ext).state; rel = W.step(rel).state; }
  assert.equal(ext.water.far, 0, 'extension reaches the far homes'); assert.ok(rel.water.far > 0, 'without it they keep walking');
  accounted(ext); accounted(rel);
});

test('P4-11/12 Level 4 completes in every scenario and unlocks Level 5', () => {
  for (const id of SCENARIOS) {
    let s = finishLevel3(id);
    assert.equal(s.level, 4); assert.equal(sim.nextObjective(s).id, 'open');
    s = W.step(W.step(s).state).state; // first households verified
    assert.equal(sim.nextObjective(s).id, 'review');
    s = sim.setFlag(s, 'populationPanelSeen');
    s = play(s, (x) => W.setAllocation(x, W.defaultAllocation(x)));
    assert.equal(W.runWeek(s, 0).ok, false, 'meet the committee first');
    s = play(s, (x) => W.decide(x, 'extend'));
    s = play(s, (x) => W.runWeek(x, 0)); s = play(s, (x) => W.runWeek(x, 0));
    assert.equal(sim.levelReady(s), true, id);
    s = play(s, sim.completeLevel);
    assert.equal(s.level, 5); assert.equal(sim.levelReady(s), false, 'Level 5 is next, not yet built');
    accounted(s);
    assert.deepEqual(sim.deserialize(sim.serialize(s)), s);
  }
});

/* ---- Sharing the water: one slider, one sector, one shared pool ---------------------------- */
function sharingVillage(id = 'plateau', supplyFactor) {
  let s = finishLevel3(id);
  if (supplyFactor) s.water.capacityCans = Math.round(W.sum(W.needs(s)) * supplyFactor); // force scarcity
  return s;
}
const cap = (s) => s.water.capacityCans;
const other = (d, id) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== id));

for (const id of ['homes', 'school', 'clinic', 'garden']) {
  test(`A${['homes', 'school', 'clinic', 'garden'].indexOf(id) + 1} moving ${id} does not change any other allocation`, () => {
    const s = sharingVillage('plateau', 0.8); const d0 = W.defaultAllocation(s, cap(s));
    for (const v of [0, 1, 5, Math.floor(W.needs(s)[id] / 2), W.needs(s)[id], 99999, -50]) {
      const d1 = W.setDraftValue(s, d0, id, v, cap(s));
      assert.deepEqual(other(d1, id), other(d0, id), `${id} → ${v}`);
    }
  });
}

test('A5/A6 a slider stops at the remaining water; lowering it returns water to the pool', () => {
  const s = sharingVillage('highland', 0.7); const c = cap(s);
  let d = { homes: 0, school: 0, clinic: 0, garden: 0 };
  d = W.setDraftValue(s, d, 'homes', 99999, c);
  assert.equal(d.homes, Math.min(W.needs(s).homes, c));
  const left = c - W.sum(d);
  d = W.setDraftValue(s, d, 'school', 99999, c);
  assert.equal(d.school, Math.min(W.needs(s).school, left), 'school stops at what is left');
  if (W.budget(s, d, c).remaining === 0) { const d2 = W.setDraftValue(s, d, 'garden', 10, c); assert.equal(d2.garden, 0, 'nothing left: the slider cannot move up'); }
  const homesBefore = d.homes; d = W.setDraftValue(s, d, 'homes', homesBefore - 20, c);
  assert.equal(W.budget(s, d, c).remaining >= 20, true, 'reducing homes frees 20 cans');
  d = W.setDraftValue(s, d, 'garden', 20, c); assert.equal(d.garden, Math.min(20, W.needs(s).garden));
});

test('A7–A10 unused water allowed; never negative, never above demand, never above supply', () => {
  for (const id of SCENARIOS) for (const f of [0.5, 1, 3]) {
    const s = sharingVillage(id, f); const c = cap(s); const need = W.needs(s);
    const empty = { homes: 0, school: 0, clinic: W.clinicMin(s), garden: 0 };
    assert.equal(W.setAllocation(s, empty).ok, true, 'a plan with unused water is fine');
    let d = W.defaultAllocation(s, c); const r = sim.rng(42);
    for (let i = 0; i < 400; i++) {
      const k = ['homes', 'school', 'clinic', 'garden'][Math.floor(r() * 4)];
      d = W.setDraftValue(s, d, k, Math.round((r() * 2 - 0.5) * need[k] * 1.5), c);
      for (const x of Object.keys(d)) { assert.ok(d[x] >= 0); assert.ok(d[x] <= need[x]); }
      assert.ok(W.sum(d) <= c, `${id}×${f}: never above supply`);
    }
    assert.equal(W.setAllocation(s, { ...d, homes: need.homes + 1 }).ok, false, 'above demand rejected');
    assert.equal(W.setAllocation(s, { ...d, school: -1 }).ok, false, 'negative rejected');
  }
});

test('A11/A12 cancel keeps the confirmed plan; apply commits exactly the draft', () => {
  let s = sharingVillage('wetland'); const confirmed = { ...s.water.allocation };
  const draft = W.setDraftValue(s, confirmed, 'garden', 0); // editing never touches state
  assert.deepEqual(s.water.allocation, confirmed, 'a draft is not the plan');
  const applied = play(s, (x) => W.setAllocation(x, draft));
  assert.deepEqual(applied.water.allocation, draft); assert.deepEqual(s.water.allocation, confirmed, 'input state untouched');
  assert.equal(applied.water.allocationSet, true);
});

test('A13 clinic safeguard: explicit override needed, never a hidden redistribution', () => {
  const s = sharingVillage('highland'); const d = { ...W.defaultAllocation(s), clinic: W.clinicMin(s) - 1 };
  const r = W.setAllocation(s, d);
  assert.equal(r.ok, false); assert.equal(r.needsOverride, true); assert.match(r.reason, /clinic/i);
  assert.deepEqual(r.state.water.allocation, s.water.allocation, 'nothing moved');
  const ok = play(s, (x) => W.setAllocation(x, d, { overrideClinic: true }));
  assert.deepEqual(ok.water.allocation, d, 'the override keeps the player’s numbers'); assert.equal(ok.water.clinicOverride, true);
  assert.ok(W.outcome(s, d).clinicLow);
});

test('A14 save and continue keep the plan; old forced-to-supply plans migrate to absolute, in-demand values', () => {
  const s = play(sharingVillage('plateau'), (x) => W.setAllocation(x, W.setDraftValue(x, W.setDraftValue(x, W.defaultAllocation(x), 'homes', 300), 'garden', 9)));
  assert.deepEqual(sim.deserialize(sim.serialize(s)).water.allocation, s.water.allocation);
  const old = JSON.parse(sim.serialize(s)); delete old.water.allocVersion;
  // Shape of a genuine first-build save: sums exactly to supply, sectors above their demand.
  const need = W.needs(s); const c = s.water.capacityCans;
  old.water.allocation = { school: need.school + 20, clinic: need.clinic + 10, garden: need.garden + 15 };
  old.water.allocation.homes = c - old.water.allocation.school - old.water.allocation.clinic - old.water.allocation.garden;
  const m = sim.deserialize(JSON.stringify(old));
  for (const k of Object.keys(need)) assert.ok(m.water.allocation[k] <= need[k], `${k} clamped to demand`);
  assert.equal(m.water.allocation.homes, Math.min(need.homes, old.water.allocation.homes)); assert.equal(m.water.allocVersion, 2);
  assert.ok(W.validate(m, m.water.allocation).valid);
  assert.equal(m.level, s.level); assert.deepEqual(m.water.hh, s.water.hh, 'unrelated village state unchanged');
});

test('A15 a supply drop never leaves an unreported invalid plan, and never moves the sliders', () => {
  let s = play(sharingVillage('wetland'), (x) => W.setAllocation(x, W.defaultAllocation(x)));
  const plan = { ...s.water.allocation };
  assert.equal(W.needsReview(s), false);
  s.water.supplyFactor = 0.4; // a breakdown: the point gives 40% of its water
  assert.equal(W.needsReview(s), true, 'the plan is flagged for review');
  assert.deepEqual(s.water.allocation, plan, 'the stored plan is untouched');
  const eff = W.effectiveAllocation(s);
  assert.ok(W.sum(eff) <= W.capacityCans(s), 'the simulation never uses more than the supply');
  assert.equal(eff.clinic, plan.clinic, 'the clinic is cut last');
  assert.ok(W.step(s).ok);
  assert.equal(W.setAllocation(s, plan).ok, false, 'an over-supply plan cannot be confirmed as valid');
  s.water.supplyFactor = 1; assert.equal(W.needsReview(s), false, 'review clears when supply returns');
});

/* ---- Phase 5: keep the water flowing ------------------------------------------------------------ */
const MT = WV.maint;
function finishLevel4(id, salt = 9) {
  let s = finishLevel3(id, salt);
  for (let i = 0; i < 4; i++) s = W.step(s).state;
  s = sim.setFlag(s, 'populationPanelSeen');
  s = play(s, (x) => W.setAllocation(x, W.defaultAllocation(x)));
  s = play(s, (x) => W.decide(x, 'reliability'));
  s = play(s, (x) => W.runWeek(x, 0)); s = play(s, (x) => W.runWeek(x, 0));
  return play(s, sim.completeLevel);
}
function repairAll(s) {
  let now = 6e12;
  for (const st of MT.def(s).steps) {
    let r = MT.repairStep(s, st.id);
    for (let i = 0; i < 60 && !r.ok && /Needs/.test(r.reason); i++) { // gather what is missing, with regrowth
      s = sim.regrow(s, now).state; now += 1500;
      const n = sim.sceneOf(s).hotspots.find((h) => h.kind === 'node' && s.nodes[h.id].charges > 0 && s.resources[h.res] < MT.def(s).cost[h.res]);
      if (n) s = breakNode(s, n.id, now).s;
      r = MT.repairStep(s, st.id);
    }
    assert.ok(r.ok, r.reason); s = r.state;
  }
  return s;
}
const TECH_FX = { gravityFed: 'leak', drilledWell: 'pump', rainwater: 'leaves' };

test('P5 the Level 5 problem matches the technology and reduces service without breaking accounting', () => {
  for (const id of SCENARIOS) {
    const s = finishLevel4(id);
    assert.equal(s.level, 5); assert.ok(s.maint, 'problem started on entering Level 5');
    assert.equal(s.maint.issue, D.scenarios[id].primaryTech); assert.equal(MT.def(s).fx, TECH_FX[s.tech]);
    assert.ok(s.maint.condition < 0.7 && s.water.supplyFactor < 1);
    assert.ok(W.residents(s).reliable < s.maint.reliableBefore, 'some households lost reliable service');
    accounted(s);
    assert.equal(sim.visible(s, sim.hotspot(s, 'issue')), false, 'problem spot appears after the inspection');
    assert.equal(sim.nextObjective(s).id, 'inspect');
  }
});

test('P5 a broken water point pauses adoption until it is repaired', () => {
  let s = finishLevel4('highland'); const r = W.residents(s);
  for (let i = 0; i < 10; i++) s = W.step(s).state;
  assert.deepEqual(W.residents(s), r, 'no recovery while broken, however long you wait');
});

test('P5 diagnosis: wrong answers explain and cost nothing; the right one unlocks the repair', () => {
  let s = play(finishLevel4('wetland'), MT.inspect);
  assert.equal(sim.visible(s, sim.hotspot(s, 'issue')), true);
  assert.equal(MT.repairStep(s, 'clear').ok, false, 'no repair before diagnosis');
  const wrong = MT.def(s).options.find((o) => !o.correct);
  const r = MT.diagnose(s, wrong.id); assert.equal(r.correct, false); assert.ok(r.why.length > 20);
  s = r.state; assert.equal(s.maint.diagnosed, false); assert.deepEqual(s.maint.wrong, [wrong.id]);
  s = play(s, (x) => MT.diagnose(x, MT.def(x).options.find((o) => o.correct).id));
  assert.equal(s.maint.diagnosed, true); assert.equal(sim.nextObjective(s).id, 'repair');
});

test('P5 repairs restore condition and supply; costs are spent once; no softlock from zero', () => {
  for (const id of SCENARIOS) {
    let s = play(finishLevel4(id), MT.inspect);
    s = play(s, (x) => MT.diagnose(x, MT.def(x).options.find((o) => o.correct).id));
    s.resources = { wood: 0, stone: 0 }; for (const k in s.nodes) s.nodes[k] = { charges: 0, regrowAt: 0 }; // worst case
    s = sim.deserialize(sim.serialize(s));
    const steps = MT.def(s).steps; assert.equal(steps.length, 3);
    assert.equal(MT.repairStep(s, steps[1].id).ok, false, 'steps in order');
    const before = s; s = repairAll(s);
    assert.equal(s.maint.repaired, true); assert.ok(s.maint.condition >= 0.9); assert.equal(s.water.supplyFactor, 1);
    const cost = MT.def(s).cost; assert.deepEqual(s.maint.spent, cost);
    assert.ok(s.resources.wood >= 0 && s.resources.stone >= 0);
    assert.equal(MT.repairStep(s, steps[0].id).done, true, 'repeat repairs do nothing');
    assert.equal(W.needsReview(s), false, 'the sharing plan is valid again');
    assert.equal(sim.visible(s, sim.hotspot(s, 'issue')), false, 'warning gone');
    void before;
  }
});

test('P5 access recovers gradually after the repair, never instantly', () => {
  for (const id of SCENARIOS) {
    let s = play(finishLevel4(id), MT.inspect);
    s = play(s, (x) => MT.diagnose(x, MT.def(x).options.find((o) => o.correct).id));
    s = repairAll(s);
    const target = s.maint.reliableBefore; const r0 = W.residents(s).reliable;
    assert.ok(r0 < target, `${id}: repair alone does not restore everyone`);
    assert.equal(s.maint.reliableAtRepair, r0);
    assert.equal(sim.nextObjective(s).id, 'restore');
    let steps = 0; while (W.residents(s).reliable < target && steps < 10) { s = W.step(s).state; steps++; accounted(s); }
    assert.ok(steps >= 1 && steps <= 4, `${id}: recovered over ${steps} periods`);
    assert.equal(sim.nextObjective(s).id, 'complete');
  }
});

test('P5 sliders stay independent in Level 5, including while supply is reduced', () => {
  const s = finishLevel4('plateau'); const d0 = { ...s.water.allocation };
  assert.equal(W.needsReview(s), W.sum(d0) > W.capacityCans(s), 'an over-supply plan is reported, never hidden');
  for (const k of ['homes', 'school', 'clinic', 'garden']) {
    const d1 = W.setDraftValue(s, d0, k, 0); assert.deepEqual(other(d1, k), other(d0, k));
    const up = W.setDraftValue(s, d1, k, 99999);
    assert.ok(W.sum(up) <= Math.max(W.capacityCans(s), W.sum(d1)), 'raising a slider never pushes the total past the supply');
    if (W.sum(d1) >= W.capacityCans(s)) assert.equal(up[k], d1[k], 'over supply already: the slider cannot go up');
  }
});

test('P5 full campaign: Levels 1–5 in every scenario; the report matches the simulation', () => {
  for (const id of SCENARIOS) {
    let s = play(finishLevel4(id), MT.inspect);
    s = play(s, (x) => MT.diagnose(x, MT.def(x).options.find((o) => o.correct).id));
    s = repairAll(s);
    assert.equal(MT.completeProject(s).ok, false, 'needs recovery and a priority first');
    while (W.residents(s).reliable < s.maint.reliableBefore) s = W.step(s).state;
    s = play(s, (x) => MT.choosePriority(x, 'handwashing'));
    s = play(s, MT.completeProject);
    assert.equal(sim.levelReady(s), true);
    const rp = s.maint.report; const r = W.residents(s); const m = sim.metrics(s);
    assert.equal(rp.reliable, r.reliable); assert.equal(rp.population, s.population);
    assert.equal(rp.gained, r.reliable - W.startReliable(s)); assert.ok(rp.gained > 0);
    assert.equal(rp.hoursPerDay, Math.round(m.hoursSavedPerDay)); assert.equal(rp.condition, Math.round(s.maint.condition * 100));
    assert.equal(rp.technology, D.technologies[D.scenarios[id].primaryTech].name);
    assert.equal(rp.reliable + rp.stillWaiting, s.population);
    s = play(s, sim.completeLevel);
    assert.equal(s.flags.campaignComplete, true); assert.equal(s.level, 5); assert.equal(sim.levelReady(s), false);
    const back = sim.deserialize(sim.serialize(s));
    assert.deepEqual(back, s, 'a completed village reopens exactly');
    assert.equal(W.stepIfDue(back, Date.now() + 1e9).changed, true, 'life goes on after the campaign');
  }
});

test('P5 saves made mid-maintenance reload into a valid state; Phase 4 saves at Level 5 get their problem', () => {
  let s = play(finishLevel4('highland'), MT.inspect);
  s = play(s, (x) => MT.diagnose(x, 'joint'));
  s = repairAll({ ...s, maint: { ...s.maint } }); // full run for reference
  let mid = play(finishLevel4('highland'), MT.inspect); mid = play(mid, (x) => MT.diagnose(x, 'joint'));
  mid.resources = { wood: 5, stone: 5 }; mid = play(mid, (x) => MT.repairStep(x, 'dig'));
  const back = sim.deserialize(sim.serialize(mid));
  assert.deepEqual(back.maint.steps, ['dig']); assert.equal(MT.nextStep(back).id, 'fix'); assert.equal(back.resources.stone, 3, 'cost not charged twice');
  const old = JSON.parse(sim.serialize(finishLevel4('wetland'))); delete old.maint;
  const loaded = sim.deserialize(JSON.stringify(old));
  assert.ok(loaded.maint && loaded.maint.issue === 'rainwater'); accounted(loaded);
});

test('P5 a new village starts fresh', () => {
  const v = village('Fresh Start', 77);
  assert.equal(v.level, 1); assert.equal(v.maint, undefined); assert.equal(v.flags.campaignComplete, undefined);
  assert.equal(v.flags.projectComplete, undefined); assert.equal(v.tech, null); assert.equal(v.water.active, false);
});

/* ---- Difficulty modes and milestones ---------------------------------------------- */
test('difficulty modes change taps, costs, goals and regrowth', () => {
  const easy = sim.generateVillage('Kesi Hill', 3, 'highland', 'easy');
  const normal = sim.generateVillage('Kesi Hill', 3, 'highland', 'normal');
  const hard = sim.generateVillage('Kesi Hill', 3, 'highland', 'hard');
  assert.equal(sim.generateVillage('Kesi Hill', 3, 'highland').difficulty, 'normal', 'default is normal');
  assert.deepEqual([easy, normal, hard].map(sim.hitsToBreak), [2, 3, 4]);
  assert.deepEqual(sim.buildDef(normal, 'lab').cost, D.builds.lab.cost, 'normal keeps the original cost');
  assert.ok(sim.buildDef(easy, 'lab').cost.wood < sim.buildDef(normal, 'lab').cost.wood);
  assert.ok(sim.buildDef(hard, 'lab').cost.wood > sim.buildDef(normal, 'lab').cost.wood);
  assert.ok(sim.regrowMs(easy) < sim.regrowMs(normal) && sim.regrowMs(normal) < sim.regrowMs(hard));
  for (const v of [easy, normal, hard]) {
    const goal = sim.gatherGoal(v); const lab = sim.buildDef(v, 'lab').cost;
    assert.ok(goal.wood >= lab.wood && goal.stone >= lab.stone, `${v.difficulty}: the gathering goal pays for the lab`);
  }
  // Breaking a spot takes exactly hitsToBreak taps on every mode.
  for (const v of [easy, normal, hard]) {
    const node = sim.sceneOf(v).hotspots.find((h) => h.kind === 'node').id;
    let hits = 0; let r;
    for (let i = 0; i < sim.hitsToBreak(v); i++) { r = sim.strike(v, node, hits, 0); hits = r.hits; }
    assert.ok(r.done, v.difficulty);
  }
  const bad = sim.deserialize(JSON.stringify({ ...normal, difficulty: 'impossible' }));
  assert.equal(bad.difficulty, 'normal', 'an unknown difficulty loads as normal');
});

test('milestones fire once each as reliable water passes each threshold', () => {
  let s = sim.generateVillage('Kesi Hill', 3, 'highland');
  assert.equal(sim.checkMilestones(s).reached.length, 0);
  const fake = (pct) => { const t = sim.clone(s); t.population = 100; t.water = t.water || {}; return t; };
  const orig = WV.water.residents;
  try {
    WV.water.residents = () => ({ reliable: 55, project: 55, trying: 0 });
    const r1 = sim.checkMilestones(fake());
    assert.deepEqual(r1.reached.map((m) => m.pct), [10, 25, 50]);
    assert.equal(sim.checkMilestones(r1.state).reached.length, 0, 'not shown twice');
  } finally { WV.water.residents = orig; }
});
