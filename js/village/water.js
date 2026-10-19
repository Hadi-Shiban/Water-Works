/* =============================================================================
   WATERWORKS VILLAGE — WATER USE AND HOUSEHOLD ACCESS
   -----------------------------------------------------------------------------
   Building a water point adds CAPACITY. Access grows household by household:
   families start using the point ("trying"), and each service period some of
   them are verified as having reliable safe service ("project"). Households
   that already treat their water well ("existing") count as reliable from the
   start; households with partial treatment ("partial") do not.

   Pure functions over the save state. Progress advances only through step(),
   which is driven by a wall-clock schedule (nextStepAt) or by "run the week" —
   never by animation frames or by how many walkers are on screen.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const D = () => WV.data;
  const S = () => WV.sim;
  const CATS = ['project', 'trying', 'existing', 'partial', 'none'];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const hhSize = (s) => s.population / s.households;

  /* ---- Starting household practices (seeded, scenario-specific) ---------------------- */
  function baseline(s) {
    const r = S().rng((s.seed ^ 0x51ed2701) >>> 0); const b = D().water.baselines[s.scenarioId];
    const pick = ([lo, hi]) => lo + r() * (hi - lo);
    const existing = Math.max(1, Math.round(s.households * pick(b.existing)));
    const partial = Math.round(s.households * pick(b.partial));
    const none = Math.max(0, s.households - existing - partial);
    return { hh: { project: 0, trying: 0, existing, partial, none }, far: Math.round(none * D().water.farShare) };
  }

  /* Fill in s.water for new villages and for saves from before this model. Never awards
     access: a save that activated under the old instant model starts adoption fresh.   */
  function ensure(s) {
    if (s.water && s.water.hh) return migrateAllocation(s);
    const b = baseline(s);
    s.water = { hh: b.hh, far: b.far, active: false, capacityCans: 0, nextStepAt: null, periods: 0,
      allocation: null, allocationSet: false, allocVersion: 2, clinicOverride: false, decision: null, weeksRun: 0 };
    if (s.flags && s.flags.systemActive) open(s, 0, true);
    return s;
  }

  /* ---- Residents per category (always sums to the population) ----------------------- */
  function residents(s) {
    const hh = s.water.hh; const per = hhSize(s); const out = {}; let used = 0;
    const rem = CATS.map((k) => { const exact = hh[k] * per; out[k] = Math.floor(exact); used += out[k]; return [k, exact - out[k]]; });
    rem.sort((a, b) => b[1] - a[1] || CATS.indexOf(a[0]) - CATS.indexOf(b[0]));
    for (let i = 0; used < s.population && i < rem.length; i++, used++) out[rem[i][0]] += 1;
    out.reliable = out.project + out.existing;
    out.total = CATS.reduce((t, k) => t + out[k], 0);
    return out;
  }

  /* ---- Capacity and allocation ------------------------------------------------------------
     Allocations are ABSOLUTE jerry cans a day, one number per sector, never percentages.
     Rules (shared finite pool):
       0 <= alloc[x] <= need[x]                 no negative, no more than full service
       sum(alloc) <= supply                      never over the water point's supply
       unused water is allowed                   the plan is NOT normalised to the supply
     Changing one sector never changes another (setDraftValue). The clinic has a
     recommended minimum; going below it needs an explicit, visible override.          */
  const SECTOR_IDS = () => D().allocation.sectors.map((x) => x.id);
  function capacityCans(s) {
    if (!s.water.active) return 0;
    // supplyFactor < 1 models lost supply (a breakdown, a dry spell). It never edits the plan.
    const f = s.water.supplyFactor == null ? 1 : Math.max(0, Math.min(1, s.water.supplyFactor));
    return Math.round(S().capacityPeople(s) * (s.water.decision === 'reliability' ? 1 + D().water.reliabilityCapacityBoost : 1) * f);
  }
  // Cans a day for full service: homes 1 can (≈20 L) per resident; others per resident share [game].
  function needs(s) {
    const o = {}; D().allocation.sectors.forEach((x) => { o[x.id] = x.id === 'homes' ? s.population : Math.ceil(s.population * x.needPerPerson); });
    return o;
  }
  function clinicMin(s) { const x = D().allocation.sectors.find((y) => y.critical); return Math.ceil(needs(s)[x.id] * x.minShareOfNeed); }
  const sum = (a) => SECTOR_IDS().reduce((t, k) => t + (a[k] || 0), 0);
  /* The committee's proposal: full service in priority order (clinic, homes, school,
     gardens) until the supply runs out. Never exceeds demand or supply.             */
  function defaultAllocation(s, supply) {
    const need = needs(s); const cap = supply == null ? capacityCans(s) : supply; const a = {}; let left = cap;
    SECTOR_IDS().forEach((k) => (a[k] = 0));
    ['clinic', 'homes', 'school', 'garden'].forEach((k) => { a[k] = Math.max(0, Math.min(need[k], left)); left -= a[k]; });
    return a;
  }
  /* The most a sector may take right now, given everything else stays as it is. */
  function maxAllowed(s, alloc, id, supply) {
    const cap = supply == null ? capacityCans(s) : supply;
    return Math.max(0, Math.min(needs(s)[id], cap - (sum(alloc) - (alloc[id] || 0))));
  }
  /* Set ONE sector in a draft. Returns a new draft; every other sector is untouched. */
  function setDraftValue(s, draft, id, value, supply) {
    const next = { ...draft }; const v = Math.round(Number(value)); 
    next[id] = Math.max(0, Math.min(isFinite(v) ? v : 0, maxAllowed(s, draft, id, supply)));
    return next;
  }
  function budget(s, alloc, supply) {
    const cap = supply == null ? capacityCans(s) : supply; const used = sum(alloc);
    return { supply: cap, allocated: used, remaining: cap - used, over: Math.max(0, used - cap) };
  }
  /* Is a plan valid against today's supply and demand? Lists every problem, hides none. */
  function validate(s, alloc, supply) {
    const need = needs(s); const b = budget(s, alloc, supply); const issues = [];
    if (b.over > 0) issues.push({ kind: 'over', text: `The plan shares ${b.allocated} cans but the water point gives ${b.supply}. Reduce by ${b.over}.` });
    SECTOR_IDS().forEach((k) => {
      if (!(alloc[k] >= 0) || Math.round(alloc[k]) !== alloc[k]) issues.push({ kind: 'invalid', id: k, text: `${k}: invalid amount.` });
      else if (alloc[k] > need[k]) issues.push({ kind: 'aboveNeed', id: k, text: `${k} gets more than it needs.` });
    });
    const clinicLow = (alloc.clinic || 0) < clinicMin(s);
    return { valid: issues.length === 0, issues, clinicLow, budget: b };
  }
  /* What a plan would mean, before it is confirmed. */
  function outcome(s, alloc, supply) {
    const need = needs(s); const per = hhSize(s); const sectors = {};
    D().allocation.sectors.forEach((x) => {
      const got = alloc[x.id] || 0; const ratio = need[x.id] ? got / need[x.id] : 1;
      sectors[x.id] = { got, need: need[x.id], ratio, status: ratio >= 0.95 ? 'full' : ratio >= 0.6 ? 'reduced' : 'short' };
    });
    const v = validate(s, alloc, supply);
    return { sectors, ...v.budget, total: v.budget.allocated, cap: v.budget.supply, valid: v.valid, clinicLow: v.clinicLow, clinicMin: clinicMin(s),
      homesHouseholds: Math.min(s.households, Math.floor((alloc.homes || 0) / per)) };
  }
  /* Commit a plan. `overrideClinic` must be true to confirm below the clinic minimum. */
  function setAllocation(s, alloc, opts) {
    if (!s.water.active) return { ok: false, state: s, reason: 'The water point is not running yet.' };
    const clean = {}; SECTOR_IDS().forEach((k) => (clean[k] = alloc[k]));
    const v = validate(s, clean);
    if (!v.valid) return { ok: false, state: s, reason: v.issues[0].text };
    if (v.clinicLow && !(opts && opts.overrideClinic)) return { ok: false, state: s, reason: `The clinic is below its recommended ${clinicMin(s)} cans. Confirm the override to go ahead.`, needsOverride: true };
    const t = clone(s); t.water.allocation = clean; t.water.allocationSet = true; t.water.clinicOverride = v.clinicLow;
    return { ok: true, state: t };
  }
  /* If supply drops below a confirmed plan (e.g. a breakdown), the stored plan is NOT
     changed. The simulation uses this effective plan instead, and the UI says the plan
     needs review. Policy: cut gardens, then school, then homes; the clinic last.     */
  function effectiveAllocation(s) {
    const a = { ...(s.water.allocation || defaultAllocation(s)) }; let over = sum(a) - capacityCans(s);
    for (const k of ['garden', 'school', 'homes', 'clinic']) { if (over <= 0) break; const cut = Math.min(a[k], over); a[k] -= cut; over -= cut; }
    return a;
  }
  const needsReview = (s) => !!s.water && s.water.active && !!s.water.allocation && !validate(s, s.water.allocation).valid;
  const homesCapHouseholds = (s) => Math.floor(effectiveAllocation(s).homes / hhSize(s));
  /* Saves from the first Level 4 build stored a plan forced to sum to the supply, often
     above demand. Clamp each sector to its demand; the rest becomes unused water.      */
  function migrateAllocation(s) {
    if (!s.water || !s.water.allocation || s.water.allocVersion === 2) { if (s.water) s.water.allocVersion = 2; return s; }
    const need = needs(s); SECTOR_IDS().forEach((k) => { s.water.allocation[k] = Math.max(0, Math.min(need[k], Math.round(s.water.allocation[k] || 0))); });
    s.water.allocVersion = 2;
    return s;
  }

  /* ---- Opening and stepping ----------------------------------------------------------------- */
  function open(s, now, inPlace) {
    const t = inPlace ? s : clone(s);
    t.water.active = true; t.water.capacityCans = capacityCans(t);
    t.water.allocation = t.water.allocation || defaultAllocation(t);
    t.water.nextStepAt = (now || 0) + D().water.stepMs;
    return t;
  }
  /* One service period: verify some trying households, then let more start. Deterministic. */
  function step(s) {
    if (!s.water.active) return { ok: false, state: s };
    const t = clone(s); const w = t.water; const hh = w.hh; const W = D().water;
    const cap = homesCapHouseholds(t);
    const rate = w.decision === 'reliability' ? W.verifyRateReliable : W.verifyRate;
    let verify = hh.trying > 0 ? Math.max(1, Math.round(hh.trying * rate)) : 0;
    verify = Math.min(verify, hh.trying, Math.max(0, cap - hh.project));
    hh.trying -= verify; hh.project += verify;
    const reachableNone = w.decision === 'extend' ? hh.none : Math.max(0, hh.none - w.far);
    let start = Math.min(reachableNone + hh.partial, Math.max(1, Math.ceil(t.households * W.startShare)), Math.max(0, cap - hh.project - hh.trying));
    // Households walking farthest come first; partial treaters follow; the farthest homes
    // join only after an extension.
    const fromNear = Math.min(start, Math.max(0, hh.none - w.far)); start -= fromNear;
    const fromFar = w.decision === 'extend' ? Math.min(start, w.far) : 0; start -= fromFar;
    const fromPartial = Math.min(start, hh.partial);
    hh.none -= fromNear + fromFar; w.far -= fromFar; hh.partial -= fromPartial;
    hh.trying += fromNear + fromFar + fromPartial;
    w.periods += 1; w.capacityCans = capacityCans(t);
    return { ok: true, state: t, verified: verify };
  }
  /* At most one period per call, so returning after a long break still counts up gradually. */
  function stepIfDue(s, now) {
    if (!s.water || !s.water.active || s.water.nextStepAt == null || now < s.water.nextStepAt) return { changed: false, state: s };
    const r = step(s); r.state.water.nextStepAt = now + D().water.stepMs;
    return { changed: true, state: r.state, verified: r.verified };
  }
  function runWeek(s, now) {
    if (!s.water.active) return { ok: false, state: s, reason: 'The water point is not running yet.' };
    if (!s.water.decision) return { ok: false, state: s, reason: 'Meet the committee first.' };
    const r = step(s); r.state.water.weeksRun += 1; r.state.water.nextStepAt = (now || 0) + D().water.stepMs;
    return { ok: true, state: r.state, verified: r.verified };
  }
  function decide(s, id) {
    if (!s.water.active || !s.water.allocationSet) return { ok: false, state: s, reason: 'Share the water first.' };
    if (s.water.decision) return { ok: false, state: s, reason: 'The committee has already decided.' };
    if (!D().decisions[id]) return { ok: false, state: s, reason: 'Unknown option.' };
    const t = clone(s); t.water.decision = id; t.water.capacityCans = capacityCans(t);
    // A bigger supply is NOT poured into any sector: it shows up as unused water to share.
    return { ok: true, state: t };
  }

  /* ---- What the animation should show (reads state, never writes it) ----------------------- */
  function walkerCounts(s) {
    if (!s.water || !s.water.active) return { long: 3, near: 0 };
    const hh = s.water.hh; const n = s.households;
    const longShare = (hh.none + hh.partial) / n; const nearShare = (hh.project + hh.trying) / n;
    return { long: hh.none + hh.partial > 0 ? Math.max(1, Math.round(3 * longShare)) : 0, near: Math.min(4, Math.max(1, Math.round(1 + 3 * nearShare))) };
  }

  WV.water = { CATS, baseline, ensure, residents, capacityCans, defaultAllocation, clinicMin, needs, outcome, setAllocation,
    maxAllowed, setDraftValue, budget, validate, effectiveAllocation, needsReview, migrateAllocation, sum, open, step, stepIfDue, runWeek, decide, walkerCounts, hhSize };
})(typeof window !== 'undefined' ? window : globalThis);
