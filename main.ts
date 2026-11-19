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

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: this file sits in it, game/ and screenshots/ beside it.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; a local run overrides it with MAKEFUN_OUTPUT_DIR.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The hand-in must be real files, not links out of the repo: a symlink
// under game/ could smuggle in content the grader never sees in the
// repository, so refuse to build one.
function assertNoSymlinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink() || !entry.isDirectory() && lstatSync(path).isSymbolicLink()) {
      throw new Error('symlink found in hand-in: ' + path);
    }
    if (entry.isDirectory()) assertNoSymlinks(path);
  }
}
assertNoSymlinks(join(repoRoot, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) assertNoSymlinks(join(repoRoot, 'screenshots'));

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
// Every screenshot shots.json names must exist on disk: a missing
// file would hand the judge an empty frame, so refuse the hand-in
// instead of submitting a dossier that points at nothing.
const shotList = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));
for (const shot of shotList) {
  if (!existsSync(join(shotDir, shot.name))) {
    throw new Error('shots.json names ' + shot.name + ' but it is missing from screenshots/');
  }
}
// No orphan screenshots: every file in screenshots/ must be named in
// shots.json, or the judge would see a frame the dossier never lists.
const namedShots = new Set(shotList.map((s) => s.name));
for (const shotFile of readdirSync(shotDir).filter((f) => !f.startsWith('.'))) {
  if (!namedShots.has(shotFile)) {
    throw new Error('screenshot ' + shotFile + ' is on disk but not named in shots.json');
  }
}
// Count the game files so the run reports the size of the hand-in —
// and list the five largest, so a runaway asset shows up in the log
// before the grader ever sees it, not after. The total bytes are
// reported too: the gate caps game/ at 48 MiB, and the log should say
// how close the hand-in runs to it.
let gameFiles = 0;
let gameBytes = 0;
const gameSizes = [];
function walkSizes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkSizes(path);
    else {
      gameFiles += 1;
      const bytes = lstatSync(path).size;
      gameBytes += bytes;
      gameSizes.push({ path: path.slice(join(outputDir, 'game').length + 1), bytes });
    }
  }
}
walkSizes(join(outputDir, 'game'));
gameSizes.sort((a, b) => b.bytes - a.bytes);
const biggest = gameSizes.slice(0, 5).map((f) => f.path + ' ' + f.bytes + 'B').join(', ');
// Every shot in shots.json needs a label: a frame the dossier cannot
// describe tells the judge nothing, so refuse a blank one.
for (const shot of shotList) {
  if (typeof shot.label !== 'string' || shot.label.trim().length === 0) {
    throw new Error('shots.json entry ' + shot.name + ' has no label');
  }
}
// The dossier promises four screenshots — refuse a run that produced
// fewer, so a broken shot never ships silently.
const shotFiles = readdirSync(join(outputDir, 'screenshots')).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));
if (shotFiles.length !== 4) {
  throw new Error('expected 4 screenshots, found ' + shotFiles.length);
}
console.log(
  'SOLMAR dossier: ' + dossierBytes + ' bytes, ' + shotCount +
  ' screenshots, ' + gameFiles + ' game entries, ' + gameBytes + ' game bytes, output in ' + outputDir,
);
console.log('largest game files: ' + biggest);
// How many source modules the entry is built from — the dossier lists
// the game entries, but the count of game/src/*.js files is the quick
// read on how the code is split up.
const srcCount = gameSizes.filter((f) => f.path.startsWith('src/') && f.path.endsWith('.js')).length;
console.log('source modules: ' + srcCount + ' game/src/*.js files');
// The stunt system is the final cut's headline feature: refuse a run
// that lost it, so a missing module never ships silently.
if (!existsSync(join(repoRoot, 'game', 'src', 'stunts.js'))) {
  throw new Error('game/src/stunts.js is missing — the stunt system did not ship');
}
