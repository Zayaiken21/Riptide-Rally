// Riptide Rally automatic unlocks. Runs in GitHub Actions every few minutes (.github/workflows/store.yml).
//
// 1. Reads your paid Stripe checkouts from the last 14 days.
// 2. For each one, signs an unlock code for the buyer's player ID (client_reference_id) with your private key.
// 3. Locks the code so only that player ID can read it, and posts it on the multiplayer relays.
//    The game listens for its own codes and turns the item on by itself.
// It also fills in "publicKey" in shop.json from your private key the first time, so codes you made with
// tools/unlock.html work too.
//
// GitHub secrets it needs (repo Settings -> Secrets and variables -> Actions):
//   STRIPE_SECRET_KEY  a Stripe restricted key with Read access to Checkout Sessions
//   PRIVATE_KEY_JWK    everything in the private key file tools/unlock.html downloaded
import fs from 'node:fs';
import mqtt from 'mqtt';

const SHOP_FILE = new URL('../shop.json', import.meta.url);
const TOPIC = 'riptide-rally/v5';
const RELAYS = (process.env.RELAYS || 'wss://broker.hivemq.com:8884/mqtt,wss://broker.emqx.io:8084/mqtt,wss://test.mosquitto.org:8081/mqtt,wss://public.cloud.shiftr.io')
  .split(',').map(url => ({ url, ...(url.includes('shiftr') ? { username: 'public', password: 'public' } : {}) }));
const STRIPE_API = process.env.STRIPE_API || 'https://api.stripe.com';
const DAYS = 14;
// item for each price in cents (before tax), matching shop.json and the Payment Links
const PRICES = { 1499: 'all', 299: 'grapple', 399: 'fishx2', 99: 'fish5k', 499: 'fish30k', 1000: 'fish70k', ...JSON.parse(process.env.PRICES || '{}') };

const te = new TextEncoder();
const b64u = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (buf) => Buffer.from(buf).toString('hex');
const sha = (t) => crypto.subtle.digest('SHA-256', te.encode(t));

const jwk = JSON.parse(process.env.PRIVATE_KEY_JWK || 'null');
if (!jwk || !jwk.d) { console.log('PRIVATE_KEY_JWK secret is missing: add it in the repo settings (see server/README.md).'); process.exit(0); }

// 1. make sure the game knows your public key
const shop = JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
const pub = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true };
if (!shop.publicKey) {
  fs.writeFileSync(SHOP_FILE, fs.readFileSync(SHOP_FILE, 'utf8').replace('"publicKey": ""', '"publicKey": ' + JSON.stringify(JSON.stringify(pub))));
  console.log('Filled in publicKey in shop.json');
}

if (!process.env.STRIPE_SECRET_KEY) { console.log('STRIPE_SECRET_KEY secret is missing: add it in the repo settings (see server/README.md).'); process.exit(0); }
const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
// 7-letter codes: each order always gets the same one (made from the order id with your private key), so reruns don't
// change it. If that code already belongs to a different order, the next one in line is used instead.
const SC_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const hmacKey = await crypto.subtle.importKey('raw', Buffer.from(jwk.d, 'base64url'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
async function shortFor(id, k) { const h = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, te.encode(id + '#' + k))); return Array.from(h.slice(0, 7), v => SC_ABC[v % SC_ABC.length]).join(''); }
async function shortKeys(code) {
  const base = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('riptide-rally-code-v1'), iterations: 150000 }, base, 384));
  return { topic: hex(bits.slice(0, 16)), key: await crypto.subtle.importKey('raw', bits.slice(16, 48), 'AES-GCM', false, ['encrypt', 'decrypt']) };
}
const seal = async (aes, obj) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, te.encode(JSON.stringify(obj)))); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return b64u(out); };
const open = async (aes, txt) => { const b = Buffer.from(txt, 'base64url'); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, aes, b.subarray(12)))); };

// 2. paid checkouts
const since = Math.floor(Date.now() / 1000) - DAYS * 86400, sessions = [];
for (let after = null, n = 0; n < 20; n++) {
  const u = new URL(STRIPE_API + '/v1/checkout/sessions');
  u.searchParams.set('limit', '100'); u.searchParams.set('status', 'complete'); u.searchParams.set('created[gte]', since);
  if (after) u.searchParams.set('starting_after', after);
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY } });
  if (!r.ok) { console.log('Stripe said', r.status, (await r.text()).slice(0, 300)); process.exitCode = 0; break; }
  const page = await r.json();
  sessions.push(...page.data);
  if (!page.has_more || !page.data.length) break;
  after = page.data[page.data.length - 1].id;
}
const orders = [];
for (const s of sessions) {
  if (s.payment_status !== 'paid') continue;
  const acct = String(s.client_reference_id || '').toUpperCase(), item = PRICES[s.amount_subtotal];
  if (!/^RR-[A-Z0-9]{8}$/.test(acct)) { console.log(`skip ${s.id.slice(-8)}: no player ID`); continue; }
  if (!item) { console.log(`skip ${s.id.slice(-8)}: no item costs ${s.amount_subtotal} cents`); continue; }
  const body = b64u(te.encode(JSON.stringify({ a: acct, p: item, n: s.id, t: s.created })));
  orders.push({ id: s.id, acct, item, code: body + '.' + b64u(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(body)))) });
}
console.log(`${sessions.length} checkouts in the last ${DAYS} days, ${orders.length} to deliver`);
if (!orders.length) process.exit(0);

// 3. connect to the relays
const clients = (await Promise.all(RELAYS.map(R => new Promise(res => {
  const c = mqtt.connect(R.url, { clientId: 'rr_grant_' + Math.random().toString(36).slice(2, 10), protocolVersion: 4, connectTimeout: 8000, reconnectPeriod: 0, username: R.username, password: R.password });
  const t = setTimeout(() => { try { c.end(true); } catch (e) {} res(null); }, 10000);
  c.once('connect', () => { clearTimeout(t); res(c); });
  c.once('error', () => { clearTimeout(t); try { c.end(true); } catch (e) {} res(null); });
})))).filter(Boolean);
if (!clients.length) { console.log('No relay answered; trying again next run.'); process.exit(0); }

// 4. give each order its 7-letter code (skipping any code that already belongs to another order)
const retained = new Map();
for (const c of clients) c.on('message', (t, b) => { if (b.length && !retained.has(t)) retained.set(t, b.toString()); });
for (const o of orders) {
  for (let k = 0; k < 20; k++) {
    const sc = await shortFor(o.id, k), sk = await shortKeys(sc), tp = `${TOPIC}/code/${sk.topic}`;
    await Promise.all(clients.map(c => new Promise(r => c.subscribe(tp, { qos: 0 }, () => r()))));
    await new Promise(r => setTimeout(r, 1200));
    let mine = true; const old = retained.get(tp);
    if (old) { try { mine = JSON.parse(Buffer.from((await open(sk.key, old)).c.split('.')[0], 'base64url').toString()).n === o.id; } catch (e) { mine = false; } }
    if (mine) { o.short = sc; o.sk = sk; break; }
  }
}

// 5. post everything (kept on the relays, so the game finds it whenever it next opens)
const msgs = [];
for (const o of orders) {
  if (!o.short) { console.log(`no free code for ${o.id.slice(-8)}`); continue; }
  const aes = await crypto.subtle.importKey('raw', await sha('rr-grant|' + o.acct), 'AES-GCM', false, ['encrypt']);
  msgs.push([`${TOPIC}/grant/${hex(await sha('rr-topic|' + o.acct)).slice(0, 32)}/${hex(await sha(o.id)).slice(0, 16)}`, await seal(aes, { c: o.code, s: o.short, p: o.item })]);
  msgs.push([`${TOPIC}/code/${o.sk.topic}`, await seal(o.sk.key, { c: o.code })]);
}
let ok = 0;
await Promise.all(clients.map(async c => { for (const [t, m] of msgs) await new Promise(r => c.publish(t, m, { qos: 1, retain: true }, r)); ok++; await new Promise(r => c.end(false, {}, r)); }));
console.log(`${msgs.length / 2} unlocks posted on ${ok} of ${RELAYS.length} relays`);
