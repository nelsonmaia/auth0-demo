import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, Schema } from "effect"
import { Atom } from "effect/reactivity"
import type { CategoryId, DeliveryMethod, Gender, Order, Product, ProductSort, SportId } from "../shared/Domain.ts"
import { CartLine, ProductId, Quantity, QuoteRequest } from "../shared/Domain.ts"
import { authAtom, guestAtom } from "./auth.tsx"
import { StoreClient } from "./StoreClient.ts"

// ---------------------------------------------------------------------------
// Persistent client state (localStorage, validated with Schema on read)
// ---------------------------------------------------------------------------

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

const StoredLine = Schema.Struct({
  productId: ProductId,
  colorId: Schema.String,
  size: Schema.String,
  quantity: Quantity
})
export type StoredLine = typeof StoredLine.Type

/** The shopping bag. Corrupt or outdated data in storage falls back to empty. */
export const cartAtom = Atom.kvs({
  runtime: storage,
  key: "kinetik.bag.v1",
  schema: Schema.Array(StoredLine),
  defaultValue: () => []
}).pipe(Atom.keepAlive)

const Favourite = Schema.Struct({ productId: ProductId, colorId: Schema.String })
export type Favourite = typeof Favourite.Type

export const favouritesAtom = Atom.kvs({
  runtime: storage,
  key: "kinetik.favourites.v1",
  schema: Schema.Array(Favourite),
  defaultValue: () => []
}).pipe(Atom.keepAlive)

export const cartCountAtom = Atom.make((get) => get(cartAtom).reduce((sum, line) => sum + line.quantity, 0))

const same = (a: Pick<StoredLine, "productId" | "colorId" | "size">, b: Pick<StoredLine, "productId" | "colorId" | "size">) =>
  a.productId === b.productId && a.colorId === b.colorId && a.size === b.size

/** Pure bag operations, used with `useAtom(cartAtom)` setters. */
export const Bag = {
  add: (lines: ReadonlyArray<StoredLine>, item: Omit<StoredLine, "quantity">, quantity = 1) => {
    const existing = lines.find((l) => same(l, item))
    if (!existing) return [...lines, { ...item, quantity: Math.min(10, quantity) }]
    return lines.map((l) => (same(l, item) ? { ...l, quantity: Math.min(10, l.quantity + quantity) } : l))
  },
  setQuantity: (lines: ReadonlyArray<StoredLine>, item: Omit<StoredLine, "quantity">, quantity: number) =>
    quantity <= 0
      ? lines.filter((l) => !same(l, item))
      : lines.map((l) => (same(l, item) ? { ...l, quantity: Math.min(10, quantity) } : l)),
  setSize: (lines: ReadonlyArray<StoredLine>, item: Omit<StoredLine, "quantity">, size: string) => {
    const current = lines.find((l) => same(l, item))
    if (!current) return lines
    const rest = lines.filter((l) => !same(l, item))
    return Bag.add(rest, { ...item, size }, current.quantity)
  },
  remove: (lines: ReadonlyArray<StoredLine>, item: Omit<StoredLine, "quantity">) => lines.filter((l) => !same(l, item))
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export const deliveryAtom = Atom.make<DeliveryMethod>("standard").pipe(Atom.keepAlive)

/** The last product a shopper looked at (synced to a guest's anonymous session). */
export const lastViewedAtom = Atom.make<string | undefined>(undefined).pipe(Atom.keepAlive)

/** The most recent order, so the confirmation page renders instantly. */
export const lastOrderAtom = Atom.make<Order | undefined>(undefined).pipe(Atom.keepAlive)

export interface Toast {
  readonly id: number
  readonly product: Product
  readonly colorId: string
  readonly size: string
}
export const toastAtom = Atom.make<Toast | undefined>(undefined)

// ---------------------------------------------------------------------------
// Server data
// ---------------------------------------------------------------------------

export const sportsAtom = StoreClient.query("catalog", "sports", { timeToLive: "10 minutes" })

export interface ProductQuery {
  readonly category?: CategoryId | undefined
  readonly gender?: Gender | undefined
  readonly sport?: SportId | undefined
  readonly q?: string | undefined
  readonly sort?: ProductSort | undefined
}

// Keyed by a string so identical queries always share one atom (and its cache).
const productsFamily = Atom.family((key: string) =>
  StoreClient.query("catalog", "products", { query: JSON.parse(key) as ProductQuery, timeToLive: "2 minutes" })
)
export const productsAtom = (query: ProductQuery) =>
  productsFamily(
    JSON.stringify({
      category: query.category,
      gender: query.gender,
      sport: query.sport,
      q: query.q?.trim() || undefined,
      sort: query.sort
    })
  )

const productFamily = Atom.family((id: string) =>
  StoreClient.query("catalog", "product", { params: { id: ProductId.make(id) }, timeToLive: "2 minutes" })
)
export const productAtom = (id: string) => productFamily(id)

/**
 * Server-side pricing of the bag. Re-runs whenever the bag, the delivery method
 * or the sign-in state changes; signed-in members get member pricing.
 */
export const quoteAtom = StoreClient.runtime.atom((get) =>
  Effect.gen(function*() {
    const lines = get(cartAtom)
    const delivery = get(deliveryAtom)
    const { isAuthenticated } = get(authAtom)
    const client = yield* StoreClient
    const payload = new QuoteRequest({ lines: lines.map((line) => new CartLine(line)), delivery })
    if (!isAuthenticated) return yield* client.checkout.quote({ payload })
    return yield* client.account.quote({ payload }).pipe(
      // An expired session falls back to guest pricing instead of failing.
      Effect.catchTag("Unauthorized", () => client.checkout.quote({ payload }))
    )
  })
)

export const placeOrderAtom = StoreClient.mutation("checkout", "placeOrder")
export const placeMemberOrderAtom = StoreClient.mutation("account", "placeOrder")

/** The member's (or guest's) orders, fetched fresh each time the page mounts. */
export const myOrdersAtom = StoreClient.runtime.atom((get) =>
  Effect.gen(function*() {
    const auth = get(authAtom)
    const guest = get(guestAtom)
    if (auth.isLoading || (!auth.isAuthenticated && !guest)) return []
    const client = yield* StoreClient
    return yield* client.account.orders()
  })
)

/** What the API sees for the caller (member or guest): user id, scopes, metadata. */
export const meAtom = StoreClient.runtime.atom((get) =>
  Effect.gen(function*() {
    const auth = get(authAtom)
    const guest = get(guestAtom)
    if (auth.isLoading || (!auth.isAuthenticated && !guest)) return undefined
    const client = yield* StoreClient
    return yield* client.account.me()
  })
)
