import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import {
  Category,
  CategoryId,
  InvalidColor,
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
  Room,
  RoomId
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
    HttpApiEndpoint.get("categories", "/categories", {
      success: Schema.Array(Category)
    }),
    HttpApiEndpoint.get("rooms", "/rooms", {
      success: Schema.Array(Room)
    }),
    HttpApiEndpoint.get("products", "/products", {
      query: {
        category: Schema.optional(CategoryId),
        room: Schema.optional(RoomId),
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
  .annotateMerge(OpenApi.annotations({ title: "Catalog", description: "Browse products, categories and rooms" }))
{}

export class CheckoutApi extends HttpApiGroup.make("checkout")
  .add(
    HttpApiEndpoint.post("quote", "/cart/quote", {
      payload: QuoteRequest,
      success: Quote,
      error: [ProductNotFound, InvalidColor]
    }),
    HttpApiEndpoint.post("placeOrder", "/orders", {
      payload: PlaceOrderRequest,
      success: Order,
      error: [ProductNotFound, InvalidColor, OutOfStock]
    }),
    HttpApiEndpoint.get("order", "/orders/:id", {
      params: { id: OrderId },
      success: Order,
      error: OrderNotFound
    })
  )
  .annotateMerge(OpenApi.annotations({ title: "Checkout", description: "Price the bag and place orders" }))
{}

export class StoreApi extends HttpApi.make("store-api")
  .add(SystemApi)
  .add(CatalogApi)
  .add(CheckoutApi)
  .prefix("/api")
  .annotateMerge(OpenApi.annotations({ title: "Nordhem Store API" }))
{}
