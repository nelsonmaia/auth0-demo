// Node entrypoint: `npm run dev:api` (API only, Vite serves the UI) and
// `npm start` (API + the built UI from ./dist). Works on any Node host such as
// Render, Railway, Fly.io or a plain VM.
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Config, Effect, Layer } from "effect"
import { HttpRouter, HttpStaticServer } from "effect/http"
import { existsSync } from "node:fs"
import { createServer } from "node:http"
import { ApiRoutes } from "./Http.ts"

const StaticRoutes = Layer.unwrap(
  Effect.gen(function*() {
    const root = yield* Config.String("STATIC_ROOT").pipe(Config.withDefault("dist"))
    if (!existsSync(root)) {
      yield* Effect.logInfo(`No ${root}/ folder: serving the API only (run "npm run build" to serve the UI too)`)
      return Layer.empty
    }
    return HttpStaticServer.layer({ root, spa: true })
  })
)

const ServerLive = Layer.unwrap(
  Effect.gen(function*() {
    const port = yield* Config.Int("PORT").pipe(Config.withDefault(3001))
    return HttpRouter.serve(Layer.mergeAll(ApiRoutes, StaticRoutes)).pipe(
      Layer.provide(NodeHttpServer.layer(createServer, { port }))
    )
  })
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
