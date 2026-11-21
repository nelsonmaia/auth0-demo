import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, Schema } from "effect"
import { Atom } from "effect/reactivity"
import type { CategoryId, DeliveryMethod, Order, Product, ProductSort, RoomId } from "../shared/Domain.ts"
import { CartLine, ProductId, Quantity, QuoteRequest } from "../shared/Domain.ts"
import { StoreClient } from "./StoreClient.ts"

// ---------------------------------------------------------------------------
// Persistent client state (localStorage, validated with Schema on read)
// ---------------------------------------------------------------------------

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

const StoredLine = Schema.Struct({ productId: ProductId, colorId: Schema.String, quantity: Quantity })
export type StoredLine = typeof StoredLine.Type

/** The shopping bag. Corrupt or outdated data in storage falls back to empty. */
export const cartAtom = Atom.kvs({
  runtime: storage,
  key: "nordhem.cart.v1",
  schema: Schema.Array(StoredLine),
  defaultValue: () => []
}).pipe(Atom.keepAlive)

export const favouritesAtom = Atom.kvs({
  runtime: storage,
  key: "nordhem.favourites.v1",
  schema: Schema.Array(ProductId),
  defaultValue: () => []
}).pipe(Atom.keepAlive)

export const cartCountAtom = Atom.make((get) => get(cartAtom).reduce((sum, line) => sum + line.quantity, 0))

// Pure cart operations, used with `useAtom(cartAtom)` setters.
export const Cart = {
  add: (lines: ReadonlyArray<StoredLine>, productId: ProductId, colorId: string, quantity = 1) => {
    const index = lines.findIndex((l) => l.productId === productId && l.colorId === colorId)
    if (index === -1) return [...lines, { productId, colorId, quantity: Math.min(99, quantity) }]
    return lines.map((l, i) => (i === index ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l))
  },
  setQuantity: (lines: ReadonlyArray<StoredLine>, productId: ProductId, colorId: string, quantity: number) =>
    quantity <= 0
      ? lines.filter((l) => !(l.productId === productId && l.colorId === colorId))
      : lines.map((l) =>
        l.productId === productId && l.colorId === colorId ? { ...l, quantity: Math.min(99, quantity) } : l
      ),
  remove: (lines: ReadonlyArray<StoredLine>, productId: ProductId, colorId: string) =>
    lines.filter((l) => !(l.productId === productId && l.colorId === colorId))
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export const deliveryAtom = Atom.make<DeliveryMethod>("standard").pipe(Atom.keepAlive)

/** The most recent order, so the confirmation page renders instantly. */
export const lastOrderAtom = Atom.make<Order | undefined>(undefined).pipe(Atom.keepAlive)

export interface Toast {
  readonly id: number
  readonly product: Product
  readonly colorId: string
  readonly quantity: number
}
export const toastAtom = Atom.make<Toast | undefined>(undefined)

// ---------------------------------------------------------------------------
// Server data
// ---------------------------------------------------------------------------

export const categoriesAtom = StoreClient.query("catalog", "categories", { timeToLive: "10 minutes" })
export const roomsAtom = StoreClient.query("catalog", "rooms", { timeToLive: "10 minutes" })

export interface ProductQuery {
  readonly category?: CategoryId | undefined
  readonly room?: RoomId | undefined
  readonly q?: string | undefined
  readonly sort?: ProductSort | undefined
}

// Keyed by a string so identical queries always share one atom (and cache).
const productsFamily = Atom.family((key: string) =>
  StoreClient.query("catalog", "products", { query: JSON.parse(key) as ProductQuery, timeToLive: "2 minutes" })
)
export const productsAtom = (query: ProductQuery) =>
  productsFamily(
    JSON.stringify({ category: query.category, room: query.room, q: query.q || undefined, sort: query.sort })
  )

const productFamily = Atom.family((id: string) =>
  StoreClient.query("catalog", "product", { params: { id: ProductId.make(id) }, timeToLive: "2 minutes" })
)
export const productAtom = (id: string) => productFamily(id)

/** Server-side pricing of the bag. Re-runs whenever the bag or delivery method changes. */
export const quoteAtom = StoreClient.runtime.atom((get) =>
  Effect.gen(function*() {
    const lines = get(cartAtom)
    const delivery = get(deliveryAtom)
    const client = yield* StoreClient
    return yield* client.checkout.quote({
      payload: new QuoteRequest({ lines: lines.map((line) => new CartLine(line)), delivery })
    })
  })
)

export const placeOrderAtom = StoreClient.mutation("checkout", "placeOrder")
