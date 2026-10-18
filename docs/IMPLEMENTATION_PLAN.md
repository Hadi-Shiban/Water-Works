# Waterworks Village: Implementation Plan

This plan builds on [`WATERWORKS_VILLAGE_REDESIGN.md`](WATERWORKS_VILLAGE_REDESIGN.md) (the "redesign doc") and on the master implementation prompt. **Where the two disagree, the master prompt wins.** Section 2 lists every disagreement and how it was settled.

---

## 1. The seven decisions from the redesign doc §11

| # | Decision | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Baseline commit before branching | **Approved** | Done: `2591caf` on `main`. Work continues on `feature/village-redesign`. Nothing is pushed. |
| 2 | Keep the legacy prototype reachable | **Resolved by prompt** | `municipal.html` is a byte-identical copy of the old `index.html`. It loads the untouched `js/*.js` and `css/*.css`. |
| 3 | Scenario selection | **Default applied** | Random, seeded from the village name plus a stored salt. A hidden `?scenario=highland\|plateau\|wetland` URL parameter is available for testing and teachers. |
| 4 | Use of the charity: water name | **Updated** | Sanctioned student collaboration: the wordmark is shown in the lab art, and the disclaimer reads “Waterworks is an educational student project created in collaboration with charity: water.” |
| 5 | Art | **Partly open (see §3)** | The prompt fixes env-01, env-05 and env-04. The village art-reference image mentioned in the prompt is **not in the repository**. |
| 6 | Character names | **Default applied, review needed** | A neutral, multilingual name pool in data. Roles come first; names are replaceable. |
| 7 | Second technology per scenario | **Default applied** | Informational cards in v1 (BioSand, protected spring, solar piped). Only the three primary technologies are buildable. |

## 2. Conflicts between the redesign doc and the master prompt

| Topic | Redesign doc | Master prompt | Resolution |
| --- | --- | --- | --- |
| Resources | Sand, stone, timber, helpers | **Wood and stone only** | Wood and stone. Specialist parts (pump, pipe, cement) are "provided by the partner team" and never gathered. |
| Pacing | Days with 4 daylight actions; germ test ready "next morning" | **No artificial waiting** | No action points or day counter. Progress is driven by events. The germ test plays a short "incubation" sequence (≈ 2 s, skippable) and is framed as an overnight result. |
| Map | Parametric SVG village map, with art used only as backdrops | **The painted background is the map**, with hotspots and overlays | The prompt wins. Each scenario is one painting with an SVG overlay in image-pixel coordinates (§4). |
| Funds | No money; a maintenance fund from Level 4 | "Project funds when needed" | One **project fund** value, shown only in Levels 4–5. |
| Audio | Five tracks plus cues (`AUDIO_DIRECTION.md`) | **One looping track, no sound effects** | One `HTMLAudioElement`. `AUDIO_DIRECTION.md` will be marked superseded in Phase 6. |
| Audio path | — | `public/audio/waterworks-ambient.mp3` | The repo has no `public/`, so the track lives at `assets/audio/waterworks-ambient.mp3`. It was moved from the root `Waterworks.Ambience.mp3` with `git mv`, so history is kept. |
| HUD | 4 indicators in a bottom strip | Compact HUD: name, level, objective, people with reliable water, wood, stone, funds, audio | The prompt wins. The map fills the screen. |
| Report | Hours reclaimed, safe-at-home and others | Adds **system condition** and **remaining maintenance considerations** | Both lists, merged. |

No conflict blocks Phase 1.

## 3a. Update: new illustrated village maps (integrated)

The three storybook backgrounds are now the game maps (`assets/images/village/<scenario>/bg-main.png`), shown uncropped at their own aspect ratio. Hotspots, resource nodes, the station site and every walking route were re-placed against the painted roads, steps, bridges and boardwalks, using zoomed coordinate-grid renders and the `?dev=routes` editor. The section below describes the earlier paintings and is kept for history.

## 3. Does the painted-overlay approach fit the current art?

**It works technically.** One SVG with `viewBox` set to a crop of the painting, the painting as an `<image>` inside it, and overlays drawn in the same coordinates. Hotspots stay aligned at any screen size by construction.

**Content fit is mixed:**

| Scenario | Painting | Fit | Mitigation used in Phase 1 |
| --- | --- | --- | --- |
| Highland Springs | env-01, alpine lake | Beautiful, but **there is no village in the painting.** | Overlaid cottages on the left meadow, a stream inlet as the spring above the village, and the outlet stream as today's collection point. |
| Red Rock Plateau | env-05, canyon | **A good painted village** (adobe cluster) and a spring-fed pool. Also shows **a dam and a solar pumping station** at the right. | The scenario's crop leaves out the right 32% (dam, reservoir, solar array). |
| Wetland Crossroads | env-04, wetland | A farmstead, a barn with a large roof (good for rainwater) and ponds. Shows **a town and a wastewater plant** at the right. | The scenario's crop leaves out the right 34%. |

**The remaining mismatch:** these paintings are eye-level panoramas of North American scenery. The prompt's style target is an angled top-down storybook diorama. Hotspots, overlays and crops are **data** (`js/village/data.js` → `scenes`), so swapping in new backgrounds later means editing coordinates only, with no engine changes. **Decision for you at the Phase 1 review:** keep the current paintings, or commission or generate three diorama backgrounds using the spec in §6.

## 4. Architecture

```
index.html                 new village game (static, no build)
municipal.html             legacy prototype, unchanged
css/tokens.css             shared design tokens (unchanged)
css/village.css            village game styles
js/village/data.js         scenarios, scenes (crops, hotspots, routes), technologies, levels, characters, copy
js/village/sim.js          pure: hash/rng, generateVillage, objectives, gather, build, save (de)serialise
js/village/scene.js        SVG painting + overlays + hotspots + HTML labels; update() by data-attributes
js/village/ui.js           pure (state) → HTML for HUD, checklist, panels, dialogs
js/village/audio.js        single HTMLAudioElement music controller (independent of the game)
js/village/app.js          state, events (delegated data-act), persistence, flow
tests/village.test.mjs     node --test unit tests (no dependencies)
tests/smoke.mjs            headless-Chrome playthrough (dev only; uses local Chrome)
```

Patterns reused from the legacy code:
- pure state → derived → views
- delegated `data-act` events
- focus-preserving render
- toasts and `announce()`
- `<dialog>` with focus return
- the seeded mulberry32 RNG
- the ghost states `site → building → built`
- the "Your eyes vs the lab" glass (Phase 2)
- the allocation normaliser and tiers (Phase 4)
- routines and reclaimed time

**Saving:** the whole `state` object is serialised under `waterworks-village-v1`. A unit test checks that a round trip is lossless, so the old "Continue loses built projects" bug can't come back. Audio preferences are stored separately under `waterworks-audio-v1`.

## 5. Phases and acceptance tests

### Phase 0: Safety ✅
- [x] Git status reviewed; no secrets or generated files found; `.gitignore` already covers OS and editor files.
- [x] Baseline commit `2591caf`; branch `feature/village-redesign`.
- [x] `municipal.html` is byte-identical to the old entry.

### Phase 1: A beautiful playable opening (Level 1)
**Status: implemented, awaiting review.** All 10 acceptance tests below are covered by `tests/village.test.mjs` (14 unit tests) and `tests/smoke.mjs` (112 browser checks), except where marked *manual*.

Builds: start screen, village naming, scenario loading, painted map, hotspots, wood/stone gathering, Level 1 objectives, the field-testing station build (3 visual states), background music, save/continue/new/reset, skippable tips.

Acceptance tests:
1. The same name and salt generate an identical village. All three scenarios can be reached. Populations stay within each scenario's range. *(unit)*
2. Every hotspot, route point and build site lies inside its scene's crop. *(unit)*
3. Gathering adds wood or stone and spends one charge; a node with no charges cannot be gathered; resources never go negative. *(unit)*
4. Building fails without enough resources or before its prerequisite, and makes no partial change. It succeeds otherwise and moves `site → building → built`. *(unit + smoke)*
5. Each Level 1 objective's text names exactly what it checks, and all objectives can be completed in every scenario. *(unit: scripted completion per scenario)*
6. Save → reload → Continue restores level, resources, buildings, node charges and objectives. *(unit round trip + smoke reload)*
7. Music starts only after Start/Continue, loops, defaults to 25%, keeps mute and volume across reloads, never plays two copies, and a missing file disables the control quietly. *(smoke + manual)*
8. Every hotspot can be reached by keyboard (Tab, Enter) and has a visible focus ring. Reduced motion stops walker and pulse animations. *(smoke + manual)*
9. No console errors in a full Level 1 playthrough for each scenario at 1440×900 and 390×844. *(smoke)*
10. `municipal.html` still loads with no console errors. *(smoke)*

### Phase 2: Laboratory and investigation (Level 2)
**Update (Phase 2 prompt): illustrated lab scene.** Level 2 now runs inside the painted lab bench for each scenario (`assets/images/lab/<scenario>/lab-scene.png`):
1. Collect a sample at today's collection point.
2. Bring it to the station, which unlocks the lab.
3. Inspect the clear sample: guess first, then the tests, then a short health note.
4. Inspect the cloudy sample: many more germ colonies.
5. Look through the microscope: magnified views cut from the painted insets.
6. Try the filter: clearer, but still not safe.
7. Survey the land: the two map surveys, kept because the recommendation depends on them.
8. Review the field notes.
9. See the water options: the recommendation unlocks Level 3.

State flags are `labUnlocked`, `clearSampleInspected`, `dirtySampleInspected`, `microscopeUsed`, `filterTestCompleted`, `notesReviewed`, `optionsReviewed` and `level2Completed`. Routes are now named `waterCollection`, `waterCollectionAfter` and `labApproach` (plus `ambient`). Tests: 28 unit tests and 267 browser checks.

**Status: implemented, awaiting review.** Covered by `tests/village.test.mjs` (25 unit tests, including the suitability check over 1,000 seeds per scenario) and `tests/smoke.mjs` (191 browser checks).

Built as planned, with these choices:
- A guess comes before every test ("Looks safe / Looks unsafe / Can't tell"). The feedback names the clear-but-unsafe surprise.
- The germ test shows a ~2 s incubation animation instead of a real overnight wait (the master prompt asks for no artificial waiting).
- Two samples and two surveys per scenario. The site card shows only discovered facts.
- The options board judges all 8 technologies, plus "keep using today's source", from known facts only. Exactly one is recommended: the scenario's primary technology.
- Level 1 is unchanged. A test pins villages generated in Phase 1 to identical names, populations and round trips, and old saves migrate.

- Lab dialog: Look / Clarity / Germ / (Salt in the wetland).
- Three columns, Source → Water point → Home. The Home column unlocks in Level 4.
- Surveys fill the Site card. Technology cards show "Needs survey" until their facts are known.
- Accept: at least one clear-but-unsafe source in each scenario; the test outcome changes which technology cards are recommended; the suitability invariant (1–2 recommended, including the primary, and ≥ 4 rejected with reasons) holds across 1,000 seeds.

### Phase 3: Construction (Level 3)
- Technology choice with ✓/✗ factors.
- 4 build stages for each of the three technologies, with wood/stone costs and partner-provided items.
- A satisfying construction sequence, an activation moment, and the walking route shortening.
- Accept: unsuitable technologies can't be chosen; each stage shows 3 visual states; activation changes round trip and people served immediately.

### Phase 4: Community and distribution (Level 4)
- Four needs measured in jerry cans, with a protected clinic minimum.
- Safe storage and hygiene actions, one expansion with a capacity preview, and one community development decision.
- Accept: allocating more than capacity raises queue time; the safe-at-home figure responds to actions; the expansion preview matches the result.

### Phase 5: Maintenance and completion (Level 5)
- A condition indicator, periodic checks, and one challenge per technology with a 3-option diagnosis and repair.
- Celebration, project report and learning link.
- Accept: the challenge always occurs once and can be resolved; a wrong diagnosis never fails the game; report numbers match the state; the disclaimer is shown.

### Phase 6: Polish and deployment
- Copy and tone pass, responsive checks, performance pass, README rewrite, superseded notes on `docs/build/*`, GitHub Pages check.
- Accept: three playtesters (one per scenario) finish in 30–60 minutes; no console errors across a full campaign; the old prototype still works.

## 6. Art asset specification (only if new backgrounds are approved)

| Asset | Subject | Perspective | Size / format | Notes |
| --- | --- | --- | --- | --- |
| `scene-highland.webp` | Hillside village of 8–12 small houses below a forested ridge; a spring high on the slope; a stream and footpath; a meeting tree | Angled top-down (≈ 35–45°), miniature-diorama, painterly | 2400×1350, opaque | Leave clear, flat build sites: one beside the spring, one above the village (tank), one in the village square (tapstand), one by the school |
| `scene-plateau.webp` | Dry plateau village with a school and clinic, terraced gardens, a canyon edge with a distant riverbed | Same | Same | Build sites: drill site, field station, garden |
| `scene-wetland.webp` | Lowland homes with large roofs, ponds and reeds, a raised footpath, a school | Same | Same | Build sites: tank beside the school roof, field station, garden |
| `structures.webp` (sprite sheet) | Field station, tank, tapstand, hand pump with apron, gutter set, garden plot; each as **site / under construction / completed** | Must match the backgrounds | 256×256 cells, transparent | Warm roofs, yellow canvas accents, soft contact shadows |

Phase 1 uses hand-built SVG overlays drawn in the paintings' palette (warm roofs, timber, yellow canvas, soft shadows) as stand-ins. No emoji or stock icons appear in the world.
