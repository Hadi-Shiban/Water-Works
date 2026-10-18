/* =============================================================================
   WATERWORKS VILLAGE — MODEL
   -----------------------------------------------------------------------------
   Pure functions over a plain, JSON-safe state object. Every action returns
   { ok, state, ... } with a NEW state and never mutates its input, so the UI
   can preview, undo or test anything. No DOM access in this file.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const D = () => WV.data;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* FNV-1a string hash and mulberry32 RNG (same generator as the municipal map). */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const between = (r, range) => range[0] + Math.floor(r() * (range[1] - range[0] + 1));
  function shuffle(list, r) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---- Names --------------------------------------------------------------------- */
  function cleanName(raw) {
    return String(raw == null ? '' : raw).replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  }
  const validName = (raw) => cleanName(raw).length >= 2;
  function suggestName(r) {
    const p = D().villageNameParts; const rand = r || Math.random;
    return p.start[Math.floor(rand() * p.start.length)] + p.end[Math.floor(rand() * p.end.length)];
  }

  /* ---- Village generation ----------------------------------------------------------
     seed = hash(name) XOR salt. The salt is stored, so the same save always rebuilds
     the same village; a new village with the same name gets a fresh salt.          */
  function generateVillage(name, salt, forcedScenario) {
    const data = D();
    const clean = cleanName(name);
    if (clean.length < 2) throw new Error('Village name must have at least 2 letters');
    const s0 = salt >>> 0;
    const seed = (hash(clean.toLowerCase()) ^ s0) >>> 0;
    const r = rng(seed);
    const ids = Object.keys(data.scenarios);
    const pick = ids[Math.floor(r() * ids.length)];
    const scenarioId = forcedScenario && data.scenarios[forcedScenario] ? forcedScenario : pick;
    const sc = data.scenarios[scenarioId];
    const scene = data.scenes[sc.scene];

    const population = between(r, sc.population);
    const households = Math.max(1, Math.round(population / 6)); // [game] about six people per household
    const names = shuffle(data.namePool, r);
    const people = {};
    data.roles.forEach((role, i) => (people[role.id] = { name: names[i] }));
    const nodes = {};
    scene.hotspots.filter((h) => h.kind === 'node').forEach((h) => (nodes[h.id] = { charges: h.charges }));
    const builds = {};
    Object.keys(data.builds).forEach((id) => (builds[id] = 'site'));

    return {
      v: data.saveVersion,
      name: clean, salt: s0, seed, scenarioId,
      population, households,
      baseline: { roundTripMin: between(r, sc.roundTripMin), tripsPerDay: sc.tripsPerDay, cansPerTrip: sc.cansPerTrip },
      people,
      level: 1, completedLevels: [],
      resources: { wood: 0, stone: 0 },
      gathered: { wood: 0, stone: 0 },
      nodes, builds,
      inspected: [],
      flags: { committeeMet: false, walkWatched: false, briefingSeen: false, tipsOff: false },
      peopleWithWater: 0,
    };
  }

  /* ---- Derived numbers (for display; all [game]) ------------------------------------ */
  function metrics(s) {
    const b = s.baseline; const L = D().jerryCanLitres;
    const litresPerHousehold = b.tripsPerDay * b.cansPerTrip * L;
    return {
      litresPerPerson: (litresPerHousehold * s.households) / s.population,
      hoursPerHousehold: (b.tripsPerDay * b.roundTripMin) / 60,
      communityHours: ((b.tripsPerDay * b.roundTripMin) / 60) * s.households,
      cansPerDay: b.tripsPerDay * b.cansPerTrip * s.households,
      peopleWithWater: s.peopleWithWater,
    };
  }

  const sceneOf = (s) => D().scenes[D().scenarios[s.scenarioId].scene];
  const hotspot = (s, id) => sceneOf(s).hotspots.find((h) => h.id === id);

  /* ---- Actions ------------------------------------------------------------------------ */
  function inspect(s, id) {
    const h = hotspot(s, id);
    if (!h || h.kind === 'node') return { ok: false, state: s };
    if (s.inspected.indexOf(id) >= 0) return { ok: true, state: s, first: false };
    const t = clone(s); t.inspected.push(id);
    return { ok: true, state: t, first: true };
  }

  function gather(s, nodeId) {
    const h = hotspot(s, nodeId);
    if (!h || h.kind !== 'node') return { ok: false, state: s, reason: 'Nothing to gather here.' };
    const node = s.nodes[nodeId];
    if (!node || node.charges <= 0) return { ok: false, state: s, reason: 'This spot is cleared for now.' };
    const t = clone(s);
    t.nodes[nodeId].charges -= 1;
    t.resources[h.res] += h.yield;
    t.gathered[h.res] += h.yield;
    return { ok: true, state: t, res: h.res, amount: h.yield };
  }

  function canBuild(s, id) {
    const b = D().builds[id];
    if (!b) return { ok: false, reason: 'Unknown project.' };
    if (s.builds[id] !== 'site') return { ok: false, reason: s.builds[id] === 'built' ? 'Already built.' : 'Under construction.' };
    if (b.requires && !b.requires(s)) return { ok: false, reason: b.requiresText };
    const short = Object.keys(b.cost).filter((k) => s.resources[k] < b.cost[k]);
    if (short.length) {
      return { ok: false, reason: 'Needs ' + short.map((k) => `${b.cost[k] - s.resources[k]} more ${D().resources[k].name.toLowerCase()}`).join(' and ') + '.', short };
    }
    return { ok: true };
  }
  function startBuild(s, id) {
    const c = canBuild(s, id);
    if (!c.ok) return { ok: false, state: s, reason: c.reason };
    const t = clone(s); const cost = D().builds[id].cost;
    Object.keys(cost).forEach((k) => (t.resources[k] -= cost[k]));
    t.builds[id] = 'building';
    return { ok: true, state: t };
  }
  function finishBuild(s, id) {
    if (s.builds[id] !== 'building') return { ok: false, state: s };
    const t = clone(s); t.builds[id] = 'built';
    return { ok: true, state: t };
  }
  function setFlag(s, key, value) {
    const t = clone(s); t.flags[key] = value === undefined ? true : value;
    return t;
  }

  /* ---- Objectives & levels -------------------------------------------------------------- */
  const levelDef = (s) => D().levels.find((l) => l.id === s.level);
  function objectives(s) {
    const l = levelDef(s);
    return (l ? l.objectives : []).map((o) => ({ id: o.id, text: o.text(s), done: !!o.check(s) }));
  }
  function nextObjective(s) { return objectives(s).find((o) => !o.done) || null; }
  function levelReady(s) {
    const l = levelDef(s);
    return !!l && l.objectives.length > 0 && s.completedLevels.indexOf(s.level) < 0 && objectives(s).every((o) => o.done);
  }
  function completeLevel(s) {
    if (!levelReady(s)) return { ok: false, state: s };
    const t = clone(s);
    t.completedLevels.push(t.level);
    t.level = Math.min(D().levels.length, t.level + 1);
    return { ok: true, state: t };
  }

  /* ---- Persistence ---------------------------------------------------------------------------
     The WHOLE state is saved: nothing is cherry-picked, so nothing can be forgotten.
     A build that was mid-animation when the page closed loads as finished.            */
  function serialize(s) { return JSON.stringify(s); }
  function deserialize(text) {
    let s;
    try { s = JSON.parse(text); } catch (e) { return null; }
    if (!s || s.v !== D().saveVersion || !D().scenarios[s.scenarioId] || !validName(s.name)) return null;
    Object.keys(s.builds || {}).forEach((id) => { if (s.builds[id] === 'building') s.builds[id] = 'built'; });
    return s;
  }

  WV.sim = {
    clone, clamp, hash, rng, shuffle, cleanName, validName, suggestName,
    generateVillage, metrics, sceneOf, hotspot,
    inspect, gather, canBuild, startBuild, finishBuild, setFlag,
    levelDef, objectives, nextObjective, levelReady, completeLevel,
    serialize, deserialize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
