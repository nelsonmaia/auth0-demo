import { FetchHttpClient } from "effect/http"
import { AtomHttpApi } from "effect/reactivity"
import { StoreApi } from "../shared/Api.ts"

/**
 * A typed client derived from the shared `StoreApi` definition, integrated
 * with Effect Atom so React components can subscribe to API results.
 *
 * Rename an endpoint or change a schema on the server and this client stops
 * compiling until the UI is updated.
 */
export class StoreClient extends AtomHttpApi.Service<StoreClient>()("kinetik/StoreClient", {
  api: StoreApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: typeof window === "undefined" ? "http://localhost:3001" : window.location.origin
}) {}
