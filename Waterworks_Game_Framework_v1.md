# Waterworks: Complete Game and Simulation Framework v1.0

## 1. Refined game concept

**Waterworks is a small-city simulation in which every development decision changes the journey of water from watershed to tap and back again. Players test water, match treatment to contaminants, conserve limited supplies, maintain infrastructure, manage wastewater, and expand reliable clean-water access without damaging the source on which the city depends.**

The game borrows the readable cause-and-effect structure of a city builder, but water is the central simulation. Roads, housing, farms, schools, clinics, industry, parks, and wetlands matter because they change demand, runoff, access, health, revenue, and treatment requirements.

The player does not rescue a passive community. The player acts as a water-system planner working with community priorities. Residents have needs and preferences, while the player decides how to allocate limited money, water, energy, land, and staff time.

## 2. Scientific foundation and disclosure

The scientific backbone is the **World Health Organization, Guidelines for Drinking-water Quality, fourth edition incorporating the first, second and third addenda (2026)**. WHO describes a risk-management framework that protects drinking water from catchment to consumer. WHO treatment guidance is used to determine which treatment processes can address different categories of hazards. U.S. EPA and other official sources may support topics that need additional engineering or conservation detail.

Recommended in-game disclosure:

> Most water-quality relationships, contaminant categories, health-risk concepts, testing principles, and treatment interactions in this simulation are simplified from the World Health Organization's Guidelines for Drinking-water Quality. Numerical costs, speeds, capacities, and removal coefficients are gameplay assumptions unless a source is specifically identified. This game is educational and is not engineering or drinking-water safety guidance.

The framework separates three kinds of information:

1. **Scientific relationship:** for example, microbial contamination can make water unsafe; high turbidity can increase treatment difficulty; treatment must match the hazard.
2. **Gameplay abstraction:** for example, microbial risk is represented on a 0–100 scale rather than as organisms per unit volume.
3. **Balance coefficient:** for example, a basic filter removes 65% of a turbidity load in the game. This is tunable and is not presented as a universal real-world removal rate.

## 3. Design pillars

### Build

Zone land, connect buildings, construct treatment stages, extend pipes, protect sources, and expand service.

### Balance

Manage water quantity, water quality, demand, pollution, treatment capacity, energy, funding, maintenance, and wastewater.

### Understand

Learn why water can look clear and still be unsafe, why minerals do not automatically mean contamination, why treatment technologies solve different problems, and why source protection and conservation can outperform expansion.

### Central lesson

There is no universal clean-water building. Water security comes from source protection, testing, appropriate treatment, storage, distribution, conservation, maintenance, wastewater management, and community planning working together.

## 4. Player role and objective

The player is the coordinator of a local water authority and community planning group. Each scenario begins with a map, a population, existing water assets, local environmental conditions, and community priorities.

The primary goal is to increase **people with reliable clean-water service** while keeping the system financially and environmentally sustainable.

A standard scenario is completed when the player maintains all of the following for seven consecutive days:

- drinking-water quality score of at least 80;
- availability score of at least 80;
- reliability score of at least 75;
- access score of at least 80;
- wastewater compliance of at least 75;
- non-negative operating cash;
- the scenario-specific population service target.

Completing a scenario does not imply that a community's work is finished forever. The final screen shows remaining risks, maintenance needs, and community priorities alongside the achievement.

## 5. Core gameplay loop

1. **Observe:** review the map, weather, demand, storage, water tests, resident needs, and system warnings.
2. **Plan:** choose allocations, policies, construction, testing, maintenance, and source-protection actions.
3. **Run the day:** water enters the source, passes through treatment, moves through storage and distribution, is used by buildings, and returns as wastewater or environmental loss.
4. **See consequences:** meters, water color, pipe animation, schedules, vegetation, service interruptions, health risk, and resident routines respond.
5. **Review:** the end-of-day report explains the strongest cause-and-effect relationships in one or two sentences.
6. **Adapt:** reinvest revenue and knowledge, repair weaknesses, respond to events, and expand service.

The loop is designed for 60–120 second game days. A complete classroom playthrough should take roughly 12–20 minutes.

## 6. Simulation scale

### Time

- One simulation tick equals one day.
- Construction and research take multiple days.
- Weather and random events apply before daily water movement.
- Maintenance and finance settle at the end of each day.

### Water quantity

The MVP uses **water units** instead of claiming universal liters-per-person values. One water unit is an abstract quantity used consistently throughout the game. A later science mode may convert units to a scenario-specific real volume using a sourced scale.

### Water condition

Most contaminant loads use a 0–100 index:

- 0–19: low
- 20–39: moderate
- 40–59: elevated
- 60–79: high
- 80–100: severe

These bands communicate relative treatment difficulty inside the game. They are not regulatory thresholds.

## 7. Game state

The simulation stores the following state each day.

### Community

- population;
- people connected to the network;
- household, school, clinic, farm, business, and industry demand;
- health, education, time, opportunity, and satisfaction indicators;
- community priorities selected at scenario start or through resident meetings.

### Water quantity

- source volume;
- safe intake limit;
- raw-water intake;
- treatment throughput;
- treated-water storage;
- distribution capacity;
- system loss;
- delivered water;
- unmet demand;
- wastewater collected, treated, reused, and discharged.

### Water condition

- turbidity;
- microbial risk;
- nutrient load;
- organic load;
- chemical contaminant risk;
- dissolved mineral/salinity load;
- pH as a separate characteristic;
- alkalinity in intermediate or science mode.

### Infrastructure

- treatment stages and their capacities;
- storage tanks;
- pipe districts;
- wastewater systems;
- condition, maintenance backlog, staffing, power availability, and failure risk.

### Economy and learning

- capital funds;
- daily revenue;
- operating cost;
- energy use;
- research knowledge;
- construction time;
- grants or scenario objectives.

## 8. Daily calculation order

The order is fixed so the system is understandable and reproducible.

1. Apply weather and scenario events.
2. Update source volume and contaminant loads.
3. Apply land-use runoff and source-protection modifiers.
4. Calculate building demand and conservation reductions.
5. Determine intake, treatment throughput, and treatment performance.
6. Move treated water into storage.
7. Distribute water and subtract leakage.
8. Allocate delivered water by player priorities and critical-service rules.
9. Calculate wastewater generation, collection, treatment, reuse, and discharge.
10. Update health, time, education, environment, satisfaction, finance, condition, and research.
11. Evaluate objectives, warnings, and progression unlocks.

## 9. Quantity calculations

All percentages are stored as decimals in code even when the interface shows whole percentages.

### Gross demand

`grossDemand = sum(buildingBaseDemand × occupancyFactor × activityFactor × conservationMultiplier)`

Demand categories remain separate so the player can allocate shortages among residential, clinic, school, farm, and industry use.

### Distribution loss

`lossRate = clamp(baseLoss + agePenalty + damagePenalty - leakProgramReduction, 0.03, 0.40)`

`deliveredWater = min(treatedAvailable, distributionCapacity) × (1 - lossRate)`

### Service ratio

`serviceRatio = clamp(deliveredWater / grossDemand, 0, 1)`

### Storage

`closingStorage = clamp(openingStorage + treatedOutput - waterReleased, 0, storageCapacity)`

Storage overflow returns to the environment and does not become free revenue or an invisible reserve.

### Wastewater

`wastewaterGenerated = deliveredIndoorWater × returnFlowRatio`

The MVP default return-flow ratio is 0.80. This is a balance assumption and can vary by scenario.

`freshwaterOffset = min(reuseWater, eligibleNonPotableDemand)`

Reuse never automatically enters the drinking-water network. Each reuse pathway must specify an eligible use.

## 10. Demand and allocation rules

Each building has base demand, population or activity served, reliability priority, revenue, wastewater return, and social effects.

Default MVP demand values:

- small home: 4 units/day;
- apartment: 18 units/day;
- school: 12 units/day;
- clinic: 16 units/day;
- market: 8 units/day;
- small farm: 35 units/day;
- light industry: 28 units/day;
- park: 6 units/day.

During shortages, the player allocates available water using sliders or draggable allotments. The interface clearly shows the consequence before confirmation.

Critical-service safeguard: the clinic receives a minimum allocation before discretionary uses unless the player deliberately overrides it after a warning. The override remains possible because the game is about decisions, not hidden automation.

## 11. Source-water and land-use rules

Every source has a volume profile, recharge pattern, intake limit, and starting contaminant profile.

### Surface water

- larger and more visible supply;
- responds quickly to rainfall and drought;
- more exposed to runoff, turbidity, microbial risk, and upstream discharge.

### Groundwater

- slower recharge;
- initially lower turbidity and often lower microbial risk in the simplified model;
- may contain elevated minerals, salinity, arsenic-like chemical risk, or other naturally occurring hazards;
- over-pumping lowers future availability.

### Rainwater

- intermittent and storage-dependent;
- reduces stormwater and non-potable demand;
- quality depends on collection and storage condition.

### Reclaimed water

- reduces freshwater demand;
- requires wastewater treatment, energy, storage, and a dedicated eligible-use network;
- failures can create microbial or chemical risk.

Land use affects nearby sources when runoff occurs:

- forest: reduces erosion and runoff, supports recharge;
- wetland: reduces runoff impact and flood risk, but occupies developable land;
- farm: adds food and revenue, while poorly managed fertilizer and animal waste increase nutrients, microbial risk, and organic load;
- housing: adds population and revenue, while increasing demand and wastewater;
- industry: adds jobs and revenue, while increasing demand and chemical-risk potential;
- pavement: supports development, while increasing runoff and decreasing recharge;
- construction: temporarily raises turbidity and erosion risk.

Pollution is transported downstream. Distance, flow, and wetlands reduce or delay the load, but do not make it disappear without explanation.

## 12. Water-quality calculations

For each contaminant category `c`, the source begins the day with `sourceLoad[c]` on a 0–100 scale.

### Land-use update

`sourceLoadAfterRunoff[c] = clamp(sourceLoad[c] + sum(tileContribution[c] × runoffFactor × proximityFactor) - protectionReduction[c], 0, 100)`

### Treatment throughput

`effectiveCapacity = ratedCapacity × conditionFactor × powerFactor × staffingFactor`

`throughput = min(requestedIntake, effectiveCapacity)`

### Overload

`loadRatio = requestedIntake / max(effectiveCapacity, 1)`

`overloadFactor = 1 when loadRatio ≤ 1; otherwise max(0.55, 1 - 0.45 × (loadRatio - 1))`

### Treatment performance

For each stage and contaminant:

`effectiveRemoval = baseRemoval × conditionFactor × powerFactor × overloadFactor × compatibilityFactor`

`remainingLoadAfterStage = incomingLoad × (1 - effectiveRemoval)`

Sequential treatment stages multiply rather than add. Two 50% removal stages leave 25% of the original game load; they do not remove 100%.

### Condition factor

`conditionFactor = 0.55 + 0.45 × conditionScore`

where condition score is stored from 0 to 1. A facility at 100% condition receives a factor of 1.00; one at 50% condition receives 0.775.

### Turbidity and disinfection interaction

Disinfection addresses microbial risk, not turbidity. If treated turbidity entering disinfection exceeds 40 on the game scale, microbial removal receives a compatibility penalty. This teaches that upstream particle removal can matter to the full treatment train.

### Distribution recontamination

`tapLoad[c] = clamp(plantOutletLoad[c] + pipeIntrusion[c] + storagePenalty[c], 0, 100)`

Low pressure, pipe breaks, and poor storage condition can raise microbial risk after treatment.

## 13. Treatment system

The player builds a **treatment train**, not a universal quality upgrade.

### MVP processes

1. screening;
2. coagulation/flocculation and sedimentation;
3. media filtration;
4. disinfection;
5. activated carbon;
6. membrane filtration;
7. reverse osmosis;
8. ion exchange;
9. wastewater biological treatment;
10. constructed wetland or polishing stage.

Each process has:

- build cost;
- daily operating cost;
- energy use;
- staff requirement;
- rated capacity;
- construction time;
- contaminant-removal matrix;
- residual or waste stream where relevant;
- maintenance decay rate.

Treatment coefficients in the mechanics workbook are deliberately conservative, simplified balance values. They encode treatment matching, not engineering guarantees.

## 14. pH, minerals, and alkalinity

pH is not part of a simple clean/dirty average. It modifies corrosion, treatment compatibility, and acceptability.

- pH from 6.5 to 8.5 is the MVP stable gameplay band, not a claim that all water within it is safe.
- more extreme values reduce infrastructure condition and selected treatment efficiency.
- pH never cancels microbial or chemical risk.

Dissolved minerals are not automatically harmful. The base mineral index affects hardness, taste, scaling, or salinity. A separate chemical-risk category covers hazardous specific chemicals.

Alkalinity appears in intermediate mode as pH-buffering capacity. Low alkalinity makes pH more sensitive to treatment and events. It should not appear in the first tutorial.

## 15. Conservation and source protection

Conservation actions behave like infrastructure investments.

- leak detection reduces distribution loss and reveals maintenance needs;
- pipe replacement reduces loss and intrusion risk but has high capital cost;
- low-flow fixtures reduce residential and institutional demand;
- efficient irrigation reduces farm demand;
- rainwater capture offsets eligible non-potable demand and stormwater runoff;
- wastewater reuse offsets eligible non-potable demand but increases treatment and energy needs;
- forest buffers reduce erosion and nutrient runoff;
- wetlands reduce peak runoff and downstream contaminant loads;
- industrial pretreatment reduces chemical load at the source.

The balance target is that at least one conservation or prevention pathway is cheaper than expanding supply in most scenarios. The player should discover that avoided demand can function like a new source.

## 16. Reliability, maintenance, and failure

Each asset has condition from 0 to 100.

`dailyConditionLoss = baseDecay × utilizationMultiplier × environmentMultiplier`

Preventive maintenance restores condition at lower cost than emergency repair. Deferred maintenance saves money immediately but increases operating cost, lowers efficiency, and raises failure probability.

`failureChance = baseFailureChance + agePenalty + overloadPenalty + lowConditionPenalty - preventiveMaintenanceBonus`

Random failure checks use a seeded random number so a scenario can be replayed and tested.

Power interruptions reduce pumping and selected treatment performance. Gravity-fed systems and storage can provide resilience without being universally superior.

## 17. Outcome scores

Five scores are always visible. Each ranges from 0 to 100.

### Quality

Quality is hazard-weighted and uses the worst critical weakness more strongly than an average.

`hazardIndex = 0.35 microbial + 0.20 turbidity + 0.15 nutrient + 0.15 chemical + 0.10 organic + 0.05 mineralPenalty`

`quality = clamp(100 - hazardIndex - pHPenalty - distributionPenalty, 0, 100)`

If microbial or chemical risk is severe, quality is capped below the safe-service threshold even if the other measures are strong.

### Availability

`availability = 100 × min(deliveredWater / demand, 1)`

### Reliability

Reliability combines recent continuity, storage reserve, asset condition, and capacity margin.

`reliability = 0.35 continuity + 0.25 storageReserve + 0.25 condition + 0.15 capacityMargin`

Use a seven-day rolling window for continuity.

### Access

`access = 100 × peopleWithConnectedService / totalPopulation`

Optional travel-time penalties apply in scenarios where some residents use distant collection points.

### Resilience

`resilience = 0.30 sourceDiversity + 0.25 reserveDays + 0.20 maintenanceReadiness + 0.15 emergencyCapacity + 0.10 watershedHealth`

### Water Security

`waterSecurityBase = 0.30 quality + 0.25 availability + 0.20 reliability + 0.15 access + 0.10 resilience`

Critical gates prevent one excellent category from hiding a dangerous failure:

- if quality is below 50, Water Security cannot exceed 49;
- if availability is below 40, Water Security cannot exceed 59;
- if reliability is below 40, Water Security cannot exceed 64.

### Impact Score

Impact is a secondary summary, not the main lesson.

`impact = 0.45 waterSecurity + 0.15 health + 0.15 reclaimedTime + 0.10 education + 0.10 environment + 0.05 financialSustainability`

The results screen always shows the contributing scores so the total never becomes an unexplained points number.

## 18. Social outcomes

Water changes community routines rather than merely moving meters.

### Health

Health responds to quality, availability for hygiene, clinic reliability, and recent exposure. Harm is delayed and recovery is gradual so one good day does not erase a week of unsafe service.

### Reclaimed time

`reclaimedHours = baselineCollectionHours - currentCollectionHours`

The schedule view assigns reclaimed time to school, work, caregiving, community life, or play according to resident priorities. Time is an outcome, not currency the player spends.

### Education

School participation depends on household water collection time, illness, school water reliability, and the player's service allocation.

### Food security

Farms require water, but over-allocation can deprive households while under-allocation can reduce food and income. Efficient irrigation changes the tradeoff rather than simply increasing a meter.

## 19. Economy and research

The player manages capital funds and daily operating cash.

`closingCash = openingCash + revenue + grants - constructionSpending - operatingCost - maintenanceCost - emergencyCost`

Research knowledge is earned for demonstrated understanding:

- identifying a contaminant source;
- maintaining safe service for multiple days;
- selecting an appropriate treatment stage;
- preventing pollution;
- completing optional tests;
- recovering from an event without shifting harm downstream.

Research unlocks capability. The player must still fund, build, power, staff, and maintain the technology.

## 20. Progression

### Tutorial: See the system

- one surface-water source;
- homes, a school, a clinic, and a farm;
- turbidity and microbial risk;
- testing, filtration, disinfection, basic allocation, and leakage;
- goal: deliver adequate safe water for three days.

### Early game: Balance quantity and quality

- nutrients, organic load, storage, maintenance, weather, and wastewater;
- player learns that clear water is not necessarily safe and that more water can create more wastewater.

### Mid game: Shape the watershed

- industry, chemical risk, land use, wetlands, conservation, source protection, capacity upgrades, and community priorities;
- player compares treatment with prevention and demand reduction.

### Late game: Build resilience

- drought, source diversity, reuse, advanced treatment, aging assets, power limits, and multiple districts;
- success depends on reliable systems rather than a single large facility.

### Science mode

- alkalinity, hardness, salinity, individual contaminants, residuals, and more detailed process performance;
- uses scenario-specific sourced values and clearly labels regulatory or technical references.

## 21. Events

Events create decisions, not unavoidable punishment.

1. Heavy rain: more source volume, more turbidity and runoff.
2. Drought watch: lower recharge; choose restrictions, conservation rebates, or alternate supply.
3. Pipe leak: repair now, isolate a district, or accept growing loss and risk.
4. Power interruption: use storage, backup power, or reduce treatment throughput.
5. Farm planting season: food and revenue opportunity with higher irrigation demand.
6. Fertilizer runoff warning: fund buffers, support better application, or increase downstream treatment.
7. Industrial permit request: jobs and revenue with water and chemical-risk implications.
8. School event: temporary demand increase and education benefit if service is reliable.
9. Clinic surge: prioritize critical service while balancing other users.
10. Equipment maintenance window: accept temporary lower capacity or risk a later failure.
11. Wetland restoration proposal: surrender developable land for source protection and flood resilience.
12. Population arrival: expand service, use temporary supply, or stage new connections.
13. Algal bloom: organic load and treatment difficulty rise after warm, nutrient-rich conditions.
14. Main break: isolate the break quickly or lose water and pressure across the network.
15. Community conservation campaign: spend funds and staff time for a temporary demand reduction that can become permanent with upgrades.
16. Grant opportunity: meet a transparent objective rather than receive random free money.
17. Low-reservoir warning: choose between voluntary conservation, mandatory restrictions, or accelerated supply work.
18. Successful rainy season: refill storage while deciding whether to invest the temporary surplus or preserve it.

## 22. Characters and community agency

Use six to ten named resident representatives rather than turning people into generic units. Each person has:

- home and daily route;
- one role, such as student, farmer, clinic worker, mechanic, teacher, or shop owner;
- one goal;
- one water-dependent routine;
- a short preference or concern;
- visible schedule changes when water access changes.

Community meetings present two or three priorities. The player may choose a different strategy, but the game shows whose routine benefits or suffers. No culture, country, or community is treated as representative of everyone who lacks reliable service.

## 23. Feedback rules

Every consequential action produces feedback at three levels:

1. **Immediate:** pipe flow, meter movement, sound, highlight, animation, or allocation preview.
2. **System:** a score or capacity changes with an explanation of the cause.
3. **Human:** a resident schedule, school attendance, clinic service, farm task, or community comment changes.

Examples:

- allocating water animates flow through the selected district and previews who receives service;
- low storage slows pipe animation and exposes reserve days;
- improved treatment changes lab readings before changing health;
- missed school appears as a schedule change, not a sad cutscene;
- irrigated crops visibly stabilize over several days rather than instantly turning lush;
- construction disrupts land temporarily, then adds a functioning process to the visible water route;
- a completed project shows new capacity, new maintenance obligations, people served, and remaining constraints.

## 24. Responsible representation rules

- Frame residents as planners, workers, and decision-makers, not beneficiaries waiting for rescue.
- Use multiple fictional regions and system constraints rather than one stereotyped village.
- Avoid poverty as scenery, exaggerated before-and-after transformations, guilt-based narration, and donation-linked scoring.
- Do not make all problems solvable by expensive imported technology.
- Include operations, local expertise, maintenance, governance, and source protection.
- Keep real-world action separate from game score.
- Present the final call to action as optional learning, project exploration, sharing, or support.

## 25. MVP boundary

The recommended first coded version includes:

- one map and one fictional community;
- one river source and one storage reservoir;
- eight building types;
- six water-condition variables plus pH;
- six treatment or conservation actions;
- a daily simulation loop;
- allocation controls;
- source, plant, tap, and wastewater sampling points;
- five main outcome scores plus Water Security;
- eight event cards;
- three progression chapters;
- end-of-day cause-and-effect summaries;
- a seven-day completion objective;
- an About/Science screen with source disclosure.

Exclude from the MVP:

- multiplayer;
- real donation transactions;
- real engineering design;
- hundreds of individual chemicals;
- procedural world generation;
- fully simulated traffic, electricity, or economy;
- advanced resident artificial intelligence;
- real-world maps presented as exact community models.

## 26. Data model for implementation

Recommended entities:

- `Scenario`
- `MapTile`
- `WaterSource`
- `TreatmentPlant`
- `TreatmentStage`
- `StorageAsset`
- `PipeDistrict`
- `Building`
- `PopulationGroup`
- `ResidentRepresentative`
- `Policy`
- `Project`
- `Event`
- `DailyState`
- `WaterSample`
- `OutcomeScore`

Each simulation rule should carry:

- rule ID;
- system;
- trigger;
- input fields;
- calculation;
- output fields;
- scientific relationship source;
- abstraction note;
- balance version;
- test case.

## 27. Minimum acceptance tests

1. Adding homes increases demand and wastewater.
2. A storm increases source volume while raising runoff-related loads.
3. Filtration lowers turbidity but cannot replace disinfection for microbial risk.
4. Disinfection does not remove nutrient or mineral load.
5. Overloading a plant reduces performance and reliability.
6. Poor condition reduces capacity and removal performance.
7. Fixing leaks increases delivered water without increasing intake.
8. Wetlands or buffers reduce relevant runoff loads.
9. Reuse reduces eligible freshwater demand but consumes treatment capacity and energy.
10. Unsafe quality caps Water Security even when availability is high.
11. Reliable connected service reduces collection time and can improve school participation.
12. A completed project creates an ongoing maintenance cost.
13. Every visible score can be traced to source variables.
14. The same random seed and player actions reproduce the same daily result.
15. No tooltip describes the game coefficients as universal real-world performance.

## 28. Locked decisions before wireframing

- Genre: small-city water-system builder.
- Camera: readable illustrated map with selectable buildings and visible water routes.
- Main tick: one day.
- Main progression number: people with reliable clean-water service.
- Main strategic score: Water Security.
- Most important emotional reward: reclaimed time and reliable routines.
- Scientific backbone: WHO catchment-to-consumer risk management.
- Core interaction: inspect, allocate, build, test, run day, review consequences.
- Treatment philosophy: match the process to the hazard.
- Tone: respectful, hopeful, systems-focused, and free of guilt mechanics.

## 29. Questions intentionally deferred to wireframing

- exact map proportions and camera controls;
- whether water allocation uses drag-and-drop, sliders, or both;
- how much laboratory detail is visible by default;
- placement of scores, event cards, infrastructure menu, resident panels, and educational information;
- animation timing and sound hierarchy;
- whether the first tutorial runs inside the main map or as a guided scenario.

## 30. Sources

- World Health Organization. *Guidelines for drinking-water quality: fourth edition incorporating the first, second and third addenda.* 17 June 2026. https://www.who.int/publications/i/item/9789240121225
- World Health Organization. *Drinking-water.* https://www.who.int/news-room/fact-sheets/detail/drinking-water
- World Health Organization. *Treatment methods and performance.* https://www.who.int/publications/m/item/treatment-methods-and-performance
- U.S. Environmental Protection Agency. Drinking-water and water-infrastructure guidance may be used as a secondary reference for specific U.S.-focused mechanics. https://www.epa.gov/ground-water-and-drinking-water

