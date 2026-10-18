# Waterworks Village: Redesign Assessment and Plan

**Status:** For review. No gameplay code has been changed. Implementation starts only after this document is approved.
**Scope:** This document turns Waterworks from a municipal water-utility simulation into a five-level village water-project game, inspired by the community-led project lifecycle of charity: water.
**Design goal:** By playing a small simulation that is genuinely fun, a player learns how a community water project is planned, built and kept running. They should not have to read a lesson to learn it.

---

## 0. Summary for reviewers

| Question | Recommendation |
| --- | --- |
| Rewrite or evolve? | **Evolve.** Keep the vanilla-JS, no-build architecture and its proven patterns: the pure `compute` function, `(state, derived, ui) → HTML` views, a map drawn once and updated through data attributes, and delegated `data-act` events. Write a **new village model, map and views beside the current files** so the municipal prototype keeps running as a reference. |
| What is the smallest complete game? | 3 playable scenarios (drilled well, gravity-fed, rainwater catchment). They share one parametric village map, a 2-test field lab, one 4-stage build sequence per technology, one allocation decision, one safe-storage decision, one expansion, one maintenance challenge per technology and one closing community project. |
| Estimated size | About 2,000–2,600 new lines of JS/CSS, close to the size of today's prototype. No dependencies. |
| Biggest risks | (1) **The art is temperate North American scenery**, and two images show existing municipal infrastructure. See §8.1. (2) Using the charity: water name and brand needs care. See §5.6. (3) **Most of the repository is uncommitted** (`git status` shows `css/`, `js/`, `assets/`, `docs/` and `index.html` untracked). Commit a baseline before anything else (Phase 0). |
| Decisions needed from you | Listed in §11. |

---

## 1. Existing working systems to preserve

What I inspected: `index.html`, all 6 files in `js/`, all 3 in `css/`, the `docs/build/*` briefs, `docs/reference/Waterworks_Game_Framework_v1.md`, the 5 environment images and `assets/audio/credits.json`. The prototype has no build step and no tests, and saves to `localStorage` under `waterworks-save-v1`.

### 1.1 Architecture worth keeping

| System | Where | Why it carries over |
| --- | --- | --- |
| Global `WW` namespace, script-tag load order, no build | `index.html`, all `js/` | Simple, works when opened as a file, suits a class project. Keep it. |
| Pure calculator → `derived` snapshot → pure views | `sim.js` `compute()`, `views*.js` | This is the right seam. The village model becomes a new `compute()`, and views only read `derived`. |
| Preview a change on a cloned state | `sim.previewItem`, `clone` | Reuse it for "what will this change?" previews before building or expanding. |
| Delegated event handling through `data-act` / `data-id` | `app.js` `act()` | Scales well, and focus is restored by data attributes after each re-render. |
| Focus-preserving `render()`, `announce()` live region, toasts, tooltip system | `app.js` | The accessibility basics are already done. Reuse them as they are. |
| Dialog framework with focus return | `app.js` `openDlg`, `dlgReturn` | Reuse for meetings, technology choice, the report and challenges. |
| Map drawn once, toggled by `data-*` and classes, plus an HTML label layer | `map.js` `mount`/`update`/`renderLabels` | Same pattern for the village map. Labels stay readable at any scale. |
| **Ghost build states** `preview → building → built` | `map.js` `[data-ghost]` + `data-mode`, `map.css` | This is already a construction-animation system. Each build stage becomes a ghost. |
| Seeded deterministic RNG (`mulberry32`) and tree scatter | `map.js` `rng()`, `trees()`, `house()`, `row()` | Move it into a shared util. It drives village generation and breakdown rolls, with reproducible seeds. |
| Animated flow paths with arrowheads, reduced-motion fallbacks | `map.css` | Reuse for pipe flow and for the **walking route with jerry cans**. |
| Tank clip-fill driven by a CSS variable | `map.js` `#tankClip`, `--fill` | Reuse directly for rainwater and gravity storage tanks. |
| Leak / fixed marker | `map.js` `#leakMark`, `#fixedMark` | Reuse for the Level 5 pipe break in the gravity scenario. |
| Storm cloud and rain animation | `map.js` `.storm` | Reuse for rain events, which fill tanks in the rainwater scenario. |
| Sample points **S / P / T** (source / plant / tap) | `map.js` `samples` | Relabel as **Source / Water point / Home**. This is exactly the lesson that water can become unsafe between the tap and the household. |
| "Your eyes vs the lab" glass illustration | `views.js` `glass()`, `sourcePanel` | This is the clarity-is-not-safety lesson, and it's already built. It becomes the core of the Level 2 lab. |
| Visibility flag per reading (eye vs flask icon) | `mock-data.js` `visible`, `readingRow()` | Keep the idea, with only two readings shown. |
| Stale readings after an event until you re-test | `labView()`, `sampleStale` | Reuse: after rain or a repair, the last test is out of date. |
| Service tiers `full / reduced / rationed / cut` and `tier()` | `sim.js` | Reuse for each need (homes, school, clinic, garden). |
| Allocation normaliser (priority order, protected minimum for critical services) | `sim.js` `normalizeAllocation` | Reuse with 4 needs instead of 6, so the clinic minimum still applies. |
| Allocation drawer (sliders, presets, live totals, critical-service override) | `views-dialogs.js` `V.drawer`, `app.js` | Reuse, but shown in **jerry cans per day** and simplified. |
| Residents with routines and **reclaimed hours** | `mock-data.js` `residents`, `compute()` routines, summary dialog | This is the human reward. Time spent fetching water is the central charity: water story, and the code already turns service levels into hours. |
| End-of-day summary with a "hero line" that explains cause and effect | `app.js` `runDay`, `V.summaryDialog` | Keep the cause→effect sentence. Drop the score table. |
| Event dialog with choices and likely (not guaranteed) outcomes | `V.eventDialog`, `applyChoice` | Reuse for the Level 5 maintenance challenge. |
| Objective banner with `check(state, derived, ui)` predicates | `app.js` `chapterGoals`, `renderChapterBanner` | Generalise into level objectives. |
| Guided tutorial overlay | `index.html` `#tutorialOverlay`, `openTutorialStep` | Reuse for short in-level prompts spoken by a character. |
| Start screen, Continue, `saveProgress` / `loadProgress` | `index.html` `#startShell`, `app.js` | Extend with "Name your village". |
| Settings: reduce motion, labels, audio volumes, audio stub | `app.js` `AUDIO`, settings dialog | Keep. `docs/build/AUDIO_DIRECTION.md` still applies. |
| Design tokens (charcoal, warm white, **restrained yellow**, water blue only for water), status colours always paired with an icon | `css/tokens.css` | Already a charity: water-adjacent palette. Increase the yellow (see §9). |
| Icon sprite | `index.html` | Keep. Add jerry can, hand pump, tap, gutter and person icons. |
| Science disclosure, provenance classes, WHO sources | `mock-data.js` `disclosure`, `sources`, `provenanceClasses`, About dialog | Keep the three provenance classes (scientific relationship / gameplay abstraction / balance coefficient). They are the basis of §7's integrity rules. |

### 1.2 Assets (all preserved, none removed)

| Asset | Current use | Redesign use |
| --- | --- | --- |
| `env-01-alpine-headwaters.png`: high lake, outlet stream, hillsides | Chapter 1 backdrop | **Highland Springs → gravity-fed** scenario |
| `env-02-aspen-river.png`: clear river, small settlement on a terrace, footbridge | Chapter 2 preview | Future **hand-dug well / protected spring** scenario. Start-screen montage. |
| `env-03-meadow-reservoir.png`: dam, intake tower, water tower, treatment works | Chapter 3 | Future **rehabilitation** scenario: the infrastructure already exists and needs repair, which fits this art exactly. Not used for new-build scenarios. |
| `env-04-wetland-crossroads.png`: wetland, ponds, rain clouds, small town | Chapter 4 | **Wetland Crossroads → rainwater catchment** scenario |
| `env-05-redrock-resilience.png`: arid canyon, river far below, solar array | Chapter 5 | **Red Rock Plateau → drilled well** scenario. The solar array suggests a future solar-pumped upgrade. |
| `assets/audio/credits.json` | Empty manifest | Unchanged |
| `docs/reference/*` (framework, workbook, concept PDF) | Authoritative for the municipal design | Keep unchanged as reference. Mark them as superseded for gameplay scope (Phase 6). |

### 1.3 Known issues in the current prototype (don't carry these forward)

Listed so the new level code avoids them. None of them are fixed during this assessment.

- `app.js` chapter goal "Day 4" needs `reliablePeople ≥ 80% of 1,250`. Only 950 people are connected unless the player happens to build the Terrace pipe extension, and the objective text never mentions it.
- `persistGameState()` does not save `flags`, `projects`, `event`, `protect` or `population`, so **Continue** loses built projects.
- Tutorial step 4 targets `[data-act="repair"]`, which exists only while the District 2 pipe panel is open.
- **Explore environments** only swaps the background image.
- These lessons apply to the new code: objectives must name every condition they check, saves must cover all mutable state (a test should enforce this), and tutorial targets must always be present.

---

## 2. Mechanics to simplify or retire

**Principle:** keep the causal chain and hide the instruments. A mechanic stays visible only if the player acts on it in one of the six visible verbs: collect, build/upgrade, test, allocate, maintain, watch the community grow.

| Current mechanic | Decision | Replacement |
| --- | --- | --- |
| Water Security score (5 weighted scores and 3 critical gates) | **Retire from the UI** | 4 plain village indicators (§9.2). The gate idea survives internally: unsafe water caps "people served". |
| Five contaminant loads (turbidity, microbial, nutrients, chemical, organic) on a 0–100 scale | **Simplify** | Keep 2 internal values, `clarity` (turbidity) and `germRisk` (microbial). An optional third, `salty`, applies only to the wetland groundwater. The UI shows each as a 3-state result: Safe / Risky / Unsafe. |
| pH slider, mineral readings, alkalinity | **Retire** | One optional "Did you know?" card in the lab. |
| Multi-stage treatment train, removal matrix, overload factor, disinfection–turbidity penalty | **Retire from the UI** | Treatment is a property of the technology (protected source, sealed well, first-flush diverter) and of household actions (safe storage, an optional filter). `overloadFactor` is reused internally as **queue strain** at the water point. |
| Intake slider, reservoir volume, plant rated capacity, staffing, power | **Retire** | Each technology has one `capacity` (jerry cans per day), changed by `condition` and season. |
| Treated storage and reserve days | **Simplify** | Visible only where a tank exists (gravity, rainwater). Shown as a fill level. |
| Distribution network: 3 district mains, loss split | **Simplify** | Gravity only: one pipeline with a break event in Level 5. No loss percentages. |
| Wastewater plant, sewer overlay, outfall, reclaimed-water reuse | **Retire** | Replaced by a soak-pit / drainage apron at the water point. That's the real-world hygiene detail: standing water around a pump attracts contamination. |
| Runoff tracing, wetland buffer, forest strip, farm nutrient plan | **Simplify** | In Level 2 the player investigates contamination near the current source (livestock, latrine, run-off) and learns why the protected source is better. One "Protect the source area" build stage stays. |
| Funding (48,000), revenue, opex, energy, research knowledge | **Retire** | **Local materials** (sand, stone, timber) gathered on the map, **helpers** (community labour per day) and one small **maintenance fund** run by the water committee. No prices, tariffs or budgets. |
| Planning rail with 8 categories and about 25 items | **Retire** | A contextual **Actions** panel with 3–6 actions that fit the current level. |
| 6 sectors (clinic, school, homes, market, industry, farm) | **Simplify** | 4 needs: **Homes, School, Clinic, Garden/livestock**. Industry and market are dropped. |
| Real-time clock (pause / normal / fast) | **Retire** | A single **End day** button. Each day has a few action points ("daylight"). The pace stays in the player's hands. |
| Heavy Rain event | **Repurpose** | Rain fills rainwater tanks. It also makes stream water cloudy, which sets up a lab lesson. |
| Leak repair | **Repurpose** | Gravity scenario, Level 5 challenge. |
| Plant maintenance (`doMaintain`) | **Repurpose** | Caretaker routine checks (Level 5). |
| Bottom dashboard (scores and source/plant/tap lab table) | **Retire** | Objective checklist and "Today" strip. The lab table moves into the lab dialog with Source / Water point / Home columns. |
| Chapter structure (Alpine Day 1–4, five environments as chapters) | **Retire** | Five **levels** inside one village. Environments become **scenarios**. |

**Explicitly out of scope** (per the brief): finance and budgeting, detailed chemistry, population AI or pathfinding, crafting trees, tariff design, government permits, multiple villages, fail states that end the game.

---

## 3. The new five-level progression

**Target time:** 30–60 minutes. A *day* is one press of **End day**. Each day gives the player **4 daylight actions** (a gameplay coefficient). Gathering, talking, testing and helping on a build stage each cost 1 action. Reading, inspecting and planning are free. Levels last about 3–6 days, so a full game is roughly 20–25 days.

Every level follows the same rhythm: **a character introduces a goal → 2–4 visible objectives → a celebration card → the next level unlocks.** No objective can be failed. Poor choices slow progress and show why, but never end the game.

### Level 1 · Meet the Village (≈ 6–10 min, 3–4 days)

*Goal: understand the place, the people and the walk.*

- **Opening:** the player names the village, and the scenario is assigned (§4). A backdrop card introduces the landscape: "Kesi Hill sits below a forested ridge. Families collect water from a stream 35 minutes' walk away."
- **Meet 3 community representatives:** the water committee chair, the teacher and the health worker (§5.2). Each conversation shows one fact about water in daily life, plus a goal of their own.
- **Follow the water route:** a single action animates a family member with yellow jerry cans along the footpath. The HUD shows the **round-trip time** (for example 70 min) and the **water per person** (for example 9 L/day).
- **Gather local materials:** tap resource nodes on the map (sand at the riverbank, stone at an outcrop, timber at a grove). Nodes refill overnight.
- **Set up the field lab:** spend materials (5 timber, 3 stone) to build a lab bench at the school. **The lab unlocks, and Level 1 is complete.**
- **Teaches:** water access is about time, distance and amount, and the community already has knowledge and plans.

### Level 2 · Investigate (≈ 6–10 min, 3–5 days)

*Goal: find out what the water is really like and what the land can support.*

- **Water testing in the lab:** test 2–3 existing sources (the stream, an open scoop hole, a pond or unprotected spring).
  - **Clarity test** (turbidity tube): instant. Visible with the eyes.
  - **Germ test** (a presence/absence indicator for faecal bacteria): **the result is ready the next morning.** That a safety result takes time and a test is part of the lesson.
- **The "aha" moment:** at least one source in every scenario looks **clear but tests Risky or Unsafe**. The existing `glass()` "Your eyes / The lab" pair shows this.
- **Contamination clue:** inspecting the source shows nearby livestock tracks, a latrine uphill or run-off. This explains why protecting a source matters, without any chemistry.
- **Site surveys with the partner team** (1 action each, scenario-specific; they fill in the **Site card**):
  - Highland: walk to the spring with the field engineer, measure the height drop, measure the flow.
  - Plateau: a hydrogeological survey with the partner hydrogeologist, which reveals that groundwater is deep but reliable.
  - Wetland: rainfall records from the elder and the school's notebook, measuring roof areas, and testing the shallow groundwater (salty).
- **Community meeting:** the Site card is complete, and the partner team presents the **technology options** (§5). **Level 2 is complete.**
- **Teaches:** clarity is not safety, safety needs a test, and the right technology depends on the place.

### Level 3 · Build (≈ 8–12 min, 4–6 days)

*Goal: choose the right solution with local experts and build it together.*

- **Choose with experts:** a card for every technology in the registry. Suitable ones show ✓ reasons. Unsuitable ones are greyed, with plain reasons ("Groundwater here is 60 m deep. A hand-dug well can't safely reach it."). If two are suitable, the committee and the engineer explain the trade-off, and the player confirms the community's choice.
- **Gather materials** for the build list. Local materials are gathered. Specialist parts (pump, pipe, cement, drilling rig time) are supplied by the partner. They appear in the list as "Partner provides" and are never bought.
- **4 build stages per technology** (§5.4). Each stage is led by a named local expert. The player spends daylight on **help actions** that move a stage along visibly: carry stones, dig a trench section, mix concrete. The map ghost goes from `preview → building → built`.
- **Quality check:** a germ test at the new water point must come back **Safe** (it's built so it does).
- **Activation:** a celebration card, water flows on the map, and the walking route shortens and redraws. The HUD round-trip time falls (70 → 15 min, for example), and the reclaimed hours appear. **Level 3 is complete.**
- **Teaches:** the technology must fit the source, communities build and own projects, and access is measured in time saved.

### Level 4 · Manage (≈ 6–12 min, 3–5 days)

*Goal: share water fairly, keep it safe all the way home, and grow carefully.*

- **The water committee forms:** a short card introduces the chair, treasurer and caretaker, all residents. The player helps; the committee decides.
- **Allocation:** the existing drawer, in jerry cans per day, for **Homes / School / Clinic / Garden**. The clinic has a protected minimum. If total demand exceeds capacity, queues grow (queue strain) and round-trip time rises.
- **Opening hours / schedule:** one toggle, *morning only* or *morning + evening*. Longer hours raise usable capacity and also wear the system faster.
- **Safe water at home:** testing a sample **at home** (third sample point) shows that water clean at the pump can be risky at home. The player helps the hygiene promoter roll out a choice of:
  - clean, capped jerry cans (cheap, quick, partial effect),
  - a handwashing station at the school (needs materials, adds to the school's routine),
  - household hygiene sessions (takes daylight, larger effect).
  "Safe water at home %" rises.
- **Maintenance fund:** the committee agrees a small household contribution: *none / small / regular*. This is one decision, not a finance system. It sets how quickly the maintenance fund grows for Level 5.
- **One manageable expansion** (scenario-specific): a second tapstand (gravity), a school tank (rainwater) or a cattle trough with drainage (well). A capacity check runs first: "This adds 40 people. The well can serve them, but queues will reach 12 min."
- **Teaches:** allocation and capacity, recontamination between source and home, and that growth must match supply.

### Level 5 · Sustain (≈ 6–12 min, 4–6 days)

*Goal: keep it working and help the community build on it.*

- **Caretaker training:** a short checklist mini-task, tapping 3–4 check points on the water point. Each day the checklist is done lowers wear.
- **Monitoring:** a **logbook** strip (or a simple flow sensor for the well) shows daily use. When the challenge hits, the drop shows up there first. Monitoring catches problems early.
- **One infrastructure challenge** (scenario-specific, seeded timing, always happens once):
  - Drilled well: hand-pump seals wear and the flow weakens.
  - Gravity-fed: a pipe breaks at a stream crossing (reuses the leak marker).
  - Rainwater: a long dry spell drains the tank, and a missing first-flush screen lets in debris.
  The player **diagnoses** the cause from 3 options with the caretaker, uses the maintenance fund for spare parts, and gets the repair done. A prompt repair keeps reclaimed hours high; a delay shows the walk coming back.
- **Final community objective:** the committee picks one of three: **school handwashing and garden**, **clinic water supply**, or a **community vegetable garden** watered from overflow. It needs materials, some days of reliable service, and the safe-at-home target. Each one visibly changes the map (a garden grows, children at the school tap, a clinic tank).
- **Project report** (§9.6) and an optional "Learn how real projects work" link.
- **Teaches:** maintenance and monitoring keep water flowing, local ownership matters, and water opens time for other goals.

### 3.1 Level objectives (data-driven, testable)

Objectives use the existing `check(state, derived, ui)` pattern. Each objective's text must describe exactly what it checks.

```js
// js/village-data.js (sketch)
levels: [
  { id: 1, title: 'Meet the Village', objectives: [
    { id: 'meet3',  text: 'Meet three community representatives', check: (s) => s.met.length >= 3 },
    { id: 'route',  text: 'Follow the water collection route',   check: (s) => s.flags.routeWalked },
    { id: 'lab',    text: 'Build the field lab bench',            check: (s) => s.built.includes('lab') } ] },
  { id: 2, title: 'Investigate', objectives: [
    { id: 'tests',  text: 'Get germ-test results for 2 water sources', check: (s) => s.results.filter(r => r.germ).length >= 2 },
    { id: 'survey', text: 'Complete the site survey',                    check: (s) => siteCardComplete(s) },
    { id: 'meet',   text: 'Hold the community meeting',                  check: (s) => s.flags.meetingHeld } ] },
  // …levels 3–5
]
```

---

## 4. Initial village generation

### 4.1 Inputs and determinism

- The player types a **village name** (fictional; there's also a "Suggest a name" button).
- `seed = hash(name) ^ randomSalt`. The salt is stored, so **Continue** and the report reproduce the same village. The seed appears in Settings for replays and testing.
- `scenario = pick(PLAYABLE_SCENARIOS, rng)`. Optionally (decision §11), a hidden "Choose scenario" option for teachers.

### 4.2 Scenario archetypes

Each archetype fixes the **geography** and draws **parameters within ranges** chosen so the suitability model (§5) always returns one or two technologies. That rule is enforced by a validator and by a test.

| | **Highland Springs** | **Red Rock Plateau** | **Wetland Crossroads** |
| --- | --- | --- | --- |
| Backdrop | `env-01` | `env-05` | `env-04` |
| Terrain | Hillside village below a forested ridge | Dry plateau above a canyon | Flat, seasonally flooded lowland |
| Population (game) | 160–300 | 220–380 | 120–220 |
| Current water | Unprotected spring pool and stream, used by livestock | Scoop holes in a seasonal riverbed far below | Pond and open shallow well, both near homes |
| Round trip today | 50–80 min | 90–150 min | 25–45 min (close, but unsafe) |
| Clear but unsafe source | The spring pool looks clear; the germ test shows Unsafe | Scoop-hole water is clear after settling; germ test Risky | The open well looks clear; germ test Unsafe, and it tastes salty |
| Key site facts revealed in L2 | Spring 0.8–1.6 km away, **20–60 m above** the village, steady flow | Groundwater **35–80 m** deep in hard rock, reliable yield, rig access along a track | **1,100–1,800 mm** of rain a year with a 2–3 month dry season, salty shallow groundwater, large school and clinic roofs |
| **Recommended** | **Gravity-fed system** (+ **protected spring** if the flow is low compared with the population) | **Drilled well with hand pump** (solar piped shown as "later, as the village grows") | **Rainwater catchment** (+ **BioSand filters** as a household complement) |
| L4 expansion | Second tapstand | School tank (or cattle trough with drainage) | Extra household/school tank |
| L5 challenge | Pipe break at the stream crossing | Hand-pump seal wear | Dry spell + debris without first flush |

### 4.3 Generated state shape

```js
village = {
  name, seed, scenarioId,
  population, households,             // households ≈ population / 6 [game]
  people: [...],                      // representatives (§5.2), names from a pool
  map: { layout, resourceNodes, homeClusters, routeLength },
  site: {                             // hidden until surveyed in L2 (each field has `known: false`)
    terrain: 'hillside'|'plateau'|'lowland',
    sourceAbove: { exists, headM, distanceKm, flowLpm, seasonal },
    groundwater: { depthM, yield: 'low'|'medium'|'high', rock: 'soft'|'hard', salty },
    rainfall: { annualMm, dryMonths },
    surface: { kind: 'stream'|'river'|'pond', distanceKm },
    roofs: { suitableM2 },
    access: { rigTrack: true|false },
    sunHours,
  },
  sources: [ { id, name, kind, clarity, germRisk, salty, contaminationClue } ],
  baseline: { roundTripMin, litresPerPerson },
}
```

### 4.4 Generation validator

`generateVillage(name, salt)` runs `suitability(site)` and **re-rolls** (with `salt + 1`) if the result does not have 1–2 recommended technologies that include the archetype's primary technology. The re-roll is invisible to the player. A test checks 1,000 seeds per scenario.

---

## 5. The technology selection model

### 5.1 Extensible registry

One registry entry per technology. Playable entries have `playable: true` and a `build` sequence. The rest show on the choice screen with honest reasons, so the player sees **why** they don't fit here.

```js
// js/village-data.js (sketch). All numbers are [game] coefficients (§7).
technologies: {
  drilledWell: {
    name: 'Drilled well with hand pump', playable: true, icon: 'pump',
    requires: [                                     // hard gates → plain-language reasons
      { test: (s) => s.groundwater.yield !== 'low',  no: 'Test drilling found too little groundwater.' },
      { test: (s) => s.access.rigTrack,              no: 'A drilling rig cannot reach the site.' },
      { test: (s) => !s.groundwater.salty,           no: 'Groundwater here is salty at every tested depth.' },
    ],
    fit: { quantity: (s, v) => …, protection: 0.9, maintenance: 0.7, access: (s, v) => … }, // soft score inputs
    capacityCans: 360,          // hand pump ≈ 15 L/min × ~8 h use ÷ 20 L
    wearPerDay: 0.012,          // condition lost per day before upkeep
    build: [ 'siting', 'drilling', 'pumpTest', 'apron' ],
    challenge: 'pumpSeals',
    expansion: 'cattleTrough',
  },
  gravityFed: { … requires: [ sourceAbove.exists, headM ≥ 15, !seasonal ], build: ['springBox','tank','trench','tapstands'], challenge: 'pipeBreak' },
  rainwater:  { … requires: [ annualMm ≥ 600, roofs ≥ 100 m² ], capacity from roof × rain, build: ['gutters','base','tank','firstFlush'], challenge: 'drySpell' },
  protectedSpring: { … requires: [ sourceAbove.exists && distanceKm ≤ 1.5 ] },
  handDugWell:     { … requires: [ depthM ≤ 15, rock === 'soft', !salty ] },
  solarPiped:      { … requires: [ yield === 'high', sunHours ≥ 5, population ≥ 400 ], laterNote: 'Suitable once the village grows and a trained operator is in place.' },
  bioSand:         { … kind: 'household', requires: [ surface.kind exists ], note: 'Treats water at home. It does not make more water.' },
  rehabilitation:  { … playable: false, scenarioOnly: 'meadowReservoir' },
}
```

### 5.2 How suitability is calculated

1. **Hard gates.** If any `requires` test fails, the technology is *Not suitable here* and the first failing reason is shown.
2. **Soft fit score** (0–100, internal) for technologies that pass:
   `fit = 35·quantity + 25·protection + 20·access + 20·maintenance`
   - *quantity*: capacity ÷ village demand at 20 L/person/day, capped at 1
   - *protection*: how well the source is protected from contamination by design
   - *access*: expected round-trip time after building, compared with today
   - *maintenance*: how easily local skills and parts can keep it going
3. **Recommended:** feasible, `fit ≥ 70`, and within 15 points of the best, up to a maximum of 2.
4. The player sees **✓ / ✗ factor chips** (for example "✓ Spring is 40 m above the village · ✓ Steady flow all year · ✗ Needs 1.4 km of pipe") and never sees the score.

### 5.3 Information comes from investigation

The Site card fields start as **Unknown**. Technology cards show "Needs survey" until the field they depend on has been surveyed in Level 2. This turns technology choice into the result of the player's own investigation rather than a random gift, which is the core design decision.

### 5.4 Build sequences (the three playable technologies)

Each stage has a **lead** (a local expert or community member), **local materials**, **partner-provided items**, **help actions** (player daylight) and **crew days**. Ghost IDs map onto map layers.

| Drilled well | Gravity-fed | Rainwater catchment |
| --- | --- | --- |
| 1. **Siting with the community:** pick a spot uphill from latrines (a choice with feedback) | 1. **Spring box:** protect the spring eye, fence it from livestock (stone, sand) | 1. **Gutters and downpipes** on the school/clinic roof (timber, partner-supplied gutters) |
| 2. **Drilling:** partner rig crew, 1 day, with an animation (community clears the track) | 2. **Storage tank** above the village (stone, sand, partner cement) | 2. **Tank base:** a level stone foundation (stone, sand) |
| 3. **Pump test and pump installation:** shows the measured yield | 3. **Pipe trench:** the player taps trench segments alongside community diggers (the main help action) | 3. **Ferro-cement tank** (sand, partner cement and mesh) |
| 4. **Concrete apron and drainage channel:** stops water from pooling | 4. **Tapstands** with soak-aways | 4. **First-flush diverter and tap:** discards the first dirty roof water |

### 5.5 Not every technology works everywhere

The choice screen always lists all 7 registry entries (plus "Rehabilitation, not applicable: there is no existing system here"). Each unsuitable entry gives a concrete, scenario-specific reason. A test checks that every scenario rejects at least 4 technologies, each with a non-empty reason.

### 5.6 Using the charity: water name

- Present the game as *"inspired by the community-led approach of charity: water and its local partners"*. Do **not** use their logo, photos, wordmark or campaign language, and do not suggest an endorsement. Add: *"Waterworks is an independent educational project and is not affiliated with charity: water."*
- The yellow jerry can is a general symbol of water collection. Use our own illustration in our token yellow, not a copy of their branding.
- The learning link goes to the public site (`https://www.charitywater.org/`). Check the exact page before release.
- If the game will be published beyond a class, ask charity: water for permission to use the name.

---

## 6. Laboratory simplification

### 6.1 The field lab

- **Unlocked** by building the lab bench in Level 1. It appears on the map as a small yellow-roofed lean-to at the school. Opening it shows the lab dialog.
- **Samples:** collect a sample at a source on the map (1 daylight action, with a jerry-can animation), then run tests in the lab.

| Test | Speed | Reveals | Shown as |
| --- | --- | --- | --- |
| **Look** (free) | Instant | Colour and cloudiness | `glass()` illustration: "Looks clear / Slightly cloudy / Cloudy" |
| **Clarity tube** | Instant | Turbidity | Safe ✓ / Risky ▲ / Unsafe ⬢, with icon and word |
| **Germ test** | **Ready next morning** | Presence of faecal-indicator bacteria | Safe ✓ / Risky ▲ / Unsafe ⬢ |
| *Taste/salt strip* (wetland only) | Instant | Salty groundwater | "Too salty to drink every day" |

### 6.2 Three sample points, one table

The lab table replaces the bottom dashboard's 5×3 table and keeps its column pattern: **Source · Water point · Home**. The Home column unlocks in Level 4 and teaches recontamination.

### 6.3 Internal model

```js
// germRisk and clarity are internal 0–100 [game] values, reused from sim.band().
const result = (v) => v < 20 ? 'safe' : v < 50 ? 'risky' : 'unsafe';   // [game] thresholds
pointGerm = techProtected ? 5 : source.germRisk;                        // protected/sealed sources start low
homeGerm  = pointGerm + handlingRisk * (1 - safeStorageAdoption);       // reuses the old "tap recontamination" idea
```

### 6.4 The lesson must be discovered, not read

The prompt "Why can clear water be unsafe?" appears **only after** the player has seen a clear-but-Unsafe result. It's one short line from the health worker, not a panel of text.

---

## 7. Community, maintenance and scientific integrity

### 7.1 Community structure

**Player role:** *project assistant with the local partner team.* Every decision card is framed as "the committee decides…" or "the engineer recommends…", and the player's choice confirms or supports it.

| Group | Roles (all fictional) | Gameplay function |
| --- | --- | --- |
| **Community** | Water committee chair, treasurer, caretaker/mechanic, teacher, health worker, elder, youth helpers | Set priorities, supply materials and labour, run the system, run the maintenance fund, choose the final objective |
| **Local partner team** | Field engineer/hydrogeologist, hygiene promoter, crew lead (drilling / masonry / plumbing, depending on technology) | Survey, recommend technology, lead construction, train the caretaker, monitor |
| **Player** | Project assistant | Gathers, tests, helps on stages, supports decisions, writes the report |

- **Names** come from a configurable pool in data, not hard-coded. Because the setting is fictional, avoid tying characters to a real ethnicity or country. **Have the roster and dialogue reviewed** by someone with WASH-sector or lived experience before release.
- **Tone rules** (for all copy): residents are capable and have plans. Water collection is shown as hard, time-consuming work, not misery. Avoid "save", "help the poor", guilt counters or crisis imagery. Celebrate shared work.
- Existing representative routines (`residents` with tier-based hours) are reused: each representative's routine changes with service level, and hours saved roll up into **reclaimed time**.

### 7.2 Helpers: the development feedback loop

`helpersPerDay = base + floor(hoursReclaimedPerDay / 20)` [game]. As collection time falls, more people are free to help gather and build. This makes "water opens time for other goals" something the player can feel, not just read.

### 7.3 Maintenance model

```js
condition      -= tech.wearPerDay * (extendedHours ? 1.3 : 1) * (checklistDoneToday ? 0.4 : 1);   // [game]
capacityToday   = tech.capacityCans * conditionFactor(condition) * seasonFactor;               // conditionFactor reused from sim.js
challengeDay    = seeded between L5 day 2 and day 3 (always happens once)
repair          = diagnose(correct) + parts from maintenance fund + caretaker action → condition = 0.95
```

There is no random failure before Level 5. The game should feel calm.

### 7.4 Causal relationships kept (simplified)

| Relationship | In the game | Provenance |
| --- | --- | --- |
| Source → quality | Open sources have a high `germRisk`; protected springs, sealed wells and first-flush roof water have a low one | Scientific relationship (WHO GDWQ) |
| Quality is invisible | Clarity is shown; germs need a test that takes time | Scientific relationship |
| Quantity ← source | Capacity per technology: flow (gravity), yield (well), roof × rain × 0.8 (rainwater) | Relationship (the rainwater formula is standard); numbers are [game] |
| Treatment / protection | Technology protection and the optional BioSand filter reduce `germRisk` | Relationship; percentages are [game] |
| Distribution and handling | Home `germRisk` rises without safe storage | Scientific relationship (WHO household water management) |
| Capacity → access | Demand above capacity → queue time → longer round trip | Gameplay abstraction |
| Access → use | Long round trips lower the water used per person | Relationship (WHO 2020 *Domestic water quantity, service level and health*) |
| Maintenance → reliability | Wear lowers capacity; upkeep slows it; repair restores it | Gameplay abstraction |

### 7.5 Coefficient rules

- Every number in `village-data.js` carries a tag, `[game]`, `[ref]` or `[ref-adapted]`, in the style `mock-data.js` already uses.
- Reference benchmarks appear in the About panel **as context, not as game outputs**:
  - 20 L/person/day as a basic service level (WHO, 2020)
  - a round trip of 30 minutes or less for "basic" service (WHO/UNICEF JMP service ladder)
  - Sphere Handbook guidance on how many people one tap or hand pump should serve
  - Check every figure against the current edition before release.
- Disclaimer (adapted from the current one): *"Water relationships are simplified from WHO guidance. Capacities, timings and costs are gameplay assumptions. Educational only. Not engineering or drinking-water safety guidance."*

### 7.6 Optional references (About panel)

WHO *Guidelines for drinking-water quality* (already cited) · WHO/UNICEF Joint Monitoring Programme (washdata.org) · WHO (2020) *Domestic water quantity, service level and health* · Sphere Handbook (spherestandards.org) · CAWST BioSand filter resources (cawst.org) · Rural Water Supply Network (rural-water-supply.net) · WEDC technical briefs on springs, rainwater and hand pumps (Loughborough University). Verify every URL before shipping.

---

## 8. Map and environment modifications

### 8.1 Using the existing art honestly

The five paintings show temperate North American scenery (the manifest cites the Wasatch range). `env-03` shows a dam, a water tower and a treatment works; `env-05` shows a solar array and a small plant.

- **Use the art as backdrops and scene cards** (start screen, scenario introduction, level transitions, report header), as it is used today. The **playable surface is the illustrated SVG village map**, which matches the manifest rule of semantic overlays.
- **Don't name real countries.** Present all villages as fictional places in fictional regions. Keep the manifest rule: *"Never imply that one fictional landscape represents every community facing water challenges."*
- Use `env-03` only for the future **rehabilitation** scenario, where existing infrastructure is the point.
- **Recommendation (decision §11):** in a later phase, commission or generate additional backdrops that show a wider range of geographies (savanna, highland farmland, river delta) so the game reflects where community water projects actually happen. Keep the current five.

### 8.2 The village map (a new `js/village-map.js`, same pattern as `map.js`)

One parametric 1200×800 SVG built from shared parts. It is drawn once per village and updated through `data-*` attributes.

| Layer | Contents | Reused from |
| --- | --- | --- |
| Base | Paper texture, grid, contours | `map.js` defs and `.land` |
| Terrain | Scenario terrain: hillside contours and ridge (Highland), canyon edge and dry riverbed (Plateau), ponds and reeds (Wetland) | `mtn`, `contours`, `wet`, `reed` shapes |
| Village | 3–5 home clusters (seeded positions), school, clinic, meeting tree, the lab lean-to (ghost until built) | `house()`, `row()`, `bld-big` |
| Current sources | Selectable source objects with sample points | `.obj` + `samples` |
| **Walking route** | A dashed footpath with animated walkers carrying **yellow jerry cans**. Its length is redrawn when the water point is activated | `pipe-flow` animation, `--flow-dur` |
| Resource nodes | Sand (riverbank), stone (outcrop), timber (grove): tappable, with a "depleted" state until morning | new `.node` objects |
| Build sites | Ghost groups for every stage of the scenario's technology, plus the L4 expansion and the L5 community project | `[data-ghost]` + `data-mode` |
| Water | Pipe flow (gravity), tank fill (gravity/rainwater), pump splash (well) | `.flow`, `#tankClip` |
| Events | Rain (`.storm`), pipe break (`#leakMark`/`#fixedMark`), pump wear (dimmed splash) | existing classes |
| Community growth | Garden plots, a school handwashing station, a clinic tank, more people at the meeting tree | ghost pattern |

**Removed from the map:** treatment plant and stages, intake, district mains, WWTP, sewer, outfall, reuse line, industry, market awnings, load bar. These stay in the legacy file.

### 8.3 Motion

All animation (walkers, flow, building, rain) respects `prefers-reduced-motion` and the in-game setting, as `map.css` does today. Static dashes and arrowheads keep direction readable.

---

## 9. User interface changes

### 9.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◆ Waterworks · Kesi Hill   Level 2 · Investigate   Sand 6 Stone 4 Timber 3  ☼☼☼○ │  ← top bar (daylight dots)
├──────────────┬──────────────────────────────────────────────┬──────────────────┤
│ Objectives   │                                              │ Inspector        │
│ ✓ Meet reps  │          ILLUSTRATED VILLAGE MAP             │ (place / person  │
│ ○ 2 germ     │    (route, sources, nodes, build ghosts)     │  / build stage)  │
│   tests      │                                              │                  │
│ Actions (≤6) │                                              │                  │
├──────────────┴──────────────────────────────────────────────┴──────────────────┤
│ People served 0/240 · Round trip 70 min · Water 9 L/person · Safe at home —   [End day ▸] │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Top bar:** village name, level title, materials, daylight dots, maintenance fund (from L4), Help, About, Settings. Funding, energy, knowledge, time controls and Water Security are removed.
- **Left panel** (replaces the planning rail): objective checklist plus a contextual Actions list (3–6 items, level-gated).
- **Right inspector:** kept. Panels for a source, the water point, a building, a person, a resource node or a build stage.
- **Bottom strip** (replaces the dashboard): 4 indicators and **End day**.

### 9.2 Visible indicators (4 only)

| Indicator | Meaning | Appears |
| --- | --- | --- |
| **People served** | Residents with a safe, working water point within the round-trip target | Always (0 until L3) |
| **Round trip** | Minutes to collect water, including queueing | Always |
| **Water per person** | Litres per person per day; jerry cans shown as icons | Always |
| **Safe at home** | Share of households whose stored water tests Safe | From L4 |
| *System health* (in the inspector) | Good / Watch / Needs repair | From L3 |

### 9.3 New or changed dialogs

Name your village (start) · Scenario introduction · Conversation (character portrait, 1–3 lines, an optional choice) · Lab · Technology choice (cards with ✓/✗ factors) · Build stage · Allocation drawer (jerry cans) · Committee decision (one choice) · Challenge (reuses the event dialog) · Level complete · Project report.

### 9.4 Visual language

- Increase the existing `--yellow-500` for primary actions, jerry cans, completed objectives and celebrations. Water blue stays reserved for water. Status colours stay paired with icons.
- Characters are simple illustrated portrait chips (a coloured circle with an initial, as today's `.avatar`, upgraded to simple SVG busts). They're friendly and never shown as distressed.
- Level-complete cards use the environment art with a yellow rule and one sentence about what changed for people.

### 9.5 Accessibility (carried over, no regressions)

Every map object stays keyboard-focusable with an `aria-label` that includes its state. Live-region announcements for results. Status never shown by colour alone. Dialog focus return. Reduced motion. Minimum target size 24 px. The layout stacks below 900 px.

### 9.6 Project report (the ending)

The same template whatever the outcome: village and scenario, technology chosen and why (the ✓ factors), the partner team and committee roles, people served, **round trip before → after**, **hours returned per day and per year**, safe-at-home %, days of reliable service, repair response time, community project completed, and a "What real projects also involve" note (sanitation, government coordination, long-term monitoring) so the game doesn't oversimplify. It's printable (`@media print`) and ends with **Learn more about community water projects** (the optional charity: water link) plus the disclaimer.

---

## 10. Implementation phases and acceptance tests

### Smallest viable technical implementation

- **New files** (beside the old ones):
  - `js/village-data.js`: scenarios, registry, levels, characters, copy
  - `js/village-sim.js`: `generateVillage`, `suitability`, `compute`, `endDay`, `runTest`, maintenance
  - `js/village-map.js`
  - `js/village-views.js`
  - `js/village-app.js`
  - `css/village.css`
  - `tests/village.test.mjs`
- **Shared** (small extraction, Phase 1): `js/core.js` with `rng`, `clamp`, `r1`, `esc`, toasts, `announce`, `openDlg`, tooltip and save helpers. Copy rather than refactor if extraction risks breaking the legacy prototype.
- **Legacy preserved:** the current `index.html` is copied to `municipal.html`, unchanged and still loading the old scripts. The new `index.html` loads the village scripts.
- **Tests:** `node --test tests/` with a two-line `globalThis.window = globalThis` shim. No packages. Plus scripted UI checks through `WW.debug` (as today).
- **Persistence:** save key `waterworks-village-v1`. The whole `state` object is serialised; nothing is cherry-picked.

### Phase 0: Baseline and safety (≈ 0.5 h)

- Commit the current untracked prototype as the baseline on `main` (with your approval), then branch `feature/village-redesign`.
- Copy `index.html` → `municipal.html`. Add the empty test harness.
- **Accept:** `municipal.html` behaves exactly as today. `node --test` runs (0 tests, exit 0). All 5 PNGs present and byte-identical.

### Phase 1: Model and data, no UI (≈ 3–4 h)

- Registry (all 8 entries, 3 playable), 3 scenario archetypes, `generateVillage`, `suitability`, `compute`, `endDay`, lab results, allocation (reused normaliser), maintenance and challenge.
- **Accept (automated):**
  1. The same name and salt always produce an identical village (deep-equal).
  2. For 1,000 seeds × 3 scenarios, the recommended set has 1–2 entries and contains the archetype's primary technology.
  3. Every scenario marks at least 4 technologies *not suitable*, each with a non-empty reason.
  4. In every scenario at least one existing source has `clarity` Safe while `germ` is Risky or Unsafe.
  5. Served jerry cans never exceed capacity; the clinic minimum holds unless an override is set.
  6. After activation, round trip < baseline and `hoursReclaimed > 0`.
  7. Without safe storage, home germ result ≥ water-point result; with full adoption they are equal.
  8. Condition falls without checklists, falls more slowly with them, and repair restores ≥ 0.9.
  9. Every numeric coefficient in `village-data.js` has a provenance tag (checked by a lint-style test on the source text).
  10. A save/load round trip of the state is lossless.

### Phase 2: Shell, start flow and map (≈ 4–5 h)

- Name-your-village start screen, scenario backdrop and intro card, the parametric village map for 3 scenarios, HUD, objectives panel, actions panel, End day, daylight, resource nodes, walking-route animation, save/Continue.
- **Accept:**
  - Each scenario's map renders with no console errors.
  - Every interactive map object is reachable by Tab and opens its inspector with Enter.
  - Gathering a node adds its material and depletes the node until End day.
  - Reloading and pressing Continue restores the level, materials, map state and day.
  - Reduced motion stops all walking and flow animation.

### Phase 3: Levels 1–2 playable (≈ 4 h)

- Conversations, follow-the-route, lab bench build, lab dialog (Look / Clarity / Germ-next-day / salt), the Source column, site surveys, Site card, community meeting.
- **Accept:**
  - Starting fresh, Level 1 can be completed only by meeting 3 people, walking the route and building the bench.
  - A germ test started on day N shows "Results tomorrow" and resolves on day N+1.
  - The clear-but-unsafe source is reachable in every scenario.
  - Technology cards show "Needs survey" until their fields are surveyed.

### Phase 4: Level 3 Build (≈ 5 h)

- Technology choice screen, materials checklist with partner-provided items, 4 stages × 3 technologies with ghost animation and help actions, quality check, activation celebration, route shortening.
- **Accept:**
  - Unsuitable technologies cannot be selected and show their reasons.
  - Each stage can be completed and progresses visibly `preview → building → built`.
  - Activation changes the round trip and the people served on the same frame as the celebration.
  - The new water point's germ test is Safe.

### Phase 5: Levels 4–5 and report (≈ 5 h)

- Committee, allocation drawer (jerry cans), schedule toggle, home sample and safe-storage actions, contribution choice, expansion with capacity check, caretaker checklist, logbook, the 3 challenges with 3-option diagnosis, community objective, project report and link.
- **Accept:**
  - Allocating more than capacity raises queue time on screen.
  - Choosing the expansion shows the capacity preview before confirming.
  - The scenario's challenge always occurs once in Level 5 and can be resolved.
  - A wrong diagnosis gives helpful feedback and costs one day; it never fails the game.
  - The report shows before/after round trip and hours reclaimed that match the state.
  - The charity: water link opens in a new tab and the disclaimer is present.

### Phase 6: Polish, content review and playtest (≈ 4 h)

- Copy pass against the tone rules (§7.1), yellow accent pass, audio cue hooks (`AUDIO_DIRECTION.md`), print styles, responsive checks at 1440 / 1280 / 1024 / 768, README rewrite, superseded notes on `docs/build/*`.
- **Accept:**
  - Three fresh playtesters (one per scenario) each finish in **30–60 minutes** without outside help.
  - Each can explain afterwards (a) why clear water can be unsafe, (b) why their technology fit their village, and (c) why maintenance matters.
  - No text contains guilt framing (checked against a reviewed word list, plus a human read-through).
  - Lighthouse accessibility ≥ 95.

**Total estimate:** about 26–30 focused hours. Phases 1–4 give you an end-to-end playable game (through activation) that you could demo on its own if time runs short.

---

## 11. Decisions needed before implementation

1. **Baseline commit:** may I commit the current untracked prototype to `main` before branching? Nothing is lost either way, but it's the safest starting point.
2. **Legacy prototype:** keep it reachable as `municipal.html` (recommended), or archive it under `legacy/`?
3. **Scenario selection:** fully random (as briefed), or random with a hidden teacher option to pick a scenario?
4. **Charity: water naming:** "inspired by" with a disclaimer and no logo (recommended), or seek permission first?
5. **Art:** use the existing five backdrops as fictional regions now (recommended) and plan additional, more geographically representative backdrops later?
6. **Character names:** a neutral, configurable name pool reviewed later (recommended), or do you have names in mind?
7. **Second technology in a scenario:** show BioSand (wetland) and protected spring (highland) as small Level 4 add-ons, or only as informational cards in v1? The recommendation is informational cards in v1 to keep scope tight.
