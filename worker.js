const PUBLICATION_ID = "pub_d3455252-672c-4e44-ba0a-aa1aee245343";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/subscribe") {
      return handleSubscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleSubscribe(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let email;
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!env.BEEHIIV_API_KEY) {
    console.error("BEEHIIV_API_KEY is not set");
    return json({ error: "Subscriptions are temporarily unavailable." }, 503);
  }

  const upstream = await fetch(
    `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "fieldnotes.au",
        utm_medium: "organic",
      }),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text();
    console.error("Beehiiv subscribe failed", upstream.status, detail);
    return json({ error: "Something went wrong. Please try again." }, 502);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
