import { Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { AtomHttpApi } from "effect/reactivity"
import { StoreApi } from "../shared/Api.ts"
import { AuthorizationClient } from "./auth.tsx"

/**
 * A typed client derived from the shared `StoreApi` definition, integrated
 * with Effect Atom so React components can subscribe to API results.
 *
 * Member endpoints automatically carry the signed-in member's Auth0 access
 * token via the client side of the `Authorization` middleware.
 */
export class StoreClient extends AtomHttpApi.Service<StoreClient>()("kinetik/StoreClient", {
  api: StoreApi,
  httpClient: Layer.mergeAll(FetchHttpClient.layer, AuthorizationClient),
  baseUrl: typeof window === "undefined" ? "http://localhost:3001" : window.location.origin
}) {}
