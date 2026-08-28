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
    status: text("status").notNull().default("Filed"),
    stage: integer("stage").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_complaints_issue_number").on(table.issueNumber),
  ],
);
