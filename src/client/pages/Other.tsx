import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { Link, useParams, useSearchParams } from "react-router"
import type { Order } from "../../shared/Domain.ts"
import { OrderId } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { LogoMark } from "../art/ProductArt.tsx"
import { CheckIcon, HeartIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, ProductCard } from "../components/ui.tsx"
import { formatDate, formatTotal } from "../format.ts"
import { favouritesAtom, lastOrderAtom, productsAtom } from "../state.ts"
import { StoreClient } from "../StoreClient.ts"
import { QuoteLines } from "./Cart.tsx"

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------

export function OrderPage() {
  const { id = "" } = useParams()
  const lastOrder = useAtomValue(lastOrderAtom)
  if (lastOrder && lastOrder.id === id) return <OrderDetails order={lastOrder} />
  return <RemoteOrder id={id} />
}

function RemoteOrder({ id }: { id: string }) {
  const order = useAtomValue(StoreClient.query("checkout", "order", { params: { id: OrderId.make(id) } }))
  return (
    <AsyncView
      result={order}
      failure={() => (
        <div className="container page">
          <ErrorState
            message="We couldn't find that order. In this demo, orders are kept in the server's memory and may disappear after a restart."
            action={<Link to="/" className="button button-primary">Back to KINETIK</Link>}
          />
        </div>
      )}
    >
      {(value) => <OrderDetails order={value} />}
    </AsyncView>
  )
}

function OrderDetails({ order }: { order: Order }) {
  const delivery = deliveryOptions.find((option) => option.id === order.quote.delivery)
  const pickup = order.quote.delivery === "pickup"
  return (
    <div className="container page order-page">
      <div className="order-hero">
        <span className="order-check"><CheckIcon size={32} /></span>
        <h1>Thanks for your order, {order.contact.fullName.split(" ")[0]}!</h1>
        <p>
          We've sent a confirmation to <strong>{order.contact.email}</strong>.
          <br />
          Order number <strong className="order-id">{order.id}</strong>
        </p>
      </div>
      <div className="order-grid">
        <section className="order-card">
          <h2>{delivery?.label}</h2>
          <p>
            {pickup ? "Ready for pick up" : "Arrives by"} <strong>{formatDate(order.estimatedDelivery)}</strong>
          </p>
          <address>
            {order.contact.fullName}
            <br />
            {order.address.line1}
            {order.address.line2 ? <><br />{order.address.line2}</> : null}
            <br />
            {order.address.city}, {order.address.postalCode}
            <br />
            {order.address.country}
          </address>
          <ol className="order-timeline">
            <li className="is-done">Order placed</li>
            <li>Processing</li>
            <li>{pickup ? "Ready for pick up" : "Shipped"}</li>
            <li>{pickup ? "Picked up" : "Delivered"}</li>
          </ol>
        </section>
        <section className="order-card">
          <h2>Order Summary</h2>
          <QuoteLines quote={order.quote} />
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{formatTotal(order.quote.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.quote.deliveryFee === 0 ? "Free" : formatTotal(order.quote.deliveryFee)}</dd></div>
            <div className="grand-total"><dt>Total</dt><dd>{formatTotal(order.quote.total)}</dd></div>
          </dl>
        </section>
      </div>
      <div className="order-actions">
        <Link to="/shop" className="button button-primary">Continue Shopping</Link>
        <Link to="/account" className="button button-outline">Join Us to Track Orders</Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

export function FavouritesPage() {
  const favourites = useAtomValue(favouritesAtom)
  const products = useAtomValue(productsAtom({}))
  return (
    <div className="container page">
      <h1 className="page-title">Favourites</h1>
      {favourites.length === 0 ? (
        <div className="empty-state align-left">
          <HeartIcon size={40} />
          <p>Items added to your Favourites will be saved here.</p>
          <Link to="/shop" className="button button-primary">Shop Now</Link>
        </div>
      ) : (
        <AsyncView result={products}>
          {(list) => (
            <div className="grid">
              {favourites.flatMap((favourite) => {
                const product = list.find((p) => p.id === favourite.productId)
                return product ? [<ProductCard key={product.id} product={product} colorId={favourite.colorId} />] : []
              })}
            </div>
          )}
        </AsyncView>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account (Auth0 lands here next)
// ---------------------------------------------------------------------------

export function AccountPage() {
  const [params] = useSearchParams()
  const fromCheckout = params.get("from") === "checkout"
  return (
    <div className="container page account-page">
      <div className="account-card">
        <LogoMark size={44} />
        <h1>{fromCheckout ? "Sign in for Member Checkout" : "Become a KINETIK Member"}</h1>
        <p className="muted">Sign-in is coming soon. As a member you'll get:</p>
        <ul>
          <li><CheckIcon size={18} /> Member-only products and early access to drops</li>
          <li><CheckIcon size={18} /> Free delivery on every order</li>
          <li><CheckIcon size={18} /> Order history and tracking in one place</li>
          <li><CheckIcon size={18} /> Your bag and favourites on every device</li>
        </ul>
        <button type="button" className="button button-primary button-lg button-block" disabled>Join Us</button>
        <button type="button" className="button button-outline button-lg button-block" disabled>Sign In</button>
        <p className="muted small">Secure sign-in will be powered by Auth0.</p>
        {fromCheckout ? <Link to="/checkout" className="text-link">Continue as guest</Link> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

export function NotFoundPage() {
  const products = useAtomValue(productsAtom({ sort: "featured" }))
  return (
    <div className="container page">
      <div className="not-found">
        <h1 className="display">We can't find that page</h1>
        <p className="muted">The page you're looking for has moved or no longer exists. Try one of these instead.</p>
        <Link to="/" className="button button-primary">Back to Home</Link>
      </div>
      {AsyncResult.isSuccess(products) ? (
        <div className="grid not-found-grid">
          {products.value.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : null}
    </div>
  )
}
