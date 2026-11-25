// Vercel serverless entrypoint. `scripts/build-vercel.mjs` bundles this file
// into `.vercel/output/functions/api.func`, and every `/api/*` request is
// routed here. The Effect app is exposed as a standard Web `fetch` handler,
// adapted to Node's (req, res) signature below.
import { Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import { ApiRoutes } from "./Http.ts"

export const { handler } = HttpRouter.toWebHandler(ApiRoutes.pipe(Layer.provide(HttpServer.layerServices)))

const toRequest = (req: IncomingMessage): Request => {
  const proto = String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0]
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost")
  const url = new URL(req.url ?? "/", `${proto}://${host}`)

  // Vercel rewrites `/api/<path>` to this function. If the platform hands us
  // the rewritten URL instead of the original one, restore the original path.
  const original = url.searchParams.get("__path")
  if (original !== null) {
    url.searchParams.delete("__path")
    if (!url.pathname.startsWith("/api/")) url.pathname = `/api/${original}`
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else if (value !== undefined) headers.set(key, value)
  }

  const method = req.method ?? "GET"
  const hasBody = method !== "GET" && method !== "HEAD"
  return new Request(url, {
    method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined,
    // Required by undici when streaming a request body.
    duplex: "half"
  } as RequestInit)
}

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  try {
    const response = await handler(toRequest(req))
    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      if (key !== "set-cookie") res.setHeader(key, value)
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length > 0) res.setHeader("set-cookie", cookies)
    if (response.body === null) {
      res.end()
      return
    }
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream).pipe(res)
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ error: "Internal server error" }))
  }
}
