// End to end: guest order -> Join -> member profile form. Prints what the form
// asks, completes it, and saves screenshots. Creates one test user and prints
// its email so the caller can check and delete it.
const { chromium, devices } = require("playwright")
const store = process.argv[2] || "https://kinetik.mmatias.co.uk"
const out = process.argv[3] || "."
const withOrder = process.argv[4] !== "no-order"
const email = process.env.TEST_EMAIL || `kinetik-e2e-${Date.now()}@example.com`
const password = process.env.TEST_PASSWORD || "Kinetik!Test2026x"
const signInExisting = !!process.env.TEST_EMAIL
;(async () => {
  const browser = await chromium.launch()
  const page = await (await browser.newContext(devices["iPhone 13"])).newPage()
  page.setDefaultTimeout(30000)
  if (withOrder) {
    await page.goto(store + "/product/halo-low-84-mens", { waitUntil: "networkidle" })
    await page.locator('input[name="size"]:not([disabled])').first().check({ force: true })
    await page.getByRole("button", { name: "Add to Bag" }).click()
    await page.goto(store + "/cart", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Guest Checkout" }).click()
    await page.waitForURL(/\/checkout/)
    const fill = (n, v) => page.locator(`input[name="${n}"]`).fill(v)
    await fill("fullName", "Jane Runner")
    await fill("email", email)
    await fill("phone", "+44 7700 900123")
    await fill("line1", "1 Test Street")
    await fill("city", "London")
    await fill("postalCode", "E1 6AN")
    await page.locator("select[autocomplete=country-name]").selectOption({ label: "United Kingdom" }).catch(async () => page.locator("select[autocomplete=country-name]").selectOption({ index: 1 }))
    const meta = page.waitForResponse((r) => r.url().includes("/anonymous/token") && r.request().method() === "POST" && (r.request().postData() || "").includes("full_name"), { timeout: 20000 }).catch(() => null)
    await page.getByRole("button", { name: "Place Order" }).click()
    await page.waitForURL(/\/order\//)
    console.log("guest order placed; details saved on guest session:", (await meta)?.status() ?? "not seen")
  }
  await page.goto(store + "/account", { waitUntil: "networkidle" })
  if (signInExisting) {
    // Existing member (created through the Management API): Sign In.
    await page.getByRole("button", { name: /sign in/i }).first().click()
    await page.waitForSelector("#k-username")
    await page.fill("#k-username", email)
  } else {
    // New member: Join (needs a reachable inbox if the tenant verifies email).
    await page.getByRole("button", { name: "Join Us" }).first().click()
    await page.waitForSelector("#k-email")
    await page.fill("#k-email", email)
  }
  await page.click("button[type=submit]")
  await page.waitForSelector("#k-password")
  await page.fill("#k-password", password)
  await page.click("button[type=submit]")
  // Optional passkey prompt, then the form.
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole("button", { name: "Not Now" }).isVisible().catch(() => false)) await page.getByRole("button", { name: "Not Now" }).click()
    if (/\/u\/forms|\/forms\//.test(page.url()) || (await page.getByText(/What's your game\?|Welcome to KINETIK/).first().isVisible().catch(() => false))) break
    await page.waitForTimeout(1000)
  }
  await page.waitForTimeout(1500)
  console.log("form url:", page.url().split("?")[0])
  const heading = await page.locator("h2").first().innerText().catch(() => "(none)")
  const asksName = await page.getByText("First name", { exact: false }).count()
  console.log(`form opens at: "${heading}" | asks for first name: ${asksName > 0 ? "yes" : "no"}`)
  await page.screenshot({ path: `${out}/profile-form-${withOrder ? "after-order" : "no-order"}.png` })
  if (asksName > 0) {
    await page.getByLabel("First name").fill("Jane")
    await page.getByLabel("Last name").fill("Runner")
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByText("What's your game?").waitFor()
  }
  await page.getByText("Running", { exact: true }).click()
  await page.getByRole("button", { name: "Finish" }).click()
  for (let i = 0; i < 30 && !page.url().includes("kinetik."); i++) {
    if (await page.getByRole("button", { name: "Not Now" }).isVisible().catch(() => false)) await page.getByRole("button", { name: "Not Now" }).click()
    await page.waitForTimeout(1000)
  }
  await page.waitForLoadState("networkidle")
  console.log("back in store:", page.url())
  console.log("TEST_EMAIL", email)
  await browser.close()
})().catch((e) => { console.error("FAILED:", e.message); console.log("TEST_EMAIL", email); process.exit(1) })
