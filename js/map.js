/* =============================================================================
   WATERWORKS WIREFRAME — COMMUNITY MAP (inline SVG + HTML label overlay)
   -----------------------------------------------------------------------------
   The SVG is drawn once. update() only flips attributes/classes and rebuilds
   the small HTML label layer, so selection and animation stay cheap.
   Coordinates use a 1200 x 800 viewBox; labels are HTML so type stays readable
   at any map scale.
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = (root.WW = root.WW || {});
  const W = 1200, H = 800;

  /* Deterministic scatter for tree glyphs (no Math.random: stable between loads). */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function trees(box, n, seed, avoid) {
    const r = rng(seed); let out = '', c = 0, tries = 0;
    while (c < n && tries++ < n * 20) {
      const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
      if (avoid && avoid(x, y)) continue;
      out += `<g class="tree" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="${(5 + r() * 3).toFixed(1)}"/><path d="M0 4 V10"/></g>`; c++;
    }
    return out;
  }
  const house = (x, y, w = 22, h = 15) => `<g class="bld"><rect x="${x}" y="${y + 6}" width="${w}" height="${h - 6}"/><path d="M${x - 2} ${y + 7} L${x + w / 2} ${y} L${x + w + 2} ${y + 7}Z"/></g>`;
  const row = (x0, y, n, step) => Array.from({ length: n }, (_, i) => house(x0 + i * step, y)).join('');

  function markup() {
    const riverPath = 'M200 118 C210 180 230 215 262 272';
    const outflow = 'M400 345 C430 420 385 470 385 540 C385 620 430 700 480 800';
    const avoidWest = (x, y) => (x > 240 && y > 240) || (x < 30);
    return `
<svg id="map" class="map" viewBox="0 0 ${W} ${H}" role="group" aria-label="Alder Ford community map. Use Tab to move between map objects and Enter to inspect one." preserveAspectRatio="xMidYMid meet" focusable="false">
  <defs>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="hatch-line"/></pattern>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" class="grid-line"/></pattern>
    <clipPath id="tankClip"><circle cx="735" cy="318" r="33"/></clipPath>
    <marker id="ah-water" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9z" class="m-water"/></marker>
    <marker id="ah-waste" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9z" class="m-waste"/></marker>
    <marker id="ah-reuse" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9z" class="m-reuse"/></marker>
    <marker id="ah-runoff" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9z" class="m-runoff"/></marker>
    <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.10 0"/></filter>
  </defs>

  <rect class="land" width="${W}" height="${H}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)" class="grid"/>
  <rect width="${W}" height="${H}" filter="url(#paper)" class="noise"/>
  <g class="contours" aria-hidden="true">
    ${[40, 70, 100, 135, 175].map((rx, i) => `<ellipse cx="170" cy="95" rx="${rx}" ry="${[28, 48, 70, 95, 122][i]}" transform="rotate(-15 170 95)"/>`).join('')}
    ${[60, 100, 145].map((rx, i) => `<ellipse cx="1045" cy="565" rx="${rx}" ry="${[34, 60, 88][i]}" transform="rotate(8 1045 565)"/>`).join('')}
    <ellipse cx="980" cy="740" rx="110" ry="46" transform="rotate(6 980 740)"/><ellipse cx="980" cy="740" rx="170" ry="70" transform="rotate(6 980 740)"/>
  </g>

  <!-- 1 UPPER WATERSHED -->
  <g class="obj" id="obj-watershed" data-id="watershed" tabindex="0" role="button" aria-pressed="false" aria-label="Upper watershed and forest">
    <rect class="hit" x="0" y="0" width="360" height="380"/>
    <path class="mtn" d="M70 160 L130 70 L160 108 L205 38 L262 160Z"/><path class="mtn-shade" d="M205 38 L262 160 L215 160 L190 92Z"/>
    <path class="mtn" d="M232 182 L278 108 L326 182Z"/><path class="mtn-shade" d="M278 108 L326 182 L290 182Z"/>
    <g class="forest">${trees([28, 170, 330, 240], 22, 11)}${trees([28, 250, 240, 380], 16, 23, avoidWest)}</g>
    <rect class="sel" x="6" y="6" width="346" height="366" rx="3"/>
  </g>

  <!-- RIVER -->
  <g aria-hidden="true">
    <path class="river" d="${riverPath}"/><path class="river-core" d="${riverPath}"/>
    <path class="river" d="${outflow}"/><path class="river-core" d="${outflow}"/>
    <path class="pipe-flow flow-river" d="${riverPath} L262 272"/>
    <path class="pipe-flow flow-river" d="${outflow}"/>
  </g>

  <!-- 2 RESERVOIR + INTAKE -->
  <g class="obj" id="obj-reservoir" data-id="reservoir" tabindex="0" role="button" aria-pressed="false" aria-label="River and reservoir, water source">
    <path class="res" d="M250 290 C250 255 300 250 345 262 C392 274 412 305 397 336 C382 368 320 374 280 360 C250 348 248 318 250 290Z"/>
    <path class="wave" d="M275 300 q10 -8 20 0 t20 0 t20 0 M285 325 q10 -8 20 0 t20 0 t20 0 M300 348 q10 -8 20 0 t20 0"/>
    <path class="sel" d="M240 288 C240 245 300 240 348 252 C402 266 424 305 408 342 C390 380 318 386 274 370 C240 356 238 322 240 288Z"/>
  </g>
  <g class="obj" id="obj-intake" data-id="intake" tabindex="0" role="button" aria-pressed="false" aria-label="River intake pump">
    <rect class="hit" x="392" y="300" width="36" height="36"/><rect class="pump" x="398" y="306" width="24" height="24"/><path class="pump-ic" d="M404 318h12M410 312v12"/>
    <rect class="sel" x="388" y="296" width="44" height="44" rx="3"/>
  </g>

  <!-- RAW WATER LINE -->
  <g aria-hidden="true"><path class="pipe raw" d="M422 318 H470"/><path class="pipe-flow flow" d="M422 318 H470" marker-end="url(#ah-water)"/></g>

  <!-- 3 TREATMENT PLANT -->
  <g class="obj" id="obj-plant" data-id="plant" tabindex="0" role="button" aria-pressed="false" aria-label="Treatment plant">
    <rect class="plant" x="470" y="262" width="190" height="100"/>
    <path class="pipe raw" d="M470 318 H660"/><path class="pipe-flow flow" d="M470 318 H660"/>
    ${[['screening', 480, 'S'], ['coagulation', 516, 'C'], ['media', 552, 'M'], ['carbon', 588, 'A'], ['disinfection', 624, 'D']].map(([id, x, l]) =>
      `<g class="stage${id === 'carbon' ? ' stage-slot' : ''}" data-stage="${id}"><rect x="${x}" y="286" width="30" height="52" rx="2"/><rect class="stage-level" x="${x + 3}" y="${id === 'carbon' ? 290 : 300}" width="24" height="${id === 'carbon' ? 44 : 34}"/><text x="${x + 15}" y="${id === 'carbon' ? 316 : 324}" text-anchor="middle">${id === 'carbon' ? '+' : l}</text></g>`).join('')}
    <g data-ghost="carbon"><rect class="ghost-box" x="586" y="284" width="34" height="56" rx="3"/></g>
    <rect class="loadbar-bg" x="480" y="346" width="174" height="6"/><rect id="loadFill" class="loadbar" x="480" y="346" width="100" height="6"/><path id="capTick" class="loadtick" d="M560 341V357"/>
    <rect class="sel" x="464" y="256" width="202" height="112" rx="3"/>
  </g>

  <!-- 4 STORAGE -->
  <g aria-hidden="true"><path class="pipe" d="M660 318 H702"/><path class="pipe-flow flow" d="M660 318 H702" marker-end="url(#ah-water)"/></g>
  <g class="obj" id="obj-storage" data-id="storage" tabindex="0" role="button" aria-pressed="false" aria-label="Treated water storage tank">
    <circle class="tank" cx="735" cy="318" r="34"/>
    <g clip-path="url(#tankClip)"><rect id="tankWater" class="tank-water" x="700" y="284" width="70" height="70"/></g>
    <path class="tank-ring" d="M735 318m-26 0a26 26 0 1 0 52 0a26 26 0 1 0 -52 0"/>
    <rect class="sel" x="695" y="278" width="80" height="80" rx="40"/>
  </g>
  <g data-ghost="tank"><circle class="ghost-box" cx="690" cy="412" r="28"/><path class="ghost-line" d="M735 352 V380 H700"/><text class="ghost-t" x="690" y="416" text-anchor="middle">+100</text></g>

  <!-- 5 DISTRIBUTION -->
  <g aria-hidden="true">
    <path class="pipe" d="M769 318 H830"/><path class="pipe-flow flow" d="M769 318 H830"/>
    <path class="pipe" d="M830 318 V195 H1070"/><path class="pipe-flow flow" d="M830 318 V195 H1070" marker-end="url(#ah-water)"/>
    <path class="pipe" d="M830 400 H770 V490"/><path class="pipe-flow flow" d="M830 400 H770 V490" marker-end="url(#ah-water)"/>
    <circle class="junction" cx="830" cy="318" r="7"/>
  </g>
  <g class="obj pipeobj" id="obj-pipeD1" data-id="pipeD1" tabindex="0" role="button" aria-pressed="false" aria-label="District 1 distribution main">
    <path class="hitline" d="M830 300 V195 H1070"/><path class="sel-line" d="M830 300 V195 H1070"/>
  </g>
  <g class="obj pipeobj" id="obj-pipeD2" data-id="pipeD2" tabindex="0" role="button" aria-pressed="false" aria-label="District 2 distribution main, leak reported">
    <path class="pipe" d="M830 318 H1140"/><path class="pipe-flow flow" d="M830 318 H1140" marker-end="url(#ah-water)"/>
    <path class="hitline" d="M845 318 H1140"/><path class="sel-line" d="M845 318 H1140"/>
    <g class="leak" id="leakMark"><circle class="leak-ring" cx="1125" cy="318" r="9"/><circle class="leak-core" cx="1125" cy="318" r="4"/>
      <circle class="drip" cx="1121" cy="330" r="2.5"/><circle class="drip d2" cx="1129" cy="330" r="2.5"/></g>
    <g class="fixed" id="fixedMark"><circle cx="1125" cy="318" r="9"/><path d="M1120 318 l4 4 l7 -8"/></g>
  </g>
  <g class="obj pipeobj" id="obj-pipeD3" data-id="pipeD3" tabindex="0" role="button" aria-pressed="false" aria-label="District 3 distribution main, ends before Terrace Homes">
    <path class="pipe" d="M830 318 V440 H940 V490"/><path class="pipe-flow flow" d="M830 318 V440 H940 V490"/>
    <path class="hitline" d="M830 330 V440 H940 V490"/><path class="sel-line" d="M830 330 V440 H940 V490"/>
    <g class="pipe-end"><path d="M932 490 h16"/><path d="M932 484 l16 12 M948 484 l-16 12" class="x"/></g>
  </g>
  <g data-ghost="ext" aria-hidden="true"><path class="ghost-pipe" d="M940 490 H1000 V522"/></g>
  <g data-ghost="detect" aria-hidden="true"><circle class="scan" cx="830" cy="318" r="30"/><circle class="scan s2" cx="830" cy="318" r="30"/></g>

  <!-- 6 BUILDINGS -->
  <g class="obj bldg" id="obj-homesD1" data-id="homesD1" tabindex="0" role="button" aria-pressed="false" aria-label="Riverside Homes, District 1">
    <rect class="hit" x="850" y="112" width="180" height="76"/>
    ${row(860, 132, 6, 28)}${row(874, 158, 5, 28)}
    <g data-ghost="homes">${row(860, 106, 4, 28).replace(/class="bld"/g, 'class="bld ghost-bld"')}</g>
    <rect class="sel" x="846" y="98" width="192" height="90" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-industry" data-id="industry" tabindex="0" role="button" aria-pressed="false" aria-label="Light industry">
    <rect class="hit" x="1040" y="118" width="110" height="64"/>
    <rect class="bld-big" x="1048" y="140" width="84" height="38"/><path class="bld-big" d="M1048 140 L1048 128 L1064 140 L1064 128 L1080 140 L1080 128 L1096 140Z"/>
    <rect class="bld-big" x="1112" y="120" width="10" height="24"/>
    <rect class="sel" x="1040" y="112" width="102" height="72" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-school" data-id="school" tabindex="0" role="button" aria-pressed="false" aria-label="School">
    <rect class="hit" x="878" y="246" width="74" height="64"/>
    <rect class="bld-big" x="885" y="262" width="60" height="42"/><path class="bld-big" d="M880 262 L915 246 L950 262Z"/><rect class="door" x="908" y="284" width="14" height="20"/><path class="flag" d="M915 246 V232 h14 l-4 5 l4 5 h-14"/>
    <rect class="sel" x="876" y="226" width="78" height="82" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-clinic" data-id="clinic" tabindex="0" role="button" aria-pressed="false" aria-label="Clinic">
    <rect class="hit" x="960" y="246" width="62" height="64"/>
    <rect class="bld-big" x="966" y="256" width="50" height="48"/><path class="cross" d="M991 266 v22 M980 277 h22"/>
    <rect class="sel" x="962" y="250" width="58" height="58" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-market" data-id="market" tabindex="0" role="button" aria-pressed="false" aria-label="Market">
    <rect class="hit" x="896" y="332" width="90" height="56"/>
    <rect class="bld-big" x="902" y="356" width="78" height="26"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect class="awn${i % 2 ? ' alt' : ''}" x="${902 + i * 13}" y="342" width="13" height="16"/>`).join('')}
    <rect class="sel" x="898" y="336" width="86" height="50" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-flatsD2" data-id="flatsD2" tabindex="0" role="button" aria-pressed="false" aria-label="Market Row Flats, District 2">
    <rect class="hit" x="1024" y="332" width="96" height="60"/>
    ${[1034, 1060, 1086].map((x) => `<rect class="bld-big" x="${x}" y="344" width="22" height="38"/><path class="win" d="M${x + 5} 352h12M${x + 5} 362h12M${x + 5} 372h12"/>`).join('')}
    <rect class="sel" x="1028" y="336" width="90" height="52" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-terraceD3" data-id="terraceD3" tabindex="0" role="button" aria-pressed="false" aria-label="Terrace Homes, District 3, partly connected">
    <path class="terrace-ground" d="M950 512 h190 v92 h-190z" fill="url(#hatch)"/>
    ${row(968, 524, 6, 28)}${row(982, 556, 5, 28)}
    <rect class="hit" x="950" y="512" width="190" height="92"/>
    <rect class="sel" x="946" y="508" width="198" height="100" rx="3"/>
  </g>
  <g class="obj bldg" id="obj-farm" data-id="farm" tabindex="0" role="button" aria-pressed="false" aria-label="Farm">
    <rect class="field" x="610" y="490" width="165" height="120"/>
    ${Array.from({ length: 8 }, (_, i) => `<path class="furrow" d="M618 ${502 + i * 14} H767"/>`).join('')}
    <rect class="bld-big" x="738" y="592" width="30" height="14"/>
    <g data-ghost="irrigation">${Array.from({ length: 8 }, (_, i) => `<path class="drip-line" d="M618 ${498 + i * 14} H767"/>`).join('')}</g>
    <rect class="sel" x="604" y="484" width="178" height="132" rx="3"/>
  </g>

  <!-- WASTEWATER -->
  <g aria-hidden="true" class="layer-waste">
    <path class="sewer" d="M1070 205 H1165 V665 H950"/><path class="sewer-flow flow-w" d="M1070 205 H1165 V665 H950" marker-end="url(#ah-waste)"/>
    <path class="sewer" d="M1010 176 V206 H1070"/><path class="sewer-flow flow-w" d="M1010 176 V206 H1070"/>
    <path class="sewer" d="M1110 360 H1165"/><path class="sewer-flow flow-w" d="M1110 360 H1165"/>
    <path class="sewer" d="M1115 575 H1165"/><path class="sewer-flow flow-w" d="M1115 575 H1165"/>
    <path class="outfall-line" d="M770 690 H560 Q470 690 440 702"/><path class="sewer-flow flow-w" id="flowDischarge" d="M770 690 H560 Q470 690 440 702" marker-end="url(#ah-waste)"/>
    <g class="outfall"><circle cx="440" cy="702" r="6"/></g>
    <g data-ghost="reuse"><path class="reuse-line" d="M770 668 H700 V612"/><path class="reuse-flow flow-r" d="M770 668 H700 V612" marker-end="url(#ah-reuse)"/></g>
  </g>
  <g class="obj" id="obj-wwtp" data-id="wwtp" tabindex="0" role="button" aria-pressed="false" aria-label="Wastewater treatment plant">
    <rect class="plant ww" x="770" y="625" width="180" height="80"/>
    ${[800, 850, 900].map((x) => `<circle class="clar" cx="${x}" cy="665" r="17"/><circle class="clar-in" cx="${x}" cy="665" r="8"/>`).join('')}
    <rect class="sel" x="764" y="619" width="192" height="92" rx="3"/>
  </g>

  <!-- 7 WETLAND / PROTECTION -->
  <g class="obj" id="obj-wetland" data-id="wetland" tabindex="0" role="button" aria-pressed="false" aria-label="Wetland buffer area, source protection">
    <ellipse class="hit-e" cx="470" cy="548" rx="46" ry="32"/>
    <g data-ghost="wetland"><ellipse class="wet" cx="470" cy="548" rx="40" ry="26"/>${[-22, -8, 6, 20, 30].map((dx, i) => `<path class="reed" d="M${470 + dx} ${558 - (i % 2) * 8} v-14 m-3 4 l3 -4 l3 4"/>`).join('')}</g>
    <ellipse class="sel" cx="470" cy="548" rx="48" ry="34"/>
  </g>

  <!-- RUNOFF -->
  <g aria-hidden="true" class="layer-runoff">
    <path class="runoff" d="M610 530 C560 538 500 548 470 550 C440 554 415 556 390 556"/><path class="runoff-flow flow-o" d="M610 530 C560 538 500 548 470 550 C440 554 415 556 390 556" marker-end="url(#ah-runoff)"/>
  </g>

  <!-- STORM -->
  <g class="storm" aria-hidden="true">
    <path class="cloud" d="M220 70 q0 -26 28 -26 q10 -22 40 -14 q26 -4 34 20 q26 4 22 28 h-120 q-4 -8 -4 -8z"/>
    ${[236, 262, 288, 314].map((x, i) => `<path class="rain d${i}" d="M${x} 104 l-6 16"/>`).join('')}
  </g>
</svg>`;
  }

  /* ---- Labels (HTML) ---------------------------------------------------------- */
  const ICONS = { warn: 'i-warn', check: 'i-check', dot: 'i-dot', lock: 'i-lock' };
  const tierTone = { full: 'ok', reduced: 'warn', rationed: 'risk', cut: 'risk' };
  const tierIcon = { full: 'check', reduced: 'warn', rationed: 'warn', cut: 'warn' };
  const ico = (n) => `<svg class="ic" aria-hidden="true"><use href="#${ICONS[n] || 'i-dot'}"/></svg>`;

  function labels(s, d, ui) {
    const P = (x) => Math.round(x * 100);
    const sv = (id) => { const x = d.sectors[id]; return { pct: `${P(x.ratio)}%`, tone: tierTone[x.tier], icon: tierIcon[x.tier], tierName: WW.sim.tierLabel[x.tier] }; };
    const stateLbl = { healthy: 'Healthy', watch: 'Watch', low: 'Low' };
    const L = [
      { id: 'watershed', x: 20, y: 14, a: 'tl', title: 'Upper watershed', sub: d.storm ? 'Runoff risk high' : 'Forest cover · runoff moderate', tone: d.storm ? 'risk' : 'neutral', icon: d.storm ? 'warn' : '' },
      { id: 'reservoir', x: 325, y: 388, a: 'tc', title: 'River & reservoir', sub: d.reservoirVolume.toLocaleString('en-US') + ' units' + (d.storm ? ' ↑ rain' : ''), tone: 'water' },
      { id: 'intake', x: 410, y: 298, a: 'bc', title: 'Intake', tone: 'neutral' },
      { id: 'plant', x: 565, y: 254, a: 'bc', title: 'Treatment plant', sub: (d.strain ? 'Strain ' : 'Load ') + P(d.loadRatio) + '%', tone: d.strain ? 'risk' : 'ok', icon: d.strain ? 'warn' : 'check' },
      { id: 'storage', x: 735, y: 360, a: 'tc', title: 'Treated storage', sub: `${P(d.storagePct)}% · ${stateLbl[d.storageState]}`, tone: d.storageState === 'healthy' ? 'ok' : d.storageState === 'watch' ? 'warn' : 'risk', icon: d.storageState === 'healthy' ? 'check' : 'warn' },
      { id: 'homesD1', x: 915, y: 100, a: 'bc', title: 'Riverside', ...sv('homes') },
      { id: 'industry', x: 1118, y: 114, a: 'bc', title: 'Industry', ...sv('industry') },
      { id: 'school', x: 955, y: 228, a: 'br', title: 'School', ...sv('school') },
      { id: 'clinic', x: 1024, y: 264, a: 'l', title: 'Clinic', ...sv('clinic') },
      { id: 'market', x: 1004, y: 392, a: 'tr', title: 'Market', ...sv('market') },
      { id: 'flatsD2', x: 1012, y: 392, a: 'tl', title: 'Row Flats', ...sv('homes') },
      { id: 'terraceD3', x: 1062, y: 608, a: 'tc', title: 'Terrace', pct: s.terraceConnected + '/350', tierName: (s.flags.indexOf('ext') >= 0 ? 'Partly connected' : 'Inadequate service') + ', residents connected', tone: 'risk', icon: 'warn' },
      { id: 'farm', x: 660, y: 480, a: 'bc', title: 'Farm', ...sv('farm') },
      { id: 'wwtp', x: 860, y: 712, a: 'tc', title: 'Wastewater plant', pct: `${P(d.wwLoadPct)}%`, tierName: 'load', tone: d.wwLoadPct > 1 ? 'risk' : 'ok', icon: d.wwLoadPct > 1 ? 'warn' : 'check' },
    ];
    if (d.leak) L.push({ id: 'pipeD2', x: 1198, y: 298, a: 'r', title: 'Leak', pct: `−${d.leakUnits.toFixed(0)}/day`, tierName: 'units per day lost', tone: 'risk', icon: 'warn' });
    else L.push({ id: 'pipeD2', x: 1198, y: 298, a: 'r', title: 'Leak repaired', tone: 'ok', icon: 'check' });
    if (ui.mode.wetland) L.push({ id: 'wetland', x: 470, y: 588, a: 'tc', title: 'Wetland buffer', sub: ui.mode.wetland === 'built' ? 'Protecting the river' : ui.mode.wetland === 'building' ? 'Under construction' : 'Preview', tone: 'neutral' });
    L.push({ id: 'outfall', x: 452, y: 708, a: 'l', title: 'Outfall', sub: 'downstream of intake', tone: 'neutral', noSelect: true });
    L.push({ id: 'runoff', x: 520, y: 512, a: 'bc', title: 'Farm runoff', sub: d.storm ? 'Rising with rain' : 'Toward river', tone: d.storm ? 'risk' : 'warn', icon: 'warn', noSelect: true, cls: 'lbl-runoff' });
    return L;
  }
  const badges = [
    { n: 1, x: 44, y: 84 }, { n: 2, x: 345, y: 330 }, { n: 3, x: 470, y: 262 }, { n: 4, x: 762, y: 288 },
    { n: 5, x: 830, y: 344 }, { n: 6, x: 900, y: 338 }, { n: 7, x: 770, y: 625 }, { n: 8, x: 440, y: 702 },
  ];
  const samples = [
    { k: 'S', x: 285, y: 296, target: 'reservoir', label: 'Source sample point' },
    { k: 'P', x: 672, y: 342, target: 'plant', label: 'Plant outlet sample point' },
    { k: 'T', x: 1002, y: 342, target: 'pipeD2', label: 'Tap sample point, District 2' },
  ];

  const anchor = { tl: '0,0', tc: '-50%,0', bc: '-50%,-100%', br: '-100%,-100%', bl: '0,-100%', tr: '-100%,0', l: '0,-50%', r: '-100%,-50%' };

  function renderLabels(host, s, d, ui) {
    let html = '';
    labels(s, d, ui).forEach((l) => {
      const sel = ui.selected === l.id ? ' is-selected' : '';
      html += `<div class="maptag ${l.cls || ''} tone-${l.tone || 'neutral'}${sel}${l.noSelect ? ' passive' : ''}" data-for="${l.id}" style="left:${(l.x / W) * 100}%;top:${(l.y / H) * 100}%;transform:translate(${anchor[l.a]})">
        <span class="t">${l.icon ? ico(l.icon) : ''}${l.title}${l.pct ? `<span class="pct">${l.pct}<span class="sr-only"> ${l.tierName || ''}</span></span>` : ''}</span>${l.sub ? `<span class="s">${l.sub}</span>` : ''}</div>`;
    });
    badges.forEach((b) => (html += `<span class="badge-n" aria-hidden="true" style="left:${(b.x / W) * 100}%;top:${(b.y / H) * 100}%">${b.n}</span>`));
    samples.forEach((m) => (html += `<button type="button" class="sample${ui.sampleFocus === m.k ? ' on' : ''}" data-sample="${m.k}" data-target="${m.target}" aria-label="${m.label}" data-tip="${m.label}: highlights its column in the lab table" style="left:${(m.x / W) * 100}%;top:${(m.y / H) * 100}%">${m.k}</button>`));
    host.innerHTML = html;
  }

  /* ---- Mount / update ------------------------------------------------------- */
  let els = {};
  function mount(stage, handlers) {
    stage.innerHTML = `<div class="mapbox" id="mapbox">${markup()}<div class="maplabels" id="maplabels"></div></div>`;
    els.stage = stage; els.box = stage.querySelector('#mapbox'); els.svg = stage.querySelector('#map'); els.labels = stage.querySelector('#maplabels');
    const fit = () => {
      const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
      const k = Math.min(r.width / W, r.height / H);
      els.box.style.width = Math.floor(W * k) + 'px'; els.box.style.height = Math.floor(H * k) + 'px';
      els.box.style.setProperty('--k', k.toFixed(3)); els.box.dataset.size = k >= 0.66 ? 'l' : 'm';
    };
    if (root.ResizeObserver) new ResizeObserver(fit).observe(stage); else root.addEventListener('resize', fit);
    fit();

    const pick = (id) => handlers.onSelect(id);
    els.svg.addEventListener('click', (e) => { const o = e.target.closest('.obj'); if (o) pick(o.dataset.id); });
    els.svg.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('obj')) { e.preventDefault(); pick(e.target.dataset.id); } });
    els.labels.addEventListener('click', (e) => {
      const smp = e.target.closest('.sample'); if (smp) { handlers.onSample(smp.dataset.sample, smp.dataset.target); return; }
      const t = e.target.closest('.maptag'); if (t && !t.classList.contains('passive')) pick(t.dataset.for);
    });
  }

  function update(s, d, ui) {
    const svg = els.svg; if (!svg) return;
    const a = svg.dataset;
    a.flow = ui.overlays.flow ? 'on' : 'off'; a.runoff = ui.overlays.runoff ? 'on' : 'off'; a.waste = ui.overlays.waste ? 'on' : 'off';
    a.storm = d.storm ? 'on' : 'off'; a.strain = d.strain ? 'on' : 'off'; a.storage = d.storageState;
    a.leak = d.leak ? 'on' : 'off'; a.reuse = s.reuse.connected ? 'on' : 'off'; a.runoffLevel = d.storm ? 'high' : 'mid';
    a.d3 = s.flags.indexOf('ext') >= 0 ? 'partial' : 'inadequate';
    a.labels = ui.overlays.labels ? 'on' : 'off'; a.trace = ui.trace ? 'on' : 'off';
    // flow speed follows delivered volume; slower when storage is low
    const dur = Math.max(0.7, 2.6 - (d.delivered / 170) * 1.4) * (d.storageState === 'low' ? 1.6 : 1);
    svg.style.setProperty('--flow-dur', dur.toFixed(2) + 's');
    svg.style.setProperty('--fill', String(Math.max(0.02, d.storagePct)));
    // treatment stage slots
    svg.querySelectorAll('.stage').forEach((g) => { const id = g.dataset.stage; g.classList.toggle('absent', s.stages.indexOf(id) < 0); });
    // plant load bar: full width = 160% of effective capacity
    const lf = svg.querySelector('#loadFill'), tick = svg.querySelector('#capTick');
    lf.setAttribute('width', String(Math.min(174, (d.loadRatio / 1.6) * 174)));
    tick.setAttribute('d', `M${480 + (1 / 1.6) * 174} 341V357`);
    // ghosts: preview / building / built
    const modeOf = {};
    const building = (s.projects || []).map((p) => p.ghost || p.id);
    svg.querySelectorAll('[data-ghost]').forEach((el) => {
      const id = el.dataset.ghost; let m = '';
      const built = s.flags.indexOf(id) >= 0 || s.stages.indexOf(id) >= 0;
      if (built) m = 'built'; else if (building.indexOf(id) >= 0) m = 'building'; else if (ui.preview && (ui.preview === id)) m = 'preview';
      modeOf[id] = m;
      if (m) el.setAttribute('data-mode', m); else el.removeAttribute('data-mode');
    });
    const carbonSlot = svg.querySelector('.stage-slot');
    carbonSlot.classList.toggle('present', s.stages.indexOf('carbon') >= 0);
    // selection
    svg.querySelectorAll('.obj').forEach((o) => { const on = o.dataset.id === ui.selected; o.classList.toggle('is-selected', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    // per-object status for a11y and hatch on inadequate districts
    const setLabel = (id, txt) => { const o = svg.querySelector('#obj-' + id); if (o) o.setAttribute('aria-label', txt); };
    Object.keys(d.sectors).forEach((k) => { const x = d.sectors[k]; setLabel(k === 'homes' ? 'homesD1' : k, `${x.name}: ${WW.sim.tierLabel[x.tier]}, ${Math.round(x.ratio * 100)} percent of demand met`); });
    setLabel('plant', `Treatment plant: load ${Math.round(d.loadRatio * 100)} percent of effective capacity${d.strain ? ', strained' : ''}`);
    setLabel('storage', `Treated storage: ${Math.round(d.storagePct * 100)} percent full, ${d.storageState}`);
    setLabel('pipeD2', d.leak ? 'District 2 distribution main: leak reported' : 'District 2 distribution main: leak repaired');
    setLabel('terraceD3', `Terrace Homes, District 3: ${s.terraceConnected} of 350 residents connected`);
    renderLabels(els.labels, s, d, { ...ui, mode: modeOf });
  }

  WW.map = { mount, update };
})(window);
