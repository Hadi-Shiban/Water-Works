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

test('every hotspot and route point lies inside its scene crop, away from the edges', () => {
  for (const [id, sc] of Object.entries(D.scenes)) {
    const c = sc.crop;
    const inside = (x, y) => x >= c.x + 3 && x <= c.x + c.w - 3 && y >= c.y + 3 && y <= c.y + c.h - 3;
    sc.hotspots.forEach((h) => assert.ok(inside(h.x, h.y), `${id}/${h.id} outside crop`));
    sc.route.forEach(([x, y], i) => assert.ok(inside(x, y), `${id} route point ${i} outside crop`));
    assert.ok(sc.hotspots.some((h) => h.id === 'committee') && sc.hotspots.some((h) => h.id === 'source') && sc.hotspots.some((h) => h.id === 'lab'), `${id} missing a required hotspot`);
    sc.hotspots.filter((h) => h.kind !== 'node').forEach((h) => assert.ok(sc.places[h.id], `${id}/${h.id} has no panel text`));
  }
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
  s = play(s, (x) => sim.inspect(x, 'barn'));
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
