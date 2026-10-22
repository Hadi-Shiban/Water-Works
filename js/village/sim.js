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

  /* ---- Difficulty ------------------------------------------------------------------
     Every rule that difficulty changes goes through these helpers.                  */
  const difficulty = (s) => D().difficulties[(s && s.difficulty) || 'normal'] || D().difficulties.normal;
  const scaleCost = (s, cost) => {
    const m = difficulty(s).costMult; const out = {};
    Object.keys(cost).forEach((k) => (out[k] = cost[k] > 0 ? Math.max(1, Math.ceil(cost[k] * m)) : 0));
    return out;
  };
  const gatherGoal = (s) => scaleCost(s, D().gatherGoal);
  const hitsToBreak = (s) => difficulty(s).hits;
  const regrowMs = (s) => Math.round(D().regrowMs * difficulty(s).regrowMult);

  /* ---- Village generation ----------------------------------------------------------
     seed = hash(name) XOR salt. The salt is stored, so the same save always rebuilds
     the same village; a new village with the same name gets a fresh salt.          */
  function generateVillage(name, salt, forcedScenario, difficultyId) {
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
    scene.hotspots.filter((h) => h.kind === 'node').forEach((h) => (nodes[h.id] = { charges: h.charges, regrowAt: null }));
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
      difficulty: D().difficulties[difficultyId] ? difficultyId : 'normal',
      milestonesShown: [],
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
    if (!data.difficulties[s.difficulty]) s.difficulty = 'normal';
    s.milestonesShown = s.milestonesShown || [];
    s.samples = s.samples || [];
    s.results = s.results || {};
    s.surveys = s.surveys || [];
    s.site = s.site || siteFor(s.scenarioId, s.seed);
    s.flags = { labUnlocked: false, clearSampleInspected: false, dirtySampleInspected: false, microscopeUsed: false,
      filterTestCompleted: false, notesReviewed: false, optionsReviewed: false, level2Completed: false, ...s.flags };
    if (s.completedLevels && s.completedLevels.indexOf(2) >= 0) s.flags.level2Completed = true;
    s.flags = { planningMet: false, systemActive: false, level3Completed: false, ...s.flags };
    s.builds = { lab: 'site', waterPoint: 'site', ...s.builds };
    if (s.tech === undefined) s.tech = null;
    s.activation = s.activation || [];
    WV.water.ensure(s);
    if (WV.maint) WV.maint.ensure(s);
    s.people = s.people || {};
    const used = Object.values(s.people).map((p) => p.name);
    const spare = shuffle(data.namePool, rng(s.seed)).filter((n) => used.indexOf(n) < 0);
    data.roles.forEach((role) => { if (!s.people[role.id]) { s.people[role.id] = { name: spare.shift() || 'Sam' }; } });
    const scene = data.scenes[data.scenarios[s.scenarioId].scene];
    scene.hotspots.filter((h) => h.kind === 'node').forEach((h) => {
      const n = s.nodes[h.id] || (s.nodes[h.id] = { charges: h.charges });
      n.charges = clamp(n.charges | 0, 0, h.charges);
      // Saves from before regrowth have no timer: start one that is already due, so a
      // depleted spot comes back straight away instead of staying empty forever.
      if (n.charges < h.charges && (n.regrowAt == null || !isFinite(n.regrowAt))) n.regrowAt = 0;
      if (n.charges >= h.charges) n.regrowAt = null;
    });
    s.resources = { wood: Math.max(0, s.resources.wood | 0), stone: Math.max(0, s.resources.stone | 0) };
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
      peopleWithWater: s.water ? WV.water.residents(s).reliable : 0,
      ...afterMetrics(s),
    };
  }

  /* What changed once the system runs: served households walk a short trip instead. */
  function afterMetrics(s) {
    if (!s.flags || !s.flags.systemActive || !s.tech) return { active: false };
    const b = s.baseline; const after = D().technologies[s.tech].afterRoundTripMin;
    const servedHouseholds = s.water.hh.project; // only verified users of the new point
    return { active: true, roundTripAfter: after, servedHouseholds,
      hoursSavedPerDay: (servedHouseholds * b.tripsPerDay * (b.roundTripMin - after)) / 60 };
  }
  const sceneOf = (s) => D().scenes[D().scenarios[s.scenarioId].scene];
  const hotspot = (s, id) => sceneOf(s).hotspots.find((h) => h.id === id);

  const visible = (s, h) => !!h && (!h.minLevel || s.level >= h.minLevel) && (!h.maxLevel || s.level <= h.maxLevel) && (!h.needsTech || !!s.tech)
    && (h.kind !== 'issue' || (!!s.maint && s.maint.inspected && !s.maint.repaired));

  /* ---- Actions ------------------------------------------------------------------------ */
  function inspect(s, id) {
    const h = hotspot(s, id);
    if (!visible(s, h) || h.kind === 'node') return { ok: false, state: s };
    if (s.inspected.indexOf(id) >= 0) return { ok: true, state: s, first: false };
    const t = clone(s); t.inspected.push(id);
    return { ok: true, state: t, first: true };
  }

  /* Regrowth: each depleted spot gets one charge back every regrowMs. `now` is a wall-clock
     time in ms; passing it in keeps this function pure and testable.                    */
  function regrow(s, now) {
    const ms = regrowMs(s); let changed = false; const t = clone(s);
    sceneOf(t).hotspots.filter((h) => h.kind === 'node').forEach((h) => {
      const n = t.nodes[h.id];
      if (n.charges < h.charges && n.regrowAt == null) { n.regrowAt = now + ms; changed = true; } // never stuck without a timer
      while (n.charges < h.charges && n.regrowAt != null && now >= n.regrowAt) {
        n.charges += 1; changed = true;
        n.regrowAt = n.charges < h.charges ? Math.max(n.regrowAt + ms, n.regrowAt === 0 ? now + ms : 0) : null;
      }
      if (n.charges >= h.charges && n.regrowAt != null) { n.regrowAt = null; changed = true; }
    });
    return { changed, state: changed ? t : s };
  }
  function msUntilRegrow(s, nodeId, now) { const n = s.nodes[nodeId]; return n && n.regrowAt != null ? Math.max(0, n.regrowAt - now) : 0; }

  function gather(s, nodeId, now) {
    const h = hotspot(s, nodeId);
    if (!h || h.kind !== 'node') return { ok: false, state: s, reason: 'Nothing to gather here.' };
    const node = s.nodes[nodeId];
    if (!node || node.charges <= 0) return { ok: false, state: s, reason: 'This spot is growing back. Try again in a few seconds.' };
    const t = clone(s);
    t.nodes[nodeId].charges -= 1;
    if (t.nodes[nodeId].regrowAt == null) t.nodes[nodeId].regrowAt = (now == null ? Date.now() : now) + regrowMs(s);
    t.resources[h.res] += h.yield;
    t.gathered[h.res] += h.yield;
    return { ok: true, state: t, res: h.res, amount: h.yield };
  }

  /* Multi-hit gathering (2, 3 or 4 taps, by difficulty). `hits` is the node's current
     hit count, kept by the UI and not saved: it is a moment of animation, not progress.
     Only the last hit calls gather(), so resources are awarded exactly once per break. */
  const HITS_TO_BREAK = 3; // Normal; use hitsToBreak(s) for the current village
  function strike(s, nodeId, hits, now) {
    const need = hitsToBreak(s);
    const h = hotspot(s, nodeId);
    if (!h || h.kind !== 'node') return { ok: false, state: s, hits: 0, reason: 'Nothing to gather here.' };
    if (!s.nodes[nodeId] || s.nodes[nodeId].charges <= 0) return { ok: false, state: s, hits: 0, reason: 'This spot is growing back. Try again in a few seconds.' };
    const n = Math.max(0, Math.min(need - 1, hits | 0)) + 1;
    if (n < need) return { ok: true, state: s, hits: n, done: false, res: h.res };
    const r = gather(s, nodeId, now);
    return { ...r, hits: need, done: r.ok };
  }

  /* The lab is a fixed project; the water point takes its cost from the chosen technology. */
  function buildDef(s, id) {
    if (id !== 'waterPoint') { const b = D().builds[id]; return b && { ...b, cost: scaleCost(s, b.cost) }; }
    const tech = s.tech && D().technologies[s.tech];
    return { ...D().waterPointBuild, name: tech ? tech.structureName : 'Water point', cost: tech ? scaleCost(s, tech.cost) : { wood: 0, stone: 0 },
      requires: (x) => x.level >= 3 && !!x.tech, requiresText: 'Choose the water system with the committee first.' };
  }
  function canBuild(s, id) {
    const b = buildDef(s, id);
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
    const t = clone(s); const cost = buildDef(s, id).cost;
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

  const labDef = (s) => sceneOf(s).lab; // { clear: sourceId, dirty: sourceId }
  const LAB_ORDER = ['clearSampleInspected', 'dirtySampleInspected', 'microscopeUsed', 'filterTestCompleted'];
  const LAB_NEEDS = { clearSampleInspected: 'Inspect the clear sample first.', dirtySampleInspected: 'Inspect the cloudy sample first.',
    microscopeUsed: 'Look through the microscope first.', filterTestCompleted: 'Try the filter first.' };
  const fail = (s, reason) => ({ ok: false, state: s, reason });

  /* Step 1: the player collects one sample, at today's collection point. */
  function collectSample(s, id) {
    if (!inLevel2(s)) return fail(s, 'Sampling starts in Level 2.');
    if (id !== 'source') return fail(s, 'The partner team asked for a sample from today’s collection point.');
    if (s.samples.indexOf(id) >= 0) return fail(s, 'You already have a sample from here.');
    const t = clone(s); t.samples.push(id);
    return { ok: true, state: t };
  }
  /* Step 2: bring it to the station. Opening the lab with the sample unlocks it. */
  function openLab(s) {
    if (!inLevel2(s) || s.builds.lab !== 'built') return fail(s, 'The field lab opens in Level 2.');
    if (s.samples.indexOf('source') < 0 && !s.flags.labUnlocked) return fail(s, 'Collect a water sample first.');
    return { ok: true, state: s.flags.labUnlocked ? s : setFlag(s, 'labUnlocked') };
  }
  /* Which lab step is next, and whether a step may run yet. */
  function nextLabStep(s) {
    if (!s.flags.labUnlocked) return 'bring';
    const k = LAB_ORDER.find((f) => !s.flags[f]); if (k) return k;
    if (s.surveys.length < 2) return 'surveys';
    if (!s.flags.notesReviewed) return 'notesReviewed';
    if (!s.flags.optionsReviewed) return 'optionsReviewed';
    return 'done';
  }
  function canRun(s, flag) {
    if (!inLevel2(s) || !s.flags.labUnlocked) return 'Bring your sample to the lab first.';
    const i = LAB_ORDER.indexOf(flag);
    for (let j = 0; j < i; j++) if (!s.flags[LAB_ORDER[j]]) return LAB_NEEDS[LAB_ORDER[j]];
    return null;
  }
  /* Steps 3–4: inspecting a jar runs its tests and records the result (with the guess). */
  function inspectJar(s, which, prediction) {
    const flag = which === 'clear' ? 'clearSampleInspected' : 'dirtySampleInspected';
    const why = canRun(s, flag); if (why) return fail(s, why);
    if (s.flags[flag]) return { ok: true, state: s, result: s.results[labDef(s)[which]] };
    if (which === 'clear' && ['safe', 'unsafe', 'unsure'].indexOf(prediction) < 0) return fail(s, 'Make a guess first.');
    const id = labDef(s)[which]; const def = sampleDef(s, id); const t = clone(s);
    t.results[id] = { prediction: prediction || null, clarity: def.clarity, germ: def.germ, salty: !!def.salty };
    t.flags[flag] = true;
    return { ok: true, state: t, result: t.results[id] };
  }
  function labStep(flag) {
    return function (s) {
      const why = canRun(s, flag); if (why) return fail(s, why);
      return { ok: true, state: s.flags[flag] ? s : setFlag(s, flag) };
    };
  }
  const useMicroscope = labStep('microscopeUsed');
  const runFilter = labStep('filterTestCompleted');
  /* What the filter does to the cloudy sample: clearer, still not safe [game]. */
  function filterResult(s) {
    const def = sampleDef(s, labDef(s).dirty);
    return { before: { clarity: def.clarity, germ: def.germ }, after: { clarity: 'clear', germ: def.germ === 'safe' ? 'safe' : 'risky' } };
  }
  function reviewNotes(s) {
    const why = canRun(s, 'filterTestCompleted') || (!s.flags.filterTestCompleted && LAB_NEEDS.filterTestCompleted);
    if (why) return fail(s, why);
    if (s.surveys.length < 2) return fail(s, `Finish the surveys with ${s.people.engineer.name} first.`);
    return { ok: true, state: s.flags.notesReviewed ? s : setFlag(s, 'notesReviewed') };
  }
  function survey(s, id) {
    if (!inLevel2(s)) return { ok: false, state: s, reason: 'Surveys start in Level 2.' };
    if (!surveyDef(s, id)) return { ok: false, state: s, reason: 'Nothing to survey here.' };
    if (s.surveys.indexOf(id) >= 0) return { ok: false, state: s, reason: 'Already surveyed.' };
    const t = clone(s); t.surveys.push(id);
    return { ok: true, state: t };
  }
  const readyForOptions = (s) => !!s.flags.notesReviewed;
  function reviewOptions(s) {
    if (!readyForOptions(s)) return { ok: false, state: s, reason: 'Review your field notes first.' };
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

  /* ---- Level 3: plan, choose, build, activate ------------------------------------------------ */
  function planMeeting(s) {
    if (s.level < 3) return fail(s, 'Planning starts in Level 3.');
    return { ok: true, state: s.flags.planningMet ? s : setFlag(s, 'planningMet') };
  }
  /* Only technologies the investigation found suitable are offered. The recommended one
     can be chosen; a suitable-but-weaker one gets an honest explanation instead.        */
  function techChoices(s) {
    return technologyOptions(s).filter((c) => c.id !== 'statusQuo' && ['recommended', 'part', 'possible', 'complement', 'later'].indexOf(c.status) >= 0)
      .map((c) => ({ ...c, selectable: c.status === 'recommended' && !!D().technologies[c.id].playable }));
  }
  function chooseTech(s, id) {
    if (s.level < 3 || !s.flags.planningMet) return fail(s, 'Hold the planning meeting first.');
    if (s.builds.waterPoint !== 'site') return fail(s, 'Construction has already started.');
    const c = techChoices(s).find((x) => x.id === id);
    if (!c) return fail(s, 'The investigation showed this won’t work here.');
    if (!c.selectable) return fail(s, c.reason);
    const t = clone(s); t.tech = id;
    return { ok: true, state: t };
  }
  const activationSteps = (s) => (s.tech ? D().technologies[s.tech].activation : []);
  function nextActivation(s) { return activationSteps(s).find((st) => s.activation.indexOf(st.id) < 0) || null; }
  /* People the new system can serve: capacity in jerry cans a day at 20 L per person [game]. */
  function capacityPeople(s) {
    if (!s.tech) return 0;
    const L = D().jerryCanLitres, goal = D().litresPerPersonGoal;
    if (s.tech === 'rainwater') return Math.round((s.site.bigRoofsM2 * s.site.rainfallMm * 0.8) / 365 / goal);
    return Math.round((D().technologies[s.tech].capacityCans * L) / goal);
  }
  function activate(s, stepId, now) {
    if (s.builds.waterPoint !== 'built') return fail(s, 'Finish building first.');
    const next = nextActivation(s);
    if (!next) return { ok: true, state: s, done: true };
    if (next.id !== stepId) return fail(s, `First: ${next.label.toLowerCase()}.`);
    const t = clone(s); t.activation.push(stepId);
    // Activation unlocks capacity. Access then grows household by household (water.js).
    if (!nextActivation(t)) { t.flags.systemActive = true; WV.water.open(t, now == null ? Date.now() : now, true); }
    return { ok: true, state: t, step: next, done: !!t.flags.systemActive };
  }

  /* ---- Walkers: who walks where, as the village changes ---------------------------------------- */
  /* Every route in a scene, as [id, route] pairs (used by the scene, the editor and tests). */
  function allRoutes(scene) {
    const r = scene.routes; const out = [];
    ['waterCollection', 'waterCollectionAfter', 'labApproach'].forEach((k) => { if (r[k]) out.push([k, r[k]]); });
    (r.ambient || []).forEach((a) => out.push([a.id, a]));
    return out;
  }
  function walkerPlan(s, opts) {
    const routes = sceneOf(s).routes; const aft = routes.waterCollectionAfter;
    const after = !!(opts && opts.after) || (!!aft && !!s.flags[aft.whenFlag]);
    // Walker counts mirror the household categories; they never feed back into them.
    const c = WV.water && s.water ? WV.water.walkerCounts(s) : { long: 3, near: 0 };
    const plan = [];
    if (!after) plan.push({ id: 'waterCollection', route: routes.waterCollection });
    else {
      if (c.long > 0) plan.push({ id: 'waterCollection', route: routes.waterCollection, count: c.long });
      plan.push({ id: 'waterCollectionAfter', route: aft, count: c.near });
    }
    const lab = routes.labApproach;
    if (lab && s.level >= (lab.fromLevel || 1) && (!lab.needsBuilt || s.builds[lab.needsBuilt] === 'built')) plan.push({ id: 'labApproach', route: lab });
    (routes.ambient || []).forEach((a) => plan.push({ id: a.id, route: a, extra: after ? 1 : 0 }));
    return plan;
  }

  /* ---- Objectives & levels -------------------------------------------------------------- */
  const levelDef = (s) => D().levels.find((l) => l.id === s.level);
  function objectives(s) {
    const l = levelDef(s);
    const label = (id) => ((hotspot(s, id) || {}).label || id).toLowerCase();
    const need = s.tech ? scaleCost(s, D().technologies[s.tech].cost) : null;
    return (l ? l.objectives : []).map((o) => ({ id: o.id, text: o.text(s, label, need), done: !!o.check(s, need) }));
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
    if (t.level === 2) t.flags.level2Completed = true;
    if (t.level === 3) t.flags.level3Completed = true;
    if (t.level === 5) { t.flags.campaignComplete = true; return { ok: true, state: t }; }
    t.level = Math.min(D().levels.length, t.level + 1);
    if (t.level === 5 && WV.maint) WV.maint.start(t);
    // Building season: the gathering spots grow back when construction begins.
    if (t.level === 3) sceneOf(t).hotspots.filter((h) => h.kind === 'node').forEach((h) => (t.nodes[h.id] = { charges: h.charges, regrowAt: null }));
    return { ok: true, state: t };
  }

  /* ---- Milestones ------------------------------------------------------------------------
     Returns the milestones the village has just reached (share of residents with reliable
     water at or above each one's pct) that have not been shown yet, plus the new state.  */
  function checkMilestones(s) {
    if (!s.water || !s.population) return { state: s, reached: [] };
    const pct = (metrics(s).peopleWithWater / s.population) * 100;
    const reached = D().milestones.filter((m) => pct >= m.pct && s.milestonesShown.indexOf(m.pct) < 0);
    if (!reached.length) return { state: s, reached };
    const t = clone(s); reached.forEach((m) => t.milestonesShown.push(m.pct));
    return { state: t, reached };
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
    difficulty, scaleCost, gatherGoal, hitsToBreak, regrowMs, checkMilestones,
    generateVillage, siteFor, migrate, metrics, sceneOf, hotspot, visible,
    inspect, gather, regrow, msUntilRegrow, strike, HITS_TO_BREAK, buildDef, canBuild,
    planMeeting, techChoices, chooseTech, activationSteps, nextActivation, capacityPeople, activate, startBuild, finishBuild, setFlag,
    collectSample, openLab, nextLabStep, inspectJar, useMicroscope, runFilter, filterResult, reviewNotes, labDef, sampleDef,
    survey, readyForOptions, reviewOptions, knownFacts, technologyOptions, walkerPlan, allRoutes,
    levelDef, objectives, nextObjective, levelReady, completeLevel,
    serialize, deserialize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
