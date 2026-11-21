// Renders each screen with a mock universal_login_context and screenshots it.
const { chromium } = require("playwright")
const path = require("path")
const fs = require("fs")
const dist = path.resolve(__dirname, "../dist")
const out = process.argv[2]
const base = (screen, extra = {}) => ({
  client: { id: "9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7", name: "KINETIK Store" },
  tenant: { name: "nelson", enabled_locales: ["en"] },
  branding: {},
  organization: {},
  user: {},
  prompt: { name: screen },
  screen: { name: screen, texts: {}, links: {}, data: {}, ...extra.screen },
  transaction: {
    state: "mock-state",
    locale: "en",
    connection: {
      name: "Username-Password-Authentication",
      strategy: "auth0",
      options: {
        signup_enabled: true,
        forgot_password_enabled: true,
        attributes: { email: { identifier_active: true, signup_status: "required" } },
        authentication_methods: { password: { enabled: true, policy: "good", min_length: 8 }, passkey: { enabled: false } },
        password_options: { complexity: { character_type_rule: "all", character_types: ["uppercase","lowercase","number","special"], min_length: 8, identical_characters: "allow", sequential_characters: "allow", max_length_exceeded: "error" } },
      },
    },
    alternate_connections: [{ name: "google-oauth2", strategy: "google-oauth2" }],
    ...extra.transaction,
  },
  untrusted_data: extra.untrusted_data ?? {},
})
const cases = {
  "login-id": base("login-id", { screen: { links: { signup: "#signup", reset_password: "#reset" } } }),
  "login-id-error": base("login-id", { screen: { name: "login-id", links: { signup: "#signup", reset_password: "#reset" } }, transaction: { errors: [{ code: "invalid-email", field: "username", message: "Enter a valid email address." }] }, untrusted_data: { submitted_form_data: { username: "jane@" } } }),
  "login-password": base("login-password", { screen: { links: { signup: "#s", reset_password: "#r", edit_identifier: "#e" }, data: { username: "jane@example.com" } }, transaction: { errors: [{ code: "wrong-credentials", message: "Wrong email or password." }] } }),
  "signup-id": base("signup-id", { screen: { links: { login: "#login" } } }),
  "signup-password": base("signup-password", { screen: { links: { login: "#login", edit_identifier: "#e" }, data: { email: "jane@example.com" } } }),
  "passkey-enrollment": base("passkey-enrollment", { screen: { links: { back: "#b" }, data: { passkey: { public_key: { challenge: "x", user: { id: "x", name: "jane", displayName: "jane" }, rp: { id: "x", name: "x" }, pubKeyCredParams: [] } } } } }),
  "reset-password-request": base("reset-password-request", { screen: { links: { back: "#b" } } }),
  "reset-password": base("reset-password", { screen: { data: { username: "jane@example.com" } } }),
}
;(async () => {
  const browser = await chromium.launch()
  const js = fs.readFileSync(path.join(dist, "kinetik-login.js"), "utf8")
  const css = fs.readFileSync(path.join(dist, "kinetik-login.css"), "utf8").replace("./hero-sprint.webp", "hero-sprint.webp")
  const errors = []
  for (const [vp, size] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1366, height: 860 }]]) {
    for (const [name, ctx] of Object.entries(cases)) {
      if (vp === "desktop" && !["login-id", "signup-password"].includes(name)) continue
      const page = await browser.newPage({ viewport: size })
      page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`))
      page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`))
      await page.route("**/hero-sprint.webp", (r) => r.fulfill({ path: path.join(dist, "hero-sprint.webp") }))
      await page.route("https://acul.test/", (r) => r.fulfill({ contentType: "text/html", body:
        `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:ital,wght@0,400;0,500;0,700;0,900;1,900&display=swap">
        <style>${css}</style><script>window.universal_login_context=${JSON.stringify(ctx)}</script></head><body></body></html>` }))
      await page.goto("https://acul.test/")
      await page.addScriptTag({ content: js, type: "module" })
      await page.waitForSelector(".k-card")
      if (name === "signup-password") await page.fill("#k-password", "Kinetik1")
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${out}/${vp}-${name}.png`, fullPage: vp === "phone" })
      await page.close()
    }
  }
  await browser.close()
  console.log(errors.length ? errors.join("\n") : "no page errors")
})()
