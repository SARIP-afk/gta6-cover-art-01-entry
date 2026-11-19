// Solmarina Cover Maker — entrypoint for the make.fun grader.
// Copies the finished app and its screenshots into the output directory
// and writes the dossier buildDossier builds from them. Node 22, stdlib only.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const here = new URL('.', import.meta.url).pathname;

function copyTree(name: string): void {
  const from = join(here, name);
  const to = join(outDir, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ in the repository`);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
if (dossier.length > 1572864) throw new Error(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB gate cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
