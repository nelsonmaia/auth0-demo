import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import { Authorization, Forbidden, Member } from "./Auth.ts"
import {
  CategoryId,
  Gender,
  InvalidColor,
  InvalidSize,
  Order,
  OrderId,
  OrderNotFound,
  OutOfStock,
  PlaceOrderRequest,
  Product,
  ProductId,
  ProductNotFound,
  ProductSort,
  Quote,
  QuoteRequest,
  Sport,
  SportId
} from "./Domain.ts"

// The API definition is shared by the server (which implements it) and the
// browser (which derives a fully typed client from it). Nothing in this file
// may import server code.

export class SystemApi extends HttpApiGroup.make("system", { topLevel: true }).add(
  HttpApiEndpoint.get("health", "/health", {
    success: Schema.Struct({ status: Schema.Literal("ok"), service: Schema.String })
  })
) {}

export class CatalogApi extends HttpApiGroup.make("catalog")
  .add(
    HttpApiEndpoint.get("sports", "/sports", {
      success: Schema.Array(Sport)
    }),
    HttpApiEndpoint.get("products", "/products", {
      query: {
        category: Schema.optional(CategoryId),
        gender: Schema.optional(Gender),
        sport: Schema.optional(SportId),
        q: Schema.optional(Schema.String),
        sort: Schema.optional(ProductSort)
      },
      success: Schema.Array(Product)
    }),
    HttpApiEndpoint.get("product", "/products/:id", {
      params: { id: ProductId },
      success: Product,
      error: ProductNotFound
    })
  )
  .annotateMerge(OpenApi.annotations({ title: "Catalog", description: "Browse shoes, clothing and accessories" }))
{}

export class CheckoutApi extends HttpApiGroup.make("checkout")
  .add(
    HttpApiEndpoint.post("quote", "/cart/quote", {
      payload: QuoteRequest,
      success: Quote,
      error: [ProductNotFound, InvalidColor, InvalidSize]
    }),
    HttpApiEndpoint.post("placeOrder", "/orders", {
      payload: PlaceOrderRequest,
      success: Order,
      error: [ProductNotFound, InvalidColor, InvalidSize, OutOfStock]
    }),
    HttpApiEndpoint.get("order", "/orders/:id", {
      params: { id: OrderId },
      success: Order,
      error: OrderNotFound
    })
  )
  .annotateMerge(OpenApi.annotations({ title: "Checkout", description: "Price the bag and place orders" }))
{}

/**
 * Member-only endpoints. Every request needs a valid Auth0 access token for
 * this API; placing and reading orders also need the matching scope.
 */
export class AccountApi extends HttpApiGroup.make("account")
  .add(
    HttpApiEndpoint.get("me", "/me", {
      success: Member
    }),
    HttpApiEndpoint.post("quote", "/me/cart/quote", {
      payload: QuoteRequest,
      success: Quote,
      error: [ProductNotFound, InvalidColor, InvalidSize]
    }),
    HttpApiEndpoint.post("placeOrder", "/me/orders", {
      payload: PlaceOrderRequest,
      success: Order,
      error: [ProductNotFound, InvalidColor, InvalidSize, OutOfStock, Forbidden]
    }),
    HttpApiEndpoint.get("orders", "/me/orders", {
      success: Schema.Array(Order),
      error: Forbidden
    })
  )
  .middleware(Authorization)
  .annotateMerge(OpenApi.annotations({ title: "Account", description: "Member pricing, checkout and order history (Auth0)" }))
{}

export class StoreApi extends HttpApi.make("store-api")
  .add(SystemApi)
  .add(CatalogApi)
  .add(CheckoutApi)
  .add(AccountApi)
  .prefix("/api")
  .annotateMerge(OpenApi.annotations({ title: "KINETIK Store API" }))
{}
