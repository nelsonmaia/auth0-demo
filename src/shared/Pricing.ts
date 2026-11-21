import type { DeliveryMethod } from "./Domain.ts"

/** Standard delivery is free from this subtotal (in cents). */
export const FREE_DELIVERY_THRESHOLD = 50_000

export const deliveryOptions: ReadonlyArray<{
  readonly id: DeliveryMethod
  readonly label: string
  readonly description: string
  readonly days: number
}> = [
  { id: "standard", label: "Home delivery", description: "Delivered to your door in 3–5 working days", days: 5 },
  { id: "express", label: "Express delivery", description: "Next working day, 8am–6pm", days: 1 },
  { id: "pickup", label: "Click & collect", description: "Pick up at a collection point in 2 days", days: 2 }
]

export const deliveryFee = (method: DeliveryMethod, subtotal: number): number => {
  switch (method) {
    case "pickup":
      return 0
    case "express":
      return 4_900
    case "standard":
      return subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 2_900
  }
}

export const deliveryDays = (method: DeliveryMethod): number =>
  deliveryOptions.find((option) => option.id === method)?.days ?? 5
