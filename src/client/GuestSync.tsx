import { useAtomValue } from "@effect/atom-react"
import { useEffect } from "react"
import { authAtom, guestAtom, guestSessions } from "./auth.tsx"
import { cartCountAtom, lastViewedAtom } from "./state.ts"
import { effectiveCountry, shopCountryAtom, useDetectedCountry } from "./geo.ts"

/**
 * Keeps a guest's Auth0 anonymous session metadata up to date: how many items
 * are in the bag and the last product viewed. Auth0 maps these into the guest's
 * access token (claims mapping) and hands them over at sign-in. The shopping
 * country (`shop_country`) also feeds Experiment Center segments.
 */
export function GuestSync() {
  const auth = useAtomValue(authAtom)
  const guest = useAtomValue(guestAtom)
  const bagItems = useAtomValue(cartCountAtom)
  const lastViewed = useAtomValue(lastViewedAtom)
  const shopCountry = useAtomValue(shopCountryAtom)
  const detected = useDetectedCountry()
  const country = effectiveCountry(shopCountry, detected)

  useEffect(() => {
    if (auth.isLoading || auth.isAuthenticated || !guest) return
    const metadata: Record<string, string> = { bag_items: String(bagItems), shop_country: country }
    if (lastViewed) metadata.last_viewed = lastViewed
    const timer = setTimeout(() => {
      guestSessions.setMetadata(metadata).catch(() => undefined)
    }, 1500)
    return () => clearTimeout(timer)
  }, [auth.isLoading, auth.isAuthenticated, guest?.sub, bagItems, lastViewed, country])

  return null
}
