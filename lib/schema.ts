import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
