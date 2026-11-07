// Copies the game from the repo root into www/ for the native apps.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname, www = new URL('./www/', import.meta.url).pathname;
rmSync(www, { recursive: true, force: true }); mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'ads.json']) if (existsSync(root + f)) cpSync(root + f, www + f);
for (const d of ['icons', 'ads']) if (existsSync(root + d)) cpSync(root + d, www + d, { recursive: true });
console.log('web files copied to app/www');
