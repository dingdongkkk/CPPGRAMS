CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_number" text NOT NULL,
	"filer_name_hash" text NOT NULL,
	"department" text NOT NULL,
	"category" text NOT NULL,
	"location" text NOT NULL,
	"urgency" text DEFAULT 'Medium' NOT NULL,
	"urgency_reason" text DEFAULT 'Standard public-service queue' NOT NULL,
	"assigned_officer" text DEFAULT 'Department Grievance Officer' NOT NULL,
	"status" text DEFAULT 'Assigned to officer' NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"journey_json" text DEFAULT '[]' NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_complaints_issue_number" ON "complaints" USING btree ("issue_number");