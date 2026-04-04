ALTER TABLE `competitions` ADD `queue_json` text;--> statement-breakpoint
ALTER TABLE `competitions` ADD `queue_saved_at` integer;--> statement-breakpoint
ALTER TABLE `registrants` ADD `is_judging` integer DEFAULT 0 NOT NULL;