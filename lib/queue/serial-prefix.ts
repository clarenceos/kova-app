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
