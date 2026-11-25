/**
 * Auth0 custom email provider: send every Auth0 email through Resend's API,
 * redirecting emails for chosen demo addresses to a real inbox.
 *
 * Trigger: custom-email-provider (v1, node22). The email provider is
 * tenant-wide, so this sends for every app.
 *
 * Secrets (Auth0 dashboard → Actions → this Action → Secrets):
 *   RESEND_API_KEY        Resend API key (sending access, domain mail.mmatias.co.uk)
 *   REDIRECT_ADDRESSES    comma-separated recipients to redirect,
 *                         e.g. "hazel.nutt@okta.com, other.persona@okta.com"
 *   REDIRECT_TO           where redirected emails go, e.g. a real inbox
 *   FROM_ADDRESS          optional, default "KINETIK <no-reply@mail.mmatias.co.uk>"
 *
 * A redirected email keeps its content; the subject gets "[for <original>]"
 * and the X-Original-To header records the original recipient.
 */
const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "KINETIK <no-reply@mail.mmatias.co.uk>";

const list = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

exports.onExecuteCustomEmailProvider = async (event, api) => {
  const { to, subject, html, text, message_type: type } = event.notification;
  const apiKey = event.secrets.RESEND_API_KEY;
  if (!apiKey) {
    api.notification.drop("RESEND_API_KEY secret is not set");
    return;
  }

  const redirectTo = String(event.secrets.REDIRECT_TO || "").trim();
  const redirected = Boolean(redirectTo) && list(event.secrets.REDIRECT_ADDRESSES).includes(String(to).toLowerCase());

  const payload = {
    from: event.secrets.FROM_ADDRESS || DEFAULT_FROM,
    to: [redirected ? redirectTo : to],
    subject: redirected ? `[for ${to}] ${subject}` : subject,
    html,
    text,
    headers: redirected ? { "X-Original-To": to } : undefined,
    tags: [
      { name: "auth0_message_type", value: String(type || "unknown").replace(/[^A-Za-z0-9_-]/g, "_") },
      { name: "redirected", value: redirected ? "yes" : "no" }
    ]
  };

  let response;
  try {
    response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    api.notification.retry(`Resend request failed: ${error && error.message}`);
    return;
  }

  const body = await response.json().catch(() => ({}));
  if (response.ok && body.id) {
    console.log("Resend email sent", { type, id: body.id, redirected });
    return;
  }
  const reason = `Resend ${response.status} ${body.name || ""} ${body.message || ""}`.trim();
  console.log("Resend email failed", { type, reason });
  if (response.status >= 500 || response.status === 429) api.notification.retry(reason);
  else api.notification.drop(reason);
};
