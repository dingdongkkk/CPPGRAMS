import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { digilockerProfiles } from "../../../../db/schema";
import { DigiCitizenProfile } from "../../../digilocker/data";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  
  // Check if session ID cookie or profile cookie is present
  const sessionMatch = cookie.match(/jansetu_dl_session=([^;]+)/);
  const profileMatch = cookie.match(/jansetu_dl_profile=([^;]+)/);

  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (sessionId && process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const [record] = await db
        .select()
        .from(digilockerProfiles)
        .where(eq(digilockerProfiles.sessionId, sessionId))
        .limit(1);

      if (record) {
        let documents = [];
        try {
          documents = JSON.parse(record.documentsJson);
        } catch {
          documents = [];
        }

        const profile: DigiCitizenProfile = {
          id: record.sessionId,
          aadhaarMasked: record.aadhaarMasked,
          name: record.name,
          gender: record.gender as "Male" | "Female" | "Other",
          dob: record.dob,
          age: record.age,
          mobileMasked: record.mobileMasked,
          email: record.email,
          address: record.address,
          locality: record.locality,
          district: record.district,
          state: record.state,
          pincode: record.pincode,
          photoAvatar: record.photoAvatar,
          documents,
          verifiedAt: record.createdAt,
        };

        return Response.json({ authenticated: true, profile });
      }
    } catch (dbErr) {
      console.warn("[digilocker/session] DB read warning, checking fallback cookie:", dbErr);
    }
  }

  // Fallback to client-side encoded profile cookie
  if (profileMatch) {
    try {
      const decoded = decodeURIComponent(profileMatch[1]);
      const profile = JSON.parse(decoded) as DigiCitizenProfile;
      return Response.json({ authenticated: true, profile });
    } catch (parseErr) {
      console.error("[digilocker/session] Cookie decode failed:", parseErr);
    }
  }

  return Response.json({ authenticated: false, profile: null });
}
