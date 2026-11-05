// Writes boat.glb, items.glb and environment.glb from models.js
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';
import { makeModels } from './models.js';
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then(x => { this.result = x; this.onloadend && this.onloadend(); }); } readAsDataURL(b) { b.arrayBuffer().then(x => { this.result = 'data:' + b.type + ';base64,' + Buffer.from(x).toString('base64'); this.onloadend && this.onloadend(); }); } };
const M = makeModels(THREE);
const exp = (obj, file) => new Promise((res, rej) => new GLTFExporter().parse(obj, glb => { writeFileSync(file, Buffer.from(glb)); console.log(file, glb.byteLength); res(); }, rej, { binary: true }));
const row = (name, list) => { const g = new THREE.Group(); g.name = name; list.forEach((o, i) => { o.position.x = i * 3.5 - (list.length - 1) * 1.75; g.add(o); }); return g; };
await exp(M.boat(), 'boat.glb');
await exp(row('Riptide_Items', [M.itemBox(), M.grapple(), M.gluePuddle(), M.glueBottle(), M.turboTriple(), M.shield(), M.balloon(), M.homingBubble(), M.fogCloud(), M.sail(), M.dolphin(), M.duck(), M.magnet(), M.tidalWave()]), 'items.glb');
const env = row('Riptide_Environment', [M.palm(1), M.pine(), M.rock(2), M.buoy(0xef4444), M.buoy(0x22c55e), M.lantern(), M.lighthouse(), M.arch(14), M.gate(12)]);
env.children.forEach((o, i) => o.position.x = [0, 6, 11, 15, 18, 21, 30, 48, 70][i]);
await exp(env, 'environment.glb');
