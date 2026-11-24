import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Schema } from "effect"
import { Atom } from "effect/reactivity"
import { useEffect, useState } from "react"

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)


/**
 * The visitor's country as detected by the host (Vercel IP lookup through
 * /api/geo), e.g. "GB". Fetched once per page load; null if unknown.
 */
let detected: Promise<string | null> | undefined

export function detectCountry(): Promise<string | null> {
  detected ??= fetch("/api/geo")
    .then((r) => (r.ok ? r.json() : { country: null }))
    .then((body: { country?: string | null }) => (typeof body.country === "string" ? body.country : null))
    .catch(() => null)
  return detected
}

export function useDetectedCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    detectCountry().then((c) => live && setCountry(c))
    return () => {
      live = false
    }
  }, [])
  return country
}

/**
 * The country written to the guest's Auth0 anonymous session (`shop_country`):
 * the shopper's pick, or the detected country while the picker is on
 * Automatic. "auto" only if detection failed.
 */
export function effectiveCountry(picked: string, detectedCountry: string | null): string {
  return picked !== "auto" ? picked : detectedCountry ?? "auto"
}

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * The shopping country picked in the footer ("auto" = use the visitor's
 * location). Sent to the guest's Auth0 anonymous session as `shop_country`,
 * where Experiment Center segments can match on it.
 */
export const SHOP_COUNTRIES = [
  ["auto", "Automatic (your location)"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["IE", "Ireland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["ES", "Spain"],
  ["PT", "Portugal"]
] as const

export const shopCountryAtom = Atom.kvs({
  runtime: storage,
  key: "kinetik.country.v1",
  schema: Schema.Literals(["auto", "GB", "US", "IE", "FR", "DE", "ES", "PT"]),
  defaultValue: () => "auto" as const
}).pipe(Atom.keepAlive)
