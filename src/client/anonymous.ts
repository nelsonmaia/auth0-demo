// Auth0 anonymous sessions for guests.
//
// A guest gets an Auth0 identity (`anon@...`) without signing in: a session
// token (30 days, carries the session metadata) and a 1-day access token for
// the KINETIK API. When the guest signs in or joins, a short-lived transfer
// ticket hands the session to Auth0 so a post-login Action can link it to the
// member (see auth0/actions/kinetik-guest-session-transfer.js).
//
// Transfer modes:
// - "cookie": Auth0 also sets the `auth0_anon` cookie on the Auth0 domain, and
//   /authorize picks it up automatically at login. Calls send credentials so the
//   browser keeps that cookie in sync. Browsers that block third-party cookies
//   (Safari, Chrome with 3PC blocked) won't store it while the store and the
//   Auth0 domain are different sites.
// - "ticket": cookieless; a short-lived transfer ticket is added to /authorize.
//
// The session token is stateless: every metadata update returns a new one, so
// we always keep the latest. Requests are serialised so updates never race.

const STORAGE_KEY = "kinetik.guest-session.v1"
const TRANSFER_AUDIENCE = "urn:auth0:anon_transfer"

export type TransferMode = "cookie" | "ticket"

export interface GuestSessionConfig {
  readonly domain: string
  readonly clientId: string
  readonly audience: string
  readonly scope: string
  readonly transfer: TransferMode
}

interface StoredSession {
  readonly sessionToken: string
  readonly sessionExpiresAt: number
  readonly accessToken?: string | undefined
  readonly accessExpiresAt?: number | undefined
  readonly sub?: string | undefined
  readonly metadata: Readonly<Record<string, string>>
}

export interface GuestInfo {
  readonly sub: string
  readonly metadata: Readonly<Record<string, string>>
}

interface TokenResponse {
  readonly session_token?: string
  readonly session_expires_in?: number
  readonly access_token?: string
  readonly expires_in?: number
  readonly anon_transfer_token?: string
}

const load = (): StoredSession | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as StoredSession
    return typeof parsed.sessionToken === "string" && parsed.sessionExpiresAt > Date.now() ? parsed : undefined
  } catch {
    return undefined
  }
}

const save = (session: StoredSession | undefined) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lives in memory only.
  }
}

const subjectOf = (accessToken: string): string | undefined => {
  try {
    const payload = accessToken.split(".")[1] ?? ""
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === "string" ? sub : undefined
  } catch {
    return undefined
  }
}

export function createGuestSessions(config: GuestSessionConfig) {
  let current = load()
  let queue: Promise<unknown> = Promise.resolve()
  const listeners = new Set<(info: GuestInfo | undefined) => void>()

  const info = (): GuestInfo | undefined =>
    current?.sub ? { sub: current.sub, metadata: current.metadata } : undefined

  const publish = () => listeners.forEach((listener) => listener(info()))

  const serialise = <A>(task: () => Promise<A>): Promise<A> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  const request = async (body: Record<string, unknown>): Promise<TokenResponse> => {
    const response = await fetch(`https://${config.domain}/anonymous/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // In cookie mode, let the browser store/refresh the auth0_anon cookie.
      credentials: config.transfer === "cookie" ? "include" : "omit",
      body: JSON.stringify({ client_id: config.clientId, ...body })
    })
    if (!response.ok) throw new Error(`Anonymous session request failed (${response.status})`)
    return (await response.json()) as TokenResponse
  }

  const apply = (response: TokenResponse, metadata: Readonly<Record<string, string>>) => {
    const now = Date.now()
    const sessionToken = response.session_token ?? current?.sessionToken
    if (!sessionToken) throw new Error("Anonymous session returned no session token")
    current = {
      sessionToken,
      sessionExpiresAt: response.session_expires_in
        ? now + response.session_expires_in * 1000
        : current?.sessionExpiresAt ?? now + 86_400_000,
      accessToken: response.access_token ?? current?.accessToken,
      accessExpiresAt: response.expires_in ? now + response.expires_in * 1000 : current?.accessExpiresAt,
      sub: response.access_token ? subjectOf(response.access_token) : current?.sub,
      metadata
    }
    save(current)
    publish()
  }

  /** Starts a new session, or continues the stored one, and returns an access token. */
  const issue = async (extra: Record<string, unknown> = {}, metadata = current?.metadata ?? {}) => {
    const continuing = current?.sessionToken
    try {
      apply(
        await request({
          audience: config.audience,
          scope: config.scope,
          ...(continuing ? { session_token: continuing } : {}),
          ...extra
        }),
        metadata
      )
    } catch (error) {
      if (!continuing) throw error
      // The stored session is no longer valid: start a fresh one.
      current = undefined
      save(undefined)
      apply(await request({ audience: config.audience, scope: config.scope }), {})
    }
    return current?.accessToken
  }

  return {
    /** Current guest identity, if a session exists. */
    current: info,

    subscribe(listener: (info: GuestInfo | undefined) => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    /** An access token for the KINETIK API, creating or refreshing the session as needed. */
    accessToken: (): Promise<string | undefined> =>
      serialise(async () => {
        if (current?.accessToken && (current.accessExpiresAt ?? 0) - 60_000 > Date.now()) return current.accessToken
        return issue()
      }),

    /** Merges metadata into the session (skipped when nothing changed). */
    setMetadata: (patch: Readonly<Record<string, string>>): Promise<void> =>
      serialise(async () => {
        const merged = { ...current?.metadata, ...patch }
        if (current && Object.entries(patch).every(([key, value]) => current?.metadata[key] === value)) return
        await issue({ metadata: patch }, merged)
      }),

    /** How the session is handed to the next login. */
    transferMode: config.transfer,

    /**
     * Ticket mode: a single-use ticket (valid ~30 seconds) that hands this
     * session to the next login. Cookie mode: none needed (waits for pending
     * metadata updates so the cookie is current).
     */
    transferTicket: (): Promise<string | undefined> =>
      serialise(async () => {
        if (config.transfer === "cookie") return undefined
        if (!current?.sessionToken) return undefined
        try {
          const response = await request({ audience: TRANSFER_AUDIENCE, scope: "anon", session_token: current.sessionToken })
          return response.anon_transfer_token
        } catch {
          return undefined
        }
      }),

    /** Forgets the guest session (after it has been handed to a member). */
    clear() {
      current = undefined
      save(undefined)
      publish()
      if (config.transfer === "cookie") {
        // Session cookies are not flushed on login: end it so a later login
        // doesn't pick up this (already transferred) guest session again.
        fetch(`https://${config.domain}/anonymous/logout`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ client_id: config.clientId })
        }).catch(() => undefined)
      }
    }
  }
}
