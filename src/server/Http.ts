import { Effect, Layer } from "effect"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { StoreApi } from "../shared/Api.ts"
import { Catalog } from "./Catalog.ts"
import { Orders } from "./Orders.ts"

const SystemHandlers = HttpApiBuilder.group(
  StoreApi,
  "system",
  Effect.fn(function*(handlers) {
    return handlers.handleAll({
      health: () => Effect.succeed({ status: "ok" as const, service: "kinetik-store" })
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

/** Domain services shared by every handler (a single Catalog instance). */
export const ServicesLive = Orders.layer.pipe(Layer.provideMerge(Catalog.layer))

/** All endpoint handlers with their services, ready to serve or test. */
export const HandlersLive = Layer.mergeAll(SystemHandlers, CatalogHandlers, CheckoutHandlers).pipe(
  Layer.provide(ServicesLive)
)

/** Every HTTP route of the API, plus OpenAPI JSON and interactive docs at /api/docs. */
export const ApiRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(StoreApi, { openapiPath: "/api/openapi.json" }).pipe(Layer.provide(HandlersLive)),
  HttpApiScalar.layer(StoreApi, { path: "/api/docs" })
)
