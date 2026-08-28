export async function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  return Response.json({
    siteKey: siteKey || "1x00000000000000000000AA",
    mode: siteKey ? "live" : "demo",
  }, { headers: { "Cache-Control": "no-store" } });
}
