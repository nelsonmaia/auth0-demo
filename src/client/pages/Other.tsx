import { useAtomValue } from "@effect/atom-react"
import { Link, useParams } from "react-router"
import type { Order } from "../../shared/Domain.ts"
import { OrderId } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { RoomScene } from "../art/ProductArt.tsx"
import { CheckIcon, HeartIcon, LockIcon, UserIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, Price, ProductGrid } from "../components/ui.tsx"
import { formatDate, formatMoney } from "../format.ts"
import { scenes } from "../scenes.ts"
import { favouritesAtom, lastOrderAtom, productsAtom } from "../state.ts"
import { StoreClient } from "../StoreClient.ts"
import { QuoteLines } from "./Cart.tsx"

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------

export function OrderPage() {
  const { id = "" } = useParams()
  const lastOrder = useAtomValue(lastOrderAtom)
  if (lastOrder && lastOrder.id === id) {
    return <OrderDetails order={lastOrder} />
  }
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
            action={<Link to="/" className="button button-primary">Back to the store</Link>}
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
  return (
    <div className="container page order-page">
      <div className="order-hero">
        <span className="order-check"><CheckIcon size={32} /></span>
        <h1>Tack, {order.contact.fullName.split(" ")[0]}! Your order is confirmed.</h1>
        <p>
          We've sent a confirmation to <strong>{order.contact.email}</strong>. Your order number is{" "}
          <strong className="order-id">{order.id}</strong>.
        </p>
      </div>
      <div className="order-grid">
        <section className="order-card">
          <h2>{delivery?.label}</h2>
          <p className="order-eta">
            {order.quote.delivery === "pickup" ? "Ready for pickup" : "Estimated delivery"}: <strong>{formatDate(order.estimatedDelivery)}</strong>
          </p>
          <address>
            {order.contact.fullName}
            <br />
            {order.address.line1}
            {order.address.line2 ? <><br />{order.address.line2}</> : null}
            <br />
            {order.address.postalCode} {order.address.city}
            <br />
            {order.address.country}
          </address>
          <ol className="order-timeline">
            <li className="is-done">Order confirmed</li>
            <li>Packing</li>
            <li>{order.quote.delivery === "pickup" ? "Ready for pickup" : "On its way"}</li>
            <li>{order.quote.delivery === "pickup" ? "Collected" : "Delivered"}</li>
          </ol>
        </section>
        <section className="order-card">
          <h2>Your items</h2>
          <QuoteLines quote={order.quote} />
          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(order.quote.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.quote.deliveryFee === 0 ? "Free" : formatMoney(order.quote.deliveryFee)}</dd>
            </div>
            <div className="grand-total">
              <dt>Total paid</dt>
              <dd><Price cents={order.quote.total} size="lg" /></dd>
            </div>
          </dl>
        </section>
      </div>
      <div className="order-actions">
        <Link to="/" className="button button-primary">Continue shopping</Link>
        <Link to="/account" className="button button-outline">Create an account to track orders</Link>
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
        <div className="empty-state">
          <HeartIcon size={48} />
          <p>Tap the heart on any product to save it here for later.</p>
          <Link to="/products" className="button button-primary">Find something you love</Link>
        </div>
      ) : (
        <AsyncView result={products}>
          {(list) => <ProductGrid products={list.filter((p) => favourites.includes(p.id))} />}
        </AsyncView>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account (Auth0 lands here next)
// ---------------------------------------------------------------------------

export function AccountPage() {
  return (
    <div className="container page account-page">
      <div className="account-card">
        <span className="account-icon"><UserIcon size={32} /></span>
        <h1>Hej! Log in to your Nordhem account</h1>
        <p>Sign-in is coming soon. Once it's here you'll be able to:</p>
        <ul>
          <li><CheckIcon size={18} /> See your order history and track deliveries</li>
          <li><CheckIcon size={18} /> Keep your favourites and bag in sync across devices</li>
          <li><CheckIcon size={18} /> Check out faster with saved addresses</li>
        </ul>
        <button type="button" className="button button-primary button-lg button-block" disabled>
          <LockIcon size={18} /> Log in — coming soon
        </button>
        <p className="muted small">Secure login will be provided by Auth0.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

export function NotFoundPage() {
  return (
    <div className="container page">
      <div className="not-found">
        <RoomScene {...scenes.bedroom} label="An empty bedroom" className="not-found-art" />
        <h1>Oops, this page took a nap</h1>
        <p>The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="button button-primary">Back to the store</Link>
      </div>
    </div>
  )
}
