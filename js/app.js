/* =============================================================================
   WATERWORKS WIREFRAME — CONTROLLER
   -----------------------------------------------------------------------------
   Owns state + ui, wires events, and calls the pure views. Local state only:
   a refresh resets the prototype.
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = root.WW, D = WW.data, sim = WW.sim, V = WW.views;
  const STORAGE_KEY = 'waterworks-save-v1';
  const ENVIRONMENTS = {
    'alpine-headwaters': { id: 'alpine-headwaters', title: 'Alpine Headwaters', chapter: 1, image: 'assets/environments/env-01-alpine-headwaters.png' },
    'aspen-river': { id: 'aspen-river', title: 'Aspen River Bend', chapter: 2, image: 'assets/environments/env-02-aspen-river.png' },
    'meadow-reservoir': { id: 'meadow-reservoir', title: 'Meadow Reservoir', chapter: 3, image: 'assets/environments/env-03-meadow-reservoir.png' },
    'wetland-crossroads': { id: 'wetland-crossroads', title: 'Wetland Crossroads', chapter: 4, image: 'assets/environments/env-04-wetland-crossroads.png' },
    'redrock-resilience': { id: 'redrock-resilience', title: 'Canyon of Resilience', chapter: 5, image: 'assets/environments/env-05-redrock-resilience.png' }
  };
  const AUDIO = {
    volumes: { master: 0.8, music: 0.42, nature: 0.65, interface: 0.55 },
    enabled: false,
    initialized: false,
    cueNames: ['select', 'success', 'warning', 'test-complete', 'day-complete']
  };
  const tutorialSteps = [
    { id: 'water-source', title: 'Follow the water', message: 'Water must pass through treatment before the community can use it safely. Select the treatment plant to see what changes.', target: '#obj-plant', placement: 'bottom', actionLabel: 'Next' },
    { id: 'test', title: 'Test before you trust it', message: 'A clear-looking sample can still hide microbial risk. Use the lab test to check what the eye cannot see.', target: '[data-act="test"]', placement: 'bottom', actionLabel: 'Next' },
    { id: 'allocate', title: 'Share the flow', message: 'The community can only use water that is delivered. Decide who gets the daily share before you run the day.', target: '[data-act="loop"][data-id="allocate"]', placement: 'bottom', actionLabel: 'Next' },
    { id: 'repair', title: 'Fix the leak', message: 'A leak steals water without making it to the taps. Repairing it recovers flow and saves time for the community.', target: '[data-act="repair"]', placement: 'bottom', actionLabel: 'Finish' }
  ];
  const chapterGoals = [
    { day: 1, title: 'Day 1 · Follow the water', objective: 'Inspect the source, set a calm intake, and run the day to see water travel from the lake to the community.', check: (state, derived, ui) => ui.loop.observed && state.intake <= 130 },
    { day: 2, title: 'Day 2 · Make water safe', objective: 'Test the source, then compare filtered and disinfected water before you run the day.', check: (state, derived, ui) => !!state.tested && state.stages.includes('media') && state.stages.includes('disinfection') },
    { day: 3, title: 'Day 3 · Share the flow', objective: 'Allocate water to the community and repair the visible leak to recover flow for homes and school.', check: (state, derived, ui) => !!ui.lastRepair && ui.loop.allocated },
    { day: 4, title: 'Day 4 · Calm challenge', objective: 'Keep tap water safe, serve at least 80% of demand, and finish with at least 20 units in storage.', check: (state, derived) => derived.quality >= 80 && derived.reliablePeople >= Math.round(state.population * 0.8) && state.storage >= 20 }
  ];
  const $ = (id) => document.getElementById(id);
  const fmt = (v) => Math.round(v).toLocaleString('en-US');
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

  let s, d, ui;

  function saveProgress(partial) {
    const current = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; } })();
    const next = { ...current, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function renderChapterBanner() {
    const banner = document.getElementById('chapterBanner');
    if (!banner) return;
    const day = Number(ui && ui.chapterDay ? ui.chapterDay : 1);
    const chapter = chapterGoals[Math.min(chapterGoals.length - 1, Math.max(0, day - 1))];
    if (!ui || !ui.started || !chapter) {
      banner.hidden = true;
      banner.textContent = '';
      return;
    }
    const met = chapter.check(s, d, ui);
    banner.hidden = false;
    banner.classList.toggle('complete', !!met);
    banner.innerHTML = `<strong>${chapter.title}</strong><span>${chapter.objective}</span>`;
  }

  function setChapterDay(day) {
    ui.chapterDay = Math.min(chapterGoals.length, Math.max(1, Number(day) || 1));
    saveProgress({ chapterDay: ui.chapterDay, chapterComplete: !!ui.chapterComplete });
    renderChapterBanner();
  }

  function onChapterProgress() {
    if (!ui || !chapterGoals.length) return;
    const current = chapterGoals[Math.max(0, Math.min(chapterGoals.length - 1, (ui.chapterDay || 1) - 1))];
    if (!current || !current.check(s, d, ui)) return;
    if (ui.chapterDay >= chapterGoals.length) {
      ui.chapterComplete = true;
      saveProgress({ chapterComplete: true, chapterDay: ui.chapterDay });
      openChapterComplete();
      toast('ALPINE HEADWATERS COMPLETE', 'The chapter is complete. Aspen River Bend is now unlocked.', 'good');
      renderChapterBanner();
      return;
    }
    const nextDay = Math.min(chapterGoals.length, ui.chapterDay + 1);
    ui.chapterDay = nextDay;
    saveProgress({ chapterDay: ui.chapterDay, chapterComplete: false });
    const nextGoal = chapterGoals[Math.max(0, Math.min(chapterGoals.length - 1, nextDay - 1))];
    toast(`Day ${ui.chapterDay - 1} complete`, `Next objective: ${nextGoal.title}.`, 'good');
    renderChapterBanner();
  }

  function persistGameState() {
    saveProgress({
      started: ui.started, chapterDay: ui.chapterDay, chapterComplete: !!ui.chapterComplete,
      tutorialSkipped: !!loadProgress().tutorialSkipped,
      gameState: { day: s.day, funding: s.funding, knowledge: s.knowledge, storage: s.storage, intake: s.intake, allocation: { ...s.allocation }, stages: [...s.stages], tested: !!s.tested, done: [...s.done], loss: { ...s.loss }, distributionPenalty: s.distributionPenalty },
      uiState: { selected: ui.selected, lastRepair: ui.lastRepair, loop: { ...ui.loop } }
    });
  }

  function openChapterComplete() {
    const summary = ui.lastSummary;
    const dialog = $('dlgChapterComplete');
    if (!dialog || !summary) return;
    dialog.innerHTML = `<div class="dlg-head"><div><p class="kicker">Chapter complete</p><h2 id="chapterCompleteTitle">ALPINE HEADWATERS COMPLETE</h2></div><button type="button" class="icon-btn" data-close aria-label="Close">×</button></div>
      <div class="dlg-body"><p class="hero-line">You followed the water from the mountain source through treatment, storage, and the community.</p>
      <div class="summary-grid"><div><b>Water delivered</b><strong>${n1(summary.delivered)}</strong></div><div><b>People served</b><strong>${fmt(summary.after.people)}</strong></div><div><b>Water saved by repair</b><strong>${ui.lastRepair ? n1(ui.lastRepair.to - ui.lastRepair.from) : '0.0'}</strong></div><div><b>Community time reclaimed</b><strong>${n1(summary.reclaimedHours)} h</strong></div></div>
      <p class="note">Science fact: filtration clears particles, while disinfection targets microbial risk. Clear water is not automatically safe water.</p></div>
      <div class="dlg-foot"><button type="button" class="btn" data-act="replay-chapter">Replay chapter</button><button type="button" class="btn" data-act="explore-free">Explore freely</button><button type="button" class="btn primary" data-act="continue-aspen">Continue to Aspen River Bend</button></div>`;
    if (!dialog.open) dialog.showModal();
  }

  function setEnvironment(id) {
    const env = ENVIRONMENTS[id] || ENVIRONMENTS['alpine-headwaters'];
    ui.currentEnvironment = env.id;
    document.documentElement.style.setProperty('--env-image', `url('${env.image}')`);
    document.body.style.setProperty('--env-image', `url('${env.image}')`);
    const art = document.querySelector('.start-art'); if (art) art.style.backgroundImage = `url('${env.image}')`;
    saveProgress({ environment: env.id, chapter: env.chapter });
  }

  function initAudioSystem() {
    if (AUDIO.initialized) return;
    AUDIO.initialized = true;
    const progress = loadProgress();
    AUDIO.volumes = { ...AUDIO.volumes, ...(progress.audio || {}) };
    AUDIO.enabled = !!progress.audioEnabled;
    WW.audio = {
      init() { AUDIO.enabled = true; AUDIO.initialized = true; saveProgress({ audioEnabled: true, audio: AUDIO.volumes }); },
      setVolume(channel, value) { AUDIO.volumes[channel] = value; saveProgress({ audio: AUDIO.volumes }); },
      playCue(cueName) { if (!AUDIO.enabled) return; const file = `assets/audio/ui/${cueName}.ogg`; if (file) { /* silent fallback: files are intentionally optional */ } },
      reset() { AUDIO.enabled = false; saveProgress({ audioEnabled: false }); }
    };
  }

  function startJourney() {
    resetChapterState();
    ui.started = true; ui.chapterDay = 1; ui.tutorialVisible = true; saveProgress({ started: true, chapterDay: 1, tutorialSkipped: false });
    document.getElementById('startShell').classList.add('hidden');
    WW.audio && WW.audio.init && WW.audio.init();
    renderChapterBanner();
    openTutorialStep(0);
  }

  function continueJourney() {
    ui.started = true; document.getElementById('startShell').classList.add('hidden');
    const progress = loadProgress();
    restoreGameState(progress.gameState, progress.uiState);
    ui.chapterDay = Number(progress.chapterDay || ui.chapterDay || 1);
    renderChapterBanner();
    if (progress.tutorialSkipped) closeTutorial(); else openTutorialStep(progress.tutorialStep || 0);
  }

  function openTutorialStep(index) {
    ui.tutorialVisible = true;
    const panel = document.getElementById('tutorialOverlay');
    const step = tutorialSteps[index] || tutorialSteps[tutorialSteps.length - 1];
    if (!panel) return;
    document.body.dataset.tutorialIndex = String(index);
    panel.classList.remove('hidden');
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialMessage').textContent = step.message;
    const nextBtn = document.querySelector('[data-act="tutorial-next"]');
    const backBtn = document.querySelector('[data-act="tutorial-back"]');
    if (nextBtn) nextBtn.textContent = step.actionLabel || 'Next';
    if (step.id === 'water-source') { nextBtn.textContent = 'Next'; }
    if (backBtn) backBtn.disabled = index === 0;
    const target = step.target ? document.querySelector(step.target) : null;
    document.querySelectorAll('.tutorial-focus').forEach((el) => el.classList.remove('tutorial-focus'));
    if (target) {
      target.classList.add('tutorial-focus');
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
    saveProgress({ tutorialStep: index, tutorialSkipped: false });
  }

  function closeTutorial() {
    const panel = document.getElementById('tutorialOverlay'); if (panel) panel.classList.add('hidden');
    document.querySelectorAll('.tutorial-focus').forEach((el) => el.classList.remove('tutorial-focus'));
    ui.tutorialVisible = false;
    saveProgress({ tutorialStep: 0, tutorialSkipped: false });
  }

  function skipTutorial() {
    const confirmed = window.confirm('Skip the guided trail? You can reopen it from the Guidebook.');
    if (!confirmed) return;
    closeTutorial();
    saveProgress({ tutorialSkipped: true, tutorialStep: 0 });
  }

  function showGuidebook() {
    if (!ui.started) return;
    openTutorialStep(0);
  }

  function resetChapterState() {
    s = freshState(); d = sim.compute(s); s.allocation = { ...d.allocation }; ui = freshUi(); ui.snap = snapshot(d);
  }

  function restoreGameState(saved, savedUi) {
    if (!saved) return;
    Object.keys(saved).forEach((key) => { if (key in s && key !== 'allocation' && key !== 'stages' && key !== 'done' && key !== 'loss') s[key] = saved[key]; });
    if (saved.allocation) s.allocation = { ...s.allocation, ...saved.allocation };
    if (saved.stages) s.stages = [...saved.stages];
    if (saved.done) s.done = [...saved.done];
    if (saved.loss) s.loss = { ...s.loss, ...saved.loss };
    if (saved.distributionPenalty !== undefined) s.distributionPenalty = saved.distributionPenalty;
    if (savedUi) { ui.selected = savedUi.selected || ui.selected; ui.lastRepair = savedUi.lastRepair || null; ui.loop = { ...ui.loop, ...(savedUi.loop || {}) }; }
    commit(); ui.snap = snapshot(d);
  }

  function freshUi() {
    return {
      selected: 'reservoir', project: null, preview: null,
      railOpen: ['treatment'], railCollapsed: root.innerWidth < 1200,
      overlays: { flow: true, runoff: true, waste: true, labels: true },
      speed: 'pause', dayProgress: 0,
      loop: { observed: false, tested: false, allocated: false, built: false },
      snap: null, lastSummary: null, lastRepair: null,
      ph: D.waterState.sourceLoads.ph, stageSel: 'media', bypass: [],
      quickBuild: true, reduceMotion: false, sampleFocus: null,
      draft: null, override: false, legendOpen: false, dashClosed: false, changed: null, trace: false,
      gateDays: D.scenario.gateDaysDone,
    };
  }
  function freshState() { const st = sim.initialState(); st.done = []; st.sampleStale = false; st.sampled = null; st.intakeBefore = null; return st; }
  const snapshot = (dd) => ({ scores: { ...dd.scores }, ws: dd.ws, people: dd.reliablePeople, hoursLost: dd.hoursLost, routines: Object.keys(dd.routines).reduce((o, k) => ((o[k] = dd.routines[k].hours), o), {}), tiers: Object.keys(dd.sectors).reduce((o, k) => ((o[k] = dd.sectors[k].tier), o), {}) });

  function renderStartShell() {
    const progress = loadProgress();
    const started = !!progress.started || !!ui.started;
    const shell = document.getElementById('startShell');
    if (shell) shell.classList.toggle('hidden', started);
    const continueBtn = document.getElementById('continueJourneyBtn');
    if (continueBtn) continueBtn.disabled = !progress.started;
  }

  /* ---- render with focus + scroll preservation ---------------------------------- */
  function render(skip) {
    const ae = document.activeElement;
    const keep = ae && ae.dataset && (ae.dataset.act || ae.dataset.sample) ? { act: ae.dataset.act, id: ae.dataset.id, sample: ae.dataset.sample } : null;
    const insTop = $('inspector').scrollTop; const railScroll = document.querySelector('.rail-scroll'); const railTop = railScroll ? railScroll.scrollTop : 0;
    $('app').dataset.rail = ui.railCollapsed ? 'collapsed' : 'open';
    $('app').dataset.dash = ui.dashClosed ? 'closed' : 'open';
    V.topbar(s, d, ui);
    $('loopbar').innerHTML = V.loopbar(s, d, ui);
    const tools = $('maptools'); const legendWasOpen = tools.querySelector('.legend') ? tools.querySelector('.legend').open : ui.legendOpen; ui.legendOpen = legendWasOpen;
    tools.innerHTML = V.maptools(s, d, ui); $('weatherbox').innerHTML = V.weather(s, d, ui);
    $('journey').innerHTML = V.journey(s, d, ui);
    WW.map.update(s, d, ui);
    $('railInner').classList.toggle('rail-collapsed', ui.railCollapsed);
    if (skip !== 'rail') $('railInner').innerHTML = V.rail(s, d, ui);
    if (skip !== 'inspector') $('inspector').innerHTML = V.inspector(s, d, ui);
    if (skip !== 'dashboard') $('dashboard').innerHTML = V.dashboard(s, d, ui);
    if (ui.draft) V.drawerSync($('allocDrawer'), s, d, ui);
    if (skip !== 'inspector') $('inspector').scrollTop = ui.resetScroll ? 0 : insTop;
    ui.resetScroll = false;
    const rs = document.querySelector('.rail-scroll'); if (rs) rs.scrollTop = railTop;
    if (keep) {
      let el = null;
      if (keep.sample) el = document.querySelector(`[data-sample="${keep.sample}"]`);
      else el = document.querySelector(`[data-act="${keep.act}"]${keep.id ? `[data-id="${keep.id}"]` : ''}`);
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }
  }
  function commit() {
    const prev = { ...s.allocation };
    d = sim.compute(s);
    s.allocation = { ...d.allocation };
    const moved = Object.keys(prev).map((k) => ({ k, v: s.allocation[k] - prev[k] })).filter((x) => Math.abs(x.v) >= 0.05);
    return moved;
  }
  const nameOf = (k) => D.allocationSectors.find((x) => x.id === k).name;

  /* ---- toasts / announcer ---------------------------------------------------------- */
  function toast(title, body, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.innerHTML = `<b>${title}</b>${body || ''}`;
    el.addEventListener('click', () => el.remove()); $('toasts').appendChild(el); setTimeout(() => el.remove(), 5500);
    while ($('toasts').children.length > 2) $('toasts').firstChild.remove();
  }
  const announce = (t) => { $('announcer').textContent = ''; setTimeout(() => ($('announcer').textContent = t), 30); };

  /* ---- dialogs ----------------------------------------------------------------------- */
  /* Focus is remembered by data-act/data-id (not by node) because renders replace nodes. */
  const describe = (el) => (el && el.dataset && (el.dataset.act || el.dataset.sample) ? { act: el.dataset.act, id: el.dataset.id, sample: el.dataset.sample, cat: el.classList.contains('obj') } : el && el.classList && el.classList.contains('obj') ? { obj: el.dataset.id } : el && el.id ? { elId: el.id } : null);
  function refocus(desc) {
    if (!desc) return false; let el = null;
    if (desc.obj) el = document.querySelector(`.obj[data-id="${desc.obj}"]`);
    else if (desc.elId) el = document.getElementById(desc.elId);
    else if (desc.sample) el = document.querySelector(`[data-sample="${desc.sample}"]`);
    else if (desc.act) el = document.querySelector(`[data-act="${desc.act}"]${desc.id ? `[data-id="${desc.id}"]` : ''}`);
    if (el) { el.focus({ preventScroll: true }); return true; } return false;
  }
  const dlgReturn = {};
  function openDlg(id, html) { const dlg = $(id); if (!dlg.open) dlgReturn[id] = describe(document.activeElement); dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); return dlg; }
  document.querySelectorAll('dialog').forEach((dlg) => dlg.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) setTimeout(() => { if (document.activeElement === document.body || !document.activeElement) refocus(dlgReturn[dlg.id]); }, 0); }));
  function anyDialogOpen() { return !!document.querySelector('dialog[open]'); }
  function openEvent() { openDlg('dlgEvent', V.eventDialog(s, d, ui)); }
  function openSecurity() { openDlg('dlgSecurity', V.securityDialog(s, d, ui)); }

  /* ---- selection & rail ---------------------------------------------------------------- */
  const LABELS = { watershed: 'Upper watershed', reservoir: 'River and reservoir', intake: 'Intake', plant: 'Treatment plant', storage: 'Treated storage', pipeD1: 'District 1 main', pipeD2: 'District 2 main', pipeD3: 'District 3 main', wwtp: 'Wastewater plant', wetland: 'Wetland buffer' };
  function selectObject(id) {
    ui.selected = id; ui.project = null; ui.preview = null; ui.loop.observed = true; ui.resetScroll = true;
    if (id === 'wetland') { ui.project = 'wetland'; ui.preview = 'wetland'; }
    if (id === 'plant') ui.stageSel = ui.stageSel || 'media';
    render();
    const b = D.communityBuildings.find((x) => x.id === id);
    announce('Inspecting ' + (b ? b.name : LABELS[id] || id));
  }
  function openItem(id) {
    const f = V.findItem(id); if (!f) return;
    const it = f.item;
    if (it.action === 'test') return doTest();
    if (it.action === 'runoff') return traceRunoff();
    if (it.action === 'routines') return openDlg('dlgRoutines', V.routinesDialog(s, d, ui));
    ui.project = id; ui.preview = it.ghost || null; ui.resetScroll = true;
    if (ui.railOpen.indexOf(f.cat.id) < 0) ui.railOpen.push(f.cat.id);
    render(); announce('Project: ' + it.name);
  }

  /* ---- actions ------------------------------------------------------------------------- */
  function spend(cost, what) {
    if (s.funding < cost) { toast('Not enough funds', `${what} costs ${fmt(cost)}. You have ${fmt(s.funding)}.`, 'bad'); return false; }
    s.funding -= cost; return true;
  }
  function doTest() {
    if (!spend(400, 'A water test')) return;
    const before = V.labView(s, d);
    s.tested = true; s.sampleStale = false; s.sampled = null; s.knowledge += 2; ui.loop.tested = true;
    commit();
    const after = V.labView(s, d); ui.changed = {};
    ['src', 'plant', 'tap'].forEach((c) => D.loadKeys.forEach((k) => { if (Math.abs(after[c][k] - before[c][k]) > 0.05) ui.changed[c + k] = true; }));
    ui.selected = 'reservoir'; ui.project = null; ui.preview = null; ui.resetScroll = true;
    render();
    const b = sim.band(after.src.microbial).label.toLowerCase();
    toast('Sample taken · +2 research', `Source microbial risk is <b>${n1(after.src.microbial)}</b> (${b}). Only turbidity <b>${n1(after.src.turbidity)}</b> was visible to the eye.`, 'good');
    announce('Water tested. Source microbial risk ' + n1(after.src.microbial));
    setTimeout(() => { ui.changed = null; }, 1600);
  }
  function traceRunoff() {
    ui.overlays.runoff = true; ui.trace = true; ui.selected = 'watershed'; ui.project = null; ui.preview = null; ui.loop.observed = true; ui.resetScroll = true;
    render(); toast('Runoff route highlighted', 'Water leaving the farm carries nutrients and microbes toward the river, upstream of the intake.');
    setTimeout(() => { ui.trace = false; WW.map.update(s, d, ui); }, 4500);
  }
  function doRepair() {
    if (!d.leak) return;
    if (!spend(3200, 'The repair')) return;
    const from = d.delivered;
    sim.repairLeak(s); const moved = commit();
    ui.lastRepair = { from, to: d.delivered }; ui.loop.built = true;
    render();
    const extra = moved.filter((m) => m.v > 0).map((m) => `${nameOf(m.k)} +${n1(m.v)}`).join(', ');
    toast('Leak repaired', `Delivered water ${n1(from)} → <b>${n1(d.delivered)}</b> units/day (+${n1(d.delivered - from)}) with river intake unchanged at ${s.intake}.${extra ? `<br>Recovered water was assigned by priority: ${extra}.` : ''}`, 'good');
    announce('Leak repaired. Delivered water increased by ' + n1(d.delivered - from));
  }
  function doMaintain() {
    if (!spend(2400, 'Maintenance')) return;
    s.plant.condition = Math.min(1, s.plant.condition + 0.08); commit(); ui.loop.built = true; render();
    toast('Preventive maintenance done', `Plant condition ${Math.round(s.plant.condition * 100)}%. Effective capacity is now ${n1(d.effCap)} units/day.`, 'good');
  }
  function approve(id) {
    const f = V.findItem(id); if (!f) return; const it = f.item;
    if (it.action === 'repair') return doRepair();
    if (V.itemStatus(it, s) !== 'available') return;
    if (!spend(it.cost, it.name)) return;
    const days = it.days ? (ui.quickBuild ? 1 : it.days) : 0;
    if (days === 0) { sim.applyEffects(s, it); s.done.push(id); }
    else s.projects.push({ id, name: it.name, ghost: it.ghost || id, daysLeft: days });
    ui.loop.built = true; commit(); render();
    const obl = (it.obligations || []).slice(0, 2).join('; ');
    toast(days ? `${it.name} approved` : `${it.name} done`, days ? `Ready after ${days} Run Day${days > 1 ? 's' : ''}.${obl ? '<br>You take on: ' + obl + '.' : ''}` : '', 'good');
  }
  function triggerRain() {
    s.sampled = { src: { ...d.steps[0].load }, plant: { ...d.outlet }, tap: { ...d.tap } };
    s.sampleStale = true; s.tested = false; s.intakeBefore = s.intake; s.event = { status: 'active', choice: null };
    commit(); render(); openEvent();
  }
  function applyChoice(c) {
    if (c === 2 && !spend(1800, 'The extra shift')) return;
    s.event = { status: 'resolved', choice: c };
    if (c === 1) s.intake = 110;
    commit(); ui.loop.built = true; $('dlgEvent').close(); render();
    const msg = { 1: `Intake cut to 110. The plant is no longer strained; storage will fall to about ${fmt(d.closingStorage)} units.`, 2: `Extra shift running. Plant load ${Math.round(d.loadRatio * 100)}% of effective capacity. Cost 1,800.`, 3: `Plant load ${Math.round(d.loadRatio * 100)}% of effective capacity. Watch turbidity and tap quality.` }[c];
    toast('Response set: ' + D.dailyEvent.choices[c - 1].title, msg, c === 3 ? 'bad' : 'good');
  }

  /* ---- Run Day ---------------------------------------------------------------------------- */
  function runDay() {
    if (s.event.status === 'active') { toast('Respond to the storm first', 'Choose a response to the heavy rain before the day runs.', 'bad'); openEvent(); return; }
    setSpeed('pause'); ui.dayProgress = 0;
    const pre = d, before = ui.snap || snapshot(pre);
    const endS = sim.clone(s); endS.storage = pre.closingStorage; const dEnd = sim.compute(endS);
    const completed = []; const notes = []; const openStorage = s.storage;
    const stormChoice = s.event.status === 'resolved' ? s.event.choice : null;

    // --- advance the world one day
    s.funding += Math.round(pre.net); s.storage = pre.closingStorage; s.day += 1;
    s.projects.forEach((p) => p.daysLeft--);
    const fin = s.projects.filter((p) => p.daysLeft <= 0);
    s.projects = s.projects.filter((p) => p.daysLeft > 0);
    fin.forEach((p) => { const it = V.findItem(p.id).item; sim.applyEffects(s, it); s.done.push(p.id); completed.push(it); });
    if (stormChoice) { s.knowledge += 3; s.intake = s.intakeBefore || 160; notes.push({ tone: 'good', icon: 'flask', text: 'Recovered from the storm: +3 research knowledge. Intake returns to normal operation.' }); }
    if (s.event.status === 'resolved') s.event = { status: 'passed', choice: stormChoice };
    if (dEnd.quality >= 80 && !dEnd.advisory) s.knowledge += 1;
    s.sampleStale = false; s.sampled = null;
    if (dEnd.ws >= 70) ui.gateDays = Math.min(D.scenario.gateDaysNeeded, ui.gateDays + 1); else ui.gateDays = 0;
    commit();

    // --- explain
    const after = { scores: dEnd.scores, ws: dEnd.ws, people: dEnd.reliablePeople };
    const rDelta = {}; Object.keys(dEnd.routines).forEach((k) => (rDelta[k] = before.routines[k] - dEnd.routines[k].hours));
    let hero;
    const repaired = ui.lastRepair && !ui.lastRepairShown;
    const schoolNow = dEnd.sectors.school.tier, schoolBefore = before.tiers ? before.tiers.school : 'reduced';
    if (repaired) {
      const recovered = Math.round(ui.lastRepair.to - ui.lastRepair.from);
      const mayaH = rDelta.maya;
      hero = `Repairing the District 2 leak recovered ${recovered} water units without increasing river intake.` + (schoolNow === 'full' && schoolBefore !== 'full' ? ` The school now has reliable service, returning ${mayaH > 0 ? (mayaH % 1 ? mayaH.toFixed(1) : mayaH) : 'some'} hours to Maya’s daily schedule.` : ` Delivered water rose to ${n1(pre.delivered)} units a day.`);
      ui.lastRepairShown = true;
    } else if (stormChoice) {
      hero = { 1: `Cutting intake to 110 kept the plant inside its capacity, so treated water stayed clear through the storm. The price was reserve: storage fell from ${fmt(openStorage)} to ${fmt(pre.closingStorage)} units.`,
        2: `The extra shift kept plant load near ${Math.round(pre.loadRatio * 100)}% of effective capacity, so tap quality held close to normal. It cost 1,800 funds and more energy.`,
        3: `Rain pushed load to ${Math.round(pre.loadRatio * 100)}% of the plant’s effective capacity, so every stage removed less. Tap turbidity rose to ${n1(dEnd.tap.turbidity)} and ${fmt(Math.abs(dEnd.reliablePeople - before.people))} people lost reliable service under a precautionary advisory.` }[stormChoice];
    } else if (completed.length) {
      const it = completed[0];
      hero = `${it.name} is now working. It brings running costs too: ${(it.obligations || []).slice(0, 2).join(', ') || 'upkeep'}. Check the lab table to see what it changed.`;
    } else {
      hero = `The plant treated ${n1(pre.throughput)} units but the network released ${n1(pre.released)}, so storage fell from ${fmt(openStorage)} to ${fmt(pre.closingStorage)} units (${pre.reserveDays.toFixed(1)} days of reserve at the start of the day). Fixing leaks or trimming demand slows the drawdown without taking more from the river.`;
    }
    completed.forEach((it) => notes.push({ tone: 'good', icon: 'check', text: `<b>${it.name}</b> completed. Obligations now running: ${(it.obligations || ['upkeep']).join('; ')}.` }));
    if (dEnd.lowStorage || dEnd.storageState === 'low') notes.push({ tone: 'alert', icon: 'warn', text: 'Storage is low. Low reserve adds tap risk and cuts Reliability and Resilience.' });
    if (dEnd.clinicBelowMin) notes.push({ tone: 'alert', icon: 'octo', text: 'The clinic ran below its critical-service minimum today.' });
    if (dEnd.advisory && !stormChoice) notes.push({ tone: 'alert', icon: 'warn', text: 'Tap quality dipped below the service bar.' });
    // pick the routine to spotlight
    let key = 'maya', best = -1;
    Object.keys(rDelta).forEach((k) => { const a = Math.abs(rDelta[k]); if (a > best + 0.001) { best = a; key = k; } });
    if (best < 0.05) { key = Object.keys(dEnd.routines).sort((a, b) => dEnd.routines[b].hours - dEnd.routines[a].hours)[0]; }
    const R = D.residents[key], rt = dEnd.routines[key];
    const routine = { name: R.name, role: R.role, text: rt.text, hoursNote: Math.abs(rDelta[key]) >= 0.05 ? `${rDelta[key] > 0 ? 'Reclaimed' : 'Lost'} ${Math.abs(rDelta[key]).toFixed(1)} h today` : `Time lost to water: ${rt.hours.toFixed(1)} h/day` };
    const reclaimedHours = before.hoursLost - dEnd.hoursLost;
    const sum = {
      day: s.day - 1, hero, produced: pre.throughput, delivered: pre.delivered, reclaimed: pre.reclaimed, loss: pre.lossUnits, lossRate: pre.lossRate, demandMet: pre.availability, demand: pre.grossDemand,
      wwTreated: pre.wwTreated, wwCap: pre.wwEffCap, before, after, pop: s.population, routine, reclaimedHours, notes,
      storage: { from: openStorage, to: pre.closingStorage }, funds: { net: Math.round(pre.net), now: s.funding },
    };
    ui.lastSummary = sum;
    persistGameState();
    ui.snap = snapshot(d); ui.loop = { observed: false, tested: false, allocated: false, built: false };
    ui.changed = {}; const lvB = null; ['src', 'plant', 'tap'].forEach((c) => D.loadKeys.forEach((k) => (ui.changed[c + k] = false)));
    onChapterProgress();
    render();
    openDlg('dlgSummary', V.summaryDialog(sum));
    announce('Day ' + sum.day + ' complete');
  }

  /* ---- time controls -------------------------------------------------------------------------- */
  let timer = null;
  function setSpeed(sp) {
    ui.speed = sp; clearInterval(timer); timer = null;
    if (sp !== 'pause') {
      const perTick = 0.25 / (sp === 'normal' ? 60 : 20);
      timer = setInterval(() => {
        if (anyDialogOpen() || ui.draft) return;
        ui.dayProgress += perTick; $('dayFill').style.width = Math.min(100, ui.dayProgress * 100) + '%';
        if (ui.dayProgress >= 1) { ui.dayProgress = 0; runDay(); }
      }, 250);
    }
    V.topbar(s, d, ui);
  }

  /* ---- allocation drawer ------------------------------------------------------------------------- */
  let drawerTrigger = null;
  function openAlloc() {
    drawerTrigger = describe(document.activeElement);
    ui.draft = { ...s.allocation }; ui.override = false;
    const dr = $('allocDrawer'); dr.hidden = false; dr.innerHTML = V.drawer(s, d, ui); V.drawerSync(dr, s, d, ui); dr.focus();
    announce('Daily allocation panel opened');
  }
  function closeAlloc() {
    ui.draft = null; ui.override = false; const dr = $('allocDrawer'); dr.hidden = true; dr.innerHTML = '';
    render(); if (!refocus(drawerTrigger)) $('stage').focus();
  }
  function setDraft(id, v, skip) {
    const sec = d.sectors[id]; const others = D.allocationSectors.reduce((t, x) => t + (x.id === id ? 0 : ui.draft[x.id]), 0);
    const room = Math.max(0, d.delivered - others);
    let nv = Math.max(0, Math.min(sec.fresh, room, isNaN(v) ? 0 : v)); nv = Math.round(nv * 10) / 10;
    ui.draft[id] = nv;
    V.drawerSync($('allocDrawer'), s, d, ui, { skipId: skip ? id : null });
    if (nv < v - 0.05 && v <= sec.fresh) announce('No water left to assign. Lower another sector first.');
  }
  function confirmAlloc() {
    const min = D.allocationSectors.find((x) => x.critical).min;
    if (ui.draft.clinic < min - 0.05 && !ui.override) return;
    s.allocation = { ...ui.draft }; const moved = commit(); ui.loop.allocated = true;
    const parts = D.allocationSectors.map((x) => `${x.name} ${Math.round(d.sectors[x.id].ratio * 100)}%`).join(' · ');
    closeAlloc(); toast('Allocation confirmed', parts + (moved.some((m) => m.v > 0.05) ? '<br>Unassigned water went to unmet demand by priority.' : ''), 'good');
  }
  function preset(kind) {
    const secs = D.allocationSectors; const avail = d.delivered; const draft = {};
    if (kind === 'current') Object.assign(draft, s.allocation);
    else if (kind === 'equal') { const r = Math.min(1, avail / secs.reduce((t, x) => t + d.sectors[x.id].fresh, 0)); secs.forEach((x) => (draft[x.id] = Math.round(d.sectors[x.id].fresh * r * 10) / 10)); }
    else { let left = avail; secs.slice().sort((a, b) => b.priority - a.priority).forEach((x) => { const g = Math.min(left, d.sectors[x.id].fresh); draft[x.id] = Math.round(g * 10) / 10; left -= g; }); }
    ui.draft = draft; V.drawerSync($('allocDrawer'), s, d, ui);
    announce(kind === 'priority' ? 'Allocated by priority' : kind === 'equal' ? 'Equal shares' : 'Reset');
  }

  /* ---- events (delegated) -------------------------------------------------------------------------------- */
  function act(a, id, el, e) {
    switch (a) {
      case 'rail-toggle': ui.railCollapsed = !ui.railCollapsed; render(); break;
      case 'cat': if (ui.railCollapsed) { ui.railCollapsed = false; if (ui.railOpen.indexOf(id) < 0) ui.railOpen.push(id); } else { const i = ui.railOpen.indexOf(id); if (i >= 0) ui.railOpen.splice(i, 1); else ui.railOpen.push(id); } render('inspector'); break;
      case 'item': openItem(id); break;
      case 'close-project': ui.project = null; ui.preview = null; render(); break;
      case 'select': selectObject(id); break;
      case 'approve': approve(id); break;
      case 'preview': ui.preview = ui.preview === id ? null : id; render(); break;
      case 'test': doTest(); break;
      case 'repair': doRepair(); break;
      case 'maintain': doMaintain(); break;
      case 'trace-runoff': traceRunoff(); break;
      case 'stage': ui.stageSel = id; render(); break;
      case 'bypass': { const i = ui.bypass.indexOf(id); if (i >= 0) ui.bypass.splice(i, 1); else ui.bypass.push(id); render(); break; }
      case 'reset-bypass': ui.bypass = []; render(); break;
      case 'loop':
        if (id === 'observe') { if (!ui.loop.observed) selectObject(ui.selected); toast('Observe', 'Select any object on the map, or follow the numbered water journey below it.'); }
        else if (id === 'test') doTest();
        else if (id === 'allocate') openAlloc();
        else if (id === 'build') { if (ui.railCollapsed) ui.railCollapsed = false; if (ui.railOpen.indexOf('treatment') < 0) ui.railOpen.push('treatment'); render(); const b = document.querySelector('.cat-btn[data-id="treatment"]'); if (b) b.focus(); }
        else if (id === 'consequences' && ui.lastSummary) openDlg('dlgSummary', V.summaryDialog(ui.lastSummary));
        else if (id === 'adapt') openDlg('dlgWatch', V.watchDialog(s, d, ui));
        break;
      case 'run-day': runDay(); break;
      case 'trigger-rain': triggerRain(); break;
      case 'open-event': openEvent(); break;
      case 'apply-choice': { const c = document.querySelector('input[name="evc"]:checked'); if (c) applyChoice(+c.value); break; }
      case 'start-journey': startJourney(); break;
      case 'continue-journey': continueJourney(); break;
      case 'explore-environments': setEnvironment('aspen-river'); ui.started = true; document.getElementById('startShell').classList.add('hidden'); break;
      case 'open-settings-shell': openDlg('dlgSettings', V.settingsDialog(s, ui)); break;
      case 'close-tutorial': closeTutorial(); break;
      case 'tutorial-back': {
        const index = Number(document.body.dataset.tutorialIndex || 0); const prev = Math.max(0, index - 1); openTutorialStep(prev); break;
      }
      case 'tutorial-next': {
        const index = Number(document.body.dataset.tutorialIndex || 0); const next = Math.min(tutorialSteps.length - 1, index + 1); if (index < tutorialSteps.length - 1) openTutorialStep(next); else closeTutorial(); break;
      }
      case 'tutorial-skip': skipTutorial(); break;
      case 'overlay': ui.overlays[id] = !ui.overlays[id]; render(); break;
      case 'security': openSecurity(); break;
      case 'open-security-from-summary': $('dlgSummary').close(); openSecurity(); break;
      case 'dash-toggle': ui.dashClosed = !ui.dashClosed; render(); break;
      case 'open-alloc': openAlloc(); break;
      case 'cancel-alloc': closeAlloc(); break;
      case 'confirm-alloc': confirmAlloc(); break;
      case 'alloc-preset': preset(id); break;
      case 'reset': resetAll(); break;
      case 'replay-chapter': $('dlgChapterComplete').close(); resetChapterState(); ui.started = true; ui.chapterDay = 1; persistGameState(); render(); break;
      case 'explore-free': $('dlgChapterComplete').close(); ui.chapterComplete = true; renderChapterBanner(); break;
      case 'continue-aspen': $('dlgChapterComplete').close(); setEnvironment('aspen-river'); toast('Aspen River Bend unlocked', 'The next chapter preview is ready.', 'good'); break;
      default: break;
    }
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]'); const el = e.target.closest('[data-act]');
    if (el && !(el.matches('input,select,textarea'))) act(el.dataset.act, el.dataset.id, el, e);
    if (c) { const dlg = c.closest('dialog'); if (dlg) dlg.close(); }
    if (e.target.tagName === 'DIALOG') e.target.close();
  });
  document.addEventListener('input', (e) => {
    const el = e.target; if (!el.dataset || !el.dataset.act) return;
    if (el.dataset.act === 'ph') {
      const ph = parseFloat(el.value); ui.ph = ph; const inBand = ph >= 6.5 && ph <= 8.5; const pen = inBand ? 0 : Math.min(25, Math.abs(ph - 7.5) * 8);
      const lv = V.labView(s, d);
      $('phOut').innerHTML = `<b class="mono">pH ${ph.toFixed(1)}</b> · ${inBand ? 'inside the stable band (6.5–8.5)' : 'outside the band: pipes corrode, treatment works less well'} · quality penalty <b class="mono">${pen.toFixed(1)}</b> · microbial risk <b class="mono">${n1(lv.src.microbial).replace('.0', '')}</b> (unchanged)`;
    } else if (el.dataset.act === 'intake') {
      s.intake = +el.value; $('intakeOut').textContent = s.intake + ' units/day'; commit(); render('inspector');
    } else if (el.dataset.act === 'whatif') { $('wiOut').innerHTML = V.whatIf(d.scores, +el.value);
    } else if (el.dataset.act === 'alloc') setDraft(el.dataset.id, parseFloat(el.value), true);
    else if (el.dataset.act === 'alloc-num') setDraft(el.dataset.id, parseFloat(el.value), false);
    else if (el.dataset.act === 'choice') $('applyChoice').disabled = false;
  });
  document.addEventListener('change', (e) => {
    const el = e.target; if (!el.dataset || !el.dataset.act) return;
    const a = el.dataset.act;
    if (a === 'intake') { commit(); render(); }
    else if (a === 'alloc-num') V.drawerSync($('allocDrawer'), s, d, ui);
    else if (a === 'override') { ui.override = el.checked; V.drawerSync($('allocDrawer'), s, d, ui); }
    else if (a === 'bypass') act('bypass', el.dataset.id);
    else if (a === 'set-motion') { ui.reduceMotion = el.checked; document.documentElement.classList.toggle('reduce-motion', el.checked); }
    else if (a === 'set-quick') ui.quickBuild = el.checked;
    else if (a === 'set-labels') { ui.overlays.labels = el.checked; render(); }
  });
  document.querySelectorAll('.tbtn').forEach((b) => b.addEventListener('click', () => setSpeed(b.dataset.speed)));
  $('btnAbout').addEventListener('click', () => openDlg('dlgAbout', V.aboutDialog()));
  $('btnHelp').addEventListener('click', () => openDlg('dlgHelp', V.helpDialog()));
  $('btnSettings').addEventListener('click', () => openDlg('dlgSettings', V.settingsDialog(s, ui)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hideTip(); if (ui.draft && !anyDialogOpen()) closeAlloc(); }
  });

  /* ---- tooltips ---------------------------------------------------------------------------------------------- */
  const tt = $('tooltip');
  function showTip(el) {
    const t = el.getAttribute('data-tip'); if (!t) return; tt.textContent = t; tt.hidden = false;
    const r = el.getBoundingClientRect(); const tr = tt.getBoundingClientRect();
    let x = r.left + r.width / 2 - tr.width / 2, y = r.top - tr.height - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(x, innerWidth - tr.width - 6)); tt.style.left = x + 'px'; tt.style.top = y + 'px';
  }
  function hideTip() { tt.hidden = true; }
  document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) hideTip(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);

  /* ---- boot ----------------------------------------------------------------------------------------------------- */
  function resetAll() {
    setSpeed('pause'); s = freshState(); ui = freshUi(); d = sim.compute(s); s.allocation = { ...d.allocation };
    ui.snap = snapshot(d); document.querySelectorAll('dialog[open]').forEach((x) => x.close());
    $('allocDrawer').hidden = true; document.documentElement.classList.remove('reduce-motion'); render();
  }

  function initAppState() {
    const saved = loadProgress();
    s = freshState(); ui = freshUi(); d = sim.compute(s); s.allocation = { ...d.allocation }; ui.snap = snapshot(d);
    ui.started = !!saved.started;
    ui.chapterDay = Number(saved.chapterDay || 1);
    ui.currentEnvironment = saved.environment || 'alpine-headwaters';
    setEnvironment(ui.currentEnvironment);
    renderStartShell();
    renderChapterBanner();
    if (ui.started && !saved.tutorialSkipped) openTutorialStep(saved.tutorialStep || 0);
    if (ui.started) document.getElementById('startShell') && document.getElementById('startShell').classList.add('hidden');
    document.title = 'Waterworks — Alpine Headwaters';
  }

  s = freshState(); ui = freshUi(); d = sim.compute(s); s.allocation = { ...d.allocation }; ui.snap = snapshot(d);
  initAudioSystem();
  initAppState();
  WW.map.mount($('mapstage'), {
    onSelect: selectObject,
    onSample: (k, target) => { ui.sampleFocus = ui.sampleFocus === k ? null : k; selectObject(target); },
  });
  render();
  WW.debug = { get state() { return s; }, get derived() { return d; }, get ui() { return ui; }, runDay, doRepair, triggerRain, applyChoice, approve, selectObject };
})(window);
