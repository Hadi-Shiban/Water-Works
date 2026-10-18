# Waterworks Environment Manifest

All five images are original 16:9 environment art generated for this project. They are meant to be scenic backdrops with semantic SVG/HTML game overlays, not static screenshots of the final interface.

## 1. Alpine Headwaters

- File: `assets/environments/env-01-alpine-headwaters.png`
- Chapter: 1
- Days: 1-4
- Visual reference: autumn high-alpine lake in the Wasatch Mountains, inspired by the feeling of Bloods Lake near Park City without reproducing a specific photograph
- Mood: welcoming, quiet, clear, exploratory
- Concepts: source, route, basic testing, basic treatment, simple allocation, one leak
- Visible beginner metrics: Water Available, Water Safe, People Served
- Music cue: `alpine-headwaters`
- Nature cue: `alpine-lake-wind-water`
- UI treatment: warm white, charcoal, golden aspen yellow, selective lake blue

## 2. Aspen River Bend

- File: `assets/environments/env-02-aspen-river.png`
- Chapter: 2
- Days: 5-8
- Mood: lively, bright, connected
- Concepts: homes, clinic, school, farm, allocation, distribution loss, Reliability
- Environment feedback: selected branches of the river and pipe route brighten as allocations move
- Music cue: `aspen-river`
- Nature cue: `aspen-river-birds`
- UI treatment: golden foliage, turquoise water, dark evergreen accents

## 3. Meadow Reservoir

- File: `assets/environments/env-03-meadow-reservoir.png`
- Chapter: 3
- Days: 9-12
- Mood: capable, civic, optimistic
- Concepts: storage, capacity, plant condition, turbidity, filtration, disinfection, treatment train
- Environment feedback: reservoir height, plant activity, and storage markers reflect state
- Music cue: `meadow-reservoir`
- Nature cue: `reservoir-evening`
- UI treatment: slate blue, meadow gold, civic charcoal

## 4. Wetland Crossroads

- File: `assets/environments/env-04-wetland-crossroads.png`
- Chapter: 4
- Days: 13-16
- Mood: interconnected, thoughtful, restorative
- Concepts: farms, runoff, wetlands, wastewater, treatment, reuse
- Environment feedback: runoff routes appear after rain; wetland and reuse routes respond to investments
- Music cue: `wetland-crossroads`
- Nature cue: `wetland-after-rain`
- UI treatment: reed green, rain gray, water blue, restrained yellow

## 5. Canyon of Resilience

- File: `assets/environments/env-05-redrock-resilience.png`
- Chapter: 5
- Days: 17+
- Mood: spacious, strategic, resilient
- Concepts: drought, source diversity, maintenance, energy, reserve days, full Water Security
- Environment feedback: reservoir level, protected spring, pumps, and river flow communicate stress and recovery
- Music cue: `redrock-resilience`
- Nature cue: `canyon-river-wind`
- UI treatment: sandstone, deep charcoal, cottonwood gold, cool river blue

## Implementation notes

- Store the current environment by stable ID, not array index.
- Use `<picture>` or equivalent responsive image behavior.
- Preserve each image's aspect ratio.
- Use `object-fit: cover` only when important water routes remain visible at tested viewports.
- Preload the current and next environment only.
- Use semantic overlay controls; do not attach inaccessible click coordinates directly to a bitmap.
- Environment motion should stop under `prefers-reduced-motion`.
- Never imply that one fictional landscape represents every community facing water challenges.
