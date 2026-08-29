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
import { sendOtpEmail } from "../../../lib/email";

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

    const sent = await sendOtpEmail(email, code);
    if (!sent.ok) {
      return Response.json(
        {
          error:
            sent.reason === "not_configured"
              ? "Email delivery is not configured yet, so the code could not be sent."
              : "We could not send the code just now. Please try again.",
        },
        { status: 503 },
      );
    }
    return Response.json({ ok: true, email });
  } catch {
    return Response.json({ error: "Registration could not be started." }, { status: 500 });
  }
}
