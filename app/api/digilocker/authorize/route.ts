import { getDb } from "../../../../db";
import { digilockerProfiles } from "../../../../db/schema";
import { DigiCitizenProfile } from "../../../digilocker/data";

function generateSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "dl_sess_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { profile: DigiCitizenProfile };
    if (!payload.profile || !payload.profile.name || !payload.profile.aadhaarMasked) {
      return Response.json({ error: "Invalid profile data provided." }, { status: 400 });
    }

    const profile = payload.profile;
    const sessionId = generateSessionId();
    const verifiedProfile: DigiCitizenProfile = {
      ...profile,
      id: sessionId,
      verifiedAt: new Date().toISOString(),
    };

    // Try saving to Postgres/Supabase database if available
    try {
      if (process.env.DATABASE_URL) {
        const db = getDb();
        await db.insert(digilockerProfiles).values({
          sessionId,
          aadhaarMasked: verifiedProfile.aadhaarMasked,
          name: verifiedProfile.name,
          gender: verifiedProfile.gender,
          dob: verifiedProfile.dob,
          age: verifiedProfile.age,
          mobileMasked: verifiedProfile.mobileMasked,
          email: verifiedProfile.email || "",
          address: verifiedProfile.address,
          locality: verifiedProfile.locality || "",
          district: verifiedProfile.district || "",
          state: verifiedProfile.state || "",
          pincode: verifiedProfile.pincode || "",
          documentsJson: JSON.stringify(verifiedProfile.documents || []),
          photoAvatar: verifiedProfile.photoAvatar || "",
        });
      }
    } catch (dbError) {
      console.warn("[digilocker/authorize] DB storage notice (falling back to cookie session):", dbError);
    }

    // Set secure HTTP-only and client-readable cookies for robust multi-step session
    const profileJson = JSON.stringify(verifiedProfile);
    const encodedProfile = encodeURIComponent(profileJson);

    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `jansetu_digilocker=verified; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/`,
    );
    headers.append(
      "Set-Cookie",
      `jansetu_dl_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/`,
    );
    headers.append(
      "Set-Cookie",
      `jansetu_dl_profile=${encodedProfile}; Secure; SameSite=Lax; Max-Age=3600; Path=/`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId,
        profile: verifiedProfile,
      }),
      {
        status: 200,
        headers,
      },
    );
  } catch (err) {
    console.error("[digilocker/authorize] Error:", err);
    return Response.json({ error: "Failed to authorize DigiLocker session." }, { status: 500 });
  }
}
