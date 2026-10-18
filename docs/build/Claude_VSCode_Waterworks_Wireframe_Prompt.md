# Claude VS Code Prompt: Build the Waterworks Interactive Wireframe

You are working inside the existing Waterworks project folder in VS Code. Your task is to build a polished, interactive desktop wireframe for the game concept. This is a wireframe and interaction prototype, not the final game simulation.

## Read the project context first

Before writing or changing code:

1. Inspect the entire project folder and identify the existing stack, file structure, scripts, and current state.
2. Read `../reference/Waterworks_Game_Framework_v1.md` completely.
3. Inspect every relevant worksheet in `../reference/Waterworks_Simulation_Model_v1.xlsx`, especially Overview, Example Day, Buildings, Sources Land Use, Treatment Matrix, Rules, Events, Progression, and Provenance.
4. Read `Water.Game.Concept.PDF` if it is present. Treat it as assignment context, not as a substitute for the detailed framework.
5. Briefly report what you found, which existing files you will preserve, and which files you plan to create or edit.

The Markdown framework and spreadsheet are authoritative. If they conflict with an assumption you would normally make, follow the framework. Do not silently invent new simulation science or replace the locked game design.

## Goal

Create a desktop-first interactive wireframe for **Waterworks**, a SimCity-inspired water-system city builder where players manage the journey of water from watershed to tap and back again.

The wireframe must make the following loop understandable without a long explanation:

**Observe -> Test -> Allocate -> Build or maintain -> Run the day -> See consequences -> Adapt**

The primary progression number is **People with Reliable Clean-Water Service**. The primary strategic score is **Water Security**. The most important human reward is **reclaimed time and reliable community routines**, not arbitrary points.

## Scope boundary

Build a convincing interaction prototype with representative mock data. Do not build the complete backend simulation yet.

Use deterministic placeholder state based on the Example Day worksheet. Buttons and controls should produce believable visual state changes, but they do not need to implement the full rules engine.

Do not add:

- authentication;
- databases;
- payments or donations;
- multiplayer;
- real-world engineering calculations;
- hundreds of contaminants;
- external APIs;
- complex procedural maps;
- charity: water logos or protected assets;
- a full production game engine.

## Technical direction

Use the project's existing web stack if one already exists. Preserve its package manager and conventions.

If the folder does not contain an established application, create the prototype with simple HTML, CSS, and JavaScript so it can run through a local development server or by opening the main HTML file. Do not introduce a large framework merely for the wireframe.

Keep all wireframe data in a clearly labeled local mock-data file or JavaScript object so it can later be replaced by the real simulation engine.

Do not modify or delete the framework, spreadsheet, or assignment PDF.

## Visual direction

The interface should feel like a thoughtful city-management game rather than a school slideshow or a generic admin dashboard.

Use:

- strong editorial typography;
- charcoal, warm white, and restrained yellow as the core palette;
- water blue only for water, flow, selected water infrastructure, and quality information;
- simple illustrated map geometry;
- thin boundaries and mostly square or lightly rounded corners;
- subtle paper, map, or topographic texture created with CSS;
- purposeful shadows and layering;
- clean iconography made from inline SVG, CSS, or an already-installed icon package;
- compact information panels;
- subtle motion that explains water movement and state change.

Avoid:

- excessive gradients;
- glassmorphism;
- highly rounded floating cards;
- bubbly controls;
- cartoon poverty imagery;
- guilt-based imagery or language;
- generic AI-generated dashboard styling;
- copying charity: water branding or protected assets.

The visual language may be inspired by charity: water's use of yellow, black, white, transparency, and field-story clarity, but it must remain original.

## Required desktop layout

Design primarily for a 1440 x 900 desktop viewport. It should remain usable down to approximately 1024 pixels wide.

### 1. Top command bar

Include:

- Waterworks title;
- current scenario name;
- Day indicator;
- Pause / normal / fast time controls;
- Funding;
- Energy;
- Research knowledge;
- People with reliable clean-water service;
- Help and settings controls.

Keep the top bar compact. The people-served figure should receive the strongest emphasis.

### 2. Left planning rail

Create a collapsible rail with these categories:

- Inspect;
- Water sources;
- Treatment;
- Distribution;
- Conservation;
- Wastewater and reuse;
- Community buildings;
- Source protection.

Selecting a category reveals a short list of representative actions or assets. Include at least:

- water test;
- media filtration;
- disinfection;
- storage tank;
- pipe extension;
- leak detection;
- efficient irrigation;
- wetland buffer;
- wastewater treatment;
- reclaimed-water connection.

Each item should show a simple cost, build time, capacity or effect, and locked/unlocked status where appropriate.

### 3. Central community map

The map is the main stage, not a decorative background.

Represent:

- mountain or upper watershed;
- reservoir or river source;
- intake;
- treatment plant;
- treated-water storage;
- pipe network;
- homes;
- school;
- clinic;
- market;
- farm;
- light industry;
- wastewater collection;
- wastewater plant;
- discharge or reuse route;
- forest or wetland protection area.

Use SVG or semantic HTML/CSS so major map objects can be selected and highlighted.

Show animated water movement along the route:

**Watershed -> Source -> Treatment -> Storage -> Distribution -> Buildings -> Wastewater -> Treatment -> Reuse or environment**

The animation should be restrained and should pause when reduced-motion is enabled.

Map states should communicate:

- low or healthy storage;
- active water flow;
- a leak location;
- treatment capacity strain;
- a district receiving inadequate service;
- runoff traveling from a farm or construction area toward the river;
- reclaimed water returning to an eligible use.

### 4. Right inspection panel

The right panel changes according to the selected map object.

Create useful states for at least:

#### River or reservoir

- available volume;
- turbidity;
- microbial risk;
- nutrients;
- organic load;
- chemical risk;
- pH;
- likely contaminant sources;
- Test Water action.

#### Treatment plant

- treatment train shown in sequence;
- rated and effective capacity;
- current load;
- condition;
- power and staffing;
- incoming versus outgoing water readings;
- maintenance and upgrade actions.

#### Neighborhood or community building

- population or people served;
- daily demand;
- allocated water;
- reliability priority;
- current service status;
- wastewater returned;
- one visible human consequence.

#### Pipe or storage asset

- capacity;
- condition;
- loss or reserve days;
- repair, maintenance, or expansion action.

### 5. Bottom system dashboard

Show the five locked outcome scores:

- Quality;
- Availability;
- Reliability;
- Access;
- Resilience.

Also show the combined Water Security score. Do not present it as an unexplained number. Clicking it should reveal the weighted formula and any active critical gate.

Include a compact source-to-tap laboratory comparison:

| Measure | Source | Plant outlet | Tap |
| --- | ---: | ---: | ---: |
| Turbidity | 62 | 12 | 12 |
| Microbial risk | 77 | 8 | 8 |
| Nutrients | 28 | 24 | 24 |
| Chemical risk | 19 | 16 | 16 |
| Organic load | 33 | 18 | 18 |
| pH | 7.8 | 7.3 | 7.3 |

Clearly label these values as game-scale prototype data.

### 6. Daily allocation drawer

Provide an allocation mode where the player distributes the available water among:

- homes;
- clinic;
- school;
- farm;
- market;
- industry.

Use accessible sliders, numeric controls, or a clear drag interaction with a keyboard-accessible alternative.

Before confirmation, show:

- available water;
- total requested water;
- unallocated amount;
- shortage amount;
- which services will be affected;
- clinic critical-service warning if it falls below its minimum.

### 7. Event card

Include one representative event based on the framework:

**Heavy Rain**

- source volume increases;
- turbidity increases;
- farm runoff risk increases;
- treatment load increases.

Offer three choices:

1. Reduce intake and use storage.
2. Add a temporary treatment shift.
3. Continue normal operation and accept the risk.

Preview the likely tradeoff of each choice without guaranteeing the outcome.

### 8. End-of-day summary

The Run Day action should open a concise summary showing:

- water produced;
- water delivered;
- system loss;
- demand met;
- wastewater treated;
- score changes;
- people gaining or losing reliable service;
- one cause-and-effect explanation;
- reclaimed time or changed community routine.

Example explanation:

> Repairing the District 2 leak recovered 11 water units without increasing river intake. The school now has reliable service, returning two hours to Maya's daily schedule.

## Required prototype interactions

Implement the following visible interactions:

1. Select at least five map objects and update the inspection panel.
2. Toggle animated water-flow overlays.
3. Open and close the planning rail categories.
4. Enter allocation mode and adjust sector allocations.
5. Trigger and resolve the Heavy Rain event.
6. Add or preview one treatment stage.
7. Repair a representative leak and show recovered delivery capacity.
8. Run the day and display an end-of-day summary.
9. Open the Water Security explanation.
10. Open an About / Science panel with the source disclosure.

Use local state only. A refresh may reset the prototype.

## Starting prototype values

Use the Example Day worksheet as the starting reference:

- Opening treated storage: 120 water units;
- Requested intake: 160 units/day;
- Rated treatment capacity: 150 units/day;
- Plant condition: 85%;
- Power availability: 100%;
- Staffing availability: 95%;
- Gross demand: 170 units/day;
- Distribution capacity: 180 units/day;
- Base distribution loss: 16%;
- Leak-program reduction: 5%;
- Storage capacity: 250 units;
- Water released: 170 units;
- Delivered water: approximately 151.3 units;
- Availability: 89%;
- Quality: 82.5;
- Reliability: 82;
- Access: 76;
- Resilience: 68;
- Water Security: 81.6.

The values may change through prototype interactions, but keep the relationships internally coherent.

## Educational behavior

Follow this rule:

**If a concept can be demonstrated through interaction or cause-and-effect feedback, demonstrate it instead of explaining it with a paragraph.**

Required lessons:

- clear-looking water may still carry microbial risk;
- source water and drinking water are not the same;
- pH is not a cleanliness score;
- minerals do not automatically mean contamination;
- filtration and disinfection solve different problems;
- overloaded or poorly maintained treatment loses performance;
- fixing leaks can create usable supply without taking more source water;
- preventing pollution may cost less than removing it later;
- water use creates wastewater;
- a new facility creates maintenance obligations.

Use short tooltips and contextual explanations. Avoid textbook paragraphs in the main interface.

## Responsible representation

- Present residents as people with roles, routines, goals, and agency.
- Show community priorities and tradeoffs rather than portraying people as passive beneficiaries.
- Do not use a generalized “poor village” setting.
- Do not create an exaggerated transformation from misery to paradise.
- Do not use sad imagery, guilt, tragedy, or donation pressure as emotional mechanics.
- Do not connect real donations to game scores.
- Use a fictional community for the prototype.
- Separate gameplay from any optional real-world learning or support call to action.

## Accessibility and responsive behavior

- Use semantic HTML and meaningful landmarks.
- Ensure all controls work with a keyboard.
- Provide visible focus states.
- Use sufficient color contrast.
- Do not encode risk through color alone; pair it with text or icons.
- Provide useful ARIA labels for map controls and icon-only buttons.
- Respect `prefers-reduced-motion`.
- Keep the desktop information hierarchy intact at 1024 pixels.
- At narrower sizes, stack or collapse panels instead of shrinking text into unreadability.

## File organization and maintainability

- Keep mock scenario data separate from rendering code.
- Use clear names such as `waterState`, `communityBuildings`, `treatmentStages`, `dailyEvent`, and `outcomeScores`.
- Add short comments only where a future developer needs to understand the interface between the wireframe and eventual simulation engine.
- Do not bury all markup, styles, and data in one massive file if the current project structure supports separation.
- Reuse existing design tokens or create a small documented token set for color, spacing, type, borders, and motion.

## Required documentation

Update or create a short `README.md` section that explains:

- how to run the wireframe;
- which files were added or changed;
- which interactions are implemented;
- which features are mocked;
- how the mock data maps to the framework and workbook;
- what should be built next when the real simulation engine begins.

## Acceptance checklist

Do not call the task complete until all of these are true:

- The project runs without console errors.
- The central map is the dominant visual element.
- Water can be followed from source to use and wastewater.
- Five or more map objects are inspectable.
- Allocation controls visibly change service outcomes.
- The Heavy Rain event creates a real decision.
- At least one leak or maintenance action changes delivered capacity.
- Source, plant outlet, and tap readings are visually distinct.
- Water Security exposes its component scores and active gates.
- A human routine changes in the end-of-day summary.
- The source disclosure names WHO and distinguishes science from gameplay assumptions.
- The interface is usable by keyboard.
- Reduced-motion behavior works.
- The layout has been checked at 1440 x 900, 1280 x 800, and 1024 x 768.
- No protected charity: water assets are copied.
- The framework files and assignment PDF remain unchanged.

## Work sequence

1. Inspect the repository and context files.
2. State the implementation plan and file changes.
3. Build the static page structure and responsive layout.
4. Build the selectable SVG or HTML community map.
5. Add mock data and panel state changes.
6. Add allocation, event, maintenance, and Run Day interactions.
7. Add accessible motion and feedback.
8. Test the acceptance checklist.
9. Fix any layout, accessibility, or console problems.
10. Report exactly what was created, what remains mocked, and the recommended next step.

Do not begin by redesigning the game concept. The framework is already approved. Your job is to translate it into a clear, compelling, and testable interactive wireframe.
