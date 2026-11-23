import { Context, DateTime, Effect, Layer, Random, Ref } from "effect"
import type {
  CartLine,
  DeliveryMethod,
  OrderId as OrderIdType,
  PlaceOrderRequest,
  ProductId as ProductIdType,
  QuoteRequest
} from "../shared/Domain.ts"
import {
  InvalidColor,
  InvalidSize,
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
export interface PricingOptions {
  /** Signed-in members get free standard delivery. */
  readonly member?: boolean | undefined
}

export interface PlaceOptions {
  /** The Auth0 user id (`sub`): a member, or a guest's `anon@...` id. */
  readonly customerId?: string | undefined
  /** Members get member pricing; guests with an anonymous session do not. */
  readonly member?: boolean | undefined
}

export class Orders extends Context.Service<Orders, {
  quote(request: QuoteRequest, options?: PricingOptions): Effect.Effect<Quote, ProductNotFound | InvalidColor | InvalidSize>
  place(
    request: PlaceOrderRequest,
    options?: PlaceOptions
  ): Effect.Effect<Order, ProductNotFound | InvalidColor | InvalidSize | OutOfStock>
  get(id: OrderIdType): Effect.Effect<Order, OrderNotFound>
  listFor(customerId: string): Effect.Effect<ReadonlyArray<Order>>
  /** Moves a guest's orders to a member; returns how many moved. */
  transfer(fromCustomerId: string, toCustomerId: string): Effect.Effect<number>
}>()("kinetik/server/Orders") {
  static readonly layer = Layer.effect(
    Orders,
    Effect.gen(function*() {
      const catalog = yield* Catalog
      const orders = yield* Ref.make(new Map<string, Order>())

      // Merge duplicate product/colour/size lines so quantities add up.
      const mergeLines = (lines: ReadonlyArray<CartLine>) => {
        const merged = new Map<string, { productId: string; colorId: string; size: string; quantity: number }>()
        for (const line of lines) {
          const key = `${line.productId}:${line.colorId}:${line.size}`
          const existing = merged.get(key)
          merged.set(key, {
            productId: line.productId,
            colorId: line.colorId,
            size: line.size,
            quantity: Math.min(10, (existing?.quantity ?? 0) + line.quantity)
          })
        }
        return [...merged.values()]
      }

      const priceBag = Effect.fn("Orders.priceBag")(function*(
        lines: ReadonlyArray<CartLine>,
        delivery: DeliveryMethod,
        member: boolean
      ) {
        const quoteLines = yield* Effect.forEach(mergeLines(lines), (line) =>
          Effect.gen(function*() {
            const product = yield* catalog.get(line.productId)
            const color = product.colors.find((option) => option.id === line.colorId)
            if (color === undefined) {
              return yield* new InvalidColor({ productId: line.productId, colorId: line.colorId })
            }
            if (!product.sizes.includes(line.size) || product.unavailableSizes.includes(line.size)) {
              return yield* new InvalidSize({ productId: line.productId, name: product.name, size: line.size })
            }
            return new QuoteLine({
              product,
              color,
              size: line.size,
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
        const fee = deliveryFee(delivery, subtotal, member)
        return new Quote({
          lines: quoteLines,
          itemCount: quoteLines.reduce((sum, line) => sum + line.quantity, 0),
          subtotal,
          savings,
          delivery,
          deliveryFee: fee,
          freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
          total: subtotal + fee,
          member
        })
      })

      const quote = Effect.fn("Orders.quote")((request: QuoteRequest, options?: PricingOptions) =>
        priceBag(request.lines, request.delivery, options?.member ?? false)
      )

      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      const makeOrderId = Effect.gen(function*() {
        let suffix = ""
        for (let i = 0; i < 8; i++) {
          suffix += alphabet[yield* Random.nextIntBetween(0, alphabet.length - 1)]
        }
        return OrderId.make(`KT-${suffix}`)
      })

      const place = Effect.fn("Orders.place")(function*(request: PlaceOrderRequest, options?: PlaceOptions) {
        const customerId = options?.customerId
        const priced = yield* priceBag(request.lines, request.delivery, options?.member ?? false)
        // Reserve stock per product (sizes share one stock level in this demo).
        const perProduct = new Map<string, number>()
        for (const line of priced.lines) {
          perProduct.set(line.product.id, (perProduct.get(line.product.id) ?? 0) + line.quantity)
        }
        yield* catalog.reserve(
          [...perProduct].map(([productId, quantity]) => ({ productId: productId as ProductIdType, quantity }))
        )

        const now = yield* DateTime.now
        const eta = DateTime.add(now, { days: deliveryDays(request.delivery) })
        const order = new Order({
          id: yield* makeOrderId,
          ...(customerId ? { customerId } : {}),
          status: "confirmed",
          placedAt: DateTime.formatIso(now),
          estimatedDelivery: DateTime.formatIso(eta),
          contact: request.contact,
          address: request.address,
          quote: priced
        })
        yield* Ref.update(orders, (map) => new Map(map).set(order.id, order))
        yield* Effect.logInfo("Order placed", {
          orderId: order.id,
          total: priced.total,
          items: priced.itemCount,
          customer: customerId ?? "guest",
          member: options?.member ?? false
        })
        return order
      })

      const get = Effect.fn("Orders.get")(function*(id: OrderIdType) {
        const order = (yield* Ref.get(orders)).get(id)
        if (order === undefined) {
          return yield* new OrderNotFound({ orderId: id })
        }
        return order
      })

      const listFor = Effect.fn("Orders.listFor")(function*(customerId: string) {
        const all = yield* Ref.get(orders)
        return [...all.values()]
          .filter((order) => order.customerId === customerId)
          .toSorted((a, b) => b.placedAt.localeCompare(a.placedAt))
      })

      const transfer = Effect.fn("Orders.transfer")(function*(fromCustomerId: string, toCustomerId: string) {
        const moved = yield* Ref.modify(orders, (map) => {
          const next = new Map(map)
          let count = 0
          for (const [id, order] of map) {
            if (order.customerId === fromCustomerId) {
              next.set(id, new Order({ ...order, customerId: toCustomerId }))
              count++
            }
          }
          return [count, next] as const
        })
        if (moved > 0) yield* Effect.logInfo("Guest orders transferred", { from: fromCustomerId, to: toCustomerId, moved })
        return moved
      })

      return Orders.of({ quote, place, get, listFor, transfer })
    })
  )
}
