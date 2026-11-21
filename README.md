# KINETIK — an athletic store built with Effect

A demo shop in the style of the big sportswear stores: shoes, clothing and
accessories for running, training, basketball, trail and lifestyle, with
colourways, sizes, filters, a bag and checkout. It is built end to end with
[Effect](https://effect.website) and is ready for Auth0 to be added next.

> KINETIK is a fictional brand. Product names are invented and every product
> image is a vector illustration drawn in code, so there are no photos,
> logos or third-party assets to license.

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

Vercel deploys the **production branch** (usually `main`) to the public URL.
Other branches get preview URLs, which by default require you to be logged in
to Vercel. Merge into `main`, or change the production branch under
*Project → Settings → Git*.

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

## Next step: Auth0

The seams are already there:

- `/account`, the "Join Us / Sign In" links and the **Member Checkout** button
  are placeholders for Auth0 Universal Login (`@auth0/auth0-react` in the
  browser).
- `src/shared/Api.ts` is where an `HttpApiMiddleware` with
  `HttpApiSecurity.bearer` would go. It would protect `/api/orders` and
  provide a `CurrentUser` service to the handlers.
- On the server, Effect's `effect/jose` module can verify Auth0 access tokens
  against your tenant's JWKS.
- Orders would then be linked to the signed-in user, and an "order history"
  endpoint would be added.

You'll need an Auth0 tenant, an SPA application (Domain + Client ID) and an
API (Audience), with the deployed URL added to the allowed callback, logout
and web-origin URLs.
