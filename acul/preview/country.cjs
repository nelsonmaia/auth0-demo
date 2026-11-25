// On the live store, picks a shopping country in the footer, signs in, and
// reports the experiment version and whether passkey options are shown.
const { chromium, devices } = require("playwright")
const store = process.argv[2] || "https://kinetik.mmatias.co.uk"
const out = process.argv[3]
;(async () => {
  const browser = await chromium.launch()
  for (const country of ["auto", "GB", "US"]) {
    const ctx = await browser.newContext(devices["iPhone 13"])
    const page = await ctx.newPage()
    await page.goto(store + "/account", { waitUntil: "networkidle" })
    const picker = page.locator(".country-picker select")
    if (country !== "auto") {
      const done = page.waitForResponse((r) => r.url().includes("/anonymous/token") && r.request().method() === "POST", { timeout: 15000 }).catch(() => null)
      await picker.selectOption(country)
      const r = await done
      console.log(`  [${country}] metadata update:`, r ? r.status() : "no request seen")
    }
    await page.getByRole("button", { name: /sign in/i }).first().click()
    await page.waitForSelector(".k-card", { timeout: 30000 })
    const exp = await page.evaluate(() => window.universal_login_context?.experiment ?? null)
    const passkeys = await page.locator("button", { hasText: /passkey/i }).count()
    console.log(`${country.padEnd(4)} -> ${exp?.variation_name ?? "no experiment"} | passkey buttons: ${passkeys}`)
    if (out) await page.screenshot({ path: `${out}/country-${country}.png` })
    await ctx.close()
  }
  await browser.close()
})()
