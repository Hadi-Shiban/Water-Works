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
    if (lvl.comingSoon) return `<span class="lbl">Up next</span><span class="txt">Level ${lvl.id}: ${esc(lvl.title)} arrives in the next build</span>${icon('chev-down')}`;
    const o = S().nextObjective(s);
    return (o ? `<span class="lbl">Objective</span><span class="txt">${esc(o.text)}</span>` : `<span class="lbl">Level complete</span><span class="txt">Ready for ${esc(lvl.next)}</span>`) + icon('chev-down');
  };

  U.stats = function (s, audioState) {
    const m = S().metrics(s);
    const sound = audioState.available
      ? `<button type="button" class="hud-btn" data-act="toggle-music" aria-pressed="${!audioState.muted}" aria-label="${audioState.muted ? 'Unmute music' : 'Mute music'}" title="${audioState.muted ? 'Unmute music' : 'Mute music'}">${icon(audioState.muted ? 'mute' : 'sound')}</button>`
      : `<button type="button" class="hud-btn" disabled aria-label="Music unavailable" title="Music unavailable">${icon('mute')}</button>`;
    return `<li class="stat people" title="Residents with reliable, safe water access"><span class="ico">${icon('people')}</span><span class="v">${fmt(m.peopleWithWater)}<small>/${fmt(s.population)}</small></span><span class="k">with reliable water</span></li>
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
    const has = s.samples.indexOf(id) >= 0; const tested = !!s.results[id];
    if (tested) return `<p class="note">${icon('check')}<span>Tested at the field lab. ${esc(S().sceneOf(s).samples[id].clue)}</span></p>`;
    if (has) return `<p class="note">${icon('flask')}<span>Sample collected. Test it at the field lab.</span></p><button type="button" class="btn primary block" data-act="open-lab">${icon('flask')} Open the field lab</button>`;
    return `<button type="button" class="btn primary block" data-act="collect-sample" data-id="${id}">${icon('can')} Collect a water sample</button>`;
  }

  U.sheet = function (s, id, ui) {
    const sc = S().sceneOf(s); const h = sc.hotspots.find((x) => x.id === id); const p = sc.places[id];
    if (!h || !p) return '';
    const kicker = { source: 'Water collection point', water: 'Water source', committee: 'Village water committee', site: 'Construction site', place: 'Place', survey: 'Survey site' }[h.kind];
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
      extra = `<div class="sec"><ul class="members">${members}</ul>
        <button type="button" class="btn ${s.flags.committeeMet ? '' : 'primary'} block" data-act="meet-committee">${icon('people')} ${s.flags.committeeMet ? 'Talk with the committee again' : 'Meet the committee'}</button></div>`;
    } else if (h.kind === 'site') {
      const b = D().builds[id]; const st = s.builds[id];
      if (st === 'built') {
        extra = `<div class="sec built-card">${icon('check', 'ic-lg')}<div><b>${esc(b.name)} built</b><p>${esc(b.text)}</p></div></div>`
          + (s.level >= 2 ? `<button type="button" class="btn primary block" data-act="open-lab">${icon('flask')} Open the field lab</button>` : '');
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
    return `<header class="sheet-head"><div><p class="kicker">${kicker}</p><h2 id="sheetTitle" tabindex="-1">${esc(h.kind === 'site' && s.builds[id] === 'built' ? D().builds[id].name : p.title)}</h2></div>${closeBtn('close-sheet')}</header>
      <div class="sheet-body">${text}${p.note ? `<p class="note">${icon('eye')}<span>${fill(p.note, s)}</span></p>` : ''}${extra}</div>`;
  };

  /* ---- Dialogs -------------------------------------------------------------------------- */
  U.briefing = function (s) {
    const sc = D().scenarios[s.scenarioId];
    return `${banner(s)}
      <div class="dlg-head"><div><p class="kicker">Project briefing · ${esc(sc.name)}</p><h2 id="dlgTitle">Welcome to ${esc(s.name)}</h2></div></div>
      <div class="dlg-body">
        <p>A local partner team, supported by a charity: water-inspired clean-water initiative, is beginning an assessment of the community’s water needs.</p>
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

  /* ---- Level 2: the field lab ------------------------------------------------------------ */
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
  function feedback(r) {
    const looksClear = r.clarity === 'clear'; const bad = r.germ !== 'safe';
    if (r.prediction === 'unsure') return bad ? 'Good instinct. You can’t tell by looking, and the test found germs.' : 'Good instinct. You can’t tell by looking.';
    if (r.prediction === 'safe' && bad) return looksClear ? 'Surprise! It looked clean, but the test found germs. Clear water isn’t always safe water.' : 'The test found germs. Cloudiness is one clue, but germs are invisible.';
    if (r.prediction === 'unsafe' && bad) return looksClear ? 'Right, even though it looks perfectly clear. Only the test could prove it.' : 'Right. The cloudiness was a clue, and the test confirms germs.';
    return 'The test agrees with what you saw.';
  }
  function sampleCard(s, id, ui) {
    const sc = S().sceneOf(s); const h = sc.hotspots.find((x) => x.id === id); const def = sc.samples[id]; const p = sc.places[id];
    const R = D().results; const r = s.results[id];
    const head = `<h3>${esc(h.label)}</h3>`;
    if (s.samples.indexOf(id) < 0) {
      return `<li class="sample empty">${head}<p class="muted">No sample yet.</p><button type="button" class="btn" data-act="goto" data-id="${id}">${icon('can')} Collect at the ${esc(h.label.toLowerCase())}</button></li>`;
    }
    if (ui.testing === id) {
      return `<li class="sample testing">${head}<div class="bench">${tube(def.clarity)}${petri(R.germ[def.germ].colonies, s.seed + id.length)}</div><p class="muted" role="status">Running the clarity and germ tests… <small>(the germ test normally incubates overnight)</small></p></li>`;
    }
    if (!r) {
      return `<li class="sample">${head}<div class="bench look">${glass(p.looks)}<span><b>Looks:</b> ${esc(p.looks)}</span></div>
        <p class="ask">Is it safe to drink? Make a guess, then run the tests.</p>
        <div class="guess" role="group" aria-label="Your guess for the ${esc(h.label)}">
          <button type="button" class="btn" data-act="predict" data-id="${id}" data-pred="safe">Looks safe</button>
          <button type="button" class="btn" data-act="predict" data-id="${id}" data-pred="unsafe">Looks unsafe</button>
          <button type="button" class="btn" data-act="predict" data-id="${id}" data-pred="unsure">Can’t tell</button></div></li>`;
    }
    const G = R.germ[r.germ];
    return `<li class="sample done">${head}<div class="bench">${tube(r.clarity)}${petri(G.colonies, s.seed + id.length)}</div>
      <dl class="results">
        <div><dt>${icon('eye')} Your eyes</dt><dd>${esc(p.looks)}</dd></div>
        <div><dt>Clarity test</dt><dd>${esc(R.clarity[r.clarity])}</dd></div>
        <div><dt>${icon('flask')} Germ test</dt><dd><span class="result ${G.tone}">${icon(r.germ === 'safe' ? 'check' : 'warn')}${esc(G.label)}</span></dd></div>
        ${r.salty ? `<div><dt>Salt strip</dt><dd><span class="result warn">${icon('warn')}Salty</span></dd></div>` : ''}
      </dl>
      <p class="verdict">${esc(feedback(r))}</p>
      <details><summary>Learn more</summary><p>The germ test looks for bacteria that live in human and animal waste. If they are there, disease-causing germs may be too. Cloudiness (turbidity) can hide germs and protect them from treatment, but clear water can carry them as well. ${esc(def.clue)}</p><p class="muted">Results here are simplified game categories, not real measurements.</p></details></li>`;
  }

  U.lab = function (s, ui) {
    const sc = S().sceneOf(s); const ids = Object.keys(sc.samples);
    const known = S().knownFacts(s);
    // Only what has been discovered so far: the site card fills in as you survey and test.
    const keys = Object.keys(D().facts); const found = keys.filter((k) => known[k]);
    const site = found.length
      ? found.map((k) => `<li class="known"><span>${esc(D().facts[k].label)}</span><b>${esc(D().facts[k].show(s.site[k]))}</b></li>`).join('')
      : `<li class="empty">Nothing surveyed yet. ${esc(s.people.engineer.name)} is waiting at the survey markers on the map.</li>`;
    const ready = S().readyForOptions(s);
    const left = []; const tests = Object.keys(s.results).length; if (tests < 2) left.push(`${2 - tests} test${2 - tests > 1 ? 's' : ''}`);
    if (s.surveys.length < 2) left.push(`${2 - s.surveys.length} survey${2 - s.surveys.length > 1 ? 's' : ''}`);
    return `<div class="dlg-head"><div><p class="kicker">Field lab · ${esc(s.name)}</p><h2 id="dlgTitle">Your eyes vs the lab</h2></div>${closeBtn()}</div>
      <div class="dlg-body">
        <ul class="samples">${ids.map((id) => sampleCard(s, id, ui)).join('')}</ul>
        <section class="sitecard"><h3 class="sec-t">Site card · ${s.surveys.length}/2 surveys · ${found.length} of ${keys.length} facts</h3><ul>${site}</ul></section>
      </div>
      <div class="dlg-foot"><p class="muted foot-note">${ready ? (s.flags.optionsReviewed ? 'The experts have shared their recommendation.' : 'Everything is in. Time to hear from the experts.') : `Still to do: ${left.join(' and ')}.`}</p>
        <button type="button" class="btn ${ready ? 'primary' : ''}" data-act="open-options">${icon('people')} Water options</button></div>`;
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
