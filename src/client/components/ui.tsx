import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Cause } from "effect"
import { AsyncResult } from "effect/reactivity"
import type { ReactNode } from "react"
import { Link } from "react-router"
import type { Badge as BadgeType, Product } from "../../shared/Domain.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { splitPrice } from "../format.ts"
import { Cart, cartAtom, favouritesAtom, toastAtom } from "../state.ts"
import { BagIcon, HeartIcon, MinusIcon, PlusIcon, StarIcon } from "./Icons.tsx"

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
// Price, rating, badges
// ---------------------------------------------------------------------------

export function Price({ cents, size = "md" }: { cents: number; size?: "sm" | "md" | "lg" }) {
  const { whole, cents: rest } = splitPrice(cents)
  return (
    <span className={`price price-${size}`} aria-label={`$${whole}${rest ? `.${rest}` : ""}`}>
      <sup>$</sup>
      <span className="price-whole">{whole}</span>
      {rest ? <sup>.{rest}</sup> : null}
    </span>
  )
}

export function Rating({ value, count }: { value: number; count: number }) {
  return (
    <span className="rating" aria-label={`Rated ${value} out of 5 from ${count} reviews`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={14} fill={value >= i - 0.25 ? "currentColor" : "#D5D0C8"} />
      ))}
      <span className="rating-count">({count.toLocaleString("en-US")})</span>
    </span>
  )
}

const badgeLabels: Record<BadgeType, string> = {
  new: "New",
  "lower-price": "Lower price",
  "top-seller": "Top seller",
  limited: "Limited edition"
}

export const BadgeTag = ({ badge }: { badge: BadgeType }) => (
  <span className={`badge badge-${badge}`}>{badgeLabels[badge]}</span>
)

// ---------------------------------------------------------------------------
// Bag & favourites
// ---------------------------------------------------------------------------

export function useAddToBag() {
  const setCart = useAtomSet(cartAtom)
  const setToast = useAtomSet(toastAtom)
  return (product: Product, colorId: string, quantity = 1) => {
    setCart((lines) => Cart.add(lines, product.id, colorId, quantity))
    setToast({ id: Date.now(), product, colorId, quantity })
  }
}

export function useFavourite(product: Product) {
  const favourites = useAtomValue(favouritesAtom)
  const setFavourites = useAtomSet(favouritesAtom)
  const isFavourite = favourites.includes(product.id)
  const toggle = () =>
    setFavourites((ids) => (ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id]))
  return [isFavourite, toggle] as const
}

export function FavouriteButton({ product, className = "" }: { product: Product; className?: string }) {
  const [isFavourite, toggle] = useFavourite(product)
  return (
    <button
      type="button"
      className={`icon-button favourite ${isFavourite ? "is-active" : ""} ${className}`}
      aria-pressed={isFavourite}
      aria-label={isFavourite ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle()
      }}
    >
      <HeartIcon filled={isFavourite} size={22} />
    </button>
  )
}

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  label = "Quantity"
}: {
  value: number
  onChange: (value: number) => void
  max?: number
  label?: string
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(value - 1)} disabled={value <= 0}>
        <MinusIcon size={18} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)} disabled={value >= max}>
        <PlusIcon size={18} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------

export function ProductCard({ product, tint }: { product: Product; tint?: string }) {
  const addToBag = useAddToBag()
  const [first] = product.colors
  const outOfStock = product.stock <= 0
  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="product-card-media">
          <ProductArt
            kind={product.art}
            color={first.hex}
            accent={product.accent}
            tint={tint ?? "#F3F0EB"}
            label={`${product.name} ${product.type}`}
          />
          {product.badge ? <BadgeTag badge={product.badge} /> : null}
        </div>
        <div className="product-card-body">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-type">{product.type}</p>
          <div className="product-card-price">
            <Price cents={product.price} />
            {product.previousPrice ? (
              <span className="previous-price">
                Regular price <s>${(product.previousPrice / 100).toFixed(2)}</s>
              </span>
            ) : null}
          </div>
          <Rating value={product.rating} count={product.reviewCount} />
          {product.colors.length > 1 ? (
            <div className="swatches-mini" aria-label={`${product.colors.length} colours`}>
              {product.colors.map((color) => (
                <span key={color.id} style={{ background: color.hex }} title={color.name} />
              ))}
            </div>
          ) : null}
        </div>
      </Link>
      <FavouriteButton product={product} className="product-card-fav" />
      <button
        type="button"
        className="add-round"
        disabled={outOfStock}
        aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to bag`}
        onClick={() => addToBag(product, first.id)}
      >
        <BagIcon size={20} />
        <PlusIcon size={12} className="add-round-plus" strokeWidth={3} />
      </button>
    </article>
  )
}

export function ProductGrid({ products }: { products: ReadonlyArray<Product> }) {
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )
}

export function ProductRail({ products }: { products: ReadonlyArray<Product> }) {
  return (
    <div className="rail" role="list">
      {products.map((product) => (
        <div className="rail-item" role="listitem" key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}

export const SectionHeader = ({ title, link, linkLabel = "See all" }: { title: string; link?: string; linkLabel?: string }) => (
  <div className="section-header">
    <h2>{title}</h2>
    {link ? <Link to={link} className="text-link">{linkLabel}</Link> : null}
  </div>
)
