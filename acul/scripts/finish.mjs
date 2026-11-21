// Prints the SRI hashes of the built files (for the Auth0 head_tags).
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"

const files = ["kinetik-login.js", "kinetik-login.css"]
const sri = Object.fromEntries(
  files.map((f) => [f, "sha384-" + createHash("sha384").update(readFileSync(`dist/${f}`)).digest("base64")]),
)
writeFileSync("dist/sri.json", JSON.stringify(sri, null, 2) + "\n")
console.log(sri)
