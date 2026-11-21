const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

/** Formats an integer amount of cents, e.g. 89900 → "$899.00". */
export const formatMoney = (cents: number) => currency.format(cents / 100)

/** Splits a price for the large-number / small-cents display. */
export const splitPrice = (cents: number) => {
  const dollars = Math.floor(cents / 100)
  const rest = cents % 100
  return {
    whole: new Intl.NumberFormat("en-US").format(dollars),
    cents: rest === 0 ? undefined : String(rest).padStart(2, "0")
  }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`
