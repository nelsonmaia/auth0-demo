import { useAtomValue } from "@effect/atom-react"
import { Option, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Link, useParams, useSearchParams } from "react-router"
import { CategoryId, ProductSort, RoomId } from "../../shared/Domain.ts"
import { RoomScene } from "../art/ProductArt.tsx"
import { AsyncView, ErrorState, ProductGrid } from "../components/ui.tsx"
import { plural } from "../format.ts"
import { scenes } from "../scenes.ts"
import { categoriesAtom, productsAtom, roomsAtom } from "../state.ts"

// URL segments are untrusted input, so they are decoded with Schema too.
const decodeCategory = Schema.decodeUnknownOption(CategoryId)
const decodeRoom = Schema.decodeUnknownOption(RoomId)
const decodeSort = Schema.decodeUnknownOption(ProductSort)

const sortLabels: Record<ProductSort, string> = {
  popular: "Most popular",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Customer rating"
}

export function ProductListPage({ mode }: { mode: "all" | "category" | "room" | "search" }) {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const category = mode === "category" ? Option.getOrUndefined(decodeCategory(params.categoryId)) : undefined
  const room = mode === "room" ? Option.getOrUndefined(decodeRoom(params.roomId)) : undefined
  const q = mode === "search" ? searchParams.get("q") ?? "" : undefined
  const sort = Option.getOrUndefined(decodeSort(searchParams.get("sort")))
  const offersOnly = searchParams.get("filter") === "offers"

  const categories = useAtomValue(categoriesAtom)
  const rooms = useAtomValue(roomsAtom)
  const products = useAtomValue(productsAtom({ category, room, q, sort }))

  if ((mode === "category" && !category) || (mode === "room" && !room)) {
    return (
      <div className="container page">
        <ErrorState message="We couldn't find that page." action={<Link className="button button-primary" to="/products">Browse all products</Link>} />
      </div>
    )
  }

  const categoryInfo = AsyncResult.isSuccess(categories) ? categories.value.find((c) => c.id === category) : undefined
  const roomInfo = AsyncResult.isSuccess(rooms) ? rooms.value.find((r) => r.id === room) : undefined

  const title = category
    ? categoryInfo?.name ?? ""
    : room
    ? roomInfo?.name ?? ""
    : mode === "search"
    ? `Results for “${q}”`
    : offersOnly
    ? "Lower price"
    : sort === "newest"
    ? "New in"
    : "All products"

  const setSort = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === "popular") next.delete("sort")
    else next.set("sort", value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="listing">
      {room ? (
        <section className="room-hero">
          <RoomScene {...scenes[room]} label={roomInfo?.name} className="room-hero-art" />
          <div className="container room-hero-text">
            <h1>{roomInfo?.name}</h1>
            <p>{roomInfo?.tagline}</p>
          </div>
        </section>
      ) : null}

      <div className="container page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          {mode === "all" ? <span>Products</span> : <Link to="/products">Products</Link>}
          {mode !== "all" ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{mode === "search" ? "Search" : title}</span>
            </>
          ) : null}
        </nav>

        {room ? null : (
          <header className="listing-head">
            <h1>{title}</h1>
            {categoryInfo ? <p>{categoryInfo.tagline}</p> : null}
          </header>
        )}

        {mode === "room" ? (
          <div className="chip-row" role="list">
            {AsyncResult.isSuccess(rooms)
              ? rooms.value.map((r) => (
                <Link role="listitem" key={r.id} to={`/room/${r.id}`} className={`chip ${r.id === room ? "is-active" : ""}`}>
                  {r.name}
                </Link>
              ))
              : null}
          </div>
        ) : (
          <div className="chip-row" role="list">
            <Link role="listitem" to="/products" className={`chip ${mode === "all" && !offersOnly ? "is-active" : ""}`}>All</Link>
            {AsyncResult.isSuccess(categories)
              ? categories.value.map((c) => (
                <Link role="listitem" key={c.id} to={`/category/${c.id}`} className={`chip ${c.id === category ? "is-active" : ""}`}>
                  {c.name}
                </Link>
              ))
              : null}
          </div>
        )}

        <AsyncView result={products}>
          {(list, waiting) => {
            const visible = offersOnly ? list.filter((p) => p.previousPrice !== undefined) : list
            return (
              <>
                <div className="listing-toolbar">
                  <span className="muted">{plural(visible.length, "product")}</span>
                  <label className="sort">
                    <span>Sort</span>
                    <select value={sort ?? "popular"} onChange={(event) => setSort(event.target.value)}>
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {visible.length === 0 ? (
                  <ErrorState
                    message={mode === "search" ? `No products match “${q}”. Try another word, like “sofa” or “lamp”.` : "No products here yet."}
                    action={<Link className="button button-primary" to="/products">Browse all products</Link>}
                  />
                ) : (
                  <div className={waiting ? "is-waiting" : undefined}>
                    <ProductGrid products={visible} />
                  </div>
                )}
              </>
            )
          }}
        </AsyncView>
      </div>
    </div>
  )
}
