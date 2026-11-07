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
await exp(row('Riptide_Boats', [M.boat(), M.boatOffshore(), M.boatCatamaran(), M.boatHydroplane(), M.boatHovercraft(), M.boatJetski(), M.boatPontoon()]), 'boats.glb');
await exp(row('Riptide_Items', [M.itemBox(), M.grapple(), M.gluePuddle(), M.glueBottle(), M.turboTriple(), M.shield(), M.balloon(), M.homingBubble(), M.fogCloud(), M.sail(), M.dolphin(), M.duck(), M.magnet(), M.tidalWave(), M.jumpJet(), M.octopus(), M.beachBall(), M.lowTide(), M.fakeBox(), M.chest(), M.starShine(), M.shrinkRay(), M.bubbleWall(), M.warpPearl(), M.springBuoy(), M.copycat()]), 'items.glb');
const env = row('Riptide_Environment', [M.palm(1), M.pine(), M.rock(2), M.buoy(0xef4444), M.buoy(0x22c55e), M.lantern(), M.lighthouse(), M.arch(14), M.gate(12), M.jellyfish(), M.iceberg(2), M.coral(0), M.coral(1), M.coral(2), M.fish(), M.cherryTree(), M.mangrove(), M.cactus(), M.jungleTree(), M.bush(), M.flowers(), M.torii(14), M.stoneLantern(), M.building(), M.shipwreck(), M.pyramid(), M.ruinPillar(), M.crystal(), M.stalactite(), M.hotAirBalloon(), M.barrel(), M.floatLog(), M.barge(), M.volcanoCone(), M.seagull()]);
env.children.forEach((o, i) => o.position.x = i * 14);
await exp(env, 'environment.glb');
