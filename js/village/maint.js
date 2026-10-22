/* =============================================================================
   WATERWORKS VILLAGE — MAINTENANCE AND PROJECT COMPLETION (Level 5)
   -----------------------------------------------------------------------------
   One scenario-specific problem. While it lasts, the water point gives less
   water (water.supplyFactor) and the households the reduced supply can no
   longer serve drop back to "trying" (not reliable). Fixing it restores
   supply and condition; access then recovers through the normal Phase 4
   verification steps, never instantly.

   Pure functions over the save state, like sim.js and water.js.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const D = () => WV.data;
  const W = () => WV.water;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fail = (s, reason) => ({ ok: false, state: s, reason });

  // Repair cost scales with difficulty, like every other build.
  const def = (s) => { const d = s.tech ? D().maintenance[s.tech] : null; return d && { ...d, cost: WV.sim.scaleCost(s, d.cost) }; };

  /* Begin the Level 5 problem (in place). Safe to call twice. */
  function start(s) {
    if (s.maint || !s.tech || !s.water || !s.water.active) return s;
    const M = D().maintenance; const w = s.water;
    const reliableBefore = W().residents(s).reliable;
    w.supplyFactor = M.issueSupplyFactor;
    // Households the reduced supply can't serve lose reliable service for now.
    const per = W().hhSize(s); const homesNow = Math.floor(W().effectiveAllocation(s).homes / per);
    const demote = Math.min(w.hh.project, Math.max(Math.ceil(w.hh.project * M.demoteShare), w.hh.project - homesNow));
    w.hh.project -= demote; w.hh.trying += demote;
    s.maint = { issue: s.tech, condition: M.issueCondition, inspected: false, diagnosed: false, wrong: [], steps: [], repaired: false,
      reliableBefore, demoted: demote, priority: null, startReliable: W().startReliable(s) };
    return s;
  }
  /* Older saves: make sure a Level 5 village has its problem (in place). */
  function ensure(s) { if (s.level >= 5 && !s.maint) start(s); return s; }

  function inspect(s) {
    if (!s.maint) return fail(s, 'Nothing to inspect yet.');
    if (s.maint.inspected) return { ok: true, state: s };
    const t = clone(s); t.maint.inspected = true; return { ok: true, state: t };
  }
  function diagnose(s, optionId) {
    if (!s.maint || !s.maint.inspected) return fail(s, 'Inspect the water point first.');
    if (s.maint.diagnosed) return { ok: true, state: s, correct: true };
    const o = def(s).options.find((x) => x.id === optionId); if (!o) return fail(s, 'Unknown option.');
    const t = clone(s);
    if (o.correct) t.maint.diagnosed = true; else if (t.maint.wrong.indexOf(o.id) < 0) t.maint.wrong.push(o.id);
    return { ok: true, state: t, correct: !!o.correct, why: o.why };
  }
  const nextStep = (s) => (s.maint ? def(s).steps.find((x) => s.maint.steps.indexOf(x.id) < 0) || null : null);
  /* Materials are spent once, on the first repair step; gathering spots regrow, so a
     shortfall is only ever a short wait (see sim.regrow).                           */
  function repairStep(s, stepId) {
    if (!s.maint || !s.maint.diagnosed) return fail(s, 'Find what’s wrong first.');
    if (s.maint.repaired) return { ok: true, state: s, done: true };
    const next = nextStep(s);
    if (next.id !== stepId) return fail(s, `First: ${next.label.toLowerCase()}.`);
    const cost = def(s).cost; const t = clone(s);
    if (t.maint.steps.length === 0) {
      const short = Object.keys(cost).filter((k) => t.resources[k] < cost[k]);
      if (short.length) return fail(s, 'Needs ' + short.map((k) => `${cost[k] - t.resources[k]} more ${k}`).join(' and ') + '. The gathering spots regrow every few seconds.');
      Object.keys(cost).forEach((k) => (t.resources[k] -= cost[k]));
      t.maint.spent = { ...cost };
    }
    t.maint.steps.push(stepId);
    if (!nextStep(t)) {
      t.maint.repaired = true; t.maint.condition = D().maintenance.repairedCondition;
      t.water.supplyFactor = 1; t.water.capacityCans = W().capacityCans(t);
      t.maint.reliableAtRepair = W().residents(t).reliable;
    }
    return { ok: true, state: t, step: next, done: t.maint.repaired };
  }
  function choosePriority(s, id) {
    if (!s.maint || !s.maint.repaired) return fail(s, 'Fix the water point first.');
    if (!D().priorities[id]) return fail(s, 'Unknown option.');
    const t = clone(s); t.maint.priority = id; return { ok: true, state: t };
  }
  function completeProject(s) {
    if (!s.maint || !s.maint.repaired || !s.maint.priority) return fail(s, 'Choose the community priority first.');
    if (W().residents(s).reliable < s.maint.reliableBefore) return fail(s, 'Wait until reliable service has recovered.');
    const t = clone(s); t.flags.projectComplete = true; t.maint.report = report(t);
    return { ok: true, state: t };
  }

  /* ---- The final report: every number comes from the simulation state ------------------- */
  function report(s) {
    const r = W().residents(s); const m = WV.sim.metrics(s); const sc = D().scenarios[s.scenarioId];
    const start = s.maint ? s.maint.startReliable : W().startReliable(s);
    return {
      village: s.name, scenario: sc.name, technology: D().technologies[s.tech].name, population: s.population,
      reliable: r.reliable, project: r.project, existing: r.existing, startReliable: start, gained: r.reliable - start,
      roundTripBefore: s.baseline.roundTripMin, roundTripAfter: m.roundTripAfter,
      hoursPerDay: Math.round(m.hoursSavedPerDay || 0), hoursPerYear: Math.round((m.hoursSavedPerDay || 0) * 365),
      condition: Math.round((s.maint ? s.maint.condition : 1) * 100),
      priority: s.maint && s.maint.priority ? D().priorities[s.maint.priority].name : null,
      stillWaiting: r.trying + r.partial + r.none,
    };
  }

  WV.maint = { def, start, ensure, inspect, diagnose, nextStep, repairStep, choosePriority, completeProject, report };
})(typeof window !== 'undefined' ? window : globalThis);
