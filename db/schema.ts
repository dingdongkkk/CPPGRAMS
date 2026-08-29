import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const complaints = sqliteTable(
  "complaints",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    issueNumber: text("issue_number").notNull(),
    filerNameHash: text("filer_name_hash").notNull(),
    department: text("department").notNull(),
    category: text("category").notNull(),
    location: text("location").notNull(),
    urgency: text("urgency").notNull().default("Medium"),
    urgencyReason: text("urgency_reason").notNull().default("Standard public-service queue"),
    assignedOfficer: text("assigned_officer").notNull().default("Department Grievance Officer"),
    status: text("status").notNull().default("Assigned to officer"),
    stage: integer("stage").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_complaints_issue_number").on(table.issueNumber),
  ],
);
