import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB dependencies for testing
// mockWhere is called for each .where() invocation; its return value is what the query returns.
const mockWhere = vi.fn().mockReturnValue([{ count: 0 }]);

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...wArgs: unknown[]) => mockWhere(...wArgs),
      }),
    }),
  },
}));
vi.mock("@/lib/schema", () => ({
  registrationEntries: {
    competitionId: "competition_id",
    serial: "serial",
  },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _type: "eq", val })),
  count: vi.fn(() => ({ _type: "count" })),
}));

import { deriveSerialPrefix, generateCompetitionSerial } from "./serial";

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

describe("generateCompetitionSerial", () => {
  beforeEach(() => {
    mockWhere.mockReset();
    // Default: 0 existing entries, serial not taken
    mockWhere.mockReturnValue([{ count: 0 }]);
  });

  it("returns XXX-0001 when competition has 0 entries and serial is available", async () => {
    const serial = await generateCompetitionSerial("comp-123", "TST");
    expect(serial).toBe("TST-0001");
  });

  it("retries and increments when first candidate serial already exists", async () => {
    let callCount = 0;
    // Override mockWhere to simulate: first call = count 0 entries, second call = serial exists, third call = count again, fourth call = serial available
    mockWhere.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [{ count: 0 }]; // count query: 0 entries
      if (callCount === 2) return [{ count: 1 }]; // existence check: TST-0001 taken
      if (callCount === 3) return [{ count: 0 }]; // count query on retry: still 0 entries
      if (callCount === 4) return [{ count: 0 }]; // existence check: TST-0002 available
      return [{ count: 0 }];
    });

    const serial = await generateCompetitionSerial("comp-123", "TST");
    expect(serial).toBe("TST-0002");
  });

  it("returns serial matching XXX-0000 format", async () => {
    const serial = await generateCompetitionSerial("comp-123", "ABC");
    expect(serial).toMatch(/^[A-Z]{3}-\d{4}$/);
  });
});
