import { currentUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
