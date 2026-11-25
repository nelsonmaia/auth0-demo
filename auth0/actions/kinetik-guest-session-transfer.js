/**
 * KINETIK Store: carry a guest's anonymous session over to their account, and
 * complete the member profile without asking for what we already know.
 *
 * Trigger: post-login (v3, node22). Runs on sign-in and right after sign-up.
 * Auth0 exposes the transferred anonymous session as `event.anonymous_session`.
 *
 * Profile: `user_metadata.kinetik_profile`. Details from a guest checkout
 * (full_name, phone, city, postal_code, country on the anonymous session
 * metadata) are copied in first. If the profile is still incomplete, the form
 * "KINETIK member profile" is shown once; its "About you" step is skipped when
 * the name is already known (router on `vars.ask_contact`).
 *
 * Safety: does nothing for any application other than KINETIK Store, and the
 * guest transfer never throws, so it cannot block logins for the rest of the
 * tenant.
 */
const KINETIK_CLIENT_ID = "9ixC3mOlyVKGIzefoa5A6SrcWe1szzn7";
const NAMESPACE = "https://kinetik-store-zeta.vercel.app/";
const PROFILE_FORM_ID = "ap_4rqPmJZfhyFD1jEafh5CWF";
const SPORTS = ["running", "training", "basketball", "trail", "lifestyle"];

const clean = (value, max = 120) => (typeof value === "string" ? value.trim().slice(0, max) : "");
/** Choice and dropdown answers may arrive as a value or a one-item list. */
const single = (value) => (Array.isArray(value) ? value[0] : value);

/** Fills gaps in the profile from guest checkout details. Never overwrites. */
function mergeGuestDetails(profile, metadata) {
  const next = { ...profile };
  let changed = false;
  const fullName = clean(metadata.full_name);
  if (fullName && !(next.first_name && next.last_name)) {
    const parts = fullName.split(/\s+/);
    next.first_name = next.first_name || parts[0];
    next.last_name = next.last_name || parts.slice(1).join(" ") || "";
    changed = true;
  }
  if (!next.phone && clean(metadata.phone, 40)) {
    next.phone = clean(metadata.phone, 40);
    changed = true;
  }
  if (!next.address && clean(metadata.postal_code, 20)) {
    next.address = {
      city: clean(metadata.city, 80),
      postal_code: clean(metadata.postal_code, 20),
      country: clean(metadata.country, 80)
    };
    changed = true;
  }
  // Shoe size from a guest shoe order (UK, converted by the store).
  const orderSize = clean(metadata.order_shoe_size_uk, 4);
  if (!next.shoe_size_uk && /^\d{1,2}(\.5)?$/.test(orderSize)) {
    next.shoe_size_uk = orderSize;
    changed = true;
  }
  if (metadata.newsletter === "yes" && next.marketing_opt_in !== true) {
    next.marketing_opt_in = true;
    next.marketing_source = "store_news_signup";
    changed = true;
  }
  if (changed && fullName) next.prefilled_from = "guest_checkout";
  return { profile: next, changed };
}

exports.onExecutePostLogin = async (event, api) => {
  if (event.client?.client_id !== KINETIK_CLIENT_ID) return;

  const anon = event.anonymous_session;
  let profile = { ...(event.user.user_metadata?.kinetik_profile || {}) };

  if (anon) {
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

      const merged = mergeGuestDetails(profile, metadata);
      if (merged.changed) {
        profile = merged.profile;
        api.user.setUserMetadata("kinetik_profile", profile);
      }
    } catch (error) {
      console.log("KINETIK guest transfer skipped:", error && error.message);
    }
  }

  // Profile complete: nothing to ask.
  if (profile.favourite_sport) return;
  // Forms need an interactive login; refresh-token renewals can't show one.
  if (event.transaction?.protocol === "oauth2-refresh-token") return;

  const firstName = profile.first_name || event.user.given_name || "";
  const lastName = profile.last_name || event.user.family_name || "";
  const askContact = !(firstName && lastName);

  // Pre-fill what a guest purchase suggests: the sport of the shoes bought
  // and their size. The shopper can still change both.
  const orderSport = clean(anon?.metadata?.order_sport, 20);
  const fields = askContact ? { first_name: firstName, last_name: lastName } : {};
  if (SPORTS.includes(orderSport)) fields.favourite_sport = orderSport;
  if (profile.shoe_size_uk) fields.shoe_size = profile.shoe_size_uk;

  api.prompt.render(PROFILE_FORM_ID, {
    vars: { ask_contact: askContact ? "yes" : "no", profile: JSON.stringify(profile) },
    fields
  });
};

exports.onContinuePostLogin = async (event, api) => {
  if (event.client?.client_id !== KINETIK_CLIENT_ID) return;
  const fields = event.prompt?.fields || {};
  let profile = {};
  try {
    profile = JSON.parse(event.prompt?.vars?.profile || "{}");
  } catch {
    profile = {};
  }
  profile = { ...(event.user.user_metadata?.kinetik_profile || {}), ...profile };

  if (clean(fields.first_name)) profile.first_name = clean(fields.first_name);
  if (clean(fields.last_name)) profile.last_name = clean(fields.last_name);
  if (!profile.first_name && event.user.given_name) profile.first_name = event.user.given_name;
  if (!profile.last_name && event.user.family_name) profile.last_name = event.user.family_name;
  if (clean(fields.phone, 40)) profile.phone = clean(fields.phone, 40);
  if (SPORTS.includes(single(fields.favourite_sport))) profile.favourite_sport = single(fields.favourite_sport);
  if (clean(String(single(fields.shoe_size) ?? ""), 4)) profile.shoe_size_uk = clean(String(single(fields.shoe_size)), 4);
  // Keep an opt-in given earlier (store news sign-up); the box can add one.
  profile.marketing_opt_in = profile.marketing_opt_in === true || fields.marketing_opt_in === true || fields.marketing_opt_in === "true";
  profile.completed_at = new Date().toISOString();

  api.user.setUserMetadata("kinetik_profile", profile);
};
