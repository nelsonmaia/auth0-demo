import { Auth0Provider, type AppState } from "@auth0/auth0-react"
import { RegistryProvider } from "@effect/atom-react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App, router } from "./App.tsx"
import { auth0Config, AuthBridge } from "./auth.tsx"
import { GuestSync } from "./GuestSync.tsx"
import "./styles.css"

// After Auth0 redirects back, return the shopper to where they started.
const onRedirectCallback = (appState?: AppState) => {
  router.navigate(appState?.returnTo ?? "/", { replace: true })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Config.audience,
        scope: auth0Config.scope
      }}
      // Refresh tokens + local storage keep members signed in on mobile Safari,
      // where third-party cookies (needed for silent iframe auth) are blocked.
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      <RegistryProvider>
        <AuthBridge />
        <GuestSync />
        <App />
      </RegistryProvider>
    </Auth0Provider>
  </StrictMode>
)
