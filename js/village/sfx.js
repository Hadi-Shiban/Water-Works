/* =============================================================================
   WATERWORKS VILLAGE — SOUND EFFECTS
   -----------------------------------------------------------------------------
   Short effects for player actions (tap a resource, collect it, finish a build,
   water flowing, a mistake, a milestone, a level or the whole project done).

   The sounds are made in the browser with the Web Audio API, so there are no
   extra files to download. Each effect is a list of notes:
     [frequency in Hz, start time in s, length in s, wave type, volume]
   The on/off setting is saved in localStorage and is separate from the music.
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});
  const KEY = 'waterworks-sfx-v1';

  let ctx = null;
  let on = true;
  try { on = JSON.parse(root.localStorage.getItem(KEY) || 'true') !== false; } catch (e) { /* storage blocked: keep default */ }

  const SOUNDS = {
    tap:       [[180, 0, 0.07, 'triangle', 0.35], [120, 0.01, 0.06, 'square', 0.08]],
    collect:   [[523, 0, 0.09, 'triangle', 0.3], [784, 0.08, 0.14, 'triangle', 0.3]],
    error:     [[220, 0, 0.12, 'sawtooth', 0.12], [185, 0.11, 0.16, 'sawtooth', 0.12]],
    build:     [[392, 0, 0.12, 'triangle', 0.3], [523, 0.1, 0.12, 'triangle', 0.3], [659, 0.2, 0.22, 'triangle', 0.3]],
    drop:      [[900, 0, 0.12, 'sine', 0.35, 420]],
    milestone: [[784, 0, 0.1, 'sine', 0.3], [988, 0.09, 0.1, 'sine', 0.3], [1319, 0.18, 0.28, 'sine', 0.3]],
    win:       [[523, 0, 0.14, 'triangle', 0.3], [659, 0.13, 0.14, 'triangle', 0.3], [784, 0.26, 0.14, 'triangle', 0.3], [1047, 0.39, 0.4, 'triangle', 0.32]],
  };

  function context() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  /* Play one named effect. Safe to call anytime: it stays quiet if sound is off or unsupported. */
  function play(name) {
    const notes = SOUNDS[name];
    if (!on || !notes) return;
    const ac = context(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + 0.01;
    notes.forEach(([freq, start, len, type, vol, slideTo]) => {
      const osc = ac.createOscillator(); const gain = ac.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t0 + start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + start + len);
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0 + start); osc.stop(t0 + start + len + 0.02);
    });
  }

  function setOn(v) {
    on = !!v;
    try { root.localStorage.setItem(KEY, JSON.stringify(on)); } catch (e) { /* ignore */ }
  }

  WV.sfx = { play, setOn, isOn: () => on };
})(window);
