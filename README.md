# KINETIK — an athletic store built with Effect

A demo shop in the style of the big sportswear stores: shoes, clothing and
accessories for running, training, basketball, trail and lifestyle, with
colourways, sizes, filters, a bag and checkout. It is built end to end with
[Effect](https://effect.website) and is ready for Auth0 to be added next.

**Live demo:** <https://kinetik.mmatias.co.uk> (works on phones too). The
original Vercel URL <https://kinetik-store-zeta.vercel.app> still works.

> KINETIK is a fictional brand and product names are invented. Campaign
> imagery (hero, featured tiles, Shop by Sport, The Essentials and the "in
> action" slide on product pages) uses real CC0 / public-domain photos from
> StockSnap and rawpixel, found via [Openverse](https://openverse.org) and
> listed on `/credits`. Product images are illustrations drawn in code,
> because free libraries have no consistent set of unbranded product shots.

## What's inside

| Area | What it does |
| --- | --- |
| **Header** | Utility bar, mega menus (New & Featured, Men, Women, Kids, Sale), live search |
| **Home** | Hero, featured tiles, Just In, Shop by Sport, Trending Now, The Essentials, member band |
| **Listing** | Gender/category/sport views, filter sidebar (sale, price, colour, sport), sort, mobile filter sheet |
| **Product page** | Gallery, colourways, size grid with sold-out sizes, favourites, delivery info, accordions |
| **Bag** | Server-priced bag, change size/quantity, free-delivery progress, Guest / Member Checkout |
| **Checkout** | Ship or Pick Up, shipping speed, address and contact validated with the server's Schemas |
| **Order confirmation** | Order number, delivery date and timeline |
| **Favourites** | Saved in `localStorage`, validated with Schema on read |
| **Account** | "Join Us / Sign In" placeholder for Auth0 |
| **API docs** | Interactive OpenAPI docs at `/api/docs` |

The layout is mobile-first: it works well on a phone and scales up to desktop.

## How Effect is used

```
src/
  shared/   Domain.ts (Schemas), Api.ts (HttpApi definition), Pricing.ts
  server/   Catalog + Orders services, HTTP handlers, Node and Vercel entrypoints
  client/   React UI, Effect Atom state, typed API client
test/       API tests running against the real handlers in memory
```

- **One API definition, two sides.** `src/shared/Api.ts` declares every
  endpoint with `HttpApi`/`HttpApiEndpoint` and Effect `Schema`. The server
  implements it with `HttpApiBuilder`, and the browser derives a fully typed
  client from it (`AtomHttpApi`). Renaming a field breaks the build on both
  sides.
- **Typed errors.** `ProductNotFound`, `InvalidColor`, `InvalidSize`,
  `OutOfStock` and `OrderNotFound` are `Schema.TaggedError`s with HTTP status
  codes. The client
  receives them as typed values, not opaque 4xx responses.
- **Services and Layers.** `Catalog` and `Orders` are `Context.Service`s
  provided via `Layer`s. Stock lives in a `SynchronizedRef`, so concurrent
  checkouts can't oversell. Swapping in a database means writing a new
  layer; the handlers stay the same.
- **Server-side pricing.** The bag only stores product IDs, colours, sizes and
  quantities. Prices, savings and delivery fees always come from the server.
- **Effect Atom on the client.** The bag and favourites use `Atom.kvs` with
  `localStorage`. The quote atom re-runs whenever the bag or the delivery
  method changes.
- **Tests** use `@effect/vitest` and `HttpApiTest` to exercise the real
  handlers without starting a server.

## Run it locally

Requires Node 22+.

```bash
npm install
npm run dev          # UI on http://localhost:5173, API on http://localhost:3001
```

To open it from your phone on the same Wi-Fi, use the "Network" URL that Vite
prints (for example `http://192.168.1.20:5173`).

Other scripts:

```bash
npm test             # API tests
npm run typecheck    # TypeScript
npm run build        # production UI build into dist/
npm start            # one Node server for UI + API (after npm run build), PORT defaults to 3001
```

## Deploy (to open it on your phone)

### Vercel (recommended, free)

The repo includes `vercel.json` and `scripts/build-vercel.mjs`. The build
outputs Vercel's [Build Output API](https://vercel.com/docs/build-output-api)
format: the UI as static files, and the Effect API as a single serverless
function at `/api/*`.

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. Import this repository. If it isn't listed, use **Adjust GitHub App
   Permissions** to give Vercel access to it.
3. Leave the defaults (`vercel.json` sets the build command) and click
   **Deploy**.
4. Open the `https://<project>.vercel.app` URL on your phone.

The live demo is the Vercel project `kinetik-store`, linked to this repo.
It answers on the custom domain `kinetik.mmatias.co.uk` (a `CNAME` at the
domain's DNS host, which is Squarespace) and on `kinetik-store-zeta.vercel.app`.
Its production branch is `main`: pushing to `main` updates both
automatically. Pushes to other branches
create preview URLs, which by default require you to be logged in to Vercel.

### Render (alternative)

`render.yaml` is a one-click Blueprint: *New → Blueprint* on
<https://render.com>, pick this repo, deploy. It runs `npm start`, so the UI
and API come from the same Effect Node server. The free plan sleeps when idle,
so the first visit can take ~30 seconds.

### Demo limitations

Products, stock and orders are kept **in memory**. They reset when the server
restarts, and on Vercel each serverless instance has its own copy. That's fine
for a demo. For real persistence, add a database-backed `Catalog`/`Orders`
layer (for example with `effect/sql`).

## Sign-in with Auth0

Members sign in with [Auth0](https://auth0.com) Universal Login on the tenant's
custom domain **nelson.jp.mmatias.co.uk**.

| Piece | Value |
| --- | --- |
| Application | "KINETIK Store" single-page application, client ID `9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7` |
| Callback / logout / web origins | `https://kinetik.mmatias.co.uk`, `https://kinetik-store-zeta.vercel.app`, `http://localhost:5173`, `http://localhost:3001` |
| API (audience) | "KINETIK Store API", `https://kinetik-store-zeta.vercel.app/api`, RS256 |
| Scopes | `read:orders`, `create:orders` |
| Connections | `Username-Password-Authentication`, `google-oauth2` |

**In the browser** (`src/client/auth.tsx`): `@auth0/auth0-react` with refresh
tokens in local storage, so members stay signed in on mobile Safari. Join Us
opens the sign-up screen, Sign In returns you to the page you were on, and
**Member Checkout** signs you in and brings you back to checkout. The
client side of the `Authorization` middleware asks the SDK for an access token
and attaches it to member API calls.

**On the server** (`src/server/Auth.ts`): the `Authorization` middleware (an
Effect `HttpApiMiddleware` with bearer security) verifies every token with
`effect/jose`. It checks the RS256 signature against the tenant's JWKS, plus the
issuer, audience and expiry. Handlers then check scopes:

| Endpoint | Needs |
| --- | --- |
| `GET /api/me` | a valid token |
| `POST /api/me/cart/quote` | a valid token (member pricing: free standard delivery) |
| `POST /api/me/orders` | `create:orders` |
| `GET /api/me/orders` | `read:orders` (only your own orders) |

Guests can still check out through the public endpoints. The Account page shows
your orders and, under "Developer details", what the API verified from your
token.

Configuration is public and has defaults in code. To override it, use
`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` and `VITE_AUTH0_AUDIENCE` for the
browser build, and `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` for the server.

### Anonymous sessions (guests)

Guests get an Auth0 **anonymous session** without logging in
(`src/client/anonymous.ts`):

- On first visit the browser calls `POST https://nelson.jp.mmatias.co.uk/anonymous/token`.
  It gets a 30-day session token and a 1-day access token for the store API, with
  `sub: anon@…` and `sub_profile: "user urn:auth0:anonymous_user"`.
- The guest's bag count and last viewed product are written into the session
  **metadata** (`bag_items`, `last_viewed`). The API's claims mapping copies them
  into the guest token as `kinetik_bag_items` and `kinetik_last_viewed`. The
  metadata lives inside the session token, so the app always keeps the latest one.
- Guests order through the account API under their `anon@…` identity. They pay
  normal guest prices (no member pricing) and can see their guest orders on the
  Account page.
- On **Sign In / Join Us** the session is handed to Auth0's login in one of two
  ways (set `VITE_AUTH0_ANON_TRANSFER`):
  - `cookie` (default): Auth0 sets the `auth0_anon` cookie (365 days,
    `SameSite=None; Secure; HttpOnly`) on the Auth0 domain during the
    `/anonymous/token` calls. The app sends credentials so the browser keeps the
    cookie current, and `/authorize` picks it up by itself. After the transfer
    the app calls `/anonymous/logout` to end the cookie. On
    `kinetik.mmatias.co.uk` the store and the Auth0 domain
    (`nelson.jp.mmatias.co.uk`) are the same site, so the cookie is first-party
    and the transfer works even with third-party cookies blocked (tested). On
    the `vercel.app`
    URL it is a third-party cookie and only works where those are allowed; see
    HANDOVER for test results.
  - `ticket`: a 30-second, IP-bound transfer ticket
    (`audience: urn:auth0:anon_transfer`) is passed to `/authorize` as
    `anon_transfer_token`. This works in every browser.
- The post-login Action `auth0/actions/kinetik-guest-session-transfer.js` (which
  only runs for this app) adds the claim
  `https://kinetik-store-zeta.vercel.app/anonymous_user_id` plus the metadata,
  and saves `kinetik_last_guest_session` to the user's `app_metadata`. On the
  member's next request, the API moves the guest's orders into their account.

Tenant configuration: anonymous session lifetime 525,600 minutes (365 days, the
maximum Auth0 allows) with the anonymous cookie on; "Allow Anonymous Sessions" on for the app; the API
allows `anonymous_user` per app (1-day anonymous tokens); and a client grant with
`subject_type: anonymous_user` and scopes `read:orders create:orders`.

