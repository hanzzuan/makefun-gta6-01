// SOLMAR — Sunset Streets, the make.fun gta6-01 entry.
//
// This is the entrypoint: a small Node 22 program (standard library only)
// that hands the game in. The game itself is the plain static files under
// game/ (index.html plus its ES modules, three.js vendored under
// game/vendor/), and the screenshots under screenshots/. This program copies
// both folders beside this file into /output and writes /output/dossier.json
// — the summary the judge reads — with the vendored make.fun library.
//
// Play it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p /tmp/gta6-01-out && MAKEFUN_OUTPUT_DIR=/tmp/gta6-01-out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: this file sits in it, game/ and screenshots/ beside it.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; a local run overrides it with MAKEFUN_OUTPUT_DIR.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps, as the scorer enforces them: at most 4 screenshots and
// 256 KiB each, at most 993 files and 48 MiB under game/, no game/ path over
// 1000 bytes, and the dossier text capped at 160 KiB. The dossier is built
// from the copied output, so the two runs the grader makes are identical.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);

// Verify the hand-in before reporting success: the dossier must fit its
// 1.5 MiB cap, the screenshots must all be there, and the run must say so
// on stdout — the grader runs this twice and both runs must agree.
const dossierBytes = Buffer.byteLength(dossierText, 'utf8');
if (dossierBytes > 1572864) {
  throw new Error('dossier.json is ' + dossierBytes + ' bytes, over the 1.5 MiB cap');
}
const shotDir = join(outputDir, 'screenshots');
const shotCount = existsSync(shotDir)
  ? readdirSync(shotDir).filter((f) => !f.startsWith('.')).length
  : 0;
if (shotCount < 3 || shotCount > 4) {
  throw new Error('expected 3 or 4 screenshots, found ' + shotCount);
}
// Every screenshot must be a real JPEG or PNG, not a renamed text file:
// check the magic bytes (FF D8 FF for JPEG, 89 50 4E 47 for PNG) and
// that each file is non-empty and under the 256 KiB cap.
for (const shotFile of readdirSync(shotDir).filter((f) => !f.startsWith('.'))) {
  const bytes = readFileSync(join(shotDir, shotFile));
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    throw new Error('screenshot ' + shotFile + ' is not a JPEG or PNG (bad magic bytes)');
  }
  if (bytes.length > 262144) {
    throw new Error('screenshot ' + shotFile + ' is ' + bytes.length + ' bytes, over the 256 KiB cap');
  }
}
// Count the game files so the run reports the size of the hand-in.
let gameFiles = 0;
for (const entry of readdirSync(join(outputDir, 'game'), { recursive: true })) gameFiles += 1;
console.log(
  'SOLMAR dossier: ' + dossierBytes + ' bytes, ' + shotCount +
  ' screenshots, ' + gameFiles + ' game entries, output in ' + outputDir,
);
