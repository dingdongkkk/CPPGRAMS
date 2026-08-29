/**
 * Email delivery via Resend.
 *
 * Fails closed: if RESEND_API_KEY is absent this reports failure rather than
 * pretending to send, so a citizen is never told "check your inbox" for a
 * message that was never dispatched.
 */
export async function sendOtpEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set; cannot send OTP");
    return { ok: false as const, reason: "not_configured" as const };
  }

  const from = process.env.RESEND_FROM || "JanSetu <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${code} is your JanSetu verification code`,
        text:
          `Your JanSetu verification code is ${code}.\n\n` +
          `It expires in 10 minutes. If you did not request this, ignore this email.`,
      }),
    });
    if (!response.ok) {
      console.error("[email] Resend rejected the request:", response.status,
        (await response.text()).slice(0, 200));
      return { ok: false as const, reason: "provider_error" as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("[email] send failed:", String(error).slice(0, 200));
    return { ok: false as const, reason: "network" as const };
  }
}
