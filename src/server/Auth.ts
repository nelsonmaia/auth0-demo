import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import { SecureRandom, Signature } from "effect/crypto"
import { FetchHttpClient } from "effect/http"
import { Jwks, Jwt } from "effect/jose"
import { Authorization, CurrentMember, Member, Unauthorized } from "../shared/Auth.ts"

/**
 * Auth0 settings. The domain is the tenant's custom domain, which is also the
 * issuer of the access tokens the browser sends.
 */
export class AuthConfig extends Context.Service<AuthConfig, {
  readonly domain: string
  readonly audience: string
}>()("kinetik/server/AuthConfig") {
  static readonly layer = Layer.effect(
    AuthConfig,
    Effect.gen(function*() {
      const domain = yield* Config.String("AUTH0_DOMAIN").pipe(Config.withDefault("nelson.jp.mmatias.co.uk"))
      const audience = yield* Config.String("AUTH0_AUDIENCE").pipe(
        Config.withDefault("https://kinetik-store-zeta.vercel.app/api")
      )
      return AuthConfig.of({ domain, audience })
    })
  ).pipe(Layer.orDie)
}

const AccessTokenClaims = Schema.Struct({
  sub: Schema.String,
  scope: Schema.optional(Schema.String)
})

/** Turns a bearer token into a verified member, or fails with `Unauthorized`. */
export class TokenVerifier extends Context.Service<TokenVerifier, {
  verify(token: Redacted.Redacted<string>): Effect.Effect<Member, Unauthorized>
}>()("kinetik/server/TokenVerifier") {
  /** Verifies Auth0 access tokens (RS256) against the tenant's JWKS. */
  static readonly layer = Layer.effect(
    TokenVerifier,
    Effect.gen(function*() {
      const { domain, audience } = yield* AuthConfig
      const crypto = yield* Effect.context<Jwks.Jwks | Signature.Signature>()

      const verify = Effect.fn("TokenVerifier.verify")(function*(token: Redacted.Redacted<string>) {
        if (Redacted.value(token).length === 0) {
          return yield* new Unauthorized({ message: "Sign in to continue." })
        }
        const verified = yield* Jwt.verifyWithKeySet(AccessTokenClaims, token, {
          issuer: `https://${domain}/`,
          audience,
          algorithms: ["RS256"],
          requiredClaims: ["sub", "exp"]
        }).pipe(
          Effect.provide(crypto),
          Effect.tapError((error) => Effect.logWarning("Rejected access token", { reason: String(error) })),
          Effect.mapError(() => new Unauthorized({ message: "Your session has expired. Please sign in again." }))
        )
        return new Member({
          sub: verified.claims.sub,
          scopes: (verified.claims.scope ?? "").split(" ").filter((scope) => scope.length > 0)
        })
      })

      return TokenVerifier.of({ verify })
    })
  ).pipe(
    Layer.provide(
      Layer.unwrap(
        Effect.gen(function*() {
          const { domain } = yield* AuthConfig
          return Jwks.layerRemote({ url: `https://${domain}/.well-known/jwks.json`, timeToLive: "1 hour" })
        })
      ).pipe(
        Layer.orDie,
        Layer.provide(FetchHttpClient.layer),
        // Never follow redirects when fetching signing keys.
        Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" }))
      )
    ),
    Layer.provide(Signature.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto)))
  )

  /** A verifier for tests: known tokens map to members, anything else is rejected. */
  static readonly layerTest = (tokens: Record<string, Member>) =>
    Layer.succeed(
      TokenVerifier,
      TokenVerifier.of({
        verify: (token) => {
          const member = tokens[Redacted.value(token)]
          return member ? Effect.succeed(member) : Effect.fail(new Unauthorized({ message: "Sign in to continue." }))
        }
      })
    )
}

/** Server side of the `Authorization` middleware: verify, then provide the member. */
export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function*() {
    const verifier = yield* TokenVerifier
    return Authorization.of({
      bearer: Effect.fn(function*(httpEffect, { credential }) {
        const member = yield* verifier.verify(credential)
        return yield* Effect.provideService(httpEffect, CurrentMember, member)
      })
    })
  })
)
