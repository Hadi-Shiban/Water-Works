/* =============================================================================
   WATERWORKS WIREFRAME — SIM-LITE
   -----------------------------------------------------------------------------
   A tiny, pure calculator that applies the framework's formulas to the mock
   state so every number on screen stays internally coherent. It is NOT the
   real simulation engine: no seeded RNG, no daily land-use runoff, no
   multi-district hydraulics. Framework section numbers are cited inline.

   INTERFACE TO THE FUTURE ENGINE
     compute(state)        -> "derived" snapshot the UI renders (like a DailyState)
     applyEffects(s, item) -> project effects, shared by preview and approval
   Replace these two with engine calls; the views only read `derived`.
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = (root.WW = root.WW || {});
  const D = () => WW.data;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const KEYS = ['turbidity', 'microbial', 'nutrients', 'chemical', 'organic'];

  /* Game-scale bands [framework §6]: not regulatory thresholds. */
  function band(v) {
    if (v < 20) return { i: 0, key: 'low', label: 'Low' };
    if (v < 40) return { i: 1, key: 'moderate', label: 'Moderate' };
    if (v < 60) return { i: 2, key: 'elevated', label: 'Elevated' };
    if (v < 80) return { i: 3, key: 'high', label: 'High' };
    return { i: 4, key: 'severe', label: 'Severe' };
  }
  const conditionFactor = (c) => 0.55 + 0.45 * c;                                  // [framework §12]
  const overloadFactor = (r) => (r <= 1 ? 1 : Math.max(0.55, 1 - 0.45 * (r - 1))); // [framework §12]
  const tier = (ratio) => (ratio >= 0.95 ? 'full' : ratio >= 0.8 ? 'reduced' : ratio >= 0.5 ? 'rationed' : 'cut');
  const tierLabel = { full: 'Full service', reduced: 'Reduced', rationed: 'Rationed', cut: 'Cut off' };

  /* Sequential stages MULTIPLY remaining load [Treatment Matrix use rule].
     Disinfection is penalised when turbidity entering it is > 40 [Rules R_WQ_003];
     the 0.6 multiplier is a [proto] balance coefficient.                          */
  function runTrain(src, stages, f, bypass) {
    let load = {}; KEYS.forEach((k) => (load[k] = src[k]));
    const steps = [{ id: 'source', load: { ...load }, compat: false }];
    stages.forEach((st) => {
      const out = {}; let compat = false;
      const off = bypass && bypass.indexOf(st.id) >= 0;
      KEYS.forEach((k) => {
        let r = off ? 0 : st.removal[k] * f;
        if (!off && st.id === 'disinfection' && k === 'microbial' && load.turbidity > 40) { r *= 0.6; compat = true; }
        out[k] = load[k] * (1 - clamp(r, 0, 0.99));
      });
      load = out; steps.push({ id: st.id, load: { ...out }, compat, bypassed: !!off });
    });
    return steps;
  }

  const stageObj = (id) => D().treatmentStages.find((s) => s.id === id) || D().treatmentCatalog[id];

  /* Baseline (Day 4 opening) formula run, used to calibrate authored readings so the
     Example Day table is reproduced exactly and changes follow the formulas.          */
  let _calib = null;
  function calibration() {
    if (_calib) return _calib;
    const w = D().waterState;
    const cf = conditionFactor(w.plant.condition);
    const eff = w.plant.rated * cf * w.plant.power * w.plant.staffing;
    const f = cf * w.plant.power * overloadFactor(w.intake / eff);
    const stages = D().treatmentStages.map((s) => s);
    const steps = runTrain(w.sourceLoads, stages, f);
    const auth = D().baselineStageReadings;
    _calib = {};
    steps.forEach((st) => {
      _calib[st.id] = {};
      KEYS.forEach((k) => (_calib[st.id][k] = auth[st.id][k] - st.load[k]));
    });
    _calib.refs = { reserve0: (w.storage / 170) * 100, cond0: w.plant.condition * 100, margin0: (eff / w.intake) * 100, availability0: 89 };
    return _calib;
  }

  const sectorList = () => D().allocationSectors;

  /* Allocation normaliser [framework §10]: keep totals equal to delivered water.
     Extra water goes to unmet demand by priority; shortfalls come off low priority
     first and never below the clinic minimum unless nothing else is left.          */
  function normalizeAllocation(s, delivered, fresh, raw) {
    const secs = sectorList();
    const a = {};
    secs.forEach((x) => (a[x.id] = clamp(raw[x.id] || 0, 0, fresh[x.id])));
    const sum = () => secs.reduce((t, x) => t + a[x.id], 0);
    let over = sum() - delivered;
    if (over > 0.001) {
      const asc = secs.slice().sort((p, q) => p.priority - q.priority || fresh[q.id] - fresh[p.id]);
      [true, false].forEach((keepMin) => {
        asc.forEach((x) => {
          if (over <= 0.001) return;
          const floor = keepMin ? Math.min(x.min, a[x.id]) : 0;
          const cut = Math.min(over, a[x.id] - floor);
          if (cut > 0) { a[x.id] -= cut; over -= cut; }
        });
      });
    } else if (over < -0.001) {
      let left = -over;
      secs.slice().sort((p, q) => q.priority - p.priority).forEach((x) => {
        const give = Math.min(left, fresh[x.id] - a[x.id]);
        if (give > 0) { a[x.id] += give; left -= give; }
      });
    }
    secs.forEach((x) => (a[x.id] = r1(a[x.id])));
    // fix rounding so the total matches delivered to one decimal
    const diff = r1(delivered - sum());
    if (Math.abs(diff) >= 0.1) {
      const order = secs.slice().sort((p, q) => q.priority - p.priority);
      for (const x of order) {
        const nv = clamp(a[x.id] + diff, 0, fresh[x.id]);
        if (Math.abs(nv - a[x.id]) > 0) { a[x.id] = r1(nv); break; }
      }
    }
    return a;
  }

  function compute(s) {
    const data = D();
    const st = data.stormEffects;
    const storm = s.event.status === 'active' || s.event.status === 'resolved';
    const shift = storm && s.event.choice === 2;
    const stormLoad = storm ? st.treatmentLoadMult : 1;

    /* --- capacity & overload [framework §12] --- */
    const cf = conditionFactor(s.plant.condition);
    const staffing = shift ? 1.1 : s.plant.staffing;
    const effCap = s.plant.rated * cf * s.plant.power * staffing;
    const throughput = Math.min(s.intake, effCap);
    const loadRatio = (s.intake * stormLoad) / Math.max(effCap, 1);
    const ovl = overloadFactor(loadRatio);
    const f = cf * s.plant.power * ovl;

    /* --- source loads: base + storm + protection [framework §12 land-use update] --- */
    const src = {};
    KEYS.forEach((k) => (src[k] = clamp(data.waterState.sourceLoads[k] + (storm ? st.loads[k] : 0) + (s.protect[k] || 0), 0, 100)));
    const reservoirVolume = Math.round(s.reservoirVolume * (storm ? st.volumeMult : 1));

    /* --- treatment train with calibration --- */
    const calib = calibration();
    const stages = s.stages.map(stageObj);
    const steps = runTrain(src, stages, f, s.bypass);
    let lastId = 'source';
    const shown = steps.map((step) => {
      if (calib[step.id]) lastId = step.id;
      const c = calib[step.id] || calib[lastId];
      const load = {};
      KEYS.forEach((k) => (load[k] = clamp(r1(step.load[k] + c[k]), 0, 100)));
      const phId = data.baselineStageReadings[step.id] ? step.id : lastId;
      load.ph = data.baselineStageReadings[phId].ph;
      return { id: step.id, load, compat: step.compat, bypassed: step.bypassed };
    });
    shown[0].load = { ...src, ph: data.waterState.sourceLoads.ph };
    KEYS.forEach((k) => (shown[0].load[k] = r1(src[k])));
    const outlet = shown[shown.length - 1].load;

    /* --- tap = plant outlet + distribution recontamination [framework §12] --- */
    const storagePct = s.storage / s.storageCapacity;
    const lowStorage = storagePct < 0.25;
    const tap = { ...outlet };
    tap.microbial = clamp(tap.microbial + (lowStorage ? 4 : 0), 0, 100);

    /* --- quality [framework §17] --- */
    const mineral = data.waterState.mineralPenalty;
    const hazard = 0.35 * tap.microbial + 0.2 * tap.turbidity + 0.15 * tap.nutrients + 0.15 * tap.chemical + 0.1 * tap.organic + 0.05 * mineral;
    const phPenalty = tap.ph >= 6.5 && tap.ph <= 8.5 ? 0 : Math.min(25, Math.abs(tap.ph - 7.5) * 8);
    let quality = clamp(100 - hazard - phPenalty - s.distributionPenalty, 0, 100);
    if (tap.microbial >= 80 || tap.chemical >= 80) quality = Math.min(quality, 49);

    /* --- demand, reuse, release, loss, delivery [framework §9] --- */
    const secs = sectorList();
    const grossDemand = secs.reduce((t, x) => t + s.demand[x.id], 0);
    const reclaimed = s.reuse.connected ? Math.min(s.reuse.supply, s.demand.farm) : 0;
    const freshDemand = grossDemand - reclaimed;
    const released = Math.min(s.distributionCapacity, freshDemand);
    const lossRate = clamp(s.loss.base + s.loss.age + s.loss.leakDamage - s.loss.leakProgram, 0.03, 0.4);
    const treatedAvail = s.storage + throughput;
    const releasable = Math.min(treatedAvail, released, s.distributionCapacity);
    const delivered = releasable * (1 - lossRate);
    const lossUnits = releasable * lossRate;
    const closingStorage = clamp(s.storage + throughput - released, 0, s.storageCapacity);
    const availability = 100 * Math.min((delivered + reclaimed) / grossDemand, 1);

    /* --- allocation & service tiers [framework §10] --- */
    const fresh = {}; secs.forEach((x) => (fresh[x.id] = s.demand[x.id] - (x.id === 'farm' ? reclaimed : 0)));
    const allocation = normalizeAllocation(s, r1(delivered), fresh, s.allocation);
    const sectors = {};
    secs.forEach((x) => {
      const got = allocation[x.id] + (x.id === 'farm' ? reclaimed : 0);
      const ratio = clamp(got / s.demand[x.id], 0, 1);
      sectors[x.id] = { id: x.id, name: x.name, demand: s.demand[x.id], fresh: fresh[x.id], alloc: allocation[x.id], reclaimed: x.id === 'farm' ? reclaimed : 0, got, ratio, tier: tier(ratio), priority: x.priority, returnFlow: x.returnFlow };
    });
    const clinicBelowMin = allocation.clinic < secs.find((x) => x.id === 'clinic').min - 0.05;

    /* --- wastewater [framework §9] --- */
    const wwGenerated = secs.reduce((t, x) => t + allocation[x.id] * x.returnFlow, 0);
    const wwCapacity = data.waterState.wastewater.capacity;
    const wwPolish = reclaimed;
    const wwEffCap = wwCapacity - wwPolish;
    const wwTreated = Math.min(wwGenerated, wwEffCap);
    const wwLoadPct = wwGenerated / wwEffCap;
    const compliance = clamp(data.waterState.wastewater.compliance - Math.max(0, (wwLoadPct - 1) * 60), 0, 100);
    const discharged = Math.max(0, wwTreated - reclaimed);

    /* --- scores [framework §17] --- */
    const refs = calib.refs;
    const reserveScore = clamp((s.storage / 170) * 100, 0, 100);
    const margin = clamp((effCap / (s.intake * stormLoad)) * 100, 0, 100);
    const relDelta = 0.25 * (reserveScore - refs.reserve0) + 0.25 * (s.plant.condition * 100 - refs.cond0) + 0.15 * (margin - refs.margin0)
      + 0.35 * 0.5 * (availability - refs.availability0) - (clinicBelowMin ? 6 : 0);
    const reliability = clamp(data.waterState.baseScores.reliability + relDelta, 0, 100);
    const access = (100 * s.connectedPeople) / s.population;
    const resilience = clamp(data.waterState.baseScores.resilience + 0.25 * (reserveScore - refs.reserve0) + 0.2 * (s.plant.condition * 100 - refs.cond0)
      + 0.15 * s.emergency + 0.1 * s.watershedScore + s.resilienceBonus, 0, 100);
    const scores = { quality, availability, reliability, access, resilience };
    let wsBase = 0;
    data.outcomeWeights.forEach((w) => (wsBase += w.weight * scores[w.key]));
    let ws = wsBase; const activeGates = [];
    data.gates.forEach((g) => { if (scores[g.key] < g.below) { activeGates.push(g); ws = Math.min(ws, g.cap); } });

    /* --- people with reliable clean-water service (primary progression number) --- */
    const homesRatio = sectors.homes.ratio;
    const fAlloc = clamp((homesRatio - 0.5) / 0.35, 0, 1);
    const fQual = clamp((quality - 70) / 10, 0, 1);
    const reliablePeople = Math.round(s.connectedPeople * fAlloc * fQual);
    const advisory = fQual < 1;

    /* --- economy & energy [framework §19] --- */
    const stageOpex = s.stages.reduce((t, id) => t + stageObj(id).opex, 0);
    const opex = stageOpex + 1300 + s.baseOpex + s.opexExtra;
    const revenue = s.revenueFull * (availability / 100);
    const energyUsed = data.waterState.energyFixed + s.stages.reduce((t, id) => t + stageObj(id).energy, 0) + s.energyExtra + (shift ? 6 : 0);

    /* --- routines & reclaimed time (human layer, framework §23) --- */
    const routines = {};
    const R = data.residents;
    const pick = (id, sector, extra) => {
      const tr = R[id].tiers[sectors[sector].tier];
      routines[id] = { tier: sectors[sector].tier, text: tr[0], hours: tr[1] + (extra || 0) };
    };
    pick('maya', 'school'); pick('ines', 'clinic'); pick('tomas', 'farm'); pick('sam', 'market'); pick('jun', 'industry'); pick('ravi', 'homes');
    const walk = s.flags.indexOf('ext') >= 0 ? 0 : 0.83; // standpipe walk until the pipe extension exists [proto]
    pick('elena', 'homes', walk);
    if (walk) routines.elena.text = 'Standpipe walk each morning (about 50 min). ' + routines.elena.text;
    const hoursLost = Object.keys(routines).reduce((t, k) => t + routines[k].hours, 0);

    return {
      storm, shift, stormLoad, cf, staffing, effCap, throughput, loadRatio, ovl, f, strain: loadRatio > 1,
      src, steps: shown, outlet, tap, reservoirVolume, storagePct, lowStorage,
      storageState: storagePct >= 0.5 ? 'healthy' : storagePct >= 0.25 ? 'watch' : 'low',
      reserveDays: s.storage / 170,
      hazard, phPenalty, quality,
      grossDemand, reclaimed, freshDemand, released, lossRate, lossUnits, treatedAvail, delivered, closingStorage, availability,
      allocation, sectors, clinicBelowMin,
      wwGenerated, wwCapacity, wwEffCap, wwTreated, wwLoadPct, compliance, discharged,
      scores, wsBase, ws, activeGates, reliablePeople, advisory, fAlloc, fQual,
      opex, revenue, net: revenue - opex, energyUsed, energyCapacity: data.waterState.energyCapacity,
      routines, hoursLost,
      leak: s.loss.leakDamage > 0, leakUnits: s.loss.leakDamage * releasable,
    };
  }

  /* Project effects, shared by the preview diff and by approval [Rail data `effects`]. */
  function applyEffects(s, item) {
    const e = item.effects || {};
    if (e.stage && s.stages.indexOf(e.stage) < 0) {
      const i = s.stages.indexOf('disinfection');
      s.stages.splice(i < 0 ? s.stages.length : i, 0, e.stage);
    }
    if (e.leakProgram) s.loss.leakProgram += e.leakProgram;
    if (e.demand) Object.keys(e.demand).forEach((k) => (s.demand[k] += e.demand[k]));
    if (e.storageCapacity) s.storageCapacity += e.storageCapacity;
    if (e.population) s.population += e.population;
    if (e.connected) s.connectedPeople += e.connected;
    if (e.terrace) { s.terraceConnected += e.terrace; s.connectedPeople += e.terrace; }
    if (e.protect) Object.keys(e.protect).forEach((k) => (s.protect[k] = (s.protect[k] || 0) + e.protect[k]));
    if (e.opex) s.opexExtra += e.opex;
    if (e.energy) s.energyExtra += e.energy;
    if (e.reuse) s.reuse.connected = true;
    if (e.resilience) s.resilienceBonus += e.resilience;
    if (e.watershed) s.watershedScore += e.watershed;
    if (e.emergency) s.emergency += e.emergency;
    if (e.flag && s.flags.indexOf(e.flag) < 0) s.flags.push(e.flag);
    return s;
  }
  function repairLeak(s) {
    s.loss.leakDamage = 0;
    s.distributionPenalty = D().waterState.distributionPenaltyAfterRepair;
    if (s.flags.indexOf('repaired') < 0) s.flags.push('repaired');
    return s;
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* Before/after diff for a candidate project, computed on a cloned state. */
  function previewItem(s, item) {
    const before = compute(s);
    const t = clone(s);
    if (item.action === 'repair') repairLeak(t); else applyEffects(t, item);
    const after = compute(t);
    return { before, after, state: t };
  }

  function initialState() {
    const w = clone(D().waterState);
    return {
      day: w.day, funding: w.funding, knowledge: w.knowledge, population: w.population, connectedPeople: w.connectedPeople, terraceConnected: w.terraceConnected,
      storage: w.storage, storageCapacity: w.storageCapacity, intake: w.intake, distributionCapacity: w.distributionCapacity,
      plant: w.plant, loss: w.loss, reservoirVolume: w.reservoir.volume,
      revenueFull: w.revenueAtFullService, baseOpex: w.baseOpex,
      demand: D().allocationSectors.reduce((o, x) => ((o[x.id] = x.demand), o), {}),
      allocation: clone(D().defaultAllocation),
      stages: D().treatmentStages.map((x) => x.id),
      protect: { turbidity: 0, microbial: 0, nutrients: 0, chemical: 0, organic: 0 },
      distributionPenalty: w.distributionPenalty,
      reuse: { connected: false, supply: w.reuse.supply },
      opexExtra: 0, energyExtra: 0, resilienceBonus: 0, watershedScore: 0, emergency: 0,
      event: { status: 'idle', choice: null },
      flags: [], bypass: [], projects: [], tested: false,
    };
  }

  WW.sim = { clamp, r1, band, conditionFactor, overloadFactor, tier, tierLabel, runTrain, compute, applyEffects, repairLeak, previewItem, initialState, clone, stageObj, KEYS, calibration };
})(window);
