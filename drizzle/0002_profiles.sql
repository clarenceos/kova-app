CREATE TABLE `profiles` (
	`user_id` TEXT PRIMARY KEY NOT NULL,
	`name` TEXT NOT NULL,
	`gender` TEXT NOT NULL,
	`body_weight_kg` REAL,
	`experience_level` TEXT NOT NULL,
	`avatar_url` TEXT,
	`onboarding_complete` INTEGER NOT NULL DEFAULT 0,
	`created_at` INTEGER NOT NULL
);
