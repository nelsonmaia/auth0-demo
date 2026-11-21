import { useAtom, useAtomValue } from "@effect/atom-react"
import { Link, useNavigate } from "react-router"
import { type Quote, QuoteLine } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { HeartIcon, TrashIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, Price, Spinner, useFavourite } from "../components/ui.tsx"
import { formatMoney, formatTotal, plural } from "../format.ts"
import { Bag, cartAtom, quoteAtom } from "../state.ts"

export function CartPage() {
  const [lines, setLines] = useAtom(cartAtom)
  const quote = useAtomValue(quoteAtom)
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <div className="container page bag-page">
        <div className="bag-layout">
          <div>
            <h1 className="page-title">Bag</h1>
            <p className="muted">There are no items in your bag.</p>
            <Link to="/shop" className="button button-primary bag-empty-cta">Shop Now</Link>
          </div>
          <aside className="summary">
            <h2>Summary</h2>
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>—</dd></div>
              <div><dt>Estimated Delivery &amp; Handling</dt><dd>Free</dd></div>
              <div className="grand-total"><dt>Total</dt><dd>—</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="container page bag-page">
      <AsyncView
        result={quote}
        failure={(error) => (
          <ErrorState
            message={
              error?._tag === "InvalidSize"
                ? `Size ${error.size} of ${error.name} is no longer available. Please remove it from your bag.`
                : error?._tag === "ProductNotFound" || error?._tag === "InvalidColor"
                ? "Some items in your bag are no longer available."
                : "We couldn't load your bag right now. Please try again."
            }
            action={<button type="button" className="button button-outline" onClick={() => setLines([])}>Empty Bag</button>}
          />
        )}
      >
        {(value, waiting) => (
          <>
            <div className="bag-mobile-summary">
              <h1>Bag</h1>
              <p className="muted">{plural(value.itemCount, "Item")} | {formatTotal(value.total)}</p>
            </div>
            <div className="bag-layout">
              <div>
                <h1 className="page-title desktop-only">Bag</h1>
                <FreeDeliveryNote quote={value} />
                <ul className={`bag-lines ${waiting ? "is-waiting" : ""}`}>
                  {lines.flatMap((local) => {
                    // Rows follow the local bag (updated instantly); the server
                    // quote supplies product data and prices. While a new quote
                    // is in flight, fall back to the previous line for this product.
                    const quoted =
                      value.lines.find((q) =>
                        q.product.id === local.productId && q.color.id === local.colorId && q.size === local.size
                      ) ??
                        value.lines.find((q) => q.product.id === local.productId && q.color.id === local.colorId)
                    if (!quoted) return []
                    const key = { productId: local.productId, colorId: local.colorId, size: local.size }
                    const line = new QuoteLine({
                      ...quoted,
                      size: local.size,
                      quantity: local.quantity,
                      lineTotal: quoted.unitPrice * local.quantity
                    })
                    return (
                      <BagLine
                        key={`${local.productId}:${local.colorId}:${local.size}`}
                        line={line}
                        onQuantity={(quantity) => setLines((current) => Bag.setQuantity(current, key, quantity))}
                        onSize={(size) => setLines((current) => Bag.setSize(current, key, size))}
                        onRemove={() => setLines((current) => Bag.remove(current, key))}
                      />
                    )
                  })}
                </ul>
              </div>
              <aside className="summary-column">
                <SummaryTotals quote={value} waiting={waiting} title="Summary" />
                <div className="summary-buttons">
                  <button type="button" className="button button-primary button-lg button-block" onClick={() => navigate("/checkout")}>
                    Guest Checkout
                  </button>
                  <Link to="/account?from=checkout" className="button button-primary button-lg button-block">
                    Member Checkout
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
      </AsyncView>
    </div>
  )
}

function FreeDeliveryNote({ quote }: { quote: Quote }) {
  const remaining = quote.freeDeliveryThreshold - quote.subtotal
  return (
    <div className="bag-note">
      {remaining > 0 ? (
        <p>
          <strong>Free Delivery</strong> applies to orders of {formatMoney(quote.freeDeliveryThreshold)} or more. You're{" "}
          {formatMoney(remaining)} away.
        </p>
      ) : (
        <p>
          <strong>You qualify for Free Delivery.</strong> Nice!
        </p>
      )}
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.round((quote.subtotal / quote.freeDeliveryThreshold) * 100))}%` }} />
      </div>
    </div>
  )
}

function BagLine({
  line,
  onQuantity,
  onSize,
  onRemove
}: {
  line: Quote["lines"][number]
  onQuantity: (quantity: number) => void
  onSize: (size: string) => void
  onRemove: () => void
}) {
  const [isFavourite, toggleFavourite] = useFavourite(line.product, line.color.id)
  const href = `/product/${line.product.id}?color=${line.color.id}`
  return (
    <li className="bag-line">
      <Link to={href} className="bag-line-art">
        <ProductArt kind={line.product.art} paint={line.color} label={line.product.name} />
      </Link>
      <div className="bag-line-info">
        <div className="bag-line-top">
          <div>
            <Link to={href} className="bag-line-name">{line.product.name}</Link>
            <p className="muted">{line.product.subtitle}</p>
            <p className="muted">{line.color.name}</p>
          </div>
          <Price product={{ price: line.lineTotal, previousPrice: line.product.previousPrice ? line.product.previousPrice * line.quantity : undefined }} />
        </div>
        <div className="bag-line-selects">
          <label>
            <span>Size</span>
            <select value={line.size} onChange={(event) => onSize(event.target.value)}>
              {line.product.sizes.map((size) => (
                <option key={size} value={size} disabled={line.product.unavailableSizes.includes(size)}>{size}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Quantity</span>
            <select value={line.quantity} onChange={(event) => onQuantity(Number(event.target.value))}>
              {Array.from({ length: Math.max(1, Math.min(10, line.available)) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {line.quantity > line.available ? (
          <p className="stock-warning">Only {line.available} left in stock. Please reduce the quantity.</p>
        ) : null}
        <div className="bag-line-actions">
          <button type="button" className="icon-button" aria-pressed={isFavourite} aria-label={isFavourite ? "Remove from favourites" : "Move to favourites"} onClick={toggleFavourite}>
            <HeartIcon filled={isFavourite} />
          </button>
          <button type="button" className="icon-button" aria-label={`Remove ${line.product.name} from bag`} onClick={onRemove}>
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  )
}

export function SummaryTotals({ quote, waiting, title }: { quote: Quote; waiting: boolean; title: string }) {
  const option = deliveryOptions.find((o) => o.id === quote.delivery)
  return (
    <div className={`summary ${waiting ? "is-waiting" : ""}`}>
      <h2>{title}</h2>
      <dl className="totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatTotal(quote.subtotal)}</dd>
        </div>
        <div>
          <dt>{quote.delivery === "pickup" ? "Pick Up" : `Estimated ${option?.label ?? "Delivery"} & Handling`}</dt>
          <dd>{quote.deliveryFee === 0 ? "Free" : formatTotal(quote.deliveryFee)}</dd>
        </div>
        {quote.savings > 0 ? (
          <div className="savings">
            <dt>You save</dt>
            <dd>{formatTotal(quote.savings)}</dd>
          </div>
        ) : null}
        <div className="grand-total">
          <dt>Total</dt>
          <dd>{formatTotal(quote.total)}</dd>
        </div>
      </dl>
      {waiting ? <Spinner label="Updating" /> : null}
    </div>
  )
}

/** Compact item list used on checkout and order confirmation. */
export function QuoteLines({ quote, arrives }: { quote: Quote; arrives?: string }) {
  return (
    <div className="mini-lines">
      {arrives ? <h3>{arrives}</h3> : null}
      <ul>
        {quote.lines.map((line) => (
          <li key={`${line.product.id}:${line.color.id}:${line.size}`}>
            <ProductArt kind={line.product.art} paint={line.color} />
            <div>
              <strong>{line.product.name}</strong>
              <span>{line.product.subtitle}</span>
              <span>Qty {line.quantity} · Size {line.size}</span>
              <span>{formatTotal(line.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
