import { useAtomValue } from "@effect/atom-react"
import { Link } from "react-router"
import { FREE_DELIVERY_THRESHOLD } from "../../shared/Pricing.ts"
import { ProductArt, RoomScene } from "../art/ProductArt.tsx"
import { ReturnIcon, StoreIcon, TruckIcon, CheckIcon } from "../components/Icons.tsx"
import { AsyncView, ProductGrid, ProductRail, SectionHeader } from "../components/ui.tsx"
import { formatMoney } from "../format.ts"
import { scenes } from "../scenes.ts"
import { categoriesAtom, productsAtom, roomsAtom } from "../state.ts"

export function HomePage() {
  const categories = useAtomValue(categoriesAtom)
  const rooms = useAtomValue(roomsAtom)
  const popular = useAtomValue(productsAtom({ sort: "popular" }))
  const newest = useAtomValue(productsAtom({ sort: "newest" }))

  return (
    <div className="home">
      <section className="hero">
        <RoomScene {...scenes["living-room"]} label="A calm living room with a sage sofa" className="hero-art" />
        <div className="hero-card">
          <span className="eyebrow">New season</span>
          <h1>Make room for slow mornings</h1>
          <p>Soft sofas, warm light and natural textures. Everything you need for a living room that feels like a deep breath.</p>
          <div className="hero-actions">
            <Link to="/room/living-room" className="button button-primary">Shop the living room</Link>
            <Link to="/products" className="button button-outline">All products</Link>
          </div>
        </div>
      </section>

      <section className="container section">
        <SectionHeader title="Shop by category" link="/products" />
        <AsyncView result={categories}>
          {(list) => (
            <div className="category-scroller">
              {list.map((category) => (
                <Link key={category.id} to={`/category/${category.id}`} className="category-tile">
                  <ProductArt
                    kind={category.art}
                    color={(sample[category.art] ?? fallback)[0]}
                    accent={(sample[category.art] ?? fallback)[1]}
                    tint={category.tint}
                  />
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          )}
        </AsyncView>
      </section>

      <section className="container section">
        <div className="offer-banner">
          <div>
            <span className="eyebrow">Lower price</span>
            <h2>Same great quality, new lower prices</h2>
            <p>We've lowered prices on some of our favourites. Same design, same quality — just more affordable.</p>
            <Link to="/products?filter=offers" className="button button-light">Shop lower prices</Link>
          </div>
          <AsyncView result={popular} loading={null}>
            {(list) => <ProductRail products={list.filter((p) => p.previousPrice !== undefined)} />}
          </AsyncView>
        </div>
      </section>

      <section className="container section">
        <SectionHeader title="Shop by room" />
        <AsyncView result={rooms}>
          {(list) => (
            <div className="room-grid">
              {list.map((room, index) => (
                <Link key={room.id} to={`/room/${room.id}`} className={`room-tile ${index === 0 ? "room-tile-large" : ""}`}>
                  <RoomScene {...scenes[room.id]} label={room.name} />
                  <div className="room-tile-label">
                    <strong>{room.name}</strong>
                    <span>{room.tagline}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </AsyncView>
      </section>

      <section className="container section">
        <SectionHeader title="Top sellers" link="/products?sort=popular" />
        <AsyncView result={popular}>{(list) => <ProductGrid products={list.slice(0, 8)} />}</AsyncView>
      </section>

      <section className="container section">
        <SectionHeader title="New in" link="/products?sort=newest" />
        <AsyncView result={newest}>{(list) => <ProductRail products={list.slice(0, 8)} />}</AsyncView>
      </section>

      <section className="container section">
        <ul className="value-props">
          <li>
            <TruckIcon />
            <div>
              <strong>Free delivery over {formatMoney(FREE_DELIVERY_THRESHOLD).replace(".00", "")}</strong>
              <span>Delivered to your door in 3–5 days</span>
            </div>
          </li>
          <li>
            <StoreIcon />
            <div>
              <strong>Free click &amp; collect</strong>
              <span>Pick up from a collection point near you</span>
            </div>
          </li>
          <li>
            <ReturnIcon />
            <div>
              <strong>365 days to change your mind</strong>
              <span>Return anything within a year</span>
            </div>
          </li>
          <li>
            <CheckIcon />
            <div>
              <strong>10-year guarantee</strong>
              <span>On sofa frames and wardrobes</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  )
}

const fallback: readonly [string, string] = ["#C89B6D", "#C89B6D"]
const sample: Partial<Record<string, readonly [string, string]>> = {
  sofa: ["#8FA58A", "#C89B6D"],
  armchair: ["#C56A4A", "#C89B6D"],
  "dining-table": ["#D9B48A", "#D9B48A"],
  bed: ["#7F93A8", "#C89B6D"],
  bookcase: ["#F4F1EA", "#F4F1EA"],
  "floor-lamp": ["#EFE6D2", "#B8913E"],
  plant: ["#ECE7DE", "#5E8A5F"],
  cushion: ["#D1A33F", "#FFFFFF"],
  mugs: ["#7E95A3", "#F1ECE3"],
  lounger: ["#6E8FB0", "#9C6B43"]
}
