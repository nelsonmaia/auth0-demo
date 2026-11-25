/**
 * Auth0 custom phone provider: send SMS through ClickSend.
 *
 * Trigger: custom-phone-provider (v1, node22). One phone provider serves the
 * whole tenant, so this sends every Auth0 SMS (sign-in / enrolment codes,
 * MFA, password-change notices) for all apps.
 *
 * Secrets (Auth0 dashboard → Actions → this Action → Secrets):
 *   CLICKSEND_USERNAME  ClickSend account username (sign-in email)
 *   CLICKSEND_API_KEY   ClickSend API key (Dashboard → Developers → API Credentials)
 *   CLICKSEND_FROM      optional sender: an approved sender name (e.g. KINETIK)
 *                       or a dedicated number; omit to use ClickSend's shared numbers
 *   REDIRECT_PHONE_PREFIXES  optional comma-separated E.164 prefixes; SMS for a
 *                       number starting with one goes to REDIRECT_PHONE_TO instead
 *                       (demo personas), e.g. "+44746834"
 *   REDIRECT_PHONE_TO   where redirected SMS go, in E.164, e.g. "+447700900123"
 *
 * A redirected SMS starts with "[for <original number>]".
 *
 * API: POST https://rest.clicksend.com/v3/sms/send with HTTP Basic auth
 * (username:api_key). Voice delivery is not used (provider is text only).
 */
const CLICKSEND_URL = "https://rest.clicksend.com/v3/sms/send";

const digits = (value) => String(value || "").replace(/\D/g, "");

// Fallbacks when the REDIRECT_PHONE_* secrets aren't set. Blank in git (the
// repo is public); the deployed copy has them filled in, because adding
// secrets through the Management API would replace the ClickSend key.
const DEFAULT_REDIRECT_PHONE_PREFIXES = "";
const DEFAULT_REDIRECT_PHONE_TO = "";

exports.onExecuteCustomPhoneProvider = async (event, api) => {
  const { recipient, as_text: text, delivery_method: method, message_type: type } = event.notification;
  const username = event.secrets.CLICKSEND_USERNAME;
  const apiKey = event.secrets.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    // Not configured yet: drop instead of retrying forever.
    console.log("ClickSend secrets missing; SMS not sent", { type });
    api.notification.drop("ClickSend secrets CLICKSEND_USERNAME / CLICKSEND_API_KEY are not set");
    return;
  }
  if (method !== "text") {
    api.notification.drop(`Delivery method ${method} is not supported (SMS only)`);
    return;
  }

  const redirectTo = digits(event.secrets.REDIRECT_PHONE_TO || DEFAULT_REDIRECT_PHONE_TO);
  const prefixes = String(event.secrets.REDIRECT_PHONE_PREFIXES || DEFAULT_REDIRECT_PHONE_PREFIXES).split(",").map(digits).filter(Boolean);
  const number = digits(recipient);
  const redirected = Boolean(redirectTo) && number !== redirectTo && prefixes.some((p) => number.startsWith(p));

  const message = {
    source: "auth0",
    to: redirected ? `+${redirectTo}` : recipient,
    body: redirected ? `[for ${recipient}] ${text}` : text,
    ...(event.secrets.CLICKSEND_FROM ? { from: event.secrets.CLICKSEND_FROM } : {})
  };

  let response;
  try {
    response = await fetch(CLICKSEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64")
      },
      body: JSON.stringify({ messages: [message] })
    });
  } catch (error) {
    // Network problem: let Auth0 try again.
    api.notification.retry(`ClickSend request failed: ${error && error.message}`);
    return;
  }

  const body = await response.json().catch(() => ({}));
  const status = body?.data?.messages?.[0]?.status;
  if (response.ok && body.response_code === "SUCCESS" && status === "SUCCESS") {
    console.log("ClickSend SMS queued", { type, redirected, message_id: body.data.messages[0].message_id });
    return;
  }

  const reason = `ClickSend ${response.status} ${body.response_code || ""} ${status || ""} ${body.response_msg || ""}`.trim();
  console.log("ClickSend SMS failed", { type, reason });
  // 5xx and rate limits are worth retrying; anything else (bad credentials,
  // invalid number, no credit, unapproved sender) is not.
  if (response.status >= 500 || response.status === 429) api.notification.retry(reason);
  else api.notification.drop(reason);
};
