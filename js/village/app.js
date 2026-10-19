/* =============================================================================
   WATERWORKS VILLAGE — CONTROLLER
   -----------------------------------------------------------------------------
   Owns the state, wires delegated events (data-act), saves after every change,
   and calls the pure views. The model never touches the DOM; the views never
   mutate state.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = root.WV; const D = WV.data; const sim = WV.sim; const U = WV.ui; const scene = WV.scene; const audio = WV.audio;
  const SAVE_KEY = 'waterworks-village-v1';
  const PREF_KEY = 'waterworks-village-prefs-v1';
  const $ = (id) => document.getElementById(id);

  let s = null;
  // The checklist starts collapsed: the objective chip always shows the next step,
  // and the painted map should stay visible.
  const ui = { selected: null, watching: false, checklistOpen: false, targets: [], hits: {}, breaking: {}, levelShown: false, labItem: null, labBusy: null, surveying: null };
  const prefs = (() => {
    const def = { reducedMotion: root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches };
    try { return { ...def, ...JSON.parse(root.localStorage.getItem(PREF_KEY) || '{}') }; } catch (e) { return def; }
  })();
  const savePrefs = () => { try { root.localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  const urlScenario = new URLSearchParams(root.location.search).get('scenario');

  /* ---- Persistence --------------------------------------------------------------- */
  function persist() { try { root.localStorage.setItem(SAVE_KEY, sim.serialize(s)); } catch (e) { /* private mode: play on */ } }
  function loadSave() { try { return sim.deserialize(root.localStorage.getItem(SAVE_KEY) || ''); } catch (e) { return null; } }
  function clearSave() { try { root.localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  /* ---- Announcements & toasts ------------------------------------------------------- */
  const announce = (t) => { const a = $('announcer'); a.textContent = ''; setTimeout(() => (a.textContent = t), 30); };
  function toast(title, body, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
    el.innerHTML = `<b>${title}</b>${body ? `<span>${body}</span>` : ''}`;
    el.addEventListener('click', () => el.remove());
    $('toasts').appendChild(el); setTimeout(() => el.remove(), 4200);
    while ($('toasts').children.length > 2) $('toasts').firstChild.remove();
  }

  /* ---- Targets: what the next objective points at ------------------------------------- */
  function targetsFor(st) {
    const o = sim.nextObjective(st); if (!o) return [];
    const sc = sim.sceneOf(st);
    switch (o.id) {
      case 'explore': return sc.hotspots.filter((h) => h.kind !== 'node' && st.inspected.indexOf(h.id) < 0).map((h) => h.id);
      case 'committee': return ['committee'];
      case 'source': case 'walk': return ['source'];
      case 'gather': {
        const need = { wood: st.gathered.wood < 6, stone: st.gathered.stone < 4 };
        return sc.hotspots.filter((h) => h.kind === 'node' && need[h.res] && st.nodes[h.id].charges > 0).map((h) => h.id);
      }
      case 'lab': return st.flags.committeeMet ? ['lab'] : ['committee'];
      case 'meeting': case 'choose': return ['committee'];
      case 'site': case 'build': case 'activate': case 'open': case 'share': case 'observe': return ['waterPoint'];
      case 'decide': case 'complete': return ['committee'];
      case 'inspect': case 'restore': return ['waterPoint'];
      case 'diagnose': case 'repair': return ['issue'];
      case 'review': return [];
      case 'materials': {
        const need = D.technologies[st.tech].cost;
        const short = { wood: st.resources.wood < need.wood, stone: st.resources.stone < need.stone };
        return sc.hotspots.filter((h) => h.kind === 'node' && short[h.res] && st.nodes[h.id].charges > 0).map((h) => h.id);
      }
      case 'sample': return ['source'];
      case 'bring': case 'clear': case 'dirty': case 'microscope': case 'filter': case 'notes': case 'options': return ['lab'];
      case 'surveys': return Object.keys(sc.surveys).filter((id) => st.surveys.indexOf(id) < 0);
      default: return [];
    }
  }

  /* ---- Render (focus-preserving) ------------------------------------------------------------ */
  function render() {
    if (!s) return;
    const ae = document.activeElement;
    const keep = ae && ae.dataset && ae.dataset.act && !ae.closest('#hotspots') ? { act: ae.dataset.act, id: ae.dataset.id } : null;
    ui.targets = targetsFor(s);
    $('hudId').innerHTML = U.hudId(s);
    $('hudObjective').innerHTML = U.objective(s);
    drawStats();
    const cl = $('checklist'); const obj = $('hudObjective');
    cl.hidden = !ui.checklistOpen; obj.setAttribute('aria-expanded', ui.checklistOpen ? 'true' : 'false');
    if (ui.checklistOpen) { cl.innerHTML = U.checklist(s, true); cl.style.setProperty('--cl-left', obj.offsetLeft + 'px'); }
    const sheet = $('sheet');
    if (ui.selected) { sheet.innerHTML = U.sheet(s, ui.selected, ui); sheet.hidden = false; } else { sheet.hidden = true; sheet.innerHTML = ''; }
    const g = $('guide'); const tip = s.flags.tipsOff ? '' : U.guide(s);
    g.innerHTML = tip; g.hidden = !tip;
    scene.update(s, ui);
    if (keep) {
      const el = document.querySelector(`[data-act="${keep.act}"]${keep.id ? `[data-id="${keep.id}"]` : ''}`);
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }
  }
  function commit(next) { s = next; persist(); render(); maybeCompleteLevel(); }

  /* ---- Dialog (single element, focus returns to the opener) ------------------------------- */
  let dlgReturn = null; let dlgOnClose = null;
  function openDialog(html, cls, onClose) {
    const dlg = $('dlg');
    if (!dlg.open) dlgReturn = document.activeElement;
    dlg.className = 'dlg ' + (cls || ''); dlg.innerHTML = html; dlgOnClose = onClose || null;
    if (!dlg.open) dlg.showModal();
    const first = dlg.querySelector('.btn.primary') || dlg.querySelector('button, input, a');
    if (first) first.focus();
  }
  function closeDialog() { const dlg = $('dlg'); if (dlg.open) dlg.close(); }
  $('dlg').addEventListener('close', () => {
    if (ui.allocDraft && $('dlg').classList.contains('dlg-alloc')) { ui.allocDraft = null; ui.allocOverride = false; }
    const fn = dlgOnClose; dlgOnClose = null; if (fn) fn();
    const back = dlgReturn; dlgReturn = null;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
    render();
  });
  $('dlg').addEventListener('click', (e) => { if (e.target === $('dlg') && !$('dlg').classList.contains('modal-strict')) closeDialog(); });

  /* ---- Game flow ------------------------------------------------------------------------------- */
  function showStart() {
    scene.stopWalkers();
    $('game').hidden = true; $('start').hidden = false;
    const saved = loadSave();
    const cont = $('continueBtn');
    cont.hidden = !saved;
    if (saved) cont.innerHTML = `Continue <small>${U.esc(saved.name)} · Level ${saved.level}</small>`;
    $('nameForm').hidden = true; $('startActions').hidden = false;
  }
  function showNameForm() {
    $('startActions').hidden = true; $('nameForm').hidden = false;
    const input = $('villageName'); input.value = ''; input.focus();
    $('nameError').textContent = '';
  }
  function randomSalt() {
    try { return root.crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return Math.floor(Math.random() * 4294967296); }
  }
  function createVillage(name) {
    if (!sim.validName(name)) { $('nameError').textContent = 'Please use at least two letters.'; $('villageName').focus(); return; }
    s = sim.generateVillage(name, randomSalt(), urlScenario);
    ui.selected = null; ui.levelShown = false;
    persist();
    enterGame();
  }
  function enterGame() {
    ui.hits = {}; ui.breaking = {};
    { const r = sim.regrow(s, Date.now()); if (r.changed) { s = r.state; persist(); } }
    $('start').hidden = true; $('game').hidden = false;
    audio.start(); // inside the click that started or continued the game
    scene.mount($('stage'), s, { reducedMotion: prefs.reducedMotion });
    render();
    if (!s.flags.briefingSeen) openDialog(U.briefing(s), 'dlg-wide modal-strict', () => { if (!s.flags.briefingSeen) commit(sim.setFlag(s, 'briefingSeen')); });
    else if (sim.levelReady(s)) maybeCompleteLevel();
    document.title = `${s.name} · Waterworks`;
  }

  function inspect(id) {
    const r = sim.inspect(s, id); if (!r.ok) return;
    ui.selected = id;
    ui.checklistOpen = false;
    commit(r.state);
    scene.scrollToHotspot(id);
    const t = $('sheetTitle'); if (t) t.focus({ preventScroll: true });
    const h = sim.hotspot(s, id);
    announce(`${h.label}. ${r.first ? 'New place explored.' : ''}`);
  }
  function closeSheet() {
    const id = ui.selected; ui.selected = null; render();
    if (id) scene.focusHotspot(id);
  }

  /* Gathering: three hits. The third hit awards the resource and locks the node until its
     short break animation ends, so rapid clicks can never award twice.               */
  function gather(id) {
    if (ui.breaking[id]) return;
    const r = sim.strike(s, id, ui.hits[id] || 0, Date.now());
    if (!r.ok) { toast('Growing back', r.reason); return; }
    const res = D.resources[r.res];
    if (!r.done) {
      ui.hits[id] = r.hits;
      scene.hitNode(id, r.hits);
      announce(`${res.name}: ${r.hits} of ${sim.HITS_TO_BREAK}.`);
      return;
    }
    ui.breaking[id] = true; ui.hits[id] = 0;
    scene.breakNode(id);
    scene.floatText(id, `+${r.amount} ${res.name}`);
    commit(r.state);
    const v = document.querySelector(`.stat .v[data-res="${r.res}"]`);
    if (v) { v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); }
    announce(`Gathered ${r.amount} ${res.name.toLowerCase()}. You have ${s.resources[r.res]}.`);
    setTimeout(() => { ui.breaking[id] = false; scene.resetNode(id); }, prefs.reducedMotion ? 120 : 520);
  }

  function watchWalk() {
    ui.watching = true;
    commit(sim.setFlag(s, 'walkWatched'));
    announce(`Families walk ${s.baseline.roundTripMin} minutes for each round trip, ${s.baseline.tripsPerDay} times a day.`);
    clearTimeout(ui.watchTimer);
    ui.watchTimer = setTimeout(() => { ui.watching = false; render(); }, 9000);
  }

  function meetCommittee() {
    openDialog(U.committee(s), 'dlg-wide');
  }
  function committeeAgree() {
    closeDialog();
    commit(sim.setFlag(s, 'committeeMet'));
    toast('The committee is on board', `${U.esc(s.people.chair.name)} has picked a site for a field-testing station.`, 'good');
    announce('The committee picked a site for the field-testing station.');
  }

  function build(id) {
    const r = sim.startBuild(s, id);
    if (!r.ok) { toast('Not yet', U.esc(r.reason)); announce(r.reason); return; }
    commit(r.state);
    const b = sim.buildDef(s, id);
    announce(`${s.people[b.builder].name} starts building the ${b.name.toLowerCase()}.`);
    setTimeout(() => {
      const f = sim.finishBuild(s, id); if (!f.ok) return;
      scene.celebrate(id);
      commit(f.state);
      toast(`${b.name} built`, id === 'lab' ? 'The partner team can now test water samples here.' : 'Open the site to bring the system to life.', 'good');
      announce(`${b.name} built.`);
    }, prefs.reducedMotion ? 300 : b.buildMs);
  }

  function maybeCompleteLevel() {
    if (!s || ui.levelShown || !sim.levelReady(s)) return;
    ui.levelShown = true;
    setTimeout(() => openDialog(U.levelComplete(s), s.level === 5 ? 'dlg-wide dlg-finale modal-strict' : 'dlg-wide modal-strict', () => {
      const r = sim.completeLevel(s); ui.levelShown = false;
      if (r.ok) { ui.selected = null; commit(r.state); ui.checklistOpen = true; render(); }
    }), prefs.reducedMotion ? 200 : s.level === 3 ? 3800 : s.level === 5 ? 500 : 1100); // Level 3: let the village change sink in first
  }

  function openMenu() { openDialog(U.menu(s, audio.state(), prefs), 'dlg-narrow'); }

  /* ---- Level 2: lab, samples, surveys, options ------------------------------------------ */
  // Replace an open dialog's content in place, keeping keyboard focus on the same control.
  function refreshDialog(html, cls) {
    const dlg = $('dlg'); if (!dlg.open) return openDialog(html, cls);
    const ae = document.activeElement; const keep = ae && dlg.contains(ae) && ae.dataset ? { act: ae.dataset.act, id: ae.dataset.id } : null;
    const scroll = dlg.scrollTop;
    dlg.className = 'dlg ' + (cls || ''); dlg.innerHTML = html; dlg.scrollTop = scroll;
    const el = keep && keep.act ? dlg.querySelector(`[data-act="${keep.act}"]${keep.id ? `[data-id="${keep.id}"]` : ''}`) : null;
    (el || dlg.querySelector('.btn.primary') || dlg.querySelector('button')).focus({ preventScroll: true });
  }
  const LAB_CLS = 'dlg-labscene';
  const labOpen = () => $('dlg').open && $('dlg').classList.contains(LAB_CLS);
  function showLab(focusCallout) {
    refreshDialog(U.labScene(s, ui), LAB_CLS);
    // On narrow screens the painting pans sideways: centre the selected or next hotspot.
    const stage = $('dlg').querySelector('.lab-stage');
    if (stage && stage.scrollWidth > stage.clientWidth) {
      const hs = $('dlg').querySelector('.lab-hs.active') || $('dlg').querySelector('.lab-hs.next');
      if (hs) stage.scrollLeft = hs.offsetLeft + hs.offsetWidth / 2 - stage.clientWidth / 2;
    }
    if (focusCallout) {
      const h = $('coTitle'); if (h) h.focus({ preventScroll: true });
      // When the panel sits below the painting (narrow screens), bring it into view.
      const co = $('dlg').querySelector('.callout');
      if (co && root.innerWidth <= 900) co.scrollIntoView({ block: 'nearest', behavior: prefs.reducedMotion ? 'auto' : 'smooth' });
    }
  }
  function openLab() {
    const r = sim.openLab(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    const first = r.state !== s;
    if (first) { commit(r.state); toast('Sample delivered', 'The field lab is open.', 'good'); }
    ui.labItem = null; showLab();
    const next = U.labNext(s); const b = next && $('dlg').querySelector(`.lab-hs[data-id="${next}"]`); if (b) b.focus({ preventScroll: true });
  }
  function labItem(id) {
    ui.labItem = ui.labItem === id ? null : id; showLab(!!ui.labItem);
    const h = D.lab.hotspots.find((x) => x.id === id); if (h && ui.labItem) announce(h.label);
  }
  // A short test animation, then the result. Never more than ~2 seconds.
  function labRun(kind, fn, done) {
    if (ui.labBusy) return;
    ui.labBusy = kind; showLab();
    setTimeout(() => {
      ui.labBusy = null; const r = fn();
      if (!r.ok) { toast('Not yet', U.esc(r.reason)); showLab(); return; }
      commit(r.state); showLab(true); if (done) done(r);
    }, prefs.reducedMotion ? 250 : 1800);
  }
  const germLabel = (r) => D.results.germ[r.result.germ].label;
  function labGuess(pred) { labRun('clear', () => sim.inspectJar(s, 'clear', pred), (r) => announce(`Clear sample: germ test ${germLabel(r)}.${r.result.salty ? ' Salty.' : ''}`)); }
  function labTest() { labRun('dirty', () => sim.inspectJar(s, 'dirty'), (r) => announce(`Cloudy sample: germ test ${germLabel(r)}.`)); }
  function labStep(id) {
    if (id === 'microscope') { const r = sim.useMicroscope(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; } commit(r.state); ui.labItem = 'filter'; showLab(true); return; }
    if (id === 'filter') labRun('filter', () => sim.runFilter(s), () => announce('Filtered: clearer, but germs remain.'));
  }
  function labNotes() {
    const r = sim.reviewNotes(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    if (r.state !== s) commit(r.state);
    openOptions();
  }
  function gotoSurvey() {
    const id = Object.keys(sim.sceneOf(s).surveys).find((x) => s.surveys.indexOf(x) < 0); if (!id) return;
    closeDialog(); setTimeout(() => inspect(id), 0);
  }
  /* ---- Level 3: plan, choose, activate ----------------------------------------------------- */
  function planMeeting() {
    const r = sim.planMeeting(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    if (r.state !== s) commit(r.state);
    if (s.tech) { openTech(); return; }
    openDialog(U.planning(s), 'dlg-wide');
  }
  function openTech(msg) { refreshDialog(U.techCards(s, msg), 'dlg-wide dlg-tech'); }
  function chooseTech(id) {
    if (s.tech === id) { closeDialog(); return; }
    const r = sim.chooseTech(s, id);
    if (!r.ok) { openTech(r.reason); announce(r.reason); return; }
    closeDialog(); commit(r.state);
    const t = D.technologies[s.tech];
    toast(`The committee chose: ${t.name}`, `The ${t.siteName.toLowerCase()} is marked on the map.`, 'good');
    announce(`${t.name} chosen. The construction site is marked on the map.`);
    setTimeout(() => scene.focusHotspot('waterPoint'), 50);
  }
  function activate() {
    if (ui.activating) return;
    const next = sim.nextActivation(s); if (!next) return;
    if (next.reps && (ui.pumpCount || 0) < next.reps - 1) {
      ui.pumpCount = (ui.pumpCount || 0) + 1; scene.systemFx('pump'); render();
      announce(`Stroke ${ui.pumpCount} of ${next.reps}.`); return;
    }
    ui.activating = true; if (next.effect) scene.systemFx(next.effect); render();
    setTimeout(() => {
      ui.activating = false; ui.pumpCount = 0;
      const r = sim.activate(s, next.id, Date.now());
      if (!r.ok) { toast('Not yet', U.esc(r.reason)); render(); return; }
      commit(r.state);
      announce(next.done);
      if (r.done) { scene.celebrate('waterPoint'); toast('Water is flowing!', `Capacity for about ${s.water.capacityCans} jerry cans a day. Watch families start to use it.`, 'good'); }
    }, prefs.reducedMotion ? 250 : next.effect === 'flow' ? 2900 : next.effect === 'rain' ? 2200 : 1100);
  }

  /* ---- Level 4: community panel, sharing, committee, weeks ---------------------------------- */
  function openPopulation() {
    if (!s.flags.populationPanelSeen && s.level >= 4) { s = sim.setFlag(s, 'populationPanelSeen'); persist(); }
    openDialog(U.population(s), 'dlg-narrow dlg-pop');
  }
  /* Sharing panel. The draft lives in ui.allocDraft until Apply; Cancel discards it.
     Moving a slider changes ONLY that sector (WV.water.setDraftValue) and the screen is
     updated in place, so the slider being dragged is never rebuilt.                  */
  function openAllocation(msg) {
    if (!ui.allocDraft) { ui.allocDraft = { ...s.water.allocation }; ui.allocOverride = !!s.water.clinicOverride; }
    refreshDialog(U.allocation(s, ui.allocDraft, msg, { override: ui.allocOverride }), 'dlg-wide dlg-alloc');
  }
  function syncAllocation(activeId) {
    const dlg = $('dlg'); if (!dlg.open || !ui.allocDraft) return;
    D.allocation.sectors.forEach((x) => {
      const r = U.allocRowState(s, ui.allocDraft, x.id); const row = dlg.querySelector(`[data-row="${x.id}"]`); if (!row) return;
      row.style.setProperty('--reach', r.reach.toFixed(1) + '%');
      row.style.setProperty('--val', r.val.toFixed(1) + '%');
      const note = row.querySelector('[data-note]'); if (note) note.textContent = r.note;
      const input = row.querySelector('input'); if (x.id !== activeId || Number(input.value) !== r.got) input.value = String(r.got);
      input.setAttribute('aria-valuetext', `${r.got} of ${r.need} cans, ${r.pct} percent`);
      row.querySelector('output').innerHTML = `<b>${r.got}</b> / ${r.need} cans · ${r.pct}%`;
      const chip = row.querySelector('[data-chip]'); chip.className = `chip ${r.status[1]}`; chip.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-${r.status[2]}"/></svg>${r.status[0]}`;
    });
    const b = U.allocBudget(s, ui.allocDraft);
    $('allocBudget').innerHTML = b.html; $('allocClinic').innerHTML = b.clinic; $('allocOverride').hidden = !b.o.clinicLow;
  }
  function setDraft(id, v) {
    const before = { ...ui.allocDraft };
    ui.allocDraft = WV.water.setDraftValue(s, ui.allocDraft, id, v);
    syncAllocation(id);
    if (ui.allocDraft[id] < Math.round(v) && ui.allocDraft[id] === before[id] && WV.water.budget(s, ui.allocDraft).remaining === 0) announce('No water left to share. Reduce another allocation first.');
  }
  function cancelAllocation() { ui.allocDraft = null; ui.allocOverride = false; closeDialog(); }
  function confirmAllocation() {
    const r = WV.water.setAllocation(s, ui.allocDraft, { overrideClinic: ui.allocOverride });
    if (!r.ok) { openAllocation(r.reason); return; }
    ui.allocDraft = null; ui.allocOverride = false; closeDialog(); commit(r.state);
    toast('Sharing confirmed', 'The committee will post the schedule at the water point.', 'good');
  }
  function decide(id) {
    const r = WV.water.decide(s, id); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    closeDialog(); commit(r.state);
    toast(`The committee chose: ${D.decisions[id].name}`, 'Open the water point and run the next week to see the results.', 'good');
  }
  function runWeek() {
    if (ui.running) return;
    ui.running = true; render();
    setTimeout(() => {
      ui.running = false;
      const r = WV.water.runWeek(s, Date.now()); if (!r.ok) { toast('Not yet', U.esc(r.reason)); render(); return; }
      commit(r.state);
      const res = WV.water.residents(s);
      toast(`Week ${s.water.weeksRun}`, `${res.project} residents now verified at the water point; ${res.trying} more are trying it.`, 'good');
      announce(`${sim.metrics(s).peopleWithWater} residents have reliable water.`);
    }, prefs.reducedMotion ? 200 : 1400);
  }

  /* ---- Level 5: inspect, diagnose, repair, review ------------------------------------------- */
  function maintInspect() {
    const r = WV.maint.inspect(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    commit(r.state); announce('Problem found. The problem spot is marked on the map.');
  }
  function gotoIssue() { ui.selected = null; render(); setTimeout(() => inspect('issue'), 0); }
  function maintDiagnose(id) {
    const r = WV.maint.diagnose(s, id); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    commit(r.state);
    if (r.correct) toast('Diagnosis confirmed', `${U.esc(s.people.caretaker.name)} agrees. Time to fix it.`, 'good');
    announce(r.correct ? 'Correct. Now carry out the repair.' : `Not quite. ${r.why}`);
  }
  function maintStep() {
    if (ui.repairing) return;
    const next = WV.maint.nextStep(s); if (!next) return;
    ui.repairing = true; scene.systemFx(next.id === 'test' ? 'tap' : 'pump'); render();
    setTimeout(() => {
      ui.repairing = false;
      const r = WV.maint.repairStep(s, next.id);
      if (!r.ok) { toast('Not yet', U.esc(r.reason)); render(); return; }
      commit(r.state); announce(next.done);
      if (r.done) {
        scene.celebrate('waterPoint'); ui.selected = null; render();
        toast('Repaired!', 'Full flow is back. Families who switched back to old sources will return over the next few periods.', 'good');
      }
    }, prefs.reducedMotion ? 250 : 1300);
  }
  function openReview() { openDialog(U.review(s), 'dlg-wide dlg-review'); }
  function choosePriority(id) {
    const r = WV.maint.choosePriority(s, id); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    s = r.state; persist(); refreshDialog(U.review(s), 'dlg-wide dlg-review');
  }
  function completeProject() {
    const r = WV.maint.completeProject(s); if (!r.ok) { refreshDialog(U.review(s), 'dlg-wide dlg-review'); toast('Not yet', U.esc(r.reason)); return; }
    closeDialog(); commit(r.state);
  }

  function collectSample(id) {
    const r = sim.collectSample(s, id); if (!r.ok) { toast('Not now', U.esc(r.reason)); return; }
    scene.floatText(id, '+1 water sample');
    commit(r.state);
    toast('Sample collected', 'Carry it to the field-testing station.', 'good');
    announce('Water sample collected. Bring it to the field-testing station.');
  }
  function doSurvey(id) {
    if (ui.surveying) return;
    const sv = sim.sceneOf(s).surveys[id]; if (!sv || s.surveys.indexOf(id) >= 0) return;
    ui.surveying = id; render();
    announce(`${s.people.engineer.name} is surveying.`);
    setTimeout(() => {
      ui.surveying = null;
      const r = sim.survey(s, id); if (!r.ok) { render(); return; }
      commit(r.state);
      toast(sv.title + ': done', U.esc(sv.done), 'good');
      announce(sv.done);
    }, prefs.reducedMotion ? 250 : 1500);
  }
  function openOptions() { refreshDialog(U.options(s), 'dlg-wide dlg-options'); }
  function optionsAgree() {
    const r = sim.reviewOptions(s); if (!r.ok) { toast('Not yet', U.esc(r.reason)); return; }
    closeDialog(); ui.labItem = null; commit(r.state);
    toast('Recommendation shared', 'The committee will make the final choice when building starts.', 'good');
  }

  /* ---- Events (delegated) ------------------------------------------------------------------------- */
  function act(a, id, el) {
    switch (a) {
      case 'start-game': showNameForm(); break;
      case 'continue-game': { const saved = loadSave(); if (saved) { s = saved; ui.selected = null; ui.levelShown = false; enterGame(); } else showStart(); break; }
      case 'suggest-name': { $('villageName').value = sim.suggestName(); $('villageName').focus(); break; }
      case 'cancel-name': showStart(); break;
      case 'start-menu': openDialog(U.menu(null, audio.state(), prefs), 'dlg-narrow'); break;
      case 'begin': {
        const tips = $('tipsOn'); let t = sim.setFlag(s, 'briefingSeen'); t = sim.setFlag(t, 'tipsOff', tips ? !tips.checked : false);
        s = t; persist(); closeDialog(); break;
      }
      case 'inspect': inspect(id); break;
      case 'close-sheet': closeSheet(); break;
      case 'gather': gather(id); break;
      case 'watch-walk': watchWalk(); break;
      case 'meet-committee': meetCommittee(); break;
      case 'committee-agree': committeeAgree(); break;
      case 'build': build(id); break;
      case 'toggle-checklist': ui.checklistOpen = !ui.checklistOpen; render(); break;
      case 'open-checklist': ui.checklistOpen = !ui.checklistOpen; render(); break;
      case 'hide-tips': commit(sim.setFlag(s, 'tipsOff', true)); toast('Tips hidden', 'Turn them back on from the menu.'); break;
      case 'toggle-music': audio.toggle(); break;
      case 'open-menu': openMenu(); break;
      case 'close-dialog': closeDialog(); break;
      case 'next-level': closeDialog(); break;
      case 'open-lab': openLab(); break;
      case 'collect-sample': collectSample(id); break;
      case 'lab-item': labItem(id); break;
      case 'plan-meeting': planMeeting(); break;
      case 'open-population': openPopulation(); break;
      case 'maint-inspect': maintInspect(); break;
      case 'goto-issue': gotoIssue(); break;
      case 'maint-diagnose': maintDiagnose(id); break;
      case 'maint-step': maintStep(); break;
      case 'open-review': openReview(); break;
      case 'choose-priority': choosePriority(id); break;
      case 'complete-project': completeProject(); break;
      case 'open-finale': openDialog(U.finale(s), 'dlg-wide dlg-finale'); break;
      case 'open-allocation': ui.allocDraft = null; openAllocation(); break;
      case 'alloc-reset': ui.allocDraft = WV.water.defaultAllocation(s); syncAllocation(null); break;
      case 'alloc-cancel': cancelAllocation(); break;
      case 'alloc-confirm': confirmAllocation(); break;
      case 'open-decision': openDialog(U.decision(s), 'dlg-wide dlg-tech'); break;
      case 'decide': decide(id); break;
      case 'run-week': runWeek(); break;
      case 'open-tech': openTech(); break;
      case 'choose-tech': chooseTech(id); break;
      case 'activate': activate(); break;
      case 'lab-guess': labGuess(el.dataset.pred); break;
      case 'lab-test': labTest(); break;
      case 'lab-step': labStep(id); break;
      case 'lab-notes': labNotes(); break;
      case 'lab-goto-survey': gotoSurvey(); break;
      case 'survey': doSurvey(id); break;
      case 'open-options': openOptions(); break;
      case 'options-agree': optionsAgree(); break;
      case 'new-village':
        if (root.confirm('Start a new village? Your current village will be replaced.')) { closeDialog(); s = null; showStart(); showNameForm(); }
        break;
      case 'reset-game':
        if (root.confirm('Reset the game? This deletes your saved village on this device.')) { closeDialog(); clearSave(); s = null; showStart(); }
        break;
      default: break;
    }
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.matches('input, select, textarea')) return;
    if (el.disabled) return;
    act(el.dataset.act, el.dataset.id, el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target; const a = el.dataset && el.dataset.act; if (!a) return;
    if (a === 'set-mute') audio.setMuted(!el.checked);
    else if (a === 'set-motion') { prefs.reducedMotion = el.checked; savePrefs(); applyMotion(); }
    else if (a === 'set-tips' && s) commit(sim.setFlag(s, 'tipsOff', !el.checked));
    else if (a === 'alloc-override') ui.allocOverride = el.checked;
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'alloc') { setDraft(el.dataset.id, Number(el.value)); return; }
    if (el.dataset && el.dataset.act === 'set-volume') { audio.setVolume(el.value / 100); const o = $('volOut'); if (o) o.textContent = el.value + '%'; }
  });
  $('nameForm').addEventListener('submit', (e) => { e.preventDefault(); createVillage($('villageName').value); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('dlg').open && ui.checklistOpen) { e.preventDefault(); ui.checklistOpen = false; render(); $('hudObjective').focus(); return; }
    if (e.key === 'Escape' && !$('dlg').open && ui.selected) { e.preventDefault(); closeSheet(); }
  });
  audio.onChange(() => { if (s && !$('game').hidden) drawStats(); });

  function applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', !!prefs.reducedMotion);
    scene.setReducedMotion(prefs.reducedMotion);
  }

  /* Regrowth tick: once a second, give depleted spots their charges back when due. */
  setInterval(() => {
    if (!s || $('game').hidden) return;
    const r = sim.regrow(s, Date.now());
    if (r.changed) { s = r.state; persist(); scene.update(s, { ...ui, targets: targetsFor(s) }); }
    const a = WV.water.stepIfDue(s, Date.now());
    if (a.changed) {
      const firstUsers = s.water.hh.project === 0 && a.state.water.hh.project > 0;
      commit(a.state);
      if (firstUsers) toast('The first households are using the water point', 'Capacity isn’t access yet: each family joins, then the service has to prove reliable for them.', 'good');
    }
  }, 1000);

  /* The headline count eases toward its new value instead of jumping. */
  let shown = null; let countRaf = 0;
  function drawStats() {
    $('hudStats').innerHTML = U.stats(s, audio.state());
    const el = $('reliableCount'); if (!el) return;
    const target = sim.metrics(s).peopleWithWater;
    if (shown == null || prefs.reducedMotion) shown = target;
    el.textContent = shown.toLocaleString('en-US');
    if (shown === target) return;
    const from = shown; const t0 = performance.now(); cancelAnimationFrame(countRaf);
    el.parentElement.classList.add('counting');
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1200); shown = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      const node = $('reliableCount'); if (node) node.textContent = shown.toLocaleString('en-US');
      if (k < 1) countRaf = requestAnimationFrame(tick); else if (node) node.parentElement.classList.remove('counting');
    };
    countRaf = requestAnimationFrame(tick);
  }

  /* ---- Boot ------------------------------------------------------------------------------------------ */
  document.querySelector('.start-art').style.backgroundImage = `url('${D.startArt}')`;
  $('disclaimerStart').textContent = D.disclaimer;
  applyMotion();
  showStart();

  /* Debug and test hooks (used by tests/smoke.mjs). */
  WV.debug = {
    get state() { return s; }, get ui() { return ui; },
    act, inspect, gather, build, maintInspect, maintDiagnose, maintStep, choosePriority, completeProject, planMeeting, chooseTech, activate, openPopulation, confirmAllocation, cancelAllocation, setDraft, decide, runWeek, watchWalk, committeeAgree, openLab, collectSample, labItem, labGuess, labTest, labStep, labNotes, doSurvey, openOptions, optionsAgree,
    newVillage: (name, scenarioId, salt) => { s = sim.generateVillage(name, salt == null ? 1 : salt, scenarioId); persist(); enterGame(); },
  };
})(window);
