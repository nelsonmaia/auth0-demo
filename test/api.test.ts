import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { HandlersLive } from "../src/server/Http.ts"
import { StoreApi } from "../src/shared/Api.ts"
import { Address, CartLine, Contact, PlaceOrderRequest, ProductId, QuoteRequest } from "../src/shared/Domain.ts"

const makeClient = HttpApiTest.groups(StoreApi, ["system", "catalog", "checkout"])

const line = (productId: string, colorId: string, quantity: number) =>
  new CartLine({ productId: ProductId.make(productId), colorId, quantity })

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
      const sofas = yield* client.catalog.products({ query: { category: "sofas", sort: "price-asc" } })
      assert.deepStrictEqual(sofas.map((p) => p.name), ["MJUKSTA", "SOLVIK"])

      const lamps = yield* client.catalog.products({ query: { q: "lamp" } })
      assert.isTrue(lamps.length >= 3 && lamps.every((p) => p.category === "lighting"))

      // Diacritics are ignored, so "fjarda" finds "FJÄRDA".
      const accent = yield* client.catalog.products({ query: { q: "fjarda" } })
      assert.deepStrictEqual(accent.map((p) => p.name), ["FJÄRDA"])
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
          lines: [line("kuddsta-cushion", "mustard", 2), line("kuddsta-cushion", "mustard", 1)],
          delivery: "standard"
        })
      })
      assert.strictEqual(quote.lines.length, 1)
      assert.strictEqual(quote.itemCount, 3)
      assert.strictEqual(quote.subtotal, 2997)
      assert.strictEqual(quote.deliveryFee, 2900)
      assert.strictEqual(quote.total, 5897)
    }))

  it.effect("gives free standard delivery over the threshold and reports savings", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const quote = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("solvik-3-seat-sofa", "sage", 1)], delivery: "standard" })
      })
      assert.strictEqual(quote.deliveryFee, 0)
      assert.strictEqual(quote.savings, 15000)
    }))

  it.effect("rejects an unknown colour", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const error = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("solvik-3-seat-sofa", "purple", 1)], delivery: "pickup" })
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "InvalidColor")
    }))

  it.effect("places orders, reserves stock and refuses to oversell", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const order = yield* client.checkout.placeOrder({ payload: orderFor([line("soldack-sun-lounger", "stripe", 4)]) })
      assert.match(order.id, /^NH-[A-Z0-9]{8}$/)
      assert.strictEqual(order.quote.total, 4 * 19900)

      const fetched = yield* client.checkout.order({ params: { id: order.id } })
      assert.strictEqual(fetched.id, order.id)

      const product = yield* client.catalog.product({ params: { id: ProductId.make("soldack-sun-lounger") } })
      assert.strictEqual(product.stock, 2)

      const error = yield* client.checkout.placeOrder({ payload: orderFor([line("soldack-sun-lounger", "stripe", 3)]) }).pipe(
        Effect.flip
      )
      assert.strictEqual(error._tag, "OutOfStock")
    }))
})
