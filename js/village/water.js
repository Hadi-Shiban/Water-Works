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
    if (s.water && s.water.hh) return s;
    const b = baseline(s);
    s.water = { hh: b.hh, far: b.far, active: false, capacityCans: 0, nextStepAt: null, periods: 0,
      allocation: null, allocationSet: false, decision: null, weeksRun: 0 };
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

  /* ---- Capacity and allocation ---------------------------------------------------------- */
  function capacityCans(s) {
    if (!s.water.active) return 0;
    return Math.round(S().capacityPeople(s) * (s.water.decision === 'reliability' ? 1 + D().water.reliabilityCapacityBoost : 1));
  }
  function defaultAllocation(cap) {
    const secs = D().allocation.sectors; const a = {}; let used = 0;
    secs.forEach((x) => { a[x.id] = Math.floor(cap * x.share); used += a[x.id]; });
    a.homes += cap - used;
    return a;
  }
  const clinicMin = (cap) => Math.ceil(cap * D().allocation.sectors.find((x) => x.critical).minShare);
  function needs(s) {
    const o = {}; D().allocation.sectors.forEach((x) => { o[x.id] = x.id === 'homes' ? s.population : Math.ceil(s.population * x.needPerPerson); });
    return o;
  }
  /* What an allocation would mean, before it is confirmed. */
  function outcome(s, alloc) {
    const need = needs(s); const cap = capacityCans(s); const per = hhSize(s);
    const sectors = {};
    D().allocation.sectors.forEach((x) => {
      const got = alloc[x.id] || 0; const ratio = need[x.id] ? got / need[x.id] : 1;
      sectors[x.id] = { got, need: need[x.id], ratio, status: ratio >= 0.95 ? 'full' : ratio >= 0.6 ? 'reduced' : 'short' };
    });
    const total = Object.values(alloc).reduce((t, v) => t + v, 0);
    return { sectors, total, cap, ok: total === cap && alloc.clinic >= clinicMin(cap), homesHouseholds: Math.floor((alloc.homes || 0) / per), clinicMin: clinicMin(cap) };
  }
  function setAllocation(s, alloc) {
    if (!s.water.active) return { ok: false, state: s, reason: 'The water point is not running yet.' };
    const clean = {}; D().allocation.sectors.forEach((x) => (clean[x.id] = Math.max(0, Math.round(Number(alloc[x.id]) || 0))));
    const o = outcome(s, clean);
    if (o.total !== o.cap) return { ok: false, state: s, reason: `Share exactly ${o.cap} jerry cans a day (now ${o.total}).` };
    if (clean.clinic < o.clinicMin) return { ok: false, state: s, reason: `The clinic needs at least ${o.clinicMin} cans a day.` };
    const t = clone(s); t.water.allocation = clean; t.water.allocationSet = true;
    return { ok: true, state: t };
  }
  const homesCapHouseholds = (s) => Math.floor(((s.water.allocation || defaultAllocation(capacityCans(s))).homes) / hhSize(s));

  /* ---- Opening and stepping ----------------------------------------------------------------- */
  function open(s, now, inPlace) {
    const t = inPlace ? s : clone(s);
    t.water.active = true; t.water.capacityCans = capacityCans(t);
    t.water.allocation = t.water.allocation || defaultAllocation(t.water.capacityCans);
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
    // A bigger daily supply goes to homes, so the allocation still adds up.
    const extra = t.water.capacityCans - Object.values(t.water.allocation).reduce((a, v) => a + v, 0);
    if (extra > 0) t.water.allocation.homes += extra;
    return { ok: true, state: t };
  }

  /* ---- What the animation should show (reads state, never writes it) ----------------------- */
  function walkerCounts(s) {
    if (!s.water || !s.water.active) return { long: 3, near: 0 };
    const hh = s.water.hh; const n = s.households;
    const longShare = (hh.none + hh.partial) / n; const nearShare = (hh.project + hh.trying) / n;
    return { long: hh.none + hh.partial > 0 ? Math.max(1, Math.round(3 * longShare)) : 0, near: Math.min(4, Math.max(1, Math.round(1 + 3 * nearShare))) };
  }

  WV.water = { CATS, baseline, ensure, residents, capacityCans, defaultAllocation, clinicMin, needs, outcome, setAllocation, open, step, stepIfDue, runWeek, decide, walkerCounts, hhSize };
})(typeof window !== 'undefined' ? window : globalThis);
