# PROGRESS.md: The Energy Ledger

Read after `CLAUDE.md` at the start of every session. Newest entry at the top.

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
