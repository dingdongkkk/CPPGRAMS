export async function POST(request: Request) {
  const { token } = await request.json() as { token?: string };
  if (!token || token.length > 2048) return Response.json({ error: "Complete the CAPTCHA." }, { status: 400 });
  const secret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
  const remoteip = request.headers.get("CF-Connecting-IP") || undefined;
  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip, idempotency_key: crypto.randomUUID() }),
    }).then((response) => response.json()) as { success?: boolean; action?: string };
    if (!result.success || (result.action && !["file_grievance", "test"].includes(result.action))) {
      return Response.json({ error: "CAPTCHA verification failed." }, { status: 403 });
    }
    return Response.json({ verified: true, mode: process.env.TURNSTILE_SECRET_KEY ? "live" : "demo" }, {
      headers: { "Set-Cookie": "jansetu_human=1; HttpOnly; Secure; SameSite=Lax; Max-Age=1800; Path=/" },
    });
  } catch {
    return Response.json({ error: "CAPTCHA service unavailable." }, { status: 503 });
  }
}
