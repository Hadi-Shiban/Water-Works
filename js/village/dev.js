/* =============================================================================
   WATERWORKS VILLAGE — ROUTE EDITOR (developer only)
   -----------------------------------------------------------------------------
   Off by default. Open index.html?dev=routes to:
     - see a percent grid over the painting
     - see every route's waypoints and drag them (live: walkers follow)
     - add or delete waypoints on the selected route
     - see hotspot bounds and walker positions
     - preview the "after the water point is built" routes
     - copy the edited routes as JSON to paste into js/village/data.js
   Nothing here touches the saved game.
   ========================================================================== */
(function (root) {
  'use strict';
  if (new URLSearchParams(root.location.search).get('dev') !== 'routes') return;
  const WV = root.WV; const NS = 'http://www.w3.org/2000/svg';
  const html = document.documentElement;
  html.classList.add('dev-on', 'dev-bounds', 'dev-walkers');

  let api = null; let layer = null; let selected = { route: 'waterCollection', index: -1 }; let drag = null;
  const r1 = (n) => Math.round(n * 10) / 10;

  const routeList = () => WV.sim.allRoutes(api.scene);
  const routeById = (id) => (routeList().find(([rid]) => rid === id) || [])[1];

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }

  function draw() {
    if (!api || !api.svg) return;
    if (layer) layer.remove();
    const sc = api.scene; const W = sc.w, H = sc.h;
    layer = el('g', { class: 'dev-layer' }, api.svg);
    // grid every 5%, labelled every 10%
    const grid = el('g', { class: 'dev-grid' }, layer);
    for (let i = 5; i < 100; i += 5) {
      el('line', { x1: (i / 100) * W, y1: 0, x2: (i / 100) * W, y2: H, class: i % 10 ? 'minor' : 'major' }, grid);
      el('line', { x1: 0, y1: (i / 100) * H, x2: W, y2: (i / 100) * H, class: i % 10 ? 'minor' : 'major' }, grid);
      if (i % 10 === 0) {
        el('text', { x: (i / 100) * W + 3, y: 14 }, grid).textContent = i;
        el('text', { x: 3, y: (i / 100) * H - 3 }, grid).textContent = i;
      }
    }
    // routes: polyline + numbered draggable handles
    routeList().forEach(([id, rt]) => {
      const g = el('g', { class: 'dev-route' + (id === selected.route ? ' sel' : ''), 'data-route': id }, layer);
      const pts = rt.points.map(([x, y]) => [(x / 100) * W, (y / 100) * H]);
      el('polyline', { points: pts.map((p) => p.join(',')).join(' ') }, g);
      pts.forEach(([x, y], i) => {
        const h = el('g', { class: 'dev-handle' + (id === selected.route && i === selected.index ? ' on' : ''), transform: `translate(${x} ${y})`, 'data-route': id, 'data-i': i }, g);
        el('circle', { r: 7 }, h);
        el('text', { y: 3.5 }, h).textContent = i;
      });
    });
    panel();
  }

  function toPct(evt) {
    const pt = api.svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(api.svg.getScreenCTM().inverse());
    return [r1((p.x / api.scene.w) * 100), r1((p.y / api.scene.h) * 100)];
  }

  function onDown(e) {
    const h = e.target.closest && e.target.closest('.dev-handle'); if (!h) return;
    e.preventDefault(); e.stopPropagation();
    selected = { route: h.dataset.route, index: +h.dataset.i };
    drag = { route: h.dataset.route, index: +h.dataset.i };
    api.svg.setPointerCapture && api.svg.setPointerCapture(e.pointerId);
    draw();
  }
  function onMove(e) {
    if (!drag) return;
    routeById(drag.route).points[drag.index] = toPct(e);
    api.rebuildRoutes(); draw();
  }
  function onUp() { drag = null; }

  /* ---- Panel ------------------------------------------------------------------------------ */
  let box = null; let after = false;
  function panel() {
    if (!box) {
      box = document.createElement('aside'); box.className = 'dev-panel'; box.setAttribute('aria-label', 'Route editor');
      document.body.appendChild(box);
      box.addEventListener('click', onPanel); box.addEventListener('change', onPanel);
    }
    const rt = routeById(selected.route);
    box.innerHTML = `<b>Route editor</b> <small>dev only · drag the numbered points</small>
      <label>Route <select data-dev="route">${routeList().map(([id, r]) => `<option value="${id}" ${id === selected.route ? 'selected' : ''}>${id} · ${r.label || ''}</option>`).join('')}</select></label>
      <div class="dev-row"><button data-dev="add">Add point after #${selected.index < 0 ? 'last' : selected.index}</button><button data-dev="del" ${selected.index < 0 ? 'disabled' : ''}>Delete #${selected.index < 0 ? '–' : selected.index}</button></div>
      <div class="dev-row"><label><input type="checkbox" data-dev="grid" ${html.classList.contains('dev-nogrid') ? '' : 'checked'}> grid</label>
        <label><input type="checkbox" data-dev="bounds" ${html.classList.contains('dev-bounds') ? 'checked' : ''}> hotspot bounds</label>
        <label><input type="checkbox" data-dev="walkers" ${html.classList.contains('dev-walkers') ? 'checked' : ''}> walkers</label>
        <label><input type="checkbox" data-dev="lines" ${html.classList.contains('dev-nolines') ? '' : 'checked'}> routes</label></div>
      <label><input type="checkbox" data-dev="after" ${after ? 'checked' : ''}> preview: after water point is built</label>
      <p>${rt ? `${rt.points.length} points · ${rt.speed} px/s · ${rt.walkers} walker(s) · spacing ${rt.spacing}s · ${rt.mode}` : ''}</p>
      <div class="dev-row"><button data-dev="copy">Copy routes JSON</button></div>
      <textarea data-dev="out" readonly rows="4" placeholder="Copied JSON appears here"></textarea>`;
  }
  function onPanel(e) {
    const t = e.target; const k = t.dataset && t.dataset.dev; if (!k) return;
    if (e.type === 'click' && t.tagName !== 'BUTTON') return;
    const rt = routeById(selected.route);
    if (k === 'route') { selected = { route: t.value, index: -1 }; }
    else if (k === 'add' && rt) {
      const i = selected.index < 0 ? rt.points.length - 1 : selected.index;
      const a = rt.points[i], b = rt.points[i + 1] || [a[0] + 2, a[1] + 2];
      rt.points.splice(i + 1, 0, [r1((a[0] + b[0]) / 2), r1((a[1] + b[1]) / 2)]); selected.index = i + 1; api.rebuildRoutes();
    } else if (k === 'del' && rt && rt.points.length > 2 && selected.index >= 0) { rt.points.splice(selected.index, 1); selected.index = -1; api.rebuildRoutes(); }
    else if (k === 'grid') html.classList.toggle('dev-nogrid', !t.checked);
    else if (k === 'bounds') html.classList.toggle('dev-bounds', t.checked);
    else if (k === 'walkers') html.classList.toggle('dev-walkers', t.checked);
    else if (k === 'lines') html.classList.toggle('dev-nolines', !t.checked);
    else if (k === 'after') { after = t.checked; api.setPreviewAfter(after); }
    else if (k === 'copy') {
      const r = api.scene.routes;
      const json = JSON.stringify(routeList().reduce((o, [id, rt]) => ((o[id] = rt.points), o), {}));
      const out = box.querySelector('[data-dev="out"]'); out.value = json; out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {});
      return;
    }
    draw();
  }

  WV.scene.onMount((a) => {
    api = a; selected = { route: 'waterCollection', index: -1 };
    api.svg.addEventListener('pointerdown', onDown);
    api.svg.addEventListener('pointermove', onMove);
    api.svg.addEventListener('pointerup', onUp);
    api.svg.addEventListener('pointercancel', onUp);
    draw();
  });
  WV.dev = { draw, routeList };
})(window);
