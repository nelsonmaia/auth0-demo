import LoginId from "@auth0/auth0-acul-js/login-id"
import LoginPassword from "@auth0/auth0-acul-js/login-password"
import SignupId from "@auth0/auth0-acul-js/signup-id"
import SignupPassword from "@auth0/auth0-acul-js/signup-password"
import PasskeyEnrollment from "@auth0/auth0-acul-js/passkey-enrollment"
import ResetPasswordRequest from "@auth0/auth0-acul-js/reset-password-request"
import ResetPasswordEmail from "@auth0/auth0-acul-js/reset-password-email"
import ResetPassword from "@auth0/auth0-acul-js/reset-password"
import ResetPasswordSuccess from "@auth0/auth0-acul-js/reset-password-success"
import ResetPasswordError from "@auth0/auth0-acul-js/reset-password-error"
import EmailIdentifierChallenge from "@auth0/auth0-acul-js/email-identifier-challenge"
import LoginEmailVerification from "@auth0/auth0-acul-js/login-email-verification"
import PhoneIdentifierChallenge from "@auth0/auth0-acul-js/phone-identifier-challenge"
import { h } from "./dom.ts"
import {
  STORE_URL,
  captcha,
  divider,
  errorBanner,
  field,
  fieldError,
  form,
  googleButton,
  identifierRow,
  links,
  primaryButton,
  str,
  title,
} from "./ui.ts"

type Connection = { name: string; strategy: string }

function googleConnection(conns: ReadonlyArray<Connection> | null | undefined): Connection | undefined {
  return conns?.find((c) => c.strategy === "google-oauth2" || c.name === "google-oauth2")
}

/**
 * Reads one Experiment Center flag parameter. The docs describe `{ value }`
 * entries, but the live tenant sends plain values (`passkey_first: true`),
 * so accept both. Returns undefined when there is no experiment.
 */
function flag(experiment: { config: Record<string, unknown> } | null | undefined, key: string): unknown {
  const entry = experiment?.config?.[key]
  if (entry !== null && typeof entry === "object" && "value" in entry) return (entry as { value: unknown }).value
  return entry
}

function raw(data: FormData, key: string): string {
  const v = data.get(key)
  return typeof v === "string" ? v : ""
}

/** Live checklist for the tenant's password policy. */
function passwordRules(
  input: HTMLInputElement,
  validate: (pw: string) => { results: ReadonlyArray<{ code: string; label: string; status: string; items?: ReadonlyArray<{ label: string; status: string }> }> },
): HTMLElement {
  const list = h("ul", { class: "k-rules", "aria-live": "polite" })
  const render = () => {
    const { results: rules } = validate(input.value)
    list.replaceChildren(
      ...rules.flatMap((r) => [
        h("li", { class: r.status === "valid" ? "ok" : "" }, r.label),
        ...(r.items ?? []).map((i) => h("li", { class: `sub ${i.status === "valid" ? "ok" : ""}` }, i.label)),
      ]),
    )
  }
  input.addEventListener("input", render)
  render()
  return list
}

// ---------------------------------------------------------------------------
// Sign in / join: step 1 (email)
// ---------------------------------------------------------------------------
export function loginId(): HTMLElement {
  const sdk = new LoginId()
  const errors = sdk.getErrors()
  const allowed = sdk.getLoginIdentifiers() ?? ["email"]
  const emailOnly = allowed.length === 1 && allowed[0] === "email"
  const label = emailOnly ? "Email" : allowed.includes("email") ? "Email or username" : "Username"
  // A retry keeps what was typed; otherwise use the email the store passed as
  // login_hint (news sign-up or guest checkout).
  const hint = sdk.untrustedData.authorizationParams?.login_hint
  const submittedAgain = sdk.untrustedData.submittedFormData?.username !== undefined
  const prefill = (sdk.untrustedData.submittedFormData?.username as string | undefined) ?? hint

  const id = field({
    name: "username",
    label,
    type: emailOnly ? "email" : "text",
    value: prefill,
    autocomplete: "username webauthn",
    error: fieldError(errors, "username"),
  })
  const cap = captcha(sdk.screen, fieldError(errors, "captcha"))
  const google = googleConnection(sdk.transaction.alternateConnections)

  // Experiment "KINETIK passkeys by country": show_passkeys=false hides every
  // passkey option (button and autofill). Missing flag = passkeys shown.
  const passkeys = sdk.transaction.isPasskeyEnabled && flag(sdk.experiment, "show_passkeys") !== false
  // Experiment "KINETIK passkey first": the treatment leads with the passkey
  // button. Only when passkeys are shown; otherwise email first.
  const passkeyFirst = passkeys && flag(sdk.experiment, "passkey_first") === true

  const f = form(
    [
      errorBanner(errors, ["username", "captcha"]),
      id.el,
      hint && !submittedAgain ? h("p", { class: "k-hint-left" }, "We filled in the email you gave us. Not you? Just change it.") : null,
      cap.el,
      passkeyFirst ? h("button", { type: "submit", class: "k-btn k-btn-outline" }, "Continue with Email") : primaryButton("Continue"),
    ],
    (data) => sdk.login({ username: str(data, "username"), captcha: cap.value() }),
  )

  if (passkeys && sdk.transaction.showPasskeyAutofill) sdk.registerPasskeyAutofill("k-username").catch(() => {})

  if (passkeyFirst) {
    const passkey = h("button", { type: "button", class: "k-btn k-btn-primary k-passkey-first" }, "Sign in with a Passkey")
    passkey.addEventListener("click", () => {
      passkey.classList.add("is-busy")
      sdk.passkeyLogin().catch(() => passkey.classList.remove("is-busy"))
    })
    return h(
      "div",
      { "data-variation": "passkey-first" },
      ...title("Sign in or join KINETIK.", "Use your passkey for the fastest sign-in, or continue with your email."),
      h("div", { class: "k-stack" }, passkey),
      h("p", { class: "k-hint" }, "Uses your fingerprint, face or screen lock."),
      divider(),
      f,
      google ? h("div", { class: "k-stack" }, googleButton(() => sdk.federatedLogin({ connection: google.name }))) : null,
      links(
        sdk.transaction.isForgotPasswordEnabled ? ["Forgot password?", sdk.screen.resetPasswordLink] : null,
      ),
    )
  }

  return h(
    "div",
    {},
    ...title("Enter your email to join us or sign in."),
    f,
    google || passkeys ? divider() : null,
    google ? googleButton(() => sdk.federatedLogin({ connection: google.name })) : null,
    passkeys
      ? h(
          "button",
          { type: "button", class: "k-btn k-btn-outline", onclick: () => sdk.passkeyLogin() },
          "Sign in with a passkey",
        )
      : null,
    links(
      sdk.transaction.isForgotPasswordEnabled ? ["Forgot password?", sdk.screen.resetPasswordLink] : null,
    ),
  )
}

function codeInsteadButton(go: () => Promise<void>): HTMLElement {
  const btn = h("button", { type: "button", class: "k-btn k-btn-outline" }, "Email Me a Code Instead")
  btn.addEventListener("click", () => {
    btn.classList.add("is-busy")
    go().catch(() => btn.classList.remove("is-busy"))
  })
  return h("div", { class: "k-stack k-stack-tight" }, btn)
}

// ---------------------------------------------------------------------------
// Sign in: step 2 (password)
// ---------------------------------------------------------------------------
export function loginPassword(): HTMLElement {
  const sdk = new LoginPassword()
  const errors = sdk.getErrors()
  const username = sdk.screen.data?.username ?? ""
  const pw = field({
    name: "password",
    label: "Password",
    type: "password",
    autocomplete: "current-password",
    error: fieldError(errors, "password"),
  })
  const cap = captcha(sdk.screen, fieldError(errors, "captcha"))
  const google = googleConnection(sdk.transaction.alternateConnections)

  return h(
    "div",
    {},
    ...title("What's your password?"),
    identifierRow(username, sdk.screen.editIdentifierLink),
    form(
      [
        errorBanner(errors, ["password", "captcha"]),
        h("input", { type: "hidden", name: "username", value: username, autocomplete: "username" }),
        pw.el,
        cap.el,
        sdk.transaction.isForgotPasswordEnabled ? links(["Forgot password?", sdk.screen.resetPasswordLink]) : null,
        primaryButton("Sign In"),
      ],
      (data) => sdk.login({ username, password: raw(data, "password"), captcha: cap.value() }),
    ),
    // Back to the email code (Auth0 offers it when email codes are on).
    sdk.screen.data?.showSwitchToOtpButton ? codeInsteadButton(() => sdk.switchToOtp()) : null,
    google ? divider() : null,
    google ? googleButton(() => sdk.federatedLogin({ connection: google.name })) : null,
    // The only screen that offers Join: the email and code screens rely on
    // identifier-first (a new email continues to sign-up), but here someone
    // without an account would otherwise be stuck at a password prompt.
    sdk.transaction.isSignupEnabled && sdk.screen.signupLink
      ? h("p", { class: "k-join" }, "New to KINETIK? ", h("a", { href: sdk.screen.signupLink }, "Join us"))
      : null,
  )
}

// ---------------------------------------------------------------------------
// Join: step 1 (email)
// ---------------------------------------------------------------------------
export function signupId(): HTMLElement {
  const sdk = new SignupId()
  const errors = sdk.getErrors()
  const hint = sdk.untrustedData.authorizationParams?.login_hint
  const submittedAgain = sdk.untrustedData.submittedFormData?.email !== undefined
  const prefill = (sdk.untrustedData.submittedFormData?.email as string | undefined) ?? hint
  const email = field({
    name: "email",
    label: "Email",
    type: "email",
    value: prefill,
    autocomplete: "email",
    error: fieldError(errors, "email"),
  })
  const cap = captcha(sdk.screen, fieldError(errors, "captcha"))
  const google = googleConnection(sdk.transaction.alternateConnections)

  return h(
    "div",
    {},
    ...title("Become a KINETIK Member", "Create your profile to get free standard delivery and member checkout."),
    form(
      [errorBanner(errors, ["email", "captcha"]), email.el, hint && !submittedAgain ? h("p", { class: "k-hint-left" }, "We filled in the email you gave us. Not you? Just change it.") : null, cap.el, primaryButton("Continue")],
      (data) => sdk.signup({ email: str(data, "email"), captcha: cap.value() }),
    ),
    google ? divider() : null,
    google ? googleButton(() => sdk.federatedSignup({ connection: google.name }), "Join with Google") : null,
    links(["Already a member? Sign in", sdk.screen.loginLink]),
  )
}

// ---------------------------------------------------------------------------
// Join: step 2 (password)
// ---------------------------------------------------------------------------
export function signupPassword(): HTMLElement {
  const sdk = new SignupPassword()
  const errors = sdk.getErrors()
  const email = sdk.screen.data?.email ?? ""
  const pw = field({
    name: "password",
    label: "Create a password",
    type: "password",
    autocomplete: "new-password",
    error: fieldError(errors, "password"),
  })
  const cap = captcha(sdk.screen, fieldError(errors, "captcha"))

  return h(
    "div",
    {},
    ...title("Now create a password."),
    identifierRow(email, sdk.screen.editLink),
    form(
      [
        errorBanner(errors, ["password", "captcha"]),
        h("input", { type: "hidden", name: "email", value: email, autocomplete: "username" }),
        pw.el,
        passwordRules(pw.input, (p) => sdk.validatePassword(p)),
        cap.el,
        primaryButton("Create Account"),
      ],
      (data) => sdk.signup({ email, password: raw(data, "password"), captcha: cap.value() }),
    ),
    links(["Already a member? Sign in", sdk.screen.loginLink]),
  )
}

// ---------------------------------------------------------------------------
// Passkey prompt shown after password sign-in
// ---------------------------------------------------------------------------
export function passkeyEnrollment(): HTMLElement {
  const sdk = new PasskeyEnrollment()
  const errors = sdk.getErrors()
  const create = h("button", { type: "button", class: "k-btn k-btn-primary" }, "Create a Passkey")
  create.addEventListener("click", () => {
    create.classList.add("is-busy")
    sdk.continuePasskeyEnrollment().catch(() => create.classList.remove("is-busy"))
  })
  const dontAsk = h("input", { type: "checkbox", id: "k-dont-ask" })
  return h(
    "div",
    {},
    ...title("Faster sign-in with a passkey", "Use your fingerprint, face or screen lock instead of a password next time."),
    errorBanner(errors),
    h("div", { class: "k-stack" }, create,
      h("button", {
        type: "button",
        class: "k-btn k-btn-outline",
        onclick: () => sdk.abortPasskeyEnrollment({ doNotShowAgain: dontAsk.checked }),
      }, "Not Now"),
      h("label", { class: "k-check", for: "k-dont-ask" }, dontAsk, "Don't ask me again"),
    ),
  )
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
export function resetPasswordRequest(): HTMLElement {
  const sdk = new ResetPasswordRequest()
  const errors = sdk.getErrors()
  const email = field({
    name: "username",
    label: "Email",
    type: "email",
    value: sdk.screen.data?.email ?? sdk.screen.data?.username,
    autocomplete: "email",
    error: fieldError(errors, "username") ?? fieldError(errors, "email"),
  })
  const cap = captcha(sdk.screen, fieldError(errors, "captcha"))
  return h(
    "div",
    {},
    ...title("Reset your password", "Enter your email and we'll send you a link to set a new password."),
    form(
      [errorBanner(errors, ["username", "email", "captcha"]), email.el, cap.el, primaryButton("Send Reset Link")],
      (data) => sdk.resetPassword({ username: str(data, "username"), captcha: cap.value() }),
    ),
    h("p", { class: "k-links" }, h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); sdk.backToLogin() } }, "Back to sign in")),
  )
}

export function resetPasswordEmail(): HTMLElement {
  const sdk = new ResetPasswordEmail()
  const who = sdk.screen.data?.email ?? sdk.screen.data?.username
  const resend = h("button", { type: "button", class: "k-btn k-btn-outline" }, "Resend Email")
  resend.addEventListener("click", () => {
    resend.classList.add("is-busy")
    sdk.resendEmail().catch(() => resend.classList.remove("is-busy"))
  })
  return h(
    "div",
    {},
    ...title("Check your email", who ? `We've sent a reset link to ${who}.` : "We've sent you a reset link."),
    errorBanner(sdk.getErrors()),
    h("div", { class: "k-stack" }, resend),
  )
}

export function resetPassword(): HTMLElement {
  const sdk = new ResetPassword()
  const errors = sdk.getErrors()
  const pw = field({
    name: "password-reset",
    label: "New password",
    type: "password",
    autocomplete: "new-password",
    error: fieldError(errors, "password-reset"),
  })
  const again = field({
    name: "re-enter-password",
    label: "Confirm new password",
    type: "password",
    autocomplete: "new-password",
    error: fieldError(errors, "re-enter-password"),
  })
  const mismatch = h("span", { class: "k-field-error", hidden: true }, "Passwords don't match.")
  return h(
    "div",
    {},
    ...title("Set a new password", sdk.screen.data?.username ? `For ${sdk.screen.data.username}` : undefined),
    form(
      [
        errorBanner(errors, ["password-reset", "re-enter-password"]),
        pw.el,
        passwordRules(pw.input, (p) => sdk.validatePassword(p)),
        again.el,
        mismatch,
        primaryButton("Reset Password"),
      ],
      async (data) => {
        const a = raw(data, "password-reset")
        const b = raw(data, "re-enter-password")
        mismatch.hidden = a === b
        if (a !== b) throw new Error("Passwords don't match")
        await sdk.resetPassword({ "password-reset": a, "re-enter-password": b })
      },
    ),
  )
}

export function resetPasswordSuccess(): HTMLElement {
  new ResetPasswordSuccess()
  return h(
    "div",
    {},
    ...title("Password updated", "You can now sign in with your new password."),
    h("div", { class: "k-stack" }, h("a", { class: "k-btn k-btn-primary", href: STORE_URL }, "Back to KINETIK")),
  )
}

export function resetPasswordError(): HTMLElement {
  const sdk = new ResetPasswordError()
  return h(
    "div",
    {},
    ...title("This link has expired", "Reset links can only be used once and expire after a while. Request a new one from the sign-in page."),
    errorBanner(sdk.getErrors()),
    h("div", { class: "k-stack" }, h("a", { class: "k-btn k-btn-primary", href: STORE_URL }, "Back to KINETIK")),
  )
}

// ---------------------------------------------------------------------------
// One-time code screens (join email check, email code sign-in, phone check)
// ---------------------------------------------------------------------------
interface CodeScreenOptions {
  title: string
  sub: string
  errors: ReadonlyArray<{ code: string; field?: string; message: string }>
  submit: (code: string) => Promise<void>
  resend?: { manager: (o: { timeoutSeconds: number; onStatusChange: (s: number, d: boolean) => void }) => { startResend: () => void }; limitReached?: boolean }
  back?: { label: string; go: () => Promise<void> | void } | null
  extra?: Array<HTMLElement | null>
}

function codeScreen(o: CodeScreenOptions): HTMLElement {
  const code = field({
    name: "code",
    label: "Enter code",
    autocomplete: "one-time-code",
    inputmode: "numeric",
    error: fieldError(o.errors as never, "code"),
  })
  code.input.setAttribute("maxlength", "10")
  code.input.addEventListener("input", () => {
    code.input.value = code.input.value.replace(/\s+/g, "")
  })

  let resendEl: HTMLElement | null = null
  if (o.resend) {
    if (o.resend.limitReached) {
      resendEl = h("p", { class: "k-hint-left" }, "You've asked for too many codes. Wait a few minutes, then go back and try again.")
    } else {
      const btn = h("button", { type: "button", class: "k-link-button" }, "Resend code")
      const control = o.resend.manager({
        timeoutSeconds: 30,
        onStatusChange: (remaining, disabled) => {
          btn.disabled = disabled
          btn.textContent = disabled && remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"
        },
      })
      btn.addEventListener("click", () => control.startResend())
      resendEl = h("p", { class: "k-resend" }, "Didn't get it? ", btn)
    }
  }

  return h(
    "div",
    {},
    ...title(o.title, o.sub),
    form(
      [errorBanner(o.errors as never, ["code", "captcha"]), code.el, resendEl, primaryButton("Continue")],
      (data) => o.submit(str(data, "code")),
    ),
    ...(o.extra ?? []),
    o.back
      ? h("p", { class: "k-links" }, h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); o.back?.go() } }, o.back.label))
      : null,
  )
}

export function emailIdentifierChallenge(): HTMLElement {
  const sdk = new EmailIdentifierChallenge()
  const email = sdk.screen.data?.email
  return codeScreen({
    title: "Check your email",
    sub: email ? `We've sent a code to ${email}. Enter it below to continue.` : "We've sent you a code. Enter it below to continue.",
    errors: sdk.getErrors(),
    submit: (code) => sdk.submitEmailChallenge({ code }),
    resend: { manager: (o) => sdk.resendManager(o), limitReached: sdk.screen.data?.resendLimitReached },
    back: { label: "Use a different email", go: () => sdk.returnToPrevious() },
    extra: [
      sdk.screen.data?.showSwitchToPasswordButton
        ? h("div", { class: "k-stack" }, h("button", { type: "button", class: "k-btn k-btn-outline", onclick: () => sdk.switchToPassword() }, "Use a Password Instead"))
        : null,
    ],
  })
}

export function loginEmailVerification(): HTMLElement {
  const sdk = new LoginEmailVerification()
  return codeScreen({
    title: "Check your email",
    sub: "We've sent you a sign-in code. Enter it below to continue.",
    errors: sdk.getErrors(),
    submit: (code) => sdk.continueWithCode({ code }),
    resend: { manager: (o) => sdk.resendManager(o) },
  })
}

export function phoneIdentifierChallenge(): HTMLElement {
  const sdk = new PhoneIdentifierChallenge()
  const phone = sdk.screen.data?.phone
  const voice = sdk.screen.data?.messageType === "voice"
  return codeScreen({
    title: voice ? "Answer your phone" : "Check your messages",
    sub: phone ? `We've sent a code to ${phone}. Enter it below to continue.` : "We've sent you a code. Enter it below to continue.",
    errors: sdk.getErrors(),
    submit: (code) => sdk.submitPhoneChallenge({ code }),
    resend: { manager: (o) => sdk.resendManager(o), limitReached: sdk.screen.data?.resendLimitReached },
    back: { label: "Use a different number", go: () => sdk.returnToPrevious() },
    extra: [
      sdk.screen.data?.showLinkVoice && !voice
        ? h("p", { class: "k-links" }, h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); sdk.switchToVoice() } }, "Call me instead"))
        : null,
      sdk.screen.data?.showLinkSms && voice
        ? h("p", { class: "k-links" }, h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); sdk.switchToText() } }, "Text me instead"))
        : null,
    ],
  })
}

export const screens: Record<string, () => HTMLElement> = {
  "login-id": loginId,
  "login-password": loginPassword,
  "signup-id": signupId,
  "signup-password": signupPassword,
  "passkey-enrollment": passkeyEnrollment,
  "reset-password-request": resetPasswordRequest,
  "reset-password-email": resetPasswordEmail,
  "reset-password": resetPassword,
  "reset-password-success": resetPasswordSuccess,
  "reset-password-error": resetPasswordError,
  "email-identifier-challenge": emailIdentifierChallenge,
  "login-email-verification": loginEmailVerification,
  "phone-identifier-challenge": phoneIdentifierChallenge,
}
