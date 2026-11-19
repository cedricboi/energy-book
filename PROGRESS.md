# PROGRESS.md: The Energy Ledger

Read after `CLAUDE.md` at the start of every session. Newest entry at the top.

---

## 20 Nov 2026. The page text is printed into the paper

The largest gap from the technique study (TECHNIQUES.md C1) is closed. On landscape lesson pages the words are now part of the page itself.

- **How:** the browser still lays the page out in HTML. `src/book/printer.js` reads where each word, rule, box, list number and equation part landed and draws the same thing onto a canvas covering the whole sheet (6.4 px per mm). Type is drawn at its real size under a scale, so the variable font picks the same optical size as on screen. `src/book/pagePrint.js` makes each canvas the paper's texture (`ink/paper.js` gained print uniforms). The words take the window light, darken in the gutter and follow the page's curve.
- **The HTML copy** stays in place, invisible (class `is-inked`), so screen readers and keyboard focus work as before. Live controls (buttons, sliders, tick boxes, typed answers, the feedback card, the stamp) stay visible as real HTML.
- **Page turns:** the new page is made before the leaf moves (hidden, undrawn). The leaf carries the page it lifts from on its front and the arriving page on its back, and the page it uncovers is already printed. For the turn, a full print that also draws the controls is used, so nothing looks missing. The leaf now starts and lands flush with the curved page.
- **The drawing leaves with its page** (`src/book/figureSnapshot.js`, TECHNIQUES.md C2, the leaving half): once the diagram has folded flat, it is rendered from straight above into the right page's print, at the same line weight as on screen, and the live copy hides. Going on, the leaf carries the printed drawing away. Going back, the leaf covers it. Glows keep their hue in the print. The arriving drawing still rises and inks itself as before.
- **Guided close-ups** no longer hide the text: it stays printed on the page while the camera moves in.
- **Updates:** a change to the page (feedback, a revealed step, a new class, fonts or images arriving) reprints it on the next frame. A print takes about 2 ms of script time.
- **Kettle cutaways** (`src/objects/cutaway.js`, `kettleInside` in `objects/kettle.js`): running the Lesson 2 kettle, or starting the Lesson 8 stopwatches, cuts the kettle open. The cut trims surfaces, ink lines (the ribbon shader now supports clipping planes) and what is inside. The element glows while it is on. The water is drawn like the energy in the jars, with the internal store's pattern, and warms from a pale tint to the store's glow as energy arrives, so the 2000 W kettle's water visibly gets there first.
- **Part names are handwritten on the paper:** the Kalam labels lost their tag box and keep only a paper-coloured halo, at a slight hand angle, like notes in a workbook.
- **The contents is a printed spread:** a title page on the left (the motto, the six stores with their icons in their colours, how to use the book) and a ruled list of lessons on the right (`rightPanel`, `AREAS.rightText`). Each contents line is a real button, printed too (class `ink-row`), so only its focus ring shows as HTML. Opening a lesson turns the contents away on the leaf. Back from a lesson's first page turns back to the contents. The printer now also draws SVG rectangles, circles, ellipses, lines and polylines.
- **Stamps are printed too:** the printer now draws 2D transforms and design outlines, so the exit page's "Balanced" stamp (once it has pressed in) and the contents marks are printed into the paper at their angle. The press itself still plays as HTML.
- **The ledger turns with its page:** at the fold it is printed onto the right page (the printer draws stretched SVG and pattern fills as the store colour), its live copy hides, and the leaf carries it away. The arriving page's ledger is printed under the leaf. Once the leaf lands, the live ledger is back.
- **House ink is now C, bold** (the teacher's choice, 20 Nov 2026): `HOUSE_INK = 'C'`, a 3 px outline, 2 px lines and fuller hatching. D stays available as `?ink=D`.
- **The turning leaf shows through:** the far side's print shows faintly and mirrored, softened, most while the leaf stands up and not at all when it lies flat.
- **Fixes:** a print no longer sets off CSS transitions (which had asked for endless reprints and kept the render loop from going idle). A lesson that fails to load no longer freezes the printer.
- **Unchanged:** the stacked (portrait) layout keeps the HTML panel (the contents list follows the title page there). The ledger stays live HTML.

### Checks
- 196 unit tests pass.
- Browser specs (book, accessibility, lessons, handling): 63 passed. Two projector-size lesson runs timed out under load and pass when run alone.
- Screenshots of every lesson's pages checked by eye, including forward and backward turns caught mid-curl.

### Next
- Hand the arriving page over from a print (TECHNIQUES.md C2, the arriving half). Today the new drawing rises from flat and inks itself.
- The Lesson 1 battery could move onto the shared cutaway helper.
- Part names (Kalam labels) could also be printed in the drawing.

---

## 19 Nov 2026. Daylight look, Lesson 5 illustration, and the eight technique steps

The teacher chose **daylight** as the house look (CLAUDE.md section 4 updated; night stays as `?look=night`). The book's public build was then studied for techniques at the teacher's request. Notes are in our own words in `docs/TECHNIQUES.md`, and no code or text was copied. Built on our own code, one step at a time:

1. **Ink lines as ribbons** (`ink/creases.js`): screen-facing strips with mitred corners, a slow swell in width, tapered ends, a slight overshoot at open ends, and a fixed wobble. A pen draws each object stroke by stroke. Surfaces dissolve in only after the pen finishes.
2. **Paper shading** (`ink/inkMaterial.js`): darkness comes from a fixed drawing light, or from a real shadow. Hatching is fixed to each object in world space, with its own direction per object, capped coverage and a fade to grey when lines get too fine. The line spacing holds at any zoom.
3. **Jars** (`objects/beaker.js`, `energy/storeJar.js`): ink-only glass with gloss strokes. The liquid is brighter at its edges, with a bright surface, a swirl and rising bubbles. The store pattern is kept.
4. **Energy tubes** (`energy/flow.js`): a glowing tube along each transfer, with its colour blended the short way round the hue circle and a motion for each pathway. The particles remain as beads.
5. **Light:** window light across the desk (a spotlight pattern drawn in code), three coloured lights that tint the paper near full jars, and warm ambient occlusion.
6. **Page turns:** the drawing folds flat before every turn. The leaf curls with its top corner leading over 1.1 s, then the drawing rises and re-inks on the new page. The page text is still HTML laid onto the page, not yet printed into the page texture.
7. **The flap and the stamp:** a two-sided flap hinged at the top. Completing a lesson presses a "Balanced" ledger stamp onto the exit page and marks the lesson on the contents page.
8. **Mannequin people:** shaped lathe limbs with sphere joints and an oval head.

**Lesson 5 page:** a store stand with paper cards printed in perspective (`overlay.addPrinted`), an open-frame half-pipe, ruler numbers printed beside the ruler, no floating tags, a slim ledger and a floating toolbar.

**Checks:** 196 unit tests pass. In the full suite, 149 passed. Two tests timed out under load and pass when run alone.

### Later the same day
- **Store stands in every lesson** (`scenes/stand.js`, `energyKit` `stand: true`). Lesson 8 builds its own stand. Each jar's name and joules (and time in Lesson 8) are printed on a card.
- **Printed readings:** rulers print their numbers beside the ticks (`addRuler`). `helpers.addNote` prints the dent depth on the clay block (Lesson 3), and the push force and jar scale in Lesson 7.
- **Cutaway:** tapping Lesson 1's battery cuts its front half away with a clipping plane, showing a glowing chemical core inside (`renderer.localClippingEnabled`).

### Next
- Print the page text into the page texture, so it turns with the leaf. This is the largest remaining gap. Today the text is HTML laid onto the page in perspective.
- Cutaways for the kettle (Lessons 2 and 8).
- Part names (Kalam labels) could also be printed in the drawing.

---

## 19 Nov 2026. Drawing pass (approved from the sample)

### House ink style is now D (approved by the teacher)
`INK_PRESETS.D` in `src/ink/inkMaterial.js`, `HOUSE_INK = 'D'`. It keeps look C's bold outline but shades lightly:

| Setting | C (old) | D (house) |
|---|---|---|
| Outline | 3.0 px | 2.8 px |
| Lines (creases) | 2.0 px | 1.7 px |
| Hatch spacing | 6.5 px | 5.2 px |
| Hatch line width | 1.35 px | 0.8 px |
| Thresholds | 0.75, 0.5, 0.25 | 0.52, 0.24, 0.08 |
| Light reference | 0.75 | 0.72 |
| Flatten shading | 0.85 | 0.985 |
| Shaded-side tint | warm (1.13, 0.98, 0.78) | near paper (1.04, 1.0, 0.93) |
| Body colour lift towards paper white | none | 0.5 |

Hatching now starts only in real shadow, and shaded faces stay paper-coloured. Objects read as white paper forms with ink.

### Also
- **Brighter page:** softer vignette (offset 0.45, darkness 0.25) and more cool fill (hemisphere 0.5). Checked with `?debug=hot`: only the energy glow is above the bloom threshold.
- **People:** `src/objects/figure.js` builds people on a jointed skeleton (stand, push, carry, skate). The L7 person leans into the push, and the L8 people hold their bags.
- **Skateboarder:** the skate pose on a kicked board with wheels.
- **Kettles:** `src/objects/kettle.js` gives a real kettle (body, lid, knob, handle, spout) in L2 (smaller, so it no longer dwarfs its jar) and L8.
- **Test screenshots:** `settle()` skips the text page's fade back in, so screenshots of pages with guided steps show the finished page.
- **Checks:** the full suite passed, except one development-demo check that timed out under load and passes alone.

### Next
- Jar label cards and jars built into each apparatus.
- The kettles may read as teapots. Taller, with a flat lid, if the teacher wants.

---

## 19 Nov 2026. Guided camera steps (approved from the Lesson 5 sample)

- **What it is:** a page can play short narrated steps before the student takes over (`page.beats: [{ say, shot, action, seconds }]`, played by `book/beats.js`). The camera glides to close-ups the scene names (`scene.shots`), the text page fades aside while it is close in, and the last step returns to the page and hands over ("Your turn ...").
- **Bottom bar:** the step sentence, progress dots, pause or replay, and skip.
- **Stopping:** touching the model, the controls or the view stops the steps, returns the camera and shows the last step. A predict page plays its steps only after the prediction is in. With reduced motion the camera never moves, but the sentences still step through. Steps and camera blends follow the clock, so slow devices keep pace.
- **Pages with steps:** the explore pages of every lesson (L1 two, L2, L3, L4, L5 two, L6, L7, L8 two). Steps point out the parts and hand over. They only run an action where it was already the point of the page (L2 runs one device, L5 rolls her once after the prediction, L6 drops the ball once). The students still do the investigating.
- **Shots:** `shotOf` and `shotOfJars` in `scenes/helpers.js` frame any objects by their size. The L5 friction page has a glow of the internal store's colour along the ramp under the board while she moves.
- **Tests:** `tests/beats.spec.js` (steps play and hand over, touching stops them, reduced motion keeps the camera still). Page screenshots call `settle()`, which hands the steps over first. Full suite: 196 unit tests, 150 passed with 69 intended skips. One handling test timed out under load and passes alone. It now waits for its result.

### Known limits
- The close-ups expose the blocky skateboarder and people. Better figures would help these shots most.

---

## 19 Nov 2026. Textbook page design (approved from the Lesson 5 sample)

From the strict comparison with Every Joule: the left page now reads as a designed textbook page rather than a form.
- **Typesetting:** running head ("The Energy Ledger · Lesson N") with a rule, red kicker, lighter and larger title, regular-weight body, page number in the corner. Printed text is 22 px on the fixed page.
- **Boxed equations** with the word equation underneath (`page.equations`), on the first use page after each term is named (L3 Ek, L4 Ep, L7 W = F × d, L8 P = E/t), the L5 explore page and the L6 explore page. The L8 word equation is a KaTeX fraction (`wordFrac`). **Key words** in small type (`page.keyWords`), and name pages list the terms they name.
- **Ink controls:** slider line and knob, round − and +, pill buttons, square tick-boxes, ruled answer lines, a thin printed work frame.
- **Lift the flap:** after a check, a paper card shows the verdict ("Right" or "Not yet") and the reason sits under a flap the student lifts. Saved answers come back lifted.
- **Figure captions** printed under each diagram (`scene.figure`): what it shows and its scale, plus the handling hint on explore pages (and on predict pages once the prediction is in). Labels keep clear of the caption, and the page check fails if one covers it. The L3 and L7 scenes moved back so their rulers clear the caption.
- **Left out:** handwritten working in the margin, because CLAUDE.md keeps the handwritten font for part names only.
- Tests: 196 unit tests. Every page passes at five sizes. The handling tests now wait for results rather than a fixed time, because software rendering is slow under load.

---

## 19 Nov 2026. Presentation rework (approved from the Lesson 5 sample)

Learned from Every Joule (no code, text or assets taken): the diagram should be the main thing on screen, the text should read as printed, and students should handle the objects.
- **Camera:** 38 degrees (was 50), the book fills 97% of the width (was 85%). Diagrams read large and solid.
- **Printed page:** in landscape the text panel and the ledger bar are laid out at a fixed page size (600 px wide, text at 24 px) and mapped onto the pages in perspective with a CSS matrix3d (`layout.js` `quadMatrix`). They stay HTML, so they are sharp, accessible and interactive. A page fits the same way on every screen. Stacked layouts (portrait, near-square) keep the flat panel.
- **Handling:** `core/pick.js` takes taps and drags on scene objects before the orbit sees them, with an invisible larger target for small objects. Any lit object whose action exists is a tap (L1 objects, L3 car, L6 ball, L7 person). L2 devices and L8 people or kettles are taps that run. Drags: L5 skateboarder (either wall, sets the start height, lets go to run, stays put on the predict page until committed), L4 box (snaps to the nearest shelf), L6 ball (sets the drop height, lets go to drop). Sliders and choices follow the drag.
- **Fixes on the way:** the L5 ruler and start line and the L6 rule and floor stand at the object's depth, so heights read true (audit items 9 and 14). The L6 column moved forward at 1 : 12 so it clears the jars. The ribbon runs beside the gutter. "Tap the the Sun" fixed. The L6 ball cue no longer points at a removed ball.
- **Tests:** `tests/handle.spec.js` (drag the skateboarder, predict lock, drag the box, drag the ball, tap the car). Full suite: 148 passed, 57 intended skips.

### Next
- Print the jar labels as paper cards on the jars.
- Guided steps in the bottom bar (narrated beats with progress dots).
- The rest of `docs/AUDIT.md`, from group 2 (missing student activities).

---

## 19 Nov 2026. Audit, group 1 fixes, new CLAUDE.md

### Audit
- `docs/AUDIT.md` lists about 150 gaps between the book and its plan, from biggest to smallest, with a suggested order of work.

### Group 1 fixes (correctness)
- The P = E/t fraction renders (the backslash was lost in a template literal). `tests/maths.test.js` checks it. The teachers' page links KaTeX's stylesheet.
- Lesson 2 no longer says heating needs matter. The heating option is removed from the solar-light question, and the exit item "The Sun warms the Earth" is now "A phone sends a signal to a mast" (radiation counts as heating in the syllabus, so both answers were defensible).
- Windows narrower than 1.3 : 1 use the stacked layout (diagram above, text below). On a near-square window the left page was too short and the Run button was cut off.
- Labels stay inside the visible stage. Labels for objects outside it are hidden. The framing keeps the jars and their labels in view. The Lesson 4 jar moved off the spine.
- While a question asks for them, scenes hide fills and the ledger bar as well as numbers. Lesson 2 hides pathway lines and store names on its question and notes pages. The Lesson 3 dent label hides too.
- Tests: a fifth Playwright size (`window-square-1355x1205`), and every page check now fails if a label leaves the stage. 194 unit tests pass. Every lesson page passes at all five sizes.

### New CLAUDE.md
The teacher replaced `CLAUDE.md` wholesale with the original pre-Phase-1 version (copied from `CLAUDE_1.md`). It now asks us to reference and learn from Every Joule. It also brings back things the book was built without, so the code and `docs/LESSON_PLAN.md` no longer match the spec:
- Syllabus: O-Level 5086. The only syllabus in `docs/` is the G2 SEC PDF.
- 9 lessons with Lesson 9 on efficiency. The book has 8 lessons.
- Seven stores including electrostatic potential, and "nuclear potential" as a name. The book has six stores.
- Terms "mechanical work" and "electrical work". The book uses "transferred mechanically" and "transferred electrically".
- The house ink table (look C) is no longer in the spec. The values are still the defaults in `src/ink/inkMaterial.js`.
Nothing in the code has been changed to match yet. Waiting for the teacher to confirm which of these to act on.

**Resolved the same day.** The teacher chose to keep the G2 SEC syllabus and the book as built. The syllabus-dependent lines in the new `CLAUDE.md` were brought into line: G2 SEC syllabus, 8 lessons, six stores (no electrostatic, "nuclear" not "nuclear potential"), the "transferred mechanically/electrically/by heating/by propagation of waves" terms, no efficiency, and the lesson data example. Everything else in the teacher's file stands as written, including the instruction to reference and learn from Every Joule.

---

## 20 Nov 2026. Phase 7 (game, sound, teachers' page, accessibility, deployment)

### 7A. Ledger Run
- `physics/game.js`: eight levels (one ramp, two ramps, spring launcher, spring and tower, the lift, lift and spring, speed gate, the five-part machine). Inputs are start height (Ep = mgh), spring energy in joules (given, ½kx² is not in the syllabus), and motor times (E = P × t). Every part states its loss in joules. A level is won when the energy left at the target is within half an input step of what it needs.
- Scoring: 100 for the target, +50 for the least input energy, +25 × streak for first-try clears. No speed bonus. Three tries per level, then the worked accounts are shown.
- Tests prove every level can be solved from the physics alone, level 1 is solved explicitly (0.45 m), and a random setting wins under 10% of the time on every level.
- `scenes/ledgerRun.js`: the machine at 1 : 10 with each part's numbers labelled on the part, five jars and the machine's accounts. `book/gamePage.js`: the game and win pages.

### 7B. Sound, teachers' page, accessibility
- `docs/SOUND_LIST.md` lists the ten sounds. `npm run sounds` joins `public/audio/raw/*` into the sprite with ffmpeg. Sounds are wired to page turns, draw-ins, answers, bounces, the clay and the spring. Until the files exist, the book is silent and nothing breaks.
- `teachers.html` is generated on every build from the lesson data: every page's text, every question with its answer, the feedback for known mistakes, model answers, game solutions, the glossary and the sources. Printable, no WebGL.
- Accessibility tests pass: keyboard only (Tab, Enter, arrows, PageDown), visible focus rings, HTML button twins for scene objects, reduced motion (no draw-in or page curl), and the WebGL fallback message linking to the teachers' page.

### 7C. Deployment and performance
- `.github/workflows/deploy.yml` builds, runs the unit tests and publishes to GitHub Pages on every push to main. The Vite base is relative (`./`), so it works at any path.
- **Not live yet.** The repo is private, and GitHub Pages on a free account needs a public repo. The teacher must either make the repo public (Settings, General, Danger zone) or use GitHub Pro, then turn on Pages with "GitHub Actions" as the source (Settings, Pages).
- Bundle: 493 kB of JavaScript gzipped (budget 1.2 MB). Each lesson is its own chunk. KaTeX loads only with Lesson 8.
- Frame time on this laptop's Radeon RX 9070: 60 fps on every tier for the heaviest pages (Lesson 6 bounce, game level 8). SwiftShader numbers measure the CPU only. **An iPad test is still needed.**

### 7D. Teacher Hub link
- **Not built.** `docs/reference/` is empty, so the Lesson 5 deck's Teacher Hub protocol is not available, and the rule is to copy it exactly rather than invent one. Every committed answer already goes to `hub/report.js` with its stable id, so wiring it later is one file.

### What the teacher needs to do
1. Make the repo public or use GitHub Pro, then enable Pages (see 7C). Then test on a student iPad and the projector.
2. Put the skatepark photo at `public/photos/skatepark.jpg` (Lesson 5 hook).
3. Get the ten sounds in `docs/SOUND_LIST.md`, put them in `public/audio/raw/`, and run `npm run sounds`.
4. Put the Lesson 5 deck with the Teacher Hub code in `docs/reference/` for Phase 7D.
5. Review the decisions logged in Phases 3 to 6 (tone mapping ACES, light reference 0.75, the 85% framing, the four-times slow motion in the demo, the braking figures from the UK Highway Code).

### Known limits
- Short written answers are checked for key ideas, not marked like an exam. The model answer appears after the student commits.
- The skateboarder and people are simple ink figures.
- The page turn bends on the CPU rather than in a vertex shader.

---

## 20 Nov 2026. Phase 6 (Lessons 1, 2, 3, 4, 6, 7 and 8)

Every lesson follows Lesson 5's structure (hook with today's questions, explore before any question, name, use, check on new cases, a notes page students complete, an exit ticket that returns to today's questions). All pass: question marking tests, writing-rule tests, and every page at four sizes with no scrolling and no label overlap.

| Lesson | Scene | Pages | Notes |
|---|---|---|---|
| 1 Energy stores | six jars, six objects, energy flows to the matching jar | 11 | No joules (before any equation). |
| 2 Energy transfers | catapult, kettle, torch, speaker, with chained pathways | 12 | Sound scene added (mechanical waves). |
| 3 Kinetic energy | toy car into clay at real size, dent ∝ energy, table of runs | 11 | Hook: UK Highway Code braking distances. |
| 4 Gravitational potential energy | shelves 0.5 to 2.0 m at 1 : 20 by a metre rule | 11 | Hook: durian mass and tree height (cited). |
| 6 Bouncing ball | ball at 1 : 10 by a metre rule, elastic store, sound ripples, step mode | 11 | Tennis ball keeps 55% (ITF rule). Includes the energy-in equals energy-out ledger from the old Lesson 9. |
| 7 Work done | push a crate or a wall, force arrow and distance to scale | 12 | Jar scale steps to 100 J for small amounts, with a note. Links braking back to Lesson 3. |
| 8 Power | stairs race and two kettles | 12 | P = E/t rendered as a fraction with KaTeX. |

### Facts checked (`src/lessons/sources.js`)
- Braking distance 14 m at 30 mph and 55 m at 60 mph (UK Highway Code, via Cornwall Council). **No official Singapore table was found online.** The teacher may want Basic Theory of Driving figures instead.
- Durian 1 to 3 kg, wild trees 25 to 50 m (Wikipedia).
- Tennis ball rebound 135 to 147 cm from 254 cm (ITF 2023 technical booklet).

### Engine changes made while building them
- Runs table in the work box (`scene.records`). Kit options: no ledger, no joules, compact staggered labels for four or more jars, custom jar positions. Labels have a soft paper backing. Panel fit is re-checked as content grows. Table layout for fill-the-blank questions.

---

## 20 Nov 2026. Phase 5B (Lesson 5, energy on a ramp)

### Done
- `physics/models/ramp.js`: half-pipe y = kx² (3.2 m walls, 6.8 m across). Speed always comes from the energy left over, so the ledger is exact. Friction is a constant force (3.5% of the weight) and the internal store grows by work done = F × d. With no friction the model stops after four passes, so the render loop can idle.
- `objects/halfPipe.js` (one hatch layer, so it does not compete with the rider), `objects/skater.js`, `scenes/ramp.js`: drawn at 1 : 50 beside a height ruler, a dashed line at the start height, a "pause at the bottom" speed reading, three jars on one page scale (the largest possible start energy, 2400 J, so the smallest start, 150 J, still fills 6%).
- `lessons/l5-ramp.js`: 14 pages. Hook, predict (unmarked, reason required, run locked until committed), explore (height and mass), name the principle (built in four steps, ending with the notes' exact wording), explore with friction, name the internal store of the surroundings, use (v = √(2gh) on a new slope), use (mass cancels, MCQ), check (roller coaster dip), check (ledger with friction), close the loop (playground slide, short answer), notes (cloze for the principle), notes (ledger table), exit (today's questions).
- Engine changes found while building it: pages can set the scene up as data (`sceneState`) and hide the scene's numbers while a question asks for them (`hideValues`). Overflowing panels switch to denser spacing automatically. The landscape book is framed at 85% of the width (was 80%) to give the text page room.
- Tests: `tests/ramp.test.js` (ledger with and without friction, start height reached, lower peaks with friction, bottom speed from mgh = ½mv², mass independence, ramp to scale), `tests/lessons.test.js` (every question in every lesson: ids, right answers, every known mistake has its own feedback, parallel MCQ options, cloze banks, model answers contain the key ideas), `tests/lessons.spec.js` (every page at four sizes, fits with no scrolling, no label overlap).

### Strict review (weak Sec 3 student on an iPad), scores out of 10

| Page | Clarity | Beauty | Student thinking | Notes |
|---|---|---|---|---|
| 1 Hook | 8 | 8 | 6 | Real event with a twist. Needs the teacher's skatepark photo. |
| 2 Predict | 9 | 8 | 9 | Reason required, run locked until committed. |
| 3 Explore | 8 | 8 | 8 | Instruction, sliders and buttons in one box. |
| 4 Name the principle | 9 | 8 | 6 | Built step by step. Students read rather than do. |
| 5 Friction on | 9 | 9 | 8 | Internal jar fills visibly, total line still. |
| 6 Name the surroundings | 8 | 8 | 6 | |
| 7 Use (slope) | 9 | 7 | 9 | Feedback for missing root, missing 2, gh. |
| 8 Use (mass) | 9 | 7 | 8 | Parallel options, each with its own feedback. |
| 9 Check (coaster) | 8 | 7 | 9 | Catches using the full height or the dip height. |
| 10 Check (ledger) | 8 | 7 | 9 | Catches Ep only, Ek only, adding, not squaring. |
| 11 Playground slide | 8 | 7 | 9 | Closes the hook. Key-idea feedback plus model answer. |
| 12 Notes (principle) | 9 | 7 | 7 | |
| 13 Notes (ledger) | 9 | 8 | 8 | Scene values hidden until answered. |
| 14 Exit | 9 | 7 | 8 | Returns to today's questions. |

Changed during the review: predict options shortened, hook text shortened, ruler labels moved off the ramp wall, the half-pipe limited to one hatch layer, the ledger notes made a table, and answer values hidden on the ledger notes page.

### Open points
- The skateboarder is small (1 : 50) and blocky. It reads as a figure on a board, but a better ink figure would help.
- Short answers are checked for key ideas only. The model answer is shown after the student commits.

---

## 20 Nov 2026. Phase 5A (the book engine)

### Done
- `book/book.js`: opens a lesson (lazy-loaded), turns pages, swaps scenes only when the scene changes, draws each new diagram in after the turn, saves progress, applies the lit-object cue (lift by 6 mm), locks the run on predict pages until the prediction is committed, reports every committed answer to `hub/report.js`.
- `book/pages.js`: page types hook (with today's questions on the first page and a photo slot), predict (MCQ plus reason, not marked, unlocks the run), explore (instruction, controls and actions in one work box), name (adds terms to the glossary, reveals steps one at a time), use, check, notes and exit (one question at a time).
- `book/layout.js`: landscape puts the text, question and controls on the left page and the diagram and ledger bar on the right page. Portrait frames the right page at the top with a text panel below. The contents page uses the whole spread. The stage keeps the bottom bar (and the portrait panel) clear with a camera view offset.
- `book/pageTurn.js`: the leaf curls as it turns (each column of the page lags with distance from the spine). The bend is computed on the CPU rather than in a vertex shader, which is simpler and keeps the paper shader identical to the pages.
- `ui/hud.js`: contents, back, title, next, sound, quality, full screen. Arrows and PageUp/PageDown turn pages (arrows are left alone while a slider or text box has focus).
- `ui/controls.js` (sliders with − and +, switches, choices, action buttons), `ui/checks.js` and `ui/marking.js` (MCQ, MCQ with reason, numeric with units and known-mistake feedback, short answer with key ideas and a model answer, fill the blanks, match or label, ordering), `ui/glossary.js`, `ui/progress.js` (localStorage in try/catch).
- `scenes/energyKit.js`: the jars, flows, display ledger, ledger bar and labels every lesson scene shares. `scenes/index.js` lazy-loads scenes.
- `core/sound.js`: muted on wide screens by default, starts only after the first tap, loads the sprite only if it exists (Phase 7B supplies it).
- `hub/report.js`: queues answers in memory only, until the teacher's reference deck arrives (Phase 7D).
- Tests: marking (7), writing rules for every lesson (semicolons, dashes, colon fragments, Singlish markers), book pages at four sizes (panel must fit with no scrolling, no label overlap).

---

## 20 Nov 2026. Phase 4 (energy you can see)

### Done
- `energy/palette.js`: the six stores with syllabus names, colours, patterns (chevrons, bands, zigzag, dots, waves, rings) and SVG icons, the four pathways in syllabus words, colour maths and the Machado (2009) colour-blind matrices.
- `energy/storeJar.js`: the beaker becomes a jar of glowing liquid. Fill height is proportional to joules on one page scale. The pattern moves only while energy flows. Jars are drawn at 60% of a real beaker, so three fit across a page.
- `energy/flow.js`: particles along a CatmullRom curve, four path styles (arrows and an arrow-headed path for mechanical, dots and a double line for electrical, shimmer and a wavy line for heating, rings and a dotted line for waves). `TransferLedger` keeps source + in transit + destination constant at every frame.
- `energy/displayLedger.js`: what the jars show while energy is visibly travelling. Tested to balance within 0.1% at every frame and never go negative.
- `energy/ledgerBar.js`: SVG stacked bar with each store's pattern, an "in transit" segment and a fixed total line, plus a key with icons and values.
- `ui/overlay.js`: HTML labels from 3D points, placed to avoid each other and every glow (tested).
- Bloom (mipmap blur, threshold 1) before tone mapping. Lower tiers use fewer mip levels.
- `physics/models/springLaunch.js` and `demo/energyDemo.js`: spring to ball to internal store, using only Ek = ½mv², W = F × d and F = ma. The spring's starting energy is given, because ½kx² is not in the syllabus.
- `format.js` shows rounding leftovers below 10⁻¹² as 0.

### Decisions made without stopping (for the teacher to review)
1. **Tone mapping is now ACES.** Under AgX the glows looked pastel. ACES keeps the store colours strong and the paper warm.
2. **Glow brightness** is a luminance of 1.3, just above the bloom threshold. Brighter values washed the colours towards white.
3. **Palette unchanged.** The colour-blind check found gravitational (blue) and elastic (purple) nearly identical under deuteranopia (ΔE 2.8). Their patterns and labels differ, which is what the spec requires, so the colours stay. The simulation sheet is `tests/screenshots/laptop-1366x768/sheet-colour-blind.png`.
4. **The demo runs four times slower than real time**, because the real ball stops in under half a second. Any lesson that slows time must say so on the page.
5. Demo friction was raised so the ball stops on the page, as rule 5 requires.

### Checks run
- 55 unit tests pass. Playwright energy checks pass at four sizes (the portrait bloom check is skipped because this demo's jars are on the left page, which portrait does not show).

---

## 19 Nov 2026. Phase 3 part 2 (house style locked: look C)

The teacher chose **C (bold, illustrated)** and asked for every remaining phase to run without stopping for approval. From here on, decisions the spec would normally show first are made and logged in these entries for the teacher to review.

### Done
- `INK_PRESETS.C` is the default (`HOUSE_INK`), written into `CLAUDE.md` section 4 as the house ink settings table.
- Two changes to C after testing on more objects (recorded in the table): light reference 0.9 to 0.75, so dark faces get two hatch layers rather than three, and the flattened body colour now takes the warm colour of the lamp-lit page. Before this, shaded sides turned blue-purple from the window fill light.
- `ink/inkObject.js`: wraps any geometry as an ink drawing (body, hull, creases, extra lines, draw-in pieces).
- Test objects: `objects/ball.js` (tennis ball with its seam), `objects/crate.js` (plank-framed crate with braces), `objects/spring.js` (helix tube, rebuildable at any length). `?demo=objects` shows them.
- Line width and hatch spacing checked at all four sizes: they scale with the viewport, so the drawing keeps the same proportions.

---

## 19 Nov 2026. Phase 3 part 1 (ink style on one beaker), waiting for the teacher to choose A, B or C

The teacher approved Phase 2 as it stands.

### Done
- `objects/lathe.js`: profile to lathe mesh, seam welded (no cracks), creased normals for shading, a separate smooth-normal copy for the outline.
- `objects/beaker.js`: 250 ml low-form beaker at real size (70 mm across, 95 mm tall, 1.3 mm glass, 2 mm base), rolled lip, pouring spout. Ink rings at the lip top, the inside of the lip (so the glass thickness shows), the base edge and the inside base. Two side silhouette lines that turn to face the camera.
- `ink/outline.js`: inverted hull in clip space, constant screen width, a slight swell along the line, drawn after the glass and depth-tested against it.
- `ink/creases.js`: EdgesGeometry creases and polylines with LineSegments2 and LineMaterial, a fixed low-frequency wobble injected into the line shader (under 0.6 px), and segments joined into chains so lines draw as strokes.
- `ink/inkMaterial.js`: screen-space hatching in MeshLambertMaterial after `lights_fragment_end`, thresholds 0.75, 0.5 and 0.25, fwidth anti-aliasing, spacing in ink pixels. Tone is measured against the light falling on the page beside the object (from `core/stage.js`), so a surface as bright as the page is bare paper. Glass is hatched with one layer at most and only on its outer surface. The pattern is anchored to each object's projected centre (no shower-door effect). Ink pixels scale with the viewport, so the drawing keeps its proportions at every size.
- `ink/drawIn.js`: pop-up spring (3.8% overshoot), lines draw themselves with dashes, then the form fades in. Reduced motion shows everything at once. Invisible glass does not write depth, so ambient occlusion cannot shade the page before the glass appears.
- `ui/debug.js`: `?debug=1` panel with sliders (each with − and +) for every ink value, the three presets and a replay button.
- `demo/beakerDemo.js`: the development scene. Not lesson content.
- Test tooling: `tests/ink.spec.js` (presets, close-ups, draw-in frames, bloom check), `tests/compose.spec.js` (comparison sheets). Playwright now always starts a fresh server, after a leftover preview server served a stale build once.

### Checks run
- `npm run test`: 41 passed. `npm run build`: no warnings, JS 333 kB gzipped.
- Playwright: 54 passed at the four sizes, including the bloom check with the beaker (0 pixels above 1).

### Not checked yet
- The hatching was not looked at mid-drag, so the anchoring (no shower-door effect) is untested by eye.
- Line width and hatch spacing across the four sizes are checked in part 2, after the choice.

### Waiting on the teacher
Choose A, B or C (or a mix). Then part 2: lock the values as defaults, write them into `CLAUDE.md` section 4, and draw a ball, a wooden crate and a spring in the same style.

---

## 19 Nov 2026. Phase 2 (the stage), approved

### Done
- `core/renderer.js`: WebGL2, DPR from the tier (never above 2), sRGB output, no renderer tone mapping (post does it), soft shadows. three r18x removed `PCFSoftShadowMap`, so this uses `PCFShadowMap` with `shadow.radius`.
- `core/loop.js`: render on demand. Holds (drag, probe, measure) plus "still moving" from the spring. A test confirms the loop is idle within 2 s.
- `core/quality.js`: three tiers, a 2 s probe, `?q=` override, saved-setting hook for Phase 5A.
- `ink/paper.js`: procedural paper (fbm mottling, tooth, fibres, darker gutter, aged edges), with detail that fades below a pixel so it never shimmers. Shared `NOISE_GLSL` and `injectVaryings` for every procedural material.
- `objects/book.js`: A4 open hardback at real scale. Curved pages with a gutter dip and a slight bow, extruded page blocks with leaf lines, cloth boards, cloth spine, headbands, flat ribbon bookmark draped onto the desk.
- `objects/desk.js`: dark wood with procedural boards and grain. `objects/nightWindow.js`: wall, window frame, deep blue sky with a few faint stars (all well under the bloom threshold).
- `core/stage.js`: warm spot lamp from the upper left (only its pool is seen), a little lamp spill for the wall, cool window fill, hemisphere ambient, and a soft contact shadow under the book. Camera framing is fitted by projecting the book's corners: 80% of the width in landscape, the right page at 90% in portrait.
- `core/input.js`: drag orbit limited to 15 degrees with a soft edge, springs back with under 4% overshoot (unit-tested), and picks up mid-return without a jump.
- `core/post.js`: HalfFloat composer, N8AO (high tier only), AgX or ACES tone mapping, vignette, still film grain (custom, because the library's grain animates every frame and would stop the loop from idling), SMAA. `?debug=hot` shows luminance with orange above 0.9 and red above 1.
- WebGL fallback message linking to `teachers.html`.
- `scripts/check-budget.js` runs after every build (JS 317 kB gzipped of 1.2 MB). `scripts/perf-gpu.js` measures frame time on the real GPU.

### Checks run
- `npm run test`: 41 passed (37 physics, 4 drag-orbit).
- `npm run build`: no warnings, budget OK.
- Playwright: 36 passed across the four sizes (high and low tier, ACES, intro view, mid-drag with spring-back to idle, bloom-threshold check, idle check, frame time, probe).
- Bloom threshold: 0 pixels above 1 and 0 above 0.9 at every size. The brightest lit paper is about 0.87.
- Frame time on the low tier: about 250 ms in SwiftShader (software rendering, so this measures the CPU, not a device). On this laptop's real GPU (Radeon RX 9070) every tier holds 60 fps and the probe picks high. Neither number says anything about an iPad. A real iPad test is needed.

### Decisions for the teacher
1. **Tone mapping.** AgX (default) or ACES. ACES looks warmer and richer on the paper now. AgX keeps very bright, saturated colours closer to their true hue, which matters for the energy glows in Phase 4. Recommendation: decide in Phase 4 when the glows exist.
2. **The window.** At a 50 degree view with the book filling 80% of the width, the camera looks down at the desk and the window cannot be in frame (the top of the frame is about 35 degrees below horizontal). So there is a second, wider `intro` view (`?view=intro`) that shows the window, sky and book. Proposal: the book opens on the intro view, then the camera settles to the 50 degree reading view.

### Notes for later phases
- `toneMapped: false` on a material does not escape the post-processing tone mapping, because it is a full-screen effect. Energy still blooms through the luminance threshold, but its colour is tone-mapped like everything else. Phase 4 should check energy hues after tone mapping, and the colour-blind check must use the final image.
- Portrait framing will change in Phase 5A, when the text panel sits below the diagram.

### Next
Teacher reviews the screenshots. Then either more Phase 2 polish or Phase 3 (ink style on one beaker). Suggested: deploy to GitHub Pages now, so the stage can be tried on a real iPad (needs a public repo or GitHub Pro).

---

## 18 Nov 2026. Phase 1 (syllabus check and project setup)

### Done

**Part A. Syllabus coverage** (`docs/SYLLABUS_COVERAGE.md`)
- Confirmed the syllabus is the **K223/K224/K225 G2 Science SEC syllabus** (first exam 2027), not O-Level 5086. Copied to `docs/syllabus.pdf`.
- Mapped every Topic 5 (Energy) outcome, plus the related outcomes in Topics 3, 4, 6, 7, 9 and 12, to lessons.
- Used the teacher's Sec 3 lesson notes as the term reference, because no energy textbook pages were supplied.
- The teacher accepted all six proposals:
  1. Lesson 9 (efficiency) removed, because efficiency is not in the syllabus. Its "energy in = energy out" ledger moved into Lesson 6 as a use page, in joules only.
  2. Six stores (kinetic, gravitational potential, elastic potential, chemical potential, nuclear, internal). The electrostatic store is removed.
  3. Pathway names follow the syllabus: transferred mechanically, electrically, by heating, by propagation of waves.
  4. Lesson 2: the spoon scene is replaced by a phone speaker (a mechanical wave).
  5. Lesson 8 uses P = E/t only.
  6. Ledger Run states losses in joules per part, not % efficiency.
- `CLAUDE.md` and `docs/LESSON_PLAN.md` updated to match. The book now has 8 lessons and the game.

**Part B. Project setup**
- Vite 8, three 0.187 (pinned to `~0.187.0`, because postprocessing 6.39.6 supports three below 0.188), postprocessing, n8ao, howler, KaTeX, Newsreader (variable, optical size) and Kalam (Latin 400 only), Vitest 5 and Playwright 1.65.
- Folder structure from `CLAUDE.md` section 3, with empty module stubs. `src/lessons/index.js` lazy-loads each lesson.
- `src/physics/constants.js` (g = 10 N/kg, 0.1% ledger tolerance), `equations.js` (Ek, Ep, work done, power, weight, and their rearrangements, with input checks), `format.js` (significant figures, unit always present, space-grouped thousands from 10 000, no scientific notation).
- `tests/physics.test.js`: 37 tests, all passing. They include the worked examples from the teacher's notes (2500 J, 20 W, 30 000 J, 840 W) and the mass-independence of speed at the bottom of a drop.
- `tests/screenshots.spec.js` with `playwright.config.js`: four sizes, Chromium with SwiftShader. Checks that WebGL2 is available and that no page scrolls. All 4 pass. Screenshots go to `tests/screenshots/` (ignored by git).
- Plain title page at all four sizes. `teachers.html` placeholder.

### Checks run
- `npm run test`: 37 passed.
- `npm run build`: passes, no warnings. JS is 0.4 kB gzipped so far.
- `npx playwright test`: 4 passed. Screenshots looked at, nothing cut off or overflowing.

### Not done, and why
- No frame-rate check yet: there is no 3D scene until Phase 2.
- `npm audit` reports high-severity advisories in Vite's dev-only dependencies (picomatch, tinyglobby). They affect the local dev server only, not the built book. `npm audit fix --force` would downgrade Vite, so it was not run. Recheck in Phase 7C.

### Next
**Phase 2. The stage** (book on the desk at night). Use the Phase 2 prompt in `PHASE_PROMPTS.md`. Suggestion: deploy to GitHub Pages straight after Phase 2 (normally Phase 7C), so the stage can be tried on a real iPad early.

### Open questions
- The notes' table of the six stores is an image, so the exact name "nuclear store" or "nuclear potential store" was not confirmed from the notes. `CLAUDE.md` uses "nuclear store", as in the syllabus.
- [verify] facts still to confirm before Lessons 3 and 4: braking distances at two speeds (Traffic Police or LTA) and durian tree height and fruit mass.
- Lesson 5 needs the teacher's skatepark photo.
- `docs/syllabus.pdf` is kept out of git (it is SEAB's document), so it lives only on this laptop. Copy it in again on any other machine.
- GitHub Pages on a free account only works for a public repo. The repo (github.com/cedricboi/energy-book) is private. Before deploying, either make it public or use GitHub Pro.
