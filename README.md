# Riptide Rally

A mobile-first 3D boat racing game that runs in the browser. Eight boats, four racing teams, three courses, twelve items and a day-night cycle.

**Play:** https://zayaiken21.github.io/Riptide-Rally/
**Model viewer:** https://zayaiken21.github.io/Riptide-Rally/models.html

## Controls
| Phone | Keyboard | Action |
|---|---|---|
| Left pad (slide between arrows) | ← → / A D | Steer |
| GAS (hold) | ↑ / W | Drive |
| BRK | ↓ / S | Brake |
| NOS (tap) | Space / Shift | Boost; drains on its own and refills |
| ITEM (tap) | E / Enter | Use the item you picked up |
| ⏸ | P / Esc | Pause |

## Courses
- **Palm Key**: tropical loop with whirlpools and kelp beds
- **Coral Canyon**: red-rock canyon with whirlpools and erupting geysers
- **Lantern Bay**: harbor with a lighthouse, floating lanterns, whirlpools and swinging log booms

Every whirlpool pulls boats in, drags them under and launches them backwards behind it.

## Garage
Every race pays coins (more for a better finish, plus a bonus for each boat you hit). Spend them in the Garage on five upgrades with five levels each: Engine, Turbocharger, NOS Tank, NOS Refill and Race Hull. Upgrades are saved in your browser.

## Items
Grapple Hook (swap places with 1st), Glue Trap, Triple Turbo, Bubble Shield, Splash Balloon, Homing Bubble, Fog Horn, Tailwind Sail, Dolphin Tow, Rubber Duck, Tow Magnet, Tidal Wave.

## Files
- `index.html`: the whole game in one file (the boat GLB is embedded; three.js loads from jsDelivr)
- `models.html`: viewer for all models
- `models/`: `boat.glb`, `items.glb`, `environment.glb`
- `source/models.js`: builds every model (used by the game and the exporter)
- `source/export-glb.mjs`: regenerates the GLBs (`npm i three@0.160.0`, then `node export-glb.mjs`)
