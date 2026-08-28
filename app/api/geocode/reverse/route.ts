const stateNames: Record<string, string> = {
  "National Capital Territory of Delhi": "Delhi",
  "NCT of Delhi": "Delhi",
  "Jammu and Kashmir": "Jammu and Kashmir",
  "Andaman and Nicobar": "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu":
    "Dadra and Nagar Haveli and Daman and Diu",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  const language = (url.searchParams.get("lang") || "en-IN").slice(0, 24);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("accept-language", language);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JanSetu/1.0 (citizen-grievance prototype)",
    },
    cache: "no-store",
  });
  if (!response.ok)
    return Response.json({ error: "Address lookup unavailable" }, { status: 502 });

  const result = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const address = result.address || {};
  const rawState = address.state || address["state_district"] || "";
  const state = stateNames[rawState] || rawState;
  return Response.json({
    address: result.display_name || "",
    state,
    district: address.state_district || address.county || address.district || "",
    village:
      address.village ||
      address.hamlet ||
      address.town ||
      address.city ||
      address.suburb ||
      "",
    postcode: address.postcode || "",
  });
}
