# CLAUDE.md: The Energy Ledger

Read this whole file at the start of every session. It is the spec for this project. When a request conflicts with this file, ask before acting.

Working title: **The Energy Ledger**. The teacher may rename it.

## 1. What we are building

An interactive 3D "physics book" about energy, which runs in the browser. It covers the energy chapter of the Singapore–Cambridge O-Level **Science (Physics) 5086** syllabus. Students open a hand-inked notebook lying on a desk. The diagrams rise off the page as 3D ink drawings. Energy appears as glowing colour that moves between labelled stores. Students handle every model themselves, then explain what they saw.

- **Teacher:** Mr Cedric, Assumption English School (AES), Singapore.
- **Students:** Sec 3 and Sec 4 G2 Science (Physics), aged 15 to 16.
- **Devices:** each student uses their own iPad (Safari). The teacher's laptop drives a classroom projector at 1920x1080.
- **Lesson length:** about 1 hour per lesson. The book has 9 lessons and 1 chapter game.

The big idea that runs through the whole book is **the ledger**. Every energy store is an account. Every transfer is a transaction. The total always balances. Students should leave able to "do the accounts" for any everyday situation.

### Inspiration, not a copy

This project was inspired by "Every Joule" by Techartist (iamtechartist.com). I need you to build something similar to it - I need you to reference and learn from it.

## 2. Tech stack

- **Vite**, vanilla JavaScript, ES modules. No React. Keep dependencies few.
- **three** (latest stable), plus addons from `three/addons/...` (`LineSegments2`, `LineSegmentsGeometry`, `LineMaterial`, `BufferGeometryUtils`, `OrbitControls`).
- **postprocessing** (pmndrs), for bloom, SMAA, tone mapping and vignette. Check its `peerDependencies` to confirm it supports the installed `three` version.
- **n8ao**, for ambient occlusion on the high quality tier only.
- **howler**, for one sound sprite (`public/audio/sfx.mp3` plus `sfx.json` offsets).
- **Fonts** (self-hosted through Fontsource): `@fontsource-variable/newsreader` for the book text and `@fontsource/kalam` for the handwritten labels.
- **Vitest**, for the physics unit tests. **Playwright**, for screenshots at the four test sizes.
- **No 3D model files.** Every object is built in code from primitives, `LatheGeometry`, `ExtrudeGeometry`, `TubeGeometry` and merged geometries.
- **No image generator** for anything that carries a value, a scale or a measurement.

## 3. Folder structure

```
energy-book/
  CLAUDE.md
  docs/                    syllabus PDF, textbook pages, reference decks (read-only input)
  public/
    audio/sfx.mp3, sfx.json
    photos/                real photos supplied by the teacher (credited in sources.js)
  src/
    main.js
    core/      renderer.js  stage.js  post.js  quality.js  input.js  sound.js  loop.js
    ink/       inkMaterial.js  outline.js  creases.js  paper.js  drawIn.js
    energy/    palette.js  storeJar.js  flow.js  ledgerBar.js
    objects/   lathe.js  primitives.js  (one file per object: car.js, ball.js, crate.js ...)
    physics/   constants.js  equations.js  format.js  units.js
    lessons/   index.js  l1-stores.js ... l9-efficiency.js  game.js
    book/      book.js  pageTurn.js  layout.js
    ui/        hud.js  controls.js  checks.js  glossary.js  overlay.js
    hub/       report.js   (Teacher Hub reporting, Phase 7)
    styles/    main.css
  teachers.html            plain teachers' page, works without WebGL
  tests/     physics.test.js  screenshots.spec.js
```

## 4. Art direction

### Mood

A hand-inked field notebook lies open on a dark wooden desk at night. A warm desk lamp lights it from the upper left. A window at the back shows a deep blue night sky with a few stars, which ties the book to the cinematic night-sky look of the teacher's Teacher Hub. The scene is calm and quiet. The only saturated colour in it is energy.

### Base colours

| Use | Hex |
|---|---|
| Paper | `#F4EEDF` |
| Paper shadow tone | `#D9CFB8` |
| Ink | `#1E1B24` |
| Desk wood | `#3A2A20` |
| Night sky | `#0C1230` |
| Lamp light | `#FFD9A0` |

### Energy store palette

Each store has one colour, one pattern and one icon. **Colour is never the only cue.** The pattern and the label carry the meaning for colour-blind students.

| Store | Hex | Pattern inside the glow | Icon |
|---|---|---|---|
| Kinetic | `#FF5A3C` | forward chevrons | arrow |
| Gravitational potential | `#3C8CFF` | horizontal bands | up arrow on a shelf |
| Elastic potential | `#B45CFF` | zigzag | spring |
| Chemical potential | `#22C47A` | small dots | battery |
| Internal (thermal) | `#FFA62B` | wavy lines | thermometer |
| Electrostatic potential | `#FFE13C` | sparks | plus and minus |
| Nuclear potential | `#FF4FA8` | rings | atom |

Run a colour-blind simulation (deuteranopia and protanopia) on the palette in Phase 3. Adjust it if two stores cannot be told apart by both pattern and label.

### Line and shading rules

- **Silhouettes** come from an inverted-hull outline. Use a back-face mesh pushed along smooth normals in view space, so the line keeps a constant screen width (about 2.2 px at 1366x768). Merge vertices first so the hull has no cracks.
- **Creases** use `EdgesGeometry` (threshold about 30°) drawn with `LineSegments2` and `LineMaterial`, so the lines can be thicker than 1 px.
- **A slight wobble:** low-frequency noise displaces the line vertices by under 0.6 px, so the lines feel hand-drawn but never shimmer. The noise is fixed per object, not animated.
- **Hatching:** inject screen-space hatching into `MeshLambertMaterial` with `onBeforeCompile` after `#include <lights_fragment_end>`. Compute a tone from the lit luminance. Tone above 0.75 is bare paper. Between 0.75 and 0.5 add one hatch layer at 45°. Between 0.5 and 0.25 add a second layer at -45°. Below 0.25 add a third, denser layer. Anti-alias the lines with `fwidth`. Hatch spacing is set in screen pixels, so it looks the same at every zoom.
- **Paper texture:** procedural fbm noise plus faint fibres in the page shader. No image files for paper.
- **Draw-in:** when a page opens, its lines draw themselves using `LineMaterial` dashes (`dashSize` equal to the line length, animating `dashOffset`), over 0.8 to 1.4 s. Then the solid forms fade in. Then the energy appears.
- **Pop-up:** diagrams rise from the page with a soft spring (overshoot under 4%).
- **Energy glows. Nothing else does.** Energy materials use HDR colour (RGB multiplied above 1, `toneMapped: false`). Bloom uses `luminanceThreshold: 1`, so only energy blooms.

### Text and labels

- All text, numbers and labels are **HTML overlays** positioned from 3D points (in `ui/overlay.js`). They are not textures. This keeps them sharp, translatable and readable by screen readers.
- Handwritten labels (Kalam) are for the names of parts in diagrams only. Book text, questions and numbers use Newsreader.
- Labels have a soft paper-coloured halo. They never sit on top of an energy glow or another label.
- Body text is at least 18 px on iPad and 22 px on the projector.

## 5. Physics accuracy rules (non-negotiable)

1. **Every number on screen comes from `physics/equations.js`.** Never type a result into a lesson file.
2. Constants live in `physics/constants.js`. Use `g = 10 N/kg` (the value used in O-Level papers). Check it against the syllabus PDF in `docs/`.
3. Use only the equations and terms in the 5086 syllabus. Phase 0 makes the coverage table. Nothing outside the syllabus goes in, even as an alternative method.
4. **Energy is conserved in every simulation.** Each model keeps a running ledger. The sum of all stores, including internal energy and energy carried away by sound, must equal the starting total to within 0.1%. A unit test checks this for every lesson model.
5. **Drawings agree with their values.** A jar's fill height is proportional to its energy, with one scale per page. If the scale changes between pages, the figure says so. Heights, speeds, masses and lengths in a scene match the numbers shown (for example, a 2 m drop is drawn as 2 m against a ruler or a known object).
6. **No answer on screen before students commit.** Values that a question asks for are hidden until the student has answered.
7. Numbers are formatted by `physics/format.js`: sensible significant figures (normally 2 or 3), always with a unit and a space before it (`12 J`, `3.5 m/s`).
8. Write Vitest tests for every equation, every model's energy ledger, and every check question's marking.

## 6. Pedagogy rules (the teacher's own rules)

These come from the teacher. Follow all of them.

1. **Students work harder than the teacher.** They manipulate models, then explain. Never replace a live model with a fixed picture.
2. **Explore is always part of a lesson.** Students handle the model before they are asked anything about it.
3. **Predict only about everyday things** that students have seen in real life, such as a bouncing ball, a playground slide or a phone battery running down. Never ask students to predict a reading or a result for something they have not used. A "work it out, then check" question with greyed-out controls is predicting under another name, so it is not allowed.
4. When students do predict, every student commits to an answer **with a reason** before seeing the result.
5. **One idea per page.** Introduce ideas gently, in small steps, like a Canva build. Each step lands before the next.
6. **Name a term before students use it.** The order is: experience it, name the term, use it, then explain it in their own words.
7. **Linking:** once a term is named, the next pages make students use it, practise it and apply it to new cases.
8. **The five-stage lesson:** hook, investigated scenario, concept, test, check for understanding. The hook is a real event with a twist, and it returns at the end to close the loop.
9. Show **today's questions** at the top of the lesson. The exit ticket returns to them.
10. **Questions apply the idea to a new case.** They never match nearby wording.
11. **Feedback responds to the actual mistake.** For example, if a student forgets to square v, say so.
12. Any set of questions shows **one question at a time**, on one screen.
13. Live sliders have − and + buttons, so students can reach exact values.
14. **No busywork.** Students never copy what the page has already worked out.
15. Students' eyes always know where to look. Light or lift the object they should touch. Put the instruction inside the box they work in. Never use a separate "DO THIS" bar.
16. Every page fits one screen on the projector and on an iPad. No scrolling inside a page.
17. MCQ options are parallel in structure (if one uses "because", they all do).
18. Each lesson ends with a short **notes page in exam format**, which students must do something with (fill a blank, label a ledger, match a term), not just read.

## 7. Writing rules for all student-facing text

- Plain English. Facts and instructions, straight to the point.
- Full sentences throughout.
- **No semicolons. No em dashes. No colon-opened fragments** such as "Check:" or "Remember:".
- No Singlish or spoken-register markers. No exhortation ("don't throw away marks"). No punchy two-beat slogans. No jokes that cost clarity.
- Use the exact syllabus terms (for example "gravitational potential store", "internal store", "mechanical work", "electrical work", "heating", "propagation of waves"). Confirm the wording against the syllabus PDF.
- In equations, show divisions as fractions (render with KaTeX if needed, which is fine to add as a dependency).

## 8. Lesson data format

The content of every lesson is planned in `docs/LESSON_PLAN.md`. Follow it. If it conflicts with the syllabus, the syllabus wins, and you tell the teacher.

Each lesson is a data module. Lessons describe pages. The engine renders them. Do not put engine code in lesson files.

```js
export default {
  id: 'l5-ramp',
  title: 'Energy on a ramp',
  syllabus: ['5086 Energy: conservation of energy', 'Ek = ½mv²', 'Ep = mgh'], // from the coverage table
  questions: ['Where does the energy go as a skateboarder rolls down a ramp?',
              'How fast is the skateboarder at the bottom?'],
  hook: { ... },
  pages: [
    { type: 'hook',    scene: 'ramp', text: '...', photo: 'photos/skatepark.jpg' },
    { type: 'predict', scene: 'ramp', question: {...}, needsReason: true },
    { type: 'explore', scene: 'ramp', controls: ['height', 'mass', 'friction'], goal: '...' },
    { type: 'name',    term: 'conservation of energy', text: '...' },
    { type: 'use',     question: {...} },
    { type: 'check',   question: {...}, id: 'l5-q3' },
    { type: 'notes',   ... },
    { type: 'exit',    questions: [...] }
  ]
};
```

Every question has a stable `id` (`l5-q3`) so the Teacher Hub can chart answers.

## 9. Performance budget

- Target 60 fps on an iPad (9th generation or newer) and on a school laptop. Never below 30 fps.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- **Render on demand.** Only render while something is animating or being dragged. When idle, stop the loop to save battery.
- **Three quality tiers** in `core/quality.js`, chosen from a 2-second frame-time probe on start, with a manual override in settings:
  - **High:** N8AO, full-resolution bloom, SMAA, DPR up to 2.
  - **Medium:** no AO, half-resolution bloom, DPR 1.5.
  - **Low:** no AO, quarter-resolution bloom, DPR 1.25, fewer hatch layers.
- The first page is interactive within 3 s on school Wi-Fi. Lazy-load each lesson's module.
- Total JavaScript under 1.2 MB gzipped.

## 10. Sound

- One sprite file. Suggested sounds are page turn, pen scratch (draw-in), soft thud, ball bounce, spring stretch, spring release, kettle, click, success chime and a gentle wrong-answer tone.
- Sound starts only after the first tap (browsers block autoplay). A mute button is always visible. The book starts muted on the projector by default.
- Each sound plays with a small random pitch and volume variation, so repeats do not sound robotic.

## 11. Accessibility

- Every control can be reached and used by keyboard. Visible focus rings.
- Every 3D object a student can interact with has an HTML button twin in the overlay, labelled for screen readers.
- `prefers-reduced-motion` turns off the pop-up spring, draw-in and camera drift. Energy still flows, but more slowly.
- If WebGL fails, show a friendly message with a link to `teachers.html`.

## 12. Testing and "done"

Run all of these before saying any phase or lesson is finished:

1. `npm run test` passes (physics, energy ledgers, marking).
2. `npm run build` passes with no warnings about chunk size over budget.
3. Playwright screenshots of every page at **1920x1080, 1366x768, 1180x820 (iPad landscape) and 820x1180 (iPad portrait)**. Use Chromium with `--use-angle=swiftshader` so WebGL works headless. Look at every screenshot yourself.
4. In every screenshot, check that no text overflows its box, no label covers another label or a glow, nothing important is cut off, and the eye knows where to look.
5. Check that the frame rate is at or above budget on the low tier (log the average frame time).
6. Write a short report: what was built, what changed, anything removed and why, and anything you are unsure about.

Commit to git at the end of every phase with a clear message.

## 13. Working agreements

- **Show before deciding.** For anything visual, build one sample first and show screenshots. Wait for approval before doing the rest.
- **Keep what works.** Never rebuild a working part just to restyle it.
- Say plainly what changed and why, including anything removed.
- If something in this file seems wrong, say so and explain why. Do not quietly work around it.
- Prefer quality over speed. Let long tasks finish properly.
- Ask before adding any dependency not listed in section 2.
- Keep `PROGRESS.md` up to date. At the end of every session, add the date, what was done, what is next, and any open questions. At the start of every session, read `PROGRESS.md` after this file.
