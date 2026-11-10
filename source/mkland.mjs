import fs from 'node:fs';
import { feature } from 'topojson-client';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const land = feature(topo, topo.objects.land);
const rings = [];
for (const f of land.features) { const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) { const r = []; for (const [lon, lat] of ring) r.push(Math.round(lon * 10), Math.round(lat * 10)); if (r.length >= 8) rings.push(r); } }
fs.writeFileSync('land.json', JSON.stringify(rings));
console.log(rings.length, fs.statSync('land.json').size);
