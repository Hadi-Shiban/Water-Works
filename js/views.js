/* =============================================================================
   WATERWORKS WIREFRAME — VIEWS (string templates)
   -----------------------------------------------------------------------------
   Pure functions: (state, derived, ui) -> HTML. They never mutate state.
   Interactions are declared with data-act="..." and handled centrally in app.js.
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = (root.WW = root.WW || {});
  const D = () => WW.data;
  const S = () => WW.sim;
  const V = (WW.views = {});

  /* ---- helpers ---------------------------------------------------------------- */
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v) => Math.round(v).toLocaleString('en-US');
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const sc = (v) => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const BAND_ICON = ['check', 'dot', 'tri', 'warn', 'octo'];
  const bandChip = (v) => { const b = S().band(v); return `<span class="chip band-${b.i}">${icon(BAND_ICON[b.i])}${b.label}</span>`; };
  const tip = (t) => `data-tip="${esc(t)}"`;
  const info = (t, label) => `<span class="info" ${tip(t)} tabindex="0" role="note" aria-label="${esc(label || t)}" style="display:inline-grid;place-items:center;width:15px;height:15px;border:1.5px solid currentColor;border-radius:50%;font:700 10px var(--font-mono);cursor:help;margin-left:4px;vertical-align:1px">i</span>`;
  const delta = (v, d = 1, unit = '') => {
    const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    if (Math.abs(r) < Math.pow(10, -d)) return `<span class="delta flat">— no change</span>`;
    const up = r > 0;
    return `<span class="delta ${up ? 'up' : 'down'}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${up ? '+' : '−'}${Math.abs(r).toFixed(d)}${unit}<span class="sr-only"> ${up ? 'increase' : 'decrease'}</span></span>`;
  };
  const deltaCost = (v) => `<span class="delta ${v > 0 ? 'down' : 'up'}"><span aria-hidden="true">${v > 0 ? '▲' : '▼'}</span> ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v))}<span class="sr-only"> ${v > 0 ? 'more' : 'less'} energy</span></span>`;
  const deltaLoad = (v) => { // for hazards, down is good
    const r = Math.round(v * 10) / 10;
    if (Math.abs(r) < 0.1) return '<span class="delta flat">—</span>';
    return `<span class="delta ${r < 0 ? 'up' : 'down'}"><span aria-hidden="true">${r < 0 ? '▼' : '▲'}</span> ${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}</span>`;
  };
  const kv = (k, v, t) => `<div class="kv"><dt>${k}${t ? info(t) : ''}</dt><dd>${v}</dd></div>`;
  const bar = (pct, cls) => `<span class="bar ${cls || ''}" role="presentation"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
  const lesson = (t) => `<p class="note lesson">${icon('flask')}<span>${t}</span></p>`;
  const head = (kicker, title, back) => `<header class="ins-head"><p class="kicker">${kicker}</p><h2>${title}</h2>${back ? `<button type="button" class="back" data-act="close-project">← Back to ${esc(back)}</button>` : ''}</header>`;
  const money = (v) => fmt(v);
  const tierChip = (tier) => {
    const t = { full: ['ok', 'check'], reduced: ['warn', 'warn'], rationed: ['risk', 'warn'], cut: ['risk', 'octo'] }[tier];
    return `<span class="chip ${t[0]}">${icon(t[1])}${S().tierLabel[tier]}</span>`;
  };
  const stageName = (id) => (S().stageObj(id) || {}).name || id;

  /* Readings the player can see vs know (stale after a storm until tested). */
  function labView(s, d) {
    const keys = D().loadKeys;
    const live = { src: { ...d.steps[0].load }, plant: { ...d.outlet }, tap: { ...d.tap } };
    const stale = {};
    if (s.sampleStale && s.sampled) {
      keys.filter((k) => k !== 'turbidity').forEach((k) => {
        ['src', 'plant', 'tap'].forEach((c) => { live[c][k] = s.sampled[c][k]; });
        stale[k] = true;
      });
    }
    return { ...live, stale };
  }
  V.labView = labView;

  /* ---- Top bar ---------------------------------------------------------------- */
  V.topbar = function (s, d, ui) {
    const $ = (id) => document.getElementById(id);
    const sc0 = D().scenario;
    $('scenarioName').textContent = `${sc0.name} · ${sc0.chapter}`; $('scenarioName').title = `${sc0.name} · ${sc0.chapter}. Gate: ${sc0.gate}`;
    $('dayNum').textContent = s.day;
    $('streak').textContent = `Gate ${ui.gateDays}/${sc0.gateDaysNeeded}`;
    $('streak').setAttribute('data-tip', `Chapter gate: ${sc0.gate}. ${ui.gateDays} of ${sc0.gateDaysNeeded} days done.`);
    const net = d.net;
    $('statFunding').innerHTML = `${icon('coin')}<div><span class="stat-l">Funding</span><span class="stat-v">${money(s.funding)}</span> <span class="stat-sub">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}/day</span></div>`;
    $('statFunding').setAttribute('data-tip', `Operating cash. Revenue ${fmt(d.revenue)}/day minus running costs ${fmt(d.opex)}/day = ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}/day. Every new facility adds running costs.`);
    const eHigh = d.energyUsed / d.energyCapacity > 0.9;
    $('statEnergy').innerHTML = `${icon('bolt')}<div><span class="stat-l">Energy</span><span class="stat-v">${d.energyUsed}<span class="stat-sub">/${d.energyCapacity}</span></span></div>`;
    $('statEnergy').setAttribute('data-tip', `Daily energy use versus supply${eHigh ? ' — nearly at the limit' : ''}. Treatment stages, pumping and wastewater all draw on it.`);
    const next = 38;
    $('statKnowledge').innerHTML = `${icon('flask')}<div><span class="stat-l">Research</span><span class="stat-v">${s.knowledge}</span></div>`;
    $('statKnowledge').setAttribute('data-tip', s.knowledge < next ? `Research knowledge. ${next} unlocks the reclaimed-water connection. Earn it by testing water and recovering from events well.` : 'Research knowledge. Reclaimed-water connection unlocked.');
    const p = d.reliablePeople, pd = p - (ui.snap ? ui.snap.people : p);
    $('statPeople').innerHTML = `<span class="big num" aria-hidden="true">${fmt(p)}</span><span class="lbl" aria-hidden="true">People with reliable<br>clean-water service<span class="sub">${Math.round((p / s.population) * 100)}% of ${fmt(s.population)} residents${pd ? ' · ' + (pd > 0 ? '▲ +' : '▼ −') + fmt(Math.abs(pd)) : ''}</span></span><span class="sr-only">People with reliable clean-water service: ${fmt(p)} of ${fmt(s.population)} residents</span>`;
    $('statPeople').setAttribute('data-tip', 'The main progression number: people who are connected, get enough water, and get water that meets the quality bar.');
    $('dayFill').style.width = ui.dayProgress * 100 + '%';
    document.querySelectorAll('.tbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.speed === ui.speed)));
  };

  /* ---- Rail ------------------------------------------------------------------- */
  function itemStatus(it, s) {
    const e = it.effects || {};
    if ((s.projects || []).some((p) => p.id === it.id)) return 'building';
    if (it.status === 'built' || (s.done || []).indexOf(it.id) >= 0) return 'built';
    if (it.status === 'locked' && !(it.unlockKnowledge && s.knowledge >= it.unlockKnowledge)) return 'locked';
    return 'available';
  }
  V.itemStatus = itemStatus;
  V.findItem = (id) => { for (const c of D().planningRail) for (const it of c.items) if (it.id === id) return { item: it, cat: c }; return null; };

  V.rail = function (s, d, ui) {
    const col = ui.railCollapsed;
    let html = `<div class="rail-head"><h2>Plan &amp; build</h2><button type="button" class="rail-toggle" data-act="rail-toggle" aria-label="${col ? 'Expand' : 'Collapse'} planning rail" aria-expanded="${!col}">${icon(col ? 'chev-r' : 'chev-l')}</button></div><div class="rail-scroll">`;
    D().planningRail.forEach((c) => {
      const open = ui.railOpen.indexOf(c.id) >= 0 && !col;
      html += `<div class="cat"><button type="button" class="cat-btn" data-act="cat" data-id="${c.id}" aria-expanded="${open}" aria-controls="items-${c.id}" ${col ? `aria-label="${c.name}" data-tip="${c.name}"` : ''}>${icon(c.icon, 'ic-lg')}<span class="cat-name">${c.name}</span><span class="cat-count">${c.items.length}</span>${icon('chev-d', 'chev')}</button>
        <ul class="items" id="items-${c.id}" ${open ? '' : 'hidden'}>`;
      c.items.forEach((it) => {
        const st = itemStatus(it, s);
        const cur = ui.project === it.id ? ' aria-current="true"' : '';
        const days = it.days ? (ui.quickBuild ? '1 d' : it.days + ' d') : 'instant';
        const pill = { built: `<span class="pill built">${icon('check')}Built</span>`, building: `<span class="pill building">${icon('clock')}Building</span>`, locked: `<span class="pill locked">${icon('lock')}Locked</span>`, available: `<span class="pill available">Available</span>` }[st];
        html += `<li><button type="button" class="item ${st}" data-act="item" data-id="${it.id}"${cur}>
          <span class="item-top"><span class="item-name">${it.name}</span>${it.action === 'test' || it.action === 'runoff' || it.action === 'routines' ? '' : pill}</span>
          <span class="item-meta">${it.cost ? `<span>${money(it.cost)} funds</span><span>${days}</span>` : '<span>free</span>'}</span>
          <span class="item-stat">${st === 'locked' ? (icon('lock') + ' ' + (it.unlock || 'Locked') + (it.unlockKnowledge ? ` (${s.knowledge}/${it.unlockKnowledge})` : '')) : it.stat}</span></button></li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
    if ((s.projects || []).length) {
      html += `<div class="queue"><h3>Under construction</h3><ul>${s.projects.map((p) => `<li><span>${p.name}</span><span class="mono">${p.daysLeft} d left</span></li>`).join('')}</ul></div>`;
    }
    return html;
  };

  /* ---- Loop bar, map tools, journey ----------------------------------------- */
  V.loopbar = function (s, d, ui) {
    const L = ui.loop;
    const steps = [
      ['observe', 1, 'Observe', L.observed], ['test', 2, 'Test', L.tested], ['allocate', 3, 'Allocate', L.allocated], ['build', 4, 'Build|Build / maintain', L.built],
    ];
    const cur = steps.find((x) => !x[3]);
    let h = '';
    steps.forEach(([id, n, lbl, done]) => {
      h += `<button type="button" class="loop-step${done ? ' done' : ''}${cur && cur[0] === id ? ' current' : ''}" data-act="loop" data-id="${id}" ${tip({ observe: 'Select things on the map and read the panel.', test: 'Take a water sample. You cannot see microbes.', allocate: 'Share today’s water between sectors.', build: 'Approve a project or fix something.' }[id])}><span class="n">${done ? '✓' : n}</span><span class="lbl-t">${lbl.indexOf('|') > 0 ? `<span class="l-short">${lbl.split('|')[0]}</span><span class="l-long">${lbl.split('|')[1]}</span>` : lbl}</span></button>`;
    });
    h += `<button type="button" class="loop-step run" data-act="run-day" style="background:var(--yellow-500);color:#000;font-weight:800"><span class="n" style="background:#000;color:var(--yellow-500);border-color:#000">5</span><span class="lbl-t always">Run day ▶</span></button>`;
    h += `<button type="button" class="loop-step" data-act="loop" data-id="consequences" ${ui.lastSummary ? '' : 'disabled'} ${tip('Reopen the last end-of-day summary.')}><span class="n">6</span><span class="lbl-t"><span class="l-short">Results</span><span class="l-long">Consequences</span></span></button>`;
    h += `<button type="button" class="loop-step" data-act="loop" data-id="adapt" ${tip('See what needs attention next.')}><span class="n">7</span><span class="lbl-t">Adapt</span></button>`;
    return h;
  };

  V.weather = function (s, d, ui) {
    const ev = s.event.status;
    if (ev === 'idle') return `<div class="weather">${icon('rain')}<span>Rain front forecast</span><button type="button" data-act="trigger-rain">Trigger heavy rain</button></div>`;
    if (ev === 'active') return `<div class="weather is-storm">${icon('rain')}<span>Heavy rain</span><button type="button" data-act="open-event">Choose response</button></div>`;
    if (ev === 'resolved') return `<div class="weather is-storm">${icon('rain')}<span>Heavy rain · response set</span></div>`;
    return `<div class="weather">${icon('check')}<span>Clear</span></div>`;
  };
  V.maptools = function (s, d, ui) {
    const o = ui.overlays;
    const tg = (id, lbl, cls, ic) => `<button type="button" class="chip-toggle ${cls || ''}" data-act="overlay" data-id="${id}" aria-pressed="${o[id]}">${icon(ic)}${lbl}</button>`;
    const sw = (c, dash) => `<svg viewBox="0 0 34 10"><path d="M0 5H34" stroke="${c}" stroke-width="4" ${dash ? `stroke-dasharray="${dash}"` : ''}/></svg>`;
    return `${tg('flow', 'Water flow', 'c-water', 'flow')}${tg('runoff', 'Runoff', '', 'warn')}${tg('waste', 'Sewer &amp; reuse', '', 'recycle')}${tg('labels', 'Labels', '', 'list')}
      <details class="legend" ${ui.legendOpen ? 'open' : ''}><summary class="chip-toggle" aria-label="Map legend">${icon('map')}Legend</summary><ul class="legend-body">
        <li>${sw('#1a6aa0')}Drinking-water pipe</li><li>${sw('#7a6247', '10 5')}Wastewater sewer</li><li>${sw('#6b4c86', '3 5')}Reclaimed water (non-potable)</li><li>${sw('#8f5b1f', '2 6')}Polluted runoff</li>
        <li>${icon('warn')}Warning: always with a text label</li><li>${icon('check')}Healthy or resolved</li><li><b class="mono" style="width:34px;text-align:center">S P T</b>Sample points</li></ul></details>`;
  };

  V.journey = function (s, d, ui) {
    const J = [[1, 'Watershed', 'watershed'], [2, 'Source', 'reservoir'], [3, 'Treatment', 'plant'], [4, 'Storage', 'storage'], [5, 'Pipes', 'pipeD2'], [6, 'Buildings', 'school'], [7, 'Sewer', 'wwtp'], [8, 'Reuse', 'wwtp']];
    return `<span class="lead" data-tip="Follow the water, watershed to reuse. Click a step to inspect it.">${icon('drop')}<span class="sr-only">Follow the water:</span></span>` + J.map(([n, l, id], i) => `<button type="button" class="jstep${ui.selected === id && i !== 7 ? ' on' : ''}" data-act="select" data-id="${id}"><span class="n">${n}</span>${l}</button>`).join('');
  };

  /* ---- Inspector: dispatch ---------------------------------------------------- */
  V.inspector = function (s, d, ui) {
    if (ui.project) { const f = V.findItem(ui.project); if (f) return projectPanel(s, d, ui, f); }
    const id = ui.selected;
    if (BUILDING(id)) return buildingPanel(s, d, ui, BUILDING(id));
    switch (id) {
      case 'reservoir': return sourcePanel(s, d, ui);
      case 'plant': return plantPanel(s, d, ui);
      case 'storage': return storagePanel(s, d, ui);
      case 'pipeD1': case 'pipeD2': case 'pipeD3': return pipePanel(s, d, ui, id);
      case 'intake': return intakePanel(s, d, ui);
      case 'wwtp': return wwtpPanel(s, d, ui);
      case 'watershed': return watershedPanel(s, d, ui);
      default: return head('Community map', 'Select an object') + '<div class="sec"><p class="note">Choose anything on the map to inspect it.</p></div>';
    }
  };
  const BUILDING = (id) => D().communityBuildings.find((b) => b.id === id);

  /* glass illustration: clarity = what the eye sees */
  function glass(turb) {
    const t = Math.min(1, turb / 100);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const col = `rgb(${mix(232, 168)},${mix(243, 132)},${mix(249, 84)})`;
    return `<svg viewBox="0 0 34 44" aria-hidden="true"><path d="M5 4h24l-3 36a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#fff" stroke="#1b1f23" stroke-width="1.5"/><path d="M6.200 12h21.600l-2.300 28a1 1 0 0 1-1 1H9.500a1 1 0 0 1-1-1z" fill="${col}"/></svg>`;
  }

  /* ---- Source panel ----------------------------------------------------------- */
  function readingRow(k, v, isStale, hintText) {
    const vis = D().visible[k];
    const label = D().loadLabels[k];
    return `<div class="reading"><span class="vis" ${tip(vis ? 'You can see this with your eyes.' : 'Invisible: only a lab test reveals it.')}>${icon(vis ? 'eye' : 'flask')}</span>
      <span class="nm">${label}</span><span class="val">${sc(v)}</span>${bandChip(v)}
      ${isStale ? `<span class="stale">Last sampled Day ${3} — test to update</span>` : ''}${hintText ? `<span class="hint">${hintText}</span>` : ''}</div>`;
  }

  function sourcePanel(s, d, ui) {
    const lv = labView(s, d);
    const src = lv.src;
    const vol = d.reservoirVolume, cap = s.reservoirVolume ? 2000 : 2000;
    const ph = ui.ph;
    const inBand = ph >= 6.5 && ph <= 8.5;
    const pen = inBand ? 0 : Math.min(25, Math.abs(ph - 7.5) * 8);
    const looks = src.turbidity >= 60 ? 'Cloudy, brownish' : src.turbidity >= 30 ? 'Slightly cloudy' : 'Looks clear';
    return `<div class="ins">${head('Water source · Surface water', 'River &amp; reservoir')}
      <div class="sec"><div class="sec-t">Available volume</div>
        <div class="big-n num">${fmt(vol)}<small>of ${fmt(cap)} units</small></div>${bar((vol / cap) * 100, 'water')}
        <dl style="margin-top:8px">${kv('Safe intake limit', `${D().waterState.reservoir.safeIntakeLimit} units/day`, 'Taking more than this would draw the source down faster than it recharges.')}${kv('Intake now', `${s.intake} units/day`)}
        ${d.storm ? kv('Heavy rain', `<span class="chip risk">${icon('rain')}+18% volume</span>`) : ''}</dl></div>
      <div class="sec"><div class="sec-t">What you see vs what the lab finds${info(D().lessons.clearWater)}</div>
        <div class="glass-row"><div class="glass">${glass(src.turbidity)}<div class="t">Your eyes</div><div class="v">${looks}</div></div>
          <div class="glass lab">${icon('flask', 'ic-lg')}<div class="t">The lab</div><div class="v">Microbial risk ${sc(src.microbial)} · ${S().band(src.microbial).label}</div></div></div>
        ${lesson('Only turbidity is visible. Microbes, nutrients and chemicals need a test.')}</div>
      <div class="sec"><div class="sec-t"><span>Readings · game scale 0–100</span></div>
        ${D().loadKeys.map((k) => readingRow(k, src[k], lv.stale[k])).join('')}
        <div class="reading"><span class="vis">${icon('flask')}</span><span class="nm">Dissolved minerals${info(D().lessons.minerals)}</span><span class="val">${D().waterState.mineralPenalty}</span><span class="chip neutral">${icon('dot')}Not a hazard</span></div>
        <div class="reading"><span class="vis">${icon('flask')}</span><span class="nm">pH${info(D().lessons.pH)}</span><span class="val">${D().waterState.sourceLoads.ph}</span><span class="chip ok">${icon('check')}Stable band</span></div></div>
      <div class="sec"><div class="sec-t">Try it: pH is not a cleanliness score</div>
        <label class="note" for="phTry">Move pH and watch what it does — and doesn’t — change.</label>
        <input id="phTry" type="range" min="5.5" max="9.5" step="0.1" value="${ph}" data-act="ph" aria-describedby="phOut">
        <div id="phOut" class="note" style="margin-top:4px"><b class="mono">pH ${ph.toFixed(1)}</b> · ${inBand ? 'inside the stable band (6.5–8.5)' : 'outside the band: pipes corrode, treatment works less well'} · quality penalty <b class="mono">${pen.toFixed(1)}</b> · microbial risk <b class="mono">${sc(src.microbial)}</b> (unchanged)</div></div>
      <div class="sec"><div class="sec-t">Likely contaminant sources</div>
        <ul class="note" style="display:grid;gap:6px">
          <li>${icon('warn')} <b>Farm runoff</b> — nutrients and microbes${d.storm ? ' <span class="chip risk">rising with rain</span>' : ''}</li>
          <li>${icon('rain')} <b>Rain events</b> — soil washes in, turbidity spikes</li>
          <li>${icon('check')} <b>Outfall</b> is downstream of the intake, so it does not feed back into this reading</li>
          <li>${icon('leaf')} <b>Forest and wetland</b> — hold soil and slow runoff</li></ul>
        <button type="button" class="btn block" data-act="trace-runoff" style="margin-top:8px">${icon('target')} Show runoff route on map</button></div>
      <div class="sec"><div class="actions">
        <button type="button" class="btn primary block" data-act="test">${icon('flask')} Test water <small>400 funds</small></button>
        <p class="note">${s.tested ? 'Sampled today. Results are up to date.' : s.sampleStale ? 'Some readings are out of date since the rain.' : 'Last sampled Day 3.'} Testing earns research knowledge.</p></div></div></div>`;
  }

  /* ---- Plant panel ------------------------------------------------------------ */
  function plantPanel(s, d, ui) {
    const lv = labView(s, d);
    const w = ui.bypass.length ? S().compute(Object.assign(S().clone(s), { bypass: ui.bypass })) : d;
    const steps = w.steps;
    const sel = ui.stageSel && steps.some((x) => x.id === ui.stageSel) ? ui.stageSel : 'media';
    const idx = steps.findIndex((x) => x.id === sel);
    const inn = steps[idx - 1].load, out = steps[idx].load;
    const st = S().stageObj(sel);
    const ld = d.loadRatio;
    const maxScale = Math.max(s.intake * d.stormLoad, s.plant.rated, d.effCap) * 1.12;
    const pos = (v) => Math.min(100, (v / maxScale) * 100);
    const keys = D().loadKeys;
    const stageBtns = s.stages.map((id, i) => {
      const off = ui.bypass.indexOf(id) >= 0;
      const so = S().stageObj(id);
      return `${i ? `<span class="tstage-gap" aria-hidden="true">›</span>` : ''}<button type="button" class="tstage built${d.strain ? ' strain' : ''}${off ? ' off' : ''}" data-act="stage" data-id="${id}" aria-pressed="${sel === id}" aria-label="${so.name}${off ? ' (bypassed in preview)' : ''}, ${d.strain ? 'strained' : 'running'}"><span class="tl">${so.short}</span>${({ screening: 'Screen', coagulation: 'Coag.', media: 'Media', carbon: 'Carbon', disinfection: 'Disinf.' })[id] || so.name}<span class="st">${off ? 'bypassed' : d.strain ? 'strained' : 'ok'}</span></button>`;
    });
    const building = (s.projects || []).find((p) => p.id === 'carbon');
    const carbonBtn = s.stages.indexOf('carbon') >= 0 ? '' : `<span class="tstage-gap" aria-hidden="true">›</span><button type="button" class="tstage ${building ? 'planned' : 'slot'}" data-act="item" data-id="carbon" aria-label="Add activated carbon stage"><span class="tl">+</span>Add<span class="st">${building ? building.daysLeft + ' d left' : 'optional'}</span></button>`;
    const trainHtml = s.stages.indexOf('carbon') >= 0 ? stageBtns.join('') : stageBtns.slice(0, 3).join('') + carbonBtn + stageBtns.slice(3).join('');
    const tapMicro = w.tap.microbial, looksClear = out.turbidity <= 20;
    let callout = '';
    if (sel === 'media' && looksClear && out.microbial >= 20) callout = `<p class="note alert">${icon('warn')}<span><b>Looks clear, still risky.</b> After filtration turbidity is ${sc(out.turbidity)}, but microbial risk is ${sc(out.microbial)} (${S().band(out.microbial).label}). ${D().lessons.filterVsDisinfect}</span></p>`;
    else if (sel === 'disinfection' && steps[idx].compat) callout = `<p class="note alert">${icon('warn')}<span><b>Cloudy water weakens disinfection.</b> Turbidity entering this stage is above 40, so microbial removal is penalised.</span></p>`;
    else callout = lesson(st.role);
    const bypassNote = ui.bypass.length ? `<p class="note water">${icon('flask')}<span><b>What-if preview.</b> Bypassing ${ui.bypass.map(stageName).join(' + ')}: tap microbial risk would be <b class="mono">${sc(tapMicro)}</b> (${S().band(tapMicro).label}); Quality <b class="mono">${sc(w.quality)}</b>. Scores on the dashboard are unchanged. <button type="button" class="back" data-act="reset-bypass">Reset</button></span></p>` : '';
    return `<div class="ins">${head('Treatment · Drinking water', 'Treatment plant')}
      <div class="sec"><div class="sec-t"><span>Treatment train</span>${info('Stages multiply: two 50% stages leave 25%, not 0%. Click a stage to see what goes in and out.')}</div>
        <div class="train" role="group" aria-label="Treatment train, in order">${trainHtml}</div>
        <div class="row-2" style="align-items:center;margin-bottom:6px"><b style="font-size:var(--fs-sm)">${st.name}</b>
          <label class="chk" style="justify-content:flex-end"><input type="checkbox" data-act="bypass" data-id="${sel}" ${ui.bypass.indexOf(sel) >= 0 ? 'checked' : ''}> Bypass (what-if)</label></div>
        <table class="tbl"><thead><tr><th>Measure</th><th class="r">In</th><th class="r">Out</th><th class="r">Change</th></tr></thead><tbody>
          ${keys.map((k) => `<tr><td>${D().loadLabels[k]}</td><td class="r m">${sc(inn[k])}</td><td class="r m">${sc(out[k])}</td><td class="r">${deltaLoad(out[k] - inn[k])}</td></tr>`).join('')}
        </tbody></table>
        <div style="margin-top:8px">${callout}${bypassNote}</div></div>
      <div class="sec"><div class="sec-t">Incoming vs outgoing · whole plant</div>
        <table class="tbl"><thead><tr><th>Measure</th><th class="r">Source</th><th class="r">Plant outlet</th><th class="r">Removed</th></tr></thead><tbody>
          ${keys.map((k) => `<tr><td>${D().loadLabels[k]}</td><td class="r m">${sc(lv.src[k])}</td><td class="r m">${sc(lv.plant[k])}</td><td class="r"><span class="mono">${lv.src[k] ? Math.round((1 - lv.plant[k] / lv.src[k]) * 100) : 0}%</span></td></tr>`).join('')}
          <tr><td>pH</td><td class="r m">${lv.src.ph}</td><td class="r m">${lv.plant.ph}</td><td class="r"><span class="chip neutral">not cleanliness</span></td></tr></tbody></table></div>
      <div class="sec"><div class="sec-t">Capacity &amp; load${info(D().lessons.overload)}</div>
        <div class="capbar" role="img" aria-label="Load ${Math.round(ld * 100)} percent of effective capacity. Rated ${s.plant.rated}, effective ${n1(d.effCap)}, requested intake ${s.intake}.">
          <div class="fill${d.strain ? ' over' : ''}" style="width:${pos(s.intake * d.stormLoad)}%"></div>
          <div class="tick" style="left:${pos(d.effCap)}%"><span>effective ${n1(d.effCap)}</span></div>
          <div class="tick b" style="left:${pos(s.plant.rated)}%"><span>rated ${s.plant.rated}</span></div></div>
        <dl>${kv('Requested intake', `${s.intake} units/day`)}${kv('Current load', `<span class="chip ${d.strain ? 'risk' : 'ok'}">${icon(d.strain ? 'warn' : 'check')}${Math.round(ld * 100)}% of effective</span>`)}
          ${d.strain ? kv('Removal performance', `−${Math.round((1 - d.ovl) * 100)}% from overload`, 'Above 100% load, every stage removes less (down to a floor of 55%).') : ''}</dl>
        <label class="note" for="intakeRange" style="display:block;margin-top:6px">Requested intake</label>
        <input id="intakeRange" type="range" min="90" max="190" step="5" value="${s.intake}" data-act="intake"><output class="note mono" id="intakeOut">${s.intake} units/day</output></div>
      <div class="sec"><div class="sec-t">Condition, power &amp; staffing</div>
        <div class="bar-row"><span>Condition</span><b class="mono">${Math.round(s.plant.condition * 100)}%</b>${bar(s.plant.condition * 100, s.plant.condition < 0.75 ? 'warn' : 'water')}</div>
        <dl style="margin-top:6px">${kv('Condition factor', d.cf.toFixed(4), 'condition factor = 0.55 + 0.45 × condition. Poor condition lowers capacity and removal.')}${kv('Power availability', `${Math.round(s.plant.power * 100)}%`)}${kv('Staffing', `${Math.round(d.staffing * 100)}%${d.shift ? ' <span class="chip ok">extra shift</span>' : ''}`)}
          ${kv('Energy · running cost', `${s.stages.reduce((t, i) => t + S().stageObj(i).energy, 0)} /day · ${money(s.stages.reduce((t, i) => t + S().stageObj(i).opex, 0))}`, D().lessons.obligation)}</dl></div>
      <div class="sec"><div class="actions">
        <button type="button" class="btn block" data-act="maintain" ${s.plant.condition >= 0.99 ? 'disabled' : ''}>${icon('wrench')} Preventive maintenance <small>2,400 funds · condition +8</small></button>
        <button type="button" class="btn block" data-act="item" data-id="carbon">${icon('plus')} Add or preview a treatment stage…</button></div>
        <p class="note" style="margin-top:6px">Maintenance now costs less than an emergency repair later.</p></div></div>`;
  }

  /* ---- Storage / pipes / intake ---------------------------------------------- */
  function storagePanel(s, d, ui) {
    const pct = d.storagePct;
    const stState = { healthy: ['ok', 'check', 'Healthy'], watch: ['warn', 'warn', 'Watch'], low: ['risk', 'warn', 'Low'] }[d.storageState];
    const r = 30, C = 2 * Math.PI * r;
    const draw = d.closingStorage - s.storage;
    return `<div class="ins">${head('Storage · Treated water', 'Treated-water storage')}
      <div class="sec"><div class="tank-meter"><svg viewBox="0 0 70 70" role="img" aria-label="Tank ${Math.round(pct * 100)} percent full"><circle cx="35" cy="35" r="${r}" fill="none" stroke="var(--paper-300)" stroke-width="8"/><circle cx="35" cy="35" r="${r}" fill="none" stroke="var(--water-600)" stroke-width="8" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 35 35)"/></svg>
        <div><div class="big-n num">${fmt(s.storage)}<small>of ${fmt(s.storageCapacity)} units</small></div><span class="chip ${stState[0]}">${icon(stState[1])}${stState[2]} · ${Math.round(pct * 100)}%</span></div></div></div>
      <div class="sec"><dl>${kv('Reserve at full release', `${d.reserveDays.toFixed(1)} days`, 'How long the tank alone could supply the network with no new production.')}
        ${kv('Net change today', `<span class="${draw < 0 ? 'delta down' : 'delta up'}">${draw < 0 ? '▼ −' : '▲ +'}${n1(Math.abs(draw))} units</span>`, 'Treated water in minus water released to the network.')}
        ${kv('Condition', '88%')}${kv('Low-storage penalty', d.lowStorage ? '<span class="chip risk">' + icon('warn') + 'Active: +4 microbial at tap</span>' : 'Below 25% adds tap risk', 'Low pressure and low storage can raise microbial risk after treatment.')}</dl></div>
      <div class="sec">${lesson(D().lessons.leakSupply.replace('Fixing leaks creates usable supply without taking more from the river.', 'Storage buys time in a storm or a power cut, but only if you keep it filled. Falling reserve lowers Reliability and Resilience.'))}</div>
      <div class="sec"><div class="actions"><button type="button" class="btn block" data-act="item" data-id="tank">${icon('plus')} Expand storage <small>+100 units</small></button></div></div></div>`;
  }

  const PIPES = {
    pipeD1: { name: 'District 1 main', serves: 'Riverside Homes · Light industry', cap: 60, cond: 82 },
    pipeD2: { name: 'District 2 main', serves: 'School · Clinic · Market · Market Row Flats', cap: 70, cond: 61 },
    pipeD3: { name: 'District 3 main', serves: 'Farm branch · ends before Terrace Homes', cap: 50, cond: 78 },
  };
  function pipePanel(s, d, ui, id) {
    const p = PIPES[id];
    const isD2 = id === 'pipeD2';
    const cond = isD2 ? (d.leak ? p.cond : 88) : p.cond;
    let extra = '';
    if (isD2 && d.leak) extra = `<p class="note alert">${icon('warn')}<span><b>Leak reported.</b> About ${n1(d.leakUnits)} units/day are escaping before they reach a tap. Repairing it recovers supply without taking more from the river.</span></p>`;
    if (isD2 && !d.leak && ui.lastRepair) extra = `<p class="note good">${icon('check')}<span><b>Leak repaired.</b> Delivered water rose from <b class="mono">${n1(ui.lastRepair.from)}</b> to <b class="mono">${n1(ui.lastRepair.to)}</b> units/day (<b class="mono">+${n1(ui.lastRepair.to - ui.lastRepair.from)}</b>) with intake unchanged at ${s.intake}.</span></p>`;
    if (id === 'pipeD3') extra = `<p class="note alert">${icon('warn')}<span><b>The pipe ends before Terrace Homes.</b> ${s.terraceConnected} of 350 residents are connected. More intake will not fix this; a pipe extension will.</span></p>`;
    if (id === 'pipeD1') extra = `<p class="note good">${icon('check')}<span>No leaks reported on this main.</span></p>`;
    return `<div class="ins">${head('Distribution · Pipe asset', p.name)}
      <div class="sec"><p class="note">Serves: ${p.serves}</p></div>
      <div class="sec"><dl>${kv('Capacity', `${p.cap} units/day`)}
        ${kv('Condition', `${cond}%`)}${bar(cond, cond < 70 ? 'warn' : 'water')}
        ${kv('Loss at this main', isD2 ? `${d.leak ? n1(d.leakUnits) : '0.0'} units/day` : 'small', 'Loss rate = base + age + damage − leak program. The system total is shown on the dashboard.')}
        ${kv('System loss (all mains)', `${(d.lossRate * 100).toFixed(1)}% · ${n1(d.lossUnits)} units/day`)}</dl></div>
      <div class="sec">${extra}${isD2 ? lesson(D().lessons.leakSupply) : ''}</div>
      <div class="sec"><div class="actions">
        ${isD2 ? `<button type="button" class="btn primary block" data-act="repair" ${d.leak ? '' : 'disabled'}>${icon('wrench')} Repair leak <small>3,200 funds · instant</small></button><button type="button" class="btn block" data-act="item" data-id="leakDetect">${icon('search')} Leak detection program…</button>` : ''}
        ${id === 'pipeD3' ? `<button type="button" class="btn primary block" data-act="item" data-id="pipeExt">${icon('plus')} Extend pipe to Terrace…</button>` : ''}
        ${id === 'pipeD1' ? `<button type="button" class="btn block" data-act="item" data-id="leakDetect">${icon('search')} Leak detection program…</button>` : ''}</div></div></div>`;
  }
  function intakePanel(s, d) {
    return `<div class="ins">${head('Source · Infrastructure', 'River intake pump')}
      <div class="sec"><dl>${kv('Pump condition', '78%')}${kv('Safe intake limit', '200 units/day')}${kv('Requested intake', `${s.intake} units/day`)}${kv('Treated', `${n1(d.throughput)} units/day`, 'The plant can only process its effective capacity, whatever the intake asks for.')}
        ${kv('Reaches taps after loss', `${n1(d.delivered)} units/day`)}</dl></div>
      <div class="sec">${lesson('Intake is not delivered water. Treatment limits and pipe loss sit between the river and the tap.')}</div>
      <div class="sec"><button type="button" class="btn block" data-act="select" data-id="plant">Adjust intake at the plant →</button></div></div>`;
  }

  /* ---- Building panel --------------------------------------------------------- */
  function buildingPanel(s, d, ui, b) {
    const sec = d.sectors[b.sector];
    const share = b.demand / (b.sector === 'homes' ? sec.demand : b.demand);
    const alloc = sec.got * (b.sector === 'homes' ? b.demand / sec.demand : 1);
    const ww = alloc * b.returnFlow;
    const R = D().residents[b.resident], rt = d.routines[b.resident];
    const isTerrace = b.id === 'terraceD3';
    const clinicWarn = b.id === 'clinic' && d.clinicBelowMin;
    const people = isTerrace ? `${s.terraceConnected} of ${b.people} connected` : fmt(b.people);
    return `<div class="ins">${head(`${b.district} · ${b.kind}`, b.name)}
      <div class="sec"><div class="sec-t">Current service</div>
        <div style="display:flex;align-items:center;gap:12px"><div class="big-n num">${Math.round(sec.ratio * 100)}%<small>of demand met</small></div>${tierChip(sec.tier)}</div>${bar(sec.ratio * 100, { full: 'ok', reduced: 'warn', rationed: 'risk', cut: 'risk' }[sec.tier])}
        ${clinicWarn ? `<p class="note alert" style="margin-top:8px">${icon('octo')}<span><b>Critical-service minimum not met.</b> The clinic needs at least ${n1(D().allocationSectors[0].min)} units. Infection control and treatment capacity decline.</span></p>` : ''}
        ${isTerrace ? `<p class="note alert" style="margin-top:8px">${icon('warn')}<span><b>Inadequate service.</b> The main ends before this district. ${350 - s.terraceConnected} residents rely on the shared standpipe.</span></p>${bar((s.terraceConnected / 350) * 100, 'risk')}` : ''}</div>
      <div class="sec"><dl>${kv('People served', people)}${kv('Daily demand', `${b.demand} units`)}${kv('Allocated today', `${n1(alloc)} units`, 'Set on the Daily allocation panel.')}
        ${kv('Reliability priority', `${b.priority} of 5`, 'Priority 5 is highest. You can override it after a visible warning.')}${kv('Wastewater returned', `${n1(ww)} units/day`, D().lessons.wastewater)}
        ${b.id === 'farm' && d.reclaimed ? kv('Reclaimed water', `<span class="chip ok" style="color:var(--reuse-600)">${icon('recycle')}${n1(d.reclaimed)} units · irrigation only</span>`) : ''}</dl></div>
      <div class="sec"><div class="sec-t">Human consequence</div>
        <div class="person"><span class="avatar" aria-hidden="true">${R.name[0]}</span><div><div class="nm">${R.name} <span class="rl">· ${R.role}</span></div>
          <p>${rt.text}</p><p class="hrs">${rt.hours > 0 ? `Time lost today: ${rt.hours.toFixed(1)} h` : 'No time lost to water today'}</p></div></div>
        <p class="note" style="margin-top:8px"><b>If service drops:</b> ${b.shortage}.</p></div>
      <div class="sec"><div class="actions">
        <button type="button" class="btn ${clinicWarn ? 'primary' : ''} block" data-act="open-alloc">${icon('flow')} Adjust daily allocation</button>
        ${b.id === 'farm' ? `<button type="button" class="btn block" data-act="item" data-id="irrigation">${icon('leaf')} Efficient irrigation…</button>` : ''}
        ${isTerrace ? `<button type="button" class="btn block" data-act="item" data-id="pipeExt">${icon('plus')} Extend pipe to Terrace…</button>` : ''}</div></div></div>`;
  }

  /* ---- Wastewater & watershed ------------------------------------------------ */
  function wwtpPanel(s, d, ui) {
    const load = d.wwLoadPct;
    const it = V.findItem('reuse').item; const st = itemStatus(it, s);
    return `<div class="ins">${head('Wastewater · Biological treatment', 'Wastewater plant')}
      <div class="sec"><div class="sec-t">Load</div><div class="big-n num">${n1(d.wwGenerated)}<small>of ${d.wwEffCap} units/day</small></div>${bar(load * 100, load > 1 ? 'risk' : 'yellow')}
        <dl style="margin-top:8px">${kv('Wastewater collected', `${n1(d.wwGenerated)} units/day`, D().lessons.wastewater)}${kv('Treated', `${n1(d.wwTreated)} units/day`)}
          ${kv('Compliance', `<span class="chip ${d.compliance >= 75 ? 'ok' : 'risk'}">${icon(d.compliance >= 75 ? 'check' : 'warn')}${Math.round(d.compliance)} · target ≥ 75</span>`)}
          ${kv('Discharged to river', `${n1(d.discharged)} units/day`, 'Outfall is downstream of the intake.')}
          ${kv('Reclaimed to farm', d.reclaimed ? `<span style="color:var(--reuse-600);font-weight:700">${n1(d.reclaimed)} units/day</span>` : 'Not connected')}
          ${kv('Energy · running cost', '18 /day · 1,300')}</dl></div>
      <div class="sec">${lesson(D().lessons.wastewater + ' The outfall is downstream of the intake for a reason.')}</div>
      <div class="sec"><div class="actions"><button type="button" class="btn block" data-act="item" data-id="reuse">${icon(st === 'locked' ? 'lock' : 'recycle')} Reclaimed-water connection…</button></div>
        <p class="note" style="margin-top:6px">Reclaimed water serves eligible non-potable uses only. It never enters the drinking-water network.</p></div></div>`;
  }
  function watershedPanel(s, d, ui) {
    const wet = S().previewItem(s, V.findItem('wetland').item), car = S().previewItem(s, V.findItem('carbon').item);
    const cmp = (r, it) => `<tr><td>${it.name}</td><td class="r m">${money(it.cost)}</td><td class="r m">${it.opex ? '+' + it.opex : (it.effects.stage ? '+880' : '+0')}/d</td><td class="r m">${deltaLoad(r.after.tap.nutrients - r.before.tap.nutrients)}</td><td class="r m">${deltaLoad(r.after.tap.organic - r.before.tap.organic)}</td></tr>`;
    return `<div class="ins">${head('Source protection · Watershed', 'Upper watershed')}
      <div class="sec"><dl>${kv('Forest cover', '64%')}${kv('Runoff risk', d.storm ? `<span class="chip risk">${icon('warn')}High · rain</span>` : `<span class="chip warn">${icon('warn')}Moderate</span>`, 'Farm land upstream adds nutrients and microbes when it rains.')}
        ${kv('Protection in place', Object.values(s.protect).some((v) => v) ? 'Buffers reduce source load' : 'None built yet')}</dl></div>
      <div class="sec"><div class="sec-t">Prevent or treat?${info(D().lessons.prevention)}</div>
        <table class="tbl"><thead><tr><th>Option</th><th class="r">Cost</th><th class="r">Runs</th><th class="r">Nutr.</th><th class="r">Org.</th></tr></thead><tbody>${cmp(wet, V.findItem('wetland').item)}${cmp(car, V.findItem('carbon').item)}</tbody></table>
        <p class="note" style="margin-top:6px">Change in tap readings. Prevention costs less and protects every downstream use.</p></div>
      <div class="sec"><div class="actions"><button type="button" class="btn primary block" data-act="item" data-id="wetland">${icon('shield')} Wetland buffer…</button>
        <button type="button" class="btn block" data-act="item" data-id="forest">${icon('leaf')} Forest buffer strip…</button></div></div></div>`;
  }

  /* ---- Project panel (rail item) ---------------------------------------------- */
  function projectPanel(s, d, ui, f) {
    const it = f.item, cat = f.cat, st = itemStatus(it, s);
    const backName = (BUILDING(ui.selected) || {}).name || ({ reservoir: 'River & reservoir', plant: 'Treatment plant', storage: 'Storage', watershed: 'Watershed', wwtp: 'Wastewater plant', pipeD1: 'Pipe D1', pipeD2: 'Pipe D2', pipeD3: 'Pipe D3', intake: 'Intake' }[ui.selected] || 'map');
    let diff = '', ob = '';
    if (st === 'available' || st === 'locked') {
      const pv = S().previewItem(s, it);
      const A = pv.after, B = pv.before;
      const rows = [
        ['Water Security', B.ws, A.ws, 1], ['Quality', B.scores.quality, A.scores.quality, 1], ['Availability', B.scores.availability, A.scores.availability, 1],
        ['Access', B.scores.access, A.scores.access, 1], ['Reliability', B.scores.reliability, A.scores.reliability, 1], ['Resilience', B.scores.resilience, A.scores.resilience, 1],
        ['Reliable people', B.reliablePeople, A.reliablePeople, 0], ['Daily net funds', B.net, A.net, 0], ['Energy use', B.energyUsed, A.energyUsed, 0],
      ].filter((r) => Math.abs(r[2] - r[1]) >= (r[3] ? 0.05 : 0.5));
      const labs = D().loadKeys.filter((k) => Math.abs(A.tap[k] - B.tap[k]) >= 0.5);
      diff = `<div class="sec"><div class="sec-t">What changes (estimate)</div>${rows.length || labs.length ? `<div class="diff">${rows.map((r) => `<span>${r[0]}</span><span class="a">${r[3] ? sc(r[1]) : fmt(r[1])}</span><span class="b">${r[3] ? sc(r[2]) : fmt(r[2])}</span>${r[0] === 'Energy use' ? deltaCost(r[2] - r[1]) : delta(r[2] - r[1], r[3])}`).join('')}
        ${labs.map((k) => `<span>Tap ${D().loadLabels[k].toLowerCase()}</span><span class="a">${sc(B.tap[k])}</span><span class="b">${sc(A.tap[k])}</span>${deltaLoad(A.tap[k] - B.tap[k])}`).join('')}</div>` : '<p class="note">No score change today. This project helps over time or under stress.</p>'}
        <p class="note" style="margin-top:6px">Preview only. The real engine would also apply weather and events.</p></div>`;
      const obl = it.obligations || [];
      if (obl.length) ob = `<div class="sec"><div class="sec-t">What you take on${info(D().lessons.obligation)}</div><ul class="note" style="display:grid;gap:4px">${obl.map((o) => `<li>${icon('wrench')} ${o}</li>`).join('')}</ul></div>`;
    }
    const days = it.days ? (ui.quickBuild ? `1 day <span class="note">(quick build; normally ${it.days})</span>` : `${it.days} days`) : 'Instant';
    const needE = it.effects && it.effects.stage ? S().stageObj(it.effects.stage).energy : (it.effects && it.effects.energy) || 0;
    const energyShort = d.energyUsed + needE > d.energyCapacity;
    const broke = s.funding < it.cost;
    const chip = { built: `<span class="chip ok">${icon('check')}Built</span>`, building: `<span class="chip water">${icon('clock')}Under construction</span>`, locked: `<span class="chip neutral">${icon('lock')}Locked</span>`, available: `<span class="chip ok">Unlocked</span>` }[st];
    let cta;
    if (st === 'built') cta = `<p class="note good">${icon('check')}<span>Already in place. Its running costs are included in the daily funds.</span></p>`;
    else if (st === 'building') cta = `<p class="note water">${icon('clock')}<span>Under construction. It will start working after the next Run Day.</span></p>`;
    else {
      const why = st === 'locked' ? (it.unlockKnowledge ? `Needs ${it.unlockKnowledge} research (you have ${s.knowledge}).` : it.unlock || 'Locked in this chapter.') : broke ? 'Not enough funds.' : energyShort ? `Needs ${d.energyUsed + needE - d.energyCapacity} more energy than available.` : '';
      cta = `<div class="actions">${it.ghost ? `<button type="button" class="btn block" data-act="preview" data-id="${it.ghost}" aria-pressed="${ui.preview === it.ghost}">${icon('map')} ${ui.preview === it.ghost ? 'Hide' : 'Preview on'} map</button>` : ''}
        <button type="button" class="btn primary block" data-act="approve" data-id="${it.id}" ${why ? 'disabled aria-disabled="true"' : ''}>${it.action === 'repair' ? 'Repair now' : 'Approve'} <small>${money(it.cost)} funds</small></button>${why ? `<p class="note alert">${icon('lock')}<span>${why}</span></p>` : ''}</div>`;
    }
    return `<div class="ins">${head(`${cat.name} · ${st === 'locked' ? 'Locked' : 'Project'}`, it.name, backName)}
      <div class="sec">${chip}<dl style="margin-top:8px">${kv('Cost', `${money(it.cost)} funds`)}${kv('Build time', days)}${it.effects && it.effects.stage ? kv('Capacity', `${S().stageObj(it.effects.stage).capacity} units/day`) : ''}${kv('Effect', it.stat)}</dl></div>
      ${diff}${ob}${it.lesson ? `<div class="sec">${lesson(it.lesson)}</div>` : ''}<div class="sec">${cta}</div></div>`;
  }

  /* ---- Dashboard -------------------------------------------------------------- */
  V.dashboard = function (s, d, ui) {
    const snap = ui.snap || { scores: d.scores, ws: d.ws };
    const wsd = d.ws - snap.ws;
    const g = d.activeGates;
    const why = {
      quality: `Tap microbial ${sc(d.tap.microbial)} · turbidity ${sc(d.tap.turbidity)}`,
      availability: `${n1(d.delivered + d.reclaimed)} of ${d.grossDemand} units delivered`,
      reliability: `Reserve ${d.reserveDays.toFixed(1)} d · plant ${Math.round(s.plant.condition * 100)}%`,
      access: `${fmt(s.connectedPeople)} of ${fmt(s.population)} connected`,
      resilience: 'Reserve, upkeep, alternatives',
    };
    const tiles = D().outcomeWeights.map((w) => `<button type="button" class="score" data-act="security" aria-label="${w.name} ${sc(d.scores[w.key])}, weighted ${w.weight * 100} percent of Water Security. Open explanation."><span class="nm"><span>${w.name}</span><span class="wt">${w.weight * 100}%</span></span><span class="v num">${sc(d.scores[w.key])}</span>${bar(d.scores[w.key], d.scores[w.key] < 50 ? 'risk' : d.scores[w.key] < 70 ? 'warn' : 'ok')}<span class="d">${delta(d.scores[w.key] - snap.scores[w.key])}</span><span class="why">${why[w.key]}</span></button>`).join('');
    const lv = labView(s, d);
    const rows = [...D().loadKeys, 'ph'];
    const hl = ui.sampleFocus;
    const cell = (col, k, cls) => {
      const v = lv[col][k];
      const focus = hl && ({ S: 'src', P: 'plant', T: 'tap' }[hl] === col) ? ' hl' : '';
      if (k === 'ph') return `<td class="${cls}${focus}">${icon(v >= 6.5 && v <= 8.5 ? 'check' : 'warn')} ${v}</td>`;
      const b = S().band(v).i;
      return `<td class="${cls}${focus}${ui.changed && ui.changed[col + k] ? ' chg' : ''}" ${tip(`${D().loadLabels[k]} · ${S().band(v).label}${lv.stale[k] ? ' · last sampled (test to update)' : ''}`)}><span class="bd" aria-hidden="true">${icon(BAND_ICON[b])}</span>${sc(v)}${lv.stale[k] ? '<span class="stale-mark" aria-label="stale reading">*</span>' : ''}</td>`;
    };
    const thF = (col, txt, cls) => `<th class="${cls}${hl && ({ S: 'src', P: 'plant', T: 'tap' }[hl] === col) ? ' hl' : ''}" scope="col">${txt}</th>`;
    return `<button type="button" class="dash-toggle" data-act="dash-toggle" aria-expanded="${!ui.dashClosed}" aria-label="${ui.dashClosed ? 'Show' : 'Hide'} system dashboard">${ui.dashClosed ? 'Show dashboard ▴' : 'Hide ▾'}</button>
      <div class="ws"><div><div class="k">Water Security</div><div class="v num">${sc(d.ws)}<small>/100</small></div><div>${delta(wsd)}</div></div>
        <div class="gate${g.length ? ' on' : ''}">${g.length ? icon('warn') + ' Gate active: ' + g[0].text : icon('check') + ' No critical gate active'}</div>
        <button type="button" data-act="security">${icon('help')} How is this calculated?</button></div>
      <div class="scores" role="group" aria-label="Five outcome scores">${tiles}</div>
      <div class="labwrap"><div class="lab-h"><h3>Source to tap · lab readings <span>game-scale prototype data</span></h3></div>
        <table class="lab"><caption class="sr-only">Laboratory comparison, game scale 0 to 100, pH 0 to 14. Prototype data, not real measurements.</caption>
          <thead><tr><th scope="col">Measure</th>${thF('src', 'Source', 'c-src')}${thF('plant', 'Plant outlet', 'c-plant')}${thF('tap', 'Tap', 'c-tap')}</tr></thead>
          <tbody>${rows.map((k) => `<tr><th scope="row">${D().loadLabels[k]}</th>${cell('src', k, 'c-src')}${cell('plant', k, 'c-plant')}${cell('tap', k, 'c-tap')}</tr>`).join('')}</tbody></table></div>`;
  };
})(window);
