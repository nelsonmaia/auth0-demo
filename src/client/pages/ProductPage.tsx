import { useAtomValue } from "@effect/atom-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import type { Product } from "../../shared/Domain.ts"
import { FREE_DELIVERY_THRESHOLD } from "../../shared/Pricing.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { BagIcon, ReturnIcon, StoreIcon, TruckIcon } from "../components/Icons.tsx"
import {
  AsyncView,
  BadgeTag,
  ErrorState,
  FavouriteButton,
  Price,
  ProductRail,
  QuantityStepper,
  Rating,
  SectionHeader,
  useAddToBag
} from "../components/ui.tsx"
import { formatMoney } from "../format.ts"
import { productAtom, productsAtom } from "../state.ts"

export function ProductPage() {
  const { id = "" } = useParams()
  const product = useAtomValue(productAtom(id))

  return (
    <div className="container page">
      <AsyncView
        result={product}
        failure={(error) => (
          <ErrorState
            message={error?._tag === "ProductNotFound" ? "Sorry, we couldn't find that product." : "We couldn't load this product right now."}
            action={<Link to="/products" className="button button-primary">Browse all products</Link>}
          />
        )}
      >
        {(value) => <ProductDetails key={value.id} product={value} />}
      </AsyncView>
    </div>
  )
}

function ProductDetails({ product }: { product: Product }) {
  const [colorId, setColorId] = useState(product.colors[0].id)
  const [quantity, setQuantity] = useState(1)
  const addToBag = useAddToBag()
  const similar = useAtomValue(productsAtom({ category: product.category }))
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0]
  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 10

  useEffect(() => {
    document.title = `${product.name} ${product.type} — Nordhem`
    return () => {
      document.title = "Nordhem — Scandinavian furniture & home"
    }
  }, [product])

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products">Products</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/category/${product.category}`}>{product.category[0]?.toUpperCase() + product.category.slice(1)}</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp-gallery">
          <div className="pdp-main-art">
            <ProductArt
              kind={product.art}
              color={color.hex}
              accent={product.accent}
              tint="#F3F0EB"
              label={`${product.name} ${product.type} in ${color.name}`}
            />
            {product.badge ? <BadgeTag badge={product.badge} /> : null}
          </div>
          <div className="pdp-thumbs" role="list">
            {product.colors.map((option) => (
              <button
                type="button"
                role="listitem"
                key={option.id}
                className={`pdp-thumb ${option.id === colorId ? "is-active" : ""}`}
                onClick={() => setColorId(option.id)}
                aria-label={`Show ${option.name}`}
              >
                <ProductArt kind={product.art} color={option.hex} accent={product.accent} tint="#F3F0EB" />
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <div className="pdp-title-row">
            <div>
              <h1 className="pdp-name">{product.name}</h1>
              <p className="pdp-type">{product.type}, {color.name.toLowerCase()}</p>
            </div>
            <FavouriteButton product={product} />
          </div>

          <div className="pdp-price">
            <Price cents={product.price} size="lg" />
            {product.previousPrice ? (
              <span className="previous-price">
                Regular price <s>{formatMoney(product.previousPrice)}</s> · You save {formatMoney(product.previousPrice - product.price)}
              </span>
            ) : null}
          </div>

          <Rating value={product.rating} count={product.reviewCount} />

          <p className="pdp-description">{product.description}</p>

          <fieldset className="color-picker">
            <legend>
              Colour: <strong>{color.name}</strong>
            </legend>
            <div className="swatches">
              {product.colors.map((option) => (
                <label key={option.id} className={`swatch ${option.id === colorId ? "is-active" : ""}`} title={option.name}>
                  <input
                    type="radio"
                    name="color"
                    value={option.id}
                    checked={option.id === colorId}
                    onChange={() => setColorId(option.id)}
                  />
                  <span style={{ background: option.hex }} />
                  <span className="sr-only">{option.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="pdp-buy">
            <QuantityStepper
              value={quantity}
              max={Math.max(1, Math.min(99, product.stock))}
              onChange={(value) => setQuantity(Math.max(1, value))}
            />
            <button
              type="button"
              className="button button-primary button-lg button-block"
              disabled={outOfStock}
              onClick={() => addToBag(product, colorId, quantity)}
            >
              <BagIcon size={20} /> {outOfStock ? "Out of stock" : "Add to bag"}
            </button>
          </div>

          <ul className="pdp-availability">
            <li>
              <TruckIcon />
              <div>
                <strong>Delivery</strong>
                <span>
                  {outOfStock ? "Currently unavailable" : "Available for home delivery"} · free over {formatMoney(FREE_DELIVERY_THRESHOLD).replace(".00", "")}
                </span>
              </div>
            </li>
            <li>
              <StoreIcon />
              <div>
                <strong>Stock</strong>
                <span className={outOfStock ? "stock-out" : lowStock ? "stock-low" : "stock-ok"}>
                  <i aria-hidden="true" /> {outOfStock ? "Out of stock" : lowStock ? `Only ${product.stock} left` : "In stock online"}
                </span>
              </div>
            </li>
            <li>
              <ReturnIcon />
              <div>
                <strong>365-day returns</strong>
                <span>Changed your mind? Return it within a year.</span>
              </div>
            </li>
          </ul>

          <details className="accordion" open>
            <summary>Product details</summary>
            <ul>
              {product.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </details>
          <details className="accordion">
            <summary>Measurements</summary>
            <p>{product.dimensions}</p>
          </details>
          <details className="accordion">
            <summary>Reviews ({product.reviewCount.toLocaleString("en-US")})</summary>
            <p>
              <Rating value={product.rating} count={product.reviewCount} /> {product.rating.toFixed(1)} out of 5. Customers love the
              quality and value.
            </p>
          </details>
        </div>
      </div>

      <section className="section">
        <SectionHeader title="You might also like" link={`/category/${product.category}`} />
        <AsyncView result={similar} loading={null}>
          {(list) => <ProductRail products={list.filter((p) => p.id !== product.id)} />}
        </AsyncView>
      </section>
    </>
  )
}
