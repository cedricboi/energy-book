# TECHNIQUES.md: what makes Every Joule look alive, and how we will do it our way

Written 19 Nov 2026 after studying Every Joule's public build, at the teacher's request, to learn its techniques. **Nothing here is their code, shader source or lesson text.** The techniques are described in our own words, and we will write our own implementations, our own lessons and our own drawings. The parameter values noted are starting points we measured, which we will tune by eye in our own scenes.

The headline: Every Joule is built the same way as our book (three.js, everything made in code, no model files, no textures from files). Its look comes from a handful of deliberate rendering choices and a lot of polish. These are the choices.

---

## A. The drawing itself

### A1. Ink lines are drawn as ribbons, with a hand-made feel
- **What it is:** every line is a polyline turned into a thin strip that always faces the screen. Each point knows its neighbours, so the strip can mitre neatly at corners, and the edge is antialiased in the shader.
- **What makes it feel hand-drawn:**
  - The width varies slowly along each stroke, driven by noise.
  - Each stroke tapers at both ends.
  - Box edges overshoot their corners slightly, like a draughtsman's line.
- **Line weights:** about 2 px for outlines and thinner for detail. The ink is a dark blue-black, not pure black.
- **The pen:** each stroke has its own start time and length. The shader hides everything past the "pen head", so a drawing inks itself stroke by stroke at a steady pen speed.
- **Ours today:** an inverted-hull outline plus fixed-width crease lines, which draw in all at once. This is the biggest single difference in line quality.

### A2. Silhouettes of round things are worked out exactly
- **What it is:** jars, mugs, bulbs and figure parts are made from a 2D profile turned around an axis. Each frame, the program finds where that surface turns edge-on to the eye and draws the outline there, as a ribbon.
- **Spheres and cylinders:** a sphere gets an exact circle and a cylinder two tangent lines.
- **Why it looks good:** outlines on curved things are clean, single and smooth, never doubled or broken.
- **Ours today:** our objects already keep their lathe profiles, so we can do the same.

### A3. "Paper" shading: lit by an illustration light, not by the real lamp
- **Tone:** each object's tone comes from a fixed, pleasant drawing light (from the upper left and towards the viewer), not from the scene lights. Real shadows still count: where the real light is blocked, the surface gets darker.
- **Colour:** objects stay near-white paper. Darkness only lowers them a little, and hatching does the rest.
- **Hatching:**
  - The lines are fixed to the object (object space), not the screen, and each object has its own direction and seed.
  - The lines wobble slightly, get thicker where darker, and break up along their length.
  - A second layer only appears in deep shadow, and coverage is capped, so no surface turns black.
  - When lines would be thinner than a pixel, they fade to their average grey, so they never shimmer.
- **Ours today:** tone from the real lights, screen-space hatching anchored per object. We'll move to the illustration light and object-space hatching.

### A4. Glass is drawn, not rendered
- **No glass surface at all.** A jar is only ink: rings at the base, shoulder and rim, an inner lip, two short highlight strokes and its live silhouette.
- **The energy liquid:**
  - An unlit glowing cylinder just inside the wall, scaled to the fill level.
  - It is brighter towards its edges (like light in liquid), with a slow swirl.
  - It has a brighter top that reads as the liquid's surface.
  - A few small bubbles rise near the wall.
- **Bloom:** only the liquid, its bubbles and the energy tubes are allowed to bloom (selective bloom). Nothing else can glow by accident.
- **Ours today:** a hatched glass mesh and a flat glowing disc, with a brightness-threshold bloom. CLAUDE.md allows selective bloom.

### A5. Labels are printed on paper in the scene
- **What it is:** a small paper tag or tilted card carries a canvas texture with the store's name in serif, the value in handwriting, and a small swatch of the store's pattern.
- **Ours:** the text is printed onto our cards in perspective (done for Lesson 5). Note that CLAUDE.md keeps handwriting for part names only, so our values stay in the book font unless the teacher changes that rule.

### A6. Energy flows as a glowing tube with beads
- **The tube:** a smooth curve with a tube around it that tapers at both ends.
- **Colour:** blended from the source store's colour to the destination's, the short way round the colour wheel, so there are no muddy greys.
- **Each pathway moves differently:**
  - mechanical: a ripple
  - electrical: sharp pulses
  - heating: a shimmer
  - waves: dashes
- **Beads:** a few glowing beads slide along the tube.
- **Thickness:** grows with power.
- **Ours today:** a thin line with particles. This maps neatly onto our four pathway styles.

### A7. Figures are artists' mannequins
- **What it is:** each body part is a smooth lathe shape (tapered, with a slight muscle bulge), joined by spheres, with realistic proportions and a slight head tilt. Legs bend with simple two-bone inverse kinematics.
- **Why it looks good:** it reads as a crafted wooden figure, and its outline is clean because of A2.
- **Ours today:** capsules on a skeleton (from the drawing pass). Next step: shaped lathe parts and exact silhouettes.

### A8. Cutaways
- **What it is:** a plane facing the camera cuts objects open. The paper is double-sided, so the inside shows, and a glowing core (the battery's chemicals, a muscle) sits inside, ringed in ink.
- **Ours:** useful for the battery and food stores in Lesson 1, and the kettle in Lesson 2.

---

## B. Light, the desk and the room

### B1. One soft key light with a window pattern
- **The light:** a spotlight placed far away acts as daylight, with soft filtered shadows.
- **The window pattern:** the spotlight carries a "cookie", a small image of window panes drawn in code. The desk shows soft bars of light and shadow, as if from a real window. This is a large part of the atmosphere.
- **Fill:** sky-coloured from above, warm from below, plus a soft reflection environment made from a tiny procedural room baked into an environment map.

### B2. Energy lights the paper
- **What it is:** glowing jars and tubes cast coloured light onto the page around them.
- **How:** a few point lights follow the brightest glows, and a blurred top-down render of the glows tints the page.
- **Why it matters:** this is what makes the energy feel physically present.

### B3. Warm ambient occlusion, gentle tone mapping
- **Ambient occlusion:** contact shadows in a warm dark brown, not black.
- **Tone mapping:** a hue-preserving tone map at slightly reduced exposure, a soft vignette and SMAA.

### B4. Real materials for the desk, the mat and the book
- **The desk:** oak drawn in code as a texture, with planks of varied tone, growth rings, flecks and seams, plus matching roughness and bump.
- **The mat:** a mottled cutting mat under the book.
- **The paper:** a fibre bump texture and slight translucency, with sheet lines on the page edges.
- **The cover:** cloth with a woven texture.
- **Ours:** we'll choose our own desk and accessories rather than their exact mat and colours.

---

## C. How the book comes to life

### C1. The page text is printed into the page
- **What it is:** each page is a canvas texture drawn with 2D canvas text at about 6 px per mm, on the 3D page mesh. It turns with the leaf, takes the light and looks printed.
- **Accessibility:** a hidden HTML copy of each page is there for screen readers.
- **Interaction:** ticks, toggles and the flap are hit-tested by casting a ray to the page and looking up regions in page millimetres.
- **The page is laid out on a grid:** a margin column for notes and the stamp, and a text column. In order down the page:
  - the running head and rule
  - the red lesson kicker
  - the title and the body
  - the equation box, with the word equation and units under it
  - key words
  - the prediction tick boxes
  - the "Why?" box
  - the folio
- **The right page:** the figure, then a caption, then the italic try-it hint.
- **Live layer:** a second, transparent canvas is laid over the page for pen ticks, handwritten margin working and stamps, redrawn as things change.
- **Ours (built 20 Nov 2026):** a hybrid. The browser still lays the page out in HTML, and `book/printer.js` reads where every word, rule and box landed and draws the same thing on a canvas covering the whole sheet (6.4 px per mm). That canvas is the paper's texture (`book/pagePrint.js`), so the words take the light, sit in the gutter's shade and turn with the leaf. The HTML copy stays in place, invisible, for screen readers and keyboard focus. Its live controls (buttons, sliders, tick boxes, typed answers, the feedback card) stay visible as real HTML. For a turn, a full print that also draws the controls goes on the leaf and on the page it uncovers. The stacked (portrait) layout keeps the HTML panel.

### C2. The diagram is printed on the page, then peels up
- **On the turning leaf:** the diagram is a flat, slanted "printed" snapshot.
- **When the page lands:** the print hands over to a flat line copy. The pen redraws stroke by stroke, and each stroke stands up into 3D as the pen reaches it. Then the shading and shadows fade in, and the diagram is live.
- **When leaving:** the shading fades, and the drawing folds flat onto the page before the leaf turns.
- **Why it works:** every handover matches exactly, so the drawing seems to peel off the paper.

### C3. The page turn
- **The bend:** a curve built along the width of the leaf, rising out of the gutter, with a curl that leads at the top corner. The spine bulges slightly.
- **Timing:** about 1.15 s with gentle easing. Several leaves riffle when jumping ahead.
- **Light:** a turning leaf lets some light through.

### C4. The lift-the-flap card and the stamp
- **The flap:** a rigid paper card hinged on its lower edge, which swings open with springy easing. Its front shows "Why?" and a lift arrow, and its back is a decorated card back. While closed, it is printed on the page, so it turns with the leaf.
- **The stamp:** when the student meets the page's challenge, an ink stamp presses into the margin circle. It is slightly rotated, double-ringed and speckled like real ink.
- **Ours:** our flap is an HTML card. The 3D flap and the stamp fit our pedagogy well, if the challenge is a real task.

### C5. Handwritten margin working
- **What it is:** live handwritten working in the margin, which updates as the student plays.
- **Ours:** CLAUDE.md currently keeps handwriting for part names, so this needs the teacher's go-ahead, or it could be done in the book font in italic.

### C6. Guided steps
- **The sequence:** five shots of about 2 s each, with a hand-over as the fifth. Each shot has a camera position and target in the diagram's own frame, a follow target and an action.
- **When it plays:** automatically, once per lesson, shortly after the diagram goes live, after a close "hero" shot on first arrival.
- **Ours:** already close in spirit.

---

## D. Our plan, biggest visual wins first

Each step is built on the Lesson 5 page first, compared by eye with the reference at the same window size, then shared by every lesson.

1. **Ribbon ink lines:** varying width, tapers, overshoot, a blue-black ink and stroke-by-stroke pen draw-in. Exact silhouettes for every lathe object.
2. **Paper shading:** the illustration light, the real shadow term, object-space hatching with capped coverage, and fading to grey when lines get too fine.
3. **Jars and energy:** jars drawn as ink only, glowing liquid with a surface, swirl and bubbles, and selective bloom on energy only.
4. **Energy tubes:** colour-blended glowing tubes with beads, moving differently for each pathway.
5. **Light and room:** a soft key light with a window pattern on the desk, warm ambient occlusion, a procedural oak desk and paper bump, and energy that lights the paper.
6. **Printed pages:** text in a canvas texture on the page mesh, with a screen-reader copy and page hit regions, plus the printed diagram on the leaf and the peel-up and fold-down sequence.
7. **The 3D flap and a stamp** for each page's challenge.
8. **Mannequin figures** from lathe parts, and cutaways where a lesson needs them.

Steps 1 to 5 change the look of every page. Steps 6 and 7 change how the book comes alive. Each is a real piece of work, so we'll show each one before rolling it out.
