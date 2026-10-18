/* =============================================================================
   WATERWORKS WIREFRAME — MOCK DATA
   -----------------------------------------------------------------------------
   Everything the prototype "knows" lives in this file. It is a deterministic
   stand-in for the real simulation engine.

   Provenance labels used below (see Waterworks_Simulation_Model_v1.xlsx > Provenance):
     [workbook]  value copied from the workbook (Example Day, Buildings, Treatment Matrix…)
     [framework] value/rule taken from Waterworks_Game_Framework_v1.md
     [proto]     prototype-only assumption invented so the wireframe is coherent.
                 These are NOT science and NOT final balance values.

   To swap in the real engine later: replace WW.data with the engine's DailyState
   snapshot and keep the shapes documented on each block.
   ========================================================================== */
(function (root) {
  'use strict';
  const WW = (root.WW = root.WW || {});

  /* ---- Contaminant keys used everywhere (0–100 game-scale load) [framework §6] */
  const LOAD_KEYS = ['turbidity', 'microbial', 'nutrients', 'chemical', 'organic'];

  WW.data = {
    meta: {
      balanceVersion: 'v1.0',
      scaleNote: 'Game-scale prototype data (0–100 load index, pH 0–14). Not real measurements.',
    },

    /* ---- Scenario [framework §4, Progression sheet] -------------------------- */
    scenario: {
      name: 'Alder Ford',
      chapter: 'Early: Balance quantity and quality',
      gate: 'Water Security ≥ 70 for 5 days',
      gateDaysDone: 3,
      gateDaysNeeded: 5,
    },

    /* ---- waterState: the opening state of Day 4 ---------------------------------
       Example Day worksheet values are marked [workbook].                        */
    waterState: {
      day: 4,
      funding: 48000,                 // [proto] capital funds
      revenueAtFullService: 3480,     // [proto] aggregate daily tariff; scaled by availability
      baseOpex: 250,                  // [proto] pumping + admin, per day
      energyCapacity: 70,             // [proto]
      energyFixed: 12 + 18,           // [proto] pumping 12 + wastewater biological 18 (matrix energy)
      knowledge: 34,                  // [proto]
      population: 1250,               // [proto] chosen so Access 76 = 950 / 1250 [workbook]
      connectedPeople: 950,           // = District 1 (480) + District 2 (420) + Terrace standpipe-adjacent connections (50)
      terraceConnected: 50,

      storage: 120,                   // [workbook] opening treated storage
      storageCapacity: 250,           // [workbook]
      intake: 160,                    // [workbook] requested raw-water intake
      waterReleased: 170,             // [workbook]
      distributionCapacity: 180,      // [workbook]
      grossDemand: 170,               // [workbook] (sum of allocationSectors demand)

      plant: { rated: 150, condition: 0.85, power: 1.0, staffing: 0.95 }, // [workbook]

      /* Workbook base loss 0.16 is decomposed here so a leak repair can be shown.
         0.06 + 0.035 + 0.065 = 0.16. The split itself is [proto]; the total is [workbook]. */
      loss: { base: 0.06, age: 0.035, leakDamage: 0.065, leakProgram: 0.05 },

      reservoir: { volume: 1240, capacity: 2000, safeIntakeLimit: 200 }, // [proto]

      /* Source-water loads on the 0–100 game scale [prompt table]. */
      sourceLoads: { turbidity: 62, microbial: 77, nutrients: 28, chemical: 19, organic: 33, ph: 7.8, mineral: 10 },
      /* Authored plant-outlet and tap readings [prompt table]. tap = outlet on Day 4. */
      plantOutletLoads: { turbidity: 12, microbial: 8, nutrients: 24, chemical: 16, organic: 18, ph: 7.3 },
      tapLoads: { turbidity: 12, microbial: 8, nutrients: 24, chemical: 16, organic: 18, ph: 7.3 },
      mineralPenalty: 10,             // [workbook]
      distributionPenalty: 4,         // [workbook]; falls to 1 after the D2 leak is repaired [proto]
      distributionPenaltyAfterRepair: 1,

      /* Score inputs that are not derivable from a single formula in the workbook. */
      baseScores: { reliability: 82, resilience: 68 },   // [workbook]
      wastewater: { capacity: 120, compliance: 78, returnFlow: 0.8 }, // [proto]
      reuse: { supply: 14 },          // [proto] reclaimed water available if connected
      emergencyCapacity: 0,
    },

    /* ---- Demand sectors, allocation defaults [Buildings sheet + framework §10] ---
       demand values sum to 170 [workbook Example Day]. `homes` is an aggregate [proto].
       Default allocation gives the clinic exactly its minimum, then shares the rest
       proportionally: total 151.3 = delivered water [workbook].                    */
    allocationSectors: [
      { id: 'clinic',   name: 'Clinic',   icon: 'clinic',   demand: 16, priority: 5, min: 14.4, returnFlow: 0.85, critical: true },
      { id: 'school',   name: 'School',   icon: 'school',   demand: 12, priority: 4, min: 0,    returnFlow: 0.75 },
      { id: 'homes',    name: 'Homes',    icon: 'home',     demand: 71, priority: 3, min: 0,    returnFlow: 0.80 },
      { id: 'market',   name: 'Market',   icon: 'market',   demand: 8,  priority: 2, min: 0,    returnFlow: 0.70 },
      { id: 'industry', name: 'Industry', icon: 'industry', demand: 28, priority: 2, min: 0,    returnFlow: 0.65 },
      { id: 'farm',     name: 'Farm',     icon: 'farm',     demand: 35, priority: 2, min: 0,    returnFlow: 0.25 },
    ],
    defaultAllocation: { homes: 63.1, clinic: 14.4, school: 10.7, market: 7.1, farm: 31.1, industry: 24.9 },

    /* ---- communityBuildings: selectable buildings [Buildings sheet] -------------- */
    communityBuildings: [
      { id: 'homesD1',  sector: 'homes',    name: 'Riverside Homes',  district: 'District 1', kind: 'Homes',          icon: 'home',
        demand: 30, people: 480, priority: 3, returnFlow: 0.8,  benefit: 'Housing and household routines', shortage: 'Hygiene and household routines decline', resident: 'ravi' },
      { id: 'flatsD2',  sector: 'homes',    name: 'Market Row Flats', district: 'District 2', kind: 'Apartments',     icon: 'home',
        demand: 24, people: 420, priority: 3, returnFlow: 0.82, benefit: 'Dense housing and revenue',      shortage: 'Many residents lose service at once', resident: 'ravi' },
      { id: 'terraceD3', sector: 'homes',   name: 'Terrace Homes',    district: 'District 3', kind: 'Homes (new hillside district)', icon: 'home',
        demand: 17, people: 350, connected: 50, priority: 3, returnFlow: 0.8, benefit: 'Housing — pipe extension pending', shortage: 'Residents keep using the shared standpipe', resident: 'elena' },
      { id: 'school',   sector: 'school',   name: 'School',           district: 'District 2', kind: 'School',         icon: 'school',
        demand: 12, people: 150, priority: 4, returnFlow: 0.75, benefit: 'Education and community use',    shortage: 'Attendance and learning decline', resident: 'maya' },
      { id: 'clinic',   sector: 'clinic',   name: 'Clinic',           district: 'District 2', kind: 'Clinic',         icon: 'clinic',
        demand: 16, people: 60,  priority: 5, returnFlow: 0.85, benefit: 'Critical health service',        shortage: 'Treatment capacity and infection control decline', resident: 'ines' },
      { id: 'market',   sector: 'market',   name: 'Market',           district: 'District 2', kind: 'Market',         icon: 'market',
        demand: 8,  people: 80,  priority: 2, returnFlow: 0.7,  benefit: 'Food access and local economy',  shortage: 'Business activity declines', resident: 'sam' },
      { id: 'farm',     sector: 'farm',     name: 'Farm',             district: 'South fields', kind: 'Small farm',   icon: 'farm',
        demand: 35, people: 40,  priority: 2, returnFlow: 0.25, benefit: 'Food and jobs',                  shortage: 'Yield and income decline', resident: 'tomas' },
      { id: 'industry', sector: 'industry', name: 'Light industry',   district: 'District 1', kind: 'Light industry', icon: 'industry',
        demand: 28, people: 55,  priority: 2, returnFlow: 0.65, benefit: 'Jobs and revenue',               shortage: 'Jobs and production decline', resident: 'jun' },
    ],

    /* ---- Residents: named representatives with routines [framework §22] ---------
       hoursLost by service tier is [proto]; it drives "reclaimed time".            */
    residents: {
      maya:  { name: 'Maya',  role: 'Student', place: 'School',
        goal: 'Finish the afternoon science lab block.',
        tiers: { full: ['Full school day, lab block runs.', 0], reduced: ['Lab block shortened; classes end 2 hours early.', 2], rationed: ['Sinks closed; half-day schedule.', 3.5], cut: ['School closed for the day.', 6] } },
      ines:  { name: 'Ines',  role: 'Clinic nurse', place: 'Clinic',
        goal: 'Keep sterilisation and outpatient hours on schedule.',
        tiers: { full: ['Outpatient hours run normally.', 0], reduced: ['Sterilisation queue adds 30 minutes.', 0.5], rationed: ['Appointments rescheduled; queue grows.', 1.5], cut: ['Only emergency cases seen.', 3] } },
      tomas: { name: 'Tomás', role: 'Farmer', place: 'Farm',
        goal: 'Get the tomato rows through planting season.',
        tiers: { full: ['Morning irrigation completes on time.', 0], reduced: ['Irrigation split across two shifts.', 1], rationed: ['Only the youngest rows are watered.', 2], cut: ['Irrigation stops; yield at risk.', 4] } },
      sam:   { name: 'Sam',   role: 'Market owner', place: 'Market',
        goal: 'Open the stalls before the morning rush.',
        tiers: { full: ['Stalls open on time.', 0], reduced: ['Produce washing slows setup.', 0.5], rationed: ['Two stalls stay closed.', 1.5], cut: ['Market closed.', 3] } },
      jun:   { name: 'Jun',   role: 'Mechanic', place: 'Light industry',
        goal: 'Finish the second production shift.',
        tiers: { full: ['Both shifts run.', 0], reduced: ['Second shift starts an hour late.', 1], rationed: ['Second shift cancelled.', 2], cut: ['Line paused.', 4] } },
      ravi:  { name: 'Ravi',  role: 'Bus driver', place: 'Homes',
        goal: 'Have a normal morning routine before the first route.',
        tiers: { full: ['Normal morning routine.', 0], reduced: ['Showers shortened, still on time.', 0.25], rationed: ['Fills buckets before the route.', 1], cut: ['Late for the first route.', 2] } },
      elena: { name: 'Elena', role: 'Teacher', place: 'Terrace Homes',
        goal: 'Get to school without the morning standpipe walk.',
        tiers: { full: ['No standpipe walk.', 0], reduced: ['Short standpipe queue.', 0.4], rationed: ['Long standpipe queue.', 1.2], cut: ['Water hauled by hand.', 2] } },
    },

    /* ---- Treatment train [Treatment Matrix sheet] --------------------------------
       removal = base removal fractions; energy/opex from matrix.                    */
    treatmentStages: [
      { id: 'screening',    name: 'Screening',                   short: 'S', capacity: 180, energy: 2,  opex: 90,  built: true,
        removal: { turbidity: 0.10, microbial: 0.02, nutrients: 0,    chemical: 0,    organic: 0.05 },
        role: 'Removes large debris. Not a safety barrier.' },
      { id: 'coagulation',  name: 'Coagulation & sedimentation', short: 'C', capacity: 150, energy: 7,  opex: 430, built: true,
        removal: { turbidity: 0.55, microbial: 0.20, nutrients: 0.10, chemical: 0.08, organic: 0.15 },
        role: 'Clumps fine particles so they settle. Produces sludge.' },
      { id: 'media',        name: 'Media filtration',            short: 'M', capacity: 140, energy: 8,  opex: 520, built: true,
        removal: { turbidity: 0.70, microbial: 0.40, nutrients: 0.05, chemical: 0.05, organic: 0.15 },
        role: 'Strains particles. Clears water, but does not make it microbially safe.' },
      { id: 'disinfection', name: 'Disinfection',                short: 'D', capacity: 170, energy: 5,  opex: 310, built: true,
        removal: { turbidity: 0,    microbial: 0.95, nutrients: 0,    chemical: 0,    organic: 0 },
        role: 'Targets microbes only. Works worse in cloudy water.' },
    ],
    /* Stages a player may add. Same coefficient shape [Treatment Matrix]. */
    treatmentCatalog: {
      carbon: { id: 'carbon', name: 'Activated carbon', short: 'A', capacity: 110, energy: 12, opex: 880, cost: 26000, days: 4, staff: 1,
        removal: { turbidity: 0.05, microbial: 0, nutrients: 0.10, chemical: 0.45, organic: 0.70 },
        role: 'Adsorbs organics and some chemicals. Media replacement needed.' },
    },
    /* Authored stage-by-stage readings for the baseline train [proto — approximates the
       workbook coefficients; final column equals the prompt's plant-outlet table]. */
    baselineStageReadings: {
      source:       { turbidity: 62, microbial: 77, nutrients: 28, chemical: 19, organic: 33, ph: 7.8 },
      screening:    { turbidity: 57, microbial: 76, nutrients: 28, chemical: 19, organic: 31, ph: 7.8 },
      coagulation:  { turbidity: 30, microbial: 63, nutrients: 25, chemical: 17, organic: 25, ph: 7.5 },
      media:        { turbidity: 12, microbial: 42, nutrients: 24, chemical: 16, organic: 18, ph: 7.4 },
      disinfection: { turbidity: 12, microbial: 8,  nutrients: 24, chemical: 16, organic: 18, ph: 7.3 },
    },

    /* ---- Storm (Heavy Rain) modifiers [Events sheet EV_RAIN] ---------------------- */
    stormEffects: {
      volumeMult: 1.18,                                             // [workbook] +18% source volume
      loads: { turbidity: 25, microbial: 8, nutrients: 12, chemical: 0, organic: 6 }, // turbidity [workbook]; others [proto] "runoff loads rise"
      treatmentLoadMult: 1.12,                                      // [proto]
    },

    /* ---- dailyEvent: Heavy Rain [Events sheet] ---------------------------------- */
    dailyEvent: {
      id: 'EV_RAIN',
      title: 'Heavy rain',
      lead: 'A storm front is over the upper watershed. The river is rising and carrying soil and farm runoff toward the intake.',
      changes: [
        { label: 'Source volume', from: '1,240', to: '1,463', note: '+18%' },
        { label: 'Source turbidity', from: '62', to: '87', note: '+25' },
        { label: 'Farm runoff risk', from: 'Moderate', to: 'High', note: 'nutrients +12' },
        { label: 'Treatment load', from: '120%', to: '134%', note: 'more solids' },
      ],
      choices: [
        { id: 1, title: 'Reduce intake and use storage',
          detail: 'Draw the river down slower and serve people from the tank.',
          likely: [
            { k: 'Water quality', v: 'Stays steady', tone: 'ok' },
            { k: 'Storage', v: 'Likely falls to about 60 units (~24%)', tone: 'warn' },
            { k: 'Cost', v: 'None today', tone: 'ok' },
            { k: 'Risk', v: 'Low reserve if the rain lasts', tone: 'warn' },
          ] },
        { id: 2, title: 'Add a temporary treatment shift',
          detail: 'Call in extra operators to run the plant harder.',
          likely: [
            { k: 'Water quality', v: 'Mostly steady', tone: 'ok' },
            { k: 'Storage', v: 'Keeps drawing down about 37 units/day', tone: 'warn' },
            { k: 'Cost', v: '1,800 funds + 6 energy', tone: 'warn' },
            { k: 'Risk', v: 'Staff fatigue if the storm runs long', tone: 'warn' },
          ] },
        { id: 3, title: 'Continue normal operation and accept the risk',
          detail: 'Keep intake at 160 and hope the plant copes.',
          likely: [
            { k: 'Water quality', v: 'Likely dips; tap turbidity rises', tone: 'risk' },
            { k: 'Service', v: 'A precautionary advisory becomes possible', tone: 'risk' },
            { k: 'Cost', v: 'None today', tone: 'ok' },
            { k: 'Risk', v: 'Highest of the three', tone: 'risk' },
          ] },
      ],
    },

    /* ---- Planning rail [Treatment Matrix, framework §13–15] ------------------------
       effects keys are interpreted by app.js applyProject(); see README.            */
    planningRail: [
      { id: 'inspect', name: 'Inspect', icon: 'search', items: [
        { id: 'waterTest', name: 'Water test', cost: 400, days: 0, stat: 'Samples source, plant, tap', status: 'available', action: 'test',
          lesson: 'You cannot see microbes. Testing reveals what the eye cannot.' },
        { id: 'traceRunoff', name: 'Trace runoff', cost: 0, days: 0, stat: 'Shows where pollution enters', status: 'available', action: 'runoff',
          lesson: 'Pollution travels downstream. Find it before you treat it.' },
        { id: 'routines', name: 'Resident routines', cost: 0, days: 0, stat: 'Who benefits or waits', status: 'available', action: 'routines',
          lesson: 'Water changes daily routines, not just meters.' },
      ] },
      { id: 'sources', name: 'Water sources', icon: 'mountain', items: [
        { id: 'rain', name: 'Rainwater capture', cost: 5000, days: 3, stat: '−4 units/day non-potable demand', status: 'available',
          effects: { demand: { industry: -4 }, opex: 40, flag: 'rain', resilience: 5 }, obligations: ['40 funds/day cleaning and inspection'],
          lesson: 'Avoided demand works like a new source.' },
        { id: 'well', name: 'Groundwater well', cost: 21000, days: 5, stat: 'Slow recharge; minerals', status: 'locked', unlock: 'Later chapter',
          lesson: 'Groundwater trades turbidity for slow recharge and natural minerals.' },
      ] },
      { id: 'treatment', name: 'Treatment', icon: 'filter', items: [
        { id: 'screening', name: 'Screening', cost: 4000, days: 1, stat: '180/day · debris only', status: 'built' },
        { id: 'coagulation', name: 'Coagulation & sed.', cost: 16000, days: 3, stat: '150/day · turbidity −55%', status: 'built' },
        { id: 'media', name: 'Media filtration', cost: 18000, days: 3, stat: '140/day · turbidity −70%', status: 'built' },
        { id: 'disinfection', name: 'Disinfection', cost: 9000, days: 2, stat: '170/day · microbes −95%', status: 'built' },
        { id: 'carbon', name: 'Activated carbon', cost: 26000, days: 4, stat: '110/day · organics −70%', status: 'available', action: 'stage', ghost: 'carbon', effects: { stage: 'carbon' },
          obligations: ['880 funds/day operating cost', '12 energy/day', '1 operator', 'Media replacement over time'],
          lesson: 'Each process targets different hazards. Match the process to the hazard.' },
        { id: 'membrane', name: 'Membrane filtration', cost: 48000, days: 6, stat: '90/day · high energy', status: 'locked', unlock: 'Mid chapter' },
        { id: 'ro', name: 'Reverse osmosis', cost: 76000, days: 8, stat: '65/day · salts −95%', status: 'locked', unlock: 'Late chapter' },
      ] },
      { id: 'distribution', name: 'Distribution', icon: 'pipe', items: [
        { id: 'leakRepair', name: 'Repair leak · District 2', cost: 3200, days: 0, stat: 'Recovers ~11 units/day', status: 'available', action: 'repair',
          lesson: 'Fixing leaks creates usable supply without taking more from the river.' },
        { id: 'pipeExt', name: 'Pipe extension · Terrace', cost: 14000, days: 4, stat: '+150 people connected', status: 'available', ghost: 'ext',
          effects: { terrace: 150, demand: { homes: 6 }, opex: 90, flag: 'ext' },
          obligations: ['90 funds/day pipe maintenance', '+6 units/day home demand', 'More wastewater returned'],
          lesson: 'Access must grow with capacity, or new taps just share a shortage.' },
        { id: 'tank', name: 'Storage tank', cost: 11000, days: 3, stat: '+100 capacity', status: 'available', ghost: 'tank',
          effects: { storageCapacity: 100, opex: 60, flag: 'tank', emergency: 40 },
          obligations: ['60 funds/day inspection and cleaning'],
          lesson: 'Storage buys time in a storm or a power cut, but only if you fill it.' },
      ] },
      { id: 'conservation', name: 'Conservation', icon: 'leaf', items: [
        { id: 'leakDetect', name: 'Leak detection', cost: 6000, days: 2, stat: 'System loss −2 points', status: 'available', ghost: 'detect',
          effects: { leakProgram: 0.02, opex: 150, flag: 'detect' }, obligations: ['150 funds/day survey crew'],
          lesson: 'Loss is supply you already paid to treat.' },
        { id: 'irrigation', name: 'Efficient irrigation', cost: 8500, days: 3, stat: 'Farm demand −7 units', status: 'available', ghost: 'irrigation',
          effects: { demand: { farm: -7 }, opex: 30, flag: 'irrigation', resilience: 3 }, obligations: ['30 funds/day drip-line upkeep'],
          lesson: 'Efficiency changes the food-versus-households tradeoff.' },
        { id: 'fixtures', name: 'Low-flow fixtures', cost: 7000, days: 2, stat: 'Homes −6 units', status: 'available',
          effects: { demand: { homes: -6 } }, obligations: ['No running cost'],
          lesson: 'Behaviour and infrastructure both change demand.' },
      ] },
      { id: 'wastewater', name: 'Wastewater & reuse', icon: 'recycle', items: [
        { id: 'wwtp', name: 'Wastewater treatment', cost: 36000, days: 6, stat: '120/day · biological', status: 'built' },
        { id: 'reuse', name: 'Reclaimed-water connection', cost: 12000, days: 4, stat: '14 units/day → farm only', status: 'locked', unlock: 'Needs 38 research', unlockKnowledge: 38, ghost: 'reuse',
          effects: { reuse: true, opex: 180, energy: 4, flag: 'reuse', resilience: 8 },
          obligations: ['180 funds/day polishing and monitoring', '4 energy/day', 'Uses 14 units of wastewater capacity', 'Never enters the drinking-water network'],
          lesson: 'Reuse offsets freshwater for eligible uses, and costs treatment capacity and energy.' },
      ] },
      { id: 'community', name: 'Community buildings', icon: 'building', items: [
        { id: 'homes', name: 'Home cluster (4 homes)', cost: 9000, days: 3, stat: '+64 people · +16 units/day', status: 'available',
          ghost: 'homes', effects: { demand: { homes: 16 }, population: 64, connected: 64, flag: 'homes' },
          obligations: ['+16 units/day demand', 'More wastewater returned', 'More revenue'],
          lesson: 'Adding homes increases demand and wastewater.' },
        { id: 'park', name: 'Park', cost: 6000, days: 2, stat: '6 units/day', status: 'locked', unlock: 'Mid chapter' },
      ] },
      { id: 'protection', name: 'Source protection', icon: 'shield', items: [
        { id: 'wetland', name: 'Wetland buffer', cost: 9000, days: 5, stat: 'Nutrients −6 · runoff −14', status: 'available', ghost: 'wetland',
          effects: { protect: { turbidity: -5, microbial: -4, nutrients: -6, organic: -4, chemical: -1 }, opex: 40, flag: 'wetland', watershed: 8 },
          obligations: ['40 funds/day maintenance', 'Occupies 2 land tiles'],
          lesson: 'Preventing pollution can cost less than removing it later.' },
        { id: 'forest', name: 'Forest buffer strip', cost: 5500, days: 4, stat: 'Turbidity −4 · nutrients −2', status: 'available',
          effects: { protect: { turbidity: -4, microbial: -2, nutrients: -2, organic: -2 }, watershed: 4 }, obligations: ['Land use: 1 tile'],
          lesson: 'Forest cover slows runoff and holds soil.' },
        { id: 'nutrientPlan', name: 'Farm nutrient plan', cost: 3000, days: 2, stat: 'Nutrients −5 at source', status: 'available',
          effects: { protect: { nutrients: -5, organic: -2, microbial: -2 }, opex: 20 }, obligations: ['20 funds/day agronomy support'],
          lesson: 'Better fertiliser timing keeps nutrients out of the river.' },
      ] },
    ],

    /* ---- Lessons shown as short tooltips / contextual notes ---------------------- */
    lessons: {
      clearWater: 'Clear-looking water can still carry microbial risk. You can’t see microbes — only a test or disinfection deals with them.',
      sourceVsTap: 'Source water and drinking water are different things. The plant sits between them.',
      pH: 'pH is not a cleanliness score. Water can sit in the stable band and still carry microbes or chemicals.',
      minerals: 'Dissolved minerals are not automatically contamination. They change taste and scaling; chemical risk is a separate measure.',
      filterVsDisinfect: 'Filtration removes particles. Disinfection removes microbes. They solve different problems.',
      overload: 'A plant pushed past its effective capacity removes less. Poor condition lowers it too.',
      leakSupply: 'Fixing leaks creates usable supply without taking more from the river.',
      prevention: 'Preventing pollution can cost less than removing it later.',
      wastewater: 'Every unit of water used comes back as wastewater that needs treatment.',
      obligation: 'A new facility is never “done”: it brings running costs, energy and staff.',
    },

    /* ---- Source disclosure [framework §2, Provenance sheet] ------------------------ */
    disclosure: 'Most water-quality relationships, contaminant categories, health-risk concepts, testing principles, and treatment interactions in this simulation are simplified from the World Health Organization’s Guidelines for Drinking-water Quality. Numerical costs, speeds, capacities, and removal coefficients are gameplay assumptions unless a source is specifically identified. This game is educational and is not engineering or drinking-water safety guidance.',
    sources: [
      { id: 'WHO_GDWQ_2026', title: 'Guidelines for drinking-water quality: fourth edition incorporating the first, second and third addenda', authority: 'World Health Organization', date: '17 June 2026', use: 'Primary framework: catchment-to-consumer risk management; microbial and chemical hazards; water safety plans', url: 'https://www.who.int/publications/i/item/9789240121225' },
      { id: 'WHO_FACT_DW', title: 'Drinking-water fact sheet', authority: 'World Health Organization', date: '13 September 2023', use: 'Safely managed service; microbial risk; social and economic effects', url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water' },
      { id: 'WHO_TREAT', title: 'Treatment methods and performance', authority: 'World Health Organization', date: '4 May 2022', use: 'Treatment process roles; matching treatment to water-quality needs', url: 'https://www.who.int/publications/m/item/treatment-methods-and-performance' },
      { id: 'EPA_DW', title: 'Ground Water and Drinking Water', authority: 'U.S. Environmental Protection Agency', date: 'Current web guidance', use: 'Secondary, U.S.-focused infrastructure and source-water context', url: 'https://www.epa.gov/ground-water-and-drinking-water' },
    ],
    provenanceClasses: [
      { name: 'Scientific relationship', text: 'Direction of an effect supported by an authority, e.g. faecal contamination raises microbial risk.' },
      { name: 'Gameplay abstraction', text: 'A simplified representation, e.g. microbial risk on a 0–100 scale.' },
      { name: 'Balance coefficient', text: 'An invented number for pace and challenge, e.g. a filter removes 70% of game turbidity. Tunable and versioned.' },
    ],
    outcomeWeights: [
      { key: 'quality',      name: 'Quality',      weight: 0.30 },
      { key: 'availability', name: 'Availability', weight: 0.25 },
      { key: 'reliability',  name: 'Reliability',  weight: 0.20 },
      { key: 'access',       name: 'Access',       weight: 0.15 },
      { key: 'resilience',   name: 'Resilience',   weight: 0.10 },
    ],
    gates: [
      { key: 'quality',      below: 50, cap: 49, text: 'Unsafe quality caps Water Security at 49' },
      { key: 'availability', below: 40, cap: 59, text: 'Severe shortage caps Water Security at 59' },
      { key: 'reliability',  below: 40, cap: 64, text: 'Unreliable service caps Water Security at 64' },
    ],
    loadKeys: LOAD_KEYS,
    loadLabels: { turbidity: 'Turbidity', microbial: 'Microbial risk', nutrients: 'Nutrients', chemical: 'Chemical risk', organic: 'Organic load', ph: 'pH' },
    loadHints: {
      turbidity: 'Cloudiness. You can see this one.',
      microbial: 'Disease-causing organisms. Invisible.',
      nutrients: 'Fertiliser and waste. Feeds algae.',
      chemical: 'Hazardous specific chemicals.',
      organic: 'Decaying plant and waste matter.',
      ph: 'Acidity. Affects pipes and treatment, not cleanliness.',
    },
    visible: { turbidity: true, microbial: false, nutrients: false, chemical: false, organic: false, ph: false },
  };
})(window);
