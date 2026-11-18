// scripts/check-budget.js
// CLAUDE.md section 9: total JavaScript under 1.2 MB gzipped. Runs after every build.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 1.2 * 1024 * 1024;
const dir = 'dist/assets';
let total = 0;
for (const f of readdirSync(dir)) {
  if (f.endsWith('.js')) total += gzipSync(readFileSync(join(dir, f))).length;
}
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
if (total > BUDGET) {
  console.error(`JS budget exceeded: ${kb(total)} gzipped, budget ${kb(BUDGET)}`);
  process.exit(1);
}
console.log(`JS budget OK: ${kb(total)} gzipped of ${kb(BUDGET)}`);
