import { Effect, Layer } from "effect"
import { HttpServerRequest } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { StoreApi } from "../shared/Api.ts"
import { CurrentMember, Forbidden, isGuest, Scopes } from "../shared/Auth.ts"
import { AuthConfig, AuthorizationLive, TokenVerifier } from "./Auth.ts"
import { Catalog } from "./Catalog.ts"
import { Orders } from "./Orders.ts"
import { OrderStore } from "./OrderStore.ts"

const SystemHandlers = HttpApiBuilder.group(
  StoreApi,
  "system",
  Effect.fn(function*(handlers) {
    return handlers.handleAll({
      health: () => Effect.succeed({ status: "ok" as const, service: "kinetik-store" }),
      geo: () =>
        Effect.gen(function*() {
          const request = yield* HttpServerRequest.HttpServerRequest
          const raw = request.headers["x-vercel-ip-country"]
          const country = typeof raw === "string" && /^[A-Z]{2}$/.test(raw) ? raw : null
          return { country }
        })
    })
  })
)

const CatalogHandlers = HttpApiBuilder.group(
  StoreApi,
  "catalog",
  Effect.fn(function*(handlers) {
    const catalog = yield* Catalog
    return handlers.handleAll({
      sports: () => catalog.sports,
      products: ({ query }) => catalog.list(query),
      product: ({ params }) => catalog.get(params.id)
    })
  })
)

const CheckoutHandlers = HttpApiBuilder.group(
  StoreApi,
  "checkout",
  Effect.fn(function*(handlers) {
    const orders = yield* Orders
    return handlers.handleAll({
      quote: ({ payload }) => orders.quote(payload),
      placeOrder: ({ payload }) => orders.place(payload),
      order: ({ params }) => orders.get(params.id)
    })
  })
)

const AccountHandlers = HttpApiBuilder.group(
  StoreApi,
  "account",
  Effect.fn(function*(handlers) {
    const orders = yield* Orders

    // The Authorization middleware has already verified the token (member or
    // anonymous guest). If a member's token says a guest session was
    // transferred at sign-in, move that guest's orders to the member first.
    const caller = Effect.gen(function*() {
      const member = yield* CurrentMember
      if (!isGuest(member) && member.linkedAnonymousId) {
        yield* orders.transfer(member.linkedAnonymousId, member.sub)
      }
      return member
    })

    const requireScope = (scope: string) =>
      Effect.gen(function*() {
        const member = yield* caller
        if (!member.scopes.includes(scope)) {
          return yield* new Forbidden({ message: `This action needs the ${scope} permission.`, requiredScope: scope })
        }
        return member
      })

    return handlers.handleAll({
      me: () => caller,
      // Member pricing is for signed-in members only, not anonymous guests.
      quote: ({ payload }) =>
        CurrentMember.pipe(Effect.flatMap((member) => orders.quote(payload, { member: !isGuest(member) }))),
      placeOrder: ({ payload }) =>
        requireScope(Scopes.createOrders).pipe(
          Effect.flatMap((member) => orders.place(payload, { customerId: member.sub, member: !isGuest(member) }))
        ),
      orders: () => requireScope(Scopes.readOrders).pipe(Effect.flatMap((member) => orders.listFor(member.sub)))
    })
  })
)

/** Domain services shared by every handler (a single Catalog instance). */
export const ServicesLive = Orders.layer.pipe(Layer.provide(OrderStore.layer), Layer.provideMerge(Catalog.layer))

/** All endpoint handlers with the domain services, but no token verifier. */
export const HandlersNoAuth = Layer.mergeAll(SystemHandlers, CatalogHandlers, CheckoutHandlers, AccountHandlers).pipe(
  Layer.provide(ServicesLive),
  Layer.provideMerge(AuthorizationLive)
)

/** All endpoint handlers, verifying Auth0 access tokens. */
export const HandlersLive = HandlersNoAuth.pipe(
  Layer.provide(TokenVerifier.layer),
  Layer.provide(AuthConfig.layer)
)

/** Every HTTP route of the API, plus OpenAPI JSON and interactive docs at /api/docs. */
export const ApiRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(StoreApi, { openapiPath: "/api/openapi.json" }).pipe(Layer.provide(HandlersLive)),
  HttpApiScalar.layer(StoreApi, { path: "/api/docs" })
)
