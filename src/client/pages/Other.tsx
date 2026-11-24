import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import type { Order } from "../../shared/Domain.ts"
import { OrderId } from "../../shared/Domain.ts"
import { deliveryOptions } from "../../shared/Pricing.ts"
import { LogoMark, ProductArt } from "../art/ProductArt.tsx"
import { auth0Config, authAtom, guestAtom, guestSessions, type MemberProfile, useAuthActions } from "../auth.tsx"
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
  return auth.isAuthenticated && auth.user ? <MemberAccount user={auth.user} /> : <GoToSignIn />
}

const AUTO_SIGN_IN_KEY = "kinetik.autoSignIn"

/**
 * Signed-out visitors go straight to the Auth0 login ("Enter your email to
 * join us or sign in"), like large sportswear stores, instead of an extra
 * page. If we sent them there in the last minute and they came back without
 * signing in (cancelled, or an error), show the Join / Sign In page instead
 * so there is no redirect loop.
 */
function GoToSignIn() {
  const [params] = useSearchParams()
  const { signIn } = useAuthActions()
  const returnTo = params.get("from") === "checkout" ? "/checkout" : "/account"
  const [fallback] = useState(() => {
    try {
      const last = Number(sessionStorage.getItem(AUTO_SIGN_IN_KEY) || 0)
      return Date.now() - last < 60_000 || params.has("error")
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (fallback) return
    try {
      sessionStorage.setItem(AUTO_SIGN_IN_KEY, String(Date.now()))
    } catch {
      // Storage blocked: still go; the error check above prevents loops.
    }
    signIn(returnTo)
  }, [fallback])
  if (fallback) return <JoinOrSignIn />
  return (
    <div className="container page">
      <Spinner label="Taking you to sign in" />
    </div>
  )
}

function JoinOrSignIn() {
  const [params] = useSearchParams()
  const { signIn, join } = useAuthActions()
  const guest = useAtomValue(guestAtom)
  const fromCheckout = params.get("from") === "checkout"
  const returnTo = fromCheckout ? "/checkout" : "/account"
  return (
    <div className="container page account-page">
      <div className="account-stack">
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
          {guest ? (
            <p className="guest-note">
              You're shopping as a guest. When you join or sign in, your guest orders come with you.
            </p>
          ) : null}
          <button type="button" className="button button-primary button-lg button-block" onClick={() => join(returnTo)}>
            Join Us
          </button>
          <button type="button" className="button button-outline button-lg button-block" onClick={() => signIn(returnTo)}>
            Sign In
          </button>
          <p className="muted small">Secure sign-in powered by Auth0.</p>
          {fromCheckout ? <Link to="/checkout" className="text-link">Continue as guest</Link> : null}
        </div>

        {guest ? (
          <section className="member-section guest-section">
            <h2>Your Guest Orders</h2>
            <OrdersList emptyMessage="No guest orders yet. Orders you place as a guest in this browser show up here." />
            <DeveloperDetails
              intro="This browser has an Auth0 anonymous session, so the KINETIK API sees a guest identity without a login:"
            />
          </section>
        ) : null}
      </div>
    </div>
  )
}

function MemberAccount({ user }: { user: MemberProfile }) {
  const { signOut } = useAuthActions()
  const me = useAtomValue(meAtom)
  const linked = AsyncResult.isSuccess(me) ? me.value?.linkedAnonymousId : undefined
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

      {linked ? (
        <p className="member-note">
          <span>
            <CheckIcon size={16} /> We brought your guest activity with you: orders from your guest session (<code>{linked}</code>) are now in
            your account.
          </span>
        </p>
      ) : null}

      <section className="member-section">
        <h2>Your Orders</h2>
        <OrdersList emptyMessage="No orders yet. Orders you place while signed in will show up here." />
        <p className="muted small">
          This demo keeps orders in the server's memory, so older orders may disappear when the server restarts.
        </p>
      </section>

      <DeveloperDetails intro="What the KINETIK API verified from your Auth0 access token (RS256, checked against the tenant's JWKS):" />
    </div>
  )
}

/**
 * Orders without the sign-in redirect: guests see the orders of this
 * browser's guest session, members their order history.
 */
export function OrdersPage() {
  const auth = useAtomValue(authAtom)
  const guest = useAtomValue(guestAtom)
  const { signIn } = useAuthActions()
  if (auth.isLoading) {
    return (
      <div className="container page">
        <Spinner label="Loading your orders" />
      </div>
    )
  }
  return (
    <div className="container page orders-page">
      <h1>Your Orders</h1>
      {auth.isAuthenticated ? (
        <OrdersList emptyMessage="No orders yet. When you place one, it shows up here." />
      ) : (
        <>
          <p className="muted">
            You're shopping as a guest. These are the orders placed in this browser.{" "}
            <button type="button" className="text-link link-button" onClick={() => signIn("/orders")}>Sign in</button>{" "}
            to see your full order history; your guest orders come with you.
          </p>
          {guest ? (
            <OrdersList emptyMessage="No guest orders yet. Orders you place as a guest in this browser show up here." />
          ) : (
            <p className="muted">No guest orders in this browser.</p>
          )}
          <StartOverAsGuest />
        </>
      )}
    </div>
  )
}

/** Demo helper: forget this browser's guest session and shopping state. */
export function StartOverAsGuest({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const reset = async () => {
    if (!window.confirm("Start over as a new guest? This clears your bag, remembered email, country and guest session in this browser.")) return
    setBusy(true)
    await guestSessions.reset()
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("kinetik.")) localStorage.removeItem(key)
      sessionStorage.clear()
    } catch {
      // Storage blocked: the guest session itself is already gone.
    }
    window.location.assign("/")
  }
  return (
    <button type="button" className={compact ? "link-button footer-reset" : "button button-outline"} onClick={reset} disabled={busy}>
      {busy ? "Starting over…" : "Start over as a new guest"}
    </button>
  )
}

function OrdersList({ emptyMessage }: { emptyMessage: string }) {
  const orders = useAtomValue(myOrdersAtom)
  return (
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
            <p>{emptyMessage}</p>
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
  )
}

function DeveloperDetails({ intro }: { intro: string }) {
  const me = useAtomValue(meAtom)
  return (
    <details className="accordion dev-details">
      <summary>Developer details</summary>
      <p className="muted">{intro}</p>
      <AsyncView result={me} loading={<Spinner />}>
        {(member) =>
          member ? (
            <dl className="dev-grid">
              <dt>User ID (sub)</dt>
              <dd><code>{member.sub}</code></dd>
              <dt>Identity</dt>
              <dd>{member.anonymous ? "Auth0 anonymous session (guest)" : "Signed-in member"}</dd>
              <dt>Scopes</dt>
              <dd><code>{member.scopes.join(" ") || "none"}</code></dd>
              {member.linkedAnonymousId ? (
                <>
                  <dt>Transferred guest</dt>
                  <dd><code>{member.linkedAnonymousId}</code></dd>
                </>
              ) : null}
              {member.metadata ? (
                <>
                  <dt>{member.anonymous ? "Session metadata" : "Guest metadata"}</dt>
                  <dd><code>{JSON.stringify(member.metadata)}</code></dd>
                </>
              ) : null}
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
