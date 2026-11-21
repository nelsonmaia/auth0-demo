import { Context, DateTime, Effect, Layer, Random, Ref } from "effect"
import type { CartLine, DeliveryMethod, OrderId as OrderIdType, PlaceOrderRequest, QuoteRequest } from "../shared/Domain.ts"
import {
  InvalidColor,
  Order,
  OrderId,
  OrderNotFound,
  type OutOfStock,
  type ProductNotFound,
  Quote,
  QuoteLine
} from "../shared/Domain.ts"
import { deliveryDays, deliveryFee, FREE_DELIVERY_THRESHOLD } from "../shared/Pricing.ts"
import { Catalog } from "./Catalog.ts"

/**
 * Prices bags and places orders. Prices always come from the catalog, never
 * from the client, so a tampered request cannot change what the shopper pays.
 */
export class Orders extends Context.Service<Orders, {
  quote(request: QuoteRequest): Effect.Effect<Quote, ProductNotFound | InvalidColor>
  place(request: PlaceOrderRequest): Effect.Effect<Order, ProductNotFound | InvalidColor | OutOfStock>
  get(id: OrderIdType): Effect.Effect<Order, OrderNotFound>
}>()("nordhem/server/Orders") {
  static readonly layer = Layer.effect(
    Orders,
    Effect.gen(function*() {
      const catalog = yield* Catalog
      const orders = yield* Ref.make(new Map<string, Order>())

      // Merge duplicate product/colour lines so quantities add up.
      const mergeLines = (lines: ReadonlyArray<CartLine>) => {
        const merged = new Map<string, { productId: string; colorId: string; quantity: number }>()
        for (const line of lines) {
          const key = `${line.productId}:${line.colorId}`
          const existing = merged.get(key)
          merged.set(key, {
            productId: line.productId,
            colorId: line.colorId,
            quantity: Math.min(99, (existing?.quantity ?? 0) + line.quantity)
          })
        }
        return [...merged.values()]
      }

      const priceBag = Effect.fn("Orders.priceBag")(function*(lines: ReadonlyArray<CartLine>, delivery: DeliveryMethod) {
        const quoteLines = yield* Effect.forEach(mergeLines(lines), (line) =>
          Effect.gen(function*() {
            const product = yield* catalog.get(line.productId)
            const color = product.colors.find((option) => option.id === line.colorId)
            if (color === undefined) {
              return yield* new InvalidColor({ productId: line.productId, colorId: line.colorId })
            }
            return new QuoteLine({
              product,
              color,
              quantity: line.quantity,
              unitPrice: product.price,
              lineTotal: product.price * line.quantity,
              available: product.stock
            })
          }))

        const subtotal = quoteLines.reduce((sum, line) => sum + line.lineTotal, 0)
        const savings = quoteLines.reduce(
          (sum, line) => sum + Math.max(0, (line.product.previousPrice ?? line.unitPrice) - line.unitPrice) * line.quantity,
          0
        )
        const fee = deliveryFee(delivery, subtotal)
        return new Quote({
          lines: quoteLines,
          itemCount: quoteLines.reduce((sum, line) => sum + line.quantity, 0),
          subtotal,
          savings,
          delivery,
          deliveryFee: fee,
          freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
          total: subtotal + fee
        })
      })

      const quote = Effect.fn("Orders.quote")((request: QuoteRequest) => priceBag(request.lines, request.delivery))

      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      const makeOrderId = Effect.gen(function*() {
        let suffix = ""
        for (let i = 0; i < 8; i++) {
          suffix += alphabet[yield* Random.nextIntBetween(0, alphabet.length - 1)]
        }
        return OrderId.make(`NH-${suffix}`)
      })

      const place = Effect.fn("Orders.place")(function*(request: PlaceOrderRequest) {
        const priced = yield* priceBag(request.lines, request.delivery)
        yield* catalog.reserve(priced.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })))

        const now = yield* DateTime.now
        const eta = DateTime.add(now, { days: deliveryDays(request.delivery) })
        const order = new Order({
          id: yield* makeOrderId,
          status: "confirmed",
          placedAt: DateTime.formatIso(now),
          estimatedDelivery: DateTime.formatIso(eta),
          contact: request.contact,
          address: request.address,
          quote: priced
        })
        yield* Ref.update(orders, (map) => new Map(map).set(order.id, order))
        yield* Effect.logInfo("Order placed", { orderId: order.id, total: priced.total, items: priced.itemCount })
        return order
      })

      const get = Effect.fn("Orders.get")(function*(id: OrderIdType) {
        const order = (yield* Ref.get(orders)).get(id)
        if (order === undefined) {
          return yield* new OrderNotFound({ orderId: id })
        }
        return order
      })

      return Orders.of({ quote, place, get })
    })
  )
}
