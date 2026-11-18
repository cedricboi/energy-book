// scripts/build-sounds.js
// Joins public/audio/raw/*.wav (or .mp3) into one sprite with ffmpeg:
// public/audio/sfx.mp3 and public/audio/sfx.json ({ name: [startMs, lengthMs] }).
// Each sound is followed by 100 ms of silence so sounds never bleed together.
import { readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, parse } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const dir = 'public/audio/raw';
const files = readdirSync(dir).filter((f) => /\.(wav|mp3|ogg)$/i.test(f)).sort();
if (!files.length) {
  console.log('No sounds in public/audio/raw yet. See docs/SOUND_LIST.md.');
  process.exit(0);
}
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const tmp = mkdtempSync(join(tmpdir(), 'sfx-'));
const gap = 0.1;
const map = {};
let t = 0;
const parts = [];
files.forEach((f, i) => {
  const src = join(dir, f);
  const d = probe(src);
  map[parse(f).name] = [Math.round(t * 1000), Math.round(d * 1000)];
  const out = join(tmp, `${i}.wav`);
  // Pad each sound with silence, at one sample rate and channel count.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-ar', '44100', '-ac', '2', '-af', `apad=pad_dur=${gap}`, out]);
  parts.push(out);
  t += d + gap;
});
const list = join(tmp, 'list.txt');
writeFileSync(list, parts.map((p) => `file '${p.replace(/\/g, '/')}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-codec:a', 'libmp3lame', '-b:a', '96k', 'public/audio/sfx.mp3']);
writeFileSync('public/audio/sfx.json', `${JSON.stringify(map, null, 2)}\n`);
console.log(`Sprite built from ${files.length} sounds, ${t.toFixed(1)} s long.`);
