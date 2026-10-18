/* =============================================================================
   WATERWORKS VILLAGE — PAINTED SCENE
   -----------------------------------------------------------------------------
   One SVG whose viewBox is a crop of the scenario painting. The painting is an
   <image> inside the SVG and every overlay is drawn in the painting's own pixel
   coordinates, so art and overlays cannot drift apart when the window resizes.

   Interactive hotspots are real HTML <button>s in a layer above the SVG,
   positioned in percent of the visible crop: native focus, keyboard and
   screen-reader support with no custom key handling.

   mount(host, state, handlers) builds everything once; update(state, ui) only
   flips attributes and classes (same approach as the municipal map.js).
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const D = () => WV.data;

  let els = {}; let scene = null; let crop = null;
  let walkers = []; let raf = 0; let route = null; let reduced = false;

  const P = (x, y) => [(x / 100) * scene.w, (y / 100) * scene.h];                       // painting % → px
  const V = (x, y) => [((x - scene.crop.x) / scene.crop.w) * 100, ((y - scene.crop.y) / scene.crop.h) * 100]; // painting % → visible %
  const f1 = (n) => Math.round(n * 10) / 10;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- Reusable overlay art (origin = ground contact point) ------------------------ */
  const DEFS = `
  <defs>
    <filter id="wv-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <filter id="wv-paint" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4"/>
    </filter>
    <linearGradient id="wv-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1dfbd"/><stop offset="1" stop-color="#c8a87a"/></linearGradient>
    <linearGradient id="wv-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8956a"/><stop offset="1" stop-color="#8d6c47"/></linearGradient>
    <linearGradient id="wv-roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c96a43"/><stop offset="1" stop-color="#8a3b22"/></linearGradient>
    <linearGradient id="wv-canvas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#d9a400"/></linearGradient>
    <linearGradient id="wv-timber" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#94643a"/><stop offset="1" stop-color="#5e3b20"/></linearGradient>
    <radialGradient id="wv-glow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".85"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>

    <g id="art-can">
      <rect x="-6" y="-14" width="12" height="14" rx="2.2" fill="#f2c118" stroke="#94700a" stroke-width="1"/>
      <path d="M-4 -11 L4 -4 M4 -11 L-4 -4" stroke="#cf9c00" stroke-width="1.3"/>
      <rect x="-1" y="-17.5" width="5" height="3.6" rx="1" fill="#c48f00"/>
      <path d="M-5 -14 q2 -3.5 5 0" fill="none" stroke="#94700a" stroke-width="1.2"/>
    </g>

    <g id="art-cottage" filter="url(#wv-paint)">
      <ellipse cx="5" cy="2" rx="31" ry="7" fill="#1d1408" opacity=".34" filter="url(#wv-soft)"/>
      <path d="M10 -14 L26 -19 L26 -1 L10 4 Z" fill="url(#wv-side)"/>
      <path d="M-20 -14 L10 -14 L10 4 L-20 4 Z" fill="url(#wv-wall)"/>
      <path d="M-21 -13.5 L-5 -32 L11 -13.5 Z" fill="url(#wv-wall)"/>
      <path d="M-5 -32 L11 -37 L28 -18.5 L11 -13.5 Z" fill="url(#wv-roof)"/>
      <path d="M-22.5 -12.5 L-5 -33 L11 -37.5" fill="none" stroke="#6f2f1c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      <rect x="-13" y="-6" width="7" height="10" rx="1" fill="#5a3b24"/>
      <rect x="-1" y="-8" width="6.5" height="5.5" fill="#3a2e22"/><rect x="-0.2" y="-7.3" width="2.4" height="2" fill="#f6dc8c" opacity=".55"/>
      <use href="#art-can" transform="translate(-17.5 4) scale(.42)"/>
    </g>

    <g id="art-station" filter="url(#wv-paint)">
      <ellipse cx="2" cy="3" rx="44" ry="9" fill="#1d1408" opacity=".32" filter="url(#wv-soft)"/>
      <rect x="-30" y="-36" width="4" height="38" fill="url(#wv-timber)"/><rect x="24" y="-40" width="4" height="42" fill="url(#wv-timber)"/>
      <path d="M-28 -33 L26 -37 L26 -12 L-28 -9 Z" fill="#efe2c2"/>
      <rect x="-25" y="-13" width="46" height="4" rx="1" fill="#7a4e2b"/>
      <rect x="-23" y="-9" width="3" height="11" fill="#5e3b20"/><rect x="16" y="-9" width="3" height="11" fill="#5e3b20"/>
      <rect x="-18" y="-22" width="4.4" height="9" rx="1.2" fill="#dbeef8" stroke="#5f87a3" stroke-width=".9"/>
      <rect x="-11" y="-20" width="4.4" height="7" rx="1.2" fill="#bfe0f2" stroke="#5f87a3" stroke-width=".9"/>
      <rect x="-4" y="-23" width="4.4" height="10" rx="1.2" fill="#e9f5fb" stroke="#5f87a3" stroke-width=".9"/>
      <rect x="5" y="-18" width="11" height="5" rx="1" fill="#f6f0e0" stroke="#9b8a63" stroke-width=".8"/>
      <rect x="-35" y="-30" width="4.5" height="32" fill="url(#wv-timber)"/><rect x="30" y="-34" width="4.5" height="36" fill="url(#wv-timber)"/>
      <path d="M-42 -29 L35 -42 L42 -31 L-35 -18 Z" fill="url(#wv-canvas)"/>
      <path d="M-35 -18 L42 -31" stroke="#a37a00" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M-35 -18 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0 q4.8 4 9.6 0" transform="rotate(-9.5 -35 -18)" fill="#f2c118" stroke="#a37a00" stroke-width="1"/>
      <use href="#art-can" transform="translate(38 2) scale(.95)"/>
      <use href="#art-can" transform="translate(48 3) scale(.82)"/>
    </g>

    <g id="art-frame" filter="url(#wv-paint)">
      <ellipse cx="2" cy="3" rx="44" ry="9" fill="#1d1408" opacity=".26" filter="url(#wv-soft)"/>
      <rect x="-35" y="-30" width="4.5" height="32" fill="url(#wv-timber)"/><rect x="30" y="-34" width="4.5" height="36" fill="url(#wv-timber)"/>
      <rect x="-30" y="-36" width="4" height="38" fill="url(#wv-timber)"/><rect x="24" y="-40" width="4" height="42" fill="url(#wv-timber)"/>
      <path d="M-35 -29 L34 -40 M-33 -14 L32 -24" stroke="#7a4e2b" stroke-width="3" stroke-linecap="round"/>
      <path d="M-33 -29 L-2 -16 M32 -40 L2 -27" stroke="#8d5d33" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    </g>

    <g id="art-piles">
      <g transform="translate(-58 2)">
        <ellipse cx="0" cy="1" rx="15" ry="4" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
        <rect x="-13" y="-6" width="26" height="5" rx="2.5" fill="#94643a"/><rect x="-11" y="-11" width="24" height="5" rx="2.5" fill="#7a4e2b"/><rect x="-8" y="-16" width="18" height="5" rx="2.5" fill="#94643a"/>
      </g>
      <g transform="translate(60 4)">
        <ellipse cx="0" cy="1" rx="14" ry="4" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
        <path d="M-12 0 q-1 -7 6 -8 q7 0 7 8 Z" fill="#9b958a"/><path d="M-2 0 q0 -9 8 -9 q7 1 6 9 Z" fill="#b5aea1"/><path d="M-6 -6 q1 -7 7 -6 q5 2 3 7 Z" fill="#878177"/>
      </g>
    </g>

    <g id="art-walker">
      <ellipse cx="0" cy="0" rx="6.5" ry="2" fill="#1d1408" opacity=".32"/>
      <path class="legs" d="M-2 -8 L-3.2 0 M2 -8 L3.2 0" stroke="var(--skin)" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M-5.2 -7.5 Q-5.6 -18 0 -19.2 Q5.6 -18 5.2 -7.5 Z" fill="var(--tunic)"/>
      <circle cx="0" cy="-22.4" r="3.5" fill="var(--skin)"/>
      <path d="M-3.6 -23.4 q3.6 -4.4 7.2 0 q-3.6 -1.4 -7.2 0" fill="var(--hair)"/>
      <path d="M4.6 -14 L7.4 -9" stroke="var(--skin)" stroke-width="1.8" stroke-linecap="round"/>
      <use href="#art-can" transform="translate(9 -2) scale(.8)"/>
    </g>

    <g id="art-worker">
      <ellipse cx="0" cy="0" rx="6.5" ry="2" fill="#1d1408" opacity=".32"/>
      <path d="M-2 -8 L-3.2 0 M2 -8 L3.2 0" stroke="var(--skin)" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M-5.2 -7.5 Q-5.6 -18 0 -19.2 Q5.6 -18 5.2 -7.5 Z" fill="var(--tunic)"/>
      <circle cx="0" cy="-22.4" r="3.5" fill="var(--skin)"/>
      <path d="M-3.8 -23.6 q3.8 -3.6 7.6 0 Z" fill="#f2c118"/>
      <g class="hammer"><path d="M4 -15 L10 -21" stroke="var(--skin)" stroke-width="1.9" stroke-linecap="round"/><path d="M10 -21 L12.5 -26" stroke="#5e3b20" stroke-width="1.6"/><rect x="10" y="-28.5" width="6" height="3" rx=".8" fill="#55524c" transform="rotate(-25 13 -27)"/></g>
    </g>
  </defs>`;

  /* People of many skin tones in everyday clothes; varied deterministically. */
  const LOOKS = [
    ['#6b3f22', '#2f6b6b', '#1f1712'], ['#a0673f', '#b5583a', '#2b1d14'], ['#4a2c19', '#c9962a', '#120c08'],
    ['#8a5a36', '#41557d', '#3a2a1c'], ['#c18a5e', '#6f7d3a', '#5a3b24'], ['#5a3420', '#8e3b5a', '#151010'],
  ];
  const look = (i) => { const l = LOOKS[i % LOOKS.length]; return `--skin:${l[0]};--tunic:${l[1]};--hair:${l[2]}`; };

  /* ---- Markup ------------------------------------------------------------------------- */
  function svgMarkup(s) {
    const c = crop; const k = scene.structureScale;
    const cottages = scene.cottages.map(([x, y, sc], i) => {
      const [px, py] = P(x, y); const flip = i % 3 === 1 ? -1 : 1;
      return `<use href="#art-cottage" transform="translate(${f1(px)} ${f1(py)}) scale(${f1(sc * flip * 100) / 100} ${sc})"/>`;
    }).join('');
    const sites = scene.hotspots.filter((h) => h.kind === 'site').map((h) => {
      const [px, py] = P(h.x, h.y);
      // The hotspot (ring + label) sits at h.x/h.y; the structure stands just below it.
      return `<g class="site" data-site="${h.id}" data-state="site" transform="translate(${f1(px)} ${f1(py + 52 * k)}) scale(${k})">
        <g class="st-site">
          <ellipse rx="50" ry="12" class="footprint"/>
          <use href="#art-station" opacity=".2"/>
          ${[[-44, 6], [44, -4], [-6, 12]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M0 0 V-22" stroke="#7a4e2b" stroke-width="2"/><path d="M0 -22 L11 -18.5 L0 -15 Z" fill="#f2c118" class="flag"/></g>`).join('')}
        </g>
        <g class="st-building">
          <use href="#art-piles"/>
          <use href="#art-frame"/>
          <use href="#art-station" class="rising"/>
          <use href="#art-worker" transform="translate(-48 6)" style="${look(1)}"/>
          <use href="#art-worker" transform="translate(50 8) scale(-1 1)" style="${look(4)}"/>
          <g class="dust"><circle cx="-20" cy="2" r="6"/><circle cx="16" cy="0" r="5"/><circle cx="0" cy="4" r="7"/></g>
        </g>
        <g class="st-built">
          <circle r="70" cy="-16" fill="url(#wv-glow)" class="glow"/>
          <use href="#art-station"/>
        </g>
      </g>`;
    }).join('');
    const pts = scene.route.map(([x, y]) => P(x, y).map(f1).join(' '));
    const routeD = 'M' + pts.join(' L');
    const walkerEls = [0, 1, 2].map((i) => `<g class="walker" data-w="${i}"><use href="#art-walker" style="${look(i * 2 + 1)}"/></g>`).join('');
    return `<svg class="scene" viewBox="${f1(c.x)} ${f1(c.y)} ${f1(c.w)} ${f1(c.h)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      ${DEFS}
      <image href="${scene.image}" x="0" y="0" width="${scene.w}" height="${scene.h}" preserveAspectRatio="none"/>
      <path class="route" d="${routeD}" stroke-width="${f1(4 * k)}"/>
      <path class="route-lit" d="${routeD}" stroke-width="${f1(6 * k)}"/>
      <g class="cottages">${cottages}</g>
      <g class="sites">${sites}</g>
      <g class="walkers">${walkerEls}</g>
    </svg>`;
  }

  const NODE_ICON = {
    wood: '<svg viewBox="-16 -16 32 32" aria-hidden="true"><circle cx="-5" cy="3" r="5.2" fill="#a26a3a" stroke="#5e3b20" stroke-width="1.4"/><circle cx="-5" cy="3" r="2" fill="none" stroke="#5e3b20" stroke-width=".9"/><circle cx="5.5" cy="3.5" r="5" fill="#b07642" stroke="#5e3b20" stroke-width="1.4"/><circle cx="5.5" cy="3.5" r="1.9" fill="none" stroke="#5e3b20" stroke-width=".9"/><circle cx="0.4" cy="-5.6" r="5" fill="#9a6235" stroke="#5e3b20" stroke-width="1.4"/><circle cx="0.4" cy="-5.6" r="1.9" fill="none" stroke="#5e3b20" stroke-width=".9"/></svg>',
    stone: '<svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="M-12 8 q-2 -9 6 -11 q8 -1 9 11 Z" fill="#a39d92" stroke="#5d584f" stroke-width="1.3"/><path d="M-1 8 q-1 -12 8 -12 q7 1 6 12 Z" fill="#bdb6a9" stroke="#5d584f" stroke-width="1.3"/><path d="M-7 -1 q0 -9 7 -9 q6 1 4 9 Z" fill="#8f897e" stroke="#5d584f" stroke-width="1.3"/></svg>',
  };

  function hotspotMarkup(s) {
    return scene.hotspots.map((h) => {
      const [x, y] = V(h.x, h.y);
      if (h.kind === 'node') {
        const r = D().resources[h.res];
        return `<button type="button" class="node" data-act="gather" data-id="${h.id}" data-res="${h.res}" style="left:${f1(x)}%;top:${f1(y)}%">
          <span class="node-chip">${NODE_ICON[h.res]}</span><span class="pips" aria-hidden="true"></span><span class="sr-only">${r.verb}</span></button>`;
      }
      return `<button type="button" class="hs hs-${h.kind}" data-act="inspect" data-id="${h.id}" style="left:${f1(x)}%;top:${f1(y)}%">
        <span class="ring" aria-hidden="true"></span><span class="tag">${esc(h.label)}</span></button>`;
    }).join('');
  }

  /* ---- Mount ------------------------------------------------------------------------------ */
  function mount(host, s, opts) {
    stopWalkers();
    scene = WV.sim.sceneOf(s);
    crop = { x: (scene.crop.x / 100) * scene.w, y: (scene.crop.y / 100) * scene.h, w: (scene.crop.w / 100) * scene.w, h: (scene.crop.h / 100) * scene.h };
    reduced = !!(opts && opts.reducedMotion);
    host.innerHTML = `<div class="mapbox" id="mapbox">${svgMarkup(s)}<div class="hotspots" id="hotspots">${hotspotMarkup(s)}</div><div class="fx" id="fx" aria-hidden="true"></div></div>`;
    // Absolute URL: a relative url() inside a custom property would resolve against css/.
    host.style.setProperty('--backdrop', `url('${new URL(scene.image, document.baseURI).href}')`);
    els = { host, box: host.querySelector('#mapbox'), svg: host.querySelector('svg'), hs: host.querySelector('#hotspots'), fx: host.querySelector('#fx') };
    const pts = scene.route.map(([x, y]) => P(x, y));
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    route = { pts, seg, total };
    walkers = [...els.svg.querySelectorAll('.walker')].map((el, i) => ({ el, phase: i / 3 }));
    if (els.ro) els.ro.disconnect();
    const refit = () => fit(false);
    els.ro = root.ResizeObserver ? new ResizeObserver(refit) : null;
    if (els.ro) els.ro.observe(host); else root.addEventListener('resize', refit);
    fit(true);
    startWalkers();
  }

  /* Fill the screen when the aspect ratios are close (cover), letterbox when they
     are not (contain), and switch to horizontal panning on tall, narrow screens. */
  function fit(first) {
    const host = els.host; if (!host || !crop) return;
    const vw = host.clientWidth, vh = host.clientHeight; if (!vw || !vh) return;
    const contain = Math.min(vw / crop.w, vh / crop.h), cover = Math.max(vw / crop.w, vh / crop.h);
    const narrow = vw / vh < 1.05;
    const k = narrow ? vh / crop.h : cover / contain <= 1.12 ? cover : contain;
    els.box.style.width = Math.round(crop.w * k) + 'px';
    els.box.style.height = Math.round(crop.h * k) + 'px';
    host.classList.toggle('pan', narrow);
    if (narrow && first === true) {
      const [fx] = V(scene.focus.x, scene.focus.y);
      host.scrollLeft = Math.max(0, (fx / 100) * crop.w * k - vw / 2);
    }
  }

  /* ---- Walkers: families carrying jerry cans to the source and back -------------------- */
  function pointAt(dist) {
    let d = Math.max(0, Math.min(route.total, dist));
    for (let i = 0; i < route.seg.length; i++) {
      if (d <= route.seg[i] || i === route.seg.length - 1) {
        const t = route.seg[i] ? d / route.seg[i] : 0; const a = route.pts[i], b = route.pts[i + 1];
        return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dx: b[0] - a[0] };
      }
      d -= route.seg[i];
    }
    return { x: route.pts[0][0], y: route.pts[0][1], dx: 1 };
  }
  function placeWalker(w, u, time) {
    const out = u < 0.5; const along = out ? u * 2 : (1 - u) * 2; // 0 at the village, 1 at the source
    const p = pointAt(along * route.total);
    const ws = scene.walkerScale; const sc = ws[0] + (ws[1] - ws[0]) * along;
    const dir = (out ? p.dx : -p.dx) >= 0 ? 1 : -1;
    const bob = reduced ? 0 : Math.abs(Math.sin(time / 170 + w.phase * 9)) * -1.4 * sc;
    w.el.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y + bob)}) scale(${f1(sc * dir * 100) / 100} ${f1(sc * 100) / 100})`);
  }
  function tick(time) {
    const period = 26000; // one full round trip of a walker, in ms (animation only)
    walkers.forEach((w) => placeWalker(w, ((time / period) + w.phase) % 1, time));
    raf = root.requestAnimationFrame(tick);
  }
  function startWalkers() {
    stopWalkers();
    if (reduced) { walkers.forEach((w, i) => placeWalker(w, [0.12, 0.3, 0.68][i] || 0.2, 0)); return; }
    raf = root.requestAnimationFrame(tick);
  }
  function stopWalkers() { if (raf) root.cancelAnimationFrame(raf); raf = 0; }
  function setReducedMotion(on) { reduced = !!on; if (els.svg) startWalkers(); }
  document.addEventListener('visibilitychange', () => { if (!els.svg) return; if (document.hidden) stopWalkers(); else startWalkers(); });

  /* ---- Update -------------------------------------------------------------------------------- */
  function update(s, ui) {
    if (!els.svg) return;
    els.svg.querySelectorAll('.site').forEach((g) => g.setAttribute('data-state', s.builds[g.dataset.site] || 'site'));
    els.svg.classList.toggle('watching', !!ui.watching);
    const targets = ui.targets || [];
    els.hs.querySelectorAll('.hs').forEach((b) => {
      const id = b.dataset.id; const h = scene.hotspots.find((x) => x.id === id);
      const seen = s.inspected.indexOf(id) >= 0;
      b.classList.toggle('seen', seen);
      b.classList.toggle('target', targets.indexOf(id) >= 0);
      b.classList.toggle('active', ui.selected === id);
      b.classList.toggle('built', h.kind === 'site' && s.builds[id] === 'built');
      const state = h.kind === 'site' ? ` — ${s.builds[id] === 'built' ? 'built' : s.builds[id] === 'building' ? 'under construction' : 'construction site'}` : seen ? ' — visited' : '';
      b.setAttribute('aria-label', h.label + state);
      b.setAttribute('aria-pressed', ui.selected === id ? 'true' : 'false');
      if (h.kind === 'site') b.querySelector('.tag').textContent = s.builds[id] === 'built' ? D().builds[id].name : h.label;
    });
    els.hs.querySelectorAll('.node').forEach((b) => {
      const h = scene.hotspots.find((x) => x.id === b.dataset.id); const left = s.nodes[h.id].charges;
      b.querySelector('.pips').innerHTML = Array.from({ length: h.charges }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('');
      b.classList.toggle('empty', left <= 0);
      b.classList.toggle('target', targets.indexOf(h.id) >= 0);
      b.disabled = left <= 0;
      const r = D().resources[h.res];
      b.setAttribute('aria-label', left > 0 ? `${r.verb} (+${h.yield}). ${left} of ${h.charges} left here.` : `${r.name}: this spot is cleared for now.`);
    });
  }

  /* ---- Effects --------------------------------------------------------------------------------- */
  function floatText(id, html) {
    const h = scene.hotspots.find((x) => x.id === id); if (!h || !els.fx) return;
    const [x, y] = V(h.x, h.y);
    const el = document.createElement('div'); el.className = 'float'; el.innerHTML = html;
    el.style.left = f1(x) + '%'; el.style.top = f1(y) + '%';
    els.fx.appendChild(el); setTimeout(() => el.remove(), 1500);
    const btn = els.hs.querySelector(`[data-id="${id}"]`);
    if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  }
  function celebrate(id) {
    const h = scene.hotspots.find((x) => x.id === id); if (!h || !els.fx) return;
    const [x, y] = V(h.x, h.y);
    const el = document.createElement('div'); el.className = 'burst'; el.style.left = f1(x) + '%'; el.style.top = f1(y) + '%';
    el.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--d:${40 + (i % 3) * 14}px"></i>`).join('');
    els.fx.appendChild(el); setTimeout(() => el.remove(), 1600);
  }
  function focusHotspot(id) { const b = els.hs && els.hs.querySelector(`[data-id="${id}"]`); if (b) b.focus({ preventScroll: false }); }
  function scrollToHotspot(id) {
    const host = els.host; if (!host || !host.classList.contains('pan')) return;
    const h = scene.hotspots.find((x) => x.id === id); if (!h) return;
    const [x] = V(h.x, h.y);
    host.scrollTo({ left: Math.max(0, (x / 100) * els.box.clientWidth - host.clientWidth / 2), behavior: reduced ? 'auto' : 'smooth' });
  }

  WV.scene = { mount, update, fit, floatText, celebrate, focusHotspot, scrollToHotspot, setReducedMotion, stopWalkers };
})(window);
