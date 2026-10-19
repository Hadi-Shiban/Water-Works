/* =============================================================================
   WATERWORKS VILLAGE — DATA
   -----------------------------------------------------------------------------
   Everything the village game "knows": scenarios, painted scenes (hotspots,
   walking routes), site facts, the technology registry, levels, characters
   and copy.

   Coordinates are PERCENT OF THE FULL PAINTING (0–100 on each axis), so art
   can be swapped by editing numbers only. Use index.html?dev=routes to see,
   drag and copy route waypoints over the painting.

   Provenance tags, as in the municipal prototype:
     [game] invented gameplay value (fictional, tunable)
     [ref]  real-world convention or benchmark (cited in About)
   ========================================================================== */
(function (root) {
  'use strict';
  const WV = (root.WV = root.WV || {});

  WV.data = {
    saveVersion: 1,
    disclaimer: 'Waterworks is an educational student project created in collaboration with charity: water.',
    gameplayNote: 'Populations, distances, times, rainfall, depths and amounts are simplified, fictional gameplay values.',
    learnUrl: 'https://www.charitywater.org/our-work',
    jerryCanLitres: 20, // [ref] the common yellow jerry can holds about 20 litres
    litresPerPersonGoal: 20, // [ref] a commonly used basic-access benchmark (WHO), used here as a game target
    music: { src: 'assets/audio/waterworks-ambient.mp3', defaultVolume: 0.25 },
    startArt: 'assets/images/village/highland-springs/bg-main.png',

    /* Fictional, multilingual pool. Roles come first; names are replaceable. */
    namePool: ['Amani', 'Nia', 'Tomas', 'Lina', 'Kofi', 'Mei', 'Ravi', 'Sami', 'Ayo', 'Esi', 'Daniel', 'Rosa',
      'Noor', 'Leo', 'Mara', 'Teo', 'Zara', 'Imani', 'Jonah', 'Ana', 'Kito', 'Sela', 'Omar', 'Ines'],
    villageNameParts: {
      start: ['Kesi', 'Tolu', 'Sefa', 'Lumo', 'Ruri', 'Nala', 'Beno', 'Kavi', 'Oria', 'Teka', 'Amo', 'Vela'],
      end: [' Hill', ' Springs', ' Rock', ' Crossing', ' Meadow', ' Ridge', ' Bend', ' Fields'],
    },

    /* Order matters: names are dealt in this order, so new roles go at the end. */
    roles: [
      { id: 'chair', title: 'Water committee chair', hope: 'More time for the terraces and the school garden',
        line: 'Welcome. The committee has wanted a safe water point close to home for years. We know which families walk farthest, so we will decide together where things go.' },
      { id: 'treasurer', title: 'Committee treasurer', hope: 'A shop that opens before noon, not after the water run',
        line: 'Whatever we build, we will keep a small repair fund. Nobody should wait months for a spare part.' },
      { id: 'caretaker', title: 'Caretaker in training', hope: 'Training as a certified mechanic',
        line: 'I fix bicycles and radios. If {village} gets a water system, I want to be the one who keeps it running.' },
      { id: 'officer', title: 'Field officer, local partner team', hope: 'A project the village runs on its own',
        line: 'I grew up two valleys over. Our team supports the committee: surveys, engineering, training. The decisions are theirs.' },
      { id: 'engineer', title: 'Water engineer, local partner team', hope: 'Systems that still work in twenty years',
        line: 'Every place has its own answer. We look at the land, the rain and the water underground before anyone picks a design.' },
    ],
    committeeRoles: ['chair', 'treasurer', 'caretaker'],

    /* ---- Scenarios ----------------------------------------------------------------
       site: ranges for the facts that surveys and tests reveal in Level 2 [game].  */
    scenarios: {
      highland: {
        id: 'highland', name: 'Highland Springs', scene: 'highland', primaryTech: 'gravityFed',
        population: [160, 300],      // [game]
        roundTripMin: [50, 80],      // [game]
        tripsPerDay: 2, cansPerTrip: 2, // [game] per household
        landscape: 'Its homes sit around a big shade tree in a green valley. Families climb the stone steps to an open spring pool high on the hillside.',
        site: { springAbove: true, springHeadM: [25, 60], springDistanceKm: [0.8, 1.4], springYearRound: true,
          groundwaterDepthM: [45, 80], groundwaterSalty: false, rigAccess: false, rainfallMm: [900, 1300], bigRoofsM2: [60, 110] },
      },
      plateau: {
        id: 'plateau', name: 'Red Rock Plateau', scene: 'plateau', primaryTech: 'drilledWell',
        population: [220, 380], roundTripMin: [70, 110], tripsPerDay: 2, cansPerTrip: 2,
        landscape: 'Its stone houses sit on a dry plateau above a red-rock canyon. Families carry water up from a river dock below the village, and the canyon spring dries up for months each year.',
        site: { springAbove: false, springHeadM: [0, 0], springDistanceKm: [1.4, 2.2], springYearRound: false,
          groundwaterDepthM: [50, 90], groundwaterSalty: false, rigAccess: true, rainfallMm: [200, 350], bigRoofsM2: [90, 160] },
      },
      wetland: {
        id: 'wetland', name: 'Wetland Crossroads', scene: 'wetland', primaryTech: 'rainwater',
        population: [120, 220], roundTripMin: [25, 45], tripsPerDay: 3, cansPerTrip: 2,
        landscape: 'It sits among ponds, reeds and boardwalks where rain falls most of the year. Water is everywhere. Water that is safe to drink is harder to find.',
        site: { springAbove: false, springHeadM: [0, 0], springDistanceKm: [3, 5], springYearRound: false,
          groundwaterDepthM: [4, 10], groundwaterSalty: true, rigAccess: true, rainfallMm: [1400, 1900], bigRoofsM2: [750, 1050] },
        // roofs × rain must cover ≥ 50% of 20 L/person/day even for the largest village with the least rain
      },
    },

    /* What each site fact is called on the Site card, and how it is shown. */
    facts: {
      springAbove: { label: 'Spring above the village', show: (v) => (v ? 'Yes' : 'No') },
      springHeadM: { label: 'Height of spring above homes', show: (v) => (v ? `about ${v} m` : '—') },
      springDistanceKm: { label: 'Distance to the spring', show: (v) => `about ${v} km` },
      springYearRound: { label: 'Spring flows all year', show: (v) => (v ? 'Yes' : 'No, dries up') },
      groundwaterDepthM: { label: 'Depth to groundwater', show: (v) => `about ${v} m` },
      groundwaterSalty: { label: 'Groundwater taste', show: (v) => (v ? 'Salty' : 'Fresh') },
      rigAccess: { label: 'Drilling rig can reach', show: (v) => (v ? 'Yes' : 'No') },
      rainfallMm: { label: 'Rainfall', show: (v) => `about ${v} mm a year` },
      bigRoofsM2: { label: 'Large, sturdy roofs', show: (v) => `about ${v} m²` },
    },

    /* ---- Painted scenes ---------------------------------------------------------------
       structureScale: size of overlay structures relative to the painting.
       walkerScale: [at the top of the painting, at the bottom] (gentle depth).
       routes: smooth paths through waypoints along the painted roads.
         speed px/s of painting · walkers count · spacing seconds between walkers
         mode 'outAndBack' (walk to the end, turn, walk back) · cans: carries jerry cans
         collectAfter replaces collect once builds[whenBuilt] is 'built'.          */
    scenes: {
      highland: {
        image: 'assets/images/village/highland-springs/bg-main.png', w: 1672, h: 941,
        crop: { x: 0, y: 0, w: 100, h: 100 }, focus: { x: 50, y: 45 },
        structureScale: 1.05, walkerScale: [1.0, 1.2],
        cottages: [],
        routes: {
          waterCollection: { label: 'Water collection: plaza to spring pool', speed: 34, walkers: 3, spacing: 7, mode: 'outAndBack', cans: true, lit: true,
            points: [[50, 49], [46, 47], [43, 45], [40, 43.5], [37.5, 42.5], [35, 41], [33, 38.5], [31, 35.5], [29, 32.5], [27, 29.8], [25.3, 27.6], [24.2, 25.2], [23.3, 22.6], [22, 20.2], [20, 18.4], [17.5, 17.6]] },
          waterCollectionAfter: { label: 'Water collection: plaza tapstand', whenFlag: 'systemActive', dwell: 2.5, speed: 30, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[49, 48.5], [52, 50], [55, 51.6], [58, 52.9]] },
          labApproach: { label: 'Samples to the field-testing station', fromLevel: 2, needsBuilt: 'lab', speed: 26, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false, jar: true, lit: false,
            points: [[57, 55], [62, 56.8], [67, 57.4], [72, 57.2], [77, 57], [81, 57.4]] },
          ambient: [
            { id: 'quarry', label: 'Plaza to quarry', speed: 30, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[56, 52], [61, 53.5], [66, 55], [71, 54.5], [75, 52], [77, 47], [77.5, 42], [78.5, 37.5], [80.5, 34]] },
            { id: 'lumber', label: 'Plaza to lumber yard', speed: 28, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[58, 56], [64, 57.5], [70, 57.5], [76, 57], [82, 57], [87, 56]] },
            { id: 'bridge', label: 'Plaza to south fields', speed: 26, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[55, 56], [59, 58.5], [62.5, 61.5], [58.5, 64.5], [54.5, 67.5], [51, 70], [47, 72.5], [42, 74.5]] },
          ],
        },
        hotspots: [
          { id: 'committee', kind: 'committee', x: 54, y: 45.5, label: 'Meeting tree' },
          { id: 'homes', kind: 'place', x: 51.5, y: 35.5, label: 'Homes' },
          { id: 'school', kind: 'place', x: 67, y: 46, label: 'School' },
          { id: 'gardens', kind: 'place', x: 47, y: 20, label: 'Terrace gardens' },
          { id: 'source', kind: 'source', x: 15, y: 12.5, label: 'Spring pool' },
          { id: 'river', kind: 'water', x: 74, y: 78, label: 'River' },
          { id: 'lab', kind: 'site', x: 84, y: 58.5, label: 'Station site' },
          { id: 'waterPoint', kind: 'site', minLevel: 3, needsTech: true, below: true, x: 58.6, y: 55.6, ground: [58.6, 53.2], label: 'Tapstand site' },
          { id: 'issue', kind: 'issue', minLevel: 5, x: 35, y: 41, label: 'Wet ground' },
          { id: 'survey1', kind: 'survey', minLevel: 2, maxLevel: 2, x: 8.5, y: 11.5, label: 'Spring source' },
          { id: 'survey2', kind: 'survey', minLevel: 2, maxLevel: 2, x: 28, y: 31, label: 'Hillside track' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 89, y: 51, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 14, y: 44, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 79, y: 29, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 88, y: 33, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Meeting tree', text: 'The committee meets on the benches under the big tree, where every path in the village crosses.' },
          homes: { title: 'Homes', text: '{households} households live in {village}. Most keep two yellow jerry cans by the door, 20 litres each when full.' },
          school: { title: 'School', text: 'Children come from every corner of the valley. Lessons start after the morning water run.' },
          gardens: { title: 'Terrace gardens', text: 'Stone terraces of cabbages and beans, watered by hand from the stream.', note: 'More water close to home could mean bigger harvests.' },
          source: { title: 'Spring pool', text: 'Water tumbles out of the hillside into an open pool. Families climb the stone steps to fill their jerry cans here.',
            looks: 'Clear and sparkling', note: 'Goats drink at the edge, and cans are dipped straight in.' },
          river: { title: 'River', text: 'A fast river below the village. Cattle cross it upstream.', looks: 'Slightly cloudy' },
          lab: { title: 'Station site', text: 'An empty fenced plot by the lumber yard, which the committee offered for a small field-testing station.' },
          issue: { title: 'Problem spot', text: 'The caretaker flagged this during the routine check.' },
          waterPoint: { title: 'Tapstand site', text: 'A level spot on the plaza, close to every home, where the pipe from the spring will end in a public tap.' },
          survey1: { title: 'Spring source', text: 'Where the spring first comes out of the rock, above the pool.' },
          survey2: { title: 'Hillside track', text: 'The steep track between the spring and the village.' },
        },
        samples: {
          source: { looks: 'Clear and sparkling', clarity: 'clear', germ: 'unsafe', salty: false,
            clue: 'Germs from animals and hands get into an open pool, even when the water looks perfect.' },
          river: { looks: 'Slightly cloudy', clarity: 'cloudy', germ: 'unsafe', salty: false, colonies: 18,
            clue: 'Cattle upstream and soil washing in after rain.' },
        },
        lab: { clear: 'source', dirty: 'river' },
        system: { art: 'tapstand', extras: [{ art: 'springbox', at: [16.4, 16.4], scale: 0.9 }],
          pipe: [[16.4, 16.6], [19, 18], [22, 20.2], [23.3, 22.6], [24.2, 25.2], [25.3, 27.6], [27, 29.8], [29, 32.5], [31, 35.5], [33, 38.5], [35, 41], [37.5, 42.5], [40, 43.5], [43, 45], [46, 47], [50, 49], [54, 51], [58.2, 52.6]] },
        animals: [
          { kind: 'sheep', x: 22.5, y: 80.2, s: 1.15, anim: 'graze' }, { kind: 'sheep', x: 25.6, y: 82, s: 1.05, anim: 'graze', flip: true, delay: 2.2 },
          { kind: 'sheep', x: 19.6, y: 83.6, s: 1.1, anim: 'rest' },
          { kind: 'chicken', x: 62.4, y: 54.1, s: 1, anim: 'peck' }, { kind: 'chicken', x: 63.8, y: 54.9, s: 0.95, anim: 'peck', flip: true, delay: 1.3 },
          { kind: 'bird', x: 62, y: 7, s: 1, anim: 'fly', range: 300 },
        ],
        surveys: {
          survey1: { title: 'Survey the spring', reveals: ['springAbove', 'springHeadM', 'springYearRound', 'springDistanceKm'],
            done: 'The spring sits well above the village and the committee says it has never run dry.' },
          survey2: { title: 'Walk the hillside', reveals: ['rigAccess', 'groundwaterDepthM', 'groundwaterSalty', 'rainfallMm', 'bigRoofsM2'],
            done: 'Steep, rocky tracks, deep hard rock, and small roofs.' },
        },
      },

      plateau: {
        image: 'assets/images/village/red-rock-plateau/bg-main.png', w: 1672, h: 941,
        crop: { x: 0, y: 0, w: 100, h: 100 }, focus: { x: 50, y: 50 },
        structureScale: 0.95, walkerScale: [0.95, 1.15],
        cottages: [],
        routes: {
          waterCollection: { label: 'Water collection: square to river dock', speed: 30, walkers: 3, spacing: 6, mode: 'outAndBack', cans: true, lit: true,
            points: [[54, 56], [56.5, 59], [59.5, 62], [62.5, 64.5], [65, 67], [67, 69.5], [67.5, 72.5]] },
          waterCollectionAfter: { label: 'Water collection: well beside the square', whenFlag: 'systemActive', dwell: 2.5, speed: 28, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[56.5, 53], [55.6, 55.5], [54.6, 57.6], [53.8, 59.6]] },
          labApproach: { label: 'Samples to the field-testing station', fromLevel: 2, needsBuilt: 'lab', speed: 24, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false, jar: true, lit: false,
            points: [[57, 52.5], [55, 55], [52.5, 57], [50, 58.3], [47.5, 59.3]] },
          ambient: [
            { id: 'lumber', label: 'Square to lumber yard', speed: 30, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[46, 57], [40, 57.5], [35, 56], [31, 53], [26, 51], [20, 51.5], [14, 50], [10, 47.5]] },
            { id: 'gardens', label: 'Square to gardens', speed: 28, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[46, 57], [40, 57.5], [35, 56], [31.5, 52.5], [30.5, 46], [30.5, 40], [30, 34], [29, 29], [26, 27], [22, 26.5]] },
            { id: 'quarry', label: 'Square to quarry', speed: 30, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[57.5, 53.5], [61, 54], [64.5, 53.2], [67.3, 51.6], [69.5, 49.2], [72.5, 47.4], [76, 46.3], [79, 44.3], [82, 41], [84, 38.5]] },
          ],
        },
        hotspots: [
          { id: 'committee', kind: 'committee', x: 54, y: 50.5, label: 'Village square' },
          { id: 'homes', kind: 'place', x: 38, y: 39, label: 'Homes' },
          { id: 'school', kind: 'place', x: 60, y: 41, label: 'School' },
          { id: 'gardens', kind: 'place', x: 17, y: 15, label: 'Terrace gardens' },
          { id: 'source', kind: 'source', x: 66, y: 76, label: 'River dock' },
          { id: 'well', kind: 'water', x: 19, y: 25, label: 'Garden well' },
          { id: 'lab', kind: 'site', x: 47, y: 61, label: 'Station site' },
          { id: 'waterPoint', kind: 'site', minLevel: 3, needsTech: true, below: true, x: 53.3, y: 62.8, ground: [53.3, 60.2], label: 'Well site' },
          { id: 'issue', kind: 'issue', minLevel: 5, x: 57.2, y: 57.6, label: 'Pump check' },
          { id: 'survey1', kind: 'survey', minLevel: 2, maxLevel: 2, x: 50, y: 11, label: 'Test rig' },
          { id: 'survey2', kind: 'survey', minLevel: 2, maxLevel: 2, x: 87, y: 49, label: 'Canyon rim' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 8, y: 44, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 17, y: 39, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 80, y: 27, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 91, y: 34, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Village square', text: 'The committee gathers in the shade of the big tree, beside the market awning.' },
          homes: { title: 'Homes', text: '{households} households live in {village}. Thick stone walls keep the houses cool, and two yellow jerry cans wait by most doors.' },
          school: { title: 'School', text: 'The bell tower can be heard across the plateau. Older children often arrive late after carrying water.' },
          gardens: { title: 'Terrace gardens', text: 'Families grow squash, beans and herbs behind stone walls, watered by hand.', note: 'More water close to home could mean bigger gardens.' },
          source: { title: 'River dock', text: 'Below the village, a small dock reaches into the river. Families fill their cans here and carry them back up the slope.',
            looks: 'Slightly cloudy', note: 'Goats water upstream, and the banks wash in after storms.' },
          well: { title: 'Garden well', text: 'An old, open, shallow well by the gardens. It runs low in the dry months.', looks: 'Clear' },
          lab: { title: 'Station site', text: 'A dry, open patch beside the road that the committee offered for a small field-testing station.' },
          issue: { title: 'Problem spot', text: 'The caretaker flagged this during the routine check.' },
          waterPoint: { title: 'Well site', text: 'Firm ground beside the square, uphill from latrines and animal pens, chosen with the hydrogeologist for the borehole.' },
          survey1: { title: 'Test rig', text: 'The partner team has set up a small test rig to check what lies underground.' },
          survey2: { title: 'Canyon rim', text: 'A spring spills down the canyon wall, far below the village.' },
        },
        samples: {
          source: { looks: 'Slightly cloudy', clarity: 'cloudy', germ: 'unsafe', salty: false, colonies: 18,
            clue: 'Animals upstream and soil washing in after storms.' },
          well: { looks: 'Clear', clarity: 'clear', germ: 'risky', salty: false,
            clue: 'An open well collects dust, leaves and whatever is on the bucket.' },
        },
        lab: { clear: 'well', dirty: 'source' },
        system: { art: 'handpump', extras: [], pipe: null },
        animals: [
          { kind: 'goat', x: 12, y: 59.5, s: 1.05, anim: 'graze' }, { kind: 'goat', x: 15.2, y: 61.6, s: 0.95, anim: 'walk', flip: true, delay: 3 },
          { kind: 'lizard', x: 37, y: 89.5, s: 1.5, anim: 'dart' }, { kind: 'lizard', x: 85, y: 62, s: 1.4, anim: 'dart', flip: true, delay: 4 },
          { kind: 'bird', x: 58, y: 5.5, s: 1, anim: 'fly', range: 320 },
        ],
        surveys: {
          survey1: { title: 'Read the test rig', reveals: ['groundwaterDepthM', 'groundwaterSalty', 'rigAccess'],
            done: 'Fresh groundwater, deep down, and the road can carry a drilling rig.' },
          survey2: { title: 'Survey the canyon', reveals: ['springAbove', 'springHeadM', 'springYearRound', 'springDistanceKm', 'rainfallMm', 'bigRoofsM2'],
            done: 'The canyon spring is far below the village and dries up for months. Rain is rare.' },
        },
      },

      wetland: {
        image: 'assets/images/village/wetland-crossroads/bg-main.png', w: 1672, h: 941,
        crop: { x: 0, y: 0, w: 100, h: 100 }, focus: { x: 50, y: 50 },
        structureScale: 1.0, walkerScale: [0.95, 1.15],
        cottages: [],
        routes: {
          waterCollection: { label: 'Water collection: well square to pond dock', speed: 30, walkers: 3, spacing: 6, mode: 'outAndBack', cans: true, lit: true,
            points: [[49, 47], [51.5, 50], [54, 53], [57, 55.5], [61, 57.5], [64.5, 60], [67.5, 63], [70.5, 66], [72.5, 68]] },
          waterCollectionAfter: { label: 'Water collection: school tank', whenFlag: 'systemActive', dwell: 2.5, speed: 28, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[54, 50.5], [59, 51.5], [64, 53], [69, 54], [73, 54], [75.2, 53.4]] },
          labApproach: { label: 'Samples to the field-testing station', fromLevel: 2, needsBuilt: 'lab', speed: 26, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false, jar: true, lit: false,
            points: [[54, 50.5], [59, 51.5], [64, 53], [69, 54], [74, 54.5], [78.5, 53], [81.5, 50], [83, 47.5]] },
          ambient: [
            { id: 'lumber', label: 'Square to lumber yard', speed: 30, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[45, 43], [40, 41], [35, 39.5], [29, 39], [24, 40], [21, 36], [19.5, 31], [18, 26], [14, 23]] },
            { id: 'gardens', label: 'Square to gardens', speed: 28, walkers: 1, spacing: 0, mode: 'outAndBack', cans: false,
              points: [[47, 47.5], [47.5, 51], [48.5, 54.5], [49, 57.5], [48.6, 60], [46.8, 63], [45, 66.5], [43.3, 69.5], [41.6, 72.5], [39, 74], [35.5, 74.5], [32, 73.5], [27, 73]] },
          ],
        },
        hotspots: [
          { id: 'committee', kind: 'committee', x: 52, y: 50, label: 'Market square' },
          { id: 'homes', kind: 'place', x: 31, y: 33, label: 'Homes' },
          { id: 'school', kind: 'place', x: 72, y: 38, label: 'School' },
          { id: 'gardens', kind: 'place', x: 18, y: 74, label: 'Gardens' },
          { id: 'source', kind: 'source', x: 74, y: 66, label: 'Pond dock' },
          { id: 'well', kind: 'water', x: 46.5, y: 42.5, label: 'Village well' },
          { id: 'lab', kind: 'site', x: 84, y: 45.5, label: 'Station site' },
          { id: 'waterPoint', kind: 'site', minLevel: 3, needsTech: true, below: true, x: 75.6, y: 55.2, ground: [75.6, 52.6], label: 'Tank site' },
          { id: 'issue', kind: 'issue', minLevel: 5, x: 72.6, y: 48.2, label: 'Overflowing gutter' },
          { id: 'survey1', kind: 'survey', minLevel: 2, maxLevel: 2, x: 74, y: 52.5, label: 'School roof' },
          { id: 'survey2', kind: 'survey', minLevel: 2, maxLevel: 2, x: 40, y: 61, label: 'South boardwalk' },
          { id: 'wood1', kind: 'node', res: 'wood', x: 12, y: 20, charges: 3, yield: 2 },
          { id: 'wood2', kind: 'node', res: 'wood', x: 18.5, y: 16, charges: 3, yield: 2 },
          { id: 'stone1', kind: 'node', res: 'stone', x: 86, y: 17, charges: 3, yield: 2 },
          { id: 'stone2', kind: 'node', res: 'stone', x: 92, y: 27, charges: 3, yield: 2 },
        ],
        places: {
          committee: { title: 'Market square', text: 'The committee meets by the market awning, where everyone passes.' },
          homes: { title: 'Homes', text: '{households} households live in {village}, on the dry ground between the ponds. Two yellow jerry cans wait by most doors.' },
          school: { title: 'School', text: 'The biggest roof in the village. In a storm, water sheets off its edges.', note: 'Rain falls here for most of the year.' },
          gardens: { title: 'Gardens', text: 'Vegetable beds and little greenhouses on the dry ground south of the village.' },
          source: { title: 'Pond dock', text: 'Families walk the boardwalk out to the pond and scoop water from the dock. It is close to home, but ducks, cattle and floodwater all reach the pond.',
            looks: 'Brownish and cloudy' },
          well: { title: 'Village well', text: 'A shallow hand-pump well on the square. The water comes up fast and clear.', looks: 'Clear' },
          lab: { title: 'Station site', text: 'A dry corner beside the school that the committee offered for a small field-testing station.' },
          issue: { title: 'Problem spot', text: 'The caretaker flagged this during the routine check.' },
          waterPoint: { title: 'Tank site', text: 'Level ground beside the school, right under its big roof, where a covered tank will catch the rain.' },
          survey1: { title: 'School roof', text: 'The partner engineer wants to measure the big roofs.' },
          survey2: { title: 'South boardwalk', text: 'The boardwalk crosses the lowest, wettest part of the village.' },
        },
        samples: {
          source: { looks: 'Brownish and cloudy', clarity: 'cloudy', germ: 'unsafe', salty: false, colonies: 22,
            clue: 'Ducks, cattle and floodwater all reach the pond.' },
          well: { looks: 'Clear', clarity: 'clear', germ: 'unsafe', salty: true, reveals: ['groundwaterSalty'],
            clue: 'Floodwater seeps into shallow wells, and here the groundwater is salty too.' },
        },
        lab: { clear: 'well', dirty: 'source' },
        system: { art: 'raintank', extras: [], pipe: null,
          gutter: [[70.3, 48.6], [72.2, 48], [73.7, 47.5], [74.6, 48.6], [75.2, 50.4]] },
        animals: [
          { kind: 'duck', x: 59.5, y: 79.5, s: 1, anim: 'swim' }, { kind: 'duck', x: 61.6, y: 81.4, s: 0.85, anim: 'swim', delay: 1.6 },
          { kind: 'duck', x: 47, y: 8, s: 0.9, anim: 'swim', flip: true, delay: 3 },
          { kind: 'frog', x: 57.5, y: 90.5, s: 1, anim: 'hop' },
          { kind: 'heron', x: 90.5, y: 69.5, s: 1.1, anim: 'stand' },
        ],
        surveys: {
          survey1: { title: 'Measure the roofs', reveals: ['bigRoofsM2', 'rainfallMm'],
            done: 'Big, sturdy roofs, and the school’s rain gauge shows rain most of the year.' },
          survey2: { title: 'Walk the wetland', reveals: ['springAbove', 'springHeadM', 'springYearRound', 'springDistanceKm', 'groundwaterDepthM', 'rigAccess'],
            done: 'Flat ground with no springs nearby, and groundwater only a few metres down.' },
        },
      },
    },

    /* ---- Field lab scenes ------------------------------------------------------------
       Rectangles are percent of the lab painting (x, y, w, h). All three paintings share
       one bench layout, so hotspots are shared; insets and covers differ slightly.
       The paintings show the charity: water wordmark on the case and microscope; this is
       a sanctioned student collaboration, so it is shown. coverBranding: true would hide
       it with neutral labels (rects in scenes.*.covers) without editing the art.     */
    lab: {
      w: 1672, h: 941, coverBranding: false,
      hotspots: [
        { id: 'clear', label: 'Clear sample jar', rect: [35.5, 51, 10.5, 23], step: true },
        { id: 'dirty', label: 'Cloudy sample jar', rect: [50, 51, 10, 23], step: true },
        { id: 'microscope', label: 'Microscope', rect: [66, 32, 12, 40], step: true },
        { id: 'filter', label: 'Filter stand', rect: [77.5, 55, 12, 30], step: true },
        { id: 'notebook', label: 'Field notebook', rect: [7.5, 73, 33, 23], step: true },
        { id: 'map', label: 'Village and source map', rect: [0.5, 3, 22, 37] },
        { id: 'reagents', label: 'Test tubes and reagents', rect: [18.5, 45, 15.5, 19] },
        { id: 'petri', label: 'Petri dishes', rect: [39, 74, 18.5, 8.5] },
        { id: 'strip', label: 'Indicator strip', rect: [58, 79, 15, 9] },
        { id: 'cylinder', label: 'Measuring cylinder', rect: [61.5, 52.5, 4.3, 26] },
      ],
      scenes: {
        highland: { image: 'assets/images/lab/highland-springs/lab-scene.png',
          insets: { clear: [40.8, 37, 13], dirty: [61.2, 34.8, 14.8] },
          covers: [{ kind: 'case', rect: [6.6, 52.3, 9.6, 10.8] }, { kind: 'scope', rect: [71, 42.4, 6.4, 8.4] }] },
        plateau: { image: 'assets/images/lab/red-rock-plateau/lab-scene.png',
          insets: { clear: [40.8, 37, 13.3], dirty: [60.5, 35.5, 14] },
          covers: [{ kind: 'case', rect: [6.4, 52.3, 9.8, 10.8] }, { kind: 'scope', rect: [70.6, 42.4, 6.5, 8.4] }] },
        wetland: { image: 'assets/images/lab/wetland-crossroads/lab-scene.png',
          insets: { clear: [40.8, 37, 13], dirty: [59.3, 34.8, 13.5] },
          covers: [{ kind: 'case', rect: [6.4, 52.3, 9.8, 10.6] }, { kind: 'scope', rect: [70.4, 42.6, 6.5, 8.2] }] },
      },
    },

    /* ---- Water use and household access (Level 3 activation onward) --------------------------
       All values are simplified, fictional gameplay assumptions [game].
       Households sit in exactly one category at a time:
         project  verified reliable access from the new water point
         trying   starting to use it, not yet verified (not counted as reliable)
         existing verified household solution already in use (counted as reliable)
         partial  some treatment or an unreliable source (NOT counted as reliable)
         none     no verified reliable access
       Residents are spread across categories by household with a largest-remainder rule,
       so the categories always add up to the population exactly.                     */
    water: {
      stepMs: 6000,            // one "service period" every 6 s of play [game]
      startShare: 0.12,        // share of all households that start using the point each period [game]
      verifyRate: 0.8,         // share of trying households verified reliable each period [game]
      verifyRateReliable: 1,   // with the storage/reliability upgrade [game]
      reliabilityCapacityBoost: 0.15,
      farShare: 0.2,           // share of no-access households too far away without an extension [game]
      // Per scenario: [min, max] share of households in each starting category [game].
      baselines: {
        highland: { existing: [0.05, 0.08], partial: [0.18, 0.26],
          existingNote: 'A few families use a ceramic filter every day and keep water in covered containers.',
          partialNote: 'Many pour water through cloth or let it settle. It looks clearer, but germs get through.' },
        plateau: { existing: [0.03, 0.06], partial: [0.14, 0.2],
          existingNote: 'A few households boil every drop and store it in covered, cleaned containers.',
          partialNote: 'Some boil water when they have fuel, or use a sediment filter. That helps sometimes, not every day.' },
        wetland: { existing: [0.06, 0.1], partial: [0.26, 0.34],
          existingNote: 'Some families use a BioSand filter and covered storage, and the lab tested their water safe.',
          partialNote: 'Many collect rain in open jars or use cloth filters. Clearer water, but not reliably safe.' },
      },
    },

    /* Sharing the water point's daily capacity, in jerry cans (1 can ≈ 20 L ≈ one person's day). */
    allocation: {
      sectors: [
        { id: 'homes', name: 'Homes', icon: 'home', share: 0.72, note: 'Drinking, cooking and washing at home.' },
        { id: 'school', name: 'School', icon: 'school', share: 0.1, needPerPerson: 0.06, note: 'Drinking water and handwashing for pupils.' },
        { id: 'clinic', name: 'Clinic', icon: 'clinic', share: 0.08, needPerPerson: 0.04, critical: true, minShareOfNeed: 0.8, note: 'Critical: clean water for care and hygiene.' },
        { id: 'garden', name: 'Gardens', icon: 'leaf', share: 0.1, needPerPerson: 0.08, note: 'Watering the community gardens.' },
      ],
    },

    /* The Level 4 committee decision: two reasonable options with honest tradeoffs. */
    decisions: {
      extend: { name: 'Extend access', short: 'Lay a pipe or path toward the farthest homes.',
        pros: 'Families who live farthest can start using the water point.', cons: 'More people share the same supply, and checks stay as they are.' },
      reliability: { name: 'Improve storage and reliability', short: 'Add storage and spare parts at the water point.',
        pros: 'More water a day, and new users are verified faster.', cons: 'The farthest homes keep walking for now.' },
    },

    /* ---- Level 5: keeping the water flowing ----------------------------------------------------
       One scenario-specific problem per technology. While it lasts the point gives less water
       (supplyFactor) and some households lose reliable service until it is fixed. [game]   */
    maintenance: {
      issueSupplyFactor: 0.5, issueCondition: 0.55, repairedCondition: 0.95, demoteShare: 0.3,
      gravityFed: { title: 'A leaking pipe joint', at: [35, 41], fx: 'leak', label: 'Wet ground',
        report: 'Water reaches the plaza tap slowly, and the ground by the stream crossing stays wet.',
        options: [
          { id: 'joint', text: 'A pipe joint has worked loose at the stream crossing', correct: true, why: 'Right. The wet ground and slow tap point to a leak between the spring and the village.' },
          { id: 'spring', text: 'The spring has dried up', why: 'The spring box is still full and overflowing. The water is getting lost on the way.' },
          { id: 'germs', text: 'Germs have got into the pipe', why: 'The last water test was safe. The problem is how much water arrives, not its quality.' } ],
        cost: { wood: 0, stone: 2 },
        steps: [
          { id: 'dig', label: 'Uncover the joint with the caretaker', done: 'The loose joint is uncovered, dripping steadily.' },
          { id: 'fix', label: 'Fit a new coupling and bed it in stone', done: 'A new coupling is in, packed with stone so the pipe can’t shift.' },
          { id: 'test', label: 'Flush the line and test at the tap', done: 'Full flow at the tap, and the germ test is Safe.' } ] },
      drilledWell: { title: 'A worn pump', at: [57.2, 57.6], fx: 'pump', label: 'Pump check',
        report: 'Each stroke lifts less water than before, and the handle has started to wobble.',
        options: [
          { id: 'seals', text: 'Worn seals and a loose handle bolt', correct: true, why: 'Right. Seals wear out with use. It’s routine maintenance, not a failure.' },
          { id: 'dry', text: 'The groundwater has run out', why: 'The survey found deep, reliable groundwater. The water is there; the pump isn’t lifting it well.' },
          { id: 'apron', text: 'The concrete apron is cracked', why: 'The apron is sound and the drain is clear. That wouldn’t weaken each stroke.' } ],
        cost: { wood: 2, stone: 0 },
        steps: [
          { id: 'lift', label: 'Lift out the pump rods with the mechanic', done: 'Rods and cylinder are out on a clean wooden board.' },
          { id: 'fix', label: 'Replace the seals and tighten the bolt', done: 'New seals from the committee’s spare-parts kit, bolt tightened.' },
          { id: 'test', label: 'Pump test and water test', done: 'Strong, steady strokes, and the germ test is Safe.' } ] },
      rainwater: { title: 'A blocked gutter', at: [72.6, 48.2], fx: 'leaves', label: 'Overflowing gutter',
        report: 'After the last rain the tank barely rose, and water spilled over the gutter edge.',
        options: [
          { id: 'gutter', text: 'Leaves are blocking the gutter and first-flush pipe', correct: true, why: 'Right. Storms wash leaves into the gutter; clearing it is regular caretaker work.' },
          { id: 'leak', text: 'The tank is leaking', why: 'The ground around the tank is dry. Water isn’t getting in, rather than leaking out.' },
          { id: 'rain', text: 'There hasn’t been enough rain', why: 'The school rain gauge shows a normal week. The rain fell; it didn’t reach the tank.' } ],
        cost: { wood: 2, stone: 0 },
        steps: [
          { id: 'clear', label: 'Clear the leaves from the gutters', done: 'Gutters scooped clean, with a new leaf screen tied on.' },
          { id: 'fix', label: 'Clean out the first-flush diverter', done: 'The first-flush pipe is clean and draining again.' },
          { id: 'test', label: 'Check the inflow and test the water', done: 'Rain runs straight to the tank, and the germ test is Safe.' } ] },
    },
    priorities: {
      handwashing: { name: 'Handwashing station at the school', note: 'Pupils wash hands before lunch and after the latrine.' },
      garden: { name: 'Water for the community gardens', note: 'A share of spare water keeps the gardens green in the dry weeks.' },
      fund: { name: 'Grow the repair fund', note: 'A little from every household each month, so the next repair is quick.' },
    },

    /* Gathering spots regrow one charge every regrowMs (wall-clock, so it carries across reloads). [game] */
    regrowMs: 6000,

    resources: {
      wood: { name: 'Wood', verb: 'Gather wood', from: 'fallen branches and offcuts' },
      stone: { name: 'Stone', verb: 'Gather stone', from: 'loose stones' },
    },

    /* What the lab shows for each result [game categories]. */
    results: {
      clarity: { clear: 'Clear', cloudy: 'Cloudy' },
      germ: { safe: { label: 'Safe', colonies: 0, tone: 'ok' }, risky: { label: 'Risky', colonies: 4, tone: 'warn' }, unsafe: { label: 'Unsafe', colonies: 11, tone: 'risk' } },
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

    /* The scenario's water point. Cost and art come from the chosen technology. */
    waterPointBuild: { builder: 'caretaker', buildMs: 4200 },

    /* ---- Technology registry -------------------------------------------------------
       needs: site facts that must be known (from surveys and lab tests) before the
       experts can judge it. All numbers are [game].                                */
    technologies: {
      gravityFed: { name: 'Gravity-fed system', playable: true, short: 'Pipes water downhill from a protected spring to taps in the village. No pump needed.',
        suits: 'A reliable spring higher than the village', cost: { wood: 6, stone: 10 }, partnerProvides: ['pipe', 'cement', 'tap fittings'],
        capacityCans: 420, quality: 'Safe if the spring is protected and the pipes stay sealed.', maintenance: 'Clear the intake, check the pipeline, fix leaks.', structure: 'tank', challenge: 'pipeBreak', upgrade: 'secondTapstand',
        afterRoundTripMin: 10, structureName: 'Tapstand', siteName: 'Tapstand site',
        maintenanceLine: 'The caretaker clears the spring box intake and walks the pipeline for leaks every month.',
        activation: [
          { id: 'valve', label: 'Open the spring box valve', done: 'Spring water flows into the sealed pipe.' },
          { id: 'trace', label: 'Follow the water down the pipeline', done: 'Water ran the whole way to the village tap. No leaks.', effect: 'flow' },
          { id: 'test', label: 'Open the tap and test the water', done: 'Germ test: Safe. A protected spring and a sealed pipe keep germs out.', effect: 'tap' } ],
        needs: ['springAbove', 'springHeadM', 'springYearRound'] },
      drilledWell: { name: 'Drilled well with hand pump', playable: true, short: 'A rig drills down to deep groundwater. A sealed hand pump lifts it to the surface.',
        suits: 'Fresh groundwater and a road a drilling rig can use', cost: { wood: 6, stone: 10 }, partnerProvides: ['drilling rig', 'pump', 'casing', 'cement'],
        capacityCans: 360, quality: 'Deep groundwater is usually well protected; the concrete apron keeps surface water out.', maintenance: 'Replace pump seals, keep the apron and drain clean.', structure: 'pump', challenge: 'pumpSeals', upgrade: 'cattleTrough',
        afterRoundTripMin: 12, structureName: 'Hand pump', siteName: 'Well site',
        maintenanceLine: 'The caretaker greases the pump and checks the seals; the committee keeps spare parts.',
        activation: [
          { id: 'prime', label: 'Prime the pump', done: 'The pump is primed and the seals hold.' },
          { id: 'pump', label: 'Pump test: fill a jerry can', done: 'Steady flow from deep underground.', effect: 'pump', reps: 5 },
          { id: 'test', label: 'Test the water', done: 'Germ test: Safe. The sealed well and concrete apron keep surface water out.', effect: 'tap' } ],
        needs: ['rigAccess', 'groundwaterDepthM', 'groundwaterSalty'] },
      rainwater: { name: 'Rainwater catchment', playable: true, short: 'Gutters collect rain from large roofs into covered storage tanks.',
        suits: 'Plenty of rain and large, sturdy roofs', cost: { wood: 10, stone: 6 }, partnerProvides: ['gutters', 'cement', 'mesh', 'tap'],
        capacityCans: 120, quality: 'Clean if roofs and gutters are kept clean and the first, dirty flush is discarded.', maintenance: 'Clean gutters, check the first-flush diverter, patch cracks.', structure: 'raintank', challenge: 'drySpell', upgrade: 'extraTank',
        afterRoundTripMin: 6, structureName: 'Rainwater tank', siteName: 'Tank site',
        maintenanceLine: 'The caretaker cleans the gutters and empties the first-flush pipe after every storm.',
        activation: [
          { id: 'connect', label: 'Connect the gutters to the tank', done: 'Roof, gutters and tank are connected.', effect: 'gutter' },
          { id: 'flush', label: 'First rain: let the first flush run off', done: 'The dirty first rinse of the roof went to the diverter, not the tank.', effect: 'rain' },
          { id: 'test', label: 'Fill check and water test', done: 'Germ test: Safe. Covered tank, clean gutters, first flush diverted.', effect: 'tap' } ],
        needs: ['rainfallMm', 'bigRoofsM2'] },
      protectedSpring: { name: 'Protected spring', playable: false, short: 'A spring box seals the spring where it comes out of the ground.', suits: 'A spring close to the village',
        needs: ['springAbove', 'springDistanceKm'] },
      handDugWell: { name: 'Hand-dug well', playable: false, short: 'A lined well dug by hand down to shallow groundwater.', suits: 'Fresh groundwater only a few metres down',
        needs: ['groundwaterDepthM', 'groundwaterSalty'] },
      solarPiped: { name: 'Solar-powered piped system', playable: false, short: 'A solar pump lifts water to a tank that feeds several taps.', suits: 'A strong source, lots of sun, a larger community',
        needs: ['groundwaterDepthM', 'groundwaterSalty'] },
      bioSand: { name: 'BioSand household filter', playable: false, short: 'A household sand filter that reduces germs and cloudiness. It treats water but does not create more.', suits: 'Households that must still use surface water',
        needs: ['surfaceTested'] },
      rehabilitation: { name: 'Rehabilitation', playable: false, short: 'Repairs a broken water point instead of building a new one.', suits: 'Villages with an existing system that has failed',
        needs: [] },
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
      { id: 2, title: 'Investigate the Water', next: 'Build the Solution',
        objectives: [
          { id: 'sample', text: (s, h) => `Collect a water sample at the ${h('source')}`, check: (s) => s.samples.indexOf('source') >= 0 },
          { id: 'bring', text: () => 'Bring the sample to the field-testing station', check: (s) => !!s.flags.labUnlocked },
          { id: 'clear', text: () => 'Lab: inspect the clear sample', check: (s) => !!s.flags.clearSampleInspected },
          { id: 'dirty', text: () => 'Lab: inspect the cloudy sample', check: (s) => !!s.flags.dirtySampleInspected },
          { id: 'microscope', text: () => 'Lab: look through the microscope', check: (s) => !!s.flags.microscopeUsed },
          { id: 'filter', text: () => 'Lab: try the filter on the cloudy water', check: (s) => !!s.flags.filterTestCompleted },
          { id: 'surveys', text: (s) => `Survey the land with ${s.people.engineer.name} (${Math.min(2, s.surveys.length)}/2)`, check: (s) => s.surveys.length >= 2 },
          { id: 'notes', text: () => 'Lab: review your field notes', check: (s) => !!s.flags.notesReviewed },
          { id: 'options', text: (s) => `See which water systems fit ${s.name}`, check: (s) => !!s.flags.optionsReviewed },
        ] },
      { id: 3, title: 'Build the Solution', next: 'Manage the Water',
        objectives: [
          { id: 'meeting', text: () => 'Hold the planning meeting with the committee', check: (s) => !!s.flags.planningMet },
          { id: 'choose', text: () => 'Choose the water system together', check: (s) => !!s.tech },
          { id: 'site', text: () => 'Inspect the construction site', check: (s) => s.inspected.indexOf('waterPoint') >= 0 },
          { id: 'materials', text: (s, h, need) => need ? `Gather the materials (wood ${Math.min(s.resources.wood, need.wood)}/${need.wood} · stone ${Math.min(s.resources.stone, need.stone)}/${need.stone})` : 'Gather the materials', check: (s, need) => s.builds.waterPoint !== 'site' || (!!need && s.resources.wood >= need.wood && s.resources.stone >= need.stone) },
          { id: 'build', text: (s) => `Build the ${s.tech ? WV.data.technologies[s.tech].structureName.toLowerCase() : 'water point'} with the local team`, check: (s) => s.builds.waterPoint === 'built' },
          { id: 'activate', text: () => 'Activate the system and test the water', check: (s) => !!s.flags.systemActive },
        ] },
      { id: 4, title: 'Manage the Water', next: 'Keep It Flowing',
        objectives: [
          { id: 'open', text: () => 'Watch the first households start using the water point', check: (s) => !!s.water && s.water.hh.project > 0 },
          { id: 'review', text: () => 'Tap “with reliable water” to review your community', check: (s) => !!s.flags.populationPanelSeen },
          { id: 'share', text: () => 'Share the water between homes, school, clinic and gardens', check: (s) => !!s.water && !!s.water.allocationSet },
          { id: 'decide', text: () => 'Meet the water committee about one improvement', check: (s) => !!s.water && !!s.water.decision },
          { id: 'observe', text: (s) => `Run the next two weeks and see the results (${Math.min(2, (s.water && s.water.weeksRun) || 0)}/2)`, check: (s) => !!s.water && s.water.weeksRun >= 2 },
        ] },
      { id: 5, title: 'Keep It Flowing', next: null,
        objectives: [
          { id: 'inspect', text: () => 'Inspect the water point with the caretaker', check: (s) => !!s.maint && s.maint.inspected },
          { id: 'diagnose', text: () => 'Find what is wrong at the problem spot', check: (s) => !!s.maint && s.maint.diagnosed },
          { id: 'repair', text: (s) => `Carry out the maintenance with the local team${s.maint && !s.maint.repaired ? ` (${s.maint.steps.length}/3)` : ''}`, check: (s) => !!s.maint && s.maint.repaired },
          { id: 'restore', text: (s) => { const r = s.maint && WV.water ? WV.water.residents(s).reliable : 0; return `Restore reliable service (${Math.min(r, s.maint ? s.maint.reliableBefore : 0)}/${s.maint ? s.maint.reliableBefore : 0} residents)`; },
            check: (s) => !!s.maint && s.maint.repaired && WV.water.residents(s).reliable >= s.maint.reliableBefore },
          { id: 'complete', text: () => 'Complete the project review with the committee', check: (s) => !!s.flags.projectComplete },
        ] },
    ],

    /* Tips from the field officer, keyed by the next unfinished objective. */
    tips: {
      explore: 'Tap the glowing markers to look around. Every place tells you something about water here.',
      committee: 'The water committee is waiting at the {committeePlace}. They lead this project, so let’s meet them.',
      source: 'Let’s see where families collect water today: the {sourcePlace}.',
      walk: 'At the {sourcePlace}, choose “Watch the morning walk”.',
      gather: 'We’ll need wood and stone for a small field-testing station. Tap the wood and stone markers.',
      lab: 'The committee has chosen a site for the station. Tap the staked site to build it.',
      sample: 'First, a water sample. Go to the {sourcePlace} and collect one in a clean jar.',
      bring: 'Got it. Carry the sample to the field-testing station and open the lab.',
      clear: 'In the lab, start with the clear jar. Would you drink it?',
      dirty: 'Now the cloudy jar. Compare it with the clear one.',
      microscope: 'Let’s see what the eye can’t. Try the microscope.',
      filter: 'Can a simple filter fix the cloudy water? Try the filter stand.',
      surveys: '{engineer} is ready to survey. Look for the survey markers on the map.',
      notes: 'Everything is in. Open your field notebook in the lab.',
      options: 'Your notes are ready. Ask the experts which water systems fit {village}.',
      meeting: 'The committee is ready to plan. Meet them at the {committeePlace}.',
      choose: 'Pick the water system with the committee. The recommendation comes from your investigation.',
      site: 'The construction site is marked on the map. Take a look.',
      materials: 'A little more wood and stone and the team can start. The gathering spots have filled up again.',
      build: 'Everything’s ready. Start building with the local team.',
      activate: 'Built! Open the site and bring the system to life.',
      open: 'The water point is open. Capacity isn’t access yet: families try it, then it has to prove reliable for them.',
      review: 'Tap the “with reliable water” count at the top to see who has safe water, and how.',
      share: 'Open the water point and share its water between homes, school, clinic and gardens.',
      decide: 'The committee has saved for one improvement. Meet them at the {committeePlace}.',
      observe: 'Open the water point and run the next week to see what changes.',
      inspect: 'The caretaker has noticed something. Tap the water point to inspect it together.',
      diagnose: 'A problem spot is marked on the map. Take a look and decide what’s wrong.',
      repair: 'Work through the repair with the local team at the problem spot.',
      restore: 'Fixed! Families are coming back. Watch reliable service recover, or run the next week.',
      complete: 'Service is back. Meet the committee for the project review.',
      done: 'Nicely done.',
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
