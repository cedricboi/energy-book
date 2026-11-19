# AUDIT.md: The Energy Ledger against its own plan

Date: 19 Nov 2026. Measured against `CLAUDE.md`, `docs/LESSON_PLAN.md` and the syllabus. Sources: every page screenshot at the four test sizes, the code, and the live site at cedricboi.github.io/energy-book. Nothing was changed while auditing.

About 150 findings, grouped by size. Inside each group they run roughly from most to least important. "Logged" means the deviation is already recorded in `PROGRESS.md` but still differs from the plan.

## The pattern behind most of it

1. **The scenes are things to watch, not things to handle.** No 3D object can be tapped or dragged (there is no raycaster in the code). Every interaction is an HTML button or slider on the left page. The plan's key student actions were replaced by "press Run": dragging objects to jars (L1), tapping the pathway (L2), dragging the box onto a shelf (L4), building chains (L2).
2. **Question pages keep the explore scene.** From the use pages onwards, the right page shows a stale scene that has nothing to do with the question (a crate beside a trolley question, stairs beside a kettle question). Sometimes it shows the answer outright.
3. **The jars sit above the top edge of the page.** In almost every lesson the jar row hangs past the paper onto the dark desk. In portrait, and often on the projector, their labels are cut off the top of the screen.
4. **The tests checked what was easy to check.** "Fits one screen" and "no label overlap" were tested at four sizes only, against the panel and against other labels. They never checked labels against the screen edge, scale against rulers, or windows of other shapes. So the earlier "every page fits at four sizes" was true but much narrower than it sounded.

---

## A. Biggest differences (missing features, wrong physics, broken things)

### Broken or wrong
1. **P = E/t never shows as a fraction.** `src/ui/maths.js:13` writes `\dfrac` in a JS template literal, so the backslash is lost and KaTeX prints the letters "dfrac". This breaks the one fraction in Lesson 8 (name page, step 3) and the teachers' page ("P = df r a c E t"). Confirmed.
2. **Lesson 2 teaches wrong physics about radiation.** The solar-light feedback says "Heating needs matter between the objects. Space is empty" (`l2-transfers.js:157`). The syllabus lists radiation as transfer by heating and says EM radiation needs no medium (Topic 7(d)). Confirmed.
3. **A correct answer is marked wrong.** In the Lesson 2 exit ticket, "The Sun warms the Earth" accepts only "waves" (`l2-transfers.js:214`). "By heating" (radiation) is also right under the syllabus.
4. **The Run button is out of reach on some window shapes.** On the live site at 1355×1205 (a near-square laptop window), the Lesson 5 predict panel overflows (682 px of content in a 501 px box, with overflow hidden). The "Let her go" button is cut off, so the student can't run what they just predicted. Other near-square sizes are likely affected too.
5. **Ledger Run's marble ignores the machine.** `ledgerRun.js:171-182` runs the same path on every level, down the tower, along the floor, up the last ramp. On spring, lift and fan levels it rolls straight past those parts. It is never launched, lifted or blown.
6. **Ledger Run can be won by trial and error.** Each failed try reports the exact shortfall ("0.12 J short"), and the jars show the input joules live as the slider moves. The game works out mgh and P × t for the student. The plan says guessing must not work.
7. **Ledger Run locks a level for good after three tries.** After that, Launch does nothing. This holds even after a reload and on a revisit, although the win page says "go back to any level you have not cleared".
8. **Answers are visible while questions ask for them.** The scenes reveal what the question is asking:
   - L2 use pages show the matching device (the catapult for the kick, the kettle for the soup).
   - The L2 notes page shows jars labelled with blanks a and e.
   - L2 close the loop shows the chain it asks students to explain.
   - L5 and L6 notes pages hide the numbers but still show the fills and the bar.

   This breaks rule 5.6.
9. **The drawings disagree with their own rulers.**
   - **L5:** the rider is drawn mid-depth but the ruler and dashed line are at the front edge, so in perspective she looks about 3 m up while the line says 2 m.
   - **L6:** the ball is drawn at z = 0 and the metre rule at z = 0.3, so a 1.0 m drop looks like about 1.4 m. The predict page tells students to read the bounce off that rule.

   This breaks rule 5.5.

### Planned student activities that were never built
10. **L1: no dragging objects to jars.** The second half of the explore is another tap-and-watch, so students never commit to a store before seeing it.
11. **No 3D object can be tapped anywhere.** The text says "Tap the three objects below", but only HTML buttons work. The "lit" cue is a 6 mm lift with no light, and on L1 it stays on the car.
12. **L2: no pause and tap the pathway.** Students only press "Run it" and "Look closely".
13. **L2: no store, pathway, store chain builder.** The radio is a reorder of pre-written strings, the hair dryer labels pathways only, and the solar light is a single MCQ.
14. **L4: the box can't be dragged to a shelf.** The shelf is a radio button.
15. **L6: the predict page doesn't ask for a value.** It's a three-option MCQ, and the options aren't parallel.
16. **L6: the car-braking case is missing.**
17. **L6: no device ledger for the 60 J lamp.** The page is text only, beside the bouncing ball. The prompt already names the internal store that students are meant to name.
18. **L7: the crate's kinetic store is missing.** The scene goes chemical to internal at a "steady speed". The plan has chemical to kinetic to internal. This isn't logged.
19. **L8: no stopwatches.** The time is a third line in each jar label, while the button says "Start the stopwatches".
20. **L8 notes: no worked example, and only one equation is matched.** "W, work done" sits beside the unit choice "W" (watt) on the same page. That's the exact W/W clash the spec forbids. The dropdowns are cut to "ch" at every size.
21. **L4 notes: no worked example.** Only the units box was built.
22. **L1 notes are dropdowns, not the planned blank six-row ledger** with names dragged onto descriptions.
23. **L2 notes are a fill-the-blanks table, not the planned torch chain diagram.**
24. **The night window is never seen.** The intro view proposed in Phase 2 exists only as `?view=intro`. The book never opens on it, so the window and stars at the heart of the art direction appear nowhere.
25. **There is no title page.** The book opens straight on contents. The `00-title.png` screenshots are a stale Phase 1 image.

### Content that clips or hides on screen
26. **Jar labels are cut off the top of the screen.** This happens on iPad portrait in L1, L4, L6, L7, L8 and the game, and on the projector in L6 and the game. In portrait the L6 explore says "watch the internal jar" while that label is missing.
27. **L4's jar sits on the spine and ribbon** on every page, with its label above the book's top edge.
28. **L2's hook page rendered with a blank left page** in the iPad landscape capture. It may be a timing race, and it needs checking.
29. **L4's box is nearly invisible** inside the dark hatched shelf boards, although it's the one thing students should find.
30. **L7's push arrow is hidden.** It runs over the crate, the "crate" label sits on its tip, and the "push 100 N" label stays put while the person moves about 150 px away.
31. **The game's machine is tiny next to its five jars.** Flow arcs scribble between the jars, and the ribbon crosses the machine.

---

## B. Significant differences (noticeable gaps a student or teacher would feel)

### Pedagogy and plan content
32. **L1 jars show every store name before any is named** (rule 6.6).
33. **All six L1 flows use the mechanical pathway style** (`stores.js:90`), so students see arrow paths a lesson before pathways are taught.
34. **L1 objects don't match the plan.**
    - The catapult is a tiny coil spring, not a ruler and rubber band.
    - There's no desk under the raised book.
    - The Sun sits in the grid rather than the corner.
    - The scale is mixed: the book is smaller than the toy car.
35. **L2's hook is about the phone, but the scene shows the catapult.**
36. **L2's four pathways never appear together.** The name page describes the kettle, torch and speaker while the catapult is on screen.
37. **The L1 durian question copies the name page's wording** ("because of its height").
38. **Other questions echo their explore or name page instead of applying the idea to a new case** (rule 6.10):
    - the L3 10 to 20 m/s MCQ;
    - the L4 1.0 to 2.0 m bag and 2 kg box;
    - the L5 mass MCQ ("mass cancels out" is in the page text);
    - the L5 check on the same skateboarder;
    - the L8 1200 W vs 2400 W kettles;
    - the L6 exit, which repeats the close-the-loop question word for word.
39. **L5 friction page says "Turn friction on" when it is already on.**
40. **L5's friction name page has no scene state**, so it can show friction off and 0 J internal beside text about friction.
41. **L5's close the loop returns to "the playground" but the hook was a skatepark.**
42. **The L7 braking link asks for no explanation.** It's a number and an MCQ on check pages, not "complete the explanation with W = F × d".
43. **L8's close the loop asks for one power only.** The plan asks for both powers and who is greater.
44. **L8's exit doesn't compare two things.** That was today's question 2.
45. **L4's close the loop asks for a difference, not a comparison.**
46. **L3's ×10 jar step isn't used.** At 0.10 J the jar is 4% full, and the camera looks down into the jars, so small fills read as flat discs. L4 has the same disc look.
47. **The ledger bar looks the same at any value.** Its width is scaled to the current total, so doubling the mass changes the jar but not the bar (`ledgerBar.js:52`).
48. **The L3 run is too short to see.** The transfer into the clay lasts about 0.04 to 0.3 s even at ten times slower.
49. **L6 merges sound into the internal jar.** "The share in the internal store and waves grows" can't be seen, and `s.sound` in the model is unused.
50. **L6 slow motion is stated on the explore page only.** The hook and predict pages run the same slowed drop without the note.
51. **L8 kettle explore has only a Start button.** Students don't manipulate anything.
52. **The L8 kettles read as lidded tins.** They have no handle and no water, and no electrical pathway is drawn.
53. **Feedback that doesn't name the mistake** (rule 6.11).
    - The L2 radio question has generic wrong feedback.
    - All three wrong options in L2 x2 share one message.
    - L6 x2 has no message for the "end" value.
54. **L1 hook figure, L3 and L4 hooks:**
    - L3 uses UK data rather than Singapore data (logged).
    - L4's durian figures have no on-page source.
    - L3's hook shows a finished run ("dent 2 mm") before anything has rolled.
55. **The L7 hook shows a pushed crate, not the bag held still.**
56. **L7 people and crate are about 30 px tall on iPad.** The jars dominate, and there's no cue on the person.
57. **L7 wall case (from the code):**
    - The hands are 0.4 m short of the wall.
    - At high force the arrow runs through the wall.
    - The chemical jar shows 0 J, as if the person had no energy at all.
58. **The L7 chemical jar starts at exactly the work done and drains to 0 J**, as if the person's whole store emptied.
59. **The watt appears in L3 and L7 unit menus before L8 names it**, on pages where W also means work.

### Game
60. **The least-energy bonus is free on six of eight levels.** Only one setting wins on levels 1 to 5 and 7, so every win earns +50.
61. **Stall and overshoot are barely visible.**
    - An overshoot ends hanging in mid-air.
    - A stall freezes on the slope.
    - A win stops at the ramp top, not in the cup.
62. **The spring never shows compression.** Energy is set in joules (logged, because ½kx² is out of the syllabus).
63. **"One ramp" and "Two ramps" draw the same machine.** Ramps are 1 px lines.
64. **The lift, fan and spring have no name labels**, only numbers.
65. **The win screen promises a per-level breakdown but shows one total.**
66. **The machine rebuilds on every slider step without disposing geometry.** That leaks memory, and the parts skip the draw-in.

### Engine, art and spec-wide
67. **The bloom quality never changes after the tier probe.** SMAA runs on every tier, and `bloomResolutionScale` is unused (partly logged).
68. **The quality override is hidden below 900 px**, so iPad portrait can't reach it.
69. **Only 6 of 10 sounds are wired.** Spring stretch, spring release (lessons), kettle and click never play, and the game has no sounds of its own. `PROGRESS.md` claims more.
70. **Text below the size minimums** (18 px iPad, 22 px projector):
    - jar and ruler labels: 14 px;
    - part labels: 16 px;
    - control labels: about 15 px;
    - runs table: about 15 px;
    - notes table headers: about 14 px;
    - page notes: 0.8em;
    - ledger bar: 12 px;
    - contents rows: about 15 px.
71. **The contents page is weak.**
    - The strapline crosses the gutter under the ribbon ("tra|nsaction").
    - The text is top-aligned in tall boxes.
    - About 55% of the page is empty.
    - There are no progress marks.
    - Portrait hides the book entirely.
72. **"Photo to come" shows to students on the L5 hook** (logged teacher to-do).
73. **The page shows a blank book for 2 to 3 s on first load** before contents appear. There's no loading cue.
74. **Next stays enabled on predict pages before committing**, so students can skip the prediction.
75. **The L6 ball cue and draw-in point at the old ball after a ball change** (`bounce.js:136`).
76. **Reduced motion doesn't slow the flows in the stores, transfers and gpe scenes.**
77. **The teachers' page shows raw `{a}` `{b}` placeholders** in fill-the-blank items. It has no KaTeX stylesheet, and game solutions have no units.

---

## C. Moderate differences (polish and consistency)

78. **The jar row overhangs the page edge in landscape in every lesson.** L1's sixth jar also overhangs the right edge, and L1 labels are staggered with no leader lines.
79. **Labels overlap objects or glows.**
    - "stretched catapult" sits on the cup rim.
    - "phone" sits on the phone.
    - The red bloom touches "kinetic" (L2 p06).
    - L5 jar labels touch each other on the projector and in portrait.
80. **The ruler and ledger bar sit on the ribbon at the gutter** (L4 projector, L5 projector p09, L3 notes).
81. **Hard shadows.** The L4 shelf and L8 staircase cast hard dark slabs across the page, and a stray shadow is cut off at L1's right page edge.
82. **The L5 rider lies almost flat on the 56° wall at rest**, so she reads as fallen. She's blocky (logged).
83. **The two torch paths overlap in L2**, so no light leaves the front of the torch.
84. **The kettle's electrical path is coloured as the internal store** (orange).
85. **L1's battery sits half in the gutter, and L2's plug is half off the page.**
86. **The kettle has no handle and dwarfs its jar.** The phone is half real size, and the speaker cone is an unreadable block.
87. **The L7 distance ruler lines up with nothing.** It has no 0 m label and no marker for the chosen distance.
88. **"To scale" has nothing to read the scale from.** There's no force key for the L7 arrow and no height label on the L8 stairs.
89. **Label-question item columns are narrow.** Items wrap to 3 or 4 lines, and the selects are about 140 px, so "gravitational potential store" is cut.
90. **Page kickers vanish on dense pages**, so page types look inconsistent. The L2 notes kicker repeats its title.
91. **Notes prompts have very loose line spacing** (about 36 px) in L3, L5, L6 and L7.
92. **The L7 notes layout wraps** the second "Substitute" dropdown, and its "W =" and "×" are small.
93. **The L3 runs table keeps only the last four runs.** The plan says every run.
94. **The L5 ledger shows a fourth "being transferred" band**, and the jar numbers lag the model mid-run (740 J shown while the model has 990 J).
95. **The L8 name order differs from the plan** (the watt comes last), and a second relation (power = work done ÷ time) is added.
96. **L4 names g, then the term together with its equation**, so the term never gets a step of its own.
97. **Machine-part labels in the game:** "ramps and track loses" should be "lose", Level 7 mentions a ramp that isn't drawn, and "exactly 2.0 m/s" is said although up to about 2.12 m/s wins.
98. **Game feedback and chime arrive before the marble does.** Sliders also reset to minimum on a revisit.
99. **Kalam is used for numbers** ("cup, 0.4 m up", "2000 W kettle"). It's meant for part names only.
100. **The "Sound off" button is ambiguous.** It can read as the state or as the action.
101. **Key-idea marking accepts "heat"** in place of the syllabus terms (L5, L6). The L7 close-the-loop passes if the student copies the prompt's own word "still".
102. **The superball keeps 75% in the question but 85% in the model.** The basketball and superball figures have no source.
103. **Divisions are written with ÷ in L7 and L8 feedback**, where §7 asks for fractions.

---

## D. Minute differences (wording, numbers, code tidiness)

104. "Tap the the Sun" on L1 p04 (a doubled word).
105. "Objects below" in L1 points the wrong way in both orientations.
106. L1 check reuses "a bowl of rice" from the question just before it.
107. L1 notes descriptions are fragments ("A moving object"). L2 notes row headers are fragments ("Starts in the"). "Notes. X" titles read as fragments. "Chapter game: Ledger Run" is a colon label.
108. Numbers break from their units at line ends ("14 / m", "g = / 10 N/kg", "80 / kg"). They need non-breaking spaces.
109. Trailing zeros are dropped. The prompt says "5 m/s" and the feedback "5.0²". The slider says "2 m" with sigFigs 2. "0.5 J" sits beside "0.28 J".
110. Numbers are typed into lesson files rather than computed (rule 5.1):
     - L3 "5.0 × 5.0", "10 × 10", "0.4", "3²", and a raw `(2*E)/m`;
     - L4 g typed as 10;
     - L7 "6.25 J", "25", "4";
     - L8 "30 × 60 s", "× 10 ×".
111. `sources.js` and `PROGRESS.md` are dated 20 Nov 2026, a day after today.
112. The L6 lamp page says "as light", where the plan says "by light waves". "carried away by sound, by propagation of waves" is awkward.
113. L7 p09 is missing its "Check" kicker.
114. Stale comment: `ramp.js:2` says 1 : 40, but the scale is 1 : 50.
115. Dead code: `bounce.js` `place()` (unused `r`, `+= 0` lines), `work.js:81,85` (`tail`), `ledgerRun.js:227` (redundant ternary).
116. `physics/units.js` is an empty stub.
117. The L5 "halfway down" notes row is unclear: half the height or half the path?
118. "exactly" in the L7 speed-gate story (see 97).
119. The Teacher Hub only queues answers in memory (logged, waiting on the reference deck).
120. No screenshot captures the L6 squash, elastic fill or ripples, or the L8 fraction step, so those visuals were never checked by eye.

---

## Suggested order of work

1. **Correctness, one sitting.** Items 1 to 4, plus the clipped labels (26, 27) and the answer leaks (8). These are small code changes with a big classroom effect.
2. **The interaction layer.** Add picking (tap and drag on 3D objects) once in the engine, then build items 10 to 14 on it. This is the largest single gap between the plan and the book.
3. **Question-page scenes.** Give use and check pages their own `sceneState`, or a neutral scene, so the right page always relates to the question (pattern 2).
4. **Missing pages.** Items 15 to 23.
5. **Ledger Run rework.** Items 5 to 7 and 60 to 66.
6. **Art pass.** The intro view and window, title page, contents page, jar placement, text sizes, then sections C and D.
7. **Widen the tests,** so these can't come back: labels inside the viewport, near-square window sizes, ruler-versus-object position checks, and a screenshot mid-squash and on every revealed step.
