CREATE TABLE `complaints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_number` text NOT NULL,
	`filer_name_hash` text NOT NULL,
	`department` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'Filed' NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_complaints_issue_number` ON `complaints` (`issue_number`);