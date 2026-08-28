export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = process.env.DIGILOCKER_CLIENT_ID;
  if (!clientId) {
    const redirect = new URL("/", url.origin);
    redirect.searchParams.set("digilocker", "demo-verified");
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect.toString(),
        "Set-Cookie": "jansetu_digilocker=demo; HttpOnly; Secure; SameSite=Lax; Max-Age=1800; Path=/",
      },
    });
  }

  // Real DigiLocker partner OAuth is enabled only after partner credentials
  // and the exact callback URI are registered for this deployment.
  return Response.json({
    error: "DigiLocker partner credentials are present, but the approved OAuth callback must be activated by the site owner.",
  }, { status: 503 });
}
