import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Cause, Exit, Option, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Address, CartLine, Contact, PlaceOrderRequest } from "../../shared/Domain.ts"
import { deliveryDays, deliveryFee } from "../../shared/Pricing.ts"
import { StoreIcon, TruckIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, Spinner } from "../components/ui.tsx"
import { formatDate, formatTotal } from "../format.ts"
import { authAtom, guestAtom, useAuthActions } from "../auth.tsx"
import { cartAtom, deliveryAtom, lastOrderAtom, placeMemberOrderAtom, placeOrderAtom, quoteAtom } from "../state.ts"
import { QuoteLines, SummaryTotals } from "./Cart.tsx"

type FieldName = "fullName" | "email" | "phone" | "line1" | "line2" | "city" | "postalCode" | "country"

// Each form field is validated with the same Schema the server uses.
const fieldSchemas: Record<FieldName, Schema.Top> = {
  fullName: Contact.fields.fullName,
  email: Contact.fields.email,
  phone: Schema.String,
  line1: Address.fields.line1,
  line2: Schema.String,
  city: Address.fields.city,
  postalCode: Address.fields.postalCode,
  country: Address.fields.country
}

const fieldMessages: Partial<Record<FieldName, string>> = {
  fullName: "Please enter your full name.",
  email: "Please enter a valid email address.",
  line1: "Please enter a valid address.",
  city: "Please enter a city.",
  postalCode: "Please enter a valid postal code.",
  country: "Please choose a country."
}

const countries = ["United States", "Canada", "United Kingdom", "Portugal", "Brazil", "Spain", "France", "Germany", "Netherlands", "Australia"]

const emptyForm: Record<FieldName, string> = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  postalCode: "",
  country: "United States"
}

const validate = (form: Record<FieldName, string>) => {
  const errors: Partial<Record<FieldName, string>> = {}
  for (const name of Object.keys(fieldSchemas) as Array<FieldName>) {
    const result = Schema.decodeUnknownOption(fieldSchemas[name] as Schema.Codec<unknown, unknown>)(form[name].trim())
    if (Option.isNone(result)) errors[name] = fieldMessages[name] ?? "Invalid value."
  }
  return errors
}

const arrivalDate = (days: number) => formatDate(new Date(Date.now() + days * 86_400_000).toISOString())

export function CheckoutPage() {
  const lines = useAtomValue(cartAtom)
  const [delivery, setDelivery] = useAtom(deliveryAtom)
  const quote = useAtomValue(quoteAtom)
  const auth = useAtomValue(authAtom)
  const guest = useAtomValue(guestAtom)
  const { signIn } = useAuthActions()
  const placeGuestOrder = useAtomSet(placeOrderAtom, { mode: "promiseExit" })
  const placeMemberOrder = useAtomSet(placeMemberOrderAtom, { mode: "promiseExit" })
  const setLastOrder = useAtomSet(lastOrderAtom)
  const setCart = useAtomSet(cartAtom)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()
  const errors = validate(form)

  // Members: fill in name and email from their Auth0 profile.
  useEffect(() => {
    const user = auth.user
    if (!user) return
    setForm((current) => ({
      ...current,
      fullName: current.fullName || (user.name.includes("@") ? "" : user.name),
      email: current.email || (user.email ?? "")
    }))
  }, [auth.user])

  if (lines.length === 0) {
    return (
      <div className="container page">
        <ErrorState message="Your bag is empty." action={<Link to="/shop" className="button button-primary">Shop Now</Link>} />
      </div>
    )
  }

  const field = (name: FieldName, label: string, props: Record<string, unknown> = {}) => {
    const error = touched[name] ? errors[name] : undefined
    return (
      <label className={`field ${error ? "has-error" : ""}`}>
        <input
          name={name}
          value={form[name]}
          placeholder=" "
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
          onBlur={() => setTouched({ ...touched, [name]: true })}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <span>{label}</span>
        {error ? <small className="field-error">{error}</small> : null}
      </label>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setServerError(undefined)
    if (Object.keys(errors).length > 0) {
      setTouched(Object.fromEntries(Object.keys(fieldSchemas).map((k) => [k, true])))
      return
    }
    const v = Object.fromEntries(Object.entries(form).map(([k, value]) => [k, value.trim()])) as Record<FieldName, string>
    const payload = new PlaceOrderRequest({
      lines: lines.map((line) => new CartLine(line)) as unknown as PlaceOrderRequest["lines"],
      delivery,
      contact: new Contact({ fullName: v.fullName, email: v.email, ...(v.phone ? { phone: v.phone } : {}) }),
      address: new Address({
        line1: v.line1,
        ...(v.line2 ? { line2: v.line2 } : {}),
        city: v.city,
        postalCode: v.postalCode,
        country: v.country
      })
    })

    setSubmitting(true)
    // Members and guests with an Auth0 anonymous session order through the
    // account API (so the order is linked to them); otherwise plain guest checkout.
    let exit = auth.isAuthenticated || guest ? await placeMemberOrder({ payload }) : await placeGuestOrder({ payload })
    if (!auth.isAuthenticated && Exit.isFailure(exit)) {
      const failed = Option.getOrUndefined(Cause.findErrorOption(exit.cause))
      if (failed === undefined || failed._tag === "Unauthorized") exit = await placeGuestOrder({ payload })
    }
    setSubmitting(false)

    if (Exit.isSuccess(exit)) {
      setLastOrder(exit.value)
      setCart([])
      navigate(`/order/${exit.value.id}`, { replace: true })
      return
    }
    const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause))
    if (error?._tag === "OutOfStock") {
      setServerError(
        error.available === 0
          ? `Sorry, ${error.name} just sold out. Please remove it from your bag.`
          : `Sorry, only ${error.available} of ${error.name} are left. Please update your bag.`
      )
    } else if (error?._tag === "Unauthorized") {
      setServerError("Your session has expired. Please sign in again to place your order as a member.")
    } else if (error?._tag === "Forbidden") {
      setServerError("Your account isn't allowed to place orders.")
    } else if (error?._tag === "InvalidSize") {
      setServerError(`Size ${error.size} of ${error.name} is no longer available. Please choose another size in your bag.`)
    } else {
      setServerError("We couldn't place your order. Please check your details and try again.")
    }
  }

  const subtotal = AsyncResult.isSuccess(quote) ? quote.value.subtotal : 0
  const shipping = delivery !== "pickup"

  return (
    <div className="container page checkout-page">
      <h1 className="page-title checkout-title">Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit} noValidate>
          {auth.isAuthenticated && auth.user ? (
            <div className="member-note">
              <span>
                Signed in as <strong>{auth.user.email ?? auth.user.name}</strong>. Member pricing: free standard delivery.
              </span>
            </div>
          ) : (
            <div className="member-prompt">
              <span>Members get free standard delivery. Sign in for faster checkout.</span>
              <button type="button" className="text-link link-button" onClick={() => signIn("/checkout")}>Sign In</button>
            </div>
          )}

          <section>
            <h2>Delivery Options</h2>
            <div className="toggle-cards">
              <button type="button" className={shipping ? "is-active" : undefined} aria-pressed={shipping} onClick={() => setDelivery("standard")}>
                <TruckIcon /> Ship
              </button>
              <button type="button" className={!shipping ? "is-active" : undefined} aria-pressed={!shipping} onClick={() => setDelivery("pickup")}>
                <StoreIcon /> Pick Up
              </button>
            </div>
            {shipping ? (
              <div className="speed-options" role="radiogroup" aria-label="Shipping speed">
                {(["standard", "express"] as const).map((method) => (
                  <label key={method} className={`speed ${delivery === method ? "is-active" : ""}`}>
                    <input type="radio" name="speed" checked={delivery === method} onChange={() => setDelivery(method)} />
                    <span>
                      <strong>
                        {deliveryFee(method, subtotal, auth.isAuthenticated) === 0
                          ? "Free"
                          : formatTotal(deliveryFee(method, subtotal, auth.isAuthenticated))}
                      </strong>
                      <span>{method === "standard" ? "Standard" : "Express"} · Arrives by {arrivalDate(deliveryDays(method))}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="muted pickup-note">Pick up for free at a partner store, ready by {arrivalDate(deliveryDays("pickup"))}.</p>
            )}
          </section>

          <section>
            <h2>{shipping ? "Enter your name and address:" : "Enter your name and billing address:"}</h2>
            <div className="field-stack">
              {field("fullName", "Full Name", { autoComplete: "name" })}
              {field("line1", "Address Line 1", { autoComplete: "address-line1" })}
              {field("line2", "Address Line 2 (optional)", { autoComplete: "address-line2" })}
              <div className="field-row">
                {field("city", "City", { autoComplete: "address-level2" })}
                {field("postalCode", "Postal Code", { autoComplete: "postal-code" })}
              </div>
              <label className="field">
                <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} autoComplete="country-name">
                  {countries.map((country) => <option key={country}>{country}</option>)}
                </select>
                <span>Country/Region</span>
              </label>
            </div>
          </section>

          <section>
            <h2>What's your contact information?</h2>
            <div className="field-stack">
              {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
              {field("phone", "Phone Number (optional)", { type: "tel", autoComplete: "tel" })}
            </div>
          </section>

          <section>
            <h2>Payment</h2>
            <p className="demo-note">This is a demo store, so no payment is taken. Placing your order simply confirms it.</p>
          </section>

          {serverError ? <p className="form-error" role="alert">{serverError}</p> : null}

          <button type="submit" className="button button-primary button-lg button-block" disabled={submitting}>
            {submitting ? <Spinner label="Placing order" /> : "Place Order"}
          </button>
        </form>

        <aside className="summary-column">
          <AsyncView result={quote}>
            {(value, waiting) => (
              <>
                <SummaryTotals quote={value} waiting={waiting} title="Order Summary" />
                <QuoteLines quote={value} arrives={`Arrives by ${arrivalDate(deliveryDays(value.delivery))}`} />
              </>
            )}
          </AsyncView>
        </aside>
      </div>
    </div>
  )
}
