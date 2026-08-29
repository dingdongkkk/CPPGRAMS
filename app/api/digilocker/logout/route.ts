export async function POST() {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "jansetu_digilocker=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/",
  );
  headers.append(
    "Set-Cookie",
    "jansetu_dl_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/",
  );
  headers.append(
    "Set-Cookie",
    "jansetu_dl_profile=; Secure; SameSite=Lax; Max-Age=0; Path=/",
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
