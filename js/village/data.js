/* =============================================================================
   WATERWORKS VILLAGE — DATA
   -----------------------------------------------------------------------------
   Everything the village game "knows": scenarios, painted scenes (crop,
   hotspots, routes), the technology registry, levels, characters and copy.

   Coordinates are PERCENT OF THE FULL PAINTING (0–100 on each axis), so a
   scene can be re-cropped or its painting swapped by editing numbers only.

   Provenance tags, as in the municipal prototype:
     [game] invented gameplay value (fictional, tunable)
     [ref]  real-world convention or benchmark (cited in About)
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});

  WV.data = {
    saveVersion: 1,
    disclaimer: 'Waterworks is an independent educational prototype inspired by charity: water. It is not an official charity: water product.',
    gameplayNote: 'Populations, distances, times and amounts are simplified, fictional gameplay values.',
    learnUrl: 'https://www.charitywater.org/',
    jerryCanLitres: 20, // [ref] the common yellow jerry can holds about 20 litres
    music: { src: 'assets/audio/waterworks-ambient.mp3', defaultVolume: 0.25 },
    startArt: 'assets/environments/env-02-aspen-river.png',

    /* Fictional, multilingual pool. Roles come first; names are replaceable. */
    namePool: ['Amani', 'Nia', 'Tomas', 'Lina', 'Kofi', 'Mei', 'Ravi', 'Sami', 'Ayo', 'Esi', 'Daniel', 'Rosa',
      'Noor', 'Leo', 'Mara', 'Teo', 'Zara', 'Imani', 'Jonah', 'Ana', 'Kito', 'Sela', 'Omar', 'Ines'],
    villageNameParts: {
      start: ['Kesi', 'Tolu', 'Sefa', 'Lumo', 'Ruri', 'Nala', 'Beno', 'Kavi', 'Oria', 'Teka', 'Amo', 'Vela'],
      end: [' Hill', ' Springs', ' Rock', ' Crossing', ' Meadow', ' Ridge', ' Bend', ' Fields'],
    },

    roles: [
      { id: 'chair', title: 'Water committee chair', hope: 'More time for the terraces and the school garden',
        line: 'Welcome. The committee has wanted a safe water point close to home for years. We know which families walk farthest, so we will decide together where things go.' },
      { id: 'treasurer', title: 'Committee treasurer', hope: 'A shop that opens before noon, not after the water run',
        line: 'Whatever we build, we will keep a small repair fund. Nobody should wait months for a spare part.' },
      { id: 'caretaker', title: 'Caretaker in training', hope: 'Training as a certified mechanic',
        line: 'I fix bicycles and radios. If {village} gets a water system, I want to be the one who keeps it running.' },
      { id: 'officer', title: 'Field officer, local partner team', hope: 'A project the village runs on its own',
        line: 'I grew up two valleys over. Our team supports the committee: surveys, engineering, training. The decisions are theirs.' },
    ],
    committeeRoles: ['chair', 'treasurer', 'caretaker'],

    /* ---- Scenarios ----------------------------------------------------------- */
    scenarios: {
      highland: {
        id: 'highland', name: 'Highland Springs', scene: 'highland', primaryTech: 'gravityFed',
        population: [160, 300],      // [game]
        roundTripMin: [50, 80],      // [game]
        tripsPerDay: 2, cansPerTrip: 2, // [game] per household
        landscape: 'It sits on a meadow above a quiet alpine lake, below a forested ridge. Families carry water up from the rocky stream below the lake.',
      },
      plateau: {
        id: 'plateau', name: 'Red Rock Plateau', scene: 'plateau', primaryTech: 'drilledWell',
        population: [220, 380], roundTripMin: [70, 110], tripsPerDay: 2, cansPerTrip: 2,
        landscape: 'Its adobe homes sit on a dry bench above a red-rock canyon. Families walk down to a seep pool below the cliffs, where the water slows to a trickle in the dry months.',
      },
      wetland: {
        id: 'wetland', name: 'Wetland Crossroads', scene: 'wetland', primaryTech: 'rainwater',
        population: [120, 220], roundTripMin: [25, 45], tripsPerDay: 3, cansPerTrip: 2,
        landscape: 'It sits at the edge of a broad wetland where rain falls most of the year. Water is everywhere. Water that is safe to drink is harder to find.',
      },
    },

    /* ---- Painted scenes --------------------------------------------------------
       crop: visible part of the painting (percent). Leaves out the dam and solar
       station (env-05) and the town wastewater plant (env-04).
       uiScale: size of overlay art relative to the painting.
       walkerScale: [at the village end of the route, at the source end].       */
    scenes: {
      highland: {
        image: 'assets/environments/env-01-alpine-headwaters.png', w: 1672, h: 941,
        crop: { x: 0, y: 0, w: 100, h: 100 }, focus: { x: 20, y: 66 },
        structureScale: 1.5, walkerScale: [1.25, 1.55],
        cottages: [[6.5, 60.5, 1.25], [11.5, 62.8, 1.15], [18.5, 61.4, 1.08], [8.4, 67.6, 1.35], [14.8, 69.4, 1.3], [21.2, 66.8, 1.2]],
        route: [[14.5, 68], [16, 74], [19, 81], [28, 86], [42, 87.5], [55, 85.5], [64, 83.5], [71, 83]],
        hotspots: [
          { id: 'committee', kind: 'committee', x: 13.6, y: 65.2, label: 'Meeting tree' },
          { id: 'homes', kind: 'place', x: 20.2, y: 58.6, label: 'Homes' },
          { id: 'source', kind: 'source', x: 72, y: 83, label: 'Lower stream' },
          { id: 'spring', kind: 'place', x: 10.6, y: 51, label: 'Hillside spring' },
          { id: 'lake', kind: 'place', x: 47, y: 57, label: 'The lake' },
          { id: 'lab', kind: 'site', x: 35, y: 63.5, label: 'Station site' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 24, y: 75, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 86.5, y: 69, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 36, y: 81, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 58, y: 90, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Meeting tree', text: 'The committee meets in the shade here after the morning chores.' },
          homes: { title: 'Homes', text: '{households} households live in {village}. Most keep two yellow jerry cans by the door, 20 litres each when full.' },
          spring: { title: 'Hillside spring', text: 'Water seeps from the slope above the village and runs down into the lake. It is hard to reach through the brush, so nobody collects from it yet.', note: 'The partner team wants to survey this spring.' },
          lake: { title: 'The lake', text: 'Wide, calm and beautiful. Cattle and wildlife drink along its edges.', note: 'Clear-looking water can still carry germs. Only a test can tell.' },
          source: { title: 'Lower stream', text: 'The nearest flowing water is the rocky stream below the lake. The path crosses boulders and loose stones.', looks: 'Clear and cold' },
          lab: { title: 'Station site', text: 'A flat, dry spot the committee suggested for a small field-testing station.' },
        },
      },
      plateau: {
        image: 'assets/environments/env-05-redrock-resilience.png', w: 1672, h: 941,
        crop: { x: 0, y: 14, w: 68, h: 72 }, focus: { x: 24, y: 42 },
        structureScale: 0.9, walkerScale: [0.7, 0.95],
        cottages: [],
        route: [[29.5, 36.8], [27, 40.5], [23.5, 44], [20, 47.5], [16.5, 51], [13, 53.6]],
        hotspots: [
          { id: 'committee', kind: 'committee', x: 31, y: 34.6, label: 'Village square' },
          { id: 'homes', kind: 'place', x: 22.6, y: 32.4, label: 'Homes' },
          { id: 'source', kind: 'source', x: 12, y: 54, label: 'Seep pool' },
          { id: 'river', kind: 'place', x: 54, y: 56.5, label: 'Canyon river' },
          { id: 'gardens', kind: 'place', x: 28.5, y: 48.5, label: 'Terrace gardens' },
          { id: 'lab', kind: 'site', x: 41, y: 34.5, label: 'Station site' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 8, y: 66, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 41, y: 62, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 26.6, y: 60, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 47, y: 79, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Village square', text: 'The committee gathers in the shade of the old adobe wall.' },
          homes: { title: 'Homes', text: '{households} households live in {village}. Thick adobe walls keep the houses cool, and two yellow jerry cans wait by most doors.' },
          river: { title: 'Canyon river', text: 'The river runs far below the village. The path down is steep, and the water turns brown after storms upstream.' },
          gardens: { title: 'Terrace gardens', text: 'Families grow squash, beans and herbs on stone terraces, watered by hand.', note: 'More water close to home could mean bigger gardens.' },
          source: { title: 'Seep pool', text: 'Below the cliffs, water trickles out of the rock into a shallow pool. In the dry months it slows to a drip and the queue grows.', looks: 'Clear once it settles' },
          lab: { title: 'Station site', text: 'A flat patch beside the fields that the committee suggested for a small field-testing station.' },
        },
      },
      wetland: {
        image: 'assets/environments/env-04-wetland-crossroads.png', w: 1672, h: 941,
        crop: { x: 0, y: 14, w: 66, h: 72 }, focus: { x: 22, y: 44 },
        structureScale: 0.78, walkerScale: [0.62, 0.82],
        cottages: [[23.4, 37.6, 0.42], [27, 36.8, 0.4], [25.6, 40.4, 0.45]],
        route: [[18.5, 38.6], [20.6, 42.4], [23, 46.2], [25.8, 50.2], [28.6, 54.4]],
        hotspots: [
          { id: 'committee', kind: 'committee', x: 17, y: 38, label: 'Farmyard' },
          { id: 'barn', kind: 'place', x: 13.4, y: 31.4, label: 'Barn roof' },
          { id: 'homes', kind: 'place', x: 26.4, y: 34.4, label: 'Homes' },
          { id: 'source', kind: 'source', x: 29, y: 55, label: 'Reed channel' },
          { id: 'ponds', kind: 'place', x: 40, y: 71, label: 'Wetland ponds' },
          { id: 'lab', kind: 'site', x: 11, y: 39.5, label: 'Station site' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 46, y: 53, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 6, y: 60, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 33, y: 47.4, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 23, y: 79, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Farmyard', text: 'The committee meets by the farmyard fence, where everyone passes.' },
          barn: { title: 'Barn roof', text: 'The biggest roof in the village. In a storm, water sheets off its edges.', note: 'Rain falls here for most of the year.' },
          homes: { title: 'Homes', text: '{households} households live in {village}, on the dry ground above the wetland. Two yellow jerry cans wait by most doors.' },
          ponds: { title: 'Wetland ponds', text: 'Ducks, herons and reeds. The wetland is full of life and full of water.', note: 'But is any of it safe to drink?' },
          source: { title: 'Reed channel', text: 'Families scoop water from a channel among the reeds. It is close to home, but livestock graze along the banks and floods wash through.', looks: 'Slightly cloudy' },
          lab: { title: 'Station site', text: 'A dry corner by the fields that the committee suggested for a small field-testing station.' },
        },
      },
    },

    resources: {
      wood: { name: 'Wood', verb: 'Gather wood', from: 'fallen branches and offcuts' },
      stone: { name: 'Stone', verb: 'Gather stone', from: 'loose stones' },
    },

    /* ---- Designated construction sites ---------------------------------------- */
    builds: {
      lab: {
        name: 'Field-testing station', art: 'station',
        cost: { wood: 4, stone: 3 }, // [game]
        requires: (s) => !!s.flags.committeeMet,
        requiresText: 'Meet the water committee first. They choose the site.',
        builder: 'caretaker',
        buildMs: 2600, // construction animation, not a wait
        text: 'A shaded bench where the partner team can test water samples. The caretaker and two neighbours build it.',
      },
    },

    /* ---- Technology registry -----------------------------------------------------
       Phase 1 shows none of this; Phases 2–3 use it. All numbers are [game].     */
    technologies: {
      gravityFed: { name: 'Gravity-fed system', playable: true, short: 'Pipes water downhill from a protected spring to taps in the village. No pump needed.',
        suits: 'A reliable spring or stream higher than the village', cost: { wood: 8, stone: 14 }, partnerProvides: ['pipe', 'cement', 'tap fittings'],
        capacityCans: 420, quality: 'Safe if the spring is protected and the pipes stay sealed.', maintenance: 'Clear the intake, check the pipeline, fix leaks.', structure: 'tank', challenge: 'pipeBreak', upgrade: 'secondTapstand' },
      drilledWell: { name: 'Drilled well with hand pump', playable: true, short: 'A rig drills down to deep groundwater. A sealed hand pump lifts it to the surface.',
        suits: 'Reliable groundwater, a track a drilling rig can reach', cost: { wood: 6, stone: 16 }, partnerProvides: ['drilling rig', 'pump', 'casing', 'cement'],
        capacityCans: 360, quality: 'Deep groundwater is usually well protected; the concrete apron keeps surface water out.', maintenance: 'Replace pump seals, keep the apron and drain clean.', structure: 'pump', challenge: 'pumpSeals', upgrade: 'cattleTrough' },
      rainwater: { name: 'Rainwater catchment', playable: true, short: 'Gutters collect rain from large roofs into a covered storage tank.',
        suits: 'Plenty of rain, large sturdy roofs', cost: { wood: 10, stone: 12 }, partnerProvides: ['gutters', 'cement', 'mesh', 'tap'],
        capacityCans: 120, quality: 'Clean if roofs and gutters are kept clean and the first, dirty flush is discarded.', maintenance: 'Clean gutters, check the first-flush diverter, patch cracks.', structure: 'raintank', challenge: 'drySpell', upgrade: 'extraTank' },
      protectedSpring: { name: 'Protected spring', playable: false, short: 'A spring box seals the spring eye so collection is clean.', suits: 'A spring close to the village' },
      handDugWell: { name: 'Hand-dug well', playable: false, short: 'A lined well dug by hand to shallow groundwater.', suits: 'Shallow groundwater in soft ground' },
      solarPiped: { name: 'Solar-powered piped system', playable: false, short: 'A solar pump lifts water to a tank that feeds several taps.', suits: 'A high-yield source, strong sun, a larger community' },
      bioSand: { name: 'BioSand household filter', playable: false, short: 'A household sand filter that reduces germs and cloudiness. It treats water but does not create more.', suits: 'Households that must use surface water' },
      rehabilitation: { name: 'Rehabilitation', playable: false, short: 'Repairs a broken existing water point instead of building a new one.', suits: 'Villages with an existing system that has failed' },
    },

    /* ---- Levels -----------------------------------------------------------------
       Each objective's text names exactly what its check() tests.               */
    levels: [
      { id: 1, title: 'Meet the Village', next: 'Investigate the Water',
        objectives: [
          { id: 'name', text: () => 'Name your village', check: (s) => !!s.name },
          { id: 'explore', text: (s) => `Explore: look at 3 places on the map (${Math.min(3, s.inspected.length)}/3)`, check: (s) => s.inspected.length >= 3 },
          { id: 'committee', text: () => 'Meet the village water committee', check: (s) => !!s.flags.committeeMet },
          { id: 'source', text: () => 'Visit today’s water collection point', check: (s) => s.inspected.indexOf('source') >= 0 },
          { id: 'walk', text: () => 'Watch how families collect water today', check: (s) => !!s.flags.walkWatched },
          { id: 'gather', text: (s) => `Gather 6 wood and 4 stone (wood ${Math.min(6, s.gathered.wood)}/6 · stone ${Math.min(4, s.gathered.stone)}/4)`, check: (s) => s.gathered.wood >= 6 && s.gathered.stone >= 4 },
          { id: 'lab', text: () => 'Build the field-testing station (4 wood, 3 stone; needs the committee’s go-ahead)', check: (s) => s.builds.lab === 'built' },
        ] },
      { id: 2, title: 'Investigate the Water', next: 'Build the Solution', comingSoon: true, objectives: [] },
      { id: 3, title: 'Build the Solution', next: 'Manage the Water', comingSoon: true, objectives: [] },
      { id: 4, title: 'Manage the Water', next: 'Keep It Flowing', comingSoon: true, objectives: [] },
      { id: 5, title: 'Keep It Flowing', next: null, comingSoon: true, objectives: [] },
    ],

    /* Tips from the field officer, keyed by the next unfinished objective. */
    tips: {
      explore: 'Tap the glowing markers to look around. Every place tells you something about water here.',
      committee: 'The water committee is waiting at the {committeePlace}. They lead this project, so let’s meet them.',
      source: 'Let’s see where families collect water today: the {sourcePlace}.',
      walk: 'At the {sourcePlace}, choose “Watch the morning walk”.',
      gather: 'We’ll need wood and stone for a small field-testing station. Tap the wood and stone markers.',
      lab: 'The committee has chosen a site for the station. Tap the staked site to build it.',
      done: 'Nicely done. The station is ready for water testing.',
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
