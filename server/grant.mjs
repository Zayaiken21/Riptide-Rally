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
const grants = [];
for (const s of sessions) {
  if (s.payment_status !== 'paid') continue;
  const acct = String(s.client_reference_id || '').toUpperCase(), item = PRICES[s.amount_subtotal];
  if (!/^RR-[A-Z0-9]{8}$/.test(acct)) { console.log(`skip ${s.id.slice(-8)}: no player ID`); continue; }
  if (!item) { console.log(`skip ${s.id.slice(-8)}: no item costs ${s.amount_subtotal} cents`); continue; }
  const body = b64u(te.encode(JSON.stringify({ a: acct, p: item, n: s.id, t: s.created })));
  const code = body + '.' + b64u(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(body))));
  // lock it for this player ID only
  const aes = await crypto.subtle.importKey('raw', await sha('rr-grant|' + acct), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, te.encode(JSON.stringify({ c: code }))));
  const payload = new Uint8Array(12 + ct.length); payload.set(iv); payload.set(ct, 12);
  grants.push({ topic: `${TOPIC}/grant/${hex(await sha('rr-topic|' + acct)).slice(0, 32)}/${hex(await sha(s.id)).slice(0, 16)}`, msg: b64u(payload), item, acct });
}
console.log(`${sessions.length} checkouts in the last ${DAYS} days, ${grants.length} to deliver`);
if (!grants.length) process.exit(0);

// 3. post them on every relay (kept there, so the game finds them whenever it next opens)
let ok = 0;
await Promise.all(RELAYS.map(R => new Promise(res => {
  const c = mqtt.connect(R.url, { clientId: 'rr_grant_' + Math.random().toString(36).slice(2, 10), protocolVersion: 4, connectTimeout: 8000, reconnectPeriod: 0, username: R.username, password: R.password });
  const done = () => { try { c.end(true); } catch (e) {} res(); };
  const t = setTimeout(done, 15000);
  c.on('error', () => { clearTimeout(t); done(); });
  c.on('connect', async () => {
    for (const g of grants) await new Promise(r => c.publish(g.topic, g.msg, { qos: 1, retain: true }, r));
    ok++; console.log('posted on', new URL(R.url).hostname); clearTimeout(t); c.end(false, {}, res);
  });
})));
console.log(`${grants.length} unlocks posted on ${ok} of ${RELAYS.length} relays`);
if (!ok) process.exit(1);
