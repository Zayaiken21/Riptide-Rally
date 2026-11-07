# Riptide Rally

A mobile-first 3D boat racing game that runs in the browser and as an iPhone/Android app. Eight boats, four racing teams, fifteen courses, twenty-four items, seven boats to buy and a 3D boathouse garage.

**Play:** https://zayaiken21.github.io/Riptide-Rally/
**Model viewer:** https://zayaiken21.github.io/Riptide-Rally/models.html

## Install on a phone
Open the game and tap **Add to Home Screen** on the start menu. It opens full screen and sideways, and the button disappears once installed. On iPhone it shows the Share → Add to Home Screen steps. For real store apps, see `app/README.md`.

## Multiplayer
Tap **Multiplayer**, pick a username, then **Host a race** or pick one from **Open races** (refreshes every 2 seconds, live rooms only). Hosts can also share an invite link. Up to 8 racers; the host can fill empty spots with AI. Peer-to-peer (WebRTC via PeerJS), so no game server is needed.

## Teams
When the first boat finishes, everyone else gets 20 seconds to cross the line. If you're on the winner's colour and you finish, your team wins with them (+120 bonus coins). Boats that don't finish in time get a DNF.

## Controls
| Phone | Keyboard | Action |
|---|---|---|
| Left pad, or **tilt to steer** (Settings) | ← → / A D | Steer |
| GAS (hold) | ↑ / W | Drive |
| BRK | ↓ / S | Brake |
| NOS (tap) | Space / Shift | Boost; drains on its own and refills |
| ITEM (tap) | E / Enter | Use the item |
| ↻ next to the item | Q | Swap items (with the Item Bay upgrade) |
| ⏸ | P / Esc | Pause |

Tilt steering works however the phone or tablet is held: hold it how you want to race and tap **Lock center** (it also locks at every race start; the **Center** button re-locks mid-race). Settings also has button size, camera distance, graphics quality and sound.

## Courses
Palm Key, Coral Canyon, Lantern Bay, Sunken Reef, Aurora Fjord, Crystal Caverns, Lava Lagoon, Neon Canal, Sakura River, Mangrove Bayou, Desert Oasis, Pirate Cove, Jungle Ruins, Storm Point and Sunset Archipelago. These include caves, underwater tunnels, rain, storms with lightning, cherry blossoms, fireflies, embers and a neon night city.

## Garage
A 3D boathouse: drag to look all the way around your boat, pinch or scroll to zoom, and flip between boats with the arrows or the strip along the bottom. Boats: Speedboat, Party Pontoon, Jet Ski, Catamaran, Hovercraft, Offshore Racer, Hydroplane. Upgrades (Engine, Turbocharger, NOS Tank, NOS Refill, Race Hull, Item Bay) bolt visible parts onto your boat, like exhaust stacks, a hood scoop and turbos, NOS bottles, glow strips, a rear wing and item crates, and those parts show in races too.

## Ads and sponsors
- **Posters and billboards:** the boathouse walls and three billboards on every course show the spots in `ads.json`. Edit that file to sell them: title, colours, an optional picture (`img`, e.g. `ads/sponsor.jpg`) and an affiliate link (`url`) that opens when someone taps the poster.
- **Rewarded ads:** the pink **+** next to your coins, the green **free** button when a boat costs too much, and **double these coins** on the results screen. They use AdMob in the phone apps and AdSense H5 Games ads on the web once you add your ids, and until then they play a 15-second sponsor break from your own spots. Eight per day.

## Files
- `index.html`: the whole game (three.js loads from jsDelivr)
- `ads.json`: sponsor spots and ad settings, editable without rebuilding
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen install
- `app/`: iPhone and Android apps (Capacitor). The **Android app** GitHub Action builds a test APK on every push.
- `models.html`, `models/`: model viewer and GLBs (`boat.glb`, `boats.glb`, `items.glb`, `environment.glb`)
- `source/`: model builders and the GLB exporter
