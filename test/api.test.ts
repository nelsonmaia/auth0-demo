import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClientRequest, HttpServer } from "effect/http"
import { HttpApiMiddleware, HttpApiTest } from "effect/http-api"
import { TokenVerifier } from "../src/server/Auth.ts"
import { HandlersNoAuth } from "../src/server/Http.ts"
import { StoreApi } from "../src/shared/Api.ts"
import { Authorization, Member } from "../src/shared/Auth.ts"
import { Address, CartLine, Contact, PlaceOrderRequest, ProductId, QuoteRequest } from "../src/shared/Domain.ts"

const makeClient = HttpApiTest.groups(StoreApi, ["system", "catalog", "checkout", "account"])

// Fake tokens stand in for Auth0 access tokens (real ones are verified against
// the tenant's JWKS in production).
const verifier = TokenVerifier.layerTest({
  "token-alex": new Member({ sub: "auth0|alex", scopes: ["read:orders", "create:orders"] }),
  "token-sam": new Member({ sub: "auth0|sam", scopes: ["read:orders", "create:orders"] }),
  "token-readonly": new Member({ sub: "auth0|reader", scopes: ["read:orders"] })
})

/** Client side of the Authorization middleware, sending a given bearer token. */
const as = (token: string | undefined) =>
  HttpApiMiddleware.layerClient(Authorization, ({ next, request }) =>
    next(token ? HttpClientRequest.bearerToken(request, token) : request)
  )
const guest = as(undefined)

/** A typed client that sends the given token (or none) with every request. */
const clientAs = (token: string | undefined) => makeClient.pipe(Effect.provide(as(token)))

const line = (productId: string, colorId: string, size: string, quantity: number) =>
  new CartLine({ productId: ProductId.make(productId), colorId, size, quantity })

const orderFor = (lines: ReadonlyArray<CartLine>) =>
  new PlaceOrderRequest({
    lines: lines as PlaceOrderRequest["lines"],
    delivery: "standard",
    contact: new Contact({ fullName: "Alex Andersson", email: "alex@example.com" }),
    address: new Address({ line1: "12 Birch Lane", city: "Portland", postalCode: "97201", country: "United States" })
  })

layer(Layer.mergeAll(HandlersNoAuth.pipe(Layer.provide(verifier)), HttpServer.layerServices))("StoreApi", (it) => {
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
    }).pipe(Effect.provide(guest)))

  it.effect("returns ProductNotFound for an unknown product", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const error = yield* client.catalog.product({ params: { id: ProductId.make("nope") } }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ProductNotFound")
    }).pipe(Effect.provide(guest)))

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
    }).pipe(Effect.provide(guest)))

  it.effect("gives free standard delivery over the threshold and reports savings", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const quote = yield* client.checkout.quote({
        payload: new QuoteRequest({ lines: [line("glide-daily-mens", "navy", "10", 2)], delivery: "express" })
      })
      assert.strictEqual(quote.deliveryFee, 2000)
      assert.strictEqual(quote.savings, 2 * (11000 - 8997))
    }).pipe(Effect.provide(guest)))

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
    }).pipe(Effect.provide(guest)))

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
    }).pipe(Effect.provide(guest)))

  it.effect("rejects member endpoints without a valid token", () =>
    Effect.gen(function*() {
      const missing = yield* (yield* clientAs(undefined)).account.me().pipe(Effect.flip)
      assert.strictEqual(missing._tag, "Unauthorized")
      const forged = yield* (yield* clientAs("not-a-real-token")).account.orders().pipe(Effect.flip)
      assert.strictEqual(forged._tag, "Unauthorized")
      const me = yield* (yield* clientAs("token-alex")).account.me()
      assert.strictEqual(me.sub, "auth0|alex")
    }))

  it.effect("gives members free standard delivery", () =>
    Effect.gen(function*() {
      const payload = new QuoteRequest({ lines: [line("club-cap", "black", "One Size", 1)], delivery: "standard" })
      const guestQuote = yield* (yield* clientAs(undefined)).checkout.quote({ payload })
      const memberQuote = yield* (yield* clientAs("token-alex")).account.quote({ payload })
      assert.strictEqual(guestQuote.deliveryFee, 800)
      assert.isFalse(guestQuote.member)
      assert.strictEqual(memberQuote.deliveryFee, 0)
      assert.isTrue(memberQuote.member)
    }))

  it.effect("keeps each member's order history separate and checks scopes", () =>
    Effect.gen(function*() {
      const alex = yield* clientAs("token-alex")
      const order = yield* alex.account.placeOrder({ payload: orderFor([line("club-cap", "khaki", "One Size", 1)]) })
      assert.strictEqual(order.customerId, "auth0|alex")
      assert.strictEqual(order.quote.deliveryFee, 0)

      const alexOrders = yield* alex.account.orders()
      assert.isTrue(alexOrders.some((o) => o.id === order.id))
      const samOrders = yield* (yield* clientAs("token-sam")).account.orders()
      assert.isFalse(samOrders.some((o) => o.id === order.id))

      const forbidden = yield* (yield* clientAs("token-readonly")).account
        .placeOrder({ payload: orderFor([line("club-cap", "khaki", "One Size", 1)]) })
        .pipe(Effect.flip)
      assert.strictEqual(forbidden._tag, "Forbidden")
    }))
})
