# PROGRESS.md: The Energy Ledger

Read after `CLAUDE.md` at the start of every session. Newest entry at the top.

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
