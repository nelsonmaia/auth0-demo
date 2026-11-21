import type { DeliveryMethod } from "./Domain.ts"

/** Standard delivery is free from this subtotal (in cents). */
export const FREE_DELIVERY_THRESHOLD = 5_000

export const deliveryOptions: ReadonlyArray<{
  readonly id: DeliveryMethod
  readonly label: string
  readonly description: string
  readonly days: number
}> = [
  { id: "standard", label: "Standard Delivery", description: "Arrives in 4–6 business days", days: 6 },
  { id: "express", label: "Express Delivery", description: "Arrives in 1–2 business days", days: 2 },
  { id: "pickup", label: "Pick Up", description: "Free pick-up at a partner store in 2–3 days", days: 3 }
]

/** Members (signed in with Auth0) always get free standard delivery. */
export const deliveryFee = (method: DeliveryMethod, subtotal: number, member = false): number => {
  switch (method) {
    case "pickup":
      return 0
    case "express":
      return 2_000
    case "standard":
      return member || subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 800
  }
}

export const deliveryDays = (method: DeliveryMethod): number =>
  deliveryOptions.find((option) => option.id === method)?.days ?? 6
