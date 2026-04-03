import { describe, it, expect } from "vitest";
import { schedule } from "./scheduler";
import type { SchedulerEntry, SchedulerInput } from "./types";

// ---------------------------------------------------------------------------
// Test fixture helper
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<SchedulerEntry>): SchedulerEntry {
  return {
    registrantId: "reg-1",
    firstName: "Test",
    lastName: "Athlete",
    gender: "Male",
    bodyWeightKg: 75,
    country: "PH",
    club: null,
    coach: null,
    entryId: "entry-1",
    event: "LC",
    bellWeight: "2x16",
    duration: 10,
    serial: "TST-0001",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------

describe("sort order", () => {
  it("LC entries appear before Jerk entries, Jerk before Snatch", () => {
    const input: SchedulerInput = {
      numPlatforms: 3,
      startTimeMinutes: 540,
      entries: [
        makeEntry({ entryId: "e-snatch", event: "SNATCH", registrantId: "r-s" }),
        makeEntry({ entryId: "e-lc", event: "LC", registrantId: "r-l" }),
        makeEntry({ entryId: "e-jerk", event: "JERK", registrantId: "r-j" }),
      ],
    };
    const result = schedule(input);
    // All 3 in one block (3 platforms)
    expect(result.timeBlocks).toHaveLength(1);
    const slots = result.timeBlocks[0].platforms;
    expect(slots[0]?.entryId).toBe("e-lc");
    expect(slots[1]?.entryId).toBe("e-jerk");
    expect(slots[2]?.entryId).toBe("e-snatch");
  });

  it("within same event, 10-minute duration comes before 5-minute duration", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({ entryId: "e-5min", event: "LC", duration: 5, registrantId: "r-5" }),
        makeEntry({ entryId: "e-10min", event: "LC", duration: 10, registrantId: "r-10" }),
      ],
    };
    const result = schedule(input);
    expect(result.timeBlocks).toHaveLength(1);
    const slots = result.timeBlocks[0].platforms;
    expect(slots[0]?.entryId).toBe("e-10min");
    expect(slots[1]?.entryId).toBe("e-5min");
  });

  it("within same event+duration, Female entries come before Male entries", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({ entryId: "e-male", event: "LC", duration: 10, gender: "Male", bodyWeightKg: 75, registrantId: "r-m" }),
        makeEntry({ entryId: "e-female", event: "LC", duration: 10, gender: "Female", bodyWeightKg: 60, registrantId: "r-f" }),
      ],
    };
    const result = schedule(input);
    expect(result.timeBlocks).toHaveLength(1);
    const slots = result.timeBlocks[0].platforms;
    expect(slots[0]?.entryId).toBe("e-female");
    expect(slots[1]?.entryId).toBe("e-male");
  });

  it("within same event+duration+gender, bounded weight classes sort in ascending bracket order", () => {
    // Female: 52kg < 57kg < 61kg
    const input: SchedulerInput = {
      numPlatforms: 3,
      startTimeMinutes: 540,
      entries: [
        makeEntry({ entryId: "e-61", event: "LC", duration: 10, gender: "Female", bodyWeightKg: 60, registrantId: "r-61" }),
        makeEntry({ entryId: "e-52", event: "LC", duration: 10, gender: "Female", bodyWeightKg: 52, registrantId: "r-52" }),
        makeEntry({ entryId: "e-57", event: "LC", duration: 10, gender: "Female", bodyWeightKg: 55, registrantId: "r-57" }),
      ],
    };
    const result = schedule(input);
    expect(result.timeBlocks).toHaveLength(1);
    const slots = result.timeBlocks[0].platforms;
    expect(slots[0]?.entryId).toBe("e-52");
    expect(slots[1]?.entryId).toBe("e-57");
    expect(slots[2]?.entryId).toBe("e-61");
  });

  it("within same weight class, lighter bodyWeightKg comes first (D-08 tiebreaker)", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({ entryId: "e-heavy", event: "LC", duration: 10, gender: "Male", bodyWeightKg: 80, registrantId: "r-heavy" }),
        makeEntry({ entryId: "e-light", event: "LC", duration: 10, gender: "Male", bodyWeightKg: 77, registrantId: "r-light" }),
      ],
    };
    const result = schedule(input);
    // Both are in the 80kg bracket; lighter bodyweight first
    expect(result.timeBlocks).toHaveLength(1);
    const slots = result.timeBlocks[0].platforms;
    expect(slots[0]?.entryId).toBe("e-light");
    expect(slots[1]?.entryId).toBe("e-heavy");
  });

  it("super-heavyweight Female (80+kg) sorts AFTER bounded 80kg Female", () => {
    // Entry A: Female, 79kg -> 80kg bracket (bounded)
    // Entry B: Female, 85kg -> 80+kg bracket (super-heavyweight)
    // Expected: A in block 1 (platform 0), B in block 2 (platform 0) on 1 platform
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e-superheavy-f",
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 85,
          registrantId: "r-shf",
        }),
        makeEntry({
          entryId: "e-80kg-f",
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 79,
          registrantId: "r-80f",
        }),
      ],
    };
    const result = schedule(input);
    expect(result.timeBlocks).toHaveLength(2);
    // Block 1: bounded 80kg (bodyWeightKg=79)
    expect(result.timeBlocks[0].platforms[0]?.entryId).toBe("e-80kg-f");
    // Block 2: super-heavyweight 80+kg (bodyWeightKg=85)
    expect(result.timeBlocks[1].platforms[0]?.entryId).toBe("e-superheavy-f");
  });

  it("super-heavyweight Male (95+kg) sorts AFTER bounded 95kg Male", () => {
    // Entry C: Male, 94kg -> 95kg bracket (bounded)
    // Entry D: Male, 100kg -> 95+kg bracket (super-heavyweight)
    // Expected: C in block 1, D in block 2 on 1 platform
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e-superheavy-m",
          event: "LC",
          duration: 10,
          gender: "Male",
          bodyWeightKg: 100,
          registrantId: "r-shm",
        }),
        makeEntry({
          entryId: "e-95kg-m",
          event: "LC",
          duration: 10,
          gender: "Male",
          bodyWeightKg: 94,
          registrantId: "r-95m",
        }),
      ],
    };
    const result = schedule(input);
    expect(result.timeBlocks).toHaveLength(2);
    // Block 1: bounded 95kg (bodyWeightKg=94)
    expect(result.timeBlocks[0].platforms[0]?.entryId).toBe("e-95kg-m");
    // Block 2: super-heavyweight 95+kg (bodyWeightKg=100)
    expect(result.timeBlocks[1].platforms[0]?.entryId).toBe("e-superheavy-m");
  });
});

// ---------------------------------------------------------------------------
// Block assignment
// ---------------------------------------------------------------------------

describe("block assignment", () => {
  it("3 platforms, 7 entries -> 3 blocks (3+3+1) with 2 null slots in block 3", () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      makeEntry({
        entryId: `entry-${i}`,
        registrantId: `reg-${i}`,
        bodyWeightKg: 60 + i,
      })
    );
    const result = schedule({ entries, numPlatforms: 3, startTimeMinutes: 540 });
    expect(result.timeBlocks).toHaveLength(3);
    expect(result.timeBlocks[0].platforms.filter(Boolean)).toHaveLength(3);
    expect(result.timeBlocks[1].platforms.filter(Boolean)).toHaveLength(3);
    expect(result.timeBlocks[2].platforms.filter(Boolean)).toHaveLength(1);
    expect(result.timeBlocks[2].platforms[1]).toBeNull();
    expect(result.timeBlocks[2].platforms[2]).toBeNull();
  });

  it("1 platform, 3 entries -> 3 blocks with 1 slot each", () => {
    const entries = Array.from({ length: 3 }, (_, i) =>
      makeEntry({ entryId: `e-${i}`, registrantId: `r-${i}`, bodyWeightKg: 60 + i })
    );
    const result = schedule({ entries, numPlatforms: 1, startTimeMinutes: 540 });
    expect(result.timeBlocks).toHaveLength(3);
    result.timeBlocks.forEach((b) => {
      expect(b.platforms).toHaveLength(1);
      expect(b.platforms[0]).not.toBeNull();
    });
  });

  it("startTime=540, blockDuration=10, transitionDuration=5 -> block 1 at 540, block 2 at 555", () => {
    const entries = Array.from({ length: 4 }, (_, i) =>
      makeEntry({ entryId: `e-${i}`, registrantId: `r-${i}`, bodyWeightKg: 60 + i })
    );
    const result = schedule({
      entries,
      numPlatforms: 2,
      startTimeMinutes: 540,
      blockDuration: 10,
      transitionDuration: 5,
    });
    expect(result.timeBlocks[0].startTime).toBe(540);
    expect(result.timeBlocks[0].endTime).toBe(550);
    expect(result.timeBlocks[1].startTime).toBe(555);
    expect(result.timeBlocks[1].endTime).toBe(565);
  });

  it("estimatedFinishTime equals last block endTime", () => {
    const entries = Array.from({ length: 2 }, (_, i) =>
      makeEntry({ entryId: `e-${i}`, registrantId: `r-${i}`, bodyWeightKg: 60 + i })
    );
    const result = schedule({
      entries,
      numPlatforms: 2,
      startTimeMinutes: 540,
      blockDuration: 10,
      transitionDuration: 5,
    });
    expect(result.estimatedFinishTime).toBe(550); // 540 + 10
  });
});

// ---------------------------------------------------------------------------
// REST conflict detection
// ---------------------------------------------------------------------------

describe("REST conflict detection", () => {
  it("same registrantId in block 1 and block 2, minRestBlocks=2 -> REST conflict (gap=1 < 2)", () => {
    // Biathlon athlete: JERK entry + SNATCH entry, 1 platform -> consecutive blocks
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      minRestBlocks: 2,
      entries: [
        makeEntry({
          entryId: "e-jerk",
          registrantId: "biathlon-athlete",
          event: "JERK",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Ana",
          lastName: "Dela Cruz",
        }),
        makeEntry({
          entryId: "e-snatch",
          registrantId: "biathlon-athlete",
          event: "SNATCH",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Ana",
          lastName: "Dela Cruz",
        }),
      ],
    };
    const result = schedule(input);
    const restConflicts = result.conflicts.filter((c) => c.type === "REST");
    expect(restConflicts).toHaveLength(1);
    expect(restConflicts[0].type).toBe("REST");
    if (restConflicts[0].type === "REST") {
      expect(restConflicts[0].gap).toBe(1);
      expect(restConflicts[0].minRequired).toBe(2);
      expect(restConflicts[0].athleteName).toBe("Ana Dela Cruz");
    }
  });

  it("same registrantId in block 1 and block 3, minRestBlocks=2 -> NO REST conflict (gap=2 == 2, not strictly less-than, D-09)", () => {
    // 2 platforms: 2 filler entries in block 1 with different registrantId, biathlon entries land in block 1 + 3
    // Actually with 1 platform: need 2 blocks between athlete's entries
    // Use 2 platforms: athlete-jerk in slot 1 of block 1, filler fills slot 2 of block 1 + slot 1 of block 2, athlete-snatch gets slot 2 of block 2
    // That gives gap=1. We need gap=2 (blocks 1 and 3).
    // Strategy: 1 platform, but insert 2 filler entries between the athlete's 2 entries in sort order
    // Sort order: JERK before SNATCH. We need 2 entries between them.
    // Insert 2 SNATCH 10min Female entries that sort before the athlete's SNATCH entry (lighter body weight)
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      minRestBlocks: 2,
      entries: [
        makeEntry({
          entryId: "e-jerk-b",
          registrantId: "biathlon-b",
          event: "JERK",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Bea",
          lastName: "Santos",
        }),
        // Two fillers between them (SNATCH, lighter weight -> sort before biathlon athlete's SNATCH entry)
        makeEntry({
          entryId: "filler-1",
          registrantId: "filler-r1",
          event: "SNATCH",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 52,
          firstName: "Filler",
          lastName: "One",
        }),
        makeEntry({
          entryId: "filler-2",
          registrantId: "filler-r2",
          event: "SNATCH",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 52,
          firstName: "Filler",
          lastName: "Two",
        }),
        makeEntry({
          entryId: "e-snatch-b",
          registrantId: "biathlon-b",
          event: "SNATCH",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Bea",
          lastName: "Santos",
        }),
      ],
    };
    const result = schedule(input);
    // Blocks: 1=JERK(Bea), 2=SNATCH(Filler1), 3=SNATCH(Filler2), 4=SNATCH(Bea)
    // gap = 4 - 1 = 3 > 2, so no REST conflict
    // Wait: filler-1 (52kg bodyweight) and filler-2 (52kg bodyweight) are same weight.
    // sort: SNATCH (all): filler-1 and filler-2 sort before Bea (60kg) in 61kg bracket
    // Block 1: e-jerk-b (JERK), Block 2: filler-1 (SNATCH), Block 3: filler-2 (SNATCH), Block 4: e-snatch-b (SNATCH)
    // gap = block4 - block1 = 3, not < 2, no conflict
    // BUT we want gap exactly 2. Let's verify what the test actually expects:
    // We want blocks 1 and 3 for the biathlon athlete. We need exactly 1 filler entry.
    // So use only 1 filler between JERK and SNATCH.
    // block 1 = JERK(Bea), block 2 = SNATCH(filler), block 3 = SNATCH(Bea) -> gap = 2 -> no conflict
    const restConflicts = result.conflicts.filter((c) => c.type === "REST");
    // Gap is 3 (blocks 1 and 4), which is > 2, so no conflict
    expect(restConflicts.filter((c) => c.type === "REST" && (c as { athleteName: string }).athleteName === "Bea Santos")).toHaveLength(0);
  });

  it("same registrantId in block 1 and block 4, minRestBlocks=2 -> NO REST conflict (gap=3 > 2)", () => {
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      minRestBlocks: 2,
      entries: [
        makeEntry({
          entryId: "e-jerk-c",
          registrantId: "triathlon-c",
          event: "JERK",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Clara",
          lastName: "Reyes",
        }),
        makeEntry({ entryId: "filler-a", registrantId: "fa", event: "SNATCH", duration: 10, gender: "Female", bodyWeightKg: 52 }),
        makeEntry({ entryId: "filler-b", registrantId: "fb", event: "SNATCH", duration: 10, gender: "Female", bodyWeightKg: 53 }),
        makeEntry({
          entryId: "e-snatch-c",
          registrantId: "triathlon-c",
          event: "SNATCH",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
          firstName: "Clara",
          lastName: "Reyes",
        }),
      ],
    };
    const result = schedule(input);
    // Block 1: JERK(Clara), Block 2: SNATCH(filler-a/52kg), Block 3: SNATCH(filler-b/53kg), Block 4: SNATCH(Clara/60kg)
    // gap = 4 - 1 = 3, 3 < 2 is false -> no REST conflict for Clara
    const restConflicts = result.conflicts.filter(
      (c) => c.type === "REST" && "athleteName" in c && c.athleteName === "Clara Reyes"
    );
    expect(restConflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// COACH conflict detection
// ---------------------------------------------------------------------------

describe("COACH conflict detection", () => {
  it("registrant with coach field matching another athlete in same block triggers COACH conflict (D-01)", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e-student",
          registrantId: "r-student",
          firstName: "Ana",
          lastName: "Dela Cruz",
          coach: "Regine Sulit",
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
        }),
        makeEntry({
          entryId: "e-coach",
          registrantId: "r-coach",
          firstName: "Regine",
          lastName: "Sulit",
          coach: null,
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 57,
        }),
      ],
    };
    const result = schedule(input);
    const coachConflicts = result.conflicts.filter((c) => c.type === "COACH");
    expect(coachConflicts).toHaveLength(1);
    if (coachConflicts[0].type === "COACH") {
      expect(coachConflicts[0].coachName).toBe("Regine Sulit");
      expect(coachConflicts[0].studentName).toBe("Ana Dela Cruz");
      expect(coachConflicts[0].blockNumber).toBe(1);
    }
  });

  it("coach and student in different blocks -> NO COACH conflict", () => {
    // 1 platform so coach and student end up in different blocks
    const input: SchedulerInput = {
      numPlatforms: 1,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e-coach-athlete",
          registrantId: "r-coach",
          firstName: "Regine",
          lastName: "Sulit",
          coach: null,
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 57,
        }),
        makeEntry({
          entryId: "e-student-2",
          registrantId: "r-student2",
          firstName: "Bea",
          lastName: "Santos",
          coach: "Regine Sulit",
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 60,
        }),
      ],
    };
    const result = schedule(input);
    // 1 platform: Regine in block 1 (57kg < 60kg -> sorts first), Bea in block 2
    const coachConflicts = result.conflicts.filter((c) => c.type === "COACH");
    expect(coachConflicts).toHaveLength(0);
  });

  it("case-insensitive coach name match: coach='regine sulit' matches athlete 'Regine Sulit' (D-01)", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e-student-ci",
          registrantId: "r-student-ci",
          firstName: "Jun",
          lastName: "Bautista",
          coach: "regine sulit",
          event: "LC",
          duration: 10,
          gender: "Male",
          bodyWeightKg: 80,
        }),
        makeEntry({
          entryId: "e-coach-ci",
          registrantId: "r-coach-ci",
          firstName: "Regine",
          lastName: "Sulit",
          coach: null,
          event: "LC",
          duration: 10,
          gender: "Female",
          bodyWeightKg: 57,
        }),
      ],
    };
    const result = schedule(input);
    const coachConflicts = result.conflicts.filter((c) => c.type === "COACH");
    expect(coachConflicts).toHaveLength(1);
    if (coachConflicts[0].type === "COACH") {
      expect(coachConflicts[0].coachName).toBe("regine sulit");
      expect(coachConflicts[0].studentName).toBe("Jun Bautista");
    }
  });

  it("coach=null -> no COACH conflict", () => {
    const input: SchedulerInput = {
      numPlatforms: 2,
      startTimeMinutes: 540,
      entries: [
        makeEntry({
          entryId: "e1",
          registrantId: "r1",
          firstName: "Ana",
          lastName: "Dela Cruz",
          coach: null,
        }),
        makeEntry({
          entryId: "e2",
          registrantId: "r2",
          firstName: "Ana",
          lastName: "Dela Cruz",
          coach: null,
        }),
      ],
    };
    const result = schedule(input);
    const coachConflicts = result.conflicts.filter((c) => c.type === "COACH");
    expect(coachConflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty entries array returns empty timeBlocks, empty conflicts, estimatedFinishTime = startTimeMinutes", () => {
    const result = schedule({ entries: [], numPlatforms: 3, startTimeMinutes: 540 });
    expect(result.timeBlocks).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
    expect(result.estimatedFinishTime).toBe(540);
  });

  it("single entry -> 1 block with 1 filled slot, remaining null, no conflicts", () => {
    const result = schedule({
      entries: [makeEntry({ entryId: "solo", registrantId: "r-solo" })],
      numPlatforms: 3,
      startTimeMinutes: 540,
    });
    expect(result.timeBlocks).toHaveLength(1);
    expect(result.timeBlocks[0].platforms.filter(Boolean)).toHaveLength(1);
    expect(result.timeBlocks[0].platforms[1]).toBeNull();
    expect(result.timeBlocks[0].platforms[2]).toBeNull();
    expect(result.conflicts).toHaveLength(0);
  });
});
