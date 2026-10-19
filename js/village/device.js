/* =============================================================================
   WATERWORKS VILLAGE — DEVICE ADAPTATION
   -----------------------------------------------------------------------------
   Detects phone-class devices once, at load, and adapts only presentation:
     - paintings load as same-resolution JPEGs (~4x smaller) instead of PNGs
     - <html class="is-phone"> lets CSS drop costly effects (big blurs, the
       paint-texture SVG filter) and enlarge touch targets
   Desktop is untouched: it keeps the original PNGs and every effect.
   Gameplay, saves and the simulation never read this module.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const mq = (q) => !!(root.matchMedia && root.matchMedia(q).matches);
  const conn = root.navigator && root.navigator.connection;
  const smallScreen = root.screen ? Math.min(root.screen.width, root.screen.height) <= 820 : false;
  const phone = (mq('(pointer: coarse)') && smallScreen) || !!(conn && conn.saveData) || /[?&]phone=1\b/.test(root.location.search);

  // Same picture, lighter file: assets/.../bg-main.png -> assets/.../bg-main.mobile.jpg
  const img = (path) => (phone && /\.png$/.test(path) ? path.replace(/\.png$/, '.mobile.jpg') : path);

  if (phone) root.document.documentElement.classList.add('is-phone');
  WV.device = { phone, img };
})(window);
