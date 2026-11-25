// Signs in from the live store as a phone and as a desktop and reports the version each gets.
const { chromium, devices } = require("playwright")
const out = process.argv[2]
;(async () => {
  const browser = await chromium.launch()
  for (const [name, opts] of [["phone", devices["iPhone 13"]], ["desktop", { viewport: { width: 1366, height: 860 } }]]) {
    const ctx = await browser.newContext(opts)
    const page = await ctx.newPage()
    await page.goto("https://kinetik-store-zeta.vercel.app/account", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /sign in/i }).first().click()
    await page.waitForSelector(".k-card", { timeout: 30000 })
    const exp = await page.evaluate(() => window.universal_login_context?.experiment ?? null)
    console.log(name, "|", await page.locator("h1").first().innerText(), "|", JSON.stringify(exp && { variation: exp.variation_name, control: exp.is_control }))
    if (out) await page.screenshot({ path: `${out}/cohort-${name}.png` })
    await ctx.close()
  }
  await browser.close()
})()
