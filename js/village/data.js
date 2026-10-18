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
    disclaimer: 'Waterworks is an independent educational prototype inspired by charity: water. It is not an official charity: water product.',
    gameplayNote: 'Populations, distances, times, rainfall, depths and amounts are simplified, fictional gameplay values.',
    learnUrl: 'https://www.charitywater.org/',
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
          waterCollectionAfter: { label: 'Water collection: plaza tapstand', whenBuilt: 'waterPoint', speed: 30, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[46, 47], [50, 49], [54, 50.5], [57, 51]] },
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
          { id: 'survey1', kind: 'survey', minLevel: 2, x: 8.5, y: 11.5, label: 'Spring source' },
          { id: 'survey2', kind: 'survey', minLevel: 2, x: 28, y: 31, label: 'Hillside track' },
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
          waterCollectionAfter: { label: 'Water collection: well beside the square', whenBuilt: 'waterPoint', speed: 28, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[54, 56], [57, 57.5], [60, 58.5]] },
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
          { id: 'survey1', kind: 'survey', minLevel: 2, x: 50, y: 11, label: 'Test rig' },
          { id: 'survey2', kind: 'survey', minLevel: 2, x: 87, y: 49, label: 'Canyon rim' },
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
          waterCollectionAfter: { label: 'Water collection: school tank', whenBuilt: 'waterPoint', speed: 28, walkers: 2, spacing: 4, mode: 'outAndBack', cans: true, lit: true,
            points: [[52, 47], [57, 47.5], [62, 48.5], [66, 50]] },
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
          { id: 'survey1', kind: 'survey', minLevel: 2, x: 74, y: 52.5, label: 'School roof' },
          { id: 'survey2', kind: 'survey', minLevel: 2, x: 40, y: 61, label: 'South boardwalk' },
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

    /* ---- Technology registry -------------------------------------------------------
       needs: site facts that must be known (from surveys and lab tests) before the
       experts can judge it. All numbers are [game].                                */
    technologies: {
      gravityFed: { name: 'Gravity-fed system', playable: true, short: 'Pipes water downhill from a protected spring to taps in the village. No pump needed.',
        suits: 'A reliable spring higher than the village', cost: { wood: 8, stone: 14 }, partnerProvides: ['pipe', 'cement', 'tap fittings'],
        capacityCans: 420, quality: 'Safe if the spring is protected and the pipes stay sealed.', maintenance: 'Clear the intake, check the pipeline, fix leaks.', structure: 'tank', challenge: 'pipeBreak', upgrade: 'secondTapstand',
        needs: ['springAbove', 'springHeadM', 'springYearRound'] },
      drilledWell: { name: 'Drilled well with hand pump', playable: true, short: 'A rig drills down to deep groundwater. A sealed hand pump lifts it to the surface.',
        suits: 'Fresh groundwater and a road a drilling rig can use', cost: { wood: 6, stone: 16 }, partnerProvides: ['drilling rig', 'pump', 'casing', 'cement'],
        capacityCans: 360, quality: 'Deep groundwater is usually well protected; the concrete apron keeps surface water out.', maintenance: 'Replace pump seals, keep the apron and drain clean.', structure: 'pump', challenge: 'pumpSeals', upgrade: 'cattleTrough',
        needs: ['rigAccess', 'groundwaterDepthM', 'groundwaterSalty'] },
      rainwater: { name: 'Rainwater catchment', playable: true, short: 'Gutters collect rain from large roofs into covered storage tanks.',
        suits: 'Plenty of rain and large, sturdy roofs', cost: { wood: 10, stone: 12 }, partnerProvides: ['gutters', 'cement', 'mesh', 'tap'],
        capacityCans: 120, quality: 'Clean if roofs and gutters are kept clean and the first, dirty flush is discarded.', maintenance: 'Clean gutters, check the first-flush diverter, patch cracks.', structure: 'raintank', challenge: 'drySpell', upgrade: 'extraTank',
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
      sample: 'First, a water sample. Go to the {sourcePlace} and collect one in a clean jar.',
      bring: 'Got it. Carry the sample to the field-testing station and open the lab.',
      clear: 'In the lab, start with the clear jar. Would you drink it?',
      dirty: 'Now the cloudy jar. Compare it with the clear one.',
      microscope: 'Let’s see what the eye can’t. Try the microscope.',
      filter: 'Can a simple filter fix the cloudy water? Try the filter stand.',
      surveys: '{engineer} is ready to survey. Look for the survey markers on the map.',
      notes: 'Everything is in. Open your field notebook in the lab.',
      options: 'Your notes are ready. Ask the experts which water systems fit {village}.',
      done: 'Nicely done.',
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
