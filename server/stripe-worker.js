// Riptide Rally: turns a finished Stripe payment into an unlock code, automatically.
// Runs free on Cloudflare Workers. Setup steps are in server/README.md.
//
// Flow: player pays with your Stripe Payment Link -> Stripe sends them to
//   https://YOUR-WORKER.workers.dev/claim?session_id={CHECKOUT_SESSION_ID}
// -> this worker asks Stripe whether that payment really went through, signs a code for the player's ID,
// and sends them back to the game with ?redeem=CODE, which unlocks the item.
//
// Secrets (Cloudflare dashboard -> your Worker -> Settings -> Variables and Secrets, type "Secret"; never in the repo):
//   STRIPE_SECRET_KEY   a Stripe restricted key with Read access to Checkout Sessions
//   PRIVATE_KEY_JWK     the whole private key backup file from tools/unlock.html
// Optional plain variables:
//   GAME_URL            defaults to https://zayaiken21.github.io/Riptide-Rally/
//   LINKS               JSON mapping Payment Link ids to items, e.g. {"plink_123":"grapple"}. Not needed while every
//                       item has its own price: the worker tells items apart by price (PRICES below).
//   PRICES              JSON to override PRICES below if you change a price, e.g. {"1499":"all","299":"grapple"}

// Item for each price in cents (before tax). Keep in step with shop.json and your Stripe Payment Links.
const PRICES = { 1499: 'all', 299: 'grapple', 399: 'fishx2', 99: 'fish5k', 499: 'fish30k', 1000: 'fish70k' };

const enc = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const page = (title, text, status = 400) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <body style="font:16px system-ui;background:#062530;color:#fff;display:grid;place-items:center;min-height:90vh;margin:0;padding:20px;text-align:center">
  <div><h1 style="margin:0 0 8px">${title}</h1><p style="color:#9cc3cf;max-width:420px">${text}</p></div>`,
  { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/claim') return page('Riptide Rally', 'Nothing to see here.', 404);
    const sid = url.searchParams.get('session_id') || '';
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return page('Link not complete', 'This link is missing the payment reference. Open the game\'s Store and use "Have an unlock code?", or email us your player ID.');

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + sid, { headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } });
    if (!r.ok) return page('Payment not found', 'Stripe doesn\'t know this payment. If you were charged, email us your player ID and receipt.');
    const s = await r.json();
    if (s.payment_status !== 'paid') return page('Payment not finished', 'Stripe says this payment hasn\'t gone through yet. Try the link in a minute, or email us if you were charged.');

    const acct = String(s.client_reference_id || '').toUpperCase();
    if (!/^RR-[A-Z0-9]{8}$/.test(acct)) return page('Player ID missing', 'This payment has no player ID on it. Email us your receipt and your player ID (Store screen in the game) and we\'ll unlock it by hand.');
    let links = {}, prices = PRICES; try { links = JSON.parse(env.LINKS || '{}'); } catch (e) {}
    try { if (env.PRICES) prices = JSON.parse(env.PRICES); } catch (e) {}
    const item = links[s.payment_link] || prices[s.amount_subtotal];
    if (!item) return page('Unknown item', 'We couldn\'t tell which item this payment was for. Email us your receipt and player ID.');

    const key = await crypto.subtle.importKey('jwk', JSON.parse(env.PRIVATE_KEY_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const body = enc(new TextEncoder().encode(JSON.stringify({ a: acct, p: item, n: s.id, t: Math.floor(Date.now() / 1000) })));
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body));
    const game = new URL(env.GAME_URL || 'https://zayaiken21.github.io/Riptide-Rally/');
    game.searchParams.set('redeem', body + '.' + enc(sig));
    return Response.redirect(game.toString(), 302);
  },
};
