import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { otpCodes, users } from "../../../../db/schema";
import {
  generateOtp,
  isEmail,
  normalizeEmail,
  otpExpiry,
  sha256,
} from "../../../lib/auth";

/**
 * Registration step 1: identity is already proven, capture the email and
 * issue a one-time code.
 *
 * DEMO DELIVERY. There is no mail provider, so the code is returned in the
 * response and shown on screen instead of being emailed. That means anyone
 * can complete verification for an address they do not control, so this is
 * a prototype-only arrangement — a real deployment must send the code out
 * of band and stop returning `demoCode`. It is labelled in the payload and
 * warned about in the logs so the behaviour is never mistaken for real
 * email verification.
 */
export async function POST(request: Request) {
  // Identity and human checks come first, exactly as the portal orders them.
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("jansetu_digilocker=") || !cookie.includes("jansetu_human=1")) {
    return Response.json(
      { error: "Complete DigiLocker and the human check before registering." },
      { status: 403 },
    );
  }

  try {
    const { email: raw } = (await request.json()) as { email?: string };
    const email = normalizeEmail(raw || "");
    if (!isEmail(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing?.passwordHash) {
      return Response.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 },
      );
    }
    if (!existing) {
      await db.insert(users).values({ email, digilockerVerified: true });
    }

    const code = generateOtp();
    await db.insert(otpCodes).values({
      email,
      codeHash: sha256(code),
      purpose: "verify_email",
      expiresAt: otpExpiry(),
    });

    console.warn(
      "[auth] DEMO OTP issued for %s — code returned to the caller, not emailed",
      email,
    );
    return Response.json({
      ok: true,
      email,
      demo: true,
      demoCode: code,
      demoNotice:
        "Demo mode: this code is shown on screen because email delivery is not configured.",
    });
  } catch {
    return Response.json({ error: "Registration could not be started." }, { status: 500 });
  }
}
