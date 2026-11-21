import { h, logo, googleIcon } from "./dom.ts"

export const STORE_URL = "https://kinetik-store-zeta.vercel.app"

interface SdkError {
  code: string
  field?: string
  message: string
}

/** Page shell: photo panel on desktop, logo + form card on every size. */
export function shell(content: HTMLElement): HTMLElement {
  const photo = h(
    "aside",
    { class: "k-photo", "aria-hidden": "true" },
    h(
      "div",
      { class: "k-photo-copy" },
      h("p", { class: "k-kicker" }, "KINETIK Membership"),
      h("p", { class: "k-display" }, "MOVE FIRST."),
      h("p", { class: "k-photo-sub" }, "Free standard delivery, member checkout and your order history in one place."),
    ),
  )
  const main = h(
    "main",
    { class: "k-main" },
    h("div", { class: "k-top" }, logo(), h("a", { class: "k-back", href: STORE_URL }, "Back to store")),
    h("div", { class: "k-card" }, content),
    h(
      "p",
      { class: "k-legal" },
      "By continuing, you agree to KINETIK's Terms of Use and acknowledge the Privacy Policy. KINETIK is a demo store.",
    ),
  )
  return h("div", { class: "k-page" }, photo, main)
}

export function title(text: string, sub?: string): HTMLElement[] {
  const out: HTMLElement[] = [h("h1", { class: "k-title" }, text)]
  if (sub) out.push(h("p", { class: "k-sub" }, sub))
  return out
}

/** Banner for errors that aren't tied to one field. */
export function errorBanner(errors: SdkError[], fieldNames: string[] = []): HTMLElement | null {
  const general = errors.filter((e) => !e.field || !fieldNames.includes(e.field))
  if (general.length === 0) return null
  return h("div", { class: "k-alert", role: "alert" }, ...general.map((e) => h("p", {}, e.message)))
}

export function fieldError(errors: SdkError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export interface FieldOptions {
  name: string
  label: string
  type?: string
  value?: string
  autocomplete?: string
  error?: string
  required?: boolean
  readonly?: boolean
  inputmode?: string
}

/** Floating-label input, the same look as the store's checkout fields. */
export function field(o: FieldOptions): { el: HTMLElement; input: HTMLInputElement } {
  const id = `k-${o.name}`
  const input = h("input", {
    id,
    name: o.name,
    type: o.type ?? "text",
    placeholder: " ",
    autocomplete: o.autocomplete,
    required: o.required ?? true,
    readonly: o.readonly,
    inputmode: o.inputmode,
    "aria-invalid": o.error ? "true" : undefined,
    "aria-describedby": o.error ? `${id}-err` : undefined,
    autocapitalize: o.type === "password" || o.type === "email" ? "none" : undefined,
    spellcheck: o.type === "email" ? "false" : undefined,
  })
  if (o.value) input.value = o.value
  const children: Array<Node> = [input, h("span", {}, o.label)]
  if (o.type === "password") {
    const toggle = h("button", { type: "button", class: "k-reveal", "aria-label": "Show password" }, "Show")
    toggle.addEventListener("click", () => {
      const show = input.type === "password"
      input.type = show ? "text" : "password"
      toggle.textContent = show ? "Hide" : "Show"
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password")
    })
    children.push(toggle)
  }
  const wrap = h("label", { class: `k-field${o.error ? " has-error" : ""}`, for: id }, ...children)
  const el = h("div", {}, wrap, o.error ? h("span", { class: "k-field-error", id: `${id}-err` }, o.error) : null)
  return { el, input }
}

/** Read-only identifier row with an "Edit" link, used on the second step. */
export function identifierRow(value: string, editHref: string | null | undefined): HTMLElement {
  return h(
    "div",
    { class: "k-identity" },
    h("span", {}, value),
    editHref ? h("a", { href: editHref }, "Edit") : null,
  )
}

export function primaryButton(text: string): HTMLButtonElement {
  return h("button", { type: "submit", class: "k-btn k-btn-primary" }, text)
}

export function googleButton(onClick: () => void, text = "Continue with Google"): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "k-btn k-btn-outline" }, text)
  btn.prepend(googleIcon())
  btn.addEventListener("click", () => {
    btn.disabled = true
    onClick()
  })
  return btn
}

export function divider(): HTMLElement {
  return h("div", { class: "k-divider" }, h("span", {}, "or"))
}

/**
 * Wraps a form so the submit button shows a busy state and repeat taps are
 * ignored. The SDK submits the form natively, so the page navigates away.
 */
export function form(children: Array<Node | null>, onSubmit: (data: FormData) => Promise<void> | void): HTMLFormElement {
  const f = h("form", { class: "k-form", novalidate: true }, ...children)
  let busy = false
  f.addEventListener("submit", async (e) => {
    e.preventDefault()
    if (busy) return
    if (!f.reportValidity()) return
    busy = true
    const btn = f.querySelector<HTMLButtonElement>("button[type=submit]")
    btn?.classList.add("is-busy")
    btn?.setAttribute("aria-busy", "true")
    try {
      await onSubmit(new FormData(f))
    } catch (err) {
      busy = false
      btn?.classList.remove("is-busy")
      btn?.removeAttribute("aria-busy")
      console.error(err)
    }
  })
  return f
}

export function links(...items: Array<[string, string | null | undefined] | null>): HTMLElement {
  return h(
    "p",
    { class: "k-links" },
    ...items
      .filter((i): i is [string, string] => i !== null && !!i[1])
      .map(([text, href]) => h("a", { href }, text)),
  )
}

export interface CaptchaLike {
  isCaptchaAvailable: boolean
  captchaImage: string | null
  captchaProvider: string | null
}

/** Auth0's built-in image captcha. Other providers aren't supported here. */
export function captcha(screen: CaptchaLike, error?: string): { el: HTMLElement | null; value: () => string | undefined } {
  if (!screen.isCaptchaAvailable || !screen.captchaImage) return { el: null, value: () => undefined }
  const { el, input } = field({ name: "captcha", label: "Enter the code shown above", autocomplete: "off", error })
  return {
    el: h("div", { class: "k-captcha" }, h("img", { src: screen.captchaImage, alt: "Security check" }), el),
    value: () => input.value.trim(),
  }
}

export function str(data: FormData, key: string): string {
  const v = data.get(key)
  return typeof v === "string" ? v.trim() : ""
}
