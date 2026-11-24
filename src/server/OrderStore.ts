import { del, get, list, put } from "@vercel/blob"
import { Context, Effect, Layer, Ref, Schema } from "effect"
import { Order } from "../shared/Domain.ts"

/**
 * Where orders are kept.
 *
 * - `memory`: one Map per server process. Used locally and in tests.
 * - `blob`: a private Vercel Blob store, shared by every serverless instance.
 *   On Vercel each request can land on a different instance, so in-memory
 *   orders made a member's guest orders "disappear" until a refresh happened
 *   to hit the instance that had them.
 *
 * `OrderStore.layer` picks Blob when `BLOB_READ_WRITE_TOKEN` is set (Vercel
 * adds it when the store is connected to the project), otherwise memory.
 */
export class OrderStore extends Context.Service<OrderStore, {
  save(order: Order): Effect.Effect<void>
  get(id: string): Effect.Effect<Order | undefined>
  listFor(customerId: string): Effect.Effect<ReadonlyArray<Order>>
  /** Moves every order of one customer to another; returns how many moved. */
  transfer(fromCustomerId: string, toCustomerId: string): Effect.Effect<number>
}>()("kinetik/server/OrderStore") {
  static readonly memory = Layer.effect(
    OrderStore,
    Effect.gen(function*() {
      const orders = yield* Ref.make(new Map<string, Order>())
      return OrderStore.of({
        save: (order) => Ref.update(orders, (map) => new Map(map).set(order.id, order)),
        get: (id) => Ref.get(orders).pipe(Effect.map((map) => map.get(id))),
        listFor: (customerId) =>
          Ref.get(orders).pipe(Effect.map((map) => sortNewest([...map.values()].filter((o) => o.customerId === customerId)))),
        transfer: (from, to) =>
          Ref.modify(orders, (map) => {
            const next = new Map(map)
            let count = 0
            for (const [id, order] of map) {
              if (order.customerId === from) {
                next.set(id, new Order({ ...order, customerId: to }))
                count++
              }
            }
            return [count, next] as const
          })
      })
    })
  )

  static readonly blob = Layer.succeed(OrderStore, OrderStore.of(blobStore()))

  static readonly layer = process.env.BLOB_READ_WRITE_TOKEN ? OrderStore.blob : OrderStore.memory
}

const sortNewest = (orders: ReadonlyArray<Order>) => orders.toSorted((a, b) => b.placedAt.localeCompare(a.placedAt))

const encode = Schema.encodeSync(Order)
const decode = Schema.decodeSync(Order)

// Layout: orders/<id>.json holds the order; customers/<customer>/<id> is an
// index entry so a customer's orders can be listed by prefix.
const orderPath = (id: string) => `orders/${id}.json`
const customerPrefix = (customerId: string) => `customers/${encodeURIComponent(customerId)}/`

function blobStore() {
  const options = { access: "private" as const, addRandomSuffix: false, allowOverwrite: true }

  const writeOrder = (order: Order) =>
    Effect.tryPromise(async () => {
      await put(orderPath(order.id), JSON.stringify(encode(order)), { ...options, contentType: "application/json" })
      if (order.customerId) await put(customerPrefix(order.customerId) + order.id, order.id, { ...options, contentType: "text/plain" })
    }).pipe(Effect.orDie)

  const readOrder = (id: string) =>
    Effect.tryPromise(async () => {
      // useCache: false reads the latest copy (orders change on transfer).
      const result = await get(orderPath(id), { access: "private", useCache: false })
      if (!result || result.statusCode !== 200) return undefined
      const json = await new Response(result.stream).json()
      return decode(json as typeof Order.Encoded)
    }).pipe(Effect.orDie)

  const idsFor = (customerId: string) =>
    Effect.tryPromise(async () => {
      const prefix = customerPrefix(customerId)
      const ids: string[] = []
      let cursor: string | undefined
      do {
        const page = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) })
        for (const blob of page.blobs) ids.push(blob.pathname.slice(prefix.length))
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      return ids
    }).pipe(Effect.orDie)

  return {
    save: writeOrder,
    get: readOrder,
    listFor: (customerId: string) =>
      idsFor(customerId).pipe(
        Effect.flatMap((ids) => Effect.forEach(ids, readOrder, { concurrency: 8 })),
        Effect.map((orders) => sortNewest(orders.filter((o): o is Order => o !== undefined && o.customerId === customerId)))
      ),
    transfer: (from: string, to: string) =>
      Effect.gen(function*() {
        const ids = yield* idsFor(from)
        let moved = 0
        for (const id of ids) {
          const order = yield* readOrder(id)
          if (order && order.customerId === from) {
            // Write the new owner first, then drop the old index entry, so a
            // concurrent request never sees the order belong to nobody.
            yield* writeOrder(new Order({ ...order, customerId: to }))
            moved++
          }
          yield* Effect.tryPromise(() => del(customerPrefix(from) + id)).pipe(Effect.orDie)
        }
        return moved
      })
  }
}
