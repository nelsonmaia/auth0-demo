import { useAtom, useAtomValue } from "@effect/atom-react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router"
import { FREE_DELIVERY_THRESHOLD } from "../../shared/Pricing.ts"
import { LogoMark, ProductArt } from "../art/ProductArt.tsx"
import { authAtom, guestSessions, useAuthActions } from "../auth.tsx"
import { formatMoney } from "../format.ts"
import { SHOP_COUNTRIES, cartCountAtom, favouritesAtom, productsAtom, shopCountryAtom, toastAtom } from "../state.ts"
import { BagIcon, CheckIcon, ChevronRight, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons.tsx"
import { AsyncView, Price } from "./ui.tsx"

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="KINETIK home">
      <LogoMark size={30} />
      <span>KINETIK</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

type MenuLink = readonly [label: string, to: string]
interface Menu {
  readonly key: string
  readonly label: string
  readonly to: string
  readonly columns: ReadonlyArray<{ readonly title: string; readonly links: ReadonlyArray<MenuLink> }>
}

const genderMenu = (key: "men" | "women" | "kids", label: string): Menu => ({
  key,
  label,
  to: `/shop?gender=${key}`,
  columns: [
    {
      title: "Featured",
      links: [
        ["New Arrivals", `/shop?gender=${key}&sort=newest`],
        ["Bestsellers", `/shop?gender=${key}`],
        ["Sale", `/shop?gender=${key}&sale=1`]
      ]
    },
    {
      title: "Shoes",
      links: [
        ["All Shoes", `/shop?gender=${key}&category=shoes`],
        ["Running", `/shop?gender=${key}&category=shoes&sport=running`],
        ["Lifestyle", `/shop?gender=${key}&category=shoes&sport=lifestyle`],
        ["Training & Gym", `/shop?gender=${key}&category=shoes&sport=training`],
        ["Basketball", `/shop?gender=${key}&category=shoes&sport=basketball`],
        ["Trail", `/shop?gender=${key}&category=shoes&sport=trail`]
      ]
    },
    {
      title: "Clothing",
      links: [
        ["All Clothing", `/shop?gender=${key}&category=clothing`],
        ["Running", `/shop?gender=${key}&category=clothing&sport=running`],
        ["Training", `/shop?gender=${key}&category=clothing&sport=training`],
        ["Lifestyle", `/shop?gender=${key}&category=clothing&sport=lifestyle`]
      ]
    },
    {
      title: "Accessories",
      links: [["All Accessories", `/shop?gender=${key}&category=accessories`]]
    }
  ]
})

export const menus: ReadonlyArray<Menu> = [
  {
    key: "new",
    label: "New & Featured",
    to: "/shop?sort=newest",
    columns: [
      {
        title: "New & Featured",
        links: [
          ["New Arrivals", "/shop?sort=newest"],
          ["Bestsellers", "/shop"],
          ["Sale", "/shop?sale=1"]
        ]
      },
      {
        title: "Shop Icons",
        links: [
          ["Tempo Runner 3", "/search?q=tempo"],
          ["Halo Low '84", "/search?q=halo"],
          ["Vector Elite", "/product/vector-elite"],
          ["Thermal Fleece", "/search?q=fleece"]
        ]
      },
      {
        title: "Shop by Sport",
        links: [
          ["Running", "/shop?sport=running"],
          ["Training & Gym", "/shop?sport=training"],
          ["Basketball", "/shop?sport=basketball"],
          ["Trail", "/shop?sport=trail"],
          ["Lifestyle", "/shop?sport=lifestyle"]
        ]
      }
    ]
  },
  genderMenu("men", "Men"),
  genderMenu("women", "Women"),
  genderMenu("kids", "Kids"),
  {
    key: "sale",
    label: "Sale",
    to: "/shop?sale=1",
    columns: [
      {
        title: "Sale",
        links: [
          ["Shop All Sale", "/shop?sale=1"],
          ["Shoes", "/shop?sale=1&category=shoes"],
          ["Clothing", "/shop?sale=1&category=clothing"]
        ]
      },
      {
        title: "Sale by Gender",
        links: [
          ["Men's Sale", "/shop?gender=men&sale=1"],
          ["Women's Sale", "/shop?gender=women&sale=1"]
        ]
      }
    ]
  }
]

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const popularTerms = ["running shoes", "halo low", "hoodie", "leggings", "slides", "trail"]

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const [debounced, setDebounced] = useState("")
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    document.body.classList.add("no-scroll")
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.classList.remove("no-scroll")
    }
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 200)
    return () => clearTimeout(timer)
  }, [value])

  const go = (q: string) => {
    if (!q.trim()) return
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
    onClose()
  }

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-panel">
        <div className="search-row container">
          <span className="search-logo"><LogoMark size={30} /></span>
          <form
            className="search-field"
            role="search"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              go(value)
            }}
          >
            <SearchIcon size={22} />
            <input
              ref={input}
              type="search"
              placeholder="Search"
              aria-label="Search products"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              enterKeyHint="search"
            />
          </form>
          <button type="button" className="text-button search-cancel" onClick={onClose}>Cancel</button>
        </div>
        <div className="search-body container">
          {debounced.length >= 2 ? (
            <SearchResults q={debounced} onPick={onClose} onSeeAll={() => go(debounced)} />
          ) : (
            <div className="search-popular">
              <p>Popular Search Terms</p>
              <div>
                {popularTerms.map((term) => (
                  <button type="button" key={term} className="chip" onClick={() => go(term)}>{term}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="search-backdrop" onClick={onClose} />
    </div>
  )
}

function SearchResults({ q, onPick, onSeeAll }: { q: string; onPick: () => void; onSeeAll: () => void }) {
  const results = useAtomValue(productsAtom({ q }))
  return (
    <AsyncView result={results} loading={<p className="muted">Searching…</p>}>
      {(list) =>
        list.length === 0 ? (
          <p className="muted">No results for “{q}”.</p>
        ) : (
          <>
            <div className="search-results">
              {list.slice(0, 6).map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="search-hit" onClick={onPick}>
                  <ProductArt kind={product.art} paint={product.colors[0]} />
                  <strong>{product.name}</strong>
                  <span>{product.subtitle}</span>
                  <Price product={product} />
                </Link>
              ))}
            </div>
            <button type="button" className="button button-outline" onClick={onSeeAll}>
              See all {list.length} results
            </button>
          </>
        )}
    </AsyncView>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({ onOpenMenu, onOpenSearch }: { onOpenMenu: () => void; onOpenSearch: () => void }) {
  const count = useAtomValue(cartCountAtom)
  const favourites = useAtomValue(favouritesAtom)
  const auth = useAtomValue(authAtom)
  const { signIn, join, signOut } = useAuthActions()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string | undefined>()
  const menu = menus.find((m) => m.key === openMenu)

  useEffect(() => setOpenMenu(undefined), [location.pathname, location.search])

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <span className="utility-brand">KINETIK Run Club</span>
          <nav aria-label="Help and account">
            <Link to="/shop">Find a Store</Link>
            <span aria-hidden="true">|</span>
            <a href="/api/docs">Help</a>
            <span aria-hidden="true">|</span>
            {auth.isAuthenticated && auth.user ? (
              <>
                <Link to="/account">Hi, {auth.user.firstName}</Link>
                <span aria-hidden="true">|</span>
                <button type="button" className="utility-button" onClick={() => signOut()}>Sign Out</button>
              </>
            ) : (
              <>
                <button type="button" className="utility-button" onClick={() => join()}>Join Us</button>
                <span aria-hidden="true">|</span>
                <button type="button" className="utility-button" onClick={() => signIn()}>Sign In</button>
              </>
            )}
          </nav>
        </div>
      </div>
      <div className="header-main" onMouseLeave={() => setOpenMenu(undefined)}>
        <div className="container header-row">
          <Logo />
          <nav className="main-nav" aria-label="Main">
            {menus.map((m) => (
              <Link
                key={m.key}
                to={m.to}
                className={openMenu === m.key ? "is-open" : undefined}
                onMouseEnter={() => setOpenMenu(m.key)}
                onFocus={() => setOpenMenu(m.key)}
              >
                {m.label}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <button type="button" className="search-pill" onClick={onOpenSearch} onMouseEnter={() => setOpenMenu(undefined)}>
              <SearchIcon size={22} />
              <span>Search</span>
            </button>
            <button type="button" className="icon-button search-icon-button" aria-label="Search" onClick={onOpenSearch}>
              <SearchIcon />
            </button>
            <Link
              to="/account"
              className={`icon-button account-link ${auth.isAuthenticated ? "is-member" : ""}`}
              aria-label={auth.isAuthenticated ? "Your account" : "Sign in or join"}
            >
              {auth.user?.picture ? <img src={auth.user.picture} alt="" referrerPolicy="no-referrer" /> : <UserIcon />}
            </Link>
            <Link to="/favourites" className="icon-button favourites-link" aria-label={`Favourites (${favourites.length})`}>
              <HeartIcon />
            </Link>
            <Link to="/cart" className="icon-button bag-link" aria-label={`Bag, ${count} items`}>
              <BagIcon />
              {count > 0 ? <span className="bag-count">{count > 9 ? "9+" : count}</span> : null}
            </Link>
            <button type="button" className="icon-button menu-button" aria-label="Menu" onClick={onOpenMenu}>
              <MenuIcon />
            </button>
          </div>
        </div>
        {menu ? (
          <div className="mega-menu">
            <div className="container mega-inner">
              {menu.columns.map((column) => (
                <div key={column.title} className="mega-column">
                  <h3>{column.title}</h3>
                  {column.links.map(([label, to]) => (
                    <Link key={label} to={to}>{label}</Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function PromoBar() {
  const auth = useAtomValue(authAtom)
  const { join } = useAuthActions()
  return (
    <div className="promo">
      <strong>Move With Us</strong>
      {auth.isAuthenticated ? (
        <span>Members get free standard delivery on every order. Welcome back!</span>
      ) : (
        <span>
          Free delivery on orders over {formatMoney(FREE_DELIVERY_THRESHOLD)}, or on every order for members.{" "}
          <button type="button" className="link-button" onClick={() => join()}>Join Us</button>
        </span>
      )}
    </div>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useAtomValue(authAtom)
  const { signIn, join, signOut } = useAuthActions()
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
          <button type="button" className="icon-button" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="drawer-nav">
          {menus.map((m) => (
            <Link key={m.key} to={m.to}>
              {m.label} <ChevronRight size={22} />
            </Link>
          ))}
        </nav>
        {auth.isAuthenticated && auth.user ? (
          <div className="drawer-member">
            <p>Hi, {auth.user.firstName}. Members get free standard delivery on every order.</p>
            <div>
              <Link to="/account" className="button button-primary">Your Account</Link>
              <button type="button" className="button button-outline" onClick={() => signOut()}>Sign Out</button>
            </div>
          </div>
        ) : (
          <div className="drawer-member">
            <p>
              Become a KINETIK Member for the best products, inspiration and stories in sport. <Link to="/account">Learn more</Link>
            </p>
            <div>
              <button type="button" className="button button-primary" onClick={() => join()}>Join Us</button>
              <button type="button" className="button button-outline" onClick={() => signIn()}>Sign In</button>
            </div>
          </div>
        )}
        <nav className="drawer-links">
          <Link to="/cart"><BagIcon size={22} /> Bag</Link>
          <Link to="/favourites"><HeartIcon size={22} /> Favourites</Link>
          <Link to="/account"><CheckIcon size={22} /> Orders</Link>
        </nav>
      </aside>
    </div>
  )
}

function AddedToBag() {
  const [toast, setToast] = useAtom(toastAtom)
  const count = useAtomValue(cartCountAtom)
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
    <div className="added" role="status" aria-live="polite" key={toast.id}>
      <div className="added-head">
        <span><CheckIcon size={20} /> Added to Bag</span>
        <button type="button" className="icon-button" aria-label="Close" onClick={() => setToast(undefined)}>
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="added-product">
        <ProductArt kind={toast.product.art} paint={color} />
        <div>
          <strong>{toast.product.name}</strong>
          <span>{toast.product.subtitle}</span>
          <span>Size {toast.size}</span>
          <Price product={toast.product} />
        </div>
      </div>
      <div className="added-actions">
        <Link to="/cart" className="button button-outline">View Bag ({count})</Link>
        <Link to="/checkout" className="button button-primary">Checkout</Link>
      </div>
    </div>
  )
}

/**
 * Shopping country. Saved locally and, for guests, pushed straight to the
 * Auth0 anonymous session (`shop_country`), so the next sign-in can be placed
 * in an Experiment Center segment by it (e.g. passkeys for UK shoppers only).
 */
function CountryPicker() {
  const [country, setCountry] = useAtom(shopCountryAtom)
  const auth = useAtomValue(authAtom)
  return (
    <label className="country-picker">
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">Shopping country</span>
      <select
        value={country}
        onChange={(e) => {
          const next = e.target.value as typeof country
          setCountry(next)
          if (!auth.isAuthenticated) guestSessions.setMetadata({ shop_country: next }).catch(() => undefined)
        }}
      >
        {SHOP_COUNTRIES.map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </label>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h4>Resources</h4>
          <Link to="/shop?sort=newest">New Arrivals</Link>
          <Link to="/shop">All Products</Link>
          <Link to="/account">Become a Member</Link>
          <a href="/api/docs">API Docs</a>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/cart">Your Bag</Link>
          <Link to="/favourites">Favourites</Link>
          <Link to="/account">Order Status</Link>
          <span>Delivery &amp; Returns</span>
        </div>
        <div>
          <h4>Company</h4>
          <span>About KINETIK</span>
          <span>Sustainability</span>
          <Link to="/credits">Photo Credits</Link>
        </div>
        <div className="footer-locale">
          <CountryPicker />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} KINETIK — a demo store. Not a real shop; no payments are taken.</span>
        <span>Built with Effect, React and Vite</span>
      </div>
    </footer>
  )
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
      <PromoBar />
      <MobileMenu open={menuOpen} onClose={closeMenu} />
      {searchOpen ? <SearchOverlay onClose={closeSearch} /> : null}
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <AddedToBag />
      <ScrollRestoration />
    </>
  )
}
