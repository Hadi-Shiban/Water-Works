# Waterworks Audio Direction

## Goal

Audio should make each environment feel alive without creating pressure. Music and nature ambience are continuous layers with separate controls. Gameplay cues remain short and quiet.

## Technical rules

- Audio begins only after `Start Journey` or another explicit user gesture.
- Music and nature ambience use separate looping channels.
- Crossfade between environments over 3-5 seconds.
- Save master, music, nature, and interface volumes locally.
- Fade down when the browser tab is hidden.
- Missing audio files must not produce repeated requests or console errors.
- Every downloaded track needs an entry in `assets/audio/credits.json`.
- Use only original, CC0, public-domain, or explicitly licensed material.
- Do not imitate a recognizable copyrighted melody or soundtrack.

## Suggested default mix

- Master: 80%
- Music: 42%
- Nature: 65%
- Interface: 55%

Nature should normally sit above music. The sound of water is part of the game's environmental feedback.

## Environment music briefs

### Alpine Headwaters

Seamless 90-second instrumental loop, 68-74 BPM. Quiet felt piano, soft acoustic guitar harmonics, very light bowed strings, airy wooden percussion, wide open pauses. Calm autumn morning in a high alpine basin. Curious and welcoming, never sentimental or cinematic-trailer-like. No vocals and no recognizable melody. Ending must loop naturally into the opening.

### Aspen River Bend

Seamless 90-second instrumental loop, 76-82 BPM. Light plucked strings, soft marimba or wooden mallets, gentle hand percussion, warm bass, occasional flute-like breath texture. The feeling of clear water moving through golden aspens and a community beginning its day. Playful but not childish.

### Meadow Reservoir

Seamless 90-second instrumental loop, 72-78 BPM. Warm piano pattern, restrained strings, brushed percussion, muted mallets, stable harmonic pulse. Civic competence and thoughtful building. Slight sense of forward motion with generous space for nature ambience.

### Wetland Crossroads

Seamless 90-second instrumental loop, 64-72 BPM. Soft reed flute texture, gentle low strings, sparse droplets or wooden clicks, slowly shifting chords. Rain has passed over a broad wetland. Reflective, interconnected, and restorative rather than mysterious or sad.

### Canyon of Resilience

Seamless 90-second instrumental loop, 70-76 BPM. Warm low strings, subtle frame drum, dry wooden percussion, spacious plucked instrument, restrained rising motif. Golden-hour red-rock canyon with a living river. Strategic and resilient, never threatening or heroic-trailer-like.

## Nature layers

- Alpine Headwaters: quiet shoreline water, light conifer wind, distant small birds
- Aspen River Bend: moving river, aspen leaves, gentle songbirds
- Meadow Reservoir: distant water spillway, meadow wind, evening insects
- Wetland Crossroads: reeds, soft water movement, ducks or geese far away, occasional post-rain drip
- Canyon of Resilience: slow river, dry breeze, sparse insects and distant birds

Keep wildlife sparse. Avoid a dense loop that makes the repetition obvious.

## Interface cues

- Select: soft wooden tick
- Confirm: two-note water-glass tone
- Test complete: short droplet and bright chime
- Leak repaired: valve turn, water pressure settle, gentle success tone
- Warning: low wooden knock, not an alarm
- Day complete: brief warm three-note phrase
- Chapter complete: expanded version of the day-complete phrase

## ACE-Step use

If generating music with ACE-Step, produce one environment at a time. Begin with Alpine Headwaters, create one candidate, test the loop in game, and only then generate the next environment. Export archival WAV plus a compressed browser-ready OGG or MP3 copy. Keep ACE-Step and Waterworks repositories separate; copy only accepted game-ready files into Waterworks.
