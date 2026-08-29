import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../db";
import { sessions, users } from "../../db/schema";

const scryptAsync = promisify(scrypt);

const SESSION_DAYS = 30;
const OTP_TTL_MINUTES = 10;

/* ── Passwords ─────────────────────────────────────────────────────
   scrypt with a per-password salt. Deliberately not a bare hash: scrypt
   is memory-hard, so an offline attacker cannot trade cheap parallel
   hardware for speed the way they can against SHA-256. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  // Constant-time: a length-dependent early return would leak information.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function passwordProblem(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/i.test(password)) return "Password must contain a letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return null;
}

/* ── One-time codes ────────────────────────────────────────────── */
export function generateOtp() {
  // 6 digits, drawn from the CSPRNG rather than Math.random.
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const otpExpiry = () =>
  new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

/* ── Sessions ──────────────────────────────────────────────────── */
export const SESSION_COOKIE = "jansetu_session";

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 86_400_000,
  ).toISOString();
  await getDb()
    .insert(sessions)
    .values({ tokenHash: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export function sessionCookie(token: string) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_DAYS * 86_400}`,
  ].join("; ");
}

export const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  const hit = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : "";
}

/** The signed-in user, or null. Expired sessions are treated as absent. */
export async function currentUser(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      gender: users.gender,
      country: users.country,
      address: users.address,
      mobile: users.mobile,
      phone: users.phone,
      emailVerified: users.emailVerified,
      digilockerVerified: users.digilockerVerified,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        gt(sessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function destroySession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await getDb().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
