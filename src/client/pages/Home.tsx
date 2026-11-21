import { useAtomValue } from "@effect/atom-react"
import { Link } from "react-router"
import type { SportId } from "../../shared/Domain.ts"
import { Photo } from "../components/Photo.tsx"
import { AsyncView, Carousel, ProductCarousel } from "../components/ui.tsx"
import type { PhotoName } from "../photos.ts"
import { productsAtom, sportsAtom } from "../state.ts"

export const sportPhoto: Record<SportId, PhotoName> = {
  running: "sport-running",
  training: "sport-training",
  lifestyle: "sport-lifestyle",
  basketball: "sport-basketball",
  trail: "sport-trail"
}

export function HomePage() {
  const newest = useAtomValue(productsAtom({ sort: "newest" }))
  const featured = useAtomValue(productsAtom({ sort: "featured" }))
  const sports = useAtomValue(sportsAtom)

  return (
    <div className="home">
      <section className="hero">
        <Link to="/shop?sport=running" className="hero-visual" aria-label="Shop running">
          <Photo name="hero-sprint" className="hero-photo" priority />
        </Link>
        <div className="hero-copy container">
          <p className="hero-kicker">KINETIK Running</p>
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
          <Link to="/shop?sport=basketball" className="feature-tile">
            <Photo name="feature-hoop" />
            <div className="tile-copy is-light">
              <span>KINETIK Basketball</span>
              <strong>Rise Above</strong>
              <span className="button button-light">Shop</span>
            </div>
          </Link>
          <Link to="/search?q=fleece" className="feature-tile">
            <Photo name="feature-fleece" />
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
                  <Photo name={sportPhoto[sport.id]} />
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
            <Photo name="essentials-men" />
            <span className="button button-light">Men's</span>
          </Link>
          <Link to="/shop?gender=women" className="essential-tile">
            <Photo name="essentials-women" />
            <span className="button button-light">Women's</span>
          </Link>
          <Link to="/shop?gender=kids" className="essential-tile">
            <Photo name="essentials-kids" />
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
