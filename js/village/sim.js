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

    return migrate({
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
    });
  }

  /* Site facts come from their OWN random stream, so adding them did not change the
     population, names or round trip of any village generated before Level 2.     */
  function siteFor(scenarioId, seed) {
    const r = rng((seed ^ 0x9e3779b9) >>> 0); const spec = D().scenarios[scenarioId].site; const out = {};
    Object.keys(spec).forEach((k) => {
      const v = spec[k];
      out[k] = Array.isArray(v) ? (Number.isInteger(v[0]) && Number.isInteger(v[1]) ? between(r, v) : Math.round((v[0] + r() * (v[1] - v[0])) * 10) / 10) : v;
    });
    return out;
  }

  /* Fill in anything a save from an earlier build is missing. Never removes data. */
  function migrate(s) {
    const data = D();
    s.samples = s.samples || [];
    s.results = s.results || {};
    s.surveys = s.surveys || [];
    s.site = s.site || siteFor(s.scenarioId, s.seed);
    s.flags = { labOpened: false, optionsReviewed: false, ...s.flags };
    s.people = s.people || {};
    const used = Object.values(s.people).map((p) => p.name);
    const spare = shuffle(data.namePool, rng(s.seed)).filter((n) => used.indexOf(n) < 0);
    data.roles.forEach((role) => { if (!s.people[role.id]) { s.people[role.id] = { name: spare.shift() || 'Sam' }; } });
    const scene = data.scenes[data.scenarios[s.scenarioId].scene];
    scene.hotspots.filter((h) => h.kind === 'node').forEach((h) => { if (!s.nodes[h.id]) s.nodes[h.id] = { charges: h.charges }; });
    return s;
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

  const visible = (s, h) => !!h && (!h.minLevel || s.level >= h.minLevel);

  /* ---- Actions ------------------------------------------------------------------------ */
  function inspect(s, id) {
    const h = hotspot(s, id);
    if (!visible(s, h) || h.kind === 'node') return { ok: false, state: s };
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

  /* ---- Level 2: investigate ---------------------------------------------------------------- */
  const sampleDef = (s, id) => sceneOf(s).samples[id];
  const surveyDef = (s, id) => sceneOf(s).surveys[id];
  const inLevel2 = (s) => s.level >= 2;

  function openLab(s) {
    if (!inLevel2(s) || s.builds.lab !== 'built') return { ok: false, state: s, reason: 'The field lab opens in Level 2.' };
    return { ok: true, state: s.flags.labOpened ? s : setFlag(s, 'labOpened') };
  }
  function collectSample(s, id) {
    if (!inLevel2(s)) return { ok: false, state: s, reason: 'Sampling starts in Level 2.' };
    if (!sampleDef(s, id)) return { ok: false, state: s, reason: 'There is no water to sample here.' };
    if (s.samples.indexOf(id) >= 0) return { ok: false, state: s, reason: 'You already have a sample from here.' };
    const t = clone(s); t.samples.push(id);
    return { ok: true, state: t };
  }
  /* prediction: 'safe' | 'unsafe' | 'unsure' — the player's guess before the test. */
  function runTest(s, id, prediction) {
    if (s.samples.indexOf(id) < 0) return { ok: false, state: s, reason: 'Collect a sample first.' };
    if (s.results[id]) return { ok: false, state: s, reason: 'This sample has been tested.' };
    if (['safe', 'unsafe', 'unsure'].indexOf(prediction) < 0) return { ok: false, state: s, reason: 'Make a guess first.' };
    const def = sampleDef(s, id); const t = clone(s);
    t.results[id] = { prediction, clarity: def.clarity, germ: def.germ, salty: !!def.salty };
    return { ok: true, state: t, result: t.results[id] };
  }
  function survey(s, id) {
    if (!inLevel2(s)) return { ok: false, state: s, reason: 'Surveys start in Level 2.' };
    if (!surveyDef(s, id)) return { ok: false, state: s, reason: 'Nothing to survey here.' };
    if (s.surveys.indexOf(id) >= 0) return { ok: false, state: s, reason: 'Already surveyed.' };
    const t = clone(s); t.surveys.push(id);
    return { ok: true, state: t };
  }
  const readyForOptions = (s) => Object.keys(s.results).length >= 2 && s.surveys.length >= 2;
  function reviewOptions(s) {
    if (!readyForOptions(s)) return { ok: false, state: s, reason: 'Finish both tests and both surveys first.' };
    return { ok: true, state: s.flags.optionsReviewed ? s : setFlag(s, 'optionsReviewed') };
  }

  /* Which site facts are known: surveys reveal some, lab tests reveal others. */
  function knownFacts(s) {
    const known = {};
    s.surveys.forEach((id) => (surveyDef(s, id).reveals || []).forEach((k) => (known[k] = true)));
    Object.keys(s.results).forEach((id) => (sampleDef(s, id).reveals || []).forEach((k) => (known[k] = true)));
    if (Object.keys(s.results).length) known.surfaceTested = true;
    return known;
  }

  /* ---- Technology options, judged only on what is known --------------------------------------
     status: recommended · part (part of the recommended plan) · possible · complement ·
             later · no · unknown (needs a survey or test)                                     */
  function technologyOptions(s) {
    const data = D(); const known = knownFacts(s); const f = s.site;
    const daily = s.population * data.litresPerPersonGoal;
    const roofShare = (f.bigRoofsM2 * f.rainfallMm * 0.8) / 365 / daily; // litres = m² × mm × runoff 0.8 [ref formula, game inputs]
    const testedUnsafe = Object.values(s.results).some((r) => r.germ !== 'safe');
    const judge = {
      gravityFed: () => (f.springAbove && f.springHeadM >= 15 && f.springYearRound
        ? ['recommended', `The spring sits about ${f.springHeadM} m above the homes and never runs dry, so water can flow down pipes with no pump.`]
        : ['no', !f.springAbove ? 'There is no spring above the village for water to flow down from.' : 'The spring dries up for part of the year.']),
      protectedSpring: () => (!f.springAbove ? ['no', 'There is no usable spring close to the village.']
        : f.springDistanceKm <= 0.5 ? ['possible', 'The spring is close enough to protect and collect from directly.']
          : ['part', `Protecting the spring is step one, but it is ${f.springDistanceKm} km away. Piping it down makes it a gravity-fed system.`]),
      drilledWell: () => (!f.rigAccess ? ['no', 'A drilling rig cannot get up these steep, rocky tracks.']
        : f.groundwaterSalty ? ['no', 'Test results show the groundwater here is salty.']
          : ['recommended', `Fresh groundwater about ${f.groundwaterDepthM} m down, and a road the rig can use. A sealed pump keeps it protected.`]),
      handDugWell: () => (f.groundwaterSalty ? ['no', 'Shallow groundwater here tested salty.']
        : f.groundwaterDepthM > 15 ? ['no', `Groundwater is about ${f.groundwaterDepthM} m down, too deep to dig safely by hand.`]
          : ['possible', 'Groundwater is shallow enough to dig to.']),
      rainwater: () => (f.rainfallMm < 600 ? ['no', `Too little rain: about ${f.rainfallMm} mm a year.`]
        : roofShare >= 0.5 ? ['recommended', `About ${f.rainfallMm} mm of rain a year on ${f.bigRoofsM2} m² of roofs could cover most daily needs, with covered tanks for the dry weeks.`]
          : ['possible', `Plenty of rain, but the roofs here could only cover about ${Math.max(1, Math.round(roofShare * 100))}% of daily needs. A good extra for the school later.`]),
      solarPiped: () => (f.groundwaterSalty ? ['no', 'The groundwater it would pump is salty.']
        : ['later', `Suits bigger communities with a trained operator. Worth another look as ${s.name} grows.`]),
      bioSand: () => (testedUnsafe ? ['complement', 'It cleans water at home but does not bring water closer. Helpful alongside, not instead.']
        : ['no', 'Not needed when the water is already safe.']),
      rehabilitation: () => ['no', 'There is no broken water system here to repair.'],
    };
    const cards = Object.keys(data.technologies).map((id) => {
      const t = data.technologies[id];
      const missing = (t.needs || []).filter((k) => !known[k]);
      if (missing.length) return { id, name: t.name, short: t.short, status: 'unknown', reason: missing.indexOf('surfaceTested') >= 0 ? 'Needs a water test.' : 'Needs a survey.', missing };
      const [status, reason] = judge[id]();
      return { id, name: t.name, short: t.short, status, reason, playable: !!t.playable };
    });
    // Today's option, judged by the lab test of the collection point.
    const src = s.results.source; const srcLabel = (hotspot(s, 'source') || {}).label || 'source';
    cards.unshift(src
      ? { id: 'statusQuo', name: `Keep using the ${srcLabel.toLowerCase()}`, short: 'No change.', status: 'no',
        reason: `Lab test: ${data.results.germ[src.germ].label.toLowerCase()}. And it is a ${s.baseline.roundTripMin}-minute round trip.` }
      : { id: 'statusQuo', name: `Keep using the ${srcLabel.toLowerCase()}`, short: 'No change.', status: 'unknown', reason: 'Needs a water test.', missing: ['sourceTested'] });
    return cards;
  }

  /* ---- Walkers: who walks where, as the village changes ---------------------------------------- */
  function walkerPlan(s, opts) {
    const routes = sceneOf(s).routes; const after = !!(opts && opts.after) || (routes.collectAfter && s.builds[routes.collectAfter.whenBuilt] === 'built');
    const plan = [{ id: after ? 'collectAfter' : 'collect', route: after ? routes.collectAfter : routes.collect }];
    (routes.ambient || []).forEach((a) => plan.push({ id: a.id, route: a, extra: after ? 1 : 0 }));
    return plan;
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
    return migrate(s);
  }

  WV.sim = {
    clone, clamp, hash, rng, shuffle, cleanName, validName, suggestName,
    generateVillage, siteFor, migrate, metrics, sceneOf, hotspot, visible,
    inspect, gather, canBuild, startBuild, finishBuild, setFlag,
    openLab, collectSample, runTest, survey, readyForOptions, reviewOptions, knownFacts, technologyOptions, walkerPlan,
    levelDef, objectives, nextObjective, levelReady, completeLevel,
    serialize, deserialize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
