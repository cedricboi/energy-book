# SOUND_LIST.md: sounds for The Energy Ledger

Every sound the book needs. Get each one as a short file (Freesound CC0, or an AI sound-effect tool), name it exactly as below, and put it in `public/audio/raw/`. Then run:

```
npm run sounds
```

This joins them into one sprite (`public/audio/sfx.mp3` plus `public/audio/sfx.json`) with ffmpeg. The book plays each sound with a small random change of pitch and volume, so repeats do not sound robotic. Sound starts only after the first tap, and the book starts muted on the projector.

Keep every sound quiet and soft. The mood is a calm desk at night.

| File name | Length | Description | Used when |
|---|---|---|---|
| `page-turn.wav` | 0.6 s | A single paper page turning, soft, no rustle tail | A page turns |
| `pen-scratch.wav` | 1.0 s | A fine pen drawing a line on paper, light | A diagram draws itself in |
| `thud.wav` | 0.3 s | A soft, low thud, like a book set down on a desk | The crate stops, the clay is hit |
| `ball-bounce.wav` | 0.25 s | A tennis ball bouncing once on a hard floor | The ball hits the floor (Lesson 6) |
| `spring-stretch.wav` | 0.5 s | A metal spring being stretched, a short creak | A spring is squashed or stretched |
| `spring-release.wav` | 0.4 s | A spring snapping back, a short twang | The spring is released |
| `kettle.wav` | 2.0 s | A kettle beginning to boil, rising hiss, fades out | The kettle scenes (Lessons 2 and 8) |
| `click.wav` | 0.08 s | A quiet, dry click, like a pen click | Buttons, sliders reaching a step |
| `chime.wav` | 0.8 s | A gentle two-note chime, warm, not bright | A right answer, a level cleared |
| `wrong.wav` | 0.5 s | A soft, low, rounded tone, not a buzzer | A wrong answer |

Licences: record each file's source and licence in `public/audio/raw/CREDITS.md`, even for CC0 files.
