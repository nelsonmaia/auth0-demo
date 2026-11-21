import { useAtomValue } from "@effect/atom-react"
import { Link } from "react-router"
import type { ArtKind, SportId } from "../../shared/Domain.ts"
import { ArtShape, type Paint } from "../art/ProductArt.tsx"
import { AsyncView, Carousel, ProductCarousel } from "../components/ui.tsx"
import { productsAtom, sportsAtom } from "../state.ts"

const paint = (primary: string, secondary: string, tertiary: string): Paint => ({ primary, secondary, tertiary })

/** A coloured tile with a big illustration, like a campaign photo. */
function ArtTile({
  kind,
  colors,
  background,
  tilt = 0,
  scale = 1,
  dy = 0,
  className = ""
}: {
  kind: ArtKind
  colors: Paint
  background: string
  tilt?: number
  scale?: number
  dy?: number
  className?: string
}) {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className={`art-tile ${className}`} aria-hidden="true">
      <rect width="400" height="400" fill={background} />
      <circle cx="200" cy="200" r="150" fill="#fff" opacity="0.12" />
      <g transform={`translate(0 ${dy}) rotate(${tilt} 200 200) translate(${200 - 200 * scale} ${200 - 200 * scale}) scale(${scale})`}>
        <ArtShape kind={kind} paint={colors} />
      </g>
    </svg>
  )
}

const sportArt: Record<SportId, { kind: ArtKind; colors: Paint; background: string }> = {
  running: { kind: "runner", colors: paint("#2A57D6", "#FF5A3C", "#F4F4F4"), background: "#D9E4FF" },
  training: { kind: "trainer", colors: paint("#5F6368", "#D4F33A", "#EDEDED"), background: "#E4E8D0" },
  lifestyle: { kind: "court-low", colors: paint("#FAFAFA", "#1F5E3B", "#F1EBDD"), background: "#E8E0D2" },
  basketball: { kind: "court-high", colors: paint("#FF6B1A", "#111111", "#FFFFFF"), background: "#FFD9C4" },
  trail: { kind: "trail", colors: paint("#5E6B3A", "#FF7A1A", "#D9CBB0"), background: "#DCE3CF" }
}

export function HomePage() {
  const newest = useAtomValue(productsAtom({ sort: "newest" }))
  const featured = useAtomValue(productsAtom({ sort: "featured" }))
  const sports = useAtomValue(sportsAtom)

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-visual">
          <span className="hero-word" aria-hidden="true">TEMPO</span>
          <svg viewBox="0 0 400 400" className="hero-shoe" role="img" aria-label="KINETIK Tempo Runner 3 in Racer Blue">
            <g className="hero-lines" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.7">
              <path d="M0 180 L60 180" />
              <path d="M-20 220 L40 220" />
              <path d="M10 260 L56 260" />
            </g>
            <ArtShape kind="runner" paint={paint("#2A57D6", "#FF5A3C", "#F4F4F4")} />
          </svg>
        </div>
        <div className="hero-copy container">
          <p className="hero-kicker">KINETIK Tempo Runner 3</p>
          <h1 className="display">Built for every mile</h1>
          <p className="hero-text">Responsive foam, breathable mesh and a fit that disappears. Ready for easy days, long days and race days.</p>
          <div className="hero-actions">
            <Link to="/product/tempo-runner-3-mens" className="button button-primary">Shop</Link>
            <Link to="/shop?sport=running" className="button button-primary">Shop Running</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">Featured</h2>
        <div className="featured-grid">
          <Link to="/product/rise-pro" className="feature-tile">
            <ArtTile kind="court-high" colors={paint("#5B2A86", "#F5C242", "#FFFFFF")} background="#F2C14E" tilt={-12} scale={0.95} dy={-56} />
            <div className="tile-copy">
              <span>KINETIK Rise Pro</span>
              <strong>Rise Above</strong>
              <span className="button button-light">Shop</span>
            </div>
          </Link>
          <Link to="/search?q=fleece" className="feature-tile">
            <ArtTile kind="hoodie" colors={paint("#C7B4E8", "#1A1A1A", "#C7B4E8")} background="#2B2B2B" scale={0.8} dy={-48} />
            <div className="tile-copy is-light">
              <span>Thermal Fleece</span>
              <strong>Fleece Season</strong>
              <span className="button button-light">Shop</span>
            </div>
          </Link>
        </div>
      </section>

      <div className="section">
        <AsyncView result={newest}>
          {(list) => <ProductCarousel title="Just In" link="/shop?sort=newest" products={list.slice(0, 10)} />}
        </AsyncView>
      </div>

      <div className="section">
        <AsyncView result={sports} loading={null}>
          {(list) => (
            <Carousel title="Shop by Sport" className="sport-carousel">
              {list.map((sport) => (
                <Link key={sport.id} to={`/shop?sport=${sport.id}`} className="carousel-item sport-tile">
                  <ArtTile {...sportArt[sport.id]} tilt={-8} scale={0.92} dy={-36} />
                  <span className="button button-light">{sport.name}</span>
                </Link>
              ))}
            </Carousel>
          )}
        </AsyncView>
      </div>

      <div className="section">
        <AsyncView result={featured} loading={null}>
          {(list) => <ProductCarousel title="Trending Now" link="/shop" products={list.slice(0, 10)} />}
        </AsyncView>
      </div>

      <section className="section container">
        <h2 className="section-title">The Essentials</h2>
        <div className="essentials-grid">
          <Link to="/shop?gender=men" className="essential-tile">
            <ArtTile kind="hoodie" colors={paint("#6E7176", "#F2F2F2", "#6E7176")} background="#E9E9E9" scale={0.85} dy={-24} />
            <span className="button button-light">Men's</span>
          </Link>
          <Link to="/shop?gender=women" className="essential-tile">
            <ArtTile kind="leggings" colors={paint("#5B2A55", "#7A3D72", "#5B2A55")} background="#F1E4EC" scale={0.85} dy={-24} />
            <span className="button button-light">Women's</span>
          </Link>
          <Link to="/shop?gender=kids" className="essential-tile">
            <ArtTile kind="runner" colors={paint("#3B82F6", "#D4F33A", "#FFFFFF")} background="#E1EEFF" tilt={-10} scale={0.9} dy={-30} />
            <span className="button button-light">Kids'</span>
          </Link>
        </div>
      </section>

      <section className="section container">
        <div className="member-band">
          <div>
            <p className="hero-kicker">KINETIK Membership</p>
            <h2 className="display">Become a member</h2>
            <p>Sign up for free. Get member-only products, early access to drops and free delivery on every order.</p>
          </div>
          <div className="hero-actions">
            <Link to="/account" className="button button-light">Join Us</Link>
            <Link to="/account" className="button button-outline-light">Sign In</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
