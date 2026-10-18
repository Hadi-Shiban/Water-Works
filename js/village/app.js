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
  const ui = { selected: null, watching: false, checklistOpen: false, targets: [], busy: {}, levelShown: false, labItem: null, labBusy: null, surveying: null };
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
    $('hudStats').innerHTML = U.stats(s, audio.state());
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

  function gather(id) {
    if (ui.busy[id]) return;
    const r = sim.gather(s, id);
    if (!r.ok) { toast('Nothing left here', r.reason); return; }
    ui.busy[id] = true; setTimeout(() => (ui.busy[id] = false), prefs.reducedMotion ? 60 : 380);
    const res = D.resources[r.res];
    scene.floatText(id, `+${r.amount} ${res.name.toLowerCase()}`);
    commit(r.state);
    const v = document.querySelector(`.stat .v[data-res="${r.res}"]`);
    if (v) { v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); }
    announce(`Gathered ${r.amount} ${res.name.toLowerCase()}. You have ${s.resources[r.res]}.`);
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
    const b = D.builds[id];
    announce(`${s.people[b.builder].name} starts building the ${b.name.toLowerCase()}.`);
    setTimeout(() => {
      const f = sim.finishBuild(s, id); if (!f.ok) return;
      scene.celebrate(id);
      commit(f.state);
      toast(`${b.name} built`, 'The partner team can now test water samples here.', 'good');
      announce(`${b.name} built.`);
    }, prefs.reducedMotion ? 300 : b.buildMs);
  }

  function maybeCompleteLevel() {
    if (!s || ui.levelShown || !sim.levelReady(s)) return;
    ui.levelShown = true;
    setTimeout(() => openDialog(U.levelComplete(s), 'dlg-wide modal-strict', () => {
      const r = sim.completeLevel(s); ui.levelShown = false;
      if (r.ok) { ui.selected = null; commit(r.state); ui.checklistOpen = true; render(); }
    }), prefs.reducedMotion ? 200 : 1100);
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
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'set-volume') { audio.setVolume(el.value / 100); const o = $('volOut'); if (o) o.textContent = el.value + '%'; }
  });
  $('nameForm').addEventListener('submit', (e) => { e.preventDefault(); createVillage($('villageName').value); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('dlg').open && ui.checklistOpen) { e.preventDefault(); ui.checklistOpen = false; render(); $('hudObjective').focus(); return; }
    if (e.key === 'Escape' && !$('dlg').open && ui.selected) { e.preventDefault(); closeSheet(); }
  });
  audio.onChange(() => { if (s && !$('game').hidden) $('hudStats').innerHTML = U.stats(s, audio.state()); });

  function applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', !!prefs.reducedMotion);
    scene.setReducedMotion(prefs.reducedMotion);
  }

  /* ---- Boot ------------------------------------------------------------------------------------------ */
  document.querySelector('.start-art').style.backgroundImage = `url('${D.startArt}')`;
  $('disclaimerStart').textContent = D.disclaimer;
  applyMotion();
  showStart();

  /* Debug and test hooks (used by tests/smoke.mjs). */
  WV.debug = {
    get state() { return s; }, get ui() { return ui; },
    act, inspect, gather, build, watchWalk, committeeAgree, openLab, collectSample, labItem, labGuess, labTest, labStep, labNotes, doSurvey, openOptions, optionsAgree,
    newVillage: (name, scenarioId, salt) => { s = sim.generateVillage(name, salt == null ? 1 : salt, scenarioId); persist(); enterGame(); },
  };
})(window);
