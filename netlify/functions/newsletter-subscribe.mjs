const BREVO_DOUBLE_OPT_IN_URL = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
const SUPPORTED_LANGUAGES = new Set(["tr", "en"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function getBrevoConfiguration(environment, language) {
  const normalizedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : null;
  const listId = Number(environment.BREVO_NEWSLETTER_LIST_ID);
  const templateId = Number(environment[`BREVO_DOI_TEMPLATE_ID_${normalizedLanguage?.toUpperCase()}`]);

  if (!environment.BREVO_API_KEY || !Number.isInteger(listId) || listId < 1 || !Number.isInteger(templateId) || templateId < 1) {
    return null;
  }

  return { listId, templateId, language: normalizedLanguage };
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  if (request.method !== "POST") return json(405, { ok: false });

  let payload;
  try { payload = await request.json(); } catch { return json(400, { ok: false }); }

  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const language = typeof payload?.language === "string" ? payload.language : "";
  if (!isValidEmail(email) || !SUPPORTED_LANGUAGES.has(language) || payload?.consent !== true) return json(400, { ok: false });

  // A filled honeypot receives a neutral response without forwarding anything to Brevo.
  if (typeof payload.website === "string" && payload.website.trim()) return json(202, { ok: true });

  const configuration = getBrevoConfiguration(process.env, language);
  if (!configuration) {
    console.error("Newsletter subscription is not configured.");
    return json(503, { ok: false });
  }

  const origin = process.env.URL || new URL(request.url).origin;
  const redirectPath = configuration.language === "en" ? "/en/newsletter-confirmed/" : "/newsletter-confirmed/";
  const response = await fetch(BREVO_DOUBLE_OPT_IN_URL, {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      includeListIds: [configuration.listId],
      templateId: configuration.templateId,
      redirectionUrl: `${origin}${redirectPath}`,
      attributes: {
        ANNOUNCEMENT_LANGUAGE: configuration.language,
        CONSENT_VERSION: "2026-10-29",
        SIGNUP_SOURCE: "website-home"
      }
    })
  });

  if (!response.ok) {
    // Brevo's error describes account/template configuration problems. It never
    // includes the API key; avoid adding the subscriber email to function logs.
    const errorBody = await response.text();
    console.error("Brevo double opt-in request failed.", { status: response.status, errorBody });
    return json(502, { ok: false });
  }
  return json(202, { ok: true });
};
