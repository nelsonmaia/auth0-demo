const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

/** Formats an integer amount of cents: 13000 → "$130", 8997 → "$89.97". */
export const formatMoney = (cents: number) => {
  const formatted = currency.format(cents / 100)
  return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted
}

/** Always shows cents, for totals: 13000 → "$130.00". */
export const formatTotal = (cents: number) => currency.format(cents / 100)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

export const genderLabel = { men: "Men's", women: "Women's", kids: "Kids'" } as const
export const categoryLabel = { shoes: "Shoes", clothing: "Clothing", accessories: "Accessories" } as const
