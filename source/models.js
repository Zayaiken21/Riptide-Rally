// Riptide Rally — shared model builders.
// Used by the game (inlined) and by export-glb.mjs (writes boat.glb, items.glb, environment.glb).
// Conventions: +Y up, boats/creatures face -Z, units ~ metres. No textures, so the GLBs are self-contained.
export function makeModels(THREE) {
  const cache = {};
  const mat = (name, color, o = {}) => {
    if (cache[name]) return cache[name];
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...o });
    m.name = name; cache[name] = m; return m;
  };
  const add = (parent, geo, material, name, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, material); o.name = name;
    o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o;
  };
  const group = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const jitter = (geo, amt, seed = 1) => {
    const p = geo.attributes.position; let s = seed * 9301;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!map.has(k)) map.set(k, [rnd() * amt, rnd() * amt, rnd() * amt]);
      const d = map.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.computeVertexNormals(); return geo;
  };

  /* ===================================================== BOAT */
  function boat() {
    const M = {
      primary: mat('Paint_Primary', 0xe63946, { roughness: 0.28, metalness: 0.15 }),
      accent: mat('Paint_Accent', 0xf1faee, { roughness: 0.32 }),
      bottom: mat('Hull_Bottom', 0x1b1d22, { roughness: 0.55 }),
      deck: mat('Deck_Teak', 0xc8a676, { roughness: 0.75 }),
      seat: mat('Seat', 0x2b2d42, { roughness: 0.9 }),
      glass: mat('Glass', 0x9fd3ff, { transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.2 }),
      chrome: mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 }),
      engine: mat('Engine', 0x1f2228, { metalness: 0.5, roughness: 0.35 }),
      plate: mat('Number_Plate', 0xffffff, { roughness: 0.5 }),
      port: mat('Light_Port', 0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 2 }),
      star: mat('Light_Starboard', 0x2aff5a, { emissive: 0x2aff5a, emissiveIntensity: 2 }),
      head: mat('Light_Head', 0xfff4d6, { emissive: 0xfff4d6, emissiveIntensity: 2 }),
    };
    const root = group('Speedboat');
    const N = 16, S = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, z = 2.1 - t * 4.2;
      const taper = t < 0.55 ? 1 : Math.cos(((t - 0.55) / 0.45) * Math.PI / 2);
      const w = Math.max(0.02, 0.95 * Math.pow(taper, 0.8));
      const keel = -0.32 + 0.12 * t + (t > 0.85 ? (t - 0.85) * 1.2 : 0);
      S.push({ z, w, keel, chine: -0.08 + 0.1 * t, deck: 0.42 + 0.18 * t * t });
    }
    const ring = (s) => [[0, s.keel], [s.w * 0.5, (s.keel + s.chine) / 2 - 0.02], [s.w * 0.92, s.chine], [s.w, s.deck * 0.55], [s.w * 0.97, s.deck]];
    const loft = (material, pick, name) => {
      const pos = [];
      for (let i = 0; i < N; i++) {
        const r0 = ring(S[i]), r1 = ring(S[i + 1]);
        for (const j of pick) for (const sx of [1, -1]) {
          const P = (r, k, s) => [r[k][0] * sx, r[k][1], s.z];
          const a = P(r0, j, S[i]), b = P(r0, j + 1, S[i]), c = P(r1, j + 1, S[i + 1]), d = P(r1, j, S[i + 1]);
          if (sx > 0) pos.push(...a, ...d, ...c, ...a, ...c, ...b); else pos.push(...a, ...b, ...c, ...a, ...c, ...d);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, material); m.name = name; root.add(m); return m;
    };
    loft(M.bottom, [0, 1], 'Hull_Bottom');
    loft(M.primary, [2], 'Hull_Side');
    loft(M.accent, [3], 'Hull_Stripe');
    { // transom
      const r = ring(S[0]), sh = new THREE.Shape();
      sh.moveTo(-r[4][0], r[4][1]);
      for (let k = 4; k >= 0; k--) sh.lineTo(-r[k][0], r[k][1]);
      for (let k = 1; k <= 4; k++) sh.lineTo(r[k][0], r[k][1]);
      add(root, new THREE.ShapeGeometry(sh), M.primary, 'Transom', 0, 0, S[0].z + 0.001);
    }
    { // deck
      const pos = [];
      for (let i = 0; i < N; i++) {
        const a = S[i], b = S[i + 1], ra = ring(a)[4], rb = ring(b)[4];
        pos.push(ra[0], ra[1], a.z, rb[0], rb[1], b.z, -rb[0], rb[1], b.z, ra[0], ra[1], a.z, -rb[0], rb[1], b.z, -ra[0], ra[1], a.z);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const d = new THREE.Mesh(g, M.accent); d.name = 'Deck'; root.add(d);
      // racing stripe down the foredeck
      const st = new THREE.BoxGeometry(0.28, 0.02, 1.9); st.rotateX(-0.06);
      add(root, st, M.primary, 'Deck_Stripe', 0, 0.535, -0.95);
    }
    // spray rails along the hull
    for (const sx of [-1, 1]) {
      const pts = S.slice(1, N - 1).map(s => new THREE.Vector3(sx * s.w * 0.72, (s.keel + s.chine) / 2 + 0.03, s.z));
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.025, 5), M.bottom, 'Spray_Rail');
    }
    // cockpit
    add(root, new THREE.BoxGeometry(1.3, 0.04, 1.5), M.deck, 'Cockpit_Floor', 0, 0.47, 0.75);
    for (const sx of [-1, 1]) {
      add(root, new THREE.BoxGeometry(0.46, 0.2, 0.5), M.seat, 'Seat_Base', sx * 0.32, 0.6, 0.86);
      add(root, new THREE.BoxGeometry(0.46, 0.5, 0.12), M.seat, 'Seat_Back', sx * 0.32, 0.86, 1.1, -0.15);
      add(root, new THREE.BoxGeometry(0.46, 0.08, 0.14), M.primary, 'Seat_Trim', sx * 0.32, 1.12, 1.14, -0.15);
      // number plates
      add(root, new THREE.CircleGeometry(0.2, 24), M.plate, 'Number_Plate', sx * 0.935, 0.28, -0.55, 0, sx * Math.PI / 2, 0);
      // exhaust pipes
      add(root, new THREE.CylinderGeometry(0.05, 0.06, 0.4, 10), M.chrome, 'Exhaust', sx * 0.55, 0.36, 2.1, Math.PI / 2);
    }
    add(root, new THREE.BoxGeometry(1.25, 0.22, 0.26), M.seat, 'Dashboard', 0, 0.62, 0.05);
    add(root, new THREE.BoxGeometry(0.18, 0.1, 0.02), M.head, 'Dash_Screen', 0.3, 0.7, 0.18, -0.5);
    add(root, new THREE.TorusGeometry(0.13, 0.022, 8, 22), M.chrome, 'Steering_Wheel', -0.32, 0.8, 0.22, -0.6);
    add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), M.chrome, 'Steering_Column', -0.32, 0.72, 0.16, -0.6 + Math.PI / 2);
    { // curved windshield
      const pos = [], seg = 12, R = 0.68;
      for (let i = 0; i < seg; i++) {
        const a0 = -Math.PI / 2.4 + (i / seg) * (Math.PI / 1.2), a1 = -Math.PI / 2.4 + ((i + 1) / seg) * (Math.PI / 1.2);
        const p = (a, y, lean) => [Math.sin(a) * R, y, -0.05 - Math.cos(a) * 0.25 + lean];
        const A = p(a0, 0.72, 0), B = p(a1, 0.72, 0), C = p(a1, 1.06, 0.2), D = p(a0, 1.06, 0.2);
        pos.push(...A, ...B, ...C, ...A, ...C, ...D);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const w = new THREE.Mesh(g, M.glass); w.name = 'Windshield'; root.add(w);
      const frame = [];
      for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2.4 + (i / seg) * (Math.PI / 1.2); frame.push(new THREE.Vector3(Math.sin(a) * R, 1.06, -0.05 - Math.cos(a) * 0.25 + 0.2)); }
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(frame), 24, 0.018, 5), M.chrome, 'Windshield_Frame');
    }
    // rear spoiler
    add(root, new THREE.BoxGeometry(1.4, 0.05, 0.32), M.primary, 'Spoiler_Wing', 0, 1.08, 1.82, 0.12);
    for (const sx of [-1, 1]) {
      add(root, new THREE.BoxGeometry(0.05, 0.5, 0.18), M.engine, 'Spoiler_Strut', sx * 0.5, 0.82, 1.82);
      add(root, new THREE.BoxGeometry(0.04, 0.22, 0.4), M.accent, 'Spoiler_Endplate', sx * 0.72, 1.08, 1.82);
      add(root, new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8), M.chrome, 'Rail', sx * 0.62, 0.66, -0.9, Math.PI / 2);
    }
    // engine (own node so the game can spin the prop)
    const eng = group('Engine'); eng.position.set(0, 0.35, 2.15); root.add(eng);
    add(eng, new THREE.BoxGeometry(0.44, 0.5, 0.46), M.engine, 'Engine_Cowl', 0, 0.25, 0.18);
    add(eng, new THREE.BoxGeometry(0.46, 0.09, 0.48), M.primary, 'Engine_Cap', 0, 0.53, 0.18);
    add(eng, new THREE.BoxGeometry(0.46, 0.04, 0.3), M.accent, 'Engine_Stripe', 0, 0.36, 0.18);
    add(eng, new THREE.BoxGeometry(0.12, 0.7, 0.16), M.engine, 'Engine_Shaft', 0, -0.3, 0.25);
    add(eng, new THREE.BoxGeometry(0.06, 0.08, 0.36), M.engine, 'Engine_Skeg', 0, -0.68, 0.3);
    const prop = group('Propeller'); prop.position.set(0, -0.6, 0.4); eng.add(prop);
    add(prop, new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), M.chrome, 'Prop_Hub', 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 3; k++) {
      const pv = group('Blade_Pivot'); pv.rotation.z = k * 2.094; prop.add(pv);
      add(pv, new THREE.BoxGeometry(0.1, 0.22, 0.02), M.chrome, 'Prop_Blade', 0, 0.12, 0, 0, 0.5);
    }
    // nav + head lights
    add(root, new THREE.SphereGeometry(0.045, 10, 8), M.port, 'Light_Port', -0.42, 0.62, -1.6);
    add(root, new THREE.SphereGeometry(0.045, 10, 8), M.star, 'Light_Starboard', 0.42, 0.62, -1.6);
    add(root, new THREE.SphereGeometry(0.06, 10, 8), M.head, 'Light_Head', 0, 0.66, -1.95);
    add(root, new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), M.chrome, 'Antenna', 0.45, 1.25, 1.5);
    return root;
  }

  /* ===================================================== ITEMS */
  function itemBox() {
    const g = group('Item_Box');
    add(g, new THREE.BoxGeometry(1.5, 1.5, 1.5), mat('ItemBox_Glass', 0xbfe9ff, { transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.3, emissive: 0x4fb3ff, emissiveIntensity: 0.25 }), 'ItemBox_Glass');
    const edge = mat('ItemBox_Edge', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 });
    const e = 0.76, t = 0.07;
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      add(g, new THREE.BoxGeometry(1.58, t, t), edge, 'ItemBox_Edge', 0, a * e, b * e);
      add(g, new THREE.BoxGeometry(t, 1.58, t), edge, 'ItemBox_Edge', a * e, 0, b * e);
      add(g, new THREE.BoxGeometry(t, t, 1.58), edge, 'ItemBox_Edge', a * e, b * e, 0);
    }
    const q = group('Question_Mark'); g.add(q);
    const qm = mat('ItemBox_Mark', 0xffd23f, { emissive: 0xffb000, emissiveIntensity: 0.9, roughness: 0.3 });
    const arc = new THREE.TorusGeometry(0.26, 0.085, 10, 26, Math.PI * 1.5); arc.rotateZ(-Math.PI / 2);
    add(q, arc, qm, 'Mark_Hook', 0, 0.2, 0);
    add(q, new THREE.CylinderGeometry(0.085, 0.085, 0.2, 10), qm, 'Mark_Stem', 0, -0.13, 0);
    add(q, new THREE.SphereGeometry(0.1, 12, 10), qm, 'Mark_Dot', 0, -0.42, 0);
    return g;
  }
  function grapple() {
    const g = group('Grapple_Hook');
    const steel = mat('Hook_Steel', 0xcfd6df, { metalness: 0.9, roughness: 0.22 });
    const rope = mat('Hook_Rope', 0xd9b56a, { roughness: 0.9 });
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), steel, 'Hook_Shaft', 0, 0.1, 0);
    add(g, new THREE.TorusGeometry(0.13, 0.04, 8, 18), steel, 'Hook_Eye', 0, 0.68, 0);
    add(g, new THREE.SphereGeometry(0.11, 12, 10), steel, 'Hook_Crown', 0, -0.4, 0);
    for (let k = 0; k < 3; k++) {
      const pv = group('Prong'); pv.rotation.y = k * Math.PI * 2 / 3; g.add(pv);
      add(pv, new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI * 0.75), steel, 'Hook_Prong', 0.3, -0.4, 0, 0, 0, Math.PI);
      add(pv, new THREE.ConeGeometry(0.07, 0.18, 8), steel, 'Hook_Tip', 0.6 * Math.cos(Math.PI * 0.25) + 0.08, -0.4 + 0.3 * Math.sin(Math.PI * 0.25) + 0.08, 0, 0, 0, -0.5);
    }
    add(g, new THREE.TorusGeometry(0.32, 0.06, 8, 24), rope, 'Hook_Rope', 0, 0.62, 0.0, Math.PI / 2);
    add(g, new THREE.TorusGeometry(0.26, 0.06, 8, 24), rope, 'Hook_Rope', 0, 0.74, 0.0, Math.PI / 2);
    return g;
  }
  function gluePuddle() {
    const g = group('Glue_Trap');
    const glue = mat('Glue', 0xa8e22c, { roughness: 0.12, metalness: 0.0, emissive: 0x2f5a00, emissiveIntensity: 0.25 });
    const s = jitter(new THREE.SphereGeometry(1, 28, 10), 0.18, 3); s.scale(1.7, 0.16, 1.7);
    add(g, s, glue, 'Glue_Puddle', 0, 0.05, 0);
    const ring = new THREE.TorusGeometry(1.75, 0.16, 8, 32); ring.rotateX(Math.PI / 2);
    add(g, ring, mat('Glue_Float', 0xffd23f, { roughness: 0.4 }), 'Glue_Float_Ring', 0, 0.06, 0);
    const bub = mat('Glue_Bubble', 0xd4ff7a, { roughness: 0.05, transparent: true, opacity: 0.85 });
    [[0.5, 0.2, 0.3, 0.22], [-0.6, 0.18, -0.2, 0.17], [0.1, 0.16, -0.7, 0.14], [-0.2, 0.2, 0.6, 0.12], [0.9, 0.15, -0.3, 0.1]]
      .forEach(([x, y, z, r]) => add(g, new THREE.SphereGeometry(r, 12, 8), bub, 'Glue_Bubble', x, y, z));
    return g;
  }
  function glueBottle() {
    const g = group('Glue_Bottle');
    add(g, new THREE.CylinderGeometry(0.38, 0.42, 0.95, 18), mat('Bottle_White', 0xf5f7fa, { roughness: 0.35 }), 'Bottle_Body', 0, 0, 0);
    add(g, new THREE.CylinderGeometry(0.43, 0.43, 0.42, 18), mat('Glue', 0xa8e22c), 'Bottle_Label', 0, -0.02, 0);
    add(g, new THREE.CylinderGeometry(0.2, 0.38, 0.22, 18), mat('Bottle_White', 0xf5f7fa), 'Bottle_Shoulder', 0, 0.58, 0);
    add(g, new THREE.ConeGeometry(0.16, 0.42, 14), mat('Bottle_Cap', 0xff7a1a, { roughness: 0.4 }), 'Bottle_Cap', 0, 0.9, 0);
    const drip = jitter(new THREE.SphereGeometry(0.16, 10, 8), 0.04, 5); drip.scale(1, 1.4, 1);
    add(g, drip, mat('Glue', 0xa8e22c), 'Bottle_Drip', 0.3, 0.45, 0.25);
    return g;
  }
  function turboCan(name = 'Turbo_Can') {
    const g = group(name);
    add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.8, 18), mat('Turbo_Red', 0xff3b30, { roughness: 0.25, metalness: 0.3 }), 'Can_Body', 0, 0, 0);
    add(g, new THREE.CylinderGeometry(0.27, 0.27, 0.16, 18), mat('Turbo_Yellow', 0xffd23f, { roughness: 0.3 }), 'Can_Band', 0, 0.05, 0);
    add(g, new THREE.CylinderGeometry(0.2, 0.26, 0.12, 18), mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 }), 'Can_Shoulder', 0, 0.46, 0);
    add(g, new THREE.CylinderGeometry(0.07, 0.1, 0.18, 10), mat('Chrome', 0xd3d7de), 'Can_Valve', 0, 0.6, 0);
    add(g, new THREE.ConeGeometry(0.16, 0.42, 12, 1, true), mat('Turbo_Flame', 0x5fd8ff, { emissive: 0x3fc7ff, emissiveIntensity: 1.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 'Can_Flame', 0, -0.62, 0, Math.PI);
    return g;
  }
  function turboTriple() {
    const g = group('Triple_Turbo');
    [[-0.42, 0, 0.1, 0.18], [0.42, 0, 0.1, -0.18], [0, 0.12, -0.3, 0]].forEach(([x, y, z, r], i) => {
      const c = turboCan('Turbo_Can_' + (i + 1)); c.position.set(x, y, z); c.rotation.z = r; c.scale.setScalar(0.85); g.add(c);
    });
    return g;
  }
  function shield() {
    const g = group('Bubble_Shield');
    add(g, new THREE.SphereGeometry(0.9, 32, 20), mat('Shield', 0x7fe7ff, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.4, emissive: 0x2fb6ff, emissiveIntensity: 0.35 }), 'Shield_Sphere');
    const r = new THREE.TorusGeometry(0.92, 0.035, 8, 48);
    add(g, r, mat('Shield_Ring', 0xffffff, { emissive: 0x9feeff, emissiveIntensity: 1 }), 'Shield_Ring', 0, 0, 0, Math.PI / 2);
    add(g, r.clone(), mat('Shield_Ring', 0xffffff), 'Shield_Ring', 0, 0, 0, 0.5, 0.6);
    add(g, new THREE.SphereGeometry(0.16, 12, 10), mat('Shine', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), 'Shield_Shine', -0.4, 0.45, 0.6);
    return g;
  }
  function balloon() {
    const g = group('Splash_Balloon');
    const b = new THREE.SphereGeometry(0.55, 24, 18); b.scale(1, 1.15, 1);
    const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const k = 1 + y * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } b.computeVertexNormals();
    add(g, b, mat('Balloon_Blue', 0x2f9bff, { roughness: 0.12, transparent: true, opacity: 0.88 }), 'Balloon_Body', 0, 0.1, 0);
    add(g, new THREE.ConeGeometry(0.1, 0.16, 10), mat('Balloon_Knot', 0x1d6fd1), 'Balloon_Knot', 0, -0.58, 0);
    add(g, new THREE.TorusGeometry(0.08, 0.03, 6, 12), mat('Balloon_Knot', 0x1d6fd1), 'Balloon_Lip', 0, -0.68, 0, Math.PI / 2);
    add(g, new THREE.SphereGeometry(0.12, 10, 8), mat('Shine', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), 'Balloon_Shine', -0.22, 0.4, 0.38);
    return g;
  }
  function homingBubble() {
    const g = group('Homing_Bubble');
    add(g, new THREE.SphereGeometry(0.62, 28, 20), mat('Bubble_Pink', 0xff7ad9, { transparent: true, opacity: 0.45, roughness: 0.04, metalness: 0.3, emissive: 0xff4fc8, emissiveIntensity: 0.35 }), 'Bubble_Skin');
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.12 : 0.28; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const sg = new THREE.ExtrudeGeometry(star, { depth: 0.1, bevelEnabled: false }); sg.translate(0, 0, -0.05);
    add(g, sg, mat('Bubble_Star', 0xfff07a, { emissive: 0xffd23f, emissiveIntensity: 1 }), 'Bubble_Star');
    add(g, new THREE.SphereGeometry(0.12, 10, 8), mat('Shine', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), 'Bubble_Shine', -0.26, 0.32, 0.42);
    return g;
  }
  function fogCloud() {
    const g = group('Fog_Bank');
    const m = mat('Fog_Cloud', 0xe9eef5, { roughness: 1, flatShading: true });
    [[0, 0, 0, 0.6], [0.55, -0.08, 0.1, 0.45], [-0.55, -0.1, 0.05, 0.48], [0.25, 0.3, -0.1, 0.42], [-0.3, 0.25, 0.15, 0.38], [0.9, -0.2, -0.1, 0.3], [-0.95, -0.22, -0.05, 0.3]]
      .forEach(([x, y, z, r], i) => add(g, jitter(new THREE.IcosahedronGeometry(r, 1), 0.06, i + 2), m, 'Cloud_Puff', x, y, z));
    const horn = mat('Horn_Brass', 0xe0b04a, { metalness: 0.8, roughness: 0.3 });
    add(g, new THREE.CylinderGeometry(0.06, 0.28, 0.5, 14, 1, true), horn, 'Fog_Horn', 0.15, -0.55, 0.45, 1.2, 0, 0.3);
    return g;
  }
  function sail() {
    const g = group('Tailwind_Sail');
    const wood = mat('Mast_Wood', 0xa9773f, { roughness: 0.8 });
    add(g, new THREE.CylinderGeometry(0.04, 0.05, 2.4, 8), wood, 'Mast', 0, 1.2, 0);
    add(g, new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), wood, 'Boom', 0, 0.35, 0.62, Math.PI / 2);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.4); sh.lineTo(0, 2.3); sh.quadraticCurveTo(0.75, 1.2, 1.25, 0.4); sh.lineTo(0, 0.4);
    const sg = new THREE.ShapeGeometry(sh, 12);
    const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x / 1.25 * Math.PI) * 0.22); } sg.computeVertexNormals();
    add(g, sg, mat('Sail_Cloth', 0xfdfcf7, { roughness: 0.85, side: THREE.DoubleSide }), 'Sail_Cloth', 0, 0, 0.02, 0, -Math.PI / 2, 0);
    const st = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0.9); s.lineTo(0, 1.15); s.lineTo(1.0, 0.75); s.lineTo(0.95, 0.55); s.lineTo(0, 0.9); return s; })());
    add(g, st, mat('Paint_Primary', 0xe63946), 'Sail_Stripe', 0.03, 0, 0.0, 0, -Math.PI / 2, 0);
    add(g, new THREE.PlaneGeometry(0.35, 0.2), mat('Sail_Flag', 0xffd23f, { side: THREE.DoubleSide }), 'Flag', 0, 2.3, 0.2, 0, Math.PI / 2, 0);
    return g;
  }
  function dolphin() {
    const g = group('Dolphin');
    const prof = [[0.02, -1.25], [0.1, -1.05], [0.2, -0.8], [0.34, -0.35], [0.42, 0.1], [0.4, 0.4], [0.3, 0.7], [0.16, 0.86], [0.12, 1.02], [0.07, 1.16], [0.01, 1.2]];
    const lg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 22);
    lg.rotateX(-Math.PI / 2); lg.scale(1, 0.9, 1);
    // countershading: blue-grey back, pale belly
    const col = [], n = lg.attributes.normal, top = new THREE.Color(0x5f86a8), belly = new THREE.Color(0xe8f0f5), c = new THREE.Color();
    lg.computeVertexNormals();
    for (let i = 0; i < n.count; i++) { c.copy(belly).lerp(top, THREE.MathUtils.smoothstep(n.getY(i), -0.45, 0.15)); col.push(c.r, c.g, c.b); }
    lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    add(g, lg, mat('Dolphin_Skin', 0xffffff, { vertexColors: true, roughness: 0.3 }), 'Dolphin_Body');
    const skin = mat('Dolphin_Fin', 0x5f86a8, { roughness: 0.35 });
    const fin = new THREE.ConeGeometry(0.22, 0.55, 3); fin.scale(0.25, 1, 1);
    add(g, fin, skin, 'Dorsal_Fin', 0, 0.48, 0.1, -0.5);
    for (const sx of [-1, 1]) {
      const fl = new THREE.SphereGeometry(0.3, 10, 6); fl.scale(1, 0.12, 0.5);
      add(g, fl, skin, 'Fluke', sx * 0.24, 0, 1.25, 0, sx * 0.4, 0);
      const fp = new THREE.SphereGeometry(0.22, 10, 6); fp.scale(1, 0.12, 0.5);
      add(g, fp, skin, 'Flipper', sx * 0.38, -0.18, -0.3, 0, sx * -0.5, sx * -0.6);
      add(g, new THREE.SphereGeometry(0.045, 8, 6), mat('Eye_Black', 0x111111, { roughness: 0.2 }), 'Eye', sx * 0.2, 0.12, -0.72);
    }
    return g;
  }
  function duck() {
    const g = group('Rubber_Duck');
    const y = mat('Duck_Yellow', 0xffd21f, { roughness: 0.32 });
    const body = new THREE.SphereGeometry(0.8, 28, 20); body.scale(1, 0.72, 1.25);
    add(g, body, y, 'Duck_Body', 0, 0.45, 0.1);
    const tail = new THREE.ConeGeometry(0.32, 0.6, 14); tail.rotateX(-1.1);
    add(g, tail, y, 'Duck_Tail', 0, 0.8, 1.05);
    add(g, new THREE.SphereGeometry(0.5, 24, 18), y, 'Duck_Head', 0, 1.25, -0.55);
    const beak = new THREE.SphereGeometry(0.28, 16, 10); beak.scale(1, 0.38, 1.1);
    add(g, beak, mat('Duck_Beak', 0xff7a1a, { roughness: 0.4 }), 'Duck_Beak', 0, 1.12, -1.02);
    for (const sx of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.1, 12, 10), mat('Eye_Black', 0x111111, { roughness: 0.2 }), 'Duck_Eye', sx * 0.25, 1.38, -0.92);
      add(g, new THREE.SphereGeometry(0.035, 8, 6), mat('Shine', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), 'Duck_Eye_Shine', sx * 0.27, 1.43, -1.0);
      const wing = new THREE.SphereGeometry(0.42, 16, 10); wing.scale(0.35, 0.6, 1);
      add(g, wing, y, 'Duck_Wing', sx * 0.72, 0.55, 0.15, 0.2, 0, sx * 0.25);
    }
    return g;
  }
  function magnet() {
    const g = group('Tow_Magnet');
    const red = mat('Magnet_Red', 0xe8323c, { roughness: 0.3, metalness: 0.2 });
    const tip = mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 });
    add(g, new THREE.TorusGeometry(0.42, 0.15, 12, 28, Math.PI), red, 'Magnet_Arc', 0, 0.15, 0);
    for (const sx of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.45, 14), red, 'Magnet_Leg', sx * 0.42, -0.08, 0);
      add(g, new THREE.CylinderGeometry(0.155, 0.155, 0.22, 14), tip, 'Magnet_Tip', sx * 0.42, -0.4, 0);
    }
    const spark = mat('Spark', 0x9feeff, { emissive: 0x6fdfff, emissiveIntensity: 1.5 });
    [[-0.15, -0.75], [0.15, -0.8], [0, -0.95]].forEach(([x, yy], i) => add(g, new THREE.OctahedronGeometry(0.07), spark, 'Magnet_Spark', x, yy, 0, 0, i));
    return g;
  }
  function tidalWave(width = 2.4) {
    const g = group('Tidal_Wave');
    const sh = new THREE.Shape();
    sh.moveTo(1.4, 0); sh.quadraticCurveTo(0.6, 0.15, 0.25, 0.9); sh.quadraticCurveTo(0.0, 1.45, -0.55, 1.35);
    sh.quadraticCurveTo(-0.95, 1.2, -0.85, 0.85); sh.quadraticCurveTo(-0.55, 1.0, -0.4, 0.75);
    sh.quadraticCurveTo(-0.3, 0.35, -0.9, 0); sh.lineTo(1.4, 0);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 14 });
    eg.translate(0, 0, -width / 2); eg.rotateY(Math.PI / 2);
    add(g, eg, mat('Wave_Water', 0x1fa3d6, { roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.92 }), 'Wave_Body');
    const foam = mat('Wave_Foam', 0xffffff, { roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.15 });
    for (let i = 0; i < 9; i++) {
      const x = -width / 2 + (i + 0.5) * width / 9;
      add(g, jitter(new THREE.IcosahedronGeometry(0.2 + (i % 3) * 0.04, 1), 0.04, i + 7), foam, 'Wave_Foam', x, 1.32 + (i % 2) * 0.05, 0.6 + (i % 3) * 0.06);
    }
    return g;
  }


  /* ===================================================== NEW ITEMS */
  function jumpJet() {
    const g = group('Jump_Jet');
    const body = mat('Jet_Body', 0x2f6fe0, { roughness: 0.3, metalness: 0.4 }), steel = mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 });
    for (const sx of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.22, 0.22, 1.0, 16), body, 'Jet_Tube', sx * 0.32, 0, 0);
      add(g, new THREE.ConeGeometry(0.22, 0.4, 16), mat('Jet_Nose', 0xff3b30, { roughness: 0.3 }), 'Jet_Nose', sx * 0.32, 0.7, 0);
      add(g, new THREE.CylinderGeometry(0.16, 0.24, 0.18, 14), steel, 'Jet_Nozzle', sx * 0.32, -0.59, 0);
      add(g, new THREE.ConeGeometry(0.18, 0.55, 12, 1, true), mat('Turbo_Flame', 0x5fd8ff, { emissive: 0x3fc7ff, emissiveIntensity: 1.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 'Jet_Flame', sx * 0.32, -0.95, 0, Math.PI);
      const fin = new THREE.BoxGeometry(0.04, 0.35, 0.3); add(g, fin, mat('Turbo_Yellow', 0xffd23f), 'Jet_Fin', sx * 0.56, -0.35, 0, 0, 0, sx * 0.3);
    }
    add(g, new THREE.BoxGeometry(0.5, 0.18, 0.2), steel, 'Jet_Strap', 0, 0.1, 0);
    return g;
  }
  function octopus() {
    const g = group('Octopus_Ink');
    const skin = mat('Octo_Skin', 0x9b4dff, { roughness: 0.45 });
    const head = new THREE.SphereGeometry(0.55, 22, 16); head.scale(1, 1.15, 1);
    add(g, head, skin, 'Octo_Head', 0, 0.45, 0);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, pts = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6, r = 0.35 + t * 0.6; pts.push(new THREE.Vector3(Math.cos(a) * r, -t * 0.5 + Math.sin(t * 5 + i) * 0.08, Math.sin(a) * r)); }
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.08, 6), skin, 'Octo_Arm');
    }
    for (const sx of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.14, 12, 10), mat('Eye_White', 0xffffff, { roughness: 0.3 }), 'Octo_Eye', sx * 0.22, 0.55, 0.43);
      add(g, new THREE.SphereGeometry(0.07, 10, 8), mat('Eye_Black', 0x111111, { roughness: 0.2 }), 'Octo_Pupil', sx * 0.22, 0.55, 0.55);
    }
    [[0.5, -0.1, 0.4, 0.16], [0.7, 0.05, 0.2, 0.12], [0.62, -0.2, 0.6, 0.1]].forEach(([x, y, z, r]) => add(g, new THREE.SphereGeometry(r, 10, 8), mat('Ink', 0x1a1530, { roughness: 0.1 }), 'Ink_Blob', x, y, z));
    return g;
  }
  function beachBall() {
    const g = group('Beach_Ball');
    const geo = new THREE.SphereGeometry(0.7, 32, 20), cols = [0xff3b30, 0xffffff, 0x2f6fe0, 0xffffff, 0xffd23f, 0xffffff];
    const pos = geo.attributes.position, col = [], c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 0.7;
      if (Math.abs(y) > 0.93) c.set(0xffffff); else { const a = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI; c.set(cols[Math.floor(a / (Math.PI * 2) * 6) % 6]); }
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    add(g, geo, mat('Beach_Ball', 0xffffff, { vertexColors: true, roughness: 0.35 }), 'Ball');
    add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12), mat('Bottle_White', 0xf5f7fa), 'Ball_Cap', 0, 0.7, 0);
    return g;
  }
  function lowTide() {
    const g = group('Low_Tide');
    const wood = mat('Mast_Wood', 0xa9773f, { roughness: 0.8 }), glass = mat('Glass', 0x9fd3ff, { transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.2 });
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20), wood, 'Glass_Top', 0, 0.75, 0);
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20), wood, 'Glass_Base', 0, -0.75, 0);
    const bulb = new THREE.LatheGeometry([[0.02, -0.69], [0.4, -0.55], [0.42, -0.3], [0.08, -0.02], [0.08, 0.02], [0.42, 0.3], [0.4, 0.55], [0.02, 0.69]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    add(g, bulb, glass, 'Glass_Bulb');
    add(g, new THREE.CylinderGeometry(0.06, 0.36, 0.3, 18), mat('Wave_Water', 0x1fa3d6, { roughness: 0.12, transparent: true, opacity: 0.92 }), 'Glass_Water', 0, -0.52, 0);
    for (const a of [0, 2.1, 4.2]) add(g, new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), wood, 'Glass_Post', Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48);
    return g;
  }
  function fakeBox() {
    const g = itemBox(); g.name = 'Fake_Box';
    g.traverse(o => { if (o.isMesh && o.material.name === 'ItemBox_Mark') o.material = mat('Fake_Mark', 0xff4d4d, { emissive: 0xff2020, emissiveIntensity: 0.9, roughness: 0.3 }); });
    g.traverse(o => { if (o.isMesh && o.material.name === 'ItemBox_Glass') o.material = mat('Fake_Glass', 0xffc4c4, { transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.3, emissive: 0xff6060, emissiveIntensity: 0.2 }); });
    return g;
  }
  function chest() {
    const g = group('Treasure_Chest');
    const wood = mat('Chest_Wood', 0x8a5a2b, { roughness: 0.8 }), gold = mat('Gold', 0xffc93c, { metalness: 0.85, roughness: 0.25, emissive: 0x7a4a00, emissiveIntensity: 0.2 });
    add(g, new THREE.BoxGeometry(1.2, 0.6, 0.8), wood, 'Chest_Box', 0, -0.2, 0);
    const lid = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, false, 0, Math.PI); lid.rotateZ(Math.PI / 2);
    add(g, lid, wood, 'Chest_Lid', 0, 0.1, -0.12, -0.5);
    for (const x of [-0.45, 0.45]) add(g, new THREE.BoxGeometry(0.08, 0.62, 0.82), gold, 'Chest_Band', x, -0.2, 0);
    add(g, new THREE.BoxGeometry(0.16, 0.2, 0.06), gold, 'Chest_Lock', 0, 0, 0.42);
    for (let i = 0; i < 9; i++) add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), gold, 'Coin', -0.35 + (i % 3) * 0.33 + Math.sin(i) * 0.05, 0.13 + Math.floor(i / 3) * 0.05, -0.1 + Math.cos(i * 2) * 0.12, 0.3 * Math.sin(i), 0, 0.3 * Math.cos(i));
    return g;
  }
  /* ===================================================== NEW COURSE PIECES */
  function jellyfish() {
    const g = group('Jellyfish');
    const bell = new THREE.SphereGeometry(0.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    add(g, bell, mat('Jelly_Bell', 0xff8ad8, { transparent: true, opacity: 0.6, roughness: 0.1, emissive: 0xff4fc8, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 'Jelly_Bell');
    const tm = mat('Jelly_Tentacle', 0xffc2ee, { emissive: 0xff7ad9, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, r = 0.55, pts = [];
      for (let k = 0; k <= 5; k++) pts.push(new THREE.Vector3(Math.cos(a) * r * (1 - k * 0.08) + Math.sin(k + i) * 0.08, -k * 0.35, Math.sin(a) * r * (1 - k * 0.08)));
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.03, 4), tm, 'Jelly_Tentacle');
    }
    return g;
  }
  function iceberg(seed = 1) {
    const g = group('Iceberg');
    const geo = jitter(new THREE.IcosahedronGeometry(1, 1), 0.35, seed); geo.scale(1.3, 1.0, 1.1);
    add(g, geo, mat('Ice', 0xe9f6ff, { roughness: 0.25, metalness: 0.05, flatShading: true, emissive: 0x6fb7e6, emissiveIntensity: 0.12 }), 'Ice_Top', 0, 0.35, 0);
    const under = jitter(new THREE.IcosahedronGeometry(1.3, 1), 0.4, seed + 4); under.scale(1.2, 0.8, 1.1);
    add(g, under, mat('Ice_Under', 0x7fc4ea, { roughness: 0.3, flatShading: true, transparent: true, opacity: 0.85 }), 'Ice_Under', 0, -0.6, 0);
    return g;
  }
  function coral(kind = 0) {
    const g = group('Coral');
    const colors = [0xff6f61, 0xffb347, 0xc86bfa, 0x4fd1c5, 0xff7ab8];
    const m = mat('Coral_' + kind, colors[kind % colors.length], { roughness: 0.7, flatShading: true });
    if (kind % 3 === 0) { // branching
      const branch = (x, y, z, len, ry, rz, depth) => {
        add(g, new THREE.CylinderGeometry(0.08, 0.13, len, 6).translate(0, len / 2, 0), m, 'Coral_Branch', x, y, z, 0, ry, rz);
        if (depth > 0) { const ex = x - Math.sin(rz) * len * Math.cos(ry), ey = y + Math.cos(rz) * len, ez = z + Math.sin(rz) * len * Math.sin(ry);
          branch(ex, ey, ez, len * 0.7, ry + 1.1, rz + 0.5, depth - 1); branch(ex, ey, ez, len * 0.7, ry - 1.3, rz - 0.4, depth - 1); }
      };
      branch(0, 0, 0, 0.8, 0, 0.1, 2);
    } else if (kind % 3 === 1) { // brain coral
      add(g, jitter(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.12, kind + 3), m, 'Coral_Brain');
    } else { // tube sponges
      for (let i = 0; i < 5; i++) add(g, new THREE.CylinderGeometry(0.16, 0.2, 0.6 + i * 0.25, 10, 1, true).translate(0, (0.6 + i * 0.25) / 2, 0), m, 'Coral_Tube', Math.cos(i * 1.3) * 0.3, 0, Math.sin(i * 1.3) * 0.3);
    }
    return g;
  }
  function fish(color = 0xffb347) {
    const g = group('Fish');
    const b = new THREE.SphereGeometry(0.3, 10, 8); b.scale(0.45, 0.8, 1.3);
    add(g, b, mat('Fish_' + color.toString(16), color, { roughness: 0.4 }), 'Fish_Body');
    const t = new THREE.ConeGeometry(0.2, 0.3, 4); t.rotateX(-Math.PI / 2); t.scale(0.2, 1, 1);
    add(g, t, mat('Fish_' + color.toString(16), color), 'Fish_Tail', 0, 0, 0.5);
    return g;
  }

  /* ===================================================== V7 POWER-UPS */
  function starShine() {
    const g = group('Star_Shine');
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.32 : 0.75; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }); geo.translate(0, 0, -0.14);
    add(g, geo, mat('Star_Gold', 0xffe14d, { emissive: 0xffb000, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.25 }), 'Star');
    for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.07, 10, 8), mat('Eye_Black', 0x111111, { roughness: 0.2 }), 'Star_Eye', sx * 0.15, 0.1, 0.25);
    return g;
  }
  function shrinkRay() {
    const g = group('Shrink_Ray');
    const body = mat('Ray_Body', 0x7c4dff, { roughness: 0.3, metalness: 0.4 }), chrome = mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 });
    add(g, new THREE.CylinderGeometry(0.22, 0.28, 0.9, 16), body, 'Ray_Barrel', 0, 0.1, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) add(g, new THREE.TorusGeometry(0.26 - i * 0.03, 0.035, 8, 20), chrome, 'Ray_Ring', -0.15 + i * 0.22, 0.1, 0, 0, Math.PI / 2, 0);
    add(g, new THREE.SphereGeometry(0.16, 14, 10), mat('Ray_Tip', 0x9feeff, { emissive: 0x5fd8ff, emissiveIntensity: 1.5 }), 'Ray_Tip', 0.55, 0.1, 0);
    add(g, new THREE.BoxGeometry(0.16, 0.42, 0.18), body, 'Ray_Grip', -0.2, -0.22, 0, 0, 0, 0.25);
    return g;
  }
  function bubbleWall() {
    const g = group('Bubble_Wall');
    const m = mat('Bubble_Blue', 0x8fe3ff, { transparent: true, opacity: 0.45, roughness: 0.04, metalness: 0.3, emissive: 0x3fb7ff, emissiveIntensity: 0.3 });
    [[-0.6, 0, 0.35], [0, 0.05, 0.42], [0.6, 0, 0.35], [-0.3, 0.55, 0.3], [0.3, 0.55, 0.3], [0, 1.0, 0.26]].forEach(([x, y, r]) => add(g, new THREE.SphereGeometry(r, 18, 14), m, 'Wall_Bubble', x, y, 0));
    return g;
  }
  function warpPearl() {
    const g = group('Warp_Pearl');
    const shell = mat('Shell_Pink', 0xffb3c7, { roughness: 0.5 });
    const half = new THREE.SphereGeometry(0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); half.scale(1, 0.4, 1);
    add(g, half.clone().rotateX(Math.PI), shell, 'Shell_Bottom', 0, -0.05, 0);
    add(g, half, shell, 'Shell_Top', 0, 0.15, -0.35, -0.9);
    add(g, new THREE.SphereGeometry(0.28, 20, 16), mat('Pearl', 0xf2f0ff, { metalness: 0.3, roughness: 0.12, emissive: 0xb39dff, emissiveIntensity: 0.45 }), 'Pearl', 0, 0.12, 0.1);
    return g;
  }
  function springBuoy() {
    const g = group('Spring_Buoy');
    const red = mat('Buoy_ef4444', 0xef4444, { roughness: 0.4 });
    add(g, new THREE.CylinderGeometry(0.55, 0.65, 0.3, 18), red, 'Spring_Base', 0, -0.55, 0);
    const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 10; pts.push(new THREE.Vector3(Math.cos(a) * 0.32, -0.4 + t * 0.85, Math.sin(a) * 0.32)); }
    add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 6), mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 }), 'Spring_Coil');
    add(g, new THREE.CylinderGeometry(0.5, 0.42, 0.18, 18), mat('Turbo_Yellow', 0xffd23f), 'Spring_Pad', 0, 0.52, 0);
    return g;
  }
  function copycat() {
    const g = group('Copycat_Mirror');
    const frame = mat('Gold', 0xffc93c, { metalness: 0.85, roughness: 0.25, emissive: 0x7a4a00, emissiveIntensity: 0.2 });
    const ring = new THREE.TorusGeometry(0.55, 0.08, 10, 32); ring.scale(0.8, 1, 1);
    add(g, ring, frame, 'Mirror_Frame', 0, 0.15, 0);
    const glass = new THREE.CircleGeometry(0.55, 32); glass.scale(0.8, 1, 1);
    add(g, glass, mat('Mirror_Glass', 0xcfe8ff, { metalness: 1, roughness: 0.05, emissive: 0x6fa8ff, emissiveIntensity: 0.25 }), 'Mirror_Glass', 0, 0.15, 0.01);
    add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), frame, 'Mirror_Handle', 0, -0.62, 0);
    for (const sx of [-1, 1]) add(g, new THREE.ConeGeometry(0.12, 0.22, 4), frame, 'Mirror_Ear', sx * 0.32, 0.72, 0, 0, 0, sx * -0.3);
    return g;
  }

  /* ===================================================== V7 BOATS (same material names as the speedboat, so team paint works) */
  const hullMats = () => ({
    primary: mat('Paint_Primary', 0xe63946, { roughness: 0.28, metalness: 0.15 }), accent: mat('Paint_Accent', 0xf1faee, { roughness: 0.32 }),
    bottom: mat('Hull_Bottom', 0x1b1d22, { roughness: 0.55 }), deck: mat('Deck_Teak', 0xc8a676, { roughness: 0.75 }), seat: mat('Seat', 0x2b2d42, { roughness: 0.9 }),
    glass: mat('Glass', 0x9fd3ff, { transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.2 }), chrome: mat('Chrome', 0xd3d7de, { metalness: 0.95, roughness: 0.18 }),
    engine: mat('Engine', 0x1f2228, { metalness: 0.5, roughness: 0.35 }), plate: mat('Number_Plate', 0xffffff, { roughness: 0.5 }),
    head: mat('Light_Head', 0xfff4d6, { emissive: 0xfff4d6, emissiveIntensity: 2 }), port: mat('Light_Port', 0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 2 }), star: mat('Light_Starboard', 0x2aff5a, { emissive: 0x2aff5a, emissiveIntensity: 2 }),
  });
  // a slim pointed hull (used for offshore racer, catamaran pontoons, hydroplane sponsons, jet ski)
  function slimHull(parent, len, wid, hgt, Mt, name, x = 0, y = 0, z = 0) {
    const N = 14, pos = [];
    const sec = []; for (let i = 0; i <= N; i++) { const t = i / N, zz = len / 2 - t * len; const taper = t < 0.5 ? 1 : Math.cos(((t - 0.5) / 0.5) * Math.PI / 2); sec.push({ z: zz, w: Math.max(0.02, wid * Math.pow(taper, 0.7)), k: -hgt * 0.45 * (1 - t * 0.5), d: hgt * (0.5 + 0.15 * t * t) }); }
    const ring = (s) => [[0, s.k], [s.w * 0.95, s.k * 0.25], [s.w, s.d * 0.5], [s.w * 0.92, s.d]];
    const quad = (m, j, mirror) => { const p = []; for (let i = 0; i < N; i++) { const r0 = ring(sec[i]), r1 = ring(sec[i + 1]); for (const sx of mirror ? [1, -1] : [1]) { const P = (r, k, s) => [x + r[k][0] * sx, y + r[k][1], z + s.z]; const a = P(r0, j, sec[i]), b = P(r0, j + 1, sec[i]), c = P(r1, j + 1, sec[i + 1]), d = P(r1, j, sec[i + 1]); if (sx > 0) p.push(...a, ...d, ...c, ...a, ...c, ...b); else p.push(...a, ...b, ...c, ...a, ...c, ...d); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.name = name; parent.add(o); };
    quad(Mt.bottom, 0, true); quad(Mt.primary, 1, true); quad(Mt.accent, 2, true);
    { const p = []; for (let i = 0; i < N; i++) { const a = sec[i], b = sec[i + 1], ra = ring(a)[3], rb = ring(b)[3];
        p.push(x + ra[0], y + ra[1], z + a.z, x + rb[0], y + rb[1], z + b.z, x - rb[0], y + rb[1], z + b.z, x + ra[0], y + ra[1], z + a.z, x - rb[0], y + rb[1], z + b.z, x - ra[0], y + ra[1], z + a.z); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); const o = new THREE.Mesh(g, Mt.accent); o.name = name + '_Deck'; parent.add(o); }
    { const r = ring(sec[0]), sh = new THREE.Shape(); sh.moveTo(-r[3][0], r[3][1]); for (let k = 3; k >= 0; k--) sh.lineTo(-r[k][0], r[k][1]); for (let k = 1; k <= 3; k++) sh.lineTo(r[k][0], r[k][1]);
      add(parent, new THREE.ShapeGeometry(sh), Mt.primary, name + '_Transom', x, y, z + sec[0].z + 0.001); }
    return sec;
  }
  function addProp(parent, Mt, x, y, z, s = 1) {
    const prop = group('Propeller'); prop.position.set(x, y, z); parent.add(prop);
    add(prop, new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.1, 10), Mt.chrome, 'Prop_Hub', 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 3; k++) { const pv = group('Blade_Pivot'); pv.rotation.z = k * 2.094; prop.add(pv); add(pv, new THREE.BoxGeometry(0.1 * s, 0.22 * s, 0.02), Mt.chrome, 'Prop_Blade', 0, 0.12 * s, 0, 0, 0.5); }
    return prop;
  }
  function plates(parent, Mt, x, y, z) { for (const sx of [-1, 1]) add(parent, new THREE.CircleGeometry(0.2, 24), Mt.plate, 'Number_Plate', sx * x, y, z, 0, sx * Math.PI / 2, 0); }
  function boatOffshore() {
    const g = group('Offshore_Racer'), Mt = hullMats();
    slimHull(g, 5.0, 0.85, 0.75, Mt, 'Hull');
    add(g, new THREE.BoxGeometry(0.9, 0.35, 1.1), Mt.seat, 'Cockpit', 0, 0.55, 0.9);
    const canopy = new THREE.SphereGeometry(0.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); canopy.scale(0.9, 0.55, 1.4);
    add(g, canopy, Mt.glass, 'Canopy', 0, 0.6, 0.55);
    add(g, new THREE.BoxGeometry(0.2, 0.03, 3.4), Mt.primary, 'Deck_Stripe', 0, 0.58, -0.6);
    for (const sx of [-1, 1]) { add(g, new THREE.BoxGeometry(0.4, 0.45, 0.45), Mt.engine, 'Engine_Cowl', sx * 0.3, 0.6, 2.55); add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.4, 10), Mt.chrome, 'Exhaust', sx * 0.3, 0.48, 2.8, Math.PI / 2); }
    addProp(g, Mt, 0, -0.35, 2.75);
    plates(g, Mt, 0.84, 0.25, -0.4);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), Mt.head, 'Light_Head', 0, 0.55, -2.3);
    return g;
  }
  function boatCatamaran() {
    const g = group('Catamaran'), Mt = hullMats();
    for (const sx of [-1, 1]) slimHull(g, 4.6, 0.38, 0.7, Mt, 'Pontoon', sx * 0.95, 0, 0);
    add(g, new THREE.BoxGeometry(2.3, 0.14, 2.6), Mt.deck, 'Bridge_Deck', 0, 0.62, 0.3);
    add(g, new THREE.BoxGeometry(1.2, 0.5, 1.2), Mt.primary, 'Cabin', 0, 0.94, 0.5);
    add(g, new THREE.BoxGeometry(1.22, 0.24, 0.05), Mt.glass, 'Cabin_Window', 0, 1.02, -0.11);
    add(g, new THREE.BoxGeometry(1.3, 0.06, 1.3), Mt.accent, 'Cabin_Roof', 0, 1.22, 0.5);
    for (const sx of [-1, 1]) { add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.4, 10), Mt.chrome, 'Exhaust', sx * 0.95, 0.5, 2.35, Math.PI / 2); addProp(g, Mt, sx * 0.95, -0.35, 2.3, 0.8); }
    plates(g, Mt, 1.33, 0.25, -0.4);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), Mt.head, 'Light_Head', 0, 0.75, -1.0);
    return g;
  }
  function boatHydroplane() {
    const g = group('Hydroplane'), Mt = hullMats();
    slimHull(g, 4.6, 0.45, 0.6, Mt, 'Hull');
    for (const sx of [-1, 1]) slimHull(g, 2.0, 0.3, 0.45, Mt, 'Sponson', sx * 1.0, -0.05, -0.9);
    for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.9, 0.06, 0.8), Mt.primary, 'Wing_Root', sx * 0.55, 0.25, -0.9);
    const canopy = new THREE.SphereGeometry(0.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); canopy.scale(0.8, 0.8, 1.6);
    add(g, canopy, Mt.glass, 'Canopy', 0, 0.45, -0.2);
    add(g, new THREE.BoxGeometry(1.8, 0.06, 0.4), Mt.accent, 'Tail_Wing', 0, 1.25, 2.0);
    for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.06, 0.8, 0.45), Mt.primary, 'Tail_Fin', sx * 0.6, 0.85, 2.0);
    add(g, new THREE.CylinderGeometry(0.2, 0.25, 0.7, 14), Mt.engine, 'Engine_Intake', 0, 0.75, 1.1, Math.PI / 2);
    add(g, new THREE.CylinderGeometry(0.07, 0.08, 0.4, 10), Mt.chrome, 'Exhaust', 0, 0.5, 2.4, Math.PI / 2);
    addProp(g, Mt, 0, -0.25, 2.35);
    plates(g, Mt, 0.44, 0.15, 0.6);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), Mt.head, 'Light_Head', 0, 0.35, -2.2);
    return g;
  }
  function boatHovercraft() {
    const g = group('Hovercraft'), Mt = hullMats();
    const skirt = new THREE.TorusGeometry(1.0, 0.32, 10, 28); skirt.rotateX(Math.PI / 2); skirt.scale(1, 1, 1.9);
    add(g, skirt, mat('Skirt', 0x1b1d22, { roughness: 0.85 }), 'Skirt', 0, 0.05, 0);
    const deck = new THREE.CylinderGeometry(1.0, 1.05, 0.3, 28); deck.scale(1, 1, 1.9);
    add(g, deck, Mt.primary, 'Hover_Deck', 0, 0.35, 0);
    add(g, new THREE.BoxGeometry(1.1, 0.55, 1.4), Mt.accent, 'Hover_Cabin', 0, 0.75, -0.3);
    add(g, new THREE.BoxGeometry(1.12, 0.3, 0.05), Mt.glass, 'Hover_Window', 0, 0.85, -1.01);
    for (const sx of [-1, 1]) {
      add(g, new THREE.TorusGeometry(0.55, 0.06, 8, 24), Mt.engine, 'Fan_Duct', sx * 0.6, 1.0, 1.6);
      const p = addProp(g, Mt, sx * 0.6, 1.0, 1.6, 2.2); p.name = 'Propeller';
      add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), Mt.chrome, 'Exhaust', sx * 0.6, 0.55, 1.95, Math.PI / 2);
    }
    plates(g, Mt, 1.06, 0.4, -0.6);
    add(g, new THREE.SphereGeometry(0.07, 10, 8), Mt.head, 'Light_Head', 0, 0.55, -1.95);
    return g;
  }
  function boatJetski() {
    const g = group('Jet_Ski'), Mt = hullMats();
    slimHull(g, 2.8, 0.55, 0.65, Mt, 'Hull');
    const seat = new THREE.CapsuleGeometry(0.2, 0.9, 6, 12); seat.rotateX(Math.PI / 2);
    add(g, seat, Mt.seat, 'Jet_Seat', 0, 0.62, 0.35);
    add(g, new THREE.BoxGeometry(0.5, 0.35, 0.5), Mt.primary, 'Jet_Hood', 0, 0.6, -0.55);
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), Mt.chrome, 'Handlebar', 0, 0.95, -0.4, 0, 0, Math.PI / 2);
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), Mt.chrome, 'Steer_Post', 0, 0.82, -0.45, -0.4);
    add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.3, 10), Mt.chrome, 'Exhaust', 0, 0.3, 1.45, Math.PI / 2);
    addProp(g, Mt, 0, -0.2, 1.4, 0.7);
    plates(g, Mt, 0.54, 0.2, -0.2);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), Mt.head, 'Light_Head', 0, 0.55, -1.3);
    return g;
  }
  function boatPontoon() {
    const g = group('Party_Pontoon'), Mt = hullMats();
    for (const sx of [-1, 1]) { const tube = new THREE.CapsuleGeometry(0.32, 3.6, 8, 16); tube.rotateX(Math.PI / 2); add(g, tube, Mt.chrome, 'Pontoon_Tube', sx * 0.85, 0, 0); }
    add(g, new THREE.BoxGeometry(2.2, 0.12, 4.0), Mt.deck, 'Party_Deck', 0, 0.38, 0.1);
    add(g, new THREE.BoxGeometry(2.2, 0.35, 0.06), Mt.primary, 'Rail_Front', 0, 0.62, -1.88);
    for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.06, 0.35, 3.6), Mt.primary, 'Rail_Side', sx * 1.08, 0.62, 0.15);
    add(g, new THREE.BoxGeometry(1.9, 0.3, 0.6), Mt.seat, 'Couch', 0, 0.6, 1.2);
    for (const [x, z] of [[-0.95, -1.5], [0.95, -1.5], [-0.95, 1.6], [0.95, 1.6]]) add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), Mt.chrome, 'Bimini_Post', x, 1.1, z);
    add(g, new THREE.BoxGeometry(2.1, 0.05, 3.3), Mt.accent, 'Bimini_Top', 0, 1.8, 0.05);
    add(g, new THREE.BoxGeometry(0.4, 0.5, 0.45), Mt.engine, 'Engine_Cowl', 0, 0.6, 2.25);
    add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), Mt.chrome, 'Exhaust', 0, 0.45, 2.5, Math.PI / 2);
    addProp(g, Mt, 0, -0.25, 2.45);
    plates(g, Mt, 1.12, 0.62, -0.6);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), Mt.head, 'Light_Head', 0, 0.6, -2.0);
    return g;
  }

  /* ===================================================== V7 SCENERY */
  function cherryTree(seed = 1) {
    const g = group('Cherry_Tree');
    const bark = mat('Cherry_Bark', 0x4a3328, { roughness: 0.95, flatShading: true });
    const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 1.6, 0.1), new THREE.Vector3(-0.2, 3.0, 0), new THREE.Vector3(0.2, 4.2, -0.2)]), 8, 0.32, 6);
    add(g, trunk, bark, 'Cherry_Trunk');
    const bl = [mat('Blossom_Pink', 0xffb7d5, { roughness: 0.85, flatShading: true }), mat('Blossom_Light', 0xffd6e8, { roughness: 0.85, flatShading: true })];
    [[0, 4.6, 0, 1.6], [1.2, 4.2, 0.4, 1.2], [-1.1, 4.3, -0.3, 1.25], [0.3, 5.3, -0.6, 1.1], [-0.4, 3.8, 1.0, 1.0], [0.8, 3.6, -1.0, 0.95]].forEach(([x, y, z, r], i) => add(g, jitter(new THREE.IcosahedronGeometry(r, 1), 0.25, seed + i), bl[i % 2], 'Blossom', x, y, z));
    return g;
  }
  function mangrove(seed = 1) {
    const g = group('Mangrove');
    const bark = mat('Mangrove_Bark', 0x5b4a3a, { roughness: 1, flatShading: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + seed; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 1.6, -0.5, Math.sin(a) * 1.6), new THREE.Vector3(Math.cos(a) * 1.1, 1.0, Math.sin(a) * 1.1), new THREE.Vector3(0, 2.0, 0)]); add(g, new THREE.TubeGeometry(c, 8, 0.1, 5), bark, 'Mangrove_Root'); }
    add(g, new THREE.CylinderGeometry(0.22, 0.3, 3, 7), bark, 'Mangrove_Trunk', 0, 3.3, 0);
    const lf = [mat('Mangrove_Leaf', 0x3f7d3a, { roughness: 0.9, flatShading: true }), mat('Mangrove_Leaf2', 0x5b9447, { roughness: 0.9, flatShading: true })];
    [[0, 5.2, 0, 1.8], [1.3, 4.8, 0.3, 1.3], [-1.2, 4.9, -0.4, 1.4], [0.2, 4.6, 1.3, 1.2], [-0.3, 4.7, -1.3, 1.2]].forEach(([x, y, z, r], i) => { const geo = jitter(new THREE.IcosahedronGeometry(r, 1), 0.3, seed + i); geo.scale(1, 0.7, 1); add(g, geo, lf[i % 2], 'Mangrove_Canopy', x, y, z); });
    return g;
  }
  function cactus(seed = 1) {
    const g = group('Cactus');
    const m = mat('Cactus_Green', 0x5f9a4c, { roughness: 0.8, flatShading: true });
    add(g, new THREE.CapsuleGeometry(0.4, 3.2, 6, 10), m, 'Cactus_Body', 0, 2.0, 0);
    for (const sx of [-1, 1]) { const h = 1.4 + (seed % 3) * 0.3 * (sx > 0 ? 1 : 0.6);
      add(g, new THREE.CapsuleGeometry(0.25, 0.8, 6, 8), m, 'Cactus_Arm', sx * 0.85, h + 0.6, 0);
      add(g, new THREE.CapsuleGeometry(0.22, 0.5, 6, 8), m, 'Cactus_Elbow', sx * 0.55, h, 0, 0, 0, Math.PI / 2); }
    add(g, new THREE.SphereGeometry(0.16, 8, 6), mat('Cactus_Flower', 0xff6f91, { roughness: 0.6 }), 'Cactus_Flower', 0, 3.85, 0);
    return g;
  }
  function jungleTree(seed = 1) {
    const g = group('Jungle_Tree');
    add(g, new THREE.CylinderGeometry(0.35, 0.6, 8, 8), mat('Jungle_Bark', 0x6b5440, { roughness: 1, flatShading: true }), 'Jungle_Trunk', 0, 4, 0);
    const lf = [mat('Jungle_Leaf', 0x2e7d32, { roughness: 0.85, flatShading: true }), mat('Jungle_Leaf2', 0x43a047, { roughness: 0.85, flatShading: true })];
    [[0, 8.6, 0, 2.6], [1.8, 7.8, 0.6, 1.9], [-1.7, 8.0, -0.5, 2.0], [0.4, 9.4, -1.2, 1.6], [-0.6, 7.5, 1.7, 1.6]].forEach(([x, y, z, r], i) => { const geo = jitter(new THREE.IcosahedronGeometry(r, 1), 0.4, seed + i); geo.scale(1.1, 0.6, 1.1); add(g, geo, lf[i % 2], 'Jungle_Canopy', x, y, z); });
    const vine = mat('Vine', 0x2f6b2a, { roughness: 1 });
    for (let i = 0; i < 4; i++) add(g, new THREE.CylinderGeometry(0.04, 0.04, 3.5, 4), vine, 'Vine', Math.cos(i * 1.7) * 1.8, 6.2, Math.sin(i * 1.7) * 1.8);
    return g;
  }
  function bush(seed = 1, color = 0x4f9a4a) {
    const g = group('Bush');
    const m = mat('Bush_' + color.toString(16), color, { roughness: 0.95, flatShading: true });
    [[0, 0.5, 0, 0.8], [0.6, 0.4, 0.2, 0.6], [-0.55, 0.4, -0.1, 0.62], [0.1, 0.35, 0.6, 0.5]].forEach(([x, y, z, r], i) => add(g, jitter(new THREE.IcosahedronGeometry(r, 0), 0.15, seed + i), m, 'Bush_Puff', x, y, z));
    return g;
  }
  function flowers(seed = 1) {
    const g = group('Flowers');
    const cols = [0xff6f91, 0xffd23f, 0xffffff, 0xc86bfa];
    const stem = mat('Stem', 0x3f8f3a, { roughness: 0.9 });
    for (let i = 0; i < 7; i++) { const a = i * 2.4 + seed, r = 0.3 + (i % 3) * 0.25, x = Math.cos(a) * r, z = Math.sin(a) * r;
      add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), stem, 'Stem', x, 0.25, z);
      add(g, new THREE.SphereGeometry(0.1, 6, 4), mat('Petal_' + cols[i % 4].toString(16), cols[i % 4], { roughness: 0.6 }), 'Bloom', x, 0.52, z); }
    return g;
  }
  function torii(span = 30) {
    const g = group('Torii_Gate');
    const red = mat('Torii_Red', 0xd7263d, { roughness: 0.55 }), black = mat('Torii_Black', 0x1b1b1b, { roughness: 0.6 });
    for (const sx of [-1, 1]) { add(g, new THREE.CylinderGeometry(0.9, 1.0, 16, 12), red, 'Torii_Post', sx * span / 2, 8, 0); add(g, new THREE.CylinderGeometry(1.2, 1.2, 1.2, 12), black, 'Torii_Base', sx * span / 2, 0.4, 0); }
    add(g, new THREE.BoxGeometry(span + 3, 1.0, 1.4), red, 'Torii_Nuki', 0, 12.5, 0);
    const top = new THREE.BoxGeometry(span + 9, 1.4, 2.0); const p = top.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) + Math.pow(Math.abs(x) / ((span + 9) / 2), 2) * 1.6); } top.computeVertexNormals();
    add(g, top, black, 'Torii_Kasagi', 0, 16.6, 0);
    add(g, new THREE.BoxGeometry(span + 6, 1.0, 1.7), red, 'Torii_Shimaki', 0, 15.6, 0);
    return g;
  }
  function stoneLantern() {
    const g = group('Stone_Lantern');
    const st = mat('Stone_Grey', 0x8a8f93, { roughness: 0.95, flatShading: true });
    add(g, new THREE.CylinderGeometry(0.6, 0.8, 0.4, 6), st, 'SL_Base', 0, 0.2, 0);
    add(g, new THREE.CylinderGeometry(0.25, 0.3, 1.4, 6), st, 'SL_Post', 0, 1.1, 0);
    add(g, new THREE.BoxGeometry(1.0, 0.8, 1.0), mat('Lantern_Glow', 0xffe6a8, { emissive: 0xffb84d, emissiveIntensity: 2 }), 'SL_Light', 0, 2.2, 0);
    add(g, new THREE.ConeGeometry(1.0, 0.7, 6), st, 'SL_Roof', 0, 2.95, 0);
    return g;
  }
  function building(seed = 1) {
    const g = group('Building');
    add(g, new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat('Building_Wall', 0x2a2f45, { roughness: 0.8 }), 'Building_Wall');
    const neon = [0xff3fd2, 0x3ff2ff, 0xffe14d, 0x7cff6b][seed % 4];
    add(g, new THREE.BoxGeometry(1.02, 0.025, 1.02), mat('Neon_' + neon.toString(16), neon, { emissive: neon, emissiveIntensity: 2.2 }), 'Neon_Strip', 0, 0.98, 0);
    add(g, new THREE.BoxGeometry(1.02, 0.02, 1.02), mat('Neon_' + neon.toString(16), neon, { emissive: neon, emissiveIntensity: 2.2 }), 'Neon_Strip', 0, 0.35 + (seed % 3) * 0.15, 0);
    return g;
  }
  function shipwreck() {
    const g = group('Shipwreck');
    const wood = mat('Wreck_Wood', 0x5a3e28, { roughness: 1, flatShading: true });
    const hull = new THREE.CylinderGeometry(2.4, 1.6, 12, 10, 1, true, 0, Math.PI); hull.rotateZ(Math.PI / 2); hull.rotateY(Math.PI / 2);
    add(g, jitter(hull, 0.25, 7), wood, 'Wreck_Hull', 0, 0.6, 0, 0.25, 0, 0.35);
    add(g, new THREE.CylinderGeometry(0.25, 0.3, 9, 8), wood, 'Wreck_Mast', 0.5, 4.2, -1.5, 0.3, 0, 0.5);
    add(g, new THREE.BoxGeometry(5, 0.2, 0.2), wood, 'Wreck_Yard', 1.6, 7.4, -1.6, 0, 0, 0.5);
    const sail = new THREE.PlaneGeometry(3.5, 2.6, 4, 3); const sp = sail.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin(sp.getX(i) * 1.3) * 0.3 + (i % 3) * 0.05);
    add(g, sail, mat('Torn_Sail', 0xd9cfb4, { roughness: 1, side: THREE.DoubleSide }), 'Torn_Sail', 1.5, 6.1, -1.4, 0, 0, 0.5);
    add(g, new THREE.PlaneGeometry(1.2, 0.8), mat('Pirate_Flag', 0x111111, { side: THREE.DoubleSide }), 'Pirate_Flag', -0.6, 8.6, -1.9, 0, 0, 0.5);
    return g;
  }
  function pyramid() {
    const g = group('Temple');
    const st = mat('Temple_Stone', 0x9c9478, { roughness: 1, flatShading: true }), moss = mat('Moss', 0x5f8a3a, { roughness: 1, flatShading: true });
    for (let i = 0; i < 6; i++) { const s = 30 - i * 4.6; add(g, jitter(new THREE.BoxGeometry(s, 3.2, s), 0.3, i + 1), i % 2 ? st : st, 'Temple_Tier', 0, 1.6 + i * 3.2, 0); if (i % 2) add(g, new THREE.BoxGeometry(s + 0.4, 0.5, s + 0.4), moss, 'Temple_Moss', 0, 3.1 + i * 3.2, 0); }
    add(g, new THREE.BoxGeometry(5, 4.2, 5), st, 'Temple_Shrine', 0, 21.3, 0);
    add(g, new THREE.BoxGeometry(5.6, 0.8, 5.6), moss, 'Temple_Roof', 0, 23.8, 0);
    add(g, new THREE.BoxGeometry(5, 18, 1), st, 'Temple_Stairs', 0, 9, 14.5, -0.62);
    return g;
  }
  function ruinPillar(seed = 1) {
    const g = group('Ruin_Pillar');
    const st = mat('Temple_Stone', 0x9c9478, { roughness: 1, flatShading: true });
    const h = 6 + (seed % 3) * 2.5;
    add(g, jitter(new THREE.CylinderGeometry(1, 1.1, h, 10), 0.08, seed), st, 'Pillar', 0, h / 2, 0, 0, 0, (seed % 2 ? 0.08 : -0.05));
    add(g, new THREE.BoxGeometry(2.6, 0.7, 2.6), st, 'Pillar_Cap', 0, h + 0.3, 0);
    add(g, new THREE.CylinderGeometry(0.06, 0.06, h * 0.8, 4), mat('Vine', 0x2f6b2a), 'Pillar_Vine', 0.95, h * 0.5, 0.3);
    return g;
  }
  function crystal(seed = 1, color = 0xb48cff) {
    const g = group('Crystal');
    const m = mat('Crystal_' + color.toString(16), color, { emissive: color, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.88, flatShading: true });
    for (let i = 0; i < 5; i++) { const h = 1.6 + ((seed + i) % 4) * 0.7; const c = new THREE.ConeGeometry(0.35 + (i % 2) * 0.12, h, 6).translate(0, h / 2, 0); add(g, c, m, 'Crystal_Shard', Math.cos(i * 1.3) * 0.4, 0, Math.sin(i * 1.3) * 0.4, Math.sin(i + seed) * 0.4, 0, Math.cos(i * 2 + seed) * 0.4); }
    return g;
  }
  function stalactite(seed = 1) {
    const g = group('Stalactite');
    const m = mat('Cave_Rock', 0x5d5868, { roughness: 1, flatShading: true });
    add(g, jitter(new THREE.ConeGeometry(0.8, 4.5 + (seed % 3), 7).translate(0, -(4.5 + (seed % 3)) / 2, 0).rotateX(Math.PI), 0.12, seed), m, 'Stalactite');
    return g;
  }
  function hotAirBalloon(color = 0xff6f61) {
    const g = group('Hot_Air_Balloon');
    const env = new THREE.SphereGeometry(5, 20, 14); const p = env.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const k = 1 + y / 5 * 0.55; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } env.computeVertexNormals();
    const col = []; const c = new THREE.Color(); for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); c.set(Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 ? color : 0xfff3d6); col.push(c.r, c.g, c.b); }
    env.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    add(g, env, mat('Balloon_Env', 0xffffff, { vertexColors: true, roughness: 0.6 }), 'Envelope', 0, 7, 0);
    add(g, new THREE.BoxGeometry(1.4, 1.0, 1.4), mat('Basket', 0x8a5a2b, { roughness: 1 }), 'Basket', 0, 0, 0);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) add(g, new THREE.CylinderGeometry(0.03, 0.03, 3.4, 4), mat('Rope', 0xd9b56a), 'Rope', x * 1.3, 2.0, z * 1.3, z * 0.25, 0, -x * 0.25);
    return g;
  }
  function barrel() {
    const g = group('Barrel');
    const b = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 14); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Math.cos(p.getY(i) / 0.8 * Math.PI / 2); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } b.computeVertexNormals();
    add(g, b, mat('Barrel_Wood', 0x8a5a2b, { roughness: 0.9 }), 'Barrel_Body', 0, 0, 0, 0, 0, Math.PI / 2);
    for (const x of [-0.5, 0.5]) add(g, new THREE.TorusGeometry(0.78, 0.05, 6, 20), mat('Engine', 0x1f2228), 'Barrel_Hoop', x, 0, 0, 0, Math.PI / 2, 0);
    return g;
  }
  function floatLog(seed = 1) {
    const g = group('Float_Log');
    add(g, jitter(new THREE.CylinderGeometry(0.75, 0.85, 7, 10), 0.08, seed), mat('Log_Bark', 0x6b4f35, { roughness: 1, flatShading: true }), 'Log', 0, 0, 0, 0, 0, Math.PI / 2);
    for (const x of [-3.5, 3.5]) add(g, new THREE.CircleGeometry(0.78, 10), mat('Log_End', 0xc9a26b, { roughness: 1 }), 'Log_End', x, 0, 0, 0, Math.sign(x) * Math.PI / 2, 0);
    add(g, new THREE.CylinderGeometry(0.12, 0.14, 1.2, 6), mat('Log_Bark', 0x6b4f35), 'Log_Branch', 1.2, 0.7, 0, 0, 0, -0.6);
    return g;
  }
  function barge() {
    const g = group('Barge');
    add(g, new THREE.BoxGeometry(5, 1.4, 12), mat('Barge_Hull', 0x2b3a55, { roughness: 0.6 }), 'Barge_Hull', 0, 0.3, 0);
    add(g, new THREE.BoxGeometry(5.1, 0.25, 12.1), mat('Neon_ff3fd2', 0xff3fd2, { emissive: 0xff3fd2, emissiveIntensity: 2.2 }), 'Barge_Neon', 0, 1.05, 0);
    const cols = [0xff6f61, 0x4fd1c5, 0xffd23f];
    for (let i = 0; i < 3; i++) add(g, new THREE.BoxGeometry(4.2, 2.2, 3.2), mat('Container_' + i, cols[i], { roughness: 0.7 }), 'Container', 0, 2.2, -3.6 + i * 3.6);
    return g;
  }
  function volcanoCone() {
    const g = group('Volcano');
    const cone = jitter(new THREE.CylinderGeometry(14, 70, 60, 20, 6, true), 2.5, 9);
    add(g, cone, mat('Basalt', 0x2b2622, { roughness: 1, flatShading: true }), 'Volcano_Cone', 0, 30, 0);
    add(g, new THREE.CircleGeometry(14, 20), mat('Lava_Glow', 0xff5a1f, { emissive: 0xff4500, emissiveIntensity: 2.5 }), 'Volcano_Crater', 0, 58, 0, -Math.PI / 2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const flow = new THREE.PlaneGeometry(3, 52, 1, 8); const p = flow.attributes.position; for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + Math.sin(p.getY(k) * 0.15 + i) * 2);
      const m = new THREE.Mesh(flow, mat('Lava_Glow', 0xff5a1f)); m.name = 'Lava_Flow'; m.position.set(Math.cos(a) * 42, 30, Math.sin(a) * 42); m.lookAt(0, 30, 0); m.rotateX(-0.82); g.add(m); }
    return g;
  }
  function seagull() {
    const g = group('Seagull');
    const w = mat('Gull_White', 0xf4f6f8, { roughness: 0.8, side: THREE.DoubleSide });
    const b = new THREE.SphereGeometry(0.25, 8, 6); b.scale(0.7, 0.7, 1.6); add(g, b, w, 'Gull_Body');
    for (const sx of [-1, 1]) { const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.2, sx * 1.1, 0.25, 0.05, 0, 0, 0.25, sx * 1.1, 0.25, 0.05, sx * 1.6, 0.05, 0.15, 0, 0, 0.25], 3)); wing.computeVertexNormals(); add(g, wing, w, 'Gull_Wing'); }
    return g;
  }

  /* ===================================================== ENVIRONMENT */
  function palm(seed = 1) {
    const g = group('Palm_Tree');
    const lean = 0.6 + (seed % 5) * 0.12;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.2, 2.5, 0), new THREE.Vector3(lean * 0.7, 5, 0), new THREE.Vector3(lean * 1.5, 7.2, 0)]);
    const trunk = new THREE.TubeGeometry(curve, 10, 0.32, 7);
    const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 - p.getY(i) / 9 * 0.45; p.setX(i, (p.getX(i) - lean * 0.2 * p.getY(i) / 2.5) * 1 + lean * 0.2 * p.getY(i) / 2.5); p.setZ(i, p.getZ(i) * k); } trunk.computeVertexNormals();
    add(g, trunk, mat('Palm_Trunk', 0x8a6a45, { roughness: 0.95, flatShading: true }), 'Palm_Trunk');
    const top = curve.getPoint(1);
    const leafM = mat('Palm_Leaf', 0x2f9446, { roughness: 0.75, side: THREE.DoubleSide, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const lf = new THREE.PlaneGeometry(1.1, 3.6, 2, 7); lf.translate(0, 1.8, 0); lf.rotateX(-Math.PI / 2);
      const q = lf.attributes.position;
      for (let k = 0; k < q.count; k++) { const z = -q.getZ(k); const t = z / 3.6; q.setX(k, q.getX(k) * (1 - t * 0.85) * (0.6 + Math.sin(t * Math.PI) * 0.6)); q.setY(k, -t * t * 1.9 + Math.abs(q.getX(k)) * -0.25); }
      lf.computeVertexNormals();
      add(g, lf, leafM, 'Palm_Leaf', top.x, top.y, top.z, 0.15, i / 8 * Math.PI * 2 + seed, 0);
    }
    const nut = mat('Coconut', 0x5a3b1e, { roughness: 0.8 });
    for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.2, 8, 6), nut, 'Coconut', top.x + Math.cos(i * 2.1) * 0.25, top.y - 0.25, top.z + Math.sin(i * 2.1) * 0.25);
    return g;
  }
  function pine() {
    const g = group('Pine_Tree');
    add(g, new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6), mat('Pine_Trunk', 0x5b4030, { roughness: 1 }), 'Pine_Trunk', 0, 0.8, 0);
    const m = mat('Pine_Needles', 0x2c6e49, { roughness: 0.9, flatShading: true });
    [[2.2, 2.4, 2.0], [1.75, 2.1, 3.3], [1.25, 1.8, 4.5], [0.75, 1.4, 5.6]].forEach(([r, h, y]) => add(g, new THREE.ConeGeometry(r, h, 7), m, 'Pine_Tier', 0, y, 0));
    return g;
  }
  function rock(seed = 1, color = 0x7b8a8f) {
    const g = group('Rock');
    add(g, jitter(new THREE.DodecahedronGeometry(1, 1), 0.35, seed), mat('Rock_' + color.toString(16), color, { roughness: 0.95, flatShading: true }), 'Rock');
    return g;
  }
  function buoy(color = 0xef4444) {
    const g = group('Buoy');
    const body = mat('Buoy_' + color.toString(16), color, { roughness: 0.4 });
    add(g, new THREE.CylinderGeometry(0.7, 0.95, 1.1, 14), body, 'Buoy_Base', 0, 0.2, 0);
    add(g, new THREE.CylinderGeometry(0.72, 0.72, 0.2, 14), mat('Buoy_Band', 0xffffff, { roughness: 0.4 }), 'Buoy_Band', 0, 0.55, 0);
    add(g, new THREE.ConeGeometry(0.62, 1.1, 14), body, 'Buoy_Top', 0, 1.2, 0);
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat('Engine', 0x1f2228), 'Buoy_Pole', 0, 1.9, 0);
    add(g, new THREE.SphereGeometry(0.16, 10, 8), mat('Buoy_Lamp', 0xfff1b8, { emissive: 0xffd27a, emissiveIntensity: 1.5 }), 'Buoy_Lamp', 0, 2.2, 0);
    return g;
  }
  function lighthouse() {
    const g = group('Lighthouse');
    const red = mat('LH_Red', 0xd7263d, { roughness: 0.6 }), white = mat('LH_White', 0xf4f1ea, { roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const r0 = 2.6 - i * 0.28, r1 = 2.6 - (i + 1) * 0.28;
      add(g, new THREE.CylinderGeometry(r1, r0, 2.6, 18), i % 2 ? red : white, 'LH_Tower', 0, 1.3 + i * 2.6, 0);
    }
    const top = 6 * 2.6;
    add(g, new THREE.CylinderGeometry(1.6, 1.6, 0.25, 20), mat('LH_Dark', 0x2b2d33, { metalness: 0.4 }), 'LH_Gallery', 0, top + 0.1, 0);
    add(g, new THREE.TorusGeometry(1.55, 0.05, 6, 30), mat('LH_Dark', 0x2b2d33), 'LH_Rail', 0, top + 0.75, 0, Math.PI / 2);
    add(g, new THREE.CylinderGeometry(0.95, 0.95, 1.6, 12, 1, true), mat('Glass', 0x9fd3ff, { transparent: true, opacity: 0.4 }), 'LH_Lantern_Glass', 0, top + 1.0, 0);
    add(g, new THREE.SphereGeometry(0.55, 14, 10), mat('LH_Lamp', 0xfff4c2, { emissive: 0xffe08a, emissiveIntensity: 2.5 }), 'LH_Lamp', 0, top + 1.0, 0);
    add(g, new THREE.ConeGeometry(1.2, 1.3, 12), red, 'LH_Roof', 0, top + 2.45, 0);
    add(g, new THREE.SphereGeometry(0.18, 8, 6), mat('LH_Dark', 0x2b2d33), 'LH_Finial', 0, top + 3.15, 0);
    add(g, new THREE.BoxGeometry(0.9, 1.6, 0.2), mat('LH_Door', 0x2a5f8f), 'LH_Door', 0, 0.8, 2.55);
    return g;
  }
  function arch(span = 50, color = 0xb98457) {
    const g = group('Stone_Arch');
    const m = mat('Arch_Stone_' + color.toString(16), color, { roughness: 0.95, flatShading: true });
    const R = span / 2;
    const tor = new THREE.TorusGeometry(R, 2.2, 6, 26, Math.PI); tor.scale(1, 0.62, 1);
    add(g, jitter(tor, 0.5, 4), m, 'Arch_Span', 0, 2, 0);
    for (const sx of [-1, 1]) add(g, jitter(new THREE.CylinderGeometry(3.2, 4.2, 5, 8), 0.5, sx + 3), m, 'Arch_Footing', sx * R, 0.5, 0);
    const lamp = mat('Lantern_Glow', 0xffe6a8, { emissive: 0xffb84d, emissiveIntensity: 2 });
    for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.5, 10, 8), lamp, 'Arch_Lamp', sx * R * 0.55, R * 0.62 * Math.sin(Math.acos(0.55)) + 0.2, 0);
    return g;
  }
  function lantern() {
    const g = group('Floating_Lantern');
    const body = new THREE.SphereGeometry(0.5, 14, 10); body.scale(1, 1.25, 1);
    add(g, body, mat('Lantern_Paper', 0xffb35c, { emissive: 0xff8a2a, emissiveIntensity: 1.6, roughness: 0.8 }), 'Lantern_Paper', 0, 0.9, 0);
    const cap = mat('Lantern_Cap', 0x3a2a20, { roughness: 0.9 });
    add(g, new THREE.CylinderGeometry(0.2, 0.25, 0.12, 10), cap, 'Lantern_Cap', 0, 1.55, 0);
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), cap, 'Lantern_Base', 0, 0.28, 0);
    add(g, new THREE.CylinderGeometry(0.55, 0.65, 0.18, 12), mat('Lantern_Float', 0x7a5634, { roughness: 1 }), 'Lantern_Float', 0, 0.12, 0);
    return g;
  }
  function gate(span = 48) {
    const g = group('Start_Gate');
    const post = mat('Gate_Post', 0xffd23f, { roughness: 0.4, metalness: 0.2 });
    for (const sx of [-1, 1]) {
      add(g, new THREE.BoxGeometry(1.6, 16, 1.6), post, 'Gate_Post', sx * span / 2, 8, 0);
      add(g, new THREE.CylinderGeometry(1.6, 2.2, 1.2, 8), mat('Engine', 0x1f2228), 'Gate_Float', sx * span / 2, 0.2, 0);
    }
    add(g, new THREE.BoxGeometry(span + 3.4, 3, 0.7), mat('Gate_Banner', 0xffffff, { roughness: 0.6 }), 'Gate_Banner', 0, 14.5, 0);
    return g;
  }

  return { starShine, shrinkRay, bubbleWall, warpPearl, springBuoy, copycat, boatOffshore, boatCatamaran, boatHydroplane, boatHovercraft, boatJetski, boatPontoon, cherryTree, mangrove, cactus, jungleTree, bush, flowers, torii, stoneLantern, building, shipwreck, pyramid, ruinPillar, crystal, stalactite, hotAirBalloon, barrel, floatLog, barge, volcanoCone, seagull, jumpJet, octopus, beachBall, lowTide, fakeBox, chest, jellyfish, iceberg, coral, fish, boat, itemBox, grapple, gluePuddle, glueBottle, turboCan, turboTriple, shield, balloon, homingBubble, fogCloud, sail, dolphin, duck, magnet, tidalWave, palm, pine, rock, buoy, lighthouse, arch, lantern, gate, mat };
}
