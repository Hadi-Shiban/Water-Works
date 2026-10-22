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
  const IMG = (p) => (WV.device ? WV.device.img(p) : p);
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
      <g id="art-person">
        <ellipse cx="0" cy="0" rx="6.5" ry="2" fill="#1d1408" opacity=".34"/>
        <path class="legs" d="M-2 -8 L-3.2 0 M2 -8 L3.2 0" stroke="var(--skin)" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M-5.2 -7.5 Q-5.6 -18 0 -19.2 Q5.6 -18 5.2 -7.5 Z" fill="var(--tunic)" stroke="#2a1d10" stroke-width=".7" stroke-opacity=".55"/>
        <circle cx="0" cy="-22.4" r="3.5" fill="var(--skin)" stroke="#2a1d10" stroke-width=".6" stroke-opacity=".5"/>
        <path d="M-3.6 -23.4 q3.6 -4.4 7.2 0 q-3.6 -1.4 -7.2 0" fill="var(--hair)"/>
      </g>
      <use href="#art-person"/>
      <path d="M4.6 -14 L7.4 -9" stroke="var(--skin)" stroke-width="1.8" stroke-linecap="round"/>
      <use href="#art-can" transform="translate(9 -2) scale(.8)"/>
    </g>

    <g id="art-walker-jar">
      <use href="#art-person"/>
      <path d="M4.4 -14 L6.6 -10 M-4.4 -14 L-6 -8.5" stroke="var(--skin)" stroke-width="1.7" stroke-linecap="round"/>
      <rect x="5" y="-12.5" width="5.2" height="6.8" rx="1.2" fill="#dcefff" stroke="#3f6d8e" stroke-width=".8"/>
      <rect x="5.2" y="-13.6" width="4.8" height="1.6" rx=".5" fill="#f2c118"/>
    </g>
    <g id="art-walker-free">
      <use href="#art-person"/>
      <path d="M4.4 -14 L6 -8.5 M-4.4 -14 L-6 -8.5" stroke="var(--skin)" stroke-width="1.7" stroke-linecap="round"/>
    </g>

    <g id="art-worker">
      <ellipse cx="0" cy="0" rx="6.5" ry="2" fill="#1d1408" opacity=".32"/>
      <path d="M-2 -8 L-3.2 0 M2 -8 L3.2 0" stroke="var(--skin)" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M-5.2 -7.5 Q-5.6 -18 0 -19.2 Q5.6 -18 5.2 -7.5 Z" fill="var(--tunic)"/>
      <circle cx="0" cy="-22.4" r="3.5" fill="var(--skin)"/>
      <path d="M-3.8 -23.6 q3.8 -3.6 7.6 0 Z" fill="#f2c118"/>
      <g class="hammer"><path d="M4 -15 L10 -21" stroke="var(--skin)" stroke-width="1.9" stroke-linecap="round"/><path d="M10 -21 L12.5 -26" stroke="#5e3b20" stroke-width="1.6"/><rect x="10" y="-28.5" width="6" height="3" rx=".8" fill="#55524c" transform="rotate(-25 13 -27)"/></g>
    </g>

    <!-- Level 3 water systems (origin = ground contact point) -->
    <g id="art-tapstand" filter="url(#wv-paint)">
      <ellipse cx="0" cy="2" rx="30" ry="8" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
      <path d="M-26 0 L-14 -8 L22 -8 L30 0 L18 8 L-18 8 Z" fill="#cfc8b8" stroke="#8f887a" stroke-width="1"/>
      <path d="M-20 0 L-11 -5 L18 -5 L24 0 L14 5 L-14 5 Z" fill="#b9b2a2"/>
      <rect x="-4" y="-34" width="10" height="32" rx="1.5" fill="#e6dfcf" stroke="#8f887a" stroke-width="1"/>
      <rect x="6" y="-34" width="4" height="32" fill="#cfc6b2"/>
      <path d="M-4 -24 h-8 v4" fill="none" stroke="#4d5a63" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="-14" y="-28" width="5" height="3" rx="1" fill="#2f6f9a"/>
      <circle cx="-12" cy="-16" r="0" class="tap-drop" fill="#7fc0e6"/>
      <use href="#art-can" transform="translate(-12 4) scale(.9)"/>
      <use href="#art-can" transform="translate(14 3) scale(.8)"/>
    </g>
    <g id="art-handpump" filter="url(#wv-paint)">
      <ellipse cx="0" cy="2" rx="30" ry="9" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
      <ellipse cx="0" cy="0" rx="26" ry="11" fill="#cfc8b8" stroke="#8f887a" stroke-width="1"/>
      <ellipse cx="0" cy="-1" rx="20" ry="8" fill="#bdb6a6"/>
      <path d="M18 2 L30 7" stroke="#8f887a" stroke-width="3" stroke-linecap="round"/>
      <rect x="-5" y="-38" width="10" height="36" rx="2" fill="#2f6b5a" stroke="#1d4237" stroke-width="1"/>
      <rect x="-6" y="-42" width="12" height="6" rx="2" fill="#24584a"/>
      <path d="M-5 -26 h-10 v5" fill="none" stroke="#24584a" stroke-width="3.4" stroke-linecap="round"/>
      <g class="pump-handle"><path d="M4 -38 L28 -48" stroke="#1d4237" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="-48" r="2.6" fill="#f2c118"/></g>
      <use href="#art-can" transform="translate(-14 4) scale(.9)"/>
    </g>
    <g id="art-raintank" filter="url(#wv-paint)">
      <ellipse cx="0" cy="3" rx="30" ry="9" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
      <ellipse cx="0" cy="0" rx="26" ry="8" fill="#a59f92"/>
      <path d="M-22 -2 V-46 A22 7 0 0 1 22 -46 V-2 A22 7 0 0 1 -22 -2 Z" fill="#d9d3c4" stroke="#8f887a" stroke-width="1"/>
      <path d="M8 -46 V-2" stroke="#c4bdac" stroke-width="10" opacity=".6"/>
      <ellipse cx="0" cy="-46" rx="22" ry="7" fill="#c9c2b2" stroke="#8f887a" stroke-width="1"/>
      <ellipse cx="0" cy="-48" rx="8" ry="3" fill="#8f887a"/>
      <rect x="-22" y="-40" width="5" height="34" rx="1" fill="#1d1408" opacity=".08"/>
      <g class="tank-level"><rect x="-2" y="-36" width="4" height="30" rx="1" fill="#efe9dc" stroke="#8f887a" stroke-width=".6"/><rect class="tank-fill" x="-1.2" y="-8" width="2.4" height="2" fill="#4a9ccc"/></g>
      <path d="M-22 -8 h-7 v4" fill="none" stroke="#4d5a63" stroke-width="2.4" stroke-linecap="round"/>
      <use href="#art-can" transform="translate(-26 6) scale(.85)"/>
    </g>
    <g id="art-rig" filter="url(#wv-paint)">
      <ellipse cx="0" cy="2" rx="34" ry="9" fill="#1d1408" opacity=".28" filter="url(#wv-soft)"/>
      <path d="M-22 4 L0 -70 L22 4 M-12 -30 H12 M-16 -14 H16" fill="none" stroke="#8a5a2b" stroke-width="3.4" stroke-linejoin="round"/>
      <rect x="-4" y="-78" width="8" height="10" fill="#f2c118" stroke="#a37a00"/>
      <g class="drill"><rect x="-2" y="-66" width="4" height="66" fill="#5e6266"/></g>
      <rect x="18" y="-14" width="20" height="14" rx="2" fill="#f2c118" stroke="#a37a00"/><circle cx="23" cy="2" r="3" fill="#3a3a3a"/><circle cx="33" cy="2" r="3" fill="#3a3a3a"/>
    </g>
    <g id="art-springbox" filter="url(#wv-paint)">
      <ellipse cx="0" cy="2" rx="22" ry="6" fill="#1d1408" opacity=".3" filter="url(#wv-soft)"/>
      <path d="M-18 0 L-18 -14 L12 -18 L18 -12 L18 2 Z" fill="#d6cfbf" stroke="#8f887a" stroke-width="1"/>
      <path d="M-18 -14 L12 -18 L18 -12 L-12 -9 Z" fill="#c2bba9" stroke="#8f887a" stroke-width="1"/>
      <rect x="-6" y="-16" width="10" height="3" rx="1" fill="#6f6a60"/>
    </g>

    <!-- Animals: small, painterly, with a part that moves -->
    <g id="an-sheep"><ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#1d1408" opacity=".3"/>
      <path d="M-5 -1 v-4 M-1 -1 v-4 M3 -1 v-4 M6 -1 v-4" stroke="#3a2f27" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M-8 -6 q-2 -6 3 -7 q2 -4 6 -2 q4 -3 7 1 q4 1 2 6 q0 4 -5 4 h-9 q-5 0 -4 -2z" fill="#f4efe2" stroke="#b8ad98" stroke-width=".8"/>
      <g class="head"><ellipse cx="10" cy="-9" rx="3.2" ry="2.6" fill="#3a2f27"/><path d="M8 -11 l-1.5 -1.4" stroke="#3a2f27" stroke-width="1.2"/></g></g>
    <g id="an-chicken"><ellipse cx="0" cy="1" rx="4.5" ry="1.3" fill="#1d1408" opacity=".3"/>
      <path d="M-1 0 v-3 M1.5 0 v-3" stroke="#d48a1c" stroke-width="1"/>
      <path d="M-5 -6 q0 -4 4 -4 h3 q3 0 3 3 q0 4 -4 4 h-4 q-2 0 -2 -3z" fill="#f6efe0" stroke="#b8ad98" stroke-width=".6"/>
      <path d="M-5 -6 l-2 -3 l2 1z" fill="#e9dfc6"/>
      <g class="head"><circle cx="5" cy="-10" r="2.1" fill="#f6efe0" stroke="#b8ad98" stroke-width=".5"/><path d="M5 -12.6 q1 -1 2 0" fill="#c8402a" stroke="#c8402a" stroke-width="1"/><path d="M7 -10 l1.8 .6 l-1.8 .5z" fill="#e8a21c"/></g></g>
    <g id="an-bird"><path class="wing" d="M-6 0 q3 -4 6 0 q3 -4 6 0" fill="none" stroke="#2e2a27" stroke-width="1.5" stroke-linecap="round"/></g>
    <g id="an-goat"><ellipse cx="0" cy="1" rx="9" ry="2.3" fill="#1d1408" opacity=".32"/>
      <path d="M-6 -2 l-.6 3 M-3 -2 l.4 3 M4 -2 l-.4 3 M6.5 -2 l.6 3" stroke="#4a3a2c" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M-8.5 -6 q-1 -5 4 -6.5 q5 -1.2 10 0 q3.5 1 3.5 5 q0 3.5 -4 3.5 h-10 q-3.5 0 -3.5 -2z" fill="#efe4d0" stroke="#8f7f68" stroke-width=".7"/>
      <path d="M-3 -11 q3 1.5 6 0" fill="none" stroke="#d8c8ae" stroke-width="1"/>
      <path d="M-8.5 -7 q-2.2 -1.5 -2 -3.5" fill="none" stroke="#8f7f68" stroke-width="1.1" stroke-linecap="round"/>
      <g class="head"><path d="M7 -9 q1.5 -4.5 5 -4.5 q2.8 .4 2.6 3.4 l-1.6 3.6 q-1 1.4 -2.4 .2z" fill="#c9a985" stroke="#7d6450" stroke-width=".6"/>
        <path d="M10 -13 q-.6 -3.4 -3.4 -4.4 M12.4 -13.2 q.4 -3.4 -1.4 -4.8" fill="none" stroke="#5a4636" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M13.2 -5 q.4 2 -1 2.6" fill="none" stroke="#efe4d0" stroke-width="1.1"/><circle cx="12.4" cy="-10.6" r=".6" fill="#2a1d10"/></g></g>
    <g id="an-lizard"><g class="body"><path d="M-10 .4 q4 -1.6 7.5 -.6 q3 -2.6 7.5 -1.6 q2.6 .2 3.4 1.6 q-1 1.4 -3.4 1.4 q-4.4 1.4 -7.5 .2 q-4 1.2 -7.5 -1z" fill="#c9783a" stroke="#6e3a17" stroke-width=".7"/><circle cx="6.6" cy="-.6" r=".5" fill="#111"/><path d="M-1 -1.2 l1 .8 l1.2 -.8 l1 .8" fill="none" stroke="#f0c27a" stroke-width=".6"/>
      <path d="M-4 0 l-1.5 2 M1 0 l1.5 2 M-3 -0.5 l-1.5 -2 M2 -0.8 l1.5 -2" stroke="#3f5a1f" stroke-width=".9"/></g></g>
    <g id="an-duck"><ellipse cx="0" cy="0.4" rx="9" ry="2" fill="#2d6f96" opacity=".3"/>
      <path d="M-8 -2 q-1.5 -4 2 -4.6 q2.5 -.4 4 1 h7 q3.4 0 3.4 2.6 q0 1.8 -2 1.8 h-12.6 q-1.8 0 -1.8 -.8z" fill="#9b7a55" stroke="#5c452c" stroke-width=".6"/>
      <path d="M-9.6 -4.6 l2.2 1 l-.4 1.6z" fill="#5c452c"/>
      <path d="M-3 -4.2 q4 -1.6 8 0 q-3 2 -8 0z" fill="#d9c4a2"/>
      <path d="M-1.6 -4.4 q3 -.6 5.4 .2" fill="none" stroke="#3f6f9a" stroke-width="1.2"/>
      <g class="head"><path d="M5.6 -3.6 q-.6 -3.4 1.4 -5.2" fill="none" stroke="#2f6b4f" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="7.6" cy="-9.4" r="2.5" fill="#2f6b4f"/><path d="M9.6 -9.4 l3.2 .5 l-3.2 .9z" fill="#e8a21c"/><path d="M5.4 -6 h3.4" stroke="#f4efe2" stroke-width=".9"/><circle cx="8.2" cy="-10" r=".5" fill="#111"/></g>
      <path class="ripple" d="M-11 1 q11 3 22 0" fill="none" stroke="#e8f4fa" stroke-width=".8" opacity=".7"/></g>
    <g id="an-frog"><g class="body"><ellipse cx="0" cy="0" rx="5" ry="1.4" fill="#1d1408" opacity=".25"/>
      <path d="M-5 -1 q0 -4 5 -4 q5 0 5 4 q-1 1 -3 1 h-4 q-3 0 -3 -1z" fill="#5f9a3a" stroke="#355a1f" stroke-width=".6"/>
      <circle cx="-2" cy="-5" r="1.4" fill="#5f9a3a" stroke="#355a1f" stroke-width=".5"/><circle cx="2" cy="-5" r="1.4" fill="#5f9a3a" stroke="#355a1f" stroke-width=".5"/>
      <circle cx="-2" cy="-5.2" r=".5" fill="#111"/><circle cx="2" cy="-5.2" r=".5" fill="#111"/></g></g>
    <g id="an-heron"><ellipse cx="0" cy="0" rx="7" ry="1.6" fill="#2d6f96" opacity=".35"/>
      <path d="M-1 0 v-12 M2 0 v-12" stroke="#8a7f6a" stroke-width="1.2"/>
      <path d="M-8 -14 q2 -6 9 -6 q4 0 4 3 q0 4 -5 4 h-6z" fill="#c9cfd6" stroke="#7d858d" stroke-width=".6"/>
      <g class="head"><path d="M4 -18 q3 -5 1 -10 q-1 -3 2 -4" fill="none" stroke="#c9cfd6" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="7" cy="-32" r="2" fill="#dfe3e8" stroke="#7d858d" stroke-width=".5"/><path d="M9 -32 l6 1.2 l-6 .6z" fill="#e0b13a"/><path d="M6 -33 l-4 -1" stroke="#2e2a27" stroke-width=".8"/></g></g>
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
      // The structure stands at `ground` if given, else just below the hotspot ring.
      const [px, py] = h.ground ? P(h.ground[0], h.ground[1]) : (([x, y]) => [x, y + 52 * k])(P(h.x, h.y));
      if (h.id === 'waterPoint') return waterPointSite(h, px, py, k);
      return `<g class="site" data-site="${h.id}" data-state="site" transform="translate(${f1(px)} ${f1(py)}) scale(${k})">
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
    const sys = scene.system || {};
    const pipe = sys.pipe ? `<path class="pipeline" data-state="hidden" d="${smoothPath(sys.pipe)}" stroke-width="${f1(3.2 * k)}"/><path class="pipeflow" d="${smoothPath(sys.pipe)}" stroke-width="${f1(2.4 * k)}"/>` : '';
    const gutter = sys.gutter ? `<path class="gutter" data-state="hidden" d="M${sys.gutter.map(([x, y]) => P(x, y).map(f1).join(' ')).join(' L')}" stroke-width="${f1(3 * k)}"/>` : '';
    const extras = (sys.extras || []).map((e) => { const [px, py] = P(e.at[0], e.at[1]); return `<g class="sys-extra" data-state="hidden" transform="translate(${f1(px)} ${f1(py)}) scale(${f1(k * (e.scale || 1) * 100) / 100})"><use href="#art-${e.art}"/></g>`; }).join('');
    return `<svg class="scene" viewBox="${f1(c.x)} ${f1(c.y)} ${f1(c.w)} ${f1(c.h)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      ${DEFS}
      <image href="${IMG(scene.image)}" x="0" y="0" width="${scene.w}" height="${scene.h}" preserveAspectRatio="none"/>
      <g class="routes">${routesMarkup()}</g>
      <g class="system">${pipe}${gutter}${extras}</g>
      <g class="animals">${animalsMarkup()}</g>
      ${issueMarkup()}
      <g class="cottages">${cottages}</g>
      <g class="sites">${sites}</g>
      <g class="walkers"></g>
    </svg>`;
  }

  /* The water point: staked site → construction (frame or drilling rig, workers, supplies) →
     finished structure. Activation effects attach to the same group.                    */
  function waterPointSite(h, px, py, k) {
    const art = (scene.system && scene.system.art) || 'tapstand';
    const crew = art === 'handpump' ? '<use href="#art-rig" class="rising"/>' : `<use href="#art-frame" transform="scale(.8)"/><use href="#art-${art}" class="rising"/>`;
    const kk = f1(k * 1.35 * 100) / 100; // water points read better a little larger than the station
    return `<g class="site wp" data-site="waterPoint" data-state="site" data-art="${art}" transform="translate(${f1(px)} ${f1(py)}) scale(${kk})">
      <g class="st-site"><ellipse rx="34" ry="10" class="footprint"/>
        ${[[-30, 4], [30, -2], [-4, 9]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M0 0 V-20" stroke="#7a4e2b" stroke-width="2"/><path d="M0 -20 L10 -16.8 L0 -13.6 Z" fill="#f2c118" class="flag"/></g>`).join('')}</g>
      <g class="st-building"><use href="#art-piles" transform="scale(.8)"/>${crew}
        <use href="#art-worker" transform="translate(-40 6)" style="${look(2)}"/><use href="#art-worker" transform="translate(42 7) scale(-1 1)" style="${look(5)}"/>
        <g class="dust"><circle cx="-14" cy="2" r="5"/><circle cx="12" cy="0" r="4"/><circle cx="0" cy="4" r="6"/></g></g>
      <g class="st-built"><circle r="56" cy="-14" fill="url(#wv-glow)" class="glow"/><use href="#art-${art}"/>
        <g class="splash"><circle cx="-14" cy="-14" r="1.6"/><circle cx="-12" cy="-10" r="1.3"/><circle cx="-14" cy="-6" r="1.5"/></g></g>
    </g>`;
  }

  /* Level 5: a small, readable sign of the problem at its spot (drips, leaves or a sagging pump). */
  function issueMarkup() {
    const h = scene.hotspots.find((x) => x.id === 'issue'); if (!h) return '';
    const [px, py] = P(h.x, h.y); const k = scene.structureScale;
    return `<g class="issue-fx" data-fx="" transform="translate(${f1(px)} ${f1(py + 14 * k)}) scale(${k})">
      <g class="fx-leak"><ellipse rx="16" ry="5" fill="#3f7fa6" opacity=".45"/><circle class="drop" cx="-3" cy="-10" r="2.2"/><circle class="drop d2" cx="4" cy="-12" r="1.8"/><circle class="drop d3" cx="0" cy="-8" r="1.5"/></g>
      <g class="fx-leaves">${[[-12, -4, 20], [-4, -7, -30], [6, -3, 50], [13, -6, 10], [0, -2, -60]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2" transform="rotate(${r} ${x} ${y})" fill="${r > 0 ? '#9a7a2c' : '#6f8f3a'}"/>`).join('')}<path class="spill" d="M14 -6 q2 6 0 12" fill="none" stroke="#7fc0e6" stroke-width="2"/></g>
      <g class="fx-pump"><path d="M-10 -26 l-4 -4 M10 -26 l4 -4 M0 -30 v-5" stroke="#b0390b" stroke-width="2" stroke-linecap="round"/></g>
    </g>`;
  }

  /* ---- Animals ---------------------------------------------------------------------------
     Each is a <g> placed in painting coordinates; CSS animates an inner group (graze, peck,
     swim, hop, dart, fly…) with long, staggered pauses so the village feels calm.      */
  function animalsMarkup() {
    return (scene.animals || []).map((a, i) => {
      const [px, py] = P(a.x, a.y); const k = (a.s || 1) * 1.7 * (scene.walkerScale ? scene.walkerScale[0] : 1);
      const range = a.range ? `--range:${a.range}px;` : '';
      return `<g class="animal an-${a.kind} a-${a.anim}" transform="translate(${f1(px)} ${f1(py)}) scale(${f1(k * (a.flip ? -1 : 1) * 100) / 100} ${f1(k * 100) / 100})">
        <g class="move" style="${range}animation-delay:${a.delay || (i * 0.9) % 4}s"><use href="#an-${a.kind}" style="animation-delay:${a.delay || (i * 0.9) % 4}s"/></g></g>`;
    }).join('');
  }

  /* ---- Routes: smooth curves through the waypoints painted roads suggest --------------------
     Catmull-Rom through every waypoint (so the walk passes exactly where the data says),
     converted to cubic Béziers for SVG.                                                    */
  function smoothPath(points) {
    const p = points.map(([x, y]) => P(x, y));
    if (p.length < 2) return '';
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  }
  const allRoutes = () => WV.sim.allRoutes(scene);
  function routesMarkup() {
    const k = scene.structureScale;
    return allRoutes().map(([id, rt]) => {
      const d = smoothPath(rt.points);
      const shown = rt.lit ? `<path class="route" d="${d}" stroke-width="${f1(4 * k)}"/><path class="route-lit" d="${d}" stroke-width="${f1(6 * k)}"/>` : '';
      return `<g class="rt" data-route="${id}"><path class="rt-path" d="${d}"/>${shown}</g>`;
    }).join('');
  }

  const NODE_ICON = {
    wood: '<svg viewBox="-16 -16 32 32" aria-hidden="true"><circle cx="-5" cy="3" r="5.2" fill="#a26a3a" stroke="#5e3b20" stroke-width="1.4"/><circle cx="-5" cy="3" r="2" fill="none" stroke="#5e3b20" stroke-width=".9"/><circle cx="5.5" cy="3.5" r="5" fill="#b07642" stroke="#5e3b20" stroke-width="1.4"/><circle cx="5.5" cy="3.5" r="1.9" fill="none" stroke="#5e3b20" stroke-width=".9"/><circle cx="0.4" cy="-5.6" r="5" fill="#9a6235" stroke="#5e3b20" stroke-width="1.4"/><circle cx="0.4" cy="-5.6" r="1.9" fill="none" stroke="#5e3b20" stroke-width=".9"/></svg>',
    stone: '<svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="M-12 8 q-2 -9 6 -11 q8 -1 9 11 Z" fill="#a39d92" stroke="#5d584f" stroke-width="1.3"/><path d="M-1 8 q-1 -12 8 -12 q7 1 6 12 Z" fill="#bdb6a9" stroke="#5d584f" stroke-width="1.3"/><path d="M-7 -1 q0 -9 7 -9 q6 1 4 9 Z" fill="#8f897e" stroke="#5d584f" stroke-width="1.3"/></svg>',
  };

  /* Crack overlays drawn over the node icon; CSS reveals stage 1 then 2 by data-hits. */
  const CRACKS = {
    wood: `<svg class="cracks" viewBox="-16 -16 32 32" aria-hidden="true">
      <g class="c1"><path d="M-5 3 l-2.6 -2.2 M0.4 -5.6 l2.6 -2.4 M5.5 3.5 l2.4 1.6"/></g>
      <g class="c2"><path d="M-5 3 l3.2 3 M-5 3 l-1 -4.6 M0.4 -5.6 l-3 1.2 M0.4 -5.6 l0.6 4.4 M5.5 3.5 l-0.8 -4.4 M5.5 3.5 l-3 2.4"/></g></svg>`,
    stone: `<svg class="cracks" viewBox="-16 -16 32 32" aria-hidden="true">
      <g class="c1"><path d="M-1 -8 l1.6 3.4 l-2 2.6"/></g>
      <g class="c2"><path d="M-2.4 -2 l2.8 3 l-1.2 3.6 l2.4 3 M-2.4 -2 l-3.6 1.2 l-2 3.4 M0.4 1 l4 -1.4 l2.6 2.2"/></g></svg>`,
  };
  const FRAG = { wood: ['#a26a3a', '#7a4e2b', '#c48a52'], stone: ['#a39d92', '#8f897e', '#c4beb2'] };

  function hotspotMarkup(s) {
    return scene.hotspots.map((h) => {
      const [x, y] = V(h.x, h.y);
      if (h.kind === 'node') {
        const r = D().resources[h.res];
        return `<button type="button" class="node" data-act="gather" data-id="${h.id}" data-res="${h.res}" data-hits="0" style="left:${f1(x)}%;top:${f1(y)}%">
          <span class="node-chip">${NODE_ICON[h.res]}${CRACKS[h.res]}</span><span class="hitcount" aria-hidden="true"></span>
          <span class="pips" aria-hidden="true"></span><span class="sr-only">${r.verb}</span></button>`;
      }
      return `<button type="button" class="hs hs-${h.kind}${h.below ? ' hs-below' : ''}" data-act="inspect" data-id="${h.id}" style="left:${f1(x)}%;top:${f1(y)}%">
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
    host.style.setProperty('--backdrop', `url('${new URL(IMG(scene.image), document.baseURI).href}')`);
    const oldRo = els.ro;
    els = { host, box: host.querySelector('#mapbox'), svg: host.querySelector('svg'), hs: host.querySelector('#hotspots'), fx: host.querySelector('#fx') };
    planKey = ''; walkers = [];
    if (oldRo) oldRo.disconnect();
    const refit = () => fit(false);
    els.ro = root.ResizeObserver ? new ResizeObserver(refit) : null;
    if (els.ro) els.ro.observe(host); else root.addEventListener('resize', refit);
    fit(true);
    mountHooks.forEach((fn) => fn(api));
  }

  /* Fill the screen when the aspect ratios are close (cover), letterbox when they
     are not (contain), and switch to horizontal panning on tall, narrow screens. */
  function fit(first) {
    const host = els.host; if (!host || !crop) return;
    const vw = host.clientWidth, vh = host.clientHeight; if (!vw || !vh) return;
    const contain = Math.min(vw / crop.w, vh / crop.h), cover = Math.max(vw / crop.w, vh / crop.h);
    const narrow = vw / vh < 1.05;
    const k = narrow ? vh / crop.h : cover / contain <= 1.12 ? cover : contain;
    const w = Math.round(crop.w * k), h = Math.round(crop.h * k);
    els.box.style.width = w + 'px';
    els.box.style.height = h + 'px';
    // Centre the painting, so any cropping in cover mode is shared equally by both sides.
    els.box.style.left = narrow ? '0px' : Math.round((vw - w) / 2) + 'px';
    els.box.style.top = Math.round((vh - h) / 2) + 'px';
    host.classList.toggle('pan', narrow);
    if (narrow && first === true) {
      const [fx] = V(scene.focus.x, scene.focus.y);
      host.scrollLeft = Math.max(0, (fx / 100) * crop.w * k - vw / 2);
    }
  }

  /* ---- Walkers ------------------------------------------------------------------------------
     Each walker follows its route's SVG path at a constant speed (painting px per second),
     out to the end and back again, so it never jumps. Its offset along the path comes from
     the route's spacing, so walkers on one route are spread out rather than bunched.   */
  function buildWalkers(plan) {
    const layer = els.svg.querySelector('.walkers'); layer.innerHTML = '';
    walkers = [];
    let n = 0;
    plan.forEach((p) => {
      const g = els.svg.querySelector(`.rt[data-route="${p.id}"]`); if (!g) return;
      const path = g.querySelector('.rt-path'); const len = path.getTotalLength(); if (!len) return;
      const count = p.count != null ? p.count : (p.route.walkers || 1) + (p.extra || 0);
      const spacing = p.route.spacing || len / p.route.speed / count; // default: evenly spread
      for (let i = 0; i < count; i++) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.setAttribute('class', 'walker' + (p.route.cans ? ' carrying' : ''));
        el.dataset.route = p.id;
        el.innerHTML = `<use href="#${p.route.cans ? 'art-walker' : p.route.jar ? 'art-walker-jar' : 'art-walker-free'}" style="${look(n * 2 + 1)}"/>`;
        layer.appendChild(el);
        walkers.push({ el, path, len, speed: p.route.speed, dwell: (p.route.dwell || 0) * p.route.speed, offset: i * spacing * p.route.speed + (n * 37) % 23, index: i, count, flip: 1, phase: n * 1.7 });
        n++;
      }
    });
    els.svg.querySelectorAll('.rt').forEach((g) => g.classList.toggle('active', plan.some((p) => p.id === g.dataset.route)));
    startWalkers();
  }
  function placeWalker(w, time) {
    let pos, dir;
    if (reduced) { pos = ((w.index + 0.5) / w.count) * w.len; dir = 1; } else {
      // Out, a short wait at the water point (filling up, a small queue), then back.
      const u = ((time / 1000) * w.speed + w.offset) % (2 * w.len + w.dwell);
      if (u <= w.len) { pos = u; dir = 1; }
      else if (u <= w.len + w.dwell) { pos = Math.max(0, w.len - (w.index % 3) * 7); dir = 1; }
      else { pos = 2 * w.len + w.dwell - u; dir = -1; }
    }
    const p = w.path.getPointAtLength(pos);
    const q = w.path.getPointAtLength(Math.max(0, Math.min(w.len, pos + dir * 4)));
    const dx = (q.x - p.x) * dir;
    if (Math.abs(q.x - p.x) > 0.6) w.flip = (q.x - p.x) >= 0 ? 1 : -1; // keep facing on near-vertical stretches
    const ws = scene.walkerScale; const sc = ws[0] + (ws[1] - ws[0]) * (p.y / scene.h);
    const bob = reduced ? 0 : Math.abs(Math.sin(time / 165 + w.phase)) * -1.3 * sc;
    w.el.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y + bob)}) scale(${f1(sc * w.flip * 100) / 100} ${f1(sc * 100) / 100})`);
    return dx;
  }
  function tick(time) {
    walkers.forEach((w) => placeWalker(w, time));
    raf = root.requestAnimationFrame(tick);
  }
  function startWalkers() {
    stopWalkers();
    if (!walkers.length) return;
    if (reduced) { walkers.forEach((w) => placeWalker(w, 0)); return; }
    raf = root.requestAnimationFrame(tick);
  }
  function stopWalkers() { if (raf) root.cancelAnimationFrame(raf); raf = 0; }
  function setReducedMotion(on) { reduced = !!on; if (els.svg) startWalkers(); }
  document.addEventListener('visibilitychange', () => { if (!els.svg) return; if (document.hidden) stopWalkers(); else startWalkers(); });

  /* ---- Update -------------------------------------------------------------------------------- */
  function update(s, ui) {
    if (!els.svg) return;
    lastState = s; lastUi = ui;
    const plan = WV.sim.walkerPlan(s, { after: previewAfter });
    const key = plan.map((p) => p.id + ':' + (p.count != null ? p.count : (p.route.walkers || 1) + (p.extra || 0))).join('|');
    if (key !== planKey) { planKey = key; buildWalkers(plan); }
    els.svg.querySelectorAll('.site').forEach((g) => g.setAttribute('data-state', s.builds[g.dataset.site] || 'site'));
    const sysState = s.flags.systemActive ? 'active' : s.builds.waterPoint === 'built' ? 'built' : 'hidden';
    els.svg.querySelectorAll('.pipeline, .gutter, .sys-extra').forEach((g) => { if (!g.classList.contains('flowing')) g.setAttribute('data-state', sysState); });
    els.svg.classList.toggle('system-active', !!s.flags.systemActive);
    const issueOn = !!s.maint && !s.maint.repaired;
    els.svg.classList.toggle('maint-issue', issueOn);
    const fx = els.svg.querySelector('.issue-fx'); if (fx) fx.setAttribute('data-fx', issueOn ? WV.maint.def(s).fx : '');
    els.svg.classList.toggle('watching', !!ui.watching);
    const targets = ui.targets || [];
    els.hs.querySelectorAll('.hs').forEach((b) => {
      const id = b.dataset.id; const h = scene.hotspots.find((x) => x.id === id);
      b.hidden = !WV.sim.visible(s, h);
      b.classList.toggle('done', (h.kind === 'survey' && s.surveys.indexOf(id) >= 0) || ((h.kind === 'source' || h.kind === 'water') && !!s.results[id]));
      const seen = s.inspected.indexOf(id) >= 0;
      b.classList.toggle('seen', seen);
      b.classList.toggle('target', targets.indexOf(id) >= 0);
      b.classList.toggle('active', ui.selected === id);
      b.classList.toggle('built', h.kind === 'site' && s.builds[id] === 'built');
      const state = h.kind === 'site' ? `, ${s.builds[id] === 'built' ? 'built' : s.builds[id] === 'building' ? 'under construction' : 'construction site'}` : seen ? ', visited' : '';
      b.setAttribute('aria-label', h.label + state);
      b.setAttribute('aria-pressed', ui.selected === id ? 'true' : 'false');
      if (h.kind === 'site') b.querySelector('.tag').textContent = s.builds[id] === 'built' ? WV.sim.buildDef(s, id).name : h.label;
    });
    els.hs.querySelectorAll('.node').forEach((b) => {
      const h = scene.hotspots.find((x) => x.id === b.dataset.id); const left = s.nodes[h.id].charges;
      b.querySelector('.pips').innerHTML = Array.from({ length: h.charges }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('');
      b.classList.toggle('empty', left <= 0 && !b.classList.contains('breaking'));
      b.classList.toggle('target', targets.indexOf(h.id) >= 0);
      b.disabled = left <= 0 && !b.classList.contains('breaking');
      const hits = (ui.hits && ui.hits[h.id]) || 0; const need = WV.sim.hitsToBreak(s);
      if (!b.classList.contains('breaking')) setHits(b, hits);
      const r = D().resources[h.res];
      b.classList.toggle('regrowing', left < h.charges);
      b.setAttribute('aria-label', left > 0 ? `${r.verb}: tap ${need} times (+${h.yield}).${hits ? ` ${hits} of ${need} hits.` : ''} ${left} of ${h.charges} ready here${left < h.charges ? ', more growing back' : ''}.` : `${r.name}: growing back, ready again in a few seconds.`);
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
  /* ---- Three-hit gathering effects (pure decoration; the model decides rewards) ---------- */
  const nodeBtn = (id) => els.hs && els.hs.querySelector(`.node[data-id="${id}"]`);
  function setHits(b, n) {
    b.dataset.hits = String(n);
    b.querySelector('.hitcount').textContent = n > 0 ? `${n}/${WV.sim.hitsToBreak(lastState)}` : '';
  }
  function particles(id, kind, count, spread) {
    const h = scene.hotspots.find((x) => x.id === id); if (!h || !els.fx || reduced) return;
    const [x, y] = V(h.x, h.y); const cols = FRAG[h.res];
    const el = document.createElement('div'); el.className = `frags ${kind} ${h.res}`; el.style.left = f1(x) + '%'; el.style.top = f1(y) + '%';
    el.innerHTML = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * 360 + (i * 37) % 25; const d = spread * (0.6 + ((i * 53) % 40) / 100);
      return `<i style="--a:${a.toFixed(0)}deg;--d:${d.toFixed(0)}px;--r:${(i * 71) % 300}deg;background:${cols[i % cols.length]}"></i>`;
    }).join('');
    els.fx.appendChild(el); setTimeout(() => el.remove(), 900);
  }
  function hitNode(id, n) {
    const b = nodeBtn(id); if (!b) return;
    setHits(b, n);
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    particles(id, 'impact', 5, 22);
  }
  function breakNode(id) {
    const b = nodeBtn(id); if (!b) return;
    setHits(b, WV.sim.hitsToBreak(lastState));
    b.classList.remove('shake'); b.classList.add('breaking');
    particles(id, 'burst', 12, 46);
  }
  function resetNode(id) {
    const b = nodeBtn(id); if (!b) return;
    b.classList.remove('breaking', 'shake');
    setHits(b, 0);
    if (lastState) update(lastState, lastUi);
  }

  /* ---- Activation effects (decoration only) ------------------------------------------------- */
  function systemFx(effect) {
    if (!els.svg) return;
    const wp = els.svg.querySelector('.site.wp');
    const pulse = (el, cls, ms) => { if (!el) return; el.classList.remove(cls); void el.getBBox; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
    if (effect === 'flow') { const p = els.svg.querySelector('.pipeflow'); pulse(p, 'tracing', reduced ? 200 : 3000); }
    if (effect === 'gutter') { const g = els.svg.querySelector('.gutter'); pulse(g, 'lit', 2400); }
    if (effect === 'pump' || effect === 'tap') pulse(wp, effect === 'pump' ? 'pumping' : 'pouring', 900);
    if (effect === 'rain' && els.fx && !reduced) {
      const h = scene.hotspots.find((x) => x.id === 'waterPoint'); const [x, y] = V(h.ground[0], h.ground[1] - 6);
      const el = document.createElement('div'); el.className = 'rainfx'; el.style.left = f1(x) + '%'; el.style.top = f1(y) + '%';
      el.innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 120 - 60}px;animation-delay:${((i * 13) % 10) / 10}s"></i>`).join('');
      els.fx.appendChild(el); setTimeout(() => el.remove(), 2600);
    }
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

  /* ---- Developer hooks (used by dev.js; inert in normal play) ---------------------------- */
  let planKey = ''; let previewAfter = false; let lastState = null; let lastUi = {};
  const mountHooks = [];
  function rebuildRoutes() {
    if (!els.svg) return;
    els.svg.querySelector('.routes').innerHTML = routesMarkup();
    planKey = ''; if (lastState) update(lastState, lastUi);
  }
  function setPreviewAfter(on) { previewAfter = !!on; planKey = ''; if (lastState) update(lastState, lastUi); }
  const api = {
    mount, update, fit, floatText, celebrate, systemFx, hitNode, breakNode, resetNode, focusHotspot, scrollToHotspot, setReducedMotion, stopWalkers,
    onMount: (fn) => mountHooks.push(fn), rebuildRoutes, setPreviewAfter, smoothPath,
    get scene() { return scene; }, get svg() { return els.svg; }, get box() { return els.box; },
    walkerPositions: () => walkers.map((w) => ({ route: w.el.dataset.route, transform: w.el.getAttribute('transform') })),
  };
  WV.scene = api;
})(window);
