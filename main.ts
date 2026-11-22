// Submission program: copy the game and its screenshots into the
// output folder, then build dossier.json with the vendored make.fun
// library. Node 22 standard library only.
//
// Usage: mkdir out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

async function main() {
  await mkdir(outDir, { recursive: true });
  await cp(join(here, 'game'), join(outDir, 'game'), { recursive: true });
  const shotsDir = join(outDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  try {
    await cp(join(here, 'screenshots'), shotsDir, { recursive: true });
  } catch {
    // No local screenshots folder — the dossier still builds.
  }
  const dossier = await buildDossier(outDir, {
    text_max_bytes: 163840,
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  await writeFile(join(outDir, 'dossier.json'), dossier);
  console.log(`Dossier written to ${join(outDir, 'dossier.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
