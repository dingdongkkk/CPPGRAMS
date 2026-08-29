-- Additive migration: keeps the existing complaints table and its rows.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"digilocker_verified" boolean DEFAULT false NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"gender" text DEFAULT '' NOT NULL,
	"country" text DEFAULT 'India' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"mobile" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");

CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text DEFAULT 'verify_email' NOT NULL,
	"expires_at" text NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);

CREATE TABLE IF NOT EXISTS "appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"appeal_number" text NOT NULL,
	"complaint_id" integer NOT NULL,
	"user_id" integer,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Under review' NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"officer" text DEFAULT 'Appellate Authority' NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_appeals_number" ON "appeals" USING btree ("appeal_number");

CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);

-- Extra detail the portal collects; existing rows get empty defaults.
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "ministry" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "main_category" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "sub_category" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "reference_number" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "reference_date" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "gender" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "address" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "email" text DEFAULT '' NOT NULL;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "mobile" text DEFAULT '' NOT NULL;
