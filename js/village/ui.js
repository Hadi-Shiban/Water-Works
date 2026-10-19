/* =============================================================================
   WATERWORKS VILLAGE — VIEWS
   -----------------------------------------------------------------------------
   Pure (state, ui) → HTML string templates. They never mutate state.
   Interactions are declared with data-act / data-id and handled in app.js.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const D = () => WV.data;
  const S = () => WV.sim;
  const U = (WV.ui = {});

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v) => Math.round(v).toLocaleString('en-US');
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const closeBtn = (act) => `<button type="button" class="icon-btn" data-act="${act || 'close-dialog'}" aria-label="Close">${icon('x')}</button>`;
  U.esc = esc;

  /* Banner art zoomed onto the village, so dialogs never show what the map crop leaves out. */
  function banner(s, cls, inner) {
    const sc = S().sceneOf(s); const zoom = 2; const vis = 1 / zoom;
    const fx = Math.min(sc.crop.x + sc.crop.w, Math.max(sc.crop.x, sc.focus.x)) / 100;
    const px = Math.max(0, Math.min(1, (fx - vis / 2) / (1 - vis))) * 100;
    const py = Math.max(0, Math.min(100, sc.focus.y + 4));
    return `<div class="dlg-art ${cls || ''}" style="background-image:url('${esc(sc.image)}');background-size:${zoom * 100}% auto;background-position:${px.toFixed(1)}% ${py.toFixed(1)}%" aria-hidden="true">${inner || ''}</div>`;
  }

  /* Fill {village}, {households}, {committeePlace}… from the state. */
  function fill(text, s) {
    const sc = S().sceneOf(s); const label = (id) => (sc.hotspots.find((h) => h.id === id) || {}).label || '';
    const water = sc.hotspots.find((h) => h.kind === 'water');
    const map = { village: s.name, households: fmt(s.households), population: fmt(s.population),
      committeePlace: label('committee').toLowerCase(), sourcePlace: label('source').toLowerCase(),
      waterPlace: water ? water.label.toLowerCase() : '', engineer: s.people.engineer ? s.people.engineer.name : 'The engineer' };
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in map ? esc(map[k]) : m));
  }
  U.fill = fill;

  /* ---- Portraits: simple painted busts, varied by role ------------------------------ */
  const LOOKS = { chair: ['#6b3f22', '#2f6b6b', '#1f1712'], treasurer: ['#c18a5e', '#8e3b5a', '#3a2a1c'], caretaker: ['#4a2c19', '#c9962a', '#120c08'], officer: ['#8a5a36', '#41557d', '#2b1d14'] };
  function portrait(roleId, size) {
    const [skin, tunic, hair] = LOOKS[roleId] || LOOKS.chair; const z = size || 56;
    const extra = roleId === 'caretaker' ? '<path d="M17 21 q11 -9 22 0 Z" fill="#f2c118"/>' : roleId === 'officer' ? '<rect x="22" y="42" width="12" height="6" rx="1" fill="#f2c118"/>' : '';
    return `<svg class="portrait" width="${z}" height="${z}" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="28" fill="#efe4c9"/>
      <path d="M8 56 q2 -18 20 -19 q18 1 20 19 Z" fill="${tunic}"/>
      <rect x="24.5" y="30" width="7" height="8" fill="${skin}"/>
      <ellipse cx="28" cy="25" rx="9.5" ry="10.5" fill="${skin}"/>
      <path d="M18.4 24 q0 -12 9.6 -12 q9.6 0 9.6 12 q-3 -6 -9.6 -6.5 q-6.6 .5 -9.6 6.5 Z" fill="${hair}"/>
      ${extra}
    </svg>`;
  }
  U.portrait = portrait;

  /* ---- HUD ----------------------------------------------------------------------- */
  U.hudId = function (s) {
    const lvl = S().levelDef(s); const sc = D().scenarios[s.scenarioId];
    return `<span class="mark" aria-hidden="true">${icon('can')}</span>
      <div class="id-text"><p class="kicker">Waterworks · ${esc(sc.name)}</p><h1>${esc(s.name)}</h1></div>
      <span class="lvl"><span class="lvl-n">Level ${lvl.id}</span> ${esc(lvl.title)}</span>`;
  };

  U.objective = function (s) {
    const lvl = S().levelDef(s);
    if (s.flags.campaignComplete) return `<span class="lbl">Project complete</span><span class="txt">Explore ${esc(s.name)} at your own pace</span>${icon('chev-down')}`;
    if (lvl.comingSoon) return `<span class="lbl">Up next</span><span class="txt">Level ${lvl.id}: ${esc(lvl.title)} arrives in the next build</span>${icon('chev-down')}`;
    const o = S().nextObjective(s);
    if (!o && !lvl.next) return `<span class="lbl">Project complete</span><span class="txt">Your final report is ready</span>${icon('chev-down')}`;
    return (o ? `<span class="lbl">Objective</span><span class="txt">${esc(o.text)}</span>` : `<span class="lbl">Level complete</span><span class="txt">Ready for ${esc(lvl.next)}</span>`) + icon('chev-down');
  };

  U.stats = function (s, audioState) {
    const m = S().metrics(s);
    const sound = audioState.available
      ? `<button type="button" class="hud-btn" data-act="toggle-music" aria-pressed="${!audioState.muted}" aria-label="${audioState.muted ? 'Unmute music' : 'Mute music'}" title="${audioState.muted ? 'Unmute music' : 'Mute music'}">${icon(audioState.muted ? 'mute' : 'sound')}</button>`
      : `<button type="button" class="hud-btn" disabled aria-label="Music unavailable" title="Music unavailable">${icon('mute')}</button>`;
    return `<li class="stat people"><button type="button" class="stat-btn" data-act="open-population" title="Who has reliable, safe water? Tap for details" aria-label="${fmt(m.peopleWithWater)} of ${fmt(s.population)} residents with reliable water. Open details.">
        <span class="ico">${icon('people')}</span><span class="v"><span id="reliableCount">${fmt(m.peopleWithWater)}</span><small>/${fmt(s.population)}</small></span><span class="k">with reliable water</span></button></li>
      <li class="stat" title="Wood"><span class="ico wood">${icon('wood')}</span><span class="v" data-res="wood">${s.resources.wood}</span><span class="k">wood</span></li>
      <li class="stat" title="Stone"><span class="ico stone">${icon('stone')}</span><span class="v" data-res="stone">${s.resources.stone}</span><span class="k">stone</span></li>
      <li class="tools">${sound}<button type="button" class="hud-btn" data-act="open-menu" aria-label="Menu and settings" title="Menu">${icon('menu')}</button></li>`;
  };

  U.checklist = function (s, open) {
    const lvl = S().levelDef(s);
    const head = `<div class="cl-head"><span><span class="kicker">Level ${lvl.id} of ${D().levels.length} · project checklist</span><b>${esc(lvl.title)}</b></span>
        <button type="button" class="icon-btn" data-act="toggle-checklist" aria-label="Close checklist">${icon('x')}</button></div>`;
    let body;
    if (lvl.comingSoon) {
      body = `<p class="cl-note">${icon('flag')} <span><b>${esc(lvl.title)}</b> arrives in the next build. ${esc(s.name)} is saved, so you can keep exploring.</span></p>`;
    } else {
      const obs = S().objectives(s); const done = obs.filter((o) => o.done).length;
      body = `<div class="cl-progress" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="${obs.length}" aria-valuenow="${done}"><i style="width:${(done / obs.length) * 100}%"></i></div>
        <ol class="cl-list">${obs.map((o) => `<li class="${o.done ? 'done' : ''}">${icon(o.done ? 'check' : 'dot')}<span>${esc(o.text)}<span class="sr-only">${o.done ? ' (done)' : ''}</span></span></li>`).join('')}</ol>`;
    }
    return head + `<div id="clBody" class="cl-body" ${open ? '' : 'hidden'}>${body}</div>`;
  };

  U.guide = function (s) {
    const o = S().nextObjective(s); const lvl = S().levelDef(s);
    const key = lvl.comingSoon ? null : o ? o.id : 'done';
    const tip = key && D().tips[key];
    if (!tip) return '';
    return `${portrait('officer', 44)}<div class="g-body"><p class="g-who">${esc(s.people.officer.name)} · Field officer</p><p class="g-tip">${fill(tip, s)}</p></div>
      <button type="button" class="icon-btn" data-act="hide-tips" aria-label="Hide tips" title="Hide tips (turn them back on in the menu)">${icon('x')}</button>`;
  };

  /* ---- Inspection sheet ------------------------------------------------------------- */
  function costRow(s, cost) {
    return Object.keys(cost).map((k) => {
      const have = s.resources[k], need = cost[k], ok = have >= need;
      return `<li class="cost ${ok ? 'ok' : 'short'}">${icon(k)}<span>${need} ${esc(D().resources[k].name.toLowerCase())}</span><small>${ok ? 'ready' : `have ${have}`}</small></li>`;
    }).join('');
  }

  function glass(looks) {
    const cloudy = /cloud/i.test(looks || '');
    const col = cloudy ? '#cdbb8e' : '#d6ecf5';
    return `<svg viewBox="0 0 34 44" class="glass-svg" aria-hidden="true"><path d="M5 4h24l-3 36a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#fff" stroke="#1b1f23" stroke-width="1.5"/><path d="M6.2 12h21.6l-2.3 28a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1z" fill="${col}"/></svg>`;
  }

  /* Your eyes vs the lab: the same pair the source panel always had, now filled in by tests. */
  function eyesVsLab(s, id, looks) {
    const r = s.results[id]; const G = D().results.germ;
    const lab = r ? `<span class="result ${G[r.germ].tone}">${icon(r.germ === 'safe' ? 'check' : 'warn')}${esc(G[r.germ].label)}</span>`
      : `<span>${s.level >= 2 ? (s.samples.indexOf(id) >= 0 ? 'Sample waiting at the field lab' : 'Not tested yet') : s.builds.lab === 'built' ? 'Ready to test in Level 2' : 'Not tested. Germs are invisible.'}</span>`;
    return `<div class="eyes-lab"><div>${glass(looks)}<b>Your eyes</b><span>${esc(looks)}</span></div>
      <div class="lab-q">${icon('flask', 'ic-lg')}<b>The lab</b>${lab}</div></div>`;
  }
  function sampleBlock(s, id) {
    if (s.level < 2 || !S().sceneOf(s).samples[id]) return '';
    if (id !== 'source') {
      return s.results[id] ? `<p class="note">${icon('check')}<span>Tested at the field lab. ${esc(S().sceneOf(s).samples[id].clue)}</span></p>`
        : `<p class="note">${icon('flask')}<span>${esc(s.people.caretaker.name)} is bringing a jar of this water to the field lab too.</span></p>`;
    }
    if (s.results[id]) return `<p class="note">${icon('check')}<span>Tested at the field lab. ${esc(S().sceneOf(s).samples[id].clue)}</span></p>`;
    if (s.samples.indexOf(id) >= 0) return `<p class="note">${icon('flask')}<span>Sample collected.</span></p>` + labButton(s);
    return `<button type="button" class="btn primary block" data-act="collect-sample" data-id="${id}">${icon('can')} Collect a water sample</button>`;
  }
  function labButton(s) {
    if (s.flags.labUnlocked) return `<button type="button" class="btn primary block" data-act="open-lab">${icon('flask')} Open the field lab</button>`;
    if (s.samples.indexOf('source') >= 0) return `<button type="button" class="btn primary block" data-act="open-lab">${icon('flask')} Bring your sample to the lab</button>`;
    const src = (S().hotspot(s, 'source') || {}).label || 'collection point';
    return `<p class="note">${icon('can')}<span>The lab needs a water sample. Collect one at the ${esc(src.toLowerCase())}.</span></p>`;
  }

  U.sheet = function (s, id, ui) {
    const sc = S().sceneOf(s); const h = sc.hotspots.find((x) => x.id === id); const p = sc.places[id];
    if (!h || !p) return '';
    const kicker = id === 'waterPoint' && s.builds.waterPoint === 'built' ? 'Water point' : { issue: 'Maintenance', source: 'Water collection point', water: 'Water source', committee: 'Village water committee', site: 'Construction site', place: 'Place', survey: 'Survey site' }[h.kind];
    let extra = '';
    if (h.kind === 'water') {
      extra = `<div class="sec"><h3 class="sec-t">Your eyes vs the lab</h3>${eyesVsLab(s, id, p.looks)}${sampleBlock(s, id)}</div>`;
    } else if (h.kind === 'survey') {
      const sv = sc.surveys[id]; const done = s.surveys.indexOf(id) >= 0; const busy = ui.surveying === id;
      const facts = (sv.reveals || []).map((k) => `<li><span>${esc(D().facts[k].label)}</span><b>${done ? esc(D().facts[k].show(s.site[k])) : '?'}</b></li>`).join('');
      extra = `<div class="sec"><h3 class="sec-t">${esc(sv.title)} with ${esc(s.people.engineer.name)}</h3>
        ${done ? `<p class="note">${icon('check')}<span>${esc(sv.done)}</span></p>` : ''}
        <ul class="factlist ${busy ? 'busy' : ''}">${facts}</ul>
        ${done ? '' : `<button type="button" class="btn primary block" data-act="survey" data-id="${id}" ${busy ? 'aria-disabled="true"' : ''}>${icon('flag')} ${busy ? 'Surveying…' : esc(sv.title)}</button>`}</div>`;
    } else if (h.kind === 'source') {
      const m = S().metrics(s); const b = s.baseline;
      extra = `<div class="sec"><h3 class="sec-t">Your eyes vs the lab</h3>${eyesVsLab(s, id, p.looks)}${sampleBlock(s, id)}</div>
        <div class="sec"><h3 class="sec-t">A day of collecting water</h3>
          <dl class="facts"><div><dt>Round trip</dt><dd>${b.roundTripMin} min</dd></div><div><dt>Trips per household</dt><dd>${b.tripsPerDay} a day</dd></div>
          <div><dt>Water per person</dt><dd>≈ ${Math.round(m.litresPerPerson)} L a day</dd></div><div><dt>Time per household</dt><dd>≈ ${m.hoursPerHousehold.toFixed(1)} h a day</dd></div></dl>
          ${ui.watching || s.flags.walkWatched ? `<p class="note">${icon('can')}<span>Across ${esc(s.name)}, families carry about <b>${fmt(m.cansPerDay)} jerry cans</b> a day, roughly <b>${fmt(m.communityHours)} hours</b> of walking and waiting.</span></p>` : ''}
          <button type="button" class="btn ${s.flags.walkWatched ? '' : 'primary'} block" data-act="watch-walk">${icon('walk')} ${ui.watching ? 'Watching the morning walk…' : s.flags.walkWatched ? 'Watch the walk again' : 'Watch the morning walk'}</button></div>`;
    } else if (h.kind === 'committee') {
      const members = D().committeeRoles.map((r) => `<li>${portrait(r, 40)}<span><b>${esc(s.people[r].name)}</b><small>${esc(D().roles.find((x) => x.id === r).title)}</small></span></li>`).join('');
      const plan = s.level >= 3 && !s.flags.systemActive;
      const meet4 = s.level >= 4 && s.water && s.water.allocationSet && !s.water.decision;
      extra = `<div class="sec"><ul class="members">${members}</ul>
        ${s.maint && s.maint.repaired && !s.flags.projectComplete ? `<button type="button" class="btn primary block" data-act="open-review">${icon('people')} Project review</button>` : ''}
        ${s.flags.projectComplete ? `<button type="button" class="btn block" data-act="open-finale">${icon('can')} Read the project report</button>` : ''}
        ${meet4 ? `<button type="button" class="btn primary block" data-act="open-decision">${icon('people')} Committee meeting</button>` : ''}
        ${plan ? `<button type="button" class="btn primary block" data-act="plan-meeting">${icon('people')} ${s.tech ? 'Review the project plan' : s.flags.planningMet ? 'Choose the water system' : 'Plan the water project'}</button>` : ''}
        <button type="button" class="btn ${s.flags.committeeMet || plan ? '' : 'primary'} block" data-act="meet-committee">${icon('people')} ${s.flags.committeeMet ? 'Talk with the committee again' : 'Meet the committee'}</button></div>`;
    } else if (h.kind === 'issue') {
      extra = s.maint ? issueSheet(s, ui) : '';
    } else if (h.kind === 'site' && id === 'waterPoint') {
      extra = waterPointSheet(s, ui);
    } else if (h.kind === 'site') {
      const b = D().builds[id]; const st = s.builds[id];
      if (st === 'built') {
        extra = `<div class="sec built-card">${icon('check', 'ic-lg')}<div><b>${esc(b.name)} built</b><p>${esc(b.text)}</p></div></div>`
          + (s.level >= 2 ? labButton(s) : '');
      } else if (st === 'building') {
        extra = `<div class="sec"><p class="note">${icon('hammer')}<span>${esc(s.people[b.builder].name)} and two neighbours are building the ${esc(b.name.toLowerCase())}…</span></p></div>`;
      } else {
        const c = S().canBuild(s, id);
        extra = `<div class="sec"><h3 class="sec-t">${esc(b.name)}</h3><p class="muted">${esc(b.text)}</p>
          <ul class="costs">${costRow(s, b.cost)}</ul>
          ${!c.ok ? `<p class="note warn">${icon('flag')}<span>${esc(c.reason)}</span></p>` : ''}
          <button type="button" class="btn primary block" data-act="build" data-id="${id}" ${c.ok ? '' : 'aria-disabled="true"'}>${icon('hammer')} Build with ${esc(s.people[b.builder].name)}</button></div>`;
      }
    }
    const text = h.kind === 'site' && s.builds[id] === 'built' ? '' : `<p>${fill(p.text, s)}</p>`;
    const title = id === 'waterPoint' && s.builds[id] === 'built' ? S().buildDef(s, id).name : h.kind === 'site' && s.builds[id] === 'built' ? D().builds[id].name : p.title;
    return `<header class="sheet-head"><div><p class="kicker">${kicker}</p><h2 id="sheetTitle" tabindex="-1">${esc(title)}</h2></div>${closeBtn('close-sheet')}</header>
      <div class="sheet-body">${text}${p.note ? `<p class="note">${icon('eye')}<span>${fill(p.note, s)}</span></p>` : ''}${extra}</div>`;
  };

  /* ---- Level 3: the water point ------------------------------------------------------------- */
  const TECH_ICON = {
    gravityFed: '<svg viewBox="0 0 40 40" class="techicon" aria-hidden="true"><path d="M3 10 q8 -6 14 2 q6 8 20 4" fill="none" stroke="#8f887a" stroke-width="3"/><path d="M4 10 q8 -6 14 2 q6 8 18 4" fill="none" stroke="#4a9ccc" stroke-width="1.6" stroke-dasharray="2 3"/><rect x="28" y="16" width="5" height="16" rx="1" fill="#e6dfcf" stroke="#8f887a"/><path d="M28 21 h-4 v2" stroke="#4d5a63" stroke-width="1.6" fill="none"/><rect x="22" y="32" width="14" height="3" rx="1" fill="#cfc8b8"/><path d="M2 12 l6 -6 l6 5" fill="#9aa86a"/></svg>',
    drilledWell: '<svg viewBox="0 0 40 40" class="techicon" aria-hidden="true"><ellipse cx="20" cy="34" rx="14" ry="4" fill="#cfc8b8" stroke="#8f887a"/><rect x="17" y="12" width="6" height="21" rx="1" fill="#2f6b5a"/><path d="M22 14 L34 8" stroke="#1d4237" stroke-width="2" stroke-linecap="round"/><path d="M17 20 h-5 v3" stroke="#24584a" stroke-width="2" fill="none"/><path d="M20 35 v4" stroke="#4a9ccc" stroke-width="2" stroke-dasharray="1.5 1.5"/></svg>',
    rainwater: '<svg viewBox="0 0 40 40" class="techicon" aria-hidden="true"><path d="M3 14 L14 5 L25 14 Z" fill="#5d6b78"/><path d="M4 15 H25 V17 H4z" fill="#8f887a"/><path d="M24 16 q3 0 3 4 v4" fill="none" stroke="#8f887a" stroke-width="2"/><rect x="22" y="22" width="14" height="14" rx="3" fill="#d9d3c4" stroke="#8f887a"/><path d="M8 4 v4 M12 2 v4 M16 4 v4" stroke="#4a9ccc" stroke-width="1.3"/></svg>',
  };
  U.techIcon = (id) => TECH_ICON[id] || `<span class="techicon">${icon('can')}</span>`;

  function waterPointSheet(s, ui) {
    const st = s.builds.waterPoint; const tech = D().technologies[s.tech]; const b = S().buildDef(s, 'waterPoint');
    if (st === 'site') {
      const c = S().canBuild(s, 'waterPoint');
      return `<div class="sec"><h3 class="sec-t">${esc(tech.name)}</h3>
        <ul class="costs">${costRow(s, b.cost)}</ul>
        <p class="muted small">Provided by the partner team: ${esc(tech.partnerProvides.join(', '))}.</p>
        ${!c.ok ? `<p class="note warn">${icon('flag')}<span>${esc(c.reason)}${c.short ? ' The gathering spots have filled up again.' : ''}</span></p>` : ''}
        <button type="button" class="btn primary block" data-act="build" data-id="waterPoint" ${c.ok ? '' : 'aria-disabled="true"'}>${icon('hammer')} Build with ${esc(s.people[b.builder].name)} and the team</button></div>`;
    }
    if (st === 'building') {
      return `<div class="sec"><p class="note">${icon('hammer')}<span>${esc(s.people.engineer.name)}, ${esc(s.people[b.builder].name)} and neighbours are building the ${esc(tech.structureName.toLowerCase())}…</span></p></div>`;
    }
    if (!s.flags.systemActive) {
      const steps = S().activationSteps(s); const next = S().nextActivation(s);
      const rows = steps.map((x) => { const done = s.activation.indexOf(x.id) >= 0; return `<li class="${done ? 'done' : next && next.id === x.id ? 'now' : ''}">${icon(done ? 'check' : 'dot')}<span>${esc(done ? x.done : x.label)}</span></li>`; }).join('');
      const reps = next && next.reps ? next.reps : 0; const n = ui.pumpCount || 0;
      return `<div class="sec built-card">${icon('check', 'ic-lg')}<div><b>${esc(tech.structureName)} built</b><p>Now bring it to life, step by step.</p></div></div>
        <div class="sec"><h3 class="sec-t">Activate the system</h3><ol class="steps">${rows}</ol>
        ${reps ? `<div class="canfill" aria-hidden="true"><i style="height:${(n / reps) * 100}%"></i></div><p class="muted small" role="status">Strokes: ${n} of ${reps}</p>` : ''}
        ${next ? `<button type="button" class="btn primary block" data-act="activate" ${ui.activating ? 'aria-disabled="true"' : ''}>${icon('can')} ${ui.activating ? 'Working…' : reps ? `Pump (${n}/${reps})` : esc(next.label)}</button>` : ''}</div>`;
    }
    if (s.maint && !s.maint.repaired) return inspectionPanel(s, ui);
    const m = S().metrics(s); const W = WV.water; const r = W.residents(s); const w = s.water;
    const L4 = s.level >= 4;
    const review = WV.water.needsReview(s) ? `<p class="note warn">${icon('warn')}<span>The water supply changed. The sharing plan needs review: it now asks for more than the point gives.</span></p><button type="button" class="btn primary block" data-act="open-allocation">${icon('can')} Review the sharing plan</button>` : '';
    const act = review ? review : !L4 ? '' : !w.allocationSet ? `<button type="button" class="btn primary block" data-act="open-allocation">${icon('can')} Share the water</button>`
      : !w.decision ? `<button type="button" class="btn block" data-act="open-allocation">${icon('can')} Adjust the sharing</button><p class="note">${icon('people')}<span>The committee would like to meet about one improvement.</span></p>`
      : `<button type="button" class="btn primary block" data-act="run-week" ${ui.running ? 'aria-disabled="true"' : ''}>${icon('chev-right')} ${ui.running ? 'A week passes…' : 'Run the next week'}</button>
         <button type="button" class="btn block" data-act="open-allocation">${icon('can')} Adjust the sharing</button>`;
    return `<div class="sec built-card">${icon('check', 'ic-lg')}<div><b>Water is flowing</b><p>Capacity for about ${fmt(w.capacityCans)} jerry cans a day. Families are starting to use it.</p></div></div>
      <dl class="facts"><div><dt>Verified users</dt><dd>${fmt(r.project)}</dd></div><div><dt>Trying it out</dt><dd>${fmt(r.trying)}</dd></div>
      <div><dt>Round trip</dt><dd>${m.roundTripAfter} min <small>(was ${s.baseline.roundTripMin})</small></dd></div><div><dt>Germ test</dt><dd><span class="result ok">${icon('check')}Safe</span></dd></div></dl>
      ${act}
      ${s.maint ? `<div class="cond"><span>Condition</span>${condBar(s.maint.condition)}</div>` : ''}
      <p class="note">${icon('wrench')}<span><b>${esc(s.people.caretaker.name)}</b>, caretaker: ${esc(tech.maintenanceLine)}</span></p>`;
  }

  /* ---- Level 5: inspection, diagnosis, repair ------------------------------------------- */
  const condBar = (c) => { const p = Math.round(c * 100); const tone = p >= 80 ? 'ok' : p >= 60 ? 'warn' : 'risk';
    return `<span class="condbar ${tone}" role="img" aria-label="Condition ${p} percent"><i style="width:${p}%"></i></span><b>${p}%</b>`; };
  function inspectionPanel(s, ui) {
    const mt = s.maint; const d = WV.maint.def(s); const r = WV.water.residents(s); const w = s.water;
    const flow = Math.round((w.supplyFactor == null ? 1 : w.supplyFactor) * 100);
    return `<div class="sec"><h3 class="sec-t">Routine check with ${esc(s.people.caretaker.name)}</h3>
        <dl class="facts inspect"><div><dt>Condition</dt><dd class="cond">${condBar(mt.condition)}</dd></div><div><dt>Water flow</dt><dd>${flow}% of normal</dd></div>
        <div><dt>Reliable water</dt><dd>${fmt(r.reliable)} residents</dd></div><div><dt>Maintenance</dt><dd><span class="result warn">${icon('warn')}Needs attention</span></dd></div></dl>
        ${mt.inspected ? `<p class="note warn">${icon('wrench')}<span><b>${esc(d.title)}.</b> ${esc(d.report)} The problem spot is marked on the map.</span></p>
          <button type="button" class="btn primary block" data-act="goto-issue">${icon('flag')} Go to the problem spot</button>`
          : `<p class="muted">The flow looks lower than usual. Let’s check it together.</p><button type="button" class="btn primary block" data-act="maint-inspect">${icon('eye')} Inspect with the caretaker</button>`}
        ${mt.demoted ? `<p class="muted small">About ${fmt(Math.round(mt.demoted * WV.water.hhSize(s)))} residents lost reliable service when the flow dropped.</p>` : ''}</div>`;
  }
  function issueSheet(s, ui) {
    const mt = s.maint; const d = WV.maint.def(s);
    if (!mt.diagnosed) {
      const opts = d.options.map((o) => { const wrong = mt.wrong.indexOf(o.id) >= 0;
        return `<li><button type="button" class="btn block opt-btn ${wrong ? 'wrong' : ''}" data-act="maint-diagnose" data-id="${o.id}" ${wrong ? 'aria-disabled="true"' : ''}>${wrong ? icon('x') : icon('dot')} ${esc(o.text)}</button>${wrong ? `<small class="why">${esc(o.why)}</small>` : ''}</li>`; }).join('');
      return `<div class="sec"><p class="note">${icon('eye')}<span>${esc(d.report)}</span></p><h3 class="sec-t">What do you think is wrong?</h3><ul class="diag">${opts}</ul>
        <p class="muted small">${esc(s.people.caretaker.name)} and ${esc(s.people.engineer.name)} will confirm before anyone starts work.</p></div>`;
    }
    const right = d.options.find((o) => o.correct);
    const next = WV.maint.nextStep(s); const cost = d.cost; const costTxt = Object.keys(cost).filter((k) => cost[k]).map((k) => `${cost[k]} ${k}`).join(' + ');
    const rows = d.steps.map((x) => { const done = mt.steps.indexOf(x.id) >= 0; return `<li class="${done ? 'done' : next && next.id === x.id ? 'now' : ''}">${icon(done ? 'check' : 'dot')}<span>${esc(done ? x.done : x.label)}</span></li>`; }).join('');
    const short = mt.steps.length === 0 && Object.keys(cost).some((k) => s.resources[k] < cost[k]);
    return `<div class="sec"><p class="note">${icon('check')}<span>${esc(right.why)}</span></p>
      <h3 class="sec-t">Repair with ${esc(s.people.caretaker.name)}, the trained caretaker</h3><ol class="steps">${rows}</ol>
      ${mt.steps.length === 0 ? `<ul class="costs">${costRow(s, Object.fromEntries(Object.entries(cost).filter(([, v]) => v > 0)))}</ul><p class="muted small">Spare parts come from the committee’s repair kit; the village adds ${esc(costTxt)}.</p>` : ''}
      ${short ? `<p class="note warn">${icon('flag')}<span>A little more ${Object.keys(cost).filter((k) => s.resources[k] < cost[k]).join(' and ')} needed. The gathering spots regrow every few seconds.</span></p>` : ''}
      ${next ? `<button type="button" class="btn primary block" data-act="maint-step" ${ui.repairing || short ? 'aria-disabled="true"' : ''}>${icon('wrench')} ${ui.repairing ? 'Working…' : esc(next.label)}</button>` : ''}</div>`;
  }
  U.issueSheet = issueSheet;

  U.review = function (s) {
    const rp = WV.maint.report(s); const pri = s.maint.priority;
    const opts = Object.keys(D().priorities).map((id) => { const p = D().priorities[id];
      return `<li><button type="button" class="btn block pri ${pri === id ? 'chosen' : ''}" data-act="choose-priority" data-id="${id}" aria-pressed="${pri === id}">${icon(pri === id ? 'check' : 'dot')}<span><b>${esc(p.name)}</b><small>${esc(p.note)}</small></span></button></li>`; }).join('');
    return `<div class="dlg-head"><div><p class="kicker">Project review · ${esc(s.name)}</p><h2 id="dlgTitle">Keeping the water flowing</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <ul class="summary"><li><b>${fmt(rp.reliable)}</b><span>of ${fmt(rp.population)} residents with reliable water</span></li>
          <li><b>${rp.condition}%</b><span>water point condition after the repair</span></li>
          <li><b>${fmt(rp.stillWaiting)}</b><span>residents still on the way to reliable water</span></li></ul>
        <div class="person-line">${portrait('caretaker', 44)}<p><b>${esc(s.people.caretaker.name)}</b>: “I check it every week. When something wears out, the committee has parts and I know how to fit them.”</p></div>
        <div class="person-line">${portrait('officer', 44)}<p><b>${esc(s.people.officer.name)}</b>: “Our team keeps visiting to follow up. Some systems even report their flow automatically, like charity: water’s monitoring work, but most rely on people like ${esc(s.people.caretaker.name)}.”</p></div>
        <div class="person-line">${portrait('chair', 44)}<p><b>${esc(s.people.chair.name)}</b>: “The water is ours to look after now. What should the committee focus on next?”</p></div>
        <ul class="prio">${opts}</ul>
      </div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-act="complete-project" ${pri ? '' : 'aria-disabled="true"'}>${icon('check')} Complete the final report</button></div>`;
  };

  U.finale = function (s) {
    const rp = s.maint.report || WV.maint.report(s); const sc = S().sceneOf(s);
    const burst = Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 26}deg;--d:${60 + (i % 3) * 22}px;--t:${(i % 5) * 0.08}s"></i>`).join('');
    const time = rp.hoursPerDay > 0 ? `<li><b>≈ ${fmt(rp.hoursPerDay)} h a day</b><span>of walking and waiting given back, about ${fmt(rp.hoursPerYear)} hours a year (round trip ${rp.roundTripBefore} → ${rp.roundTripAfter} min)</span></li>`
      : `<li><b>Shorter walks</b><span>for every family using the new water point</span></li>`;
    return `<div class="finale-art" style="background-image:url('${esc(sc.image)}')" aria-hidden="true"><span class="finale-burst">${burst}</span><span class="big-can">${icon('can')}</span></div>
      <div class="dlg-head"><div><p class="kicker">${esc(rp.village)} · ${esc(rp.scenario)} · ${esc(rp.technology)}</p><h2 id="dlgTitle" class="finale-title">Water Changes Everything</h2><p class="finale-sub">Your village has built more than a water system.</p></div></div>
      <div class="dlg-body">
        <ul class="summary finale-stats">
          <li><b>${fmt(rp.reliable)} of ${fmt(rp.population)}</b><span>residents with reliable, safe water</span></li>
          <li><b>+${fmt(rp.gained)}</b><span>more than at the start (${fmt(rp.startReliable)} had their own safe method)</span></li>
          ${time}
          <li><b>${rp.condition}%</b><span>water point condition, cared for by ${esc(s.people.caretaker.name)} and the committee</span></li>
          <li><b>${esc(rp.priority || '—')}</b><span>the committee’s next community project</span></li>
          <li><b>${fmt(rp.stillWaiting)}</b><span>residents still on the way to reliable water. The work continues.</span></li>
        </ul>
        <p class="muted small">All figures are fictional simulation estimates from your village, not real project data. ${esc(D().disclaimer)}</p>
      </div>
      <div class="dlg-foot finale-foot"><a class="btn" href="${esc(D().learnUrl)}" target="_blank" rel="noopener">${icon('external')} Learn about real projects</a>
        <button type="button" class="btn" data-act="new-village">Start a new village</button>
        <button type="button" class="btn primary" data-act="next-level">${icon('chev-right')} Explore your village</button></div>`;
  };

  /* ---- Level 4: community panel, sharing, committee decision ---------------------------- */
  const CAT_INFO = [
    ['project', 'Using the new water point', 'Collect at the new point and it has proven reliable for them.', true],
    ['existing', 'Their own safe method', 'Already treat and store water well, and it tested safe.', true],
    ['trying', 'Starting to use it', 'Trying the new point; reliability not yet confirmed.', false],
    ['partial', 'Partly protected', 'Cloth filters, settling or boiling sometimes. Clearer water is not always safe water.', false],
    ['none', 'No reliable safe water yet', 'Still collect from unsafe or distant sources.', false],
  ];
  U.population = function (s) {
    const r = WV.water.residents(s); const b = D().water.baselines[s.scenarioId];
    const bar = CAT_INFO.map(([k]) => r[k] ? `<i class="seg seg-${k}" style="flex:${r[k]}" title="${k}"></i>` : '').join('');
    const rows = CAT_INFO.map(([k, name, note, ok]) => `<li class="cat"><span class="sw seg-${k}" aria-hidden="true"></span><div><b>${esc(name)}</b><small>${esc(note)}</small></div><span class="n">${fmt(r[k])}</span><span class="tag-r ${ok ? 'ok' : ''}">${ok ? 'reliable' : ''}</span></li>`).join('');
    return `<div class="dlg-head"><div><p class="kicker">${esc(s.name)} · ${fmt(s.population)} residents</p><h2 id="dlgTitle">Who has reliable water?</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <div class="bigcount"><b>${fmt(r.reliable)}</b><span>of ${fmt(s.population)} residents have reliable, safe water</span></div>
        <div class="distbar" role="img" aria-label="${CAT_INFO.map(([k, name]) => `${name}: ${r[k]}`).join(', ')}">${bar}</div>
        <ul class="cats">${rows}</ul>
        <p class="muted small">A household counts as reliable once its water source works, has enough water, and has tested safe. Opening a water point adds capacity; families join over time. ${esc(b.existingNote)}</p>
        <details><summary>Learn more</summary><p>${esc(b.partialNote)} Different methods stop different hazards: settling and cloth filters mainly remove dirt, while boiling, good filters or a protected source deal with germs. Figures are simplified game values, not survey data.</p></details>
      </div>`;
  };

  /* Share the water: one slider per sector over ONE shared pool. Each slider runs from 0
     to that sector's full-service demand; the part it can't reach right now (because the
     pool is used elsewhere) is shaded. app.js updates values in place while dragging.  */
  const STAT = { full: ['Full service', 'ok', 'check'], reduced: ['Reduced', 'warn', 'warn'], short: ['Short', 'risk', 'warn'] };
  U.allocRowState = function (s, draft, id) {
    const o = WV.water.outcome(s, draft); const so = o.sectors[id]; const max = WV.water.maxAllowed(s, draft, id);
    const hh = o.homesHouseholds;
    const note = id === 'homes' ? (hh >= s.households ? `Enough for all ${fmt(s.households)} households.` : `Enough for about ${fmt(hh)} of ${fmt(s.households)} households.`) : '';
    return { got: so.got, need: so.need, pct: Math.round(so.ratio * 100), status: STAT[so.status], reach: so.need ? (max / so.need) * 100 : 100, val: so.need ? (so.got / so.need) * 100 : 0, max, note };
  };
  U.allocBudget = function (s, draft) {
    const o = WV.water.outcome(s, draft);
    const msg = o.over > 0 ? `${icon('warn')} ${fmt(o.over)} cans more than the water point gives. Reduce an allocation.`
      : o.remaining === 0 ? `${icon('check')} All available water has been allocated. Reduce another allocation to share more.`
        : `${icon('can')} ${fmt(o.remaining)} cans not yet shared. Unused water is fine.`;
    const clinic = o.clinicLow ? `<p class="note warn">${icon('warn')}<span>The clinic is below its recommended ${o.clinicMin} cans a day. Patients and staff may run short.</span></p>` : '';
    return { html: `<div class="budget-nums"><span><b>${fmt(o.supply)}</b> available</span><span><b>${fmt(o.allocated)}</b> allocated</span><span class="${o.remaining < 0 ? 'neg' : ''}"><b>${fmt(Math.max(0, o.remaining))}</b> remaining</span></div>
      <div class="budget-bar" aria-hidden="true"><i style="width:${Math.min(100, (o.allocated / Math.max(1, o.supply)) * 100).toFixed(1)}%"></i></div>
      <p class="budget-msg ${o.over > 0 ? 'warn' : o.remaining === 0 ? 'full' : ''}" role="status">${msg}</p>`, clinic, o };
  };
  U.allocation = function (s, draft, msg, opts) {
    const rows = D().allocation.sectors.map((x) => {
      const r = U.allocRowState(s, draft, x.id);
      const min = x.critical ? WV.water.clinicMin(s) : 0;
      return `<li class="alloc-row" data-row="${x.id}" style="--reach:${r.reach.toFixed(1)}%;--val:${r.val.toFixed(1)}%;--minmark:${r.need ? ((min / r.need) * 100).toFixed(1) : 0}%">
        <div class="ar-top"><b>${esc(x.name)}${x.critical ? ` <small class="crit">critical · recommended ≥ ${min}</small>` : ''}</b>
          <output id="out-${x.id}"><b>${r.got}</b> / ${r.need} cans · ${r.pct}%</output></div>
        <div class="slider-wrap ${x.critical ? 'has-min' : ''}"><input type="range" min="0" max="${r.need}" step="1" value="${r.got}" data-act="alloc" data-id="${x.id}"
          aria-label="${esc(x.name)}: jerry cans per day, up to ${r.need} for full service" aria-valuetext="${r.got} of ${r.need} cans, ${r.pct} percent"></div>
        <div class="ar-foot"><small>${esc(x.note)} <span data-note="${x.id}">${r.note}</span></small>
          <span class="chip ${r.status[1]}" data-chip="${x.id}">${icon(r.status[2])}${r.status[0]}</span></div></li>`;
    }).join('');
    const b = U.allocBudget(s, draft); const o = b.o;
    return `<div class="dlg-head"><div><p class="kicker">Water point · shared supply</p><h2 id="dlgTitle">Share the water</h2></div>${closeBtn('alloc-cancel')}</div>
      <div class="dlg-body">
        <div class="person-line">${portrait('treasurer', 44)}<p><b>${esc(s.people.treasurer.name)}</b>: “Every slider takes from the same supply. Give a sector more and less is left for the others. Nothing moves on its own.”</p></div>
        <section class="budget" id="allocBudget">${b.html}</section>
        <ul class="alloc">${rows}</ul>
        <div id="allocClinic">${b.clinic}</div>
        <label class="check override" id="allocOverride" ${o.clinicLow ? '' : 'hidden'}><input type="checkbox" data-act="alloc-override" ${opts && opts.override ? 'checked' : ''}> I understand the clinic will get less than recommended.</label>
        ${msg ? `<p class="note warn">${icon('flag')}<span>${esc(msg)}</span></p>` : ''}
      </div>
      <div class="dlg-foot"><button type="button" class="btn ghost" data-act="alloc-reset">Use committee proposal</button><span class="grow"></span>
        <button type="button" class="btn" data-act="alloc-cancel">Cancel</button><button type="button" class="btn primary" data-act="alloc-confirm">${icon('check')} Apply</button></div>`;
  };

  U.decision = function (s) {
    const card = (id) => { const d = D().decisions[id]; return `<li class="tcard"><div class="tc-top"><span class="techicon dec dec-${id}" aria-hidden="true">${icon(id === 'extend' ? 'walk' : 'wrench')}</span><div><b>${esc(d.name)}</b></div></div>
      <p>${esc(d.short)}</p><dl class="tc-facts"><div><dt>Gain</dt><dd>${esc(d.pros)}</dd></div><div><dt>Trade-off</dt><dd>${esc(d.cons)}</dd></div></dl>
      <button type="button" class="btn primary block" data-act="decide" data-id="${id}">${icon('check')} Support this option</button></li>`; };
    return `<div class="dlg-head"><div><p class="kicker">Water committee · ${esc(s.name)}</p><h2 id="dlgTitle">One improvement this season</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <div class="person-line">${portrait('chair', 44)}<p><b>${esc(s.people.chair.name)}</b>: “Our repair fund can pay for one improvement now. Both ideas came from families at the meeting. Which do you support?”</p></div>
        <ul class="tcards">${card('extend')}${card('reliability')}</ul>
        <p class="muted small">The committee votes; your view counts as one voice among many.</p>
      </div>`;
  };

  U.planning = function (s) {
    const rec = S().techChoices(s).find((c) => c.selectable);
    return `${banner(s)}
      <div class="dlg-head"><div><p class="kicker">Planning meeting · ${esc(s.name)}</p><h2 id="dlgTitle">From findings to a plan</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <div class="person-line">${portrait('chair', 48)}<p><b>${esc(s.people.chair.name)}</b>: “Your tests showed what we suspected: our water looks fine but makes people sick. Now let’s choose what to build.”</p></div>
        <div class="person-line">${portrait('engineer', 48)}<p><b>${esc(s.people.engineer.name)}</b>: “The surveys narrowed it down. ${rec ? `A <b>${esc(rec.name.toLowerCase())}</b> fits ${esc(s.name)} best.` : ''} The committee decides.”</p></div>
        <div class="person-line">${portrait('caretaker', 48)}<p><b>${esc(s.people.caretaker.name)}</b>: “Whatever we build, I’ll learn to keep it running.”</p></div>
      </div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-act="open-tech">${icon('chev-right')} See the options</button></div>`;
  };

  U.techCards = function (s, msg) {
    const cards = S().techChoices(s);
    const card = (c) => {
      const t = D().technologies[c.id]; const cost = t.cost;
      const served = c.selectable ? Math.min(s.population, S().capacityPeople({ ...s, tech: c.id })) : null;
      return `<li class="tcard ${c.selectable ? 'pick' : 'alt'} ${s.tech === c.id ? 'chosen' : ''}">
        <div class="tc-top">${U.techIcon(c.id)}<div><b>${esc(c.name)}</b><span class="chip ${c.selectable ? 'ok' : 'neutral'}">${icon(c.selectable ? 'check' : 'dot')}${c.selectable ? 'Recommended' : esc({ part: 'Part of the plan', possible: 'Possible', complement: 'Helps alongside', later: 'Later' }[c.status] || 'Possible')}</span></div></div>
        <p>${esc(t.short)}</p>
        ${c.selectable ? `<dl class="tc-facts"><div><dt>Build</dt><dd>${cost.wood} wood · ${cost.stone} stone + ${esc(t.partnerProvides.slice(0, 2).join(', '))} from the partner team</dd></div>
          <div><dt>Access</dt><dd>About ${fmt(served)} people, ${t.afterRoundTripMin}-minute round trip</dd></div>
          <div><dt>Upkeep</dt><dd>${esc(t.maintenance)}</dd></div></dl>`
          : `<p class="muted small">${esc(c.reason)}</p>`}
        <button type="button" class="btn ${c.selectable ? 'primary' : ''} block" data-act="choose-tech" data-id="${c.id}">${c.selectable ? `${icon('check')} Choose this` : 'Ask about this'}</button></li>`;
    };
    return `<div class="dlg-head"><div><p class="kicker">Choose the water system · ${esc(s.name)}</p><h2 id="dlgTitle">What will we build?</h2></div>${closeBtn()}</div>
      <div class="dlg-body">${msg ? `<div class="person-line">${portrait('engineer', 44)}<p><b>${esc(s.people.engineer.name)}</b>: “${esc(msg)}”</p></div>` : `<p class="muted">Only options that suit ${esc(s.name)} are shown.</p>`}
        <ul class="tcards">${cards.map(card).join('')}</ul></div>`;
  };

  /* ---- Dialogs -------------------------------------------------------------------------- */
  U.briefing = function (s) {
    const sc = D().scenarios[s.scenarioId];
    return `${banner(s)}
      <div class="dlg-head"><div><p class="kicker">Project briefing · ${esc(sc.name)}</p><h2 id="dlgTitle">Welcome to ${esc(s.name)}</h2></div></div>
      <div class="dlg-body">
        <p>A local partner team, supported by charity: water, is beginning an assessment of the community’s water needs.</p>
        <p>Your role is to work with the village water committee, investigate available sources, and help develop a water system designed for this place.</p>
        <p class="muted">${esc(s.name)} is home to about ${fmt(s.population)} people. ${esc(sc.landscape)}</p>
        <div class="person-line">${portrait('officer', 48)}<p><b>${esc(s.people.officer.name)}</b>, field officer: “First, let’s meet the committee, see how families collect water today, and gather wood and stone for a small field-testing station.”</p></div>
        <label class="check"><input type="checkbox" id="tipsOn" ${s.flags.tipsOff ? '' : 'checked'}> Show tips from ${esc(s.people.officer.name)}</label>
      </div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-act="begin">Start exploring ${icon('chev-right')}</button></div>`;
  };

  U.committee = function (s) {
    const cards = D().committeeRoles.map((r) => {
      const role = D().roles.find((x) => x.id === r);
      return `<li class="member-card">${portrait(r, 64)}<div><b>${esc(s.people[r].name)}</b><small>${esc(role.title)}</small>
        <p>“${fill(role.line, s)}”</p><p class="hope">${icon('flag')}<span>Hopes for: ${esc(role.hope)}</span></p></div></li>`;
    }).join('');
    return `<div class="dlg-head"><div><p class="kicker">Community meeting</p><h2 id="dlgTitle">The ${esc(s.name)} water committee</h2></div>${closeBtn()}</div>
      <div class="dlg-body"><ul class="member-cards">${cards}</ul>
        <p class="muted">The committee leads this project. The partner team brings surveys, engineering and training. You help coordinate.</p></div>
      <div class="dlg-foot">${s.flags.committeeMet ? '<button type="button" class="btn" data-act="close-dialog">Close</button>' : `<button type="button" class="btn primary" data-act="committee-agree">${icon('check')} Agree to work together</button>`}</div>`;
  };

  /* ---- Level 2: the illustrated field lab --------------------------------------------------
     One painted bench per scenario, with button hotspots over it, a callout panel for
     whatever is selected, and the Level 2 task list. Pure template: app.js decides
     which item is open (ui.labItem) and whether a test is animating (ui.labBusy).      */
  const LAB_STEPS = [
    { id: 'clear', flag: 'clearSampleInspected', text: 'Inspect the clear sample' },
    { id: 'dirty', flag: 'dirtySampleInspected', text: 'Inspect the cloudy sample' },
    { id: 'microscope', flag: 'microscopeUsed', text: 'Look through the microscope' },
    { id: 'filter', flag: 'filterTestCompleted', text: 'Try the filter' },
    { id: 'map', flag: null, text: 'Survey the land (on the map)' },
    { id: 'notebook', flag: 'notesReviewed', text: 'Review your field notes' },
    { id: 'options', flag: 'optionsReviewed', text: 'See which water systems fit' },
  ];
  const stepDone = (s, st) => (st.id === 'map' ? s.surveys.length >= 2 : !!s.flags[st.flag]);
  function nextStep(s) { return LAB_STEPS.find((st) => !stepDone(s, st)) || null; }
  U.labNext = (s) => { const n = nextStep(s); return n ? (n.id === 'options' ? 'notebook' : n.id) : null; };

  function petri(n, seed) {
    const r = S().rng(seed); const dots = Array.from({ length: n }, () => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 15;
      return `<circle cx="${(20 + Math.cos(a) * d).toFixed(1)}" cy="${(20 + Math.sin(a) * d).toFixed(1)}" r="${(1.4 + r() * 1.6).toFixed(1)}"/>`;
    }).join('');
    return `<svg viewBox="0 0 40 40" class="petri" aria-hidden="true"><circle cx="20" cy="20" r="18.5" class="dish"/><g class="colonies">${dots}</g></svg>`;
  }
  function tube(clarity) {
    return `<svg viewBox="0 0 16 44" class="tube ${clarity}" aria-hidden="true"><path d="M3 2h10v36a5 5 0 0 1-10 0z" class="glass"/><path d="M4 10h8v28a4 4 0 0 1-8 0z" class="water"/></svg>`;
  }
  const chip = (germ) => { const G = D().results.germ[germ]; return `<span class="result ${G.tone}">${icon(germ === 'safe' ? 'check' : 'warn')}${esc(G.label)}</span>`; };
  /* A circular magnified view, cut from the painted microscope insets. */
  function magnifier(lab, which, size) {
    const [cx, cy, d] = lab.insets[which]; const ar = D().lab.w / D().lab.h; const dy = d * ar;
    const bx = ((cx - d / 2) / (100 - d)) * 100, by = ((cy - dy / 2) / (100 - dy)) * 100;
    return `<span class="magnifier" style="width:${size}px;height:${size}px;background-image:url('${esc(lab.image)}');background-size:${(10000 / d).toFixed(1)}% auto;background-position:${bx.toFixed(2)}% ${by.toFixed(2)}%" aria-hidden="true"></span>`;
  }
  function origin(s, id) {
    const label = esc(S().hotspot(s, id).label);
    return id === 'source' ? `From the ${label.toLowerCase()} · your sample` : `From the ${label.toLowerCase()} · brought in by ${esc(s.people.caretaker.name)}`;
  }
  function verdict(r) {
    const bad = r.germ !== 'safe';
    if (r.prediction === 'unsure') return bad ? 'Good instinct. You can’t tell by looking, and the test found germs.' : 'Good instinct. You can’t tell by looking.';
    if (r.prediction === 'safe' && bad) return 'Surprise! It looks clean, but the test found germs. Looks clean doesn’t mean safe to drink.';
    if (r.prediction === 'unsafe' && bad) return 'Right, even though it looks perfectly clear. Only the test could prove it.';
    return 'The test agrees with what you saw.';
  }
  const HEALTH = {
    clear: 'Germs like these can cause diarrhoea. Drinking water like this day after day can leave people weak and dehydrated, and young children are hit hardest.',
    dirty: 'More germs and more mud. Water like this is a common cause of diarrhoea, and the mud can shelter germs from treatment.',
  };

  function callout(s, ui, lab) {
    const item = ui.labItem; const sc = S().sceneOf(s); const map = S().labDef(s); const busy = ui.labBusy;
    const locked = (msg) => `<p class="note warn">${icon('flag')}<span>${esc(msg)}</span></p>`;
    const hs = D().lab.hotspots.find((h) => h.id === item);
    const head = (k, title) => `<header class="co-head"><p class="kicker">${esc(k)}</p><h3 id="coTitle" tabindex="-1">${esc(title)}</h3></header>`;
    if (!item) {
      const n = nextStep(s);
      return head('Field lab', 'What’s next?') + (n ? `<p>${n.id === 'map' ? `Next, survey the land with ${esc(s.people.engineer.name)}. The survey markers are on the village map.` : `Next: <b>${esc(n.text.toLowerCase())}</b>. It’s glowing on the bench.`}</p>`
        : '<p>All done here. Nice work.</p>') + `<p class="muted">Tap anything on the bench to look closer.</p>`;
    }
    if (item === 'clear' || item === 'dirty') {
      const id = map[item]; const def = sc.samples[id]; const r = s.results[id]; const p = sc.places[id];
      const colonies = def.colonies || D().results.germ[def.germ].colonies;
      const title = item === 'clear' ? 'Clear sample' : 'Cloudy sample';
      if (item === 'dirty' && !s.flags.clearSampleInspected) return head('Sample jar', title) + locked('Start with the clear sample.');
      if (busy === item) {
        return head(origin(s, id), title) + `<div class="bench">${tube(def.clarity)}${petri(colonies, s.seed + id.length)}</div>
          <p class="muted" role="status">Running the clarity and germ tests… <small>(a real germ test incubates overnight)</small></p>`;
      }
      if (!r) {
        if (item === 'clear') {
          return head(origin(s, id), title) + `<div class="bench look">${glass(p.looks)}<span><b>Looks:</b> ${esc(p.looks)}</span></div>
            <p class="ask">Would you drink it? Guess, then run the tests.</p>
            <div class="guess" role="group" aria-label="Your guess"><button type="button" class="btn" data-act="lab-guess" data-pred="safe">Looks safe</button>
            <button type="button" class="btn" data-act="lab-guess" data-pred="unsafe">Looks unsafe</button><button type="button" class="btn" data-act="lab-guess" data-pred="unsure">Can’t tell</button></div>`;
        }
        return head(origin(s, id), title) + `<div class="bench look">${glass(p.looks)}<span><b>Looks:</b> ${esc(p.looks)}</span></div>
          <button type="button" class="btn primary" data-act="lab-test" data-id="dirty">${icon('flask')} Run the tests</button>`;
      }
      return head(origin(s, id), title) + `<div class="bench">${tube(r.clarity)}${petri(colonies, s.seed + id.length)}<span class="colony-n">${colonies} germ colonies grew</span></div>
        <dl class="results"><div><dt>${icon('eye')} Your eyes</dt><dd>${esc(p.looks)}</dd></div><div><dt>Clarity test</dt><dd>${esc(D().results.clarity[r.clarity])}</dd></div>
          <div><dt>${icon('flask')} Germ test</dt><dd>${chip(r.germ)}</dd></div>${r.salty ? `<div><dt>Salt strip</dt><dd><span class="result warn">${icon('warn')}Salty</span></dd></div>` : ''}</dl>
        ${item === 'clear' && r.prediction ? `<p class="verdict">${esc(verdict(r))}</p>` : `<p class="verdict">${item === 'dirty' ? 'You can see this one is dirty. The test shows it’s worse than it looks.' : ''}</p>`}
        <p class="health">${icon('people')}<span>${esc(HEALTH[item])}</span></p>
        <details><summary>Learn more</summary><p>The germ test grows bacteria that live in human and animal waste. If they are there, disease-causing germs may be too. ${esc(def.clue)}</p><p class="muted">Results are simplified game categories, not real measurements.</p></details>`;
    }
    if (item === 'microscope') {
      if (!s.flags.dirtySampleInspected) return head('Microscope', 'Microscope') + locked(s.flags.clearSampleInspected ? 'Inspect the cloudy sample first.' : 'Inspect both sample jars first.');
      return head('Microscope', 'What the eye can’t see') + `<div class="scopes"><figure>${magnifier(lab, 'clear', 120)}<figcaption>Clear jar</figcaption></figure><figure>${magnifier(lab, 'dirty', 120)}<figcaption>Cloudy jar</figcaption></figure></div>
        <ul class="keyfacts"><li><b>Bacteria</b> and tiny parasites, in <em>both</em> jars</li><li>The cloudy jar adds <b>soil and debris</b>, which can hide germs</li></ul>
        ${s.flags.microscopeUsed ? '' : `<button type="button" class="btn primary" data-act="lab-step" data-id="microscope">${icon('check')} Got it</button>`}
        <details><summary>Learn more</summary><p>Most disease-causing germs are far too small to see. Field teams usually rely on growth tests and test kits rather than microscopes; this view is simplified to show what those tests detect.</p></details>`;
    }
    if (item === 'filter') {
      if (!s.flags.microscopeUsed) return head('Filter stand', 'Filter stand') + locked(s.flags.dirtySampleInspected ? 'Look through the microscope first.' : 'Inspect both sample jars first.');
      const f = S().filterResult(s); const done = s.flags.filterTestCompleted;
      const flow = `<div class="filterflow ${busy === 'filter' ? 'running' : ''} ${done ? 'done' : ''}">${glass('cloudy')}<span class="funnel" aria-hidden="true">▼</span>${glass(done ? 'clear' : 'cloudy')}</div>`;
      if (!done) return head('Filter stand', 'Can a filter fix it?') + flow + `<p>Pour the cloudy water through the paper filter.</p>
        <button type="button" class="btn primary" data-act="lab-step" data-id="filter" ${busy ? 'aria-disabled="true"' : ''}>${icon('flask')} ${busy === 'filter' ? 'Filtering…' : 'Run the filter'}</button>`;
      return head('Filter stand', 'Clearer, not safe') + flow + `<dl class="results"><div><dt>Clarity</dt><dd>${esc(D().results.clarity[f.before.clarity])} → <b>${esc(D().results.clarity[f.after.clarity])}</b></dd></div>
        <div><dt>Germ test</dt><dd>${chip(f.before.germ)} → ${chip(f.after.germ)}</dd></div></dl>
        <p class="verdict">The filter caught the mud, but germs slipped through. Clearer isn’t the same as safe.</p>
        <details><summary>Learn more</summary><p>Cloth and paper filters catch dirt. Safe water also needs a protected source, or treatment such as disinfection, or a well-made household filter (like a BioSand filter) that is used and looked after every day.</p></details>`;
    }
    if (item === 'notebook') {
      const pre = !s.flags.filterTestCompleted ? 'Finish the bench tests first.' : s.surveys.length < 2 ? `Your notes still need the survey results. ${2 - s.surveys.length} survey${s.surveys.length === 1 ? '' : 's'} left with ${s.people.engineer.name}.` : null;
      if (pre) return head('Field notebook', 'Field notes') + locked(pre) + (s.surveys.length < 2 && s.flags.filterTestCompleted ? `<button type="button" class="btn" data-act="lab-goto-survey">${icon('flag')} Go to the next survey</button>` : '');
      const rows = ['clear', 'dirty'].map((w) => { const id = map[w]; const r = s.results[id]; return `<li><b>${esc(S().hotspot(s, id).label)}</b><span>Looks ${esc(sc.places[id].looks.toLowerCase())} · germ test ${chip(r.germ)}</span></li>`; }).join('');
      const known = S().knownFacts(s); const facts = Object.keys(D().facts).filter((k) => known[k]).map((k) => `<li><span>${esc(D().facts[k].label)}</span><b>${esc(D().facts[k].show(s.site[k]))}</b></li>`).join('');
      return head('Field notebook', 'What we learned') + `<ul class="notes">${rows}<li><b>Microscope</b><span>Germs in both jars, even the clear one</span></li><li><b>Filter</b><span>Clearer, but still not safe</span></li></ul>
        <h4 class="sec-t">The land</h4><ul class="factlist">${facts}</ul>
        <button type="button" class="btn primary" data-act="lab-notes">${icon('people')} ${s.flags.notesReviewed ? 'See the water options' : 'Ask the experts what fits'}</button>`;
    }
    if (item === 'map') {
      const left = Object.keys(sc.surveys).filter((id) => s.surveys.indexOf(id) < 0);
      const known = S().knownFacts(s); const facts = Object.keys(D().facts).filter((k) => known[k]).map((k) => `<li><span>${esc(D().facts[k].label)}</span><b>${esc(D().facts[k].show(s.site[k]))}</b></li>`).join('');
      return head('Village and source map', 'Site card') + `<p>Both sample sources are circled. ${left.length ? `${left.length} survey${left.length > 1 ? 's' : ''} left with ${esc(s.people.engineer.name)}.` : 'Surveys complete.'}</p>
        ${facts ? `<ul class="factlist">${facts}</ul>` : '<p class="muted">No survey results yet.</p>'}
        ${left.length ? `<button type="button" class="btn" data-act="lab-goto-survey">${icon('flag')} Go to the next survey</button>` : ''}`;
    }
    const extra = {
      reagents: ['Test tubes and reagents', 'Reagents feed any bacteria in a sample so they grow into colonies you can count. In the real world that takes about a day.'],
      petri: ['Petri dishes', s.flags.dirtySampleInspected ? 'Each dot is a colony that grew from one germ. Count them to compare samples.' : 'Results show up here as dots. Each one is a colony that grew from one germ.'],
      strip: ['Indicator strip', 'Strips check things like chlorine or pH. Handy, but no strip can spot germs.'],
      cylinder: ['Measuring cylinder', 'Every test uses the same amount of water, so results can be compared fairly.'],
    }[item];
    return extra ? head(hs ? hs.label : '', extra[0]) + `<p>${esc(extra[1])}</p>` : '';
  }

  U.labScene = function (s, ui) {
    const lab = D().lab.scenes[D().scenarios[s.scenarioId].scene];
    const next = U.labNext(s); const rect = (r) => `left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%`;
    const hot = D().lab.hotspots.map((h) => {
      const done = h.step && LAB_STEPS.some((st) => st.id === h.id && stepDone(s, st));
      return `<button type="button" class="lab-hs ${h.id === next ? 'next' : ''} ${ui.labItem === h.id ? 'active' : ''} ${done ? 'done' : ''}" data-act="lab-item" data-id="${h.id}" style="${rect(h.rect)}"
        aria-pressed="${ui.labItem === h.id}" aria-label="${esc(h.label)}${done ? ' (done)' : h.id === next ? ' (next step)' : ''}"><span class="lab-tag">${esc(h.label)}</span></button>`;
    }).join('');
    const covers = D().lab.coverBranding ? lab.covers.map((c) => `<span class="lab-cover ${c.kind}" style="${rect(c.rect)}" aria-hidden="true">${c.kind === 'case' ? '<b>FIELD KIT</b>' : ''}</span>`).join('') : '';
    const tasks = LAB_STEPS.map((st) => `<li class="${stepDone(s, st) ? 'done' : st.id === (nextStep(s) || {}).id ? 'now' : ''}">${icon(stepDone(s, st) ? 'check' : 'dot')}<span>${esc(st.id === 'map' ? `Survey the land with ${s.people.engineer.name} (${Math.min(2, s.surveys.length)}/2)` : st.text)}</span></li>`).join('');
    return `<div class="dlg-head"><div><p class="kicker">Field lab · ${esc(s.name)}</p><h2 id="dlgTitle">Investigate the water</h2></div>${closeBtn()}</div>
      <div class="lab-wrap">
        <div class="lab-stage"><div class="lab-art"><img src="${esc(lab.image)}" alt="" width="${D().lab.w}" height="${D().lab.h}" draggable="false">${covers}${hot}</div></div>
        <aside class="lab-side"><section class="callout" aria-live="polite">${callout(s, ui, lab)}</section>
          <section class="lab-tasks"><h3 class="sec-t">Level 2 tasks</h3><ol>${tasks}</ol></section></aside>
      </div>`;
  };

  const STATUS = {
    recommended: ['Recommended', 'ok', 'check'], part: ['Part of the plan', 'ok', 'check'], possible: ['Possible', 'neutral', 'dot'],
    complement: ['Helps alongside', 'neutral', 'dot'], later: ['Later', 'neutral', 'dot'], unknown: ['Needs info', 'neutral', 'flask'], no: ['Not here', 'risk', 'x'],
  };
  const ORDER = ['recommended', 'part', 'possible', 'complement', 'later', 'unknown', 'no'];
  U.options = function (s) {
    const cards = S().technologyOptions(s); const ready = S().readyForOptions(s);
    const quo = cards[0]; const rest = cards.slice(1).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    const rec = rest.find((c) => c.status === 'recommended');
    const card = (c) => { const st = STATUS[c.status]; return `<li class="opt ${c.status}"><div class="opt-top"><b>${esc(c.name)}</b><span class="chip ${st[1]}">${icon(st[2])}${st[0]}</span></div><p>${esc(c.reason)}</p>${c.status !== 'no' && c.short ? `<small class="muted">${esc(c.short)}</small>` : ''}</li>`; };
    return `<div class="dlg-head"><div><p class="kicker">Water options · ${esc(s.name)}</p><h2 id="dlgTitle">What fits this place?</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        ${ready && rec ? `<div class="person-line">${portrait('engineer', 48)}<p><b>${esc(s.people.engineer.name)}</b>, water engineer: “For ${esc(s.name)}, we recommend a <b>${esc(rec.name.toLowerCase())}</b>. ${esc(rec.reason)}”</p></div>`
          : `<div class="person-line">${portrait('engineer', 48)}<p><b>${esc(s.people.engineer.name)}</b>: “Every place has its own answer. Test the water and finish the surveys, and the options will sort themselves out.”</p></div>`}
        <ul class="opts">${card(quo)}${rest.map(card).join('')}</ul>
      </div>
      <div class="dlg-foot"><button type="button" class="btn" data-act="open-lab">${icon('flask')} Back to the lab</button>
        ${ready ? (s.flags.optionsReviewed ? '<button type="button" class="btn primary" data-act="close-dialog">Done</button>' : `<button type="button" class="btn primary" data-act="options-agree">${icon('check')} Take this to the committee</button>`) : ''}</div>`;
  };

  U.levelComplete = function (s) {
    const lvl = S().levelDef(s); const m = S().metrics(s);
    if (lvl.id === 3) {
      const tech = D().technologies[s.tech]; const mm = S().metrics(s);
      return `${banner(s, 'celebrate', `<span class="big-can">${icon('can')}</span>`)}
        <div class="dlg-head"><div><p class="kicker">Level 3 complete · ${esc(s.name)}</p><h2 id="dlgTitle">Water Project Activated!</h2></div></div>
        <div class="dlg-body">
          <p class="hero-line">The new <b>${esc(tech.name.toLowerCase())}</b> is running and tested safe. Now families start to use it.</p>
          <ul class="summary">
            <li><b>${fmt(s.water.capacityCans)}</b><span>jerry cans a day of safe water: enough for about ${fmt(Math.min(s.population, s.water.capacityCans))} people</span></li>
            <li><b>${s.baseline.roundTripMin} → ${mm.roundTripAfter} min</b><span>round trip for families who use it</span></li>
            <li><b>${fmt(mm.peopleWithWater)}</b><span>of ${fmt(s.population)} residents have reliable water so far. More will join.</span></li>
          </ul>
          <p><b>New infrastructure:</b> ${esc(tech.structureName)}${s.tech === 'gravityFed' ? ', spring box and buried pipeline' : s.tech === 'rainwater' ? ', gutters and first-flush diverter' : ', sealed borehole and concrete apron'}.</p>
          <p><b>Who keeps it running:</b> ${esc(s.people.caretaker.name)} and the water committee. ${esc(tech.maintenanceLine)}</p>
          <p class="muted">Next: <b>${esc(lvl.next)}</b>. Share the water fairly, keep it safe at home, and plan for growth.</p>
        </div>
        <div class="dlg-foot"><button type="button" class="btn primary" data-act="next-level">Continue ${icon('chev-right')}</button></div>`;
    }
    if (lvl.id === 5) return U.finale(s);
    if (lvl.id === 4) {
      const r = WV.water.residents(s); const d = D().decisions[s.water.decision];
      return `${banner(s, 'celebrate', `<span class="big-can">${icon('people')}</span>`)}
        <div class="dlg-head"><div><p class="kicker">Level 4 complete · ${esc(s.name)}</p><h2 id="dlgTitle">The water is shared</h2></div></div>
        <div class="dlg-body">
          <p class="hero-line">${fmt(r.reliable)} of ${fmt(s.population)} residents now have reliable, safe water, and more households are joining.</p>
          <ul class="summary">
            <li><b>${fmt(r.project)}</b><span>verified users of the new water point</span></li>
            <li><b>${fmt(r.existing)}</b><span>with their own safe household method</span></li>
            <li><b>${fmt(r.trying + r.partial + r.none)}</b><span>still on the way to reliable water</span></li>
          </ul>
          <p><b>The committee chose:</b> ${esc(d.name)}. ${esc(d.pros)}</p>
          <p class="muted">Next: <b>${esc(lvl.next)}</b>. Keep the system working when something breaks.</p>
        </div>
        <div class="dlg-foot"><button type="button" class="btn primary" data-act="next-level">Continue ${icon('chev-right')}</button></div>`;
    }
    if (lvl.id === 2) {
      const sc = S().sceneOf(s); const G = D().results.germ;
      const rec = S().technologyOptions(s).find((c) => c.status === 'recommended');
      const rows = Object.keys(s.results).map((id) => `<li><b>${esc(sc.hotspots.find((h) => h.id === id).label)}</b><span>Looks ${esc(sc.places[id].looks.toLowerCase())} · tested ${esc(G[s.results[id].germ].label.toLowerCase())}</span></li>`).join('');
      return `${banner(s, 'celebrate', `<span class="big-can">${icon('flask')}</span>`)}
        <div class="dlg-head"><div><p class="kicker">Level 2 complete</p><h2 id="dlgTitle">${esc(lvl.title)}</h2></div></div>
        <div class="dlg-body">
          <p class="hero-line">Clear water isn’t always safe water, and every place needs its own answer. For ${esc(s.name)}, the experts recommend a <b>${esc(rec ? rec.name.toLowerCase() : 'new water point')}</b>.</p>
          <ul class="summary two">${rows}</ul>
          <p class="muted">Next: <b>${esc(lvl.next)}</b>. The committee makes the final choice, then everyone helps build it.</p>
        </div>
        <div class="dlg-foot"><button type="button" class="btn primary" data-act="next-level">Continue ${icon('chev-right')}</button></div>`;
    }
    return `${banner(s, 'celebrate', `<span class="big-can">${icon('can')}</span>`)}
      <div class="dlg-head"><div><p class="kicker">Level ${lvl.id} complete</p><h2 id="dlgTitle">${esc(lvl.title)}</h2></div></div>
      <div class="dlg-body">
        <p class="hero-line">You met ${esc(s.people.chair.name)}, ${esc(s.people.treasurer.name)} and ${esc(s.people.caretaker.name)}, and the field-testing station is ready.</p>
        <ul class="summary">
          <li><b>${fmt(m.communityHours)} h</b><span>spent carrying water across ${esc(s.name)} every day</span></li>
          <li><b>≈ ${Math.round(m.litresPerPerson)} L</b><span>of water per person per day today</span></li>
          <li><b>${fmt(s.population)}</b><span>people the committee is planning for</span></li>
        </ul>
        <p class="muted">Next: <b>${esc(lvl.next)}</b>. Test the water, survey the land, and find out which water system fits ${esc(s.name)}.</p>
      </div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-act="next-level">Continue ${icon('chev-right')}</button></div>`;
  };

  U.menu = function (s, a, prefs) {
    return `<div class="dlg-head"><div><p class="kicker">Menu</p><h2 id="dlgTitle">${esc(s ? s.name : 'Waterworks')}</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <fieldset class="set"><legend>Music</legend>
          ${a.available ? `<label class="check"><input type="checkbox" data-act="set-mute" ${a.muted ? '' : 'checked'}> Play background music</label>
          <label class="range">Volume <input type="range" min="0" max="100" step="1" value="${Math.round(a.volume * 100)}" data-act="set-volume" aria-label="Music volume"><output id="volOut">${Math.round(a.volume * 100)}%</output></label>`
            : '<p class="muted">Music file not found. The game works without it.</p>'}
        </fieldset>
        <fieldset class="set"><legend>Comfort</legend>
          <label class="check"><input type="checkbox" data-act="set-motion" ${prefs.reducedMotion ? 'checked' : ''}> Reduce motion</label>
          ${s ? `<label class="check"><input type="checkbox" data-act="set-tips" ${s.flags.tipsOff ? '' : 'checked'}> Show tips</label>` : ''}
        </fieldset>
        ${s ? `<fieldset class="set"><legend>Village</legend><p class="muted">Progress saves automatically on this device.</p>
          <div class="row"><button type="button" class="btn" data-act="new-village">New village</button><button type="button" class="btn danger" data-act="reset-game">Reset game</button></div></fieldset>` : ''}
        <fieldset class="set about"><legend>About</legend>
          <p>${esc(D().disclaimer)}</p><p class="muted">${esc(D().gameplayNote)}</p>
          <p><a href="${esc(D().learnUrl)}" target="_blank" rel="noopener">Learn about real charity: water projects ${icon('external')}</a></p>
          <p class="muted">Also available: <a href="municipal.html">the original municipal Waterworks prototype</a>.</p></fieldset>
      </div>`;
  };
})(window);
