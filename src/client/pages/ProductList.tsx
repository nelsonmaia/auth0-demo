import { useAtomValue } from "@effect/atom-react"
import { Option, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import type { ColorFamily as ColorFamilyType, Product, SportId as SportIdType } from "../../shared/Domain.ts"
import { CategoryId, ColorFamily, Gender, ProductSort, SportId } from "../../shared/Domain.ts"
import { CloseIcon, FilterIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, ProductGrid } from "../components/ui.tsx"
import { categoryLabel, genderLabel } from "../format.ts"
import { productsAtom, sportsAtom } from "../state.ts"

// URL parameters are untrusted input, so they are decoded with Schema too.
const decode = <S extends Schema.Codec<any, any>>(schema: S) => {
  const decodeOption = Schema.decodeUnknownOption(schema)
  return (value: string | null): S["Type"] | undefined => Option.getOrUndefined(decodeOption(value))
}
const decodeGender = decode(Gender)
const decodeCategory = decode(CategoryId)
const decodeSort = decode(ProductSort)
const decodeSport = decode(SportId)
const decodeFamily = decode(ColorFamily)

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : [])

const priceRanges = [
  { id: "0-50", label: "$0 – $50", test: (cents: number) => cents < 5_000 },
  { id: "50-100", label: "$50 – $100", test: (cents: number) => cents >= 5_000 && cents < 10_000 },
  { id: "100-150", label: "$100 – $150", test: (cents: number) => cents >= 10_000 && cents <= 15_000 },
  { id: "150+", label: "Over $150", test: (cents: number) => cents > 15_000 }
] as const

const familySwatch: Record<ColorFamilyType, string> = {
  black: "#111111",
  white: "#FFFFFF",
  grey: "#8D8D8D",
  blue: "#1D4ED8",
  green: "#3B7A3A",
  red: "#D30005",
  orange: "#FF7A1A",
  pink: "#F4A3C0",
  purple: "#7B3FB8",
  yellow: "#F5D90A",
  brown: "#8B5E3C"
}

const sortLabels: Record<typeof ProductSort.Type, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-desc": "Price: High-Low",
  "price-asc": "Price: Low-High"
}

function useFilters() {
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get("q") ?? undefined,
    gender: decodeGender(params.get("gender")),
    category: decodeCategory(params.get("category")),
    sort: decodeSort(params.get("sort")),
    sale: params.get("sale") === "1",
    sports: list(params.get("sport")).map(decodeSport).filter((s): s is SportIdType => s !== undefined),
    prices: list(params.get("price")),
    colors: list(params.get("color")).map(decodeFamily).filter((c): c is ColorFamilyType => c !== undefined)
  }

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const toggleIn = (key: string, current: ReadonlyArray<string>, value: string) =>
    update({ [key]: (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]).join(",") })

  return { filters, update, toggleIn, params }
}

type Filters = ReturnType<typeof useFilters>["filters"]

const applyClientFilters = (products: ReadonlyArray<Product>, filters: Filters) =>
  products
    .filter((p) => !filters.sale || p.previousPrice !== undefined)
    .filter((p) => filters.sports.length === 0 || filters.sports.includes(p.sport))
    .filter((p) => filters.prices.length === 0 || priceRanges.some((r) => filters.prices.includes(r.id) && r.test(p.price)))
    .filter((p) => filters.colors.length === 0 || p.colors.some((c) => filters.colors.includes(c.family)))

const titleFor = (filters: Filters, sportName: (id: SportIdType) => string) => {
  if (filters.q !== undefined) return `Results for “${filters.q}”`
  const parts: Array<string> = []
  if (filters.gender) parts.push(genderLabel[filters.gender])
  if (filters.sports.length === 1) parts.push(sportName(filters.sports[0]!))
  if (filters.category) parts.push(categoryLabel[filters.category])
  if (filters.sale) parts.push("Sale")
  if (parts.length === 0) return filters.sort === "newest" ? "New Arrivals" : "All Products"
  if (parts.length === 1 && filters.gender) return `${parts[0]} Products`
  return parts.join(" ")
}

export function ProductListPage() {
  const { filters, update, toggleIn } = useFilters()
  const [showFilters, setShowFilters] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const sports = useAtomValue(sportsAtom)
  const products = useAtomValue(
    productsAtom({ gender: filters.gender, category: filters.category, q: filters.q, sort: filters.sort })
  )

  useEffect(() => {
    document.body.classList.toggle("no-scroll", sheetOpen)
    return () => document.body.classList.remove("no-scroll")
  }, [sheetOpen])

  const sportName = (id: SportIdType) =>
    (AsyncResult.isSuccess(sports) ? sports.value.find((s) => s.id === id)?.name : undefined) ?? id
  const title = titleFor(filters, sportName)
  const visible = AsyncResult.isSuccess(products) ? applyClientFilters(products.value, filters) : undefined
  const activeCount =
    (filters.gender ? 1 : 0) + (filters.sale ? 1 : 0) + filters.sports.length + filters.prices.length + filters.colors.length

  const filterPanel = (
    <div className="filters">
      <nav className="filter-categories" aria-label="Categories">
        {(["shoes", "clothing", "accessories"] as const).map((category) => (
          <button
            type="button"
            key={category}
            className={filters.category === category ? "is-active" : undefined}
            onClick={() => update({ category: filters.category === category ? undefined : category })}
          >
            {categoryLabel[category]}
          </button>
        ))}
      </nav>

      <details className="filter-group" open>
        <summary>Gender {filters.gender ? "(1)" : ""}</summary>
        {(["men", "women", "kids"] as const).map((gender) => (
          <label key={gender} className="check">
            <input
              type="checkbox"
              checked={filters.gender === gender}
              onChange={() => update({ gender: filters.gender === gender ? undefined : gender })}
            />
            {gender === "kids" ? "Kids" : gender === "men" ? "Men" : "Women"}
          </label>
        ))}
      </details>

      <details className="filter-group" open>
        <summary>Sale &amp; Offers</summary>
        <label className="check">
          <input type="checkbox" checked={filters.sale} onChange={() => update({ sale: filters.sale ? undefined : "1" })} />
          Sale
        </label>
      </details>

      <details className="filter-group" open>
        <summary>Shop by Price {filters.prices.length ? `(${filters.prices.length})` : ""}</summary>
        {priceRanges.map((range) => (
          <label key={range.id} className="check">
            <input
              type="checkbox"
              checked={filters.prices.includes(range.id)}
              onChange={() => toggleIn("price", filters.prices, range.id)}
            />
            {range.label}
          </label>
        ))}
      </details>

      <details className="filter-group" open>
        <summary>Colour {filters.colors.length ? `(${filters.colors.length})` : ""}</summary>
        <div className="color-filter">
          {(Object.keys(familySwatch) as Array<ColorFamilyType>).map((family) => (
            <button
              type="button"
              key={family}
              className={filters.colors.includes(family) ? "is-active" : undefined}
              aria-pressed={filters.colors.includes(family)}
              onClick={() => toggleIn("color", filters.colors, family)}
            >
              <span style={{ background: familySwatch[family] }} />
              {family[0]!.toUpperCase() + family.slice(1)}
            </button>
          ))}
        </div>
      </details>

      <details className="filter-group" open>
        <summary>Sports {filters.sports.length ? `(${filters.sports.length})` : ""}</summary>
        {AsyncResult.isSuccess(sports)
          ? sports.value.map((sport) => (
            <label key={sport.id} className="check">
              <input
                type="checkbox"
                checked={filters.sports.includes(sport.id)}
                onChange={() => toggleIn("sport", filters.sports, sport.id)}
              />
              {sport.name}
            </label>
          ))
          : null}
      </details>
    </div>
  )

  const clearAll = () => update({ gender: undefined, sale: undefined, sport: undefined, price: undefined, color: undefined })

  return (
    <div className="listing">
      <div className="listing-bar container">
        <h1>
          {title} {visible ? <span className="listing-count">({visible.length})</span> : null}
        </h1>
        <div className="listing-actions">
          <button type="button" className="text-button desktop-only" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Hide Filters" : "Show Filters"} <FilterIcon size={20} />
          </button>
          <label className="sort-select">
            <span>Sort By</span>
            <select value={filters.sort ?? "featured"} onChange={(e) => update({ sort: e.target.value === "featured" ? undefined : e.target.value })}>
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="listing-mobile-bar container">
        <div className="chip-row">
          {(["shoes", "clothing", "accessories"] as const).map((category) => (
            <button
              type="button"
              key={category}
              className={`chip ${filters.category === category ? "is-active" : ""}`}
              onClick={() => update({ category: filters.category === category ? undefined : category })}
            >
              {categoryLabel[category]}
            </button>
          ))}
        </div>
        <div className="listing-mobile-row">
          <span className="muted">{visible ? `${visible.length} Results` : ""}</span>
          <button type="button" className="button button-outline button-sm" onClick={() => setSheetOpen(true)}>
            Filter{activeCount ? ` (${activeCount})` : ""} <FilterIcon size={18} />
          </button>
        </div>
      </div>

      <div className={`listing-layout container ${showFilters ? "" : "filters-hidden"}`}>
        <aside className="listing-sidebar" aria-label="Filters">{filterPanel}</aside>
        <div className="listing-results">
          <AsyncView result={products}>
            {(_, waiting) =>
              visible && visible.length > 0 ? (
                <div className={waiting ? "is-waiting" : undefined}>
                  <ProductGrid products={visible} />
                </div>
              ) : (
                <ErrorState
                  message={filters.q ? `We couldn't find anything for “${filters.q}”. Try “running” or “hoodie”.` : "No products match these filters."}
                  action={
                    activeCount > 0 ? (
                      <button type="button" className="button button-primary" onClick={clearAll}>Clear filters</button>
                    ) : (
                      <Link to="/shop" className="button button-primary">Shop all products</Link>
                    )
                  }
                />
              )}
          </AsyncView>
        </div>
      </div>

      <div className={`sheet ${sheetOpen ? "is-open" : ""}`} aria-hidden={!sheetOpen}>
        <div className="sheet-head">
          <h2>Filter</h2>
          <button type="button" className="icon-button" aria-label="Close filters" onClick={() => setSheetOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body">
          <div className="sheet-sort">
            <h3>Sort By</h3>
            {Object.entries(sortLabels).map(([value, label]) => (
              <label key={value} className="check radio">
                <input
                  type="radio"
                  name="sort"
                  checked={(filters.sort ?? "featured") === value}
                  onChange={() => update({ sort: value === "featured" ? undefined : value })}
                />
                {label}
              </label>
            ))}
          </div>
          {filterPanel}
        </div>
        <div className="sheet-foot">
          <button type="button" className="button button-outline" onClick={clearAll}>Clear{activeCount ? ` (${activeCount})` : ""}</button>
          <button type="button" className="button button-primary" onClick={() => setSheetOpen(false)}>
            Apply{visible ? ` (${visible.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
