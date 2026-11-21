import { Context, Effect, Layer, SynchronizedRef } from "effect"
import type { CategoryId, ProductSort, RoomId } from "../shared/Domain.ts"
import { Category, OutOfStock, Product, ProductId, ProductNotFound, Room } from "../shared/Domain.ts"
import * as Data from "./CatalogData.ts"

export interface ProductFilter {
  readonly category?: CategoryId | undefined
  readonly room?: RoomId | undefined
  readonly q?: string | undefined
  readonly sort?: ProductSort | undefined
}

export interface StockReservation {
  readonly productId: ProductId
  readonly quantity: number
}

/**
 * The product catalog. Products are seeded in memory and stock levels are kept
 * in a `SynchronizedRef`, so concurrent checkouts can never oversell.
 *
 * Swap `Catalog.layer` for a database-backed layer later without touching any
 * HTTP handler.
 */
export class Catalog extends Context.Service<Catalog, {
  readonly categories: Effect.Effect<ReadonlyArray<Category>>
  readonly rooms: Effect.Effect<ReadonlyArray<Room>>
  list(filter: ProductFilter): Effect.Effect<ReadonlyArray<Product>>
  get(id: string): Effect.Effect<Product, ProductNotFound>
  reserve(items: ReadonlyArray<StockReservation>): Effect.Effect<void, OutOfStock>
}>()("nordhem/server/Catalog") {
  static readonly layer = Layer.effect(
    Catalog,
    Effect.gen(function*() {
      const byId = new Map(Data.products.map((product) => [product.id as string, product]))
      const stock = yield* SynchronizedRef.make(
        new Map<string, number>(Data.products.map((product) => [product.id, product.stock]))
      )

      const withStock = (product: Product, levels: ReadonlyMap<string, number>) =>
        new Product({ ...product, stock: levels.get(product.id) ?? 0 })

      const normalize = (value: string) =>
        value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

      const matches = (product: Product, query: string) => {
        const haystack = normalize(
          [product.name, product.type, product.description, product.category, ...product.colors.map((c) => c.name)]
            .join(" ")
        )
        return normalize(query).split(/\s+/).every((term) => haystack.includes(term))
      }

      const sorters: Record<ProductSort, (a: Product, b: Product) => number> = {
        popular: (a, b) => b.popularity - a.popularity,
        "price-asc": (a, b) => a.price - b.price,
        "price-desc": (a, b) => b.price - a.price,
        newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
        rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
      }

      const list = Effect.fn("Catalog.list")(function*(filter: ProductFilter) {
        yield* Effect.annotateCurrentSpan({ ...filter })
        const levels = yield* SynchronizedRef.get(stock)
        return Data.products
          .filter((product) => filter.category === undefined || product.category === filter.category)
          .filter((product) => filter.room === undefined || product.rooms.includes(filter.room))
          .filter((product) => filter.q === undefined || filter.q.trim() === "" || matches(product, filter.q))
          .toSorted(sorters[filter.sort ?? "popular"])
          .map((product) => withStock(product, levels))
      })

      const get = Effect.fn("Catalog.get")(function*(id: string) {
        const product = byId.get(id)
        if (product === undefined) {
          return yield* new ProductNotFound({ productId: id })
        }
        const levels = yield* SynchronizedRef.get(stock)
        return withStock(product, levels)
      })

      const reserve = Effect.fn("Catalog.reserve")((items: ReadonlyArray<StockReservation>) =>
        SynchronizedRef.modifyEffect(stock, (levels) =>
          Effect.gen(function*() {
            const next = new Map(levels)
            for (const item of items) {
              const available = next.get(item.productId) ?? 0
              if (available < item.quantity) {
                return yield* new OutOfStock({
                  productId: item.productId,
                  name: byId.get(item.productId)?.name ?? item.productId,
                  requested: item.quantity,
                  available
                })
              }
              next.set(item.productId, available - item.quantity)
            }
            return [undefined, next] as const
          })
        )
      )

      return Catalog.of({
        categories: Effect.succeed(Data.categories),
        rooms: Effect.succeed(Data.rooms),
        list,
        get,
        reserve
      })
    })
  )
}
