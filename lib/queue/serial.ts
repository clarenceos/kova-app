import { db } from "@/lib/db";
import { registrationEntries } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

/**
 * Derive a 3-character serial prefix from a competition name.
 *
 * Rules (per D-04):
 * - 3+ alpha-containing words: first letter of first 3 words, uppercased
 * - < 3 alpha-containing words: first 3 letters of first word, uppercased
 * - Non-alpha characters stripped from each word; words that become empty are filtered out
 * - Result is always exactly 3 uppercase characters (padded with last char if needed)
 *
 * Examples:
 *   "Girya Pilipinas Cup" -> "GPC"
 *   "IKO Asian Championships" -> "IAC"
 *   "Manila Open" -> "MAN" (2 words -> first 3 of "Manila")
 *   "Hunger Bells" -> "HUN" (2 words -> first 3 of "Hunger")
 *   "Kettlebell" -> "KET"
 *   "Kova 2026 Open" -> "KOV" ("2026" stripped -> 2 words -> first 3 of "Kova")
 */
export function deriveSerialPrefix(name: string): string {
  // Split into words, strip non-alpha chars from each word, filter empty results
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0);

  let prefix: string;

  if (words.length >= 3) {
    // 3+ words: take first letter of first 3 words
    prefix = words
      .slice(0, 3)
      .map((w) => w[0])
      .join("");
  } else if (words.length > 0) {
    // < 3 words: take first 3 letters of first word
    prefix = words[0].substring(0, 3);
  } else {
    // Empty name: fallback
    prefix = "XXX";
  }

  // Pad to exactly 3 characters by repeating the last character
  while (prefix.length < 3) {
    prefix += prefix[prefix.length - 1] || "X";
  }

  return prefix.toUpperCase();
}

/**
 * Generate a competition-scoped serial number in XXX-0000 format.
 *
 * Sequential number = count of existing registration_entries for this competition + 1.
 * Checks whether the candidate serial already exists in the DB before returning.
 * On collision (race condition), retries up to MAX_RETRIES times by incrementing
 * the sequence number.
 *
 * The caller is responsible for the actual DB insert with the returned serial.
 * The UNIQUE constraint on registration_entries.serial provides the final safety net.
 *
 * @param competitionId - The cuid2 ID of the competition
 * @param serialPrefix - The 3-char prefix (from deriveSerialPrefix or competition.serialPrefix)
 * @returns Serial string like "GPC-0001"
 */
export async function generateCompetitionSerial(
  competitionId: string,
  serialPrefix: string
): Promise<string> {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Count existing entries for this competition
    const [result] = await db
      .select({ count: count() })
      .from(registrationEntries)
      .where(eq(registrationEntries.competitionId, competitionId));

    // Offset by attempt to avoid producing the same serial on retry
    const nextNumber = (result?.count ?? 0) + 1 + attempt;
    const serial = `${serialPrefix}-${String(nextNumber).padStart(4, "0")}`;

    // Check if this serial already exists (race condition guard)
    const [existing] = await db
      .select({ count: count() })
      .from(registrationEntries)
      .where(eq(registrationEntries.serial, serial));

    if ((existing?.count ?? 0) === 0) {
      // Serial is available — return it
      return serial;
    }
    // Serial already taken — loop continues with attempt + 1
  }

  // All retries exhausted — use timestamp-based fallback
  const fallbackNum = Date.now() % 10000;
  return `${serialPrefix}-${String(fallbackNum).padStart(4, "0")}`;
}
