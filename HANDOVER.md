# Handover: KINETIK store (Effect + React + Auth0)

Notes for the next agent picking up this repo. Read this together with
`README.md`, which covers features and local setup. This file covers state,
decisions, gotchas and open items.

- **Live site:** https://kinetik.mmatias.co.uk (custom domain, see §4) and
  https://kinetik-store-zeta.vercel.app (public, works on phones)
- **Working branch:** `claude/retail-app-effect-auth0-qab8au` (everything is
  here; `main` still has only the initial README)
- **Last verified:** all 11 API tests pass. The full guest flow and a real
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
  auth.tsx        auth0Config, authAtom, guestAtom, AuthBridge, client Authorization middleware, useAuthActions
  anonymous.ts    Auth0 anonymous sessions: create/continue, metadata, transfer ticket (no React)
  GuestSync.tsx   Syncs bag count / last viewed product into the guest's session metadata
  StoreClient.ts  AtomHttpApi client (FetchHttpClient + AuthorizationClient)
  state.ts        Atoms: bag/favourites (localStorage via Atom.kvs), quote, products, member orders
  art/ProductArt.tsx  SVG sneaker/apparel illustrations (product images)
  photos.ts + components/Photo.tsx  Real CC0 photos for campaign imagery
  pages/          Home, ProductList (filters), ProductPage, Cart, Checkout, Other (order, favourites, account, credits, 404)
test/api.test.ts  HttpApiTest-based API tests with fake tokens (members, guests, transfer)
auth0/actions/kinetik-guest-session-transfer.js  Source of the deployed post-login Action
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
  `nelsonmaia/auth0-demo`. Production domains: `kinetik-store-zeta.vercel.app`
  and the custom domain **`kinetik.mmatias.co.uk`** (added 2026-11-23).
- **Custom domain DNS:** `mmatias.co.uk` is registered with Squarespace
  (ex-Google Domains, nameservers `ns-cloud-a*.googledomains.com`). The store
  needs `CNAME kinetik → 51c8d4f947cdfc45.vercel-dns-017.com.` there (Vercel's
  recommended target; `cname.vercel-dns.com.` also works). The Squarespace MCP
  connector has **no DNS tools** (only store, contacts and domain search), so
  the user adds DNS records by hand in Squarespace → Domains → mmatias.co.uk →
  DNS → Custom records. The Auth0 custom domain `nelson.jp` is a CNAME in the
  same zone. Status: record requested from the user on 2026-11-23, pending.
- Why the subdomain: it makes the store the same site as the Auth0 custom
  domain, so the `auth0_anon` cookie is first-party (see §5).
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
| Callbacks / logout / web origins / allowed origins | `https://kinetik.mmatias.co.uk`, `https://kinetik-store-zeta.vercel.app`, `http://localhost:5173`, `http://localhost:3001`; `initiate_login_uri` `https://kinetik.mmatias.co.uk/account` |
| API "KINETIK Store API" | identifier/audience `https://kinetik-store-zeta.vercel.app/api`, RS256, scopes `read:orders` `create:orders`, offline access on, consent skipped for first-party apps |
| Connections enabled for the app | `Username-Password-Authentication`, `google-oauth2` |

Anonymous sessions (set up on 2026-11-23, feature flag on for the tenant):

| Setting | Value |
| --- | --- |
| Tenant `sessions.anonymous` | `lifetime_in_minutes: 525600` (365 days, the API maximum), `activate_cookie: true` (since 2026-11-23, cookie transfer mode) |
| Client | `anonymous_sessions.active: true`; `enforce_anon_session_transfer_network_binding: ip` (default) |
| API | `subject_type_authorization.anonymous_user: require_client_grant`, `token_lifetime_for_anonymous_access_tokens: 86400` |
| API claims mapping | `kinetik_bag_items` ← `anonymous_session.metadata.bag_items`, `kinetik_last_viewed` ← `anonymous_session.metadata.last_viewed` |
| Client grant | `cgr_GWIKYnplNIVW9wRs`: `subject_type: anonymous_user`, scopes `read:orders create:orders` |
| Post-login Action | "KINETIK Store - guest session transfer", id `79c3ccb4-1c55-4a4f-be87-a166e0abca78`, node22, the only post-login binding; no-op for other client IDs |

What I learned testing `/anonymous/token` (`POST https://<custom domain>/anonymous/token`, JSON):

- New session: `{client_id, audience, scope: "anon read:orders create:orders"}` returns
  `session_token` (opaque, 30 days), `access_token` (`sub: anon@<uuid>`,
  `sub_profile: "user urn:auth0:anonymous_user"`) and `session_expires_in`.
- Continue: add `session_token`, which gives the same `sub`. `anonymous_session_token` is
  rejected (the endpoint allows no extra properties).
- Metadata: add `metadata: {k: "v"}` (string values). This returns a **new**
  session token that carries the merged metadata. Reusing an older session
  token loses later updates, so always keep the latest one.
- Transfer ticket: `{audience: "urn:auth0:anon_transfer", scope: "anon", session_token}`
  returns `anon_transfer_token`, valid for 30 seconds and bound to the
  requester's IP. Pass it to `/authorize` as `anon_transfer_token` (the SPA SDK
  forwards it via `authorizationParams`).
- CORS allows the store's origin (with credentials). There's no server-side
  invalidation; `/anonymous/logout` only clears the `auth0_anon` cookie. The app
  calls it right after a member signs in, in cookie mode.
- Cookie: `auth0_anon=ANONYMOUS_SESSION_…; Max-Age=31536000; HttpOnly; Secure;
  SameSite=None`, host-only on the custom domain. The app sends
  `credentials: "include"` on `/anonymous/*` in cookie mode (`VITE_AUTH0_ANON_TRANSFER`,
  default `cookie`; set it to `ticket` for the cookieless mode).
- After login, the Action sees `event.anonymous_session` (`user_id`, `metadata`, …).
- Known nit: the bag metadata sync is debounced by 1.5 s, so a change made just
  before clicking Sign In can miss the transferred metadata. Flush it before
  requesting the ticket if that matters.

Cookie transfer test results (2026-11-23, live site, Chromium via Playwright):

| Browser setting | `auth0_anon` stored? | Transfer at login |
| --- | --- | --- |
| Default (third-party cookies allowed) | yes | works; the member token has the transferred `anon@` id and metadata |
| Third-party cookies blocked (CDP `Network.setCookieControls`, as in Safari/Brave/Firefox strict) | **no** | **fails silently**: no transfer, guest orders not moved |

Why: the store (`*.vercel.app`) and the Auth0 domain (`*.mmatias.co.uk`) are
different sites, so a cookie set by the cross-site `/anonymous/token` call is a
third-party cookie. Fix options:
- (a) Serve the store from a subdomain of `mmatias.co.uk` (same site as the
  Auth0 custom domain). Then the cookie is first-party. **Set up on
  2026-11-23** as `kinetik.mmatias.co.uk`: Vercel domain added, Auth0
  callbacks/origins/logout URLs updated, DNS record pending (see §4). The app
  code needed no change (it uses `window.location.origin`). The API audience
  and the claims namespace still use the `vercel.app` URL; they are only
  identifiers, so they stay as they are.
- (b) Switch back to ticket mode (`VITE_AUTH0_ANON_TRANSFER=ticket`), which
  works everywhere.

Also: Safari may cap cookies set by CNAME-cloaked subdomains (the Auth0 custom
domain is a CNAME) to 7 days, so expect a shorter cookie life there even with
option (a). The session token kept in localStorage still lasts 365 days.

Behaviour to know about:

- The tenant shows a **passkey enrollment prompt** (`/u/passkey-enrollment`)
  after password login. Automated tests must click its skip button.
- Login is identifier-first (`/u/login/identifier`, then the password page).
  Use the visible "Continue" button; there are hidden submit buttons too.
- Consent is shown for `localhost` callbacks only.
- The client uses refresh tokens with `cacheLocation="localstorage"`, because
  on vercel.app the app and the auth domain are cross-site, so silent iframe
  auth won't work on Safari. (On `kinetik.mmatias.co.uk` they are same-site;
  refresh tokens still work and are kept for both hosts.)
- Config defaults live in code. Overrides: `VITE_AUTH0_DOMAIN`,
  `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` (browser) and
  `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (server).

### Custom login page (ACUL)

The Universal Login screens for the KINETIK Store app use Advanced
Customizations (ACUL) with the store's look. Code is in `acul/` (see
`acul/README.md`); assets are served from https://kinetik-login.vercel.app
(Vercel project `kinetik-login`, deployed from source files, no Git link).

- 10 screens are in `rendering_mode: "advanced"` with a `filters` entry for
  the KINETIK client only, so other apps in this shared tenant (older IKEA
  and Starbucks-style demos) still get standard rendering. Note that
  `login-passwordless-email-code` was already `advanced` with no filter
  before this work; it belongs to another demo and was left alone.
- The head tags pin SRI hashes (`integrity` must be a **list** in the
  Management API). After changing the JS or CSS, redeploy and re-PATCH
  `acul/auth0/rendering.json` with the new hashes, or the page goes blank.
- `acul/auth0/previous-rendering.json` holds the old (unused) head tags those
  screens had, in case another demo needs them back.
- Verified live at phone size: store → Sign In → KINETIK email screen →
  password screen → error state → Join screen.

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
   function instance has its own copy, so member order history can reset, and
   a guest order placed on one instance may not be found (or moved at sign-in)
   by another. This was seen in the 2026-11-23 live tests.
   Next step: a DB-backed `Catalog`/`Orders` layer (for example `effect/sql`
   with Postgres). Handlers won't need to change.
2. **Production branch:** open a PR from this branch into `main` if the user
   wants automatic production deploys (ask first; no PR exists).
3. **Real product photos:** waiting on the user's choice (see above).
4. **Security cleanup:** the user removes the network secret and revokes or
   restricts the pasted token's app.
5. Nice-to-haves: member-only products gated by scope or role, a Google login
   button test, stock per size, and an order status/tracking page.
6. Anonymous sessions: the guest bag lives only in localStorage. The session
   metadata holds just a count. Moving the full bag would need a compact bag
   encoding (max 25 keys, 255 chars per value) or a server-side bag keyed by
   the `anon@` id.

## 8. How to verify changes

- `npm run typecheck && npm test && npm run build:vercel`
- Manual or Playwright check at a phone viewport (Chromium and Playwright are
  preinstalled in the cloud container): home → search → product page (size
  required) → bag (change size and quantity) → checkout (validation, express)
  → order confirmation → reload; plus filters, favourites and 404.
- Guest flow: a fresh browser has `localStorage["kinetik.guest-session.v1"]`
  with an `anon@` token → add to bag → about 1.5 s later the guest token has
  `kinetik_bag_items` → Guest Checkout → `/account` lists "Your Guest Orders" →
  Sign In (the `/authorize` URL has `anon_transfer_token`) → after login the
  member Account page shows "We brought your guest activity…" and the guest
  order.
- Member flow: Member Checkout → Universal Login on
  `nelson.jp.mmatias.co.uk` → skip passkey prompt → checkout shows "Free
  (Member)" and prefilled fields → place order → `/account` lists it and
  "Developer details" shows `sub` and scopes → reload stays signed in →
  Sign Out.

## 9. Session notes (custom login page)

- A later session reached the Management API through `AUTH0_API2_CLIENT_ID`
  and `AUTH0_API2_CLIENT_SECRET` environment variables (client credentials,
  audience `https://nelson.jp.auth0.com/api/v2/`). They belong to the
  tenant's "API Explorer Application", which has every Management API scope.
  The user was advised to swap it for a least-privilege M2M app and remove
  the variables when done. Never print or commit their values.
