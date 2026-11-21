import { useAuth0 } from "@auth0/auth0-react"
import { useAtomSet } from "@effect/atom-react"
import { Effect } from "effect"
import { HttpClientRequest } from "effect/http"
import { HttpApiMiddleware } from "effect/http-api"
import { Atom } from "effect/reactivity"
import { useEffect } from "react"
import { useLocation } from "react-router"
import { Authorization, Scopes } from "../shared/Auth.ts"

/**
 * Public Auth0 settings (none of these are secrets). Sign-in goes through the
 * tenant's custom domain. Override them with VITE_AUTH0_* variables if needed.
 */
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? "nelson.jp.mmatias.co.uk",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? "9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7",
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "https://kinetik-store-zeta.vercel.app/api",
  scope: `openid profile email offline_access ${Scopes.readOrders} ${Scopes.createOrders}`
} as const

export interface MemberProfile {
  readonly sub: string
  readonly name: string
  readonly firstName: string
  readonly email?: string | undefined
  readonly picture?: string | undefined
}

export interface AuthState {
  readonly isLoading: boolean
  readonly isAuthenticated: boolean
  readonly user?: MemberProfile | undefined
}

/** Auth0 session state, mirrored into Effect Atom so atoms can react to it. */
export const authAtom = Atom.make<AuthState>({ isLoading: true, isAuthenticated: false }).pipe(Atom.keepAlive)

// The Auth0 SDK owns the tokens; Effect code only asks it for a fresh one.
let tokenGetter: (() => Promise<string | undefined>) | undefined

const getAccessToken = async (): Promise<string | undefined> => {
  if (!tokenGetter) return undefined
  try {
    return await tokenGetter()
  } catch {
    return undefined
  }
}

/** Client side of the `Authorization` middleware: attach the access token. */
export const AuthorizationClient = HttpApiMiddleware.layerClient(Authorization, ({ next, request }) =>
  Effect.promise(getAccessToken).pipe(
    Effect.flatMap((token) => next(token ? HttpClientRequest.bearerToken(request, token) : request))
  )
)

/** Keeps `authAtom` and the token getter in sync with the Auth0 SDK. */
export function AuthBridge() {
  const { isLoading, isAuthenticated, user, getAccessTokenSilently } = useAuth0()
  const setAuth = useAtomSet(authAtom)

  useEffect(() => {
    tokenGetter = isAuthenticated ? () => getAccessTokenSilently() : undefined
  }, [isAuthenticated, getAccessTokenSilently])

  useEffect(() => {
    const name = user?.name ?? user?.nickname ?? user?.email ?? "Member"
    setAuth({
      isLoading,
      isAuthenticated,
      user: isAuthenticated && user?.sub
        ? {
          sub: user.sub,
          name,
          firstName: user.given_name ?? name.split(/[ @]/)[0] ?? name,
          email: user.email,
          picture: user.picture
        }
        : undefined
    })
  }, [isLoading, isAuthenticated, user, setAuth])

  return null
}

/** Sign in / join / sign out, returning to where the shopper was. */
export function useAuthActions() {
  const { loginWithRedirect, logout } = useAuth0()
  const location = useLocation()
  const here = location.pathname + location.search
  return {
    signIn: (returnTo: string = here) => loginWithRedirect({ appState: { returnTo } }),
    join: (returnTo: string = here) =>
      loginWithRedirect({ appState: { returnTo }, authorizationParams: { screen_hint: "signup" } }),
    signOut: () => logout({ logoutParams: { returnTo: window.location.origin } })
  }
}
