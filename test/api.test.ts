import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { HandlersLive } from "../src/server/Http.ts"
import { StoreApi } from "../src/shared/Api.ts"
import { Address, CartLine, Contact, PlaceOrderRequest, ProductId, QuoteRequest } from "../src/shared/Domain.ts"

const makeClient = HttpApiTest.groups(StoreApi, ["system", "catalog", "checkout"])

const line = (productId: string, colorId: string, size: string, quantity: number) =>
  new CartLine({ productId: ProductId.make(productId), colorId, size, quantity })

const orderFor = (lines: ReadonlyArray<CartLine>) =>
  new PlaceOrderRequest({
    lines: lines as PlaceOrderRequest["lines"],
    delivery: "standard",
    contact: new Contact({ fullName: "Alex Andersson", email: "alex@example.com" }),
    address: new Address({ line1: "12 Birch Lane", city: "Portland", postalCode: "97201", country: "United States" })
  })

layer(Layer.mergeAll(HandlersLive, HttpServer.layerServices))("StoreApi", (it) => {
  it.effect("filters, searches and sorts products", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const running = yield* client.catalog.products({
        query: { gender: "men", category: "shoes", sport: "running", sort: "price-asc" }
      })
      assert.deepStrictEqual(running.map((p) => p.id), ["glide-daily-mens", "tempo-runner-3-mens", "vector-elite"])

      const hoodies = yield* client.catalog.products({ query: { q: "hoodie" } })
      assert.isTrue(hoodies.length === 2 && hoodies.every((p) => p.art === "hoodie"))

      // Search also matches colour families, e.g. "pink trainer".
      const pink = yield* client.catalog.products({ query: { q: "pink workout" } })
      assert.deepStrictEqual(pink.map((p) => p.id), ["flux-trainer-2-womens"])
    }))

  it.effect("returns ProductNotFound for an unknown product", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const error = yield* client.catalog.product({ params: { id: ProductId.make("nope") } }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ProductNotFound")
    }))

  it.effect("prices the bag on the server and merges duplicate lines", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const quote = yield* client.checkout.quote({
        payload: new QuoteRequest({
          lines: [
            line("everyday-crew-socks", "white", "M", 1),
            line("everyday-crew-socks", "white", "M", 1),
            line("everyday-crew-socks", "white", "L", 1)
          ],
          delivery: "standard"
        })
      })
      assert.strictEqual(quote.lines.length, 2)
      assert.strictEqual(quote.itemCount, 3)
      assert.strictEqual(quote.subtotal, 6000)
      assert.strictEqual(quote.deliveryFee, 0)

      const small = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("club-cap", "black", "One Size", 1)], delivery: "standard" })
      })
      assert.strictEqual(small.deliveryFee, 800)
      assert.strictEqual(small.total, 3600)
    }))

  it.effect("gives free standard delivery over the threshold and reports savings", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const quote = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("glide-daily-mens", "navy", "10", 2)], delivery: "express" })
      })
      assert.strictEqual(quote.deliveryFee, 2000)
      assert.strictEqual(quote.savings, 2 * (11000 - 8997))
    }))

  it.effect("rejects unknown colours and unavailable sizes", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const color = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("halo-low-84-mens", "purple", "10", 1)], delivery: "pickup" })
      }).pipe(Effect.flip)
      assert.strictEqual(color._tag, "InvalidColor")

      const soldOut = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("halo-low-84-mens", "panda", "9", 1)], delivery: "pickup" })
      }).pipe(Effect.flip)
      assert.strictEqual(soldOut._tag, "InvalidSize")

      const missing = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("halo-low-84-mens", "panda", "XL", 1)], delivery: "pickup" })
      }).pipe(Effect.flip)
      assert.strictEqual(missing._tag, "InvalidSize")
    }))

  it.effect("places orders, reserves stock and refuses to oversell", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      // The duffel has 8 in stock; two sizes of the same product share it.
      const order = yield* client.checkout.placeOrder({
        payload: orderFor([line("utility-duffel", "black", "One Size", 4), line("utility-duffel", "olive", "One Size", 2)])
      })
      assert.match(order.id, /^KT-[A-Z0-9]{8}$/)
      assert.strictEqual(order.quote.total, 6 * 5500)

      const fetched = yield* client.checkout.order({ params: { id: order.id } })
      assert.strictEqual(fetched.id, order.id)

      const product = yield* client.catalog.product({ params: { id: ProductId.make("utility-duffel") } })
      assert.strictEqual(product.stock, 2)

      const error = yield* client.checkout.placeOrder({
        payload: orderFor([line("utility-duffel", "black", "One Size", 3)])
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OutOfStock")
    }))
})
