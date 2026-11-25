// Opens the KINETIK login with a forced experiment version and reports what renders.
const { chromium } = require("playwright")
const crypto = require("crypto")
const [, , exp, variation, out] = process.argv
const verifier = crypto.randomBytes(32).toString("base64url")
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url")
const q = new URLSearchParams({
  client_id: "9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7",
  redirect_uri: "https://kinetik-store-zeta.vercel.app",
  response_type: "code",
  scope: "openid profile email",
  audience: "https://kinetik-store-zeta.vercel.app/api",
  code_challenge: challenge,
  code_challenge_method: "S256",
  state: crypto.randomBytes(8).toString("hex"),
  experiment_id: exp,
  variation_id: variation,
})
const url = "https://nelson.jp.mmatias.co.uk/authorize?" + q
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(url)
  await page.waitForSelector(".k-card, body", { timeout: 30000 })
  await page.waitForTimeout(1500)
  const ctx = await page.evaluate(() => window.universal_login_context?.experiment ?? null)
  console.log("experiment context:", JSON.stringify(ctx))
  console.log("heading:", await page.locator("h1").first().innerText().catch(() => "(none)"))
  if (out) await page.screenshot({ path: out })
  await browser.close()
})()
