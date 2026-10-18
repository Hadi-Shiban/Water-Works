/* =============================================================================
   WATERWORKS WIREFRAME — VIEWS: drawer + dialogs
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = (root.WW = root.WW || {});
  const D = () => WW.data;
  const S = () => WW.sim;
  const V = WW.views;

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v) => Math.round(v).toLocaleString('en-US');
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const sc = (v) => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const delta = (v, d = 1) => {
    const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    if (Math.abs(r) < Math.pow(10, -d)) return '<span class="delta flat">— no change</span>';
    const up = r > 0;
    return `<span class="delta ${up ? 'up' : 'down'}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${up ? '+' : '−'}${Math.abs(r).toFixed(d)}<span class="sr-only"> ${up ? 'increase' : 'decrease'}</span></span>`;
  };
  const closeBtn = '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button>';
  const RES_OF = { school: 'maya', clinic: 'ines', farm: 'tomas', market: 'sam', industry: 'jun', homes: 'ravi' };
  const tierIco = { full: 'check', reduced: 'warn', rationed: 'warn', cut: 'octo' };
  const tierTone = { full: 'ok', reduced: 'warn', rationed: 'risk', cut: 'risk' };

  /* ---- Allocation drawer ------------------------------------------------------- */
  V.drawer = function (s, d, ui) {
    const secs = D().allocationSectors;
    const rows = secs.map((x) => {
      const sec = d.sectors[x.id];
      return `<div class="arow" data-row="${x.id}"><div class="arow-h"><span class="nm">${icon(x.icon)}${x.name}<span class="pri" title="Reliability priority (5 = highest)">P${x.priority}</span>${x.critical ? '<span class="chip risk" style="margin-left:2px">' + icon('shield') + 'Critical</span>' : ''}</span><span data-f="chip"></span></div>
        <div class="arow-c"><input type="range" data-act="alloc" data-id="${x.id}" min="0" max="${sec.fresh}" step="0.1" aria-label="${x.name} allocation, units" aria-describedby="cons-${x.id}"><span style="display:flex;align-items:center;gap:4px"><input type="number" data-act="alloc-num" data-id="${x.id}" min="0" max="${sec.fresh}" step="0.1" aria-label="${x.name} allocation in units"><span class="note">/ ${n1(sec.fresh)}</span></span></div>
        <div class="cons" id="cons-${x.id}" data-f="cons"></div></div>`;
    }).join('');
    return `<div class="drawer-head"><div><p class="kicker">Daily allocation</p><h2 id="allocTitle">Share today’s water</h2></div><button type="button" class="icon-btn" data-act="cancel-alloc" aria-label="Close allocation panel">${icon('x')}</button></div>
      <div class="drawer-body">
        <div class="alloc-sum" role="group" aria-label="Allocation totals"><div><div class="k">Available</div><div class="v num" data-k="avail"></div></div><div><div class="k">Requested</div><div class="v num" data-k="req"></div></div><div data-w="unalloc"><div class="k">Unallocated</div><div class="v num" data-k="unalloc"></div></div><div data-w="short"><div class="k">Shortage</div><div class="v num" data-k="short"></div></div></div>
        <div class="presets"><span class="lbl">Quick set</span><button type="button" class="btn" data-act="alloc-preset" data-id="priority">By priority</button><button type="button" class="btn" data-act="alloc-preset" data-id="equal">Equal share</button><button type="button" class="btn" data-act="alloc-preset" data-id="current">Reset</button></div>
        <div id="allocAlerts" style="padding:0 16px"></div>
        ${rows}
      </div>
      <div class="drawer-foot"><label class="chk" id="overrideWrap" hidden><input type="checkbox" data-act="override" id="overrideChk"><span>I understand the clinic will fall below its critical-service minimum, and I am overriding it on purpose.</span></label>
        <p class="note" id="allocNote"></p>
        <div class="row-2"><button type="button" class="btn" data-act="cancel-alloc">Cancel</button><button type="button" class="btn primary" data-act="confirm-alloc" id="allocConfirm">Confirm allocation</button></div></div>`;
  };

  V.drawerSync = function (host, s, d, ui, opts) {
    opts = opts || {};
    const secs = D().allocationSectors;
    const draft = ui.draft;
    const avail = d.delivered;
    const req = secs.reduce((t, x) => t + d.sectors[x.id].fresh, 0);
    const alloc = secs.reduce((t, x) => t + draft[x.id], 0);
    const unalloc = Math.max(0, avail - alloc), short = Math.max(0, req - avail);
    const set = (k, v) => { const el = host.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; };
    set('avail', n1(avail)); set('req', n1(req)); set('unalloc', n1(unalloc)); set('short', n1(short));
    host.querySelector('[data-w="short"]').classList.toggle('warn', short > 0.05);
    host.querySelector('[data-w="unalloc"]').classList.toggle('warn', unalloc > 0.05);
    const affected = [];
    let clinicLow = false;
    secs.forEach((x) => {
      const sec = d.sectors[x.id];
      const got = draft[x.id] + sec.reclaimed;
      const ratio = Math.min(1, got / sec.demand);
      const tier = S().tier(ratio);
      const row = host.querySelector(`[data-row="${x.id}"]`);
      const rg = row.querySelector('input[type="range"]'); const nb = row.querySelector('input[type="number"]');
      if (opts.skipId !== x.id) rg.value = draft[x.id];
      if (document.activeElement !== nb) nb.value = n1(draft[x.id]);
      rg.setAttribute('aria-valuetext', `${n1(draft[x.id])} units, ${Math.round(ratio * 100)} percent of demand`);
      row.querySelector('[data-f="chip"]').innerHTML = `<span class="chip ${tierTone[tier]}">${icon(tierIco[tier])}${S().tierLabel[tier]} ${Math.round(ratio * 100)}%</span>`;
      const rt = D().residents[RES_OF[x.id]].tiers[tier];
      const reclaimNote = sec.reclaimed ? ` (+${n1(sec.reclaimed)} reclaimed)` : '';
      row.querySelector('[data-f="cons"]').textContent = `${D().residents[RES_OF[x.id]].name}: ${rt[0]}${reclaimNote}`;
      if (tier !== 'full') affected.push(`${x.name} (${S().tierLabel[tier].toLowerCase()})`);
      if (x.critical && draft[x.id] < x.min - 0.05) clinicLow = true;
    });
    const min = secs.find((x) => x.critical).min;
    host.querySelector('#allocAlerts').innerHTML = (clinicLow ? `<p class="note alert" style="margin:10px 0">${icon('octo')}<span><b>Clinic is below its critical-service minimum (${n1(min)} units).</b> Infection control and treatment capacity decline. You can override, but the game will show who is affected.</span></p>` : '')
      + (affected.length ? `<p class="note" style="margin:10px 0"><b>Services affected:</b> ${affected.join(', ')}.</p>` : `<p class="note good" style="margin:10px 0">${icon('check')}<span>Every service is fully supplied.</span></p>`);
    const ow = host.querySelector('#overrideWrap'); ow.hidden = !clinicLow;
    const ok = !clinicLow || ui.override;
    const btn = host.querySelector('#allocConfirm'); btn.disabled = !ok; btn.setAttribute('aria-disabled', String(!ok));
    host.querySelector('#allocNote').textContent = unalloc > 0.05 ? `${n1(unalloc)} units are unallocated. Confirming assigns them to unmet demand by priority.` : `Every unit of delivered water is assigned.`;
  };

  /* ---- Heavy Rain event card --------------------------------------------------- */
  V.eventDialog = function (s, d, ui) {
    const ev = D().dailyEvent;
    const tone = { ok: 'check', warn: 'warn', risk: 'octo' };
    return `<div class="dlg-head dark"><div><p class="kicker">${icon('rain')} Weather event · Day ${s.day}</p><h2 id="evTitle">${ev.title}</h2></div>${closeBtn}</div>
      <div class="dlg-body"><p class="lead-text">${ev.lead}</p>
        <div class="changes" role="group" aria-label="What the storm changes">${ev.changes.map((c) => `<div><div class="k">${c.label}</div><div class="v">${c.from} <span>→</span> ${c.to}</div><div class="n">${c.note}</div></div>`).join('')}</div>
        <p class="note lesson">${icon('flask')}<span>You can see the river turn brown. Microbial and nutrient changes are invisible until you test. Decide with incomplete information.</span></p>
        <fieldset class="choices" style="margin-top:12px"><legend class="sr-only">Choose a response</legend>
          ${ev.choices.map((c) => `<label class="choice"><input type="radio" name="evc" value="${c.id}" data-act="choice"><span class="n">OPTION ${c.id}</span><h3>${c.title}</h3><span class="dt">${c.detail}</span>
            <ul class="likely"><li class="lh">Likely tradeoffs, not guarantees</li>${c.likely.map((l) => `<li class="${l.tone}">${icon(tone[l.tone])}<span><b>${l.k}:</b> ${l.v}</span></li>`).join('')}</ul></label>`).join('')}</fieldset></div>
      <div class="dlg-foot"><span class="note" style="margin-right:auto">Later you will see what actually happened in the end-of-day summary.</span><button type="button" class="btn" data-close>Decide later</button><button type="button" class="btn primary" data-act="apply-choice" id="applyChoice" disabled>Apply response</button></div>`;
  };

  /* ---- End-of-day summary ------------------------------------------------------- */
  V.summaryDialog = function (m) {
    const sc5 = D().outcomeWeights;
    const rows = sc5.map((w) => `<tr><th scope="row">${w.name}</th><td>${sc(m.before.scores[w.key])}</td><td>${sc(m.after.scores[w.key])}</td><td>${delta(m.after.scores[w.key] - m.before.scores[w.key])}</td></tr>`).join('')
      + `<tr class="total"><th scope="row">Water Security</th><td>${sc(m.before.ws)}</td><td>${sc(m.after.ws)}</td><td>${delta(m.after.ws - m.before.ws)}</td></tr>`;
    const pd = m.after.people - m.before.people;
    const rr = m.routine;
    return `<div class="dlg-head dark"><div><p class="kicker">End of day</p><h2 id="sumTitle">Day ${m.day} complete</h2></div>${closeBtn}</div>
      <div class="dlg-body">
        <p class="hero-line">${m.hero}</p>
        <div class="sum-grid" role="group" aria-label="Day totals">
          <div><div class="k">Water produced</div><div class="v num">${n1(m.produced)}</div><div class="s">units treated</div></div>
          <div><div class="k">Water delivered</div><div class="v num">${n1(m.delivered)}</div><div class="s">${n1(m.reclaimed ? m.reclaimed : 0)} reclaimed extra</div></div>
          <div><div class="k">System loss</div><div class="v num">${n1(m.loss)}</div><div class="s">${(m.lossRate * 100).toFixed(1)}% of released</div></div>
          <div><div class="k">Demand met</div><div class="v num">${Math.round(m.demandMet)}%</div><div class="s">of ${m.demand} units</div></div>
          <div><div class="k">Wastewater treated</div><div class="v num">${n1(m.wwTreated)}</div><div class="s">of ${m.wwCap} capacity</div></div></div>
        <div class="sum-cols">
          <div><h3 class="sec-t" style="margin:0 0 6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Score changes</h3>
            <table class="calc"><thead><tr><th></th><th style="text-align:right">Before</th><th style="text-align:right">After</th><th style="text-align:right">Change</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div><h3 class="sec-t" style="margin:0 0 6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">People &amp; routines</h3>
            <p class="note" style="margin-bottom:6px"><b>People with reliable service:</b> <span class="mono">${fmt(m.after.people)}</span> of ${fmt(m.pop)} · ${pd === 0 ? 'no change' : pd > 0 ? `<b class="delta up">▲ +${fmt(pd)} gained</b>` : `<b class="delta down">▼ −${fmt(Math.abs(pd))} lost</b>`}</p>
            <div class="person"><span class="avatar" aria-hidden="true">${rr.name[0]}</span><div><div class="nm">${rr.name} <span class="rl">· ${rr.role}</span></div><p>${rr.text}</p><p class="hrs">${rr.hoursNote}</p></div></div>
            <p class="note" style="margin-top:8px"><b>Reclaimed time across the community:</b> <span class="mono">${m.reclaimedHours > 0.05 ? '+' + m.reclaimedHours.toFixed(1) + ' h per day' : m.reclaimedHours < -0.05 ? '−' + Math.abs(m.reclaimedHours).toFixed(1) + ' h per day' : 'no change'}</span></p></div></div>
        ${m.notes.length ? `<ul style="margin-top:12px;display:grid;gap:6px">${m.notes.map((n) => `<li class="note ${n.tone || ''}">${icon(n.icon || 'check')}<span>${n.text}</span></li>`).join('')}</ul>` : ''}
        <p class="note" style="margin-top:12px">Storage ${fmt(m.storage.from)} → ${fmt(m.storage.to)} units · Funds ${m.funds.net >= 0 ? '+' : '−'}${fmt(Math.abs(m.funds.net))} (now ${fmt(m.funds.now)})</p>
      </div>
      <div class="dlg-foot"><button type="button" class="btn" data-act="open-security-from-summary">Why did Water Security change?</button><button type="button" class="btn primary" data-close>Continue to Day ${m.day + 1}</button></div>`;
  };

  V.whatIf = function (scores, q) {
    const sc2 = Object.assign({}, scores, { quality: q });
    let base = 0; D().outcomeWeights.forEach((w) => (base += w.weight * sc2[w.key]));
    let ws = base; let gate = null;
    D().gates.forEach((g) => { if (sc2[g.key] < g.below) { ws = Math.min(ws, g.cap); gate = gate || g; } });
    return `Quality <b class="mono">${q}</b> → base <b class="mono">${base.toFixed(1)}</b> → Water Security <b class="mono">${ws.toFixed(1)}</b>. ` + (gate ? `<span class="chip risk">${icon('octo')}Gate active: capped at ${gate.cap}</span>` : `<span class="chip ok">${icon('check')}No gate active</span>`);
  };

  /* ---- Water Security explanation ------------------------------------------------- */
  V.securityDialog = function (s, d, ui) {
    const W = D().outcomeWeights;
    const rows = W.map((w) => `<tr><th scope="row">${w.name}</th><td>${sc(d.scores[w.key])}</td><td>× ${w.weight.toFixed(2)}</td><td>${(d.scores[w.key] * w.weight).toFixed(2)}</td></tr>`).join('');
    const gates = D().gates.map((g) => { const on = d.scores[g.key] < g.below; return `<div class="gate-row${on ? ' on' : ''}">${icon(on ? 'octo' : 'check')}<span style="flex:1">${g.text}<br><span class="note">${on ? 'ACTIVE' : 'Not active'} · ${g.key} is ${sc(d.scores[g.key])} (gate below ${g.below})</span></span></div>`; }).join('');
    const gain = W.map((w) => ({ n: w.name, g: (100 - d.scores[w.key]) * w.weight })).sort((a, b) => b.g - a.g);
    return `<div class="dlg-head"><div><p class="kicker">Combined score</p><h2 id="secTitle">Water Security ${sc(d.ws)}</h2></div>${closeBtn}</div>
      <div class="dlg-body"><p class="note" style="margin-bottom:8px">Five scores, weighted. No single strong score can hide a dangerous failure.</p>
        <table class="calc"><thead><tr><th>Score</th><th style="text-align:right">Value</th><th style="text-align:right">Weight</th><th style="text-align:right">Points</th></tr></thead><tbody>${rows}
          <tr class="total"><th scope="row">Base</th><td></td><td></td><td>${d.wsBase.toFixed(2)}</td></tr></tbody></table>
        <h3 class="sec-t" style="margin:14px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Critical gates</h3>${gates}
        <p class="note ${d.activeGates.length ? 'alert' : 'good'}" style="margin-top:8px">${icon(d.activeGates.length ? 'octo' : 'check')}<span>${d.activeGates.length ? `<b>Gate active.</b> Water Security is capped at ${d.activeGates[0].cap} until ${d.activeGates[0].key} recovers.` : `<b>No gate active.</b> Final Water Security = base ${d.wsBase.toFixed(1)}.`}</span></p>
        <h3 class="sec-t" style="margin:14px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Try it: can strong supply hide unsafe water?</h3>
        <label class="note" for="wiQ">Slide Quality and watch the gate (availability, reliability, access and resilience stay as they are).</label>
        <input id="wiQ" type="range" min="0" max="100" step="1" value="${Math.round(d.scores.quality)}" data-act="whatif">
        <p id="wiOut" class="note" style="margin-top:4px">${V.whatIf(d.scores, Math.round(d.scores.quality))}</p>
        <h3 class="sec-t" style="margin:14px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Where the most points are left</h3>
        <ul>${gain.slice(0, 3).map((g, i) => `<li class="kv"><dt>${i + 1}. ${g.n}</dt><dd>${g.g.toFixed(1)} pts to gain</dd></li>`).join('')}</ul>
        <p class="note lesson" style="margin-top:8px">${icon('flask')}<span>Expanding intake alone would not close these gaps. Access and Resilience need pipes, storage and upkeep.</span></p></div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Close</button></div>`;
  };

  /* ---- About / Science ------------------------------------------------------------ */
  V.aboutDialog = function () {
    return `<div class="dlg-head"><div><p class="kicker">About · Science</p><h2 id="aboutTitle">What is real, and what is game</h2></div>${closeBtn}</div>
      <div class="dlg-body"><p class="disclosure">${D().disclosure}</p>
        <div class="tri">${D().provenanceClasses.map((p) => `<div><b>${p.name}</b>${p.text}</div>`).join('')}</div>
        <h3 class="sec-t" style="margin:16px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Sources</h3>
        <ul class="src-list">${D().sources.map((r) => `<li><b>${r.authority}</b> — <a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a><br><span class="note">${r.date} · ${r.use}</span><br><span class="id">${r.id}</span></li>`).join('')}</ul>
        <p class="note lesson" style="margin-top:12px">${icon('flask')}<span><b>Scientific backbone:</b> World Health Organization catchment-to-consumer risk management. <b>Gameplay assumptions:</b> costs, speeds, capacities and treatment removal coefficients.</span></p>
        <p class="note" style="margin-top:10px">Alder Ford is a fictional community. Residents are invented, and no real place is modelled. This prototype uses mock data. Optional real-world learning is separate from gameplay: nothing you do here is linked to donations or to any score.</p></div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Close</button></div>`;
  };

  V.helpDialog = function () {
    return `<div class="dlg-head"><div><p class="kicker">Help</p><h2 id="helpTitle">How a day works</h2></div>${closeBtn}</div>
      <div class="dlg-body"><ol class="tri" style="grid-template-columns:repeat(4,1fr)">${['Observe|Select map objects. Read the panel.', 'Test|Take a sample. Invisible hazards appear.', 'Allocate|Share available water across sectors.', 'Build / maintain|Approve projects, repair, maintain.'].map((t, i) => `<li style="list-style:none;padding:10px;border:1px solid var(--paper-400);background:var(--paper-100);font-size:12px"><b style="display:block;font-size:13px">${i + 1}. ${t.split('|')[0]}</b>${t.split('|')[1]}</li>`).join('')}</ol>
        <p class="note" style="margin-top:10px">Then <b>Run day</b> → see consequences → adapt. Water moves watershed → source → treatment → storage → pipes → buildings → wastewater → reuse or environment.</p>
        <h3 class="sec-t" style="margin:14px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Keyboard</h3>
        <p class="note"><kbd>Tab</kbd> moves between controls and map objects · <kbd>Enter</kbd> / <kbd>Space</kbd> selects · <kbd>Esc</kbd> closes panels · arrow keys move sliders.</p>
        <h3 class="sec-t" style="margin:14px 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">This is a wireframe</h3>
        <p class="note">Numbers come from a small deterministic calculator seeded with the framework’s Example Day. Buttons produce believable changes, not the full simulation. A refresh resets everything.</p></div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Got it</button></div>`;
  };

  V.settingsDialog = function (s, ui) {
    const os = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return `<div class="dlg-head"><div><p class="kicker">Settings</p><h2 id="setTitle">Prototype settings</h2></div>${closeBtn}</div>
      <div class="dlg-body" style="display:grid;gap:14px">
        <label class="chk"><input type="checkbox" data-act="set-motion" ${ui.reduceMotion || os ? 'checked' : ''} ${os ? 'disabled' : ''}><span><b>Reduce motion.</b> Stops water-flow animation; direction stays visible through arrowheads. ${os ? 'Your system already asks for reduced motion.' : ''}</span></label>
        <label class="chk"><input type="checkbox" data-act="set-quick" ${ui.quickBuild ? 'checked' : ''}><span><b>Quick build.</b> Every project finishes after one Run Day so you can see results quickly (prototype only).</span></label>
        <label class="chk"><input type="checkbox" data-act="set-labels" ${ui.overlays.labels ? 'checked' : ''}><span><b>Map labels.</b></span></label>
        <div><button type="button" class="btn" data-act="reset">Reset prototype to Day 4</button></div></div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Done</button></div>`;
  };

  V.routinesDialog = function (s, d, ui) {
    const R = D().residents;
    const snapH = ui.snap ? ui.snap.hoursLost : d.hoursLost;
    return `<div class="dlg-head"><div><p class="kicker">Community</p><h2 id="routTitle">Resident routines</h2></div>${closeBtn}</div>
      <div class="dlg-body"><p class="note" style="margin-bottom:10px">Water changes daily routines. These residents are invented; each has a role, a goal and a routine that responds to service.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${Object.keys(R).map((k) => { const r = R[k], rt = d.routines[k]; return `<div class="person"><span class="avatar" aria-hidden="true">${r.name[0]}</span><div><div class="nm">${r.name} <span class="rl">· ${r.role}</span></div><p><i>Goal: ${r.goal}</i></p><p>${rt.text}</p><p class="hrs">${rt.hours > 0 ? 'Time lost: ' + rt.hours.toFixed(1) + ' h/day' : 'No time lost'}</p></div></div>`; }).join('')}</div>
        <p class="note" style="margin-top:10px"><b>Community time lost to water:</b> <span class="mono">${d.hoursLost.toFixed(1)} h/day</span> (${delta(snapH - d.hoursLost)} vs day start).</p></div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Close</button></div>`;
  };

  /* ---- Watch list ("Adapt") ------------------------------------------------------- */
  V.warnings = function (s, d, ui) {
    const w = [];
    const add = (sev, txt, id) => w.push({ sev, txt, id });
    if (s.event.status === 'active') add('risk', 'Heavy rain needs a response.', 'event');
    if (d.strain) add('risk', `Treatment plant is at ${Math.round(d.loadRatio * 100)}% of effective capacity. Removal performance is down ${Math.round((1 - d.ovl) * 100)}%.`, 'plant');
    if (d.leak) add('warn', `District 2 leak is losing about ${n1(d.leakUnits)} units/day.`, 'pipeD2');
    if (d.clinicBelowMin) add('risk', 'Clinic is below its critical-service minimum.', 'clinic');
    if (350 - s.terraceConnected > 0) add('warn', `Terrace Homes: ${350 - s.terraceConnected} of 350 residents are not connected.`, 'terraceD3');
    if (d.storageState !== 'healthy') add(d.storageState === 'low' ? 'risk' : 'warn', `Storage is ${Math.round(d.storagePct * 100)}% full and falling ${n1(Math.max(0, s.storage - d.closingStorage))} units/day.`, 'storage');
    if (d.net < 0) add('warn', `Running costs exceed revenue by ${fmt(Math.abs(d.net))} funds/day.`, null);
    if (d.energyUsed / d.energyCapacity > 0.9) add('warn', `Energy is ${d.energyUsed} of ${d.energyCapacity}. Little room for new facilities.`, null);
    if (s.sampleStale) add('warn', 'Some lab readings are out of date after the rain. Run a water test.', 'reservoir');
    if (d.advisory) add('risk', 'Tap quality is below the service bar. Some residents are under a precautionary advisory.', 'plant');
    return w;
  };
  V.watchDialog = function (s, d, ui) {
    const w = V.warnings(s, d, ui);
    return `<div class="dlg-head"><div><p class="kicker">Adapt</p><h2 id="watchTitle">What needs attention</h2></div>${closeBtn}</div>
      <div class="dlg-body">${w.length ? `<ul style="display:grid;gap:8px">${w.map((x) => `<li class="note ${x.sev === 'risk' ? 'alert' : 'lesson'}" style="align-items:center">${icon(x.sev === 'risk' ? 'octo' : 'warn')}<span style="flex:1">${x.txt}</span>${x.id ? `<button type="button" class="btn" style="min-height:28px" data-act="${x.id === 'event' ? 'open-event' : 'select'}" data-id="${x.id}" data-close>Inspect</button>` : ''}</li>`).join('')}</ul>` : `<p class="note good">${icon('check')}<span>Nothing urgent. Keep an eye on reserve and upkeep.</span></p>`}</div>
      <div class="dlg-foot"><button type="button" class="btn primary" data-close>Close</button></div>`;
  };
})(window);
