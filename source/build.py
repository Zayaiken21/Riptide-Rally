s=open('/root/boat/game2.template.html').read()
m=open('/root/boat/models.js').read().replace('export function makeModels','function makeModels')
g=open('/root/boat/boat.b64').read()
import json, base64, glob, os
pack={os.path.basename(f)[:-4]: base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob('/root/boat/boatpack/*.glb'))}
import time as _t
BUILD=str(int(_t.time()))
open('/root/boat/version.json','w').write(json.dumps({'build': BUILD}) + '\n')
s=s.replace("'__BUILD__'", repr(BUILD))
land=open('/root/boat/land.json').read()
out=s.replace('/*__LAND__*/[]', land).replace('/*__MODELS__*/',m).replace('__GLB__',g).replace('/*__PACK__*/{}', json.dumps(pack))
open('/root/boat/riptide-rally.html','w').write(out)
HEAD='''<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<meta name="description" content="3D boat racing with teams, power-ups, 15 courses and live multiplayer. Play free in your browser.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Riptide Rally">
<meta property="og:title" content="Riptide Rally · 3D boat racing">
<meta property="og:description" content="Race boats with your team, grab power-ups and play live with friends. Free in your browser.">
<meta property="og:url" content="https://zayaiken21.github.io/Riptide-Rally/">
<meta property="og:image" content="https://zayaiken21.github.io/Riptide-Rally/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Riptide Rally title over a boat race">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Riptide Rally · 3D boat racing">
<meta name="twitter:image" content="https://zayaiken21.github.io/Riptide-Rally/og.jpg">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="theme-color" content="#062530">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Riptide">
'''
open('/root/boat/index.html','w').write('<!doctype html>\n<html lang="en">\n'+out.replace('<meta charset="utf-8">','<meta charset="utf-8">\n'+HEAD,1)+'\n</html>\n')
t=out.replace("  renderer.render(scene, camera);\n}\n/* below the surface","  if(!window.__nr) renderer.render(scene, camera);\n}\n/* below the surface")
assert t!=out, 'render hook missing' 
t=t.replace("if (state === 'paused') { renderer.render(scene, camera); return; }","if (state === 'paused') { if(!window.__nr) renderer.render(scene, camera); return; }")
t=t.replace("requestAnimationFrame(frame);\n</script>","""requestAnimationFrame(frame);
window.__T = { frame, get state(){return state}, get boats(){return boats}, player, useItem, giveItem, hit, settings, ITEMS, get M(){return M}, setDay(t){ settings.tod='fixed'; dayT=t; }, auto:false, get last(){return last}, whirls:()=>whirls, ctx:()=>({effects:effects.length, drops:drops.length}), buildTrack:(i)=>{buildTrack(i); builtTrack=i;}, renderer, scene, camera, get caveNow(){return caveNow}, get NET(){return NET}, layout, get rotated(){return rotated}, get GAR(){return GAR}, KINDS, SHOP, CUP, redeem, startCup, cupBoardMap, rollItem, owns, checkGrants, get P(){return P}, get NRM(){return NRM}, get sigStats(){return sigStats}, get MODE(){return MODE}, get TR(){return TR}, modeInit, modeEnd, modeTick, startSoloMode, get BROWSE(){return BROWSE}, get lvlE(){return lvl("engine")} };
</script>""")
t=t.replace("placeWater(); renderer.render(scene, camera); return;","placeWater(); if(!window.__nr) renderer.render(scene, camera); return;")
t=t.replace("if (b.isPlayer && !b.finished && state === 'race') {","if (b.isPlayer && !b.finished && state === 'race' && !window.__T.auto) {")
open('/root/boat/test2.html','w').write(t)
print(len(out))
