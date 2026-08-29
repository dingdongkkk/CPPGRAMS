PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_complaints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_number` text NOT NULL,
	`filer_name_hash` text NOT NULL,
	`department` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`urgency` text DEFAULT 'Medium' NOT NULL,
	`urgency_reason` text DEFAULT 'Standard public-service queue' NOT NULL,
	`assigned_officer` text DEFAULT 'Department Grievance Officer' NOT NULL,
	`status` text DEFAULT 'Assigned to officer' NOT NULL,
	`stage` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_complaints`("id", "issue_number", "filer_name_hash", "department", "category", "location", "urgency", "urgency_reason", "assigned_officer", "status", "stage", "created_at") SELECT "id", "issue_number", "filer_name_hash", "department", "category", "location", 'Medium', 'Standard public-service queue', 'Department Grievance Officer', "status", "stage", "created_at" FROM `complaints`;--> statement-breakpoint
DROP TABLE `complaints`;--> statement-breakpoint
ALTER TABLE `__new_complaints` RENAME TO `complaints`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_complaints_issue_number` ON `complaints` (`issue_number`);
