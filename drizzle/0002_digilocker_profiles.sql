CREATE TABLE IF NOT EXISTS "digilocker_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"aadhaar_masked" text NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"dob" text NOT NULL,
	"age" integer NOT NULL,
	"mobile_masked" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text NOT NULL,
	"locality" text DEFAULT '' NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"pincode" text DEFAULT '' NOT NULL,
	"documents_json" text DEFAULT '[]' NOT NULL,
	"photo_avatar" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_digilocker_session_id" ON "digilocker_profiles" USING btree ("session_id");
