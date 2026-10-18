/* =============================================================================
   WATERWORKS VILLAGE — MUSIC
   -----------------------------------------------------------------------------
   One continuous instrumental loop on a single HTMLAudioElement. Completely
   independent of game state: levels, panels and saves never touch it.

   - Created lazily on the first start() (always called from a click, so the
     browser's autoplay rules are satisfied). start() is idempotent: there is
     only ever one element, so copies can never overlap.
   - Preferences (muted, volume) persist in localStorage.
   - A missing or unplayable file marks the player unavailable, quietly.
   - Pauses while the tab is hidden and resumes where it left off.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const KEY = 'waterworks-audio-v1';

  let el = null; let failed = false; let wanted = false; const listeners = [];
  const prefs = (() => {
    const def = { muted: false, volume: WV.data.music.defaultVolume };
    try { return { ...def, ...JSON.parse(root.localStorage.getItem(KEY) || '{}') }; } catch (e) { return def; }
  })();
  prefs.volume = Math.min(1, Math.max(0, Number(prefs.volume) || 0));

  const save = () => { try { root.localStorage.setItem(KEY, JSON.stringify({ muted: prefs.muted, volume: prefs.volume })); } catch (e) { /* storage may be blocked */ } };
  const emit = () => listeners.forEach((fn) => fn(state()));
  const state = () => ({ muted: prefs.muted, volume: prefs.volume, available: !failed, playing: !!el && !el.paused });

  function ensure() {
    if (el || failed) return el;
    el = new Audio();
    el.loop = true; el.preload = 'auto';
    el.volume = prefs.volume; el.muted = prefs.muted;
    el.addEventListener('error', () => { failed = true; emit(); });
    el.addEventListener('play', emit); el.addEventListener('pause', emit);
    el.src = WV.data.music.src;
    return el;
  }
  function play() {
    if (!el || failed || prefs.muted || document.hidden) return;
    const p = el.play(); if (p && p.catch) p.catch(() => { /* blocked until a gesture, or missing: stay quiet */ });
  }

  function start() { wanted = true; ensure(); play(); }
  function setMuted(m) {
    prefs.muted = !!m; save();
    if (el) { el.muted = prefs.muted; if (prefs.muted) el.pause(); else play(); }
    emit();
  }
  function setVolume(v) {
    prefs.volume = Math.min(1, Math.max(0, Number(v) || 0)); save();
    if (el) el.volume = prefs.volume;
    emit();
  }
  document.addEventListener('visibilitychange', () => {
    if (!el || !wanted) return;
    if (document.hidden) el.pause(); else play();
  });

  WV.audio = { start, setMuted, setVolume, toggle: () => setMuted(!prefs.muted), state, onChange: (fn) => listeners.push(fn) };
})(window);
