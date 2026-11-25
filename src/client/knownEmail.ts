import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Schema } from "effect"
import { Atom } from "effect/reactivity"

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

/**
 * An email the shopper gave us (news sign-up or guest checkout). Kept in this
 * browser only and passed to Auth0 as `login_hint`, so Sign In and Join start
 * with it filled in. Separate module so auth.tsx and state.ts don't import
 * each other.
 */
export const knownEmailAtom = Atom.kvs({
  runtime: storage,
  key: "kinetik.email.v1",
  schema: Schema.String,
  defaultValue: () => ""
}).pipe(Atom.keepAlive)
