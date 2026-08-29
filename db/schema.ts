import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const complaints = pgTable(
  "complaints",
  {
    id: serial("id").primaryKey(),
    issueNumber: text("issue_number").notNull(),
    filerNameHash: text("filer_name_hash").notNull(),
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
    // Kept as text rather than a timestamp column so the JSON shape the client
    // already renders ("2026-08-29 10:04:11") is unchanged by the move off D1.
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')::text`),
  },
  (table) => [uniqueIndex("idx_complaints_issue_number").on(table.issueNumber)],
);
