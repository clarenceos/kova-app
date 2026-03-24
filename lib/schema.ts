import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  athleteName: text("athlete_name").notNull(),
  discipline: text("discipline").notNull(), // "long_cycle" | "jerk" | "snatch"
  weightKg: real("weight_kg").notNull(),
  reps: integer("reps").notNull(),
  youtubeUrl: text("youtube_url"),
  serial: text("serial"), // UUID from the Kova recording overlay
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
