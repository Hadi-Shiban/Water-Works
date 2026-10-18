# Claude VS Code Master Prompt - Make Waterworks Playable Today

You are working inside the existing Waterworks project in VS Code. Build the next playable version today by following the phases below in order. Work autonomously through the phases unless you encounter a genuine blocker that could damage existing work or requires a product decision not covered here.

## Non-negotiable context

Read these files completely before editing:

- `../reference/Waterworks_Game_Framework_v1.md`
- `../reference/Waterworks_Simulation_Model_v1.xlsx`
- `Claude_VSCode_Waterworks_Wireframe_Prompt.md`
- `../reference/Water Game Concept.pdf`, if present
- `ENVIRONMENT_MANIFEST.md`
- `AUDIO_DIRECTION.md`

The framework and spreadsheet remain authoritative for simulation relationships and scoring. Do not rewrite the approved game concept. This task changes pacing, onboarding, environments, feedback, and audio architecture while keeping the existing water-system design intact.

The scientific hierarchy remains:

- WHO catchment-to-consumer relationships are the primary scientific foundation.
- Numerical costs, capacities, timing, event modifiers, and removal coefficients are game-balance assumptions.
- The game is educational, not engineering or drinking-water safety guidance.

## Product goal for today

Produce a polished, playable first chapter that a new player can understand without reading the framework.

The player should be able to:

1. Start the game.
2. Choose whether to follow or skip the tutorial.
3. Learn where water comes from.
4. Test and treat water.
5. Allocate water to a few community needs.
6. Repair one visible leak.
7. Run four calm days.
8. See water, scores, the landscape, and one resident routine respond.
9. Complete the Alpine Headwaters chapter.
10. Unlock a preview of Aspen River Bend.

This first playable chapter matters more than implementing every later system today.

## Preserve current work

Before editing:

1. Run `git status` and inspect the repository structure.
2. Identify the current stack, package manager, start command, tests, and existing game files.
3. Do not delete or overwrite framework files, the workbook, assignment PDF, or unrelated user work.
4. If this is a Git repository, create or switch to a local branch named `feature/guided-environments-audio` unless the user is already on a purposeful feature branch with uncommitted work. Never reset, discard, or stash user changes without permission.
5. Use the existing framework and dependencies. Add a package only if the existing stack cannot reasonably implement a requirement.
6. Do not push or deploy unless explicitly instructed.

Report the repository findings and intended file changes, then continue.

## Visual direction

The game should feel like a quiet national-park strategy experience with real systems underneath it.

Use:

- the supplied original environment art;
- strong editorial typography;
- warm white, charcoal, restrained yellow, and selective water blue;
- square or lightly rounded edges, generally 0-6px radius;
- clear visual hierarchy with fewer floating cards;
- thin rules, map labels, and understated topographic texture;
- subtle depth and environmental motion;
- water routes, markers, and animations that explain the simulation;
- joy and calm rather than clinical severity.

Avoid:

- glassmorphism;
- large pill-shaped controls;
- excessive gradients;
- bubbly cards;
- generic AI-dashboard styling;
- alarm-heavy interfaces;
- sad imagery or guilt-based mechanics;
- copying protected charity: water assets;
- putting text directly into the environment images.

## Environment assets

Use the supplied images under `assets/environments/`:

- `env-01-alpine-headwaters.png`
- `env-02-aspen-river.png`
- `env-03-meadow-reservoir.png`
- `env-04-wetland-crossroads.png`
- `env-05-redrock-resilience.png`

If the assets are outside the application directory, copy them into the project's public/static asset location without modifying the originals. Preserve these filenames.

Treat the images as illustrated world backdrops. Add semantic SVG or HTML overlays for selectable sources, buildings, pipes, treatment assets, and water routes. Do not make the background image itself the only interaction surface.

## New progression

### Chapter 1 - Alpine Headwaters: Days 1-4

Environment: autumn alpine lake inspired by the Wasatch Mountains and the feeling of Bloods Lake near Park City, Utah.

Player-facing concepts:

- Water Available
- Water Safe
- People Served
- source -> treatment -> storage -> homes
- basic water test
- one filter/disinfection choice
- simple allocation
- one pipe leak

Keep advanced values hidden behind `Learn more`:

- nutrient load;
- organic load;
- chemical contaminants;
- minerals and salinity;
- alkalinity;
- advanced treatment;
- wastewater construction;
- industry;
- drought;
- maintenance failure probability;
- full Impact Score.

The player should feel curious and capable, not responsible for an entire utility on the first screen.

### Chapter 2 - Aspen River Bend: Days 5-8

Unlock:

- homes, clinic, school, farm allocations;
- distribution loss;
- leak detection;
- Reliability;
- contextual resident schedules;
- one gentle rainfall event.

### Chapter 3 - Meadow Reservoir: Days 9-12

Unlock:

- storage reserves;
- plant capacity and condition;
- turbidity;
- filtration and disinfection as different processes;
- treatment train view;
- five Water Security component scores.

### Chapter 4 - Wetland Crossroads: Days 13-16

Unlock:

- farms and nutrient runoff;
- source protection;
- wetlands;
- wastewater generation and treatment;
- reclaimed water for eligible non-potable uses.

### Chapter 5 - Canyon of Resilience: Day 17 and beyond

Unlock:

- drought;
- source diversity;
- preventive maintenance;
- energy constraints;
- reserve days;
- full Resilience and Water Security gates.

Later chapters can remain previewable or lightly mocked today. Chapter 1 must be complete and enjoyable.

# Phase 1 - Establish the playable shell

Create or refine these top-level states:

- Start screen
- Environment / chapter selection
- Playing
- Tutorial paused
- Daily review
- Chapter complete
- Settings / audio
- Guidebook

Use a small explicit state machine or reducer. Do not spread game-phase booleans across unrelated components.

The Start screen should show the Alpine Headwaters image and contain:

- `Start Journey`
- `Continue`, only when saved progress exists
- `Explore environments`
- `Settings`
- a quiet statement: `Follow water from the mountains to the community - and back again.`

Clicking Start Journey counts as the user gesture that unlocks browser audio.

# Phase 2 - Build the tutorial system

Build a reusable, data-driven tutorial instead of hard-coding a chain of modal windows.

Recommended tutorial-step fields:

```js
{
  id,
  day,
  target,
  placement,
  title,
  message,
  actionLabel,
  completionCondition,
  allowSkip,
  pauseSimulation,
  guidebookEntry
}
```

Tutorial behavior:

- Spotlight one control or map object at a time.
- Dim the rest of the interface without making it unreadable.
- Use one short title and no more than about 35 words per tutorial message.
- Pause the simulation during instruction.
- Show `Back`, `Next` when appropriate, and `Skip tutorial` on every step.
- Confirm skip with: `Skip the guided trail? You can reopen it from the Guidebook.`
- Save progress locally.
- Add `Restart tutorial` and `Show tips` controls to the Guidebook.
- Restore keyboard focus after every step.
- Ensure the tutorial works with keyboard navigation and screen readers.
- Do not trap the player if a target element is unavailable; fall back to a centered tip with a Continue button.
- Respect `prefers-reduced-motion`.

Tips must explain a cause-and-effect relationship, not merely name a button.

Good:

> Water must pass through treatment before the community can use it safely. Select the treatment plant to see what changes.

Weak:

> This is the treatment button.

# Phase 3 - Replace the intense Day 4 with a four-day guided opening

## Day 1 - Follow the water

Visible systems:

- lake/source;
- treatment plant;
- storage;
- one home district;
- Water Available;
- People Served.

Player actions:

1. Select the lake.
2. Follow the highlighted route to the treatment plant.
3. Release a safe preset amount of water.
4. Run the day.

There is no failure state. The daily summary says where the water traveled.

## Day 2 - Make water safe

Add:

- Water Safe indicator;
- simple source and tap comparison;
- visible `Cloudiness` and `Microbial safety` labels;
- optional expandable terms `Turbidity` and `Microbial risk`.

Player actions:

1. Test source water.
2. Activate basic filtration.
3. Activate disinfection.
4. Compare source water with tap water.
5. Run the day.

Teach that clear-looking water can still contain microbial risk and that filtration and disinfection solve different problems.

## Day 3 - Share the flow

Add:

- homes;
- school;
- clinic;
- three simple allocation controls;
- a visible leak.

The player allocates water and repairs the leak. Show the reclaimed water immediately. Do not introduce random events, debt, research, advanced construction, or full wastewater management.

Human feedback example:

> Repairing the leak recovered 11 water units. The school now has reliable service, returning time to Maya's afternoon schedule.

## Day 4 - Your first calm challenge

Day 4 is a short mastery check, not a crisis.

Give the player only three objectives:

1. Keep tap water safe.
2. Serve at least 80% of community demand.
3. Finish with at least 20 water units in storage.

Allow the player to:

- inspect the lake;
- run one test;
- adjust three allocations;
- repair the leak if it remains;
- run the day.

Do not trigger heavy rain, drought, equipment failure, chemical contamination, industry demand, wastewater overflow, debt, or multiple construction projects on Day 4.

When the objectives are met, show:

`ALPINE HEADWATERS COMPLETE`

Then show:

- water delivered;
- quality/safety result;
- people served;
- water saved by the repair;
- reclaimed community time;
- one optional science fact;
- `Continue to Aspen River Bend`;
- `Replay chapter`;
- `Explore freely`.

If an objective is missed, explain one fix and let the player replay Day 4 without replaying the entire tutorial.

# Phase 4 - Integrate the environments

Create an environment manifest in code with:

- environment ID;
- display name;
- image path;
- chapter number;
- unlock rule;
- visible concepts;
- music cue;
- ambience cue;
- color treatment;
- optional map-overlay coordinates.

Environment transitions should feel like turning a page in a field journal:

- 500-800 ms crossfade;
- brief environment title;
- one-sentence learning focus;
- no large loading spinner unless assets are genuinely loading.

Add very subtle background movement only:

- slow image scale from 1.00 to at most 1.025;
- soft water shimmer overlay;
- restrained drifting cloud or light layer;
- no constant camera panning;
- stop motion when reduced motion is preferred.

Preload only the next environment, not all five at full resolution on startup.

# Phase 5 - Add audio architecture

Create a durable audio system even if some media files are not present yet.

Required capabilities:

- separate `Music`, `Nature`, and `Interface` volume controls;
- master mute;
- browser-autoplay-safe initialization after Start Journey;
- looping background music;
- looping nature ambience;
- 3-5 second crossfades between environments;
- short UI cues for selection, success, warning, construction, test complete, and day complete;
- pause or lower audio when the tab is hidden;
- restore the saved volume settings;
- no console errors when an optional file is missing;
- do not repeatedly request a missing asset.

Suggested architecture:

- `AudioProvider` or `AudioManager`
- `audioManifest`
- one channel for music;
- one channel for nature ambience;
- one channel for UI effects;
- cue names used by game state, never raw filenames scattered across components.

Expected paths:

```text
assets/audio/music/alpine-headwaters-loop.ogg
assets/audio/music/aspen-river-loop.ogg
assets/audio/music/meadow-reservoir-loop.ogg
assets/audio/music/wetland-crossroads-loop.ogg
assets/audio/music/redrock-resilience-loop.ogg

assets/audio/nature/alpine-lake-wind-water.ogg
assets/audio/nature/aspen-river-birds.ogg
assets/audio/nature/reservoir-evening.ogg
assets/audio/nature/wetland-after-rain.ogg
assets/audio/nature/canyon-river-wind.ogg

assets/audio/ui/select.ogg
assets/audio/ui/success.ogg
assets/audio/ui/warning.ogg
assets/audio/ui/test-complete.ogg
assets/audio/ui/day-complete.ogg
```

If files are absent, the game remains playable and the settings panel labels the relevant channel `Audio files not added yet`. Do not include unlicensed music. Any downloaded audio must be CC0, public domain, or explicitly licensed for the project and recorded in `assets/audio/credits.json` with title, creator, source URL, license, and download date.

Do not autoplay before the user presses Start Journey.

# Phase 6 - Make feedback feel like a game

Each action needs three layers of response:

1. Immediate: button, pipe, marker, sound, or meter response.
2. System: a value changes with a short explanation.
3. Human: a school, clinic, household, farm, or resident routine changes.

Examples:

- A test sends a sample animation to the lab and reveals one result at a time.
- Filtration visibly reduces cloudy particles along the water route.
- Disinfection changes microbial safety without pretending to remove minerals.
- Allocation causes water to travel toward the selected building.
- Leak repair stops the spray, restores flow, and updates available delivery.
- Run Day moves sunlight subtly, then opens the daily review.

Keep warnings proportional. Day 1-4 warnings should be informative amber, not emergency red, unless the player intentionally chooses unsafe water.

# Phase 7 - Save, accessibility, and tests

Persist locally:

- current day;
- completed tutorial steps;
- tutorial skipped status;
- environment unlocks;
- basic game state;
- audio settings;
- reduced-motion preference if selected in the game.

Add `New Journey` with a confirmation dialog. It clears only Waterworks game state, not unrelated local storage.

Verify:

- keyboard-only play through Day 4;
- focus visibility;
- tutorial target fallbacks;
- screen-reader labels;
- reduced motion;
- audio disabled and audio files missing;
- refresh and Continue;
- 1440 x 900;
- 1280 x 800;
- 1024 x 768;
- no horizontal overflow;
- no console errors;
- no broken image paths;
- no inaccessible color-only status;
- production build succeeds.

## Definition of done for today

The task is complete when:

- a new player can finish Days 1-4 without prior instructions;
- tutorial guidance is skippable and restartable;
- Day 4 contains only the three calm objectives;
- Alpine Headwaters uses the supplied environment image;
- the player can inspect, test, treat, allocate, repair, and run a day;
- the environment visibly responds;
- at least one resident routine changes;
- Chapter Complete unlocks Aspen River Bend;
- audio channels and cue manifests exist and fail gracefully when media is absent;
- game progress persists locally;
- the README explains how to run and play the build;
- tests/build pass without console errors.

## Commit sequence

If the repository is suitable for commits, use small reversible commits after verification:

1. `feat: add guided game state and tutorial shell`
2. `feat: build alpine headwaters days one through four`
3. `feat: integrate progressive environment artwork`
4. `feat: add audio channels and cue manifest`
5. `test: verify tutorial accessibility and saved progress`

Do not push.

## Final report

When finished, report:

- files changed;
- what is fully playable;
- what remains mocked;
- tests and viewport checks performed;
- audio files still needed;
- exact command to start the game;
- the next smallest feature to build.

Do not respond with only a plan. Inspect the project, implement the phases, test the playable chapter, and then give the report.
