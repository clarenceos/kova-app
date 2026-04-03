import type {
  SchedulerInput,
  ScheduleResult,
  SchedulerEntry,
  TimeBlock,
  PlatformSlot,
  Conflict,
  RestConflict,
  CoachConflict,
} from "./types";
import { getWeightClass } from "./weightClass";

// ---------------------------------------------------------------------------
// Internal helper: numeric sort key for weight class labels
// '52kg' -> 52, '80kg' -> 80, '80+kg' -> 80.5, '95+kg' -> 95.5
// The +0.5 ensures super-heavyweight sorts after its bounded counterpart.
// Plain string comparison is BROKEN: '80+kg'.localeCompare('80kg') returns -1,
// meaning 80+kg would incorrectly sort before 80kg.
// ---------------------------------------------------------------------------
function weightClassSortKey(wc: string): number {
  const num = parseFloat(wc); // parseFloat('80+kg') -> 80, parseFloat('80kg') -> 80
  return wc.includes("+") ? num + 0.5 : num;
}

// ---------------------------------------------------------------------------
// Event priority map: LC first, then Jerk, then Snatch
// ---------------------------------------------------------------------------
const EVENT_PRIORITY: Record<string, number> = {
  LC: 0,
  JERK: 1,
  SNATCH: 2,
};

// ---------------------------------------------------------------------------
// Sort comparator: KB sport protocol ordering
// 1. Event priority (LC < JERK < SNATCH)
// 2. Duration (10 before 5 — descending)
// 3. Gender (Female before Male — 'Female' < 'Male' alphabetically)
// 4. Weight class (numeric-aware bracket order, super-heavyweight last)
// 5. Body weight tiebreaker (lighter first — D-08)
// ---------------------------------------------------------------------------
function compareEntries(a: SchedulerEntry, b: SchedulerEntry): number {
  // 1. Event priority
  const eventDiff = (EVENT_PRIORITY[a.event] ?? 99) - (EVENT_PRIORITY[b.event] ?? 99);
  if (eventDiff !== 0) return eventDiff;

  // 2. Duration (descending: 10 before 5)
  const durationDiff = b.duration - a.duration;
  if (durationDiff !== 0) return durationDiff;

  // 3. Gender (Female < Male alphabetically)
  const genderDiff = a.gender.localeCompare(b.gender);
  if (genderDiff !== 0) return genderDiff;

  // 4. Weight class (numeric-aware — not plain alphabetical)
  const wcA = getWeightClass(a.gender, a.bodyWeightKg);
  const wcB = getWeightClass(b.gender, b.bodyWeightKg);
  const wcDiff = weightClassSortKey(wcA) - weightClassSortKey(wcB);
  if (wcDiff !== 0) return wcDiff;

  // 5. Body weight tiebreaker: lighter first (D-08)
  return a.bodyWeightKg - b.bodyWeightKg;
}

// ---------------------------------------------------------------------------
// Build a PlatformSlot from a SchedulerEntry
// ---------------------------------------------------------------------------
function buildPlatformSlot(entry: SchedulerEntry): PlatformSlot {
  return {
    entryId: entry.entryId,
    registrantId: entry.registrantId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    event: entry.event,
    bellWeight: entry.bellWeight,
    duration: entry.duration,
    gender: entry.gender,
    bodyWeightKg: entry.bodyWeightKg,
    weightClass: getWeightClass(entry.gender, entry.bodyWeightKg),
    club: entry.club,
    coach: entry.coach,
    country: entry.country,
    serial: entry.serial,
  };
}

// ---------------------------------------------------------------------------
// Main schedule function
// ---------------------------------------------------------------------------
export function schedule(input: SchedulerInput): ScheduleResult {
  const {
    entries,
    numPlatforms,
    startTimeMinutes,
    blockDuration = 10,
    transitionDuration = 5,
    minRestBlocks = 2,
  } = input;

  // Edge case: nothing to schedule
  if (entries.length === 0) {
    return {
      timeBlocks: [],
      conflicts: [],
      estimatedFinishTime: startTimeMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Phase A: Sort entries (do NOT mutate input array)
  // ---------------------------------------------------------------------------
  const sorted = [...entries].sort(compareEntries);

  // ---------------------------------------------------------------------------
  // Phase B: Assign to time blocks (greedy, fill numPlatforms slots per block)
  // ---------------------------------------------------------------------------
  const timeBlocks: TimeBlock[] = [];

  for (let i = 0; i < sorted.length; i += numPlatforms) {
    const blockIndex = timeBlocks.length;
    const startTime = startTimeMinutes + blockIndex * (blockDuration + transitionDuration);
    const endTime = startTime + blockDuration;

    // Fill platforms array, padding with null for empty slots
    const platforms: (PlatformSlot | null)[] = [];
    for (let p = 0; p < numPlatforms; p++) {
      const entry = sorted[i + p];
      platforms.push(entry != null ? buildPlatformSlot(entry) : null);
    }

    timeBlocks.push({
      blockNumber: blockIndex + 1, // 1-indexed
      startTime,
      endTime,
      platforms,
    });
  }

  const estimatedFinishTime =
    timeBlocks.length > 0
      ? timeBlocks[timeBlocks.length - 1].endTime
      : startTimeMinutes;

  // ---------------------------------------------------------------------------
  // Phase C: Detect conflicts
  // ---------------------------------------------------------------------------
  const conflicts: Conflict[] = [];

  // --- REST conflict detection (SCHED-04, D-09) ---
  // Build map: registrantId -> list of {blockNumber, entry} where the registrant appears
  const registrantBlocks = new Map<
    string,
    Array<{ blockNumber: number; entry: PlatformSlot }>
  >();

  for (const block of timeBlocks) {
    for (const slot of block.platforms) {
      if (slot == null) continue;
      const existing = registrantBlocks.get(slot.registrantId) ?? [];
      existing.push({ blockNumber: block.blockNumber, entry: slot });
      registrantBlocks.set(slot.registrantId, existing);
    }
  }

  for (const appearances of registrantBlocks.values()) {
    if (appearances.length < 2) continue;
    // Check all pairs
    for (let i = 0; i < appearances.length - 1; i++) {
      for (let j = i + 1; j < appearances.length; j++) {
        const blockI = appearances[i].blockNumber;
        const blockJ = appearances[j].blockNumber;
        const gap = blockJ - blockI; // always positive since blocks are 1-indexed ascending
        if (gap < minRestBlocks) {
          const laterEntry = appearances[j].entry;
          const restConflict: RestConflict = {
            type: "REST",
            athleteName: `${laterEntry.firstName} ${laterEntry.lastName}`,
            blockNumbers: [blockI, blockJ],
            gap,
            minRequired: minRestBlocks,
            event: laterEntry.event,
            bellWeight: laterEntry.bellWeight,
          };
          conflicts.push(restConflict);
        }
      }
    }
  }

  // --- COACH conflict detection (SCHED-05, D-01, D-02, D-03) ---
  // For each block, check if any entry's coach field matches another entry's full name.
  // Normalize both sides with toLowerCase().trim() (D-01).
  // The entry with the coach field = the student.
  // The entry whose full name matches = the coach (as an athlete).
  for (const block of timeBlocks) {
    const slots = block.platforms.filter((s): s is PlatformSlot => s != null);

    for (let i = 0; i < slots.length; i++) {
      const student = slots[i];
      if (student.coach == null) continue;

      const normalizedCoach = student.coach.toLowerCase().trim();

      for (let j = 0; j < slots.length; j++) {
        if (i === j) continue;
        const athlete = slots[j];
        const athleteFullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase().trim();
        if (normalizedCoach === athleteFullName) {
          const coachConflict: CoachConflict = {
            type: "COACH",
            coachName: student.coach, // original case from student entry
            studentName: `${student.firstName} ${student.lastName}`,
            blockNumber: block.blockNumber,
            event: student.event,
            bellWeight: student.bellWeight,
          };
          conflicts.push(coachConflict);
          break; // found the coach match, no need to check further for this student
        }
      }
    }
  }

  return {
    timeBlocks,
    conflicts,
    estimatedFinishTime,
  };
}
