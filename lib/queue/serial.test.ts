import { describe, it, expect, vi } from "vitest";

// Mock DB dependencies so the pure deriveSerialPrefix function can be tested
// without a live database connection (TURSO_AUTH_TOKEN not required in test env).
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/schema", () => ({ registrationEntries: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), count: vi.fn() }));

import { deriveSerialPrefix } from "./serial";

describe("deriveSerialPrefix", () => {
  // 3+ words: first letter of first 3 words
  it("3 words -> first letter of each (GPC)", () => {
    expect(deriveSerialPrefix("Girya Pilipinas Cup")).toBe("GPC");
  });

  it("3 words -> first letter of each (IAC)", () => {
    expect(deriveSerialPrefix("IKO Asian Championships")).toBe("IAC");
  });

  it("4+ words -> first letter of first 3 words only", () => {
    expect(deriveSerialPrefix("World Kettlebell Open Championships")).toBe("WKO");
  });

  // < 3 words: first 3 letters of first word (per D-04)
  it("2 words -> first 3 letters of first word (Manila Open -> MAN)", () => {
    expect(deriveSerialPrefix("Manila Open")).toBe("MAN");
  });

  it("2 words -> first 3 letters of first word (Hunger Bells -> HUN)", () => {
    // D-04: pad from first word if fewer than 3 words
    // "Hunger Bells" = 2 words -> first 3 of "Hunger" = HUN
    expect(deriveSerialPrefix("Hunger Bells")).toBe("HUN");
  });

  it("1 word -> first 3 letters", () => {
    expect(deriveSerialPrefix("Kettlebell")).toBe("KET");
  });

  // Edge cases
  it("always uppercase", () => {
    expect(deriveSerialPrefix("girya pilipinas cup")).toBe("GPC");
  });

  it("strips non-alpha words before counting", () => {
    // "Kova 2026 Open" -> strip "2026" (no alpha) -> ["Kova", "Open"] = 2 words -> first 3 of "Kova" = "KOV"
    expect(deriveSerialPrefix("Kova 2026 Open")).toBe("KOV");
  });

  it("result is always exactly 3 characters", () => {
    expect(deriveSerialPrefix("Go")).toHaveLength(3);
    expect(deriveSerialPrefix("A")).toHaveLength(3);
    expect(deriveSerialPrefix("Girya Pilipinas Cup")).toHaveLength(3);
  });

  it("short single word pads to 3 characters", () => {
    // "Go" = 1 word, 2 chars -> pad last char -> "GOO"
    expect(deriveSerialPrefix("Go")).toBe("GOO");
  });
});
