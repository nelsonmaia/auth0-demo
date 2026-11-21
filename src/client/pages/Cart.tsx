import { useAtom, useAtomValue } from "@effect/atom-react"
import { Link, useNavigate } from "react-router"
import type { Quote } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { BagIcon, HeartIcon, LockIcon, TrashIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, Price, QuantityStepper, Spinner, useFavourite } from "../components/ui.tsx"
import { formatMoney, plural } from "../format.ts"
import { Cart, cartAtom, deliveryAtom, quoteAtom } from "../state.ts"

export function CartPage() {
  const [lines, setLines] = useAtom(cartAtom)
  const quote = useAtomValue(quoteAtom)
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <div className="container page">
        <div className="empty-state empty-bag">
          <BagIcon size={48} />
          <h1>Your bag is empty</h1>
          <p>When you add products to your bag, they'll show up here.</p>
          <Link to="/products" className="button button-primary">Start shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container page">
      <h1 className="page-title">Your bag</h1>
      <AsyncView
        result={quote}
        failure={(error) => (
          <ErrorState
            message={
              error?._tag === "ProductNotFound" || error?._tag === "InvalidColor"
                ? "Some items in your bag are no longer available."
                : "We couldn't price your bag right now. Please try again."
            }
            action={<button type="button" className="button button-outline" onClick={() => setLines([])}>Empty bag</button>}
          />
        )}
      >
        {(value, waiting) => (
          <div className="cart-layout">
            <ul className={`cart-lines ${waiting ? "is-waiting" : ""}`}>
              {value.lines.map((line) => (
                <CartLineItem
                  key={`${line.product.id}:${line.color.id}`}
                  line={line}
                  onQuantity={(quantity) => setLines((current) => Cart.setQuantity(current, line.product.id, line.color.id, quantity))}
                  onRemove={() => setLines((current) => Cart.remove(current, line.product.id, line.color.id))}
                />
              ))}
            </ul>
            <aside className="cart-summary">
              <OrderSummary quote={value} waiting={waiting} editableDelivery />
              <button
                type="button"
                className="button button-primary button-lg button-block"
                onClick={() => navigate("/checkout")}
                disabled={waiting}
              >
                Continue to checkout
              </button>
              <p className="secure-note">
                <LockIcon size={16} /> Secure checkout · 365-day returns
              </p>
            </aside>
          </div>
        )}
      </AsyncView>
    </div>
  )
}

function CartLineItem({
  line,
  onQuantity,
  onRemove
}: {
  line: Quote["lines"][number]
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const [isFavourite, toggleFavourite] = useFavourite(line.product)
  const overStock = line.quantity > line.available
  return (
    <li className="cart-line">
      <Link to={`/product/${line.product.id}`} className="cart-line-art">
        <ProductArt kind={line.product.art} color={line.color.hex} accent={line.product.accent} tint="#F3F0EB" />
      </Link>
      <div className="cart-line-info">
        <div className="cart-line-top">
          <div>
            <Link to={`/product/${line.product.id}`} className="product-name">{line.product.name}</Link>
            <p className="product-type">{line.product.type}, {line.color.name.toLowerCase()}</p>
            <p className="muted small">{line.product.dimensions}</p>
          </div>
          <div className="cart-line-price">
            <Price cents={line.lineTotal} />
            {line.quantity > 1 ? <span className="muted small">{formatMoney(line.unitPrice)} each</span> : null}
          </div>
        </div>
        {overStock ? <p className="stock-warning">Only {line.available} left in stock — please reduce the quantity.</p> : null}
        <div className="cart-line-actions">
          <QuantityStepper value={line.quantity} onChange={onQuantity} max={Math.min(99, Math.max(line.available, 1))} />
          <button type="button" className="text-button" onClick={onRemove}>
            <TrashIcon size={18} /> Remove
          </button>
          <button type="button" className="text-button" onClick={toggleFavourite} aria-pressed={isFavourite}>
            <HeartIcon size={18} filled={isFavourite} /> {isFavourite ? "Saved" : "Save for later"}
          </button>
        </div>
      </div>
    </li>
  )
}

export function OrderSummary({ quote, waiting, editableDelivery = false }: { quote: Quote; waiting: boolean; editableDelivery?: boolean }) {
  const [delivery, setDelivery] = useAtom(deliveryAtom)
  const remaining = quote.freeDeliveryThreshold - quote.subtotal
  const progress = Math.min(100, Math.round((quote.subtotal / quote.freeDeliveryThreshold) * 100))

  return (
    <div className={`summary ${waiting ? "is-waiting" : ""}`}>
      <h2>Order summary</h2>
      {editableDelivery ? (
        <fieldset className="delivery-options">
          <legend>How would you like to get your order?</legend>
          {deliveryOptions.map((option) => (
            <label key={option.id} className={`radio-card ${delivery === option.id ? "is-active" : ""}`}>
              <input
                type="radio"
                name="delivery"
                value={option.id}
                checked={delivery === option.id}
                onChange={() => setDelivery(option.id)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {quote.delivery === "standard" ? (
        <div className="free-delivery">
          {remaining > 0 ? (
            <p>
              Add <strong>{formatMoney(remaining)}</strong> more for free home delivery
            </p>
          ) : (
            <p><strong>You've unlocked free home delivery!</strong></p>
          )}
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <dl className="totals">
        <div>
          <dt>Products ({plural(quote.itemCount, "item")})</dt>
          <dd>{formatMoney(quote.subtotal + quote.savings)}</dd>
        </div>
        {quote.savings > 0 ? (
          <div className="savings">
            <dt>Lower price savings</dt>
            <dd>−{formatMoney(quote.savings)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{deliveryOptions.find((o) => o.id === quote.delivery)?.label}</dt>
          <dd>{quote.deliveryFee === 0 ? "Free" : formatMoney(quote.deliveryFee)}</dd>
        </div>
        <div className="grand-total">
          <dt>Total</dt>
          <dd><Price cents={quote.total} size="lg" /></dd>
        </div>
      </dl>
      {waiting ? <Spinner label="Updating" /> : null}
    </div>
  )
}

/** A compact list of the bag's products, used on the checkout page. */
export function QuoteLines({ quote }: { quote: Quote }) {
  return (
    <ul className="mini-lines">
      {quote.lines.map((line) => (
        <li key={`${line.product.id}:${line.color.id}`}>
          <ProductArt kind={line.product.art} color={line.color.hex} accent={line.product.accent} tint="#F3F0EB" />
          <div>
            <strong>{line.product.name}</strong>
            <span>{line.product.type}, {line.color.name.toLowerCase()}</span>
            <span className="muted">Qty {line.quantity}</span>
          </div>
          <span className="mini-price">{formatMoney(line.lineTotal)}</span>
        </li>
      ))}
    </ul>
  )
}
