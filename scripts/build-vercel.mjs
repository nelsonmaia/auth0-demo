// Produces a Vercel "Build Output API" bundle in .vercel/output:
//   static/              the Vite build (the shop UI)
//   functions/api.func   the Effect API bundled into one serverless function
//   config.json          routing: /api/* → function, everything else → SPA
// Run after `vite build` (see `npm run build:vercel`).
import { build } from "esbuild"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"

const out = ".vercel/output"
const fn = `${out}/functions/api.func`

await rm(out, { recursive: true, force: true })
await mkdir(`${out}/static`, { recursive: true })
await cp("dist", `${out}/static`, { recursive: true })

await mkdir(fn, { recursive: true })
await build({
  entryPoints: ["src/server/vercel.ts"],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  legalComments: "none",
  minify: true,
  keepNames: true,
  // Some dependencies still call `require` for Node built-ins.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" }
})

await writeFile(`${fn}/package.json`, JSON.stringify({ type: "module" }))
await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true
    },
    null,
    2
  )
)

await writeFile(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Always use the friendly domain: the vercel.app address is a different
        // site from the Auth0 domain, so browsers that block third-party
        // cookies drop the guest session there (country picker, guest orders).
        {
          src: "^/(.*)$",
          has: [{ type: "host", value: "kinetik-store-zeta.vercel.app" }],
          status: 308,
          headers: { Location: "https://kinetik.mmatias.co.uk/$1" }
        },
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true
        },
        { src: "^/api(?:/(.*))?$", dest: "/api?__path=$1" },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" }
      ]
    },
    null,
    2
  )
)

console.log(`Vercel build output written to ${out}`)
