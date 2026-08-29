import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const nowText = sql`(now() AT TIME ZONE 'utc')::text`;

/**
 * Registration is deliberately staged, mirroring the portal: identity is
 * proven first (DigiLocker + CAPTCHA), then the email is verified by OTP,
 * and only then is a password set. A row exists from the first step, so
 * `emailVerified` and `passwordHash` both being populated is what makes an
 * account usable.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    // Null until the citizen completes the final registration step.
    passwordHash: text("password_hash"),
    digilockerVerified: boolean("digilocker_verified").notNull().default(false),
    fullName: text("full_name").notNull().default(""),
    gender: text("gender").notNull().default(""),
    country: text("country").notNull().default("India"),
    address: text("address").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    phone: text("phone").notNull().default(""),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)],
);

/** Short-lived email codes. Stored hashed so a database leak reveals none. */
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: text("purpose").notNull().default("verify_email"),
  expiresAt: text("expires_at").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: text("created_at").notNull().default(nowText),
});

/** Session tokens are stored hashed; the raw token only lives in the cookie. */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(nowText),
});

export const complaints = pgTable(
  "complaints",
  {
    id: serial("id").primaryKey(),
    issueNumber: text("issue_number").notNull(),
    filerNameHash: text("filer_name_hash").notNull(),
    // Null for complaints filed before accounts existed.
    userId: integer("user_id"),
    department: text("department").notNull(),
    category: text("category").notNull(),
    location: text("location").notNull(),
    urgency: text("urgency").notNull().default("Medium"),
    urgencyReason: text("urgency_reason")
      .notNull()
      .default("Standard public-service queue"),
    assignedOfficer: text("assigned_officer")
      .notNull()
      .default("Department Grievance Officer"),
    status: text("status").notNull().default("Assigned to officer"),
    stage: integer("stage").notNull().default(1),
    journeyJson: text("journey_json").notNull().default("[]"),
    // Structured detail the portal collects and JanSetu previously did not.
    ministry: text("ministry").notNull().default(""),
    mainCategory: text("main_category").notNull().default(""),
    subCategory: text("sub_category").notNull().default(""),
    description: text("description").notNull().default(""),
    referenceNumber: text("reference_number").notNull().default(""),
    referenceDate: text("reference_date").notNull().default(""),
    gender: text("gender").notNull().default(""),
    address: text("address").notNull().default(""),
    email: text("email").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("idx_complaints_issue_number").on(table.issueNumber)],
);

/** Appeals are tracked separately from the grievance they contest. */
export const appeals = pgTable(
  "appeals",
  {
    id: serial("id").primaryKey(),
    appealNumber: text("appeal_number").notNull(),
    complaintId: integer("complaint_id").notNull(),
    userId: integer("user_id"),
    reason: text("reason").notNull().default(""),
    status: text("status").notNull().default("Under review"),
    stage: integer("stage").notNull().default(1),
    officer: text("officer").notNull().default("Appellate Authority"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("idx_appeals_number").on(table.appealNumber)],
);

/** Account activity — the portal shows this, and it is useful for trust. */
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(nowText),
});

export const digilockerProfiles = pgTable(
  "digilocker_profiles",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    aadhaarMasked: text("aadhaar_masked").notNull(),
    name: text("name").notNull(),
    gender: text("gender").notNull(),
    dob: text("dob").notNull(),
    age: integer("age").notNull(),
    mobileMasked: text("mobile_masked").notNull(),
    email: text("email").notNull().default(""),
    address: text("address").notNull(),
    locality: text("locality").notNull().default(""),
    district: text("district").notNull().default(""),
    state: text("state").notNull().default(""),
    pincode: text("pincode").notNull().default(""),
    documentsJson: text("documents_json").notNull().default("[]"),
    photoAvatar: text("photo_avatar").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(nowText),
  },
  (table) => [uniqueIndex("idx_digilocker_session_id").on(table.sessionId)],
);

