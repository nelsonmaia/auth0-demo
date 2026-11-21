import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { Link, useParams, useSearchParams } from "react-router"
import type { Order } from "../../shared/Domain.ts"
import { OrderId } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { LogoMark, ProductArt } from "../art/ProductArt.tsx"
import { auth0Config, authAtom, type MemberProfile, useAuthActions } from "../auth.tsx"
import { Photo } from "../components/Photo.tsx"
import { CheckIcon, HeartIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, ProductCard, Spinner } from "../components/ui.tsx"
import { formatDate, formatTotal } from "../format.ts"
import { favouritesAtom, lastOrderAtom, meAtom, myOrdersAtom, productsAtom } from "../state.ts"
import { type PhotoName, photos } from "../photos.ts"
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
        <Link to="/account" className="button button-outline">
          {order.customerId ? "View Your Orders" : "Join Us to Track Orders"}
        </Link>
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
  const auth = useAtomValue(authAtom)
  if (auth.isLoading) {
    return (
      <div className="container page">
        <Spinner label="Checking your session" />
      </div>
    )
  }
  return auth.isAuthenticated && auth.user ? <MemberAccount user={auth.user} /> : <JoinOrSignIn />
}

function JoinOrSignIn() {
  const [params] = useSearchParams()
  const { signIn, join } = useAuthActions()
  const fromCheckout = params.get("from") === "checkout"
  const returnTo = fromCheckout ? "/checkout" : "/account"
  return (
    <div className="container page account-page">
      <div className="account-card">
        <LogoMark size={44} />
        <h1>{fromCheckout ? "Sign in for Member Checkout" : "Become a KINETIK Member"}</h1>
        <p className="muted">Join for free or sign in. As a member you get:</p>
        <ul>
          <li><CheckIcon size={18} /> Free standard delivery on every order</li>
          <li><CheckIcon size={18} /> Your order history in one place</li>
          <li><CheckIcon size={18} /> Faster checkout with your details filled in</li>
          <li><CheckIcon size={18} /> Early access to new drops</li>
        </ul>
        <button type="button" className="button button-primary button-lg button-block" onClick={() => join(returnTo)}>
          Join Us
        </button>
        <button type="button" className="button button-outline button-lg button-block" onClick={() => signIn(returnTo)}>
          Sign In
        </button>
        <p className="muted small">Secure sign-in powered by Auth0.</p>
        {fromCheckout ? <Link to="/checkout" className="text-link">Continue as guest</Link> : null}
      </div>
    </div>
  )
}

function MemberAccount({ user }: { user: MemberProfile }) {
  const { signOut } = useAuthActions()
  const orders = useAtomValue(myOrdersAtom)
  const me = useAtomValue(meAtom)
  return (
    <div className="container page member-page">
      <div className="member-head">
        {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span className="member-avatar">{user.firstName[0]}</span>}
        <div>
          <h1>Hi, {user.firstName}</h1>
          {user.email ? <p className="muted">{user.email}</p> : null}
          <p className="member-badge"><CheckIcon size={16} /> KINETIK Member · free standard delivery on every order</p>
        </div>
        <button type="button" className="button button-outline" onClick={() => signOut()}>Sign Out</button>
      </div>

      <section className="member-section">
        <h2>Your Orders</h2>
        <AsyncView
          result={orders}
          failure={(error) => (
            <ErrorState
              message={error?._tag === "Unauthorized" ? "Your session has expired. Please sign in again." : "We couldn't load your orders right now."}
            />
          )}
        >
          {(list) =>
            list.length === 0 ? (
              <div className="empty-state align-left">
                <p>No orders yet. Orders you place while signed in will show up here.</p>
                <Link to="/shop" className="button button-primary">Shop Now</Link>
              </div>
            ) : (
              <ul className="order-list">
                {list.map((order) => (
                  <li key={order.id}>
                    <Link to={`/order/${order.id}`}>
                      <div className="order-list-art">
                        {order.quote.lines.slice(0, 3).map((line) => (
                          <ProductArt key={`${line.product.id}:${line.color.id}:${line.size}`} kind={line.product.art} paint={line.color} />
                        ))}
                      </div>
                      <div>
                        <strong>{order.id}</strong>
                        <span className="muted">
                          {formatDate(order.placedAt)} · {order.quote.itemCount} item{order.quote.itemCount === 1 ? "" : "s"} · {formatTotal(order.quote.total)}
                        </span>
                        <span className="order-status">Confirmed · arrives by {formatDate(order.estimatedDelivery)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </AsyncView>
        <p className="muted small">
          This demo keeps orders in the server's memory, so older orders may disappear when the server restarts.
        </p>
      </section>

      <details className="accordion dev-details">
        <summary>Developer details</summary>
        <p className="muted">What the KINETIK API verified from your Auth0 access token (RS256, checked against the tenant's JWKS):</p>
        <AsyncView result={me} loading={<Spinner />}>
          {(member) =>
            member ? (
              <dl className="dev-grid">
                <dt>User ID (sub)</dt>
                <dd><code>{member.sub}</code></dd>
                <dt>Scopes</dt>
                <dd><code>{member.scopes.join(" ") || "none"}</code></dd>
                <dt>Issuer</dt>
                <dd><code>https://{auth0Config.domain}/</code></dd>
                <dt>Audience</dt>
                <dd><code>{auth0Config.audience}</code></dd>
                <dt>Client ID</dt>
                <dd><code>{auth0Config.clientId}</code></dd>
              </dl>
            ) : null}
        </AsyncView>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Photo credits
// ---------------------------------------------------------------------------

export function CreditsPage() {
  return (
    <div className="container page credits-page">
      <h1 className="page-title">Photo Credits</h1>
      <p>
        All photographs on this demo site are released under CC0 (public domain) by their creators on StockSnap and rawpixel, found
        through Openverse. Attribution isn't required, but we're grateful, so here they are. Product images are illustrations of
        fictional KINETIK products.
      </p>
      <ul className="credits">
        {(Object.keys(photos) as Array<PhotoName>).map((name) => {
          const photo = photos[name]
          return (
            <li key={name}>
              <Photo name={name} />
              <div>
                <strong>{photo.title}</strong>
                <br />
                <span>
                  by {photo.creator} · {photo.source} · CC0 · <a href={photo.landing} target="_blank" rel="noreferrer">source</a>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
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
