import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  athleteName: text("athlete_name").notNull(),
  discipline: text("discipline").notNull(), // "long_cycle" | "jerk" | "snatch"
  weightKg: real("weight_kg").notNull(),
  reps: integer("reps").notNull(),
  youtubeUrl: text("youtube_url"),
  serial: text("serial"), // UUID from the Kova recording overlay
  youtubeId: text("youtube_id"),
  status: text("status").default("pending"), // 'pending' | 'judged'
  athleteId: text("athlete_id"), // Clerk user ID
  repTaps: text("rep_taps"), // JSON string of {time: number|null, type: 'rep'|'no-rep'}[]
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender").notNull(), // 'male' | 'female' | 'other' | 'prefer_not_to_say'
  bodyWeightKg: real("body_weight_kg"),
  experienceLevel: text("experience_level").notNull(), // 'beginner' | 'intermediate' | 'advanced' | 'elite' | 'prefer_not_to_say'
  avatarUrl: text("avatar_url"),
  onboardingComplete: integer("onboarding_complete").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// -- db.batch() convention: All multi-table writes (Phase 6+) must use
// -- db.batch() for atomicity. Never use db.transaction() over Turso HTTP. (D-08)

export const competitions = sqliteTable("competitions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  date: text("date").notNull(), // ISO date string (D-07: text, not timestamp)
  numPlatforms: integer("num_platforms").notNull().default(3),
  allowedDurations: text("allowed_durations").notNull(), // 'both' | '10' | '5'
  allowedBellWeights: text("allowed_bell_weights").notNull(), // JSON string e.g. '["2x8","2x12"]'
  maxRegistrants: integer("max_registrants"),
  registrationDeadline: text("registration_deadline"), // nullable ISO datetime (D-07: text)
  serialPrefix: text("serial_prefix").notNull(), // 3-char uppercase e.g. "GPC"
  status: text("status").notNull().default("draft"), // 'draft' | 'open' | 'closed'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(), // D-06: integer timestamp
  queueJson: text("queue_json"), // nullable — JSON.stringify(TimeBlock[]) for persisted queue
  queueSavedAt: integer("queue_saved_at", { mode: "timestamp" }), // nullable — last saved timestamp
});

export type Competition = typeof competitions.$inferSelect;
export type NewCompetition = typeof competitions.$inferInsert;

export const registrants = sqliteTable("registrants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  competitionId: text("competition_id").notNull(), // FK to competitions.id (no Drizzle FK constraint per existing pattern)
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  gender: text("gender").notNull(), // 'Male' | 'Female'
  bodyWeightKg: real("body_weight_kg").notNull(),
  country: text("country").notNull(),
  club: text("club"), // nullable
  coach: text("coach"), // nullable
  isJudging: integer("is_judging").notNull().default(0), // 0=not judging, 1=judge-only, 2=competing+judging
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(), // D-06: integer timestamp
});

export type Registrant = typeof registrants.$inferSelect;
export type NewRegistrant = typeof registrants.$inferInsert;

export const registrationEntries = sqliteTable("registration_entries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  registrantId: text("registrant_id").notNull(), // FK to registrants.id
  competitionId: text("competition_id").notNull(), // FK to competitions.id
  event: text("event").notNull(), // 'LC' | 'JERK' | 'SNATCH'
  bellWeight: text("bell_weight").notNull(), // e.g. '2x16' or '1x16'
  duration: integer("duration").notNull(), // 10 or 5
  serial: text("serial").notNull().unique(), // UNIQUE constraint for collision prevention (D-05)
  status: text("status").notNull().default("registered"), // 'registered' | 'scratched' | 'dns'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(), // D-06: integer timestamp
});

export type RegistrationEntry = typeof registrationEntries.$inferSelect;
export type NewRegistrationEntry = typeof registrationEntries.$inferInsert;
