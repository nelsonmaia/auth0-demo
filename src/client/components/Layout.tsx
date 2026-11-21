import { useAtomValue, useAtom } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState, type FormEvent } from "react"
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate, useSearchParams } from "react-router"
import { FREE_DELIVERY_THRESHOLD } from "../../shared/Pricing.ts"
import { ProductArt } from "../art/ProductArt.tsx"
import { formatMoney } from "../format.ts"
import { cartCountAtom, categoriesAtom, favouritesAtom, roomsAtom, toastAtom } from "../state.ts"
import { BagIcon, CheckIcon, ChevronRight, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons.tsx"
import { Price } from "./ui.tsx"

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Nordhem home">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand)" />
        <path d="M7 24V14l9-7 9 7v10h-6v-6h-6v6Z" fill="var(--brand-contrast)" />
      </svg>
      <span>NORDHEM</span>
    </Link>
  )
}

function SearchBar({ onSubmitted }: { onSubmitted?: () => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const [value, setValue] = useState(location.pathname === "/search" ? params.get("q") ?? "" : "")

  useEffect(() => {
    if (location.pathname !== "/search") setValue("")
  }, [location.pathname])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = value.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
      onSubmitted?.()
    }
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <SearchIcon size={20} />
      <input
        type="search"
        name="q"
        placeholder="What are you looking for?"
        aria-label="Search products"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        enterKeyHint="search"
      />
    </form>
  )
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const count = useAtomValue(cartCountAtom)
  const favourites = useAtomValue(favouritesAtom)
  return (
    <header className="site-header">
      <div className="promo-bar">
        <span>Free home delivery on orders over {formatMoney(FREE_DELIVERY_THRESHOLD).replace(".00", "")}</span>
        <span className="promo-sep" aria-hidden="true">·</span>
        <span className="promo-extra">365 days to change your mind</span>
      </div>
      <div className="header-main container">
        <button type="button" className="icon-button menu-button" aria-label="Open menu" onClick={onOpenMenu}>
          <MenuIcon />
        </button>
        <Logo />
        <div className="header-search">
          <SearchBar />
        </div>
        <nav className="header-actions" aria-label="Account and bag">
          <Link to="/account" className="header-action account-action">
            <UserIcon />
            <span className="header-action-label">Hej! Log in</span>
          </Link>
          <Link to="/favourites" className="header-action" aria-label={`Favourites (${favourites.length})`}>
            <HeartIcon />
            {favourites.length > 0 ? <span className="count-dot muted">{favourites.length}</span> : null}
          </Link>
          <Link to="/cart" className="header-action" aria-label={`Shopping bag (${count} items)`}>
            <BagIcon />
            {count > 0 ? <span className="count-dot">{count > 99 ? "99+" : count}</span> : null}
          </Link>
        </nav>
      </div>
      <div className="header-search-mobile container">
        <SearchBar />
      </div>
      <MainNav />
    </header>
  )
}

const mainLinks: ReadonlyArray<{ to: string; label: string; match: (path: string, search: URLSearchParams) => boolean }> = [
  { to: "/products", label: "All products", match: (p, q) => p === "/products" && !q.get("filter") && q.get("sort") !== "newest" },
  { to: "/room/living-room", label: "Rooms", match: (p) => p.startsWith("/room/") },
  { to: "/products?sort=newest", label: "New in", match: (p, q) => p === "/products" && q.get("sort") === "newest" },
  { to: "/products?filter=offers", label: "Lower price", match: (p, q) => p === "/products" && q.get("filter") === "offers" },
  ...(["sofas", "storage", "lighting", "textiles", "outdoor"] as const).map((id) => ({
    to: `/category/${id}`,
    label: id[0]!.toUpperCase() + id.slice(1),
    match: (p: string) => p === `/category/${id}`
  }))
]

function MainNav() {
  const location = useLocation()
  const search = new URLSearchParams(location.search)
  return (
    <nav className="header-nav container" aria-label="Main">
      {mainLinks.map((link) => {
        const active = link.match(location.pathname, search)
        return (
          <Link key={link.to} to={link.to} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useAtomValue(categoriesAtom)
  const rooms = useAtomValue(roomsAtom)
  const location = useLocation()
  useEffect(onClose, [location.pathname, location.search])
  useEffect(() => {
    document.body.classList.toggle("no-scroll", open)
  }, [open])

  return (
    <div className={`drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel" aria-label="Menu">
        <div className="drawer-head">
          <Logo />
          <button type="button" className="icon-button" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="drawer-nav">
          <Link to="/products">All products <ChevronRight size={18} /></Link>
          <Link to="/products?sort=newest">New in <ChevronRight size={18} /></Link>
          <Link to="/products?filter=offers">Lower price <ChevronRight size={18} /></Link>
          <h3>Products</h3>
          {AsyncResult.isSuccess(categories)
            ? categories.value.map((category) => (
              <Link key={category.id} to={`/category/${category.id}`}>
                {category.name} <ChevronRight size={18} />
              </Link>
            ))
            : null}
          <h3>Rooms</h3>
          {AsyncResult.isSuccess(rooms)
            ? rooms.value.map((room) => (
              <Link key={room.id} to={`/room/${room.id}`}>
                {room.name} <ChevronRight size={18} />
              </Link>
            ))
            : null}
          <h3>Your account</h3>
          <Link to="/account">Log in or sign up <ChevronRight size={18} /></Link>
          <Link to="/favourites">Favourites <ChevronRight size={18} /></Link>
          <Link to="/cart">Shopping bag <ChevronRight size={18} /></Link>
        </nav>
      </aside>
    </div>
  )
}

function AddedToBagToast() {
  const [toast, setToast] = useAtom(toastAtom)
  const location = useLocation()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(undefined), 6000)
    return () => clearTimeout(timer)
  }, [toast, setToast])

  useEffect(() => setToast(undefined), [location.pathname, setToast])

  if (!toast) return null
  const color = toast.product.colors.find((c) => c.id === toast.colorId) ?? toast.product.colors[0]
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <div className="toast-head">
        <span className="toast-title">
          <CheckIcon size={18} /> Added to your bag
        </span>
        <button type="button" className="icon-button" aria-label="Close" onClick={() => setToast(undefined)}>
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="toast-product">
        <ProductArt kind={toast.product.art} color={color.hex} accent={toast.product.accent} className="toast-art" />
        <div>
          <strong>{toast.product.name}</strong>
          <span>{toast.product.type}, {color.name.toLowerCase()}</span>
          <span>Qty {toast.quantity} · <Price cents={toast.product.price * toast.quantity} size="sm" /></span>
        </div>
      </div>
      <div className="toast-actions">
        <Link to="/cart" className="button button-primary">Go to bag</Link>
        <button type="button" className="button button-ghost" onClick={() => setToast(undefined)}>Continue shopping</button>
      </div>
    </div>
  )
}

function Footer() {
  const [subscribed, setSubscribed] = useState(false)
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>Affordable, thoughtfully designed furniture and home accessories for everyday life.</p>
          {subscribed ? (
            <p className="footer-thanks"><CheckIcon size={18} /> Thanks! You're on the list.</p>
          ) : (
            <form
              className="newsletter"
              onSubmit={(event) => {
                event.preventDefault()
                setSubscribed(true)
              }}
            >
              <label htmlFor="newsletter-email">Get inspiration and offers by email</label>
              <div>
                <input id="newsletter-email" type="email" required placeholder="you@example.com" />
                <button type="submit" className="button button-light">Sign up</button>
              </div>
            </form>
          )}
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?filter=offers">Lower price</Link>
          <Link to="/products?sort=newest">New in</Link>
          <Link to="/room/living-room">Shop by room</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/cart">Your bag</Link>
          <Link to="/favourites">Favourites</Link>
          <Link to="/account">Your account</Link>
          <a href="/api/docs">API docs</a>
        </div>
        <div>
          <h4>Services</h4>
          <span>Home delivery</span>
          <span>Click &amp; collect</span>
          <span>Assembly service</span>
          <span>365-day returns</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Nordhem — a demo store. Not a real shop; no payments are taken.</span>
        <span>Built with Effect, React and Vite</span>
      </div>
    </footer>
  )
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <AddedToBagToast />
      <ScrollRestoration />
    </>
  )
}
