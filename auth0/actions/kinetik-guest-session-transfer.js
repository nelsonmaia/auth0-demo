/**
 * KINETIK Store: carry a guest's anonymous session over to their account.
 *
 * Trigger: post-login (v3, node22). Runs on sign-in and right after sign-up.
 * Auth0 exposes the transferred anonymous session as `event.anonymous_session`
 * when the app passes an `anon_transfer_token` to /authorize.
 *
 * Safety: does nothing for any application other than KINETIK Store, and never
 * throws, so it cannot block logins for the rest of the tenant.
 */
const KINETIK_CLIENT_ID = "9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7";
const NAMESPACE = "https://kinetik-store-zeta.vercel.app/";

exports.onExecutePostLogin = async (event, api) => {
  if (event.client?.client_id !== KINETIK_CLIENT_ID) return;
  const anon = event.anonymous_session;
  if (!anon) return;
  try {
    // Lets the KINETIK API move guest orders (anon@...) to this member.
    api.accessToken.setCustomClaim(`${NAMESPACE}anonymous_user_id`, anon.user_id);
    const metadata = anon.metadata || {};
    if (Object.keys(metadata).length > 0) {
      api.accessToken.setCustomClaim(`${NAMESPACE}anonymous_metadata`, metadata);
    }
    // Keep a record of the guest session on the member profile.
    api.user.setAppMetadata("kinetik_last_guest_session", {
      anonymous_user_id: anon.user_id,
      metadata,
      linked_at: new Date().toISOString()
    });
  } catch (error) {
    console.log("KINETIK guest transfer skipped:", error && error.message);
  }
};
