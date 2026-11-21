import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Cause, Exit, Option, Schema } from "effect"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Address, CartLine, Contact, PlaceOrderRequest } from "../../shared/Domain.ts"
import { LockIcon } from "../components/Icons.tsx"
import { AsyncView, ErrorState, Spinner } from "../components/ui.tsx"
import { cartAtom, deliveryAtom, lastOrderAtom, placeOrderAtom, quoteAtom } from "../state.ts"
import { OrderSummary, QuoteLines } from "./Cart.tsx"

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
  fullName: "Please enter your full name",
  email: "Please enter a valid email address",
  line1: "Please enter your street address",
  city: "Please enter your city",
  postalCode: "Please enter your postal code",
  country: "Please choose a country"
}

const countries = ["United States", "Canada", "United Kingdom", "Portugal", "Brazil", "Sweden", "Germany", "France", "Spain", "Australia"]

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
    if (Option.isNone(result)) errors[name] = fieldMessages[name] ?? "Invalid value"
  }
  return errors
}

export function CheckoutPage() {
  const lines = useAtomValue(cartAtom)
  const delivery = useAtomValue(deliveryAtom)
  const quote = useAtomValue(quoteAtom)
  const placeOrder = useAtomSet(placeOrderAtom, { mode: "promiseExit" })
  const setLastOrder = useAtomSet(lastOrderAtom)
  const setCart = useAtomSet(cartAtom)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()

  const errors = validate(form)

  if (lines.length === 0) {
    return (
      <div className="container page">
        <ErrorState message="Your bag is empty." action={<Link to="/products" className="button button-primary">Start shopping</Link>} />
      </div>
    )
  }

  const field = (name: FieldName, label: string, props: Record<string, unknown> = {}) => {
    const error = touched[name] ? errors[name] : undefined
    return (
      <label className={`field ${error ? "has-error" : ""}`}>
        <span>{label}</span>
        <input
          name={name}
          value={form[name]}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
          onBlur={() => setTouched({ ...touched, [name]: true })}
          aria-invalid={error ? true : undefined}
          {...props}
        />
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

    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Record<FieldName, string>
    const payload = new PlaceOrderRequest({
      lines: lines.map((line) => new CartLine(line)) as unknown as PlaceOrderRequest["lines"],
      delivery,
      contact: new Contact({
        fullName: trimmed.fullName,
        email: trimmed.email,
        ...(trimmed.phone ? { phone: trimmed.phone } : {})
      }),
      address: new Address({
        line1: trimmed.line1,
        ...(trimmed.line2 ? { line2: trimmed.line2 } : {}),
        city: trimmed.city,
        postalCode: trimmed.postalCode,
        country: trimmed.country
      })
    })

    setSubmitting(true)
    const exit = await placeOrder({ payload })
    setSubmitting(false)

    if (Exit.isSuccess(exit)) {
      setLastOrder(exit.value)
      setCart([])
      navigate(`/order/${exit.value.id}`, { replace: true })
      return
    }
    const error = Cause.findErrorOption(exit.cause)
    const e = Option.getOrUndefined(error)
    if (e?._tag === "OutOfStock") {
      setServerError(
        e.available === 0
          ? `Sorry, ${e.name} just sold out. Please remove it from your bag.`
          : `Sorry, only ${e.available} of ${e.name} are left. Please update your bag.`
      )
    } else {
      setServerError("We couldn't place your order. Please check your details and try again.")
    }
  }

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/cart">Bag</Link>
        <span aria-hidden="true">/</span>
        <span>Checkout</span>
      </nav>
      <h1 className="page-title">Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit} noValidate>
          <div className="login-hint">
            <div>
              <strong>Have an account?</strong>
              <span>Log in to check out faster and track your orders.</span>
            </div>
            <Link to="/account" className="button button-outline button-sm">Log in</Link>
          </div>

          <section>
            <h2><span className="step">1</span> Contact details</h2>
            <div className="field-grid">
              {field("fullName", "Full name", { autoComplete: "name" })}
              {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
              {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
            </div>
          </section>

          <section>
            <h2><span className="step">2</span> Delivery address</h2>
            <div className="field-grid">
              {field("line1", "Street address", { autoComplete: "address-line1" })}
              {field("line2", "Apartment, suite, etc. (optional)", { autoComplete: "address-line2" })}
              {field("city", "City", { autoComplete: "address-level2" })}
              {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
              <label className="field">
                <span>Country</span>
                <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} autoComplete="country-name">
                  {countries.map((country) => <option key={country}>{country}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h2><span className="step">3</span> Payment</h2>
            <p className="demo-note">
              This is a demo store — no payment is taken. Placing an order simply confirms it.
            </p>
          </section>

          {serverError ? <p className="form-error" role="alert">{serverError}</p> : null}

          <button type="submit" className="button button-primary button-lg button-block" disabled={submitting}>
            {submitting ? <Spinner label="Placing order" /> : <><LockIcon size={18} /> Place order</>}
          </button>
        </form>

        <aside className="cart-summary">
          <AsyncView result={quote}>
            {(value, waiting) => (
              <>
                <OrderSummary quote={value} waiting={waiting} editableDelivery />
                <QuoteLines quote={value} />
              </>
            )}
          </AsyncView>
        </aside>
      </div>
    </div>
  )
}
