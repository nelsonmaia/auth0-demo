import { Context, Schema } from "effect"
import { HttpApiMiddleware, HttpApiSecurity } from "effect/http-api"

// Shared by server and browser. The server implements `Authorization` by
// verifying Auth0 access tokens; the browser implements its client side by
// attaching the signed-in member's access token to requests.

/**
 * The caller, taken from a verified Auth0 access token. Either a signed-in
 * member, or a guest with an Auth0 anonymous session (`anon@...`).
 */
export class Member extends Schema.Class<Member>("Member")({
  sub: Schema.String,
  scopes: Schema.Array(Schema.String),
  /** True for Auth0 anonymous-session (guest) tokens. */
  anonymous: Schema.optionalKey(Schema.Boolean),
  /** For members: the guest session transferred to them at sign-in. */
  linkedAnonymousId: Schema.optionalKey(Schema.String),
  /** Anonymous session metadata (mapped claims for guests, transferred for members). */
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.String))
}) {}

export const isGuest = (member: Member) => member.anonymous === true

export class CurrentMember extends Context.Service<CurrentMember, Member>()("kinetik/CurrentMember") {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  { message: Schema.String, requiredScope: Schema.String },
  { httpApiStatus: 403 }
) {}

export class Authorization extends HttpApiMiddleware.Service<Authorization, {
  provides: CurrentMember
}>()("kinetik/Authorization", {
  requiredForClient: true,
  security: { bearer: HttpApiSecurity.bearer },
  error: Unauthorized
}) {}

/** Scopes the store API defines in Auth0. */
export const Scopes = {
  readOrders: "read:orders",
  createOrders: "create:orders"
} as const
