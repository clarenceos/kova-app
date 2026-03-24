CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_name` text NOT NULL,
	`discipline` text NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`youtube_url` text,
	`serial` text,
	`created_at` integer NOT NULL
);
