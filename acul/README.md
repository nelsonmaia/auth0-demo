# KINETIK login screens (Auth0 ACUL)

Custom Universal Login screens for the KINETIK Store app, built with
[Advanced Customizations for Universal Login](https://auth0.com/docs/customize/login-pages/advanced-customizations)
and `@auth0/auth0-acul-js`. They use the store's design tokens, fonts and logo.

- **Hosted at:** https://kinetik-login.vercel.app (Vercel project `kinetik-login`)
- **Applies to:** only the KINETIK Store client (`9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7`), via `filters`
  in the rendering config. Other apps in the tenant keep standard rendering.
- **Screens:** login-id, login-password, signup-id, signup-password, passkey-enrollment,
  reset-password-request, reset-password-email, reset-password, reset-password-success,
  reset-password-error.

## Code

```
src/main.ts      Picks the screen from window.universal_login_context and mounts it
src/screens.ts   One function per screen, using the ACUL SDK classes
src/ui.ts        Page shell, fields, buttons, errors (no framework)
src/styles.css   Same tokens as src/client/styles.css in the store
auth0/rendering.json           Body for PATCH /api/v2/prompts/rendering
auth0/previous-rendering.json  What those screens had before (old demo settings)
```

## Build and deploy

```bash
npm install
npm run typecheck
npm run build      # dist/kinetik-login.{js,css} + dist/sri.json
```

The Vercel project has no Git connection; it was deployed from these source files
(build command `npm run build`, output `dist`). Production must be the target:
the team's preview URLs sit behind Vercel login.

**The head tags pin SRI hashes.** After any change to the JS or CSS, update
`auth0/rendering.json` with the new values from `dist/sri.json` (as one-item
arrays: Auth0 expects `integrity` to be a list) and PATCH it again, or the
browser will refuse to load the files and the login page will be blank.

```bash
curl -X PATCH https://nelson.jp.auth0.com/api/v2/prompts/rendering \
  -H "Authorization: Bearer $MGMT_TOKEN" -H "Content-Type: application/json" \
  --data-binary @auth0/rendering.json
```

Needs a Management API token with `update:prompts`.

## Revert to the standard Auth0 page

Set `rendering_mode` to `"standard"` for the same screens, for example:

```bash
jq '.configs |= map({prompt, screen, rendering_mode: "standard"})' auth0/rendering.json > /tmp/standard.json
curl -X PATCH https://nelson.jp.auth0.com/api/v2/prompts/rendering \
  -H "Authorization: Bearer $MGMT_TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/standard.json
```

## Preview locally

`node preview/shoot.cjs <out-dir>` renders each screen from `dist/` with mock
context data and takes screenshots. `node preview/live.cjs <out-dir>` runs the
real flow from the live store (stops at a wrong-password error; creates no users).

## Experiments (Auth0 Experiment Center)

The email screen (`login-id`) has `context_configuration: ["experiment"]`, so
the ACUL SDK exposes `experiment` on it. `flag()` in `src/screens.ts` reads a
flag parameter. The docs show `{ value }` entries, but the live tenant sends plain values (`passkey_first: true`), so `flag()` accepts both.

| Experiment | Flag | Cohorts | Status |
| --- | --- | --- | --- |
| `exp_sdxjEf9YL9KkeS2C3v5gSA` KINETIK passkey first (by device) | `flg_aS2MNmT8FE2JWQTSLCvoHT` (`passkey_first`) | Segment "KINETIK on phones" (`seg_g45cttUh7tfpAbU1ivKoTY`, client + `device_type: mobile`) gets B; everyone else falls back to A | completed 2026-11-22 |
| `exp_gsPF1J4G1zXMsw3wAEBFgb` KINETIK passkeys by country | `flg_g6q4xZ1GuBX5CfgZtHno3U` (`show_passkeys`) | Segment "KINETIK in the UK" (`seg_wnGqDTM5uME1Rkv4KZDXZQ`, client + `country: GB`) gets "With passkeys" (control); everyone else falls back to "Without passkeys" | completed 2026-11-23 |
| `exp_kBxn3AJ7EbVFoXUyg3Nk73` KINETIK passkeys by shopping country | `flg_g6q4xZ1GuBX5CfgZtHno3U` (`show_passkeys`) | Segment "KINETIK shopping in the UK" (`seg_wpGqHNkpvLphjxsfomtwfc`): `anonymous_session_metadata.shop_country` = GB, **or** IP country GB when the shopper left the footer picker on Automatic. Everyone else: "Without passkeys" | **active** since 2026-11-23 |
| KINETIK passkey prompt timing (Exp 1) | `flg_a0_managed_passkey_enrollment` (Auth0-managed) | see HANDOVER.md | not created |

Segment `seg_tZouhVqdez8ThL2MagzQg2` ("KINETIK Store app") matches the KINETIK
client ID. Segment rules use arrays of exact values, e.g.
`{"match":{"client_id":["<id>"]}}`. Auth0 does not allow a random split inside a
segment, or ramp `levels` with segments; percentage splits are tenant-wide.
While the feature is in beta, only one experiment can be active per tenant.

Force a version for QA by adding `experiment_id` and `variation_id` to the
`/authorize` request (works in draft).

Other segments: `seg_wnGqDTM5uME1Rkv4KZDXZQ` "KINETIK in the UK" (client + `country: GB`),
used by the country experiment. The earlier 50/50 draft `exp_wiUXgJC3b5ayCcs2JRMbu9` is archived.
`node preview/cohort.cjs <out-dir>` signs in as a phone and a desktop and prints
the version each gets. Forcing a version with `experiment_id`/`variation_id`
on `/authorize` did not pass the context while the experiment was a draft.

**Shopping country picker.** The store footer has a country picker
(`shopCountryAtom` in `src/client/state.ts`). For guests it writes
`shop_country` (`auto`, `GB`, `US`, `IE`, `FR`, `DE`, `ES`, `PT`) to the Auth0
anonymous session at once, so the next sign-in is matched by it. Segment rule
syntax that works: `{"match":{"client_id":[...],"anonymous_session_metadata.shop_country":["GB"]}}`
and `"not_match":{"anonymous_session_metadata.shop_country":["US",...]}`
(`{"exists":true}` is also accepted). It relies on the anonymous-session cookie
reaching `/authorize`, so test on `kinetik.mmatias.co.uk`, not the vercel.app
URL. A running experiment freezes its segments: to change a rule, complete the
experiment and start a new one. `node preview/country.cjs [store-url]` checks
Automatic, UK and US end to end.
