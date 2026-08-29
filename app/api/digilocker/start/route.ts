export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  const simulatorUrl = new URL("/digilocker", url.origin);
  simulatorUrl.searchParams.set("return_to", returnTo);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: simulatorUrl.toString(),
    },
  });
}

