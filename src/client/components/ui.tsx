import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Cause } from "effect"
import { AsyncResult } from "effect/reactivity"
import { useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import type { Badge, Product } from "../../shared/Domain.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { formatMoney } from "../format.ts"
import { Bag, cartAtom, favouritesAtom, toastAtom } from "../state.ts"
import { ChevronLeft, ChevronRight, HeartIcon } from "./Icons.tsx"

// ---------------------------------------------------------------------------
// Async results
// ---------------------------------------------------------------------------

/** Renders an `AsyncResult` from an atom: loading, failure or success. */
export function AsyncView<A, E>({
  result,
  loading,
  failure,
  children
}: {
  result: AsyncResult.AsyncResult<A, E>
  loading?: ReactNode
  failure?: (error: E | undefined) => ReactNode
  children: (value: A, waiting: boolean) => ReactNode
}) {
  return AsyncResult.match(result, {
    onInitial: () => loading ?? <Spinner />,
    onFailure: (f) => {
      const error = Cause.findErrorOption(f.cause)
      return failure
        ? failure(error._tag === "Some" ? error.value : undefined)
        : <ErrorState message="Something went wrong while loading. Please try again." />
    },
    onSuccess: (s) => children(s.value, s.waiting)
  })
}

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div className="spinner" role="status" aria-label={label}>
    <span />
  </div>
)

export const ErrorState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="empty-state">
    <p>{message}</p>
    {action}
  </div>
)

// ---------------------------------------------------------------------------
// Price & labels
// ---------------------------------------------------------------------------

export function Price({ product, className = "" }: { product: Pick<Product, "price" | "previousPrice">; className?: string }) {
  const { price, previousPrice } = product
  if (previousPrice === undefined || previousPrice <= price) {
    return <div className={`price ${className}`}><span className="price-now">{formatMoney(price)}</span></div>
  }
  const off = Math.round((1 - price / previousPrice) * 100)
  return (
    <div className={`price ${className}`}>
      <span className="price-now is-sale">{formatMoney(price)}</span>
      <s className="price-was">{formatMoney(previousPrice)}</s>
      <span className="price-off">{off}% off</span>
    </div>
  )
}

const badgeLabels: Record<Badge, string> = {
  "just-in": "Just In",
  bestseller: "Bestseller",
  sustainable: "Sustainable Materials",
  limited: "Limited Edition"
}

export const productLabel = (product: Product): string | undefined =>
  product.stock <= 0 ? "Sold Out" : product.badge ? badgeLabels[product.badge] : product.previousPrice ? "Sale" : undefined

export const colourCount = (product: Product) =>
  `${product.colors.length} Colour${product.colors.length === 1 ? "" : "s"}`

// ---------------------------------------------------------------------------
// Bag & favourites
// ---------------------------------------------------------------------------

export function useAddToBag() {
  const setCart = useAtomSet(cartAtom)
  const setToast = useAtomSet(toastAtom)
  return (product: Product, colorId: string, size: string) => {
    setCart((lines) => Bag.add(lines, { productId: product.id, colorId, size }))
    setToast({ id: Date.now(), product, colorId, size })
  }
}

export function useFavourite(product: Product, colorId: string) {
  const favourites = useAtomValue(favouritesAtom)
  const setFavourites = useAtomSet(favouritesAtom)
  const isFavourite = favourites.some((f) => f.productId === product.id)
  const toggle = () =>
    setFavourites((list) =>
      list.some((f) => f.productId === product.id)
        ? list.filter((f) => f.productId !== product.id)
        : [...list, { productId: product.id, colorId }]
    )
  return [isFavourite, toggle] as const
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------

export function ProductCard({ product, colorId: initialColorId }: { product: Product; colorId?: string }) {
  const [colorId, setColorId] = useState(initialColorId ?? product.colors[0].id)
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0]
  const href = `/product/${product.id}${color.id === product.colors[0].id ? "" : `?color=${color.id}`}`
  const label = productLabel(product)

  return (
    <article className="card">
      <Link to={href} className="card-media" aria-label={`${product.name} ${product.subtitle}`}>
        <ProductArt kind={product.art} paint={color} label={`${product.name} in ${color.name}`} />
      </Link>
      <div className="card-body">
        {product.colors.length > 1 ? (
          <div className="card-swatches" aria-label="Colours">
            {product.colors.map((option) => (
              <button
                type="button"
                key={option.id}
                className={option.id === color.id ? "is-active" : undefined}
                onMouseEnter={() => setColorId(option.id)}
                onFocus={() => setColorId(option.id)}
                onClick={() => setColorId(option.id)}
                aria-label={option.name}
              >
                <ProductArt kind={product.art} paint={option} />
              </button>
            ))}
          </div>
        ) : null}
        <Link to={href} className="card-info">
          {label ? <span className={`card-label ${label === "Sold Out" ? "is-muted" : ""}`}>{label}</span> : null}
          <span className="card-name">{product.name}</span>
          <span className="card-sub">{product.subtitle}</span>
          <span className="card-sub card-colours">{colourCount(product)}</span>
        </Link>
        <Price product={product} />
      </div>
    </article>
  )
}

export function ProductGrid({ products }: { products: ReadonlyArray<Product> }) {
  return (
    <div className="grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

export function Carousel({
  title,
  link,
  linkLabel = "Shop",
  children,
  className = ""
}: {
  title: string
  link?: string
  linkLabel?: string
  children: ReactNode
  className?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const scroll = (direction: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" })
  }
  return (
    <section className={`carousel ${className}`}>
      <div className="carousel-head container">
        <h2>{title}</h2>
        <div className="carousel-controls">
          {link ? <Link to={link} className="text-link">{linkLabel}</Link> : null}
          <button type="button" className="round-button" aria-label={`Previous ${title}`} onClick={() => scroll(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="round-button" aria-label={`Next ${title}`} onClick={() => scroll(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="carousel-track" ref={track}>
        {children}
      </div>
    </section>
  )
}

export function ProductCarousel({ title, link, products }: { title: string; link?: string; products: ReadonlyArray<Product> }) {
  return (
    <Carousel title={title} link={link}>
      {products.map((product) => (
        <div className="carousel-item" key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </Carousel>
  )
}

export function FavouriteButton({ product, colorId }: { product: Product; colorId: string }) {
  const [isFavourite, toggle] = useFavourite(product, colorId)
  return (
    <button type="button" className="button button-outline button-lg button-block" aria-pressed={isFavourite} onClick={toggle}>
      {isFavourite ? "Favourited" : "Favourite"} <HeartIcon size={22} filled={isFavourite} />
    </button>
  )
}
