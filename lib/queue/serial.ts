import { db } from "@/lib/db";
import { registrationEntries } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

// Re-export for server-side consumers that already import from this file
export { deriveSerialPrefix } from "./serial-prefix";

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
 * @param pendingOffset - How many serials have already been generated (not yet committed) in
 *   this batch. Pass the loop index (0, 1, 2…) when generating multiple serials before a
 *   db.batch() call so each serial gets a unique sequence number without hitting the DB.
 * @returns Serial string like "GPC-0001"
 */
export async function generateCompetitionSerial(
  competitionId: string,
  serialPrefix: string,
  pendingOffset = 0
): Promise<string> {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Count existing entries for this competition
    const [result] = await db
      .select({ count: count() })
      .from(registrationEntries)
      .where(eq(registrationEntries.competitionId, competitionId));

    // pendingOffset accounts for serials already generated in the same batch (not yet committed).
    // attempt offsets further on each retry to avoid collision with existing DB rows.
    const nextNumber = (result?.count ?? 0) + 1 + attempt + pendingOffset;
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
