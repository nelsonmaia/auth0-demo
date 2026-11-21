# Handover: KINETIK store (Effect + React + Auth0)

Notes for the next agent picking up this repo. Read this together with
`README.md`, which covers features and local setup. This file covers state,
decisions, gotchas and open items.

- **Live site:** https://kinetik-store-zeta.vercel.app (public, works on phones)
- **Working branch:** `claude/retail-app-effect-auth0-qab8au` (everything is
  here; `main` still has only the initial README)
- **Last verified:** all 9 API tests pass. The full guest flow and a real
  Auth0 member flow (sign in → member checkout → order history → sign out)
  passed in a phone-sized browser against the live site.

## 1. What this is

A demo sportswear store under a fictional brand, **KINETIK**, with a layout
inspired by large athletic retailers' sites. It uses no real brand names,
logos, slogans or product names. It started as an IKEA-style furniture store
("Nordhem") and was redesigned at the user's request. Nothing from Nordhem
remains.

Stack: **Effect 4.1** (`effect`, `@effect/platform-node`, `@effect/atom-react`),
React 19, React Router 8, Vite 8, TypeScript 7, Vitest 5, `@auth0/auth0-react`.

## 2. Code map

```
src/shared/   Shared by server and browser (no server code here)
  Domain.ts     Effect Schemas: Product, ColorOption, CartLine (with size), Quote, Order, errors
  Api.ts        HttpApi definition: system, catalog, checkout, account (protected)
  Auth.ts       Member, CurrentMember, Unauthorized/Forbidden, Authorization middleware, Scopes
  Pricing.ts    Delivery fees; members get free standard delivery
src/server/
  CatalogData.ts  27 products, 5 sports (seed data, in memory)
  Catalog.ts      Catalog service; stock in a SynchronizedRef
  Orders.ts       Pricing (server-side only), place orders, listFor(customerId)
  Auth.ts         AuthConfig, TokenVerifier (JWKS via effect/jose; layerTest for tests), AuthorizationLive
  Http.ts         Handlers; HandlersNoAuth (tests) and HandlersLive; ApiRoutes (+ /api/docs)
  main.ts         Node server (API + static dist/) for local and Render
  vercel.ts       Vercel function: Web handler adapted to Node req/res
src/client/
  auth.tsx        auth0Config, authAtom, AuthBridge, client Authorization middleware, useAuthActions
  StoreClient.ts  AtomHttpApi client (FetchHttpClient + AuthorizationClient)
  state.ts        Atoms: bag/favourites (localStorage via Atom.kvs), quote, products, member orders
  art/ProductArt.tsx  SVG sneaker/apparel illustrations (product images)
  photos.ts + components/Photo.tsx  Real CC0 photos for campaign imagery
  pages/          Home, ProductList (filters), ProductPage, Cart, Checkout, Other (order, favourites, account, credits, 404)
test/api.test.ts  HttpApiTest-based API tests with fake tokens
scripts/build-vercel.mjs  Writes .vercel/output (Build Output API v3)
```

Effect usage guidance lives in `node_modules/effect/AGENTS.md` and
`node_modules/effect/ai-docs/`. Effect 4 APIs differ from Effect 3 (for
example `Context.Service`, `effect/http-api` and `effect/reactivity`), so
check those docs rather than relying on memory.

## 3. Commands

```bash
npm install
npm run dev          # UI :5173 (Vite, proxies /api) + API :3001
npm test             # 9 API tests
npm run typecheck
npm run build        # dist/
npm run build:vercel # dist/ + .vercel/output
npm start            # Node server for API + dist/ on PORT (default 3001)
```

## 4. Deployment (Vercel)

- Team `team_lK93h31Vdd13Nhv2g6Aglb5Q` ("nelsons-projects"), project
  `kinetik-store` (`prj_Zu6J91XeywGZxIctFqmd3GynUcmu`), linked to GitHub
  `nelsonmaia/auth0-demo`. The production alias is
  `kinetik-store-zeta.vercel.app`.
- `vercel.json` sets `framework: null` and the build command
  `npm run build:vercel`. The build emits `.vercel/output`: static UI, the
  function `api.func` (esbuild bundle of `src/server/vercel.ts`), and routes
  (`/api/*` → function, `/assets/*` cached, everything else → `index.html`).
- **The project's production branch is `main`, which has no app yet.** Every
  production deploy so far was made manually with the Vercel MCP connector:
  `create_deployment` with `target: "production"` and
  `gitSource {org: nelsonmaia, repo: auth0-demo, ref: <this branch>, sha}`.
  Pushes to this branch only create preview deploys, which sit behind Vercel
  login. To get automatic production deploys, merge this branch into `main`
  (the user was offered a PR; none has been opened yet).
- The SPA fallback returns `index.html` with status 200 for unknown paths, so
  to check that a static file is deployed, look at its `content-type`, not
  the status code.

## 5. Auth0

The tenant is `nelson.jp.auth0.com` (Management API). Users sign in through
the custom domain **`nelson.jp.mmatias.co.uk`**, which is verified and
primary, so the token issuer is `https://nelson.jp.mmatias.co.uk/`.

| Resource | Details |
| --- | --- |
| SPA app "KINETIK Store" | client ID `9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7`, token endpoint auth `none`, grants `authorization_code` + `refresh_token` (rotating) |
| Callbacks / logout / web origins / allowed origins | `https://kinetik-store-zeta.vercel.app`, `http://localhost:5173`, `http://localhost:3001` |
| API "KINETIK Store API" | identifier/audience `https://kinetik-store-zeta.vercel.app/api`, RS256, scopes `read:orders` `create:orders`, offline access on, consent skipped for first-party apps |
| Connections enabled for the app | `Username-Password-Authentication`, `google-oauth2` |

Behaviour to know about:

- The tenant shows a **passkey enrollment prompt** (`/u/passkey-enrollment`)
  after password login. Automated tests must click its skip button.
- Login is identifier-first (`/u/login/identifier`, then the password page).
  Use the visible "Continue" button; there are hidden submit buttons too.
- Consent is shown for `localhost` callbacks only.
- The client uses refresh tokens with `cacheLocation="localstorage"`, because
  the app (vercel.app) and the auth domain are cross-site, so silent iframe
  auth won't work on Safari.
- Config defaults live in code. Overrides: `VITE_AUTH0_DOMAIN`,
  `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` (browser) and
  `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (server).

### Management API access and security cleanup (still pending, user action)

- The user saved a Management API token as a **network secret on their
  personal "Default" cloud environment** for host `nelson.jp.auth0.com`. The
  proxy injects it into requests to that host. Send a placeholder
  `Authorization: Bearer proxy-injected` header; the real value is never
  visible. It covers every session on that environment, so the user was asked
  to delete it (environment menu → Edit → Network secrets) when done.
- The same token was also **pasted into the chat**. It has very broad scopes
  and expires roughly 30 days after 2026-11-21. The user was advised to
  delete or restrict the machine-to-machine app that issued it, or to rotate
  signing keys. **Do not** copy that token into files, commits or commands.
- A temporary test user created for end-to-end testing has been **deleted**.
  If you create test users again, delete them afterwards.

## 6. Gotchas found along the way

- **Sandbox networking:** in the cloud container, Node's `fetch` ignores the
  HTTPS proxy, so server-side JWKS fetches fail locally ("The key set request
  failed"). Run the local server with `NODE_USE_ENV_PROXY=1`. This isn't
  needed on Vercel.
- **Test client and middleware:** `HttpApiTest.groups(...)` captures the
  client-side middleware when the client is built. To call as different
  members, build one client per token (see `clientAs` in the tests).
- **Effect Atom families:** query atoms are keyed by a JSON string
  (`productsAtom`) so identical queries share one atom.
- **Bag rows** render from the local bag (`cartAtom`) and take prices from
  the server quote. That fixed a race where a quick size-then-quantity change
  was lost on slow networks.
- **Schema.Trimmed is a check, not a transform.** The client trims form
  values before building `Contact`/`Address`.
- **Images:** product images are SVG illustrations (`ProductArt.tsx`).
  Campaign photos are CC0 from StockSnap and rawpixel (found via the
  Openverse API, which needs no key), self-hosted in `public/photos/` and
  credited on `/credits`. Photos with visible brand logos or identifiable
  sponsored athletes were excluded on purpose. Free libraries had no
  consistent set of unbranded product shots. The user was offered three
  options for real product photos and hasn't chosen yet: an Unsplash/Pexels
  API key (it would have to go in environment settings, because their header
  format doesn't fit the credential form), their own photos, or AI-generated
  shots. An unofficial Unsplash endpoint was blocked by the safety check, so
  use official APIs only.

## 7. Known limitations and open items

1. **Persistence:** products, stock and orders live in memory. On Vercel each
   function instance has its own copy, so member order history can reset.
   Next step: a DB-backed `Catalog`/`Orders` layer (for example `effect/sql`
   with Postgres). Handlers won't need to change.
2. **Production branch:** open a PR from this branch into `main` if the user
   wants automatic production deploys (ask first; no PR exists).
3. **Real product photos:** waiting on the user's choice (see above).
4. **Security cleanup:** the user removes the network secret and revokes or
   restricts the pasted token's app.
5. Nice-to-haves: member-only products gated by scope or role, a Google login
   button test, stock per size, and an order status/tracking page.

## 8. How to verify changes

- `npm run typecheck && npm test && npm run build:vercel`
- Manual or Playwright check at a phone viewport (Chromium and Playwright are
  preinstalled in the cloud container): home → search → product page (size
  required) → bag (change size and quantity) → checkout (validation, express)
  → order confirmation → reload; plus filters, favourites and 404.
- Member flow: Member Checkout → Universal Login on
  `nelson.jp.mmatias.co.uk` → skip passkey prompt → checkout shows "Free
  (Member)" and prefilled fields → place order → `/account` lists it and
  "Developer details" shows `sub` and scopes → reload stays signed in →
  Sign Out.
