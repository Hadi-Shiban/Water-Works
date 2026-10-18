# Waterworks

**Water changes what is possible.** An illustrated village water-project game: name a fictional village, meet its water committee and local partner team, investigate the water, build a system that fits the place, and keep it flowing.

*Waterworks is an independent educational prototype inspired by charity: water. It is not an official charity: water product.*

## Play

No build step and no dependencies. Static files only, so it works on GitHub Pages or Vercel.

```bash
python3 -m http.server 8000      # then open http://localhost:8000
# or just open index.html in a browser
```

- `index.html`: the **village game** (in development; Levels 1–2 of 5 are playable).
- `municipal.html`: the original municipal-utility prototype, kept unchanged and documented below.
- `?scenario=highland|plateau|wetland` forces a landscape (for testing and teaching). Normally it is chosen for you.
- `?dev=routes` opens the developer route editor: a coordinate grid, draggable route waypoints, hotspot bounds, walker highlights, an "after the water point is built" preview, and **Copy routes JSON** to paste back into `js/village/data.js`. Edits are not saved; nothing changes for players.

Progress saves automatically in your browser (`localStorage`). Use **Menu → New village** or **Reset game** to start over.

## Test

```bash
node --test tests/                                   # model unit tests
node --experimental-websocket tests/smoke.mjs        # Levels 1–2 incl. the lab scene, all scenarios, desktop/tablet/phone, in headless Chrome (needs Chrome)
```

## Artwork

| Scenario | Background |
| --- | --- |
| Highland Springs (gravity-fed) | `assets/images/village/highland-springs/bg-main.png` |
| Red Rock Plateau (drilled well) | `assets/images/village/red-rock-plateau/bg-main.png` |
| Wetland Crossroads (rainwater) | `assets/images/village/wetland-crossroads/bg-main.png` |

Field lab scenes (Level 2), one per scenario:

| Scenario | Lab scene |
| --- | --- |
| Highland Springs | `assets/images/lab/highland-springs/lab-scene.png` |
| Red Rock Plateau | `assets/images/lab/red-rock-plateau/lab-scene.png` |
| Wetland Crossroads | `assets/images/lab/wetland-crossroads/lab-scene.png` |

The lab scenes show the charity: water wordmark (sanctioned student collaboration). Lab hotspot rectangles live in `WV.data.lab` and are shared by all three benches; `coverBranding: true` would hide the wordmark with neutral labels.

All six images are 1672×941 and drawn at their own aspect ratio. To replace one, keep the filename and size, or update `w`, `h`, `hotspots` and `routes` for that scene in `js/village/data.js` (use `?dev=routes`). The earlier `assets/environments/env-0*.png` panoramas are kept for the municipal prototype and future scenarios.

## Village game files

| Path | Purpose |
| --- | --- |
| `js/village/data.js` | Scenarios, site facts, painted-scene hotspots and walking routes, technology registry, levels, characters, copy |
| `js/village/sim.js` | Pure model: seeded generation, gathering, building, lab tests, surveys, technology judgement, walker plan, objectives, save/load and migration |
| `js/village/scene.js` | Painting + SVG overlays (construction states, path-following jerry-can walkers) + accessible hotspot buttons |
| `js/village/dev.js` | Route editor, only active with `?dev=routes` |
| `js/village/ui.js` | HTML templates for the HUD, checklist, panels and dialogs |
| `js/village/audio.js` | One looping music track (`assets/audio/waterworks-ambient.mp3`) with saved mute and volume |
| `js/village/app.js` | Controller: flow, events, persistence |
| `css/village.css` | Village game styles (shares `css/tokens.css`) |
| `docs/WATERWORKS_VILLAGE_REDESIGN.md` | The redesign proposal |
| `docs/IMPLEMENTATION_PLAN.md` | Decisions, conflicts, phases, acceptance tests, art asset spec |

---

# Municipal prototype (legacy)

The sections below describe `municipal.html`, the earlier municipal water-system wireframe. Its files (`js/*.js`, `css/app.css`, `css/map.css`) are unchanged.

A desktop-first, clickable prototype of **Waterworks**, a small-city water-system builder. It makes the core loop legible without a tutorial:

**Observe → Test → Allocate → Build or maintain → Run the day → See consequences → Adapt**

Headline number: **People with reliable clean-water service**. Strategic score: **Water Security**. Human reward: **reclaimed time and reliable routines**.

This is a wireframe and interaction prototype. It runs on deterministic mock data seeded from the framework's Example Day. It is **not** the simulation engine.

## Run it

No build step, no dependencies.

```bash
# Option A: just open the file
open municipal.html

# Option B: a local server (any will do)
python3 -m http.server 8000     # then visit http://localhost:8000
```

Designed for 1440 × 900. Checked at 1440 × 900, 1280 × 800 and 1024 × 768. Below about 900 px the panels stack. A page refresh resets the prototype (local state only).

## Files

The project is intentionally split into runtime code and reference material:

```text
municipal.html   browser entry point (legacy prototype)
css/             visual system and map styling
js/              controller, simulation, views, and map
assets/          environment artwork and audio manifest
docs/build/      current build brief and implementation direction
docs/reference/  framework, workbook, concept PDF, and source material
```

Runtime files:

| File | Purpose |
| --- | --- |
| `municipal.html` | Semantic page shell, landmarks, dialogs, inline SVG icon sprite |
| `css/tokens.css` | Documented design tokens: colour, type, spacing, borders, motion, layout |
| `css/app.css` | Layout and components (top bar, rail, inspector, dashboard, drawer, dialogs) |
| `css/map.css` | Map styling, water-flow and status animation, reduced-motion rules |
| `js/mock-data.js` | **All scenario data** (`waterState`, `communityBuildings`, `treatmentStages`, `dailyEvent`, `planningRail`, `residents`, disclosure). Each value is tagged `[workbook]`, `[framework]` or `[proto]`. |
| `js/sim.js` | "Sim-lite": pure functions applying the framework's formulas to the mock state. This is the seam where the real engine plugs in (`compute`, `applyEffects`). |
| `js/map.js` | Inline SVG community map, HTML label layer, selection, ghost previews |
| `js/views.js`, `js/views-dialogs.js` | Pure `(state, derived, ui) → HTML` templates |
| `js/app.js` | State, event wiring, Run Day, allocation drawer, tooltips, focus handling |
| `README.md` | This file |

Reference material is organized under `docs/reference/`; build briefs and implementation notes are under `docs/build/`. The original framework, workbook, prompt, and concept PDF are preserved there unchanged.

## Interactions implemented

1. **Inspect** 18 map objects; the right panel changes (river/reservoir, treatment plant, storage, three pipe mains, intake, eight buildings, wastewater plant, watershed, wetland).
2. **Toggle overlays**: water flow, runoff, sewer and reuse, labels, legend. Flow speed follows delivered volume and slows when storage is low.
3. **Planning rail**: eight collapsible categories with cost, build time, effect, and built / available / locked status. Collapses to an icon strip.
4. **Daily allocation drawer**: sliders plus numeric fields, quick-set presets, live map service statuses, totals (available, requested, unallocated, shortage), affected services, and a clinic critical-service warning that needs an explicit override to confirm.
5. **Heavy Rain event** with three previewed-but-not-guaranteed choices. Turbidity is visible immediately; microbial and nutrient changes stay stale until you run a water test.
6. **Add or preview a treatment stage** (activated carbon): ghost on the map, before/after readings, and the obligations you take on. Approve it, then it completes on Run Day.
7. **Repair the District 2 leak**: delivered water 151.3 → 162.4 units/day with intake unchanged; the freed water is auto-assigned by priority.
8. **Run day**: end-of-day summary (produced, delivered, loss, demand met, wastewater treated, score changes, people gained or lost, cause-and-effect line, reclaimed time).
9. **Water Security explanation**: weights, points, critical gates, and a what-if slider that trips the quality gate.
10. **About / Science**: the WHO disclosure, the three provenance classes, and sources.

Also: what-if bypass of treatment stages (filtration vs disinfection lesson), a pH slider (pH is not a cleanliness score), pipe extension, wetland buffer, reclaimed-water connection (unlocks at 38 research), resident routines, an "Adapt" watch list, time controls, settings (reduce motion, quick build), and a source / plant / tap sample-point highlight.

## What is mocked

- One fictional community (Alder Ford), one Day 4 starting state, one event.
- No seeded RNG, land-use runoff, multi-district hydraulics, failure rolls or research tree.
- Storm effects, the disinfection turbidity penalty (×0.6), the split of the 16% base loss, revenue and running costs, energy supply, population, sector demand shares, and resident time-loss values are **prototype assumptions**, not workbook values.
- Construction takes 1 Run Day when **Quick build** is on (default), so results are quick to see.
- Nothing is persisted.

## How the mock data maps to the framework and workbook

| Prototype value | Source |
| --- | --- |
| Storage 120/250, intake 160, rated 150, condition 0.85, power 1.0, staffing 0.95, gross demand 170, distribution capacity 180, loss 0.16 − 0.05, released 170 | Workbook › Example Day |
| Effective capacity 132.88, overload factor 0.908, delivered 151.3, availability 89, closing storage 82.88 | Reproduced by `sim.compute` from framework §9 and §12 |
| Quality 82.5 (hazard 13.5 + distribution penalty 4), Reliability 82, Access 76, Resilience 68, Water Security 81.6 | Example Day (Quality and Access are computed live; Reliability and Resilience are baselines with framework-weighted deltas) |
| Source, plant outlet and tap readings (62/12/12 turbidity, 77/8/8 microbial, …) | Prompt table. Stage-by-stage readings are calibrated so the baseline matches the table exactly; changes follow the workbook's multiplicative removal formula. |
| Treatment stage removal, energy, running cost; carbon, membrane, RO, ion exchange costs | Workbook › Treatment Matrix |
| Building demand, priority, return flow, shortage consequence | Workbook › Buildings |
| Heavy Rain: +18% volume, +25 turbidity, three decisions | Workbook › Events (EV_RAIN) |
| Score weights 0.30 / 0.25 / 0.20 / 0.15 / 0.10 and the three critical gates | Framework §17 |
| Disclosure text | Framework §2 and workbook › Provenance |

One honest gap: the prompt's plant-outlet **organic load of 18** does not follow exactly from the matrix coefficients (the formula gives about 24). The other five values match the formulas within rounding. The prototype keeps the prompt's table as the baseline and applies formula-based *deltas* to it; the real engine should compute this properly.

## Design notes

Palette is charcoal, warm white and restrained yellow. Water blue appears only on water, flow and selected water infrastructure. Status colours (rust, moss) are always paired with an icon or a word, including the lab table's band icons. Reduced motion is honoured from the OS (`prefers-reduced-motion`) and from Settings; flow direction stays readable through arrowheads and static dashes.

## Recommended next step

Build the real engine behind `WW.sim`:

1. Replace `compute` and `applyEffects` with the framework's fixed daily order (weather, source loads, demand, treatment, storage, distribution, allocation, wastewater, scoring) driven by `docs/reference/Waterworks_Simulation_Model_v1.xlsx` Rules sheet, with a seeded RNG.
2. Move the workbook tables (Treatment Matrix, Buildings, Sources Land Use, Events) to versioned JSON so coefficients stay editable and every score can be traced to source variables.
3. Add the framework's acceptance tests (§27) against the engine, using this prototype's numbers as the first fixtures.
4. Keep `views*.js` as they are; they only read the `derived` snapshot.

## Sources

Most water-quality relationships are simplified from the World Health Organization, *Guidelines for drinking-water quality* (4th ed. incorporating the first, second and third addenda). Costs, speeds, capacities and removal coefficients are gameplay assumptions. Educational only; not engineering or drinking-water safety guidance. The full source list is in the in-app **Science** panel.
