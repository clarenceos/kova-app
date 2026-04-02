CREATE TABLE `competitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`num_platforms` integer DEFAULT 3 NOT NULL,
	`allowed_durations` text NOT NULL,
	`allowed_bell_weights` text NOT NULL,
	`max_registrants` integer,
	`registration_deadline` text,
	`serial_prefix` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrants` (
	`id` text PRIMARY KEY NOT NULL,
	`competition_id` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`body_weight_kg` real NOT NULL,
	`country` text NOT NULL,
	`club` text,
	`coach` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registration_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`registrant_id` text NOT NULL,
	`competition_id` text NOT NULL,
	`event` text NOT NULL,
	`bell_weight` text NOT NULL,
	`duration` integer NOT NULL,
	`serial` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_entries_serial_unique` ON `registration_entries` (`serial`);