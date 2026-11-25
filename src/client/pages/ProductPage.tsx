import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import type { Product, SportId } from "../../shared/Domain.ts"
import { FREE_DELIVERY_THRESHOLD } from "../../shared/Pricing.ts"
import { type ArtView, ProductArt } from "../art/ProductArt.tsx"
import { ChevronLeft, ChevronRight, StarIcon, StoreIcon, TruckIcon } from "../components/Icons.tsx"
import { Photo } from "../components/Photo.tsx"
import { AsyncView, ErrorState, FavouriteButton, Price, ProductCarousel, productLabel, useAddToBag } from "../components/ui.tsx"
import { formatMoney } from "../format.ts"
import type { PhotoName } from "../photos.ts"
import { lastViewedAtom, productAtom, productsAtom } from "../state.ts"

export function ProductPage() {
  const { id = "" } = useParams()
  const product = useAtomValue(productAtom(id))

  return (
    <AsyncView
      result={product}
      failure={(error) => (
        <div className="container page">
          <ErrorState
            message={error?._tag === "ProductNotFound" ? "Sorry, we couldn't find that product." : "We couldn't load this product right now."}
            action={<Link to="/shop" className="button button-primary">Shop all products</Link>}
          />
        </div>
      )}
    >
      {(value) => <ProductDetails key={value.id} product={value} />}
    </AsyncView>
  )
}

const views: ReadonlyArray<ArtView> = ["side", "mirror", "top", "detail"]

/** A real "in action" photo for each sport, shown as the last gallery slide. */
const actionPhoto: Record<SportId, PhotoName> = {
  running: "action-running",
  training: "sport-training",
  lifestyle: "sport-lifestyle",
  basketball: "action-basketball",
  trail: "sport-trail"
}

function Gallery({ product, colorIndex }: { product: Product; colorIndex: number }) {
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const color = product.colors[colorIndex] ?? product.colors[0]
  const count = views.length + 1

  const show = (index: number) => {
    const next = (index + count) % count
    setActive(next)
    const el = track.current
    if (el && el.scrollWidth > el.clientWidth) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" })
  }

  return (
    <div className="gallery">
      <div className="gallery-thumbs" role="list">
        {views.map((view, index) => (
          <button
            type="button"
            role="listitem"
            key={view}
            className={index === active ? "is-active" : undefined}
            onMouseEnter={() => show(index)}
            onClick={() => show(index)}
            aria-label={`View ${index + 1}`}
          >
            <ProductArt kind={product.art} paint={color} view={view} />
          </button>
        ))}
        <button
          type="button"
          role="listitem"
          className={active === views.length ? "is-active" : undefined}
          onMouseEnter={() => show(views.length)}
          onClick={() => show(views.length)}
          aria-label="View in action"
        >
          <Photo name={actionPhoto[product.sport]} className="thumb-photo" />
        </button>
      </div>
      <div className="gallery-main">
        <div
          className="gallery-track"
          ref={track}
          onScroll={(event) => {
            const el = event.currentTarget
            setActive(Math.round(el.scrollLeft / el.clientWidth))
          }}
        >
          {views.map((view, index) => (
            <div className={`gallery-slide ${index === active ? "is-active" : ""}`} key={view}>
              <ProductArt kind={product.art} paint={color} view={view} label={`${product.name} in ${color.name}, view ${index + 1}`} />
            </div>
          ))}
          <div className={`gallery-slide ${active === views.length ? "is-active" : ""}`}>
            <Photo name={actionPhoto[product.sport]} className="slide-photo" />
          </div>
        </div>
        <div className="gallery-arrows">
          <button type="button" className="round-button light" aria-label="Previous image" onClick={() => show(active - 1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="round-button light" aria-label="Next image" onClick={() => show(active + 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="gallery-dots" aria-hidden="true">
          {Array.from({ length: count }, (_, index) => <span key={index} className={index === active ? "is-active" : undefined} />)}
        </div>
      </div>
    </div>
  )
}

function ProductDetails({ product }: { product: Product }) {
  const [params, setParams] = useSearchParams()
  const initial = Math.max(0, product.colors.findIndex((c) => c.id === params.get("color")))
  const [colorIndex, setColorIndex] = useState(initial)
  const [size, setSize] = useState<string | undefined>()
  const [sizeError, setSizeError] = useState(false)
  const addToBag = useAddToBag()
  const similar = useAtomValue(productsAtom({ category: product.category, sort: "featured" }))
  const color = product.colors[colorIndex] ?? product.colors[0]
  const label = productLabel(product)
  const soldOut = product.stock <= 0
  const oneSize = product.sizes.length === 1

  const setLastViewed = useAtomSet(lastViewedAtom)
  useEffect(() => setLastViewed(product.id), [product.id, setLastViewed])

  useEffect(() => {
    document.title = `${product.name} ${product.subtitle}. KINETIK`
    return () => {
      document.title = "KINETIK. Move Your Way."
    }
  }, [product])

  useEffect(() => {
    if (oneSize) setSize(product.sizes[0])
  }, [oneSize, product.sizes])

  const pickColor = (index: number) => {
    setColorIndex(index)
    const next = new URLSearchParams(params)
    next.set("color", product.colors[index]!.id)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const add = () => {
    if (!size) {
      setSizeError(true)
      return
    }
    addToBag(product, color.id, size)
  }

  const header = (
    <div className="pdp-header">
      {label ? <p className="card-label">{label}</p> : null}
      <h1 className="pdp-name">{product.name}</h1>
      <p className="pdp-subtitle">{product.subtitle}</p>
      <Price product={product} className="pdp-price" />
    </div>
  )

  return (
    <div className="pdp container">
      <div className="pdp-mobile-header">{header}</div>
      <Gallery product={product} colorIndex={colorIndex} />

      <div className="pdp-info">
        <div className="pdp-desktop-header">{header}</div>

        {product.colors.length > 1 ? (
          <div className="colorways" role="radiogroup" aria-label="Colour">
            {product.colors.map((option, index) => (
              <button
                type="button"
                role="radio"
                aria-checked={index === colorIndex}
                key={option.id}
                className={index === colorIndex ? "is-active" : undefined}
                onClick={() => pickColor(index)}
                title={option.name}
              >
                <ProductArt kind={product.art} paint={option} label={option.name} />
              </button>
            ))}
          </div>
        ) : null}

        <fieldset className={`sizes ${sizeError ? "has-error" : ""}`}>
          <legend>
            <span>Select Size</span>
            <a href="#size-fit" className="muted">Size Guide</a>
          </legend>
          <div className={`size-grid ${oneSize ? "one-size" : ""}`}>
            {product.sizes.map((option) => {
              const unavailable = product.unavailableSizes.includes(option) || soldOut
              return (
                <label key={option} className={`size ${size === option ? "is-active" : ""} ${unavailable ? "is-disabled" : ""}`}>
                  <input
                    type="radio"
                    name="size"
                    value={option}
                    disabled={unavailable}
                    checked={size === option}
                    onChange={() => {
                      setSize(option)
                      setSizeError(false)
                    }}
                  />
                  {product.genders.length === 1 && product.genders[0] !== "kids" && product.category === "shoes"
                    ? `US ${option}`
                    : option}
                </label>
              )
            })}
          </div>
          {sizeError ? <p className="size-error" role="alert">Please select a size.</p> : null}
        </fieldset>

        <div className="pdp-buttons">
          <button type="button" className="button button-primary button-lg button-block" disabled={soldOut} onClick={add}>
            {soldOut ? "Sold Out" : "Add to Bag"}
          </button>
          <FavouriteButton product={product} colorId={color.id} />
        </div>

        <div className="pdp-shipping">
          <p>
            <TruckIcon size={20} /> <strong>Shipping</strong>
          </p>
          <p className="muted">
            Free standard delivery on orders over {formatMoney(FREE_DELIVERY_THRESHOLD)}. You'll see delivery options at checkout.
          </p>
          <p>
            <StoreIcon size={20} /> <strong>Free Pick Up</strong>
          </p>
          <p className="muted">Collect from a partner store in 2–3 days.</p>
        </div>

        <div className="pdp-description">
          <p>{product.description}</p>
          <ul>
            <li>Colour Shown: {color.name}</li>
            <li>Style: {product.styleCode}</li>
          </ul>
        </div>

        <details className="accordion" id="size-fit">
          <summary>Size &amp; Fit</summary>
          <ul>
            <li>Fits true to size</li>
            {product.category === "shoes" ? <li>We recommend ordering your usual size</li> : <li>Model is 6'0" and wears size M</li>}
            <li>Available sizes: {product.sizes.join(", ")}</li>
          </ul>
        </details>
        <details className="accordion">
          <summary>Product Details</summary>
          <ul>
            {product.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </details>
        <details className="accordion">
          <summary>Free Delivery and Returns</summary>
          <p>
            Free standard delivery on orders over {formatMoney(FREE_DELIVERY_THRESHOLD)}, or pick up for free at a partner store. You can return
            your order for any reason, free of charge, within 30 days.
          </p>
        </details>
        <details className="accordion">
          <summary>
            Reviews ({product.reviewCount.toLocaleString("en-US")})
            <span className="stars" aria-label={`${product.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} size={16} fill={product.rating >= i - 0.25 ? "#111" : "#CACACB"} />)}
            </span>
          </summary>
          <p>
            {product.rating.toFixed(1)} out of 5 stars from {product.reviewCount.toLocaleString("en-US")} reviews. Customers rate the comfort and
            fit highly.
          </p>
        </details>
      </div>

      <div className="pdp-similar">
        <AsyncView result={similar} loading={null}>
          {(list) => <ProductCarousel title="You Might Also Like" products={list.filter((p) => p.id !== product.id).slice(0, 10)} />}
        </AsyncView>
      </div>
    </div>
  )
}
