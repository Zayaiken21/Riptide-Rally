# Store and Weekly Cup setup

Everything the store needs is in `shop.json` at the top of the repo. Edit it on GitHub and the live game picks it up on the next load, with no rebuild.

## 1. Make your signing key (5 minutes, once)

1. Open `https://zayaiken21.github.io/Riptide-Rally/tools/unlock.html` and press **Make a new key**.
2. A file called `riptide-private-key-KEEP-SECRET.json` downloads. Keep it somewhere safe, like a password manager. **Never commit it to the repo.** Anyone with it can make free unlock codes.
3. Copy the **Public key** box into `shop.json` as `"publicKey"` (paste it as a string in quotes, or as the JSON object itself).

## 2. Add payment buttons

**Stripe (card, Apple Pay, Google Pay):**
1. In the Stripe Dashboard, go to Payment Links and make one per item: Everything Pass $14.99, Grapple Hook $2.99, Double Catch $3.99, Bucket of Fish $0.99, Crate of Fish $4.99, Boatload of Fish $10.00. Change any price in `shop.json` and on the Payment Link together.
2. Paste each link (`https://buy.stripe.com/...`) into that item's `"stripe"` field in `shop.json`.
3. The game adds the player's ID to the link automatically, so every payment shows a **Client reference ID** like `RR-AB12CD34` in Stripe.

**PayPal:**
1. Put a PayPal.me link (for example `https://paypal.me/yourname/1.99`) or a PayPal payment button link in the item's `"paypal"` field.
2. Fill in `"supportEmail"`. The store tells PayPal buyers to put their player ID in the note and email you.

## Give an item free (you, testers, friends)

Put player IDs in `"free"` in `shop.json`, for example `"free": { "grapple": ["RR-AB12CD34", "RR-XY98ZW76"] }`. Players find their ID in the Store. Only players who bought the Grapple Hook or are on this list ever get it from an item box or see it in the box roulette. AI boats never use it, and nobody gets it in the Weekly Cup.

## 3. Send unlock codes

**By hand (works on day one):** when a payment comes in, open `tools/unlock.html`, enter the player ID from Stripe or the PayPal note, pick the item, put the Stripe or PayPal transaction ID in "Order reference", press **Make code**, then **Write email** and send it. The player taps the link and the item unlocks.

**Automatic for Stripe (free, built into this repo):** the **Store unlocks** GitHub Action (`.github/workflows/store.yml` running `server/grant.mjs`) checks Stripe every 5 minutes. For each paid order it signs an unlock code for the buyer's player ID, locks it so only that player can read it, and posts it on the multiplayer relays. The game picks it up and unlocks the item by itself, usually 5 to 15 minutes after paying (GitHub runs scheduled jobs a little late when it's busy). It also fills in `publicKey` in `shop.json` the first time it runs.

Setup, once:
1. **Stripe key:** Stripe Dashboard → Developers → API keys → **Create restricted key**. Name it "Riptide store", set **Checkout Sessions** to **Read**, leave the rest at None, create it and copy it (starts with `rk_live_`).
2. **GitHub secrets:** in this repo go to **Settings → Secrets and variables → Actions → New repository secret**, twice:
   - Name `STRIPE_SECRET_KEY`, value: the `rk_live_...` key.
   - Name `PRIVATE_KEY_JWK`, value: everything inside your `riptide-private-key-KEEP-SECRET.json` (open it in Notepad). Lost the file? Open `tools/unlock.html` in the same browser you made the key in and press **Download private key backup**. It must be the same key you made earlier codes with, or those codes stop working.
3. **Start it:** **Actions** tab → **Store unlocks** → **Run workflow**. After that it runs on its own every 5 minutes.

Optional: in each Stripe Payment Link, set **After payment** → redirect to `https://zayaiken21.github.io/Riptide-Rally/?paid=1`, so buyers land back in the game and see "your item unlocks here automatically".

The worker in `stripe-worker.js` is an alternative that unlocks instantly, but it needs a Cloudflare account. You don't need it.

The game tells items apart by price ($14.99 Everything Pass, $2.99 Grapple Hook, $3.99 Double Catch, $0.99, $4.99 and $10.00 fish). If you change a price, update `PRICES` at the top of `server/grant.mjs` too.

PayPal stays manual unless you add a PayPal webhook later.

## How safe is this?

Codes are signed, so nobody can make one without your private key, and each code only works for the player ID it was made for. Purchases live on the player's device: a player on a new phone redeems any of their codes there to move their ID and purchases across. A determined player who edits their browser storage could still give themselves items, because the game has no server. For a few dollars per item that's normal for web games. If you later want it airtight, the next step is a small account server.

## Weekly Cup ($5 a week)

- Free to enter, with no entry fee, purchase or ad required. Keep it that way: a paid entry fee for a cash prize can count as gambling in many US states.
- Everyone races this week's course in the stock Speedboat with no upgrades or store items, so buying things never helps.
- The leaderboard is shared through the multiplayer relays. It's public, so before paying, check the winning time looks real (ask for a screen recording or a rerun on a video call). To remove a fake time, add the player ID to `"cup": { "banned": [...] }` in `shop.json`.
- Change the prize text with `"cup": { "prize": "$5" }`. Winners email `supportEmail` with their player ID to claim.
- Check the contest rules where you live before you start paying prizes. This isn't legal advice.
