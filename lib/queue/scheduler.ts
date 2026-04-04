import type {
  SchedulerInput,
  ScheduleResult,
  SchedulerEntry,
  TimeBlock,
  PlatformSlot,
} from "./types";
import { getWeightClass } from "./weightClass";
import { detectConflicts } from "./detectConflicts";

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
    judge: null,
  };
}

// ---------------------------------------------------------------------------
// Helper: check if placing a new entry into a partially-filled platform list
// would create a COACH conflict with any already-placed slot.
// Returns true if placing entry would cause a COACH conflict.
// ---------------------------------------------------------------------------
function wouldCreateCoachConflict(
  candidate: SchedulerEntry,
  placedSlots: (PlatformSlot | null)[]
): boolean {
  if (candidate.coach == null) {
    // candidate is not a student — check if candidate IS a coach for any placed slot
    const candidateFullName = `${candidate.firstName} ${candidate.lastName}`.toLowerCase().trim();
    for (const slot of placedSlots) {
      if (slot == null) continue;
      if (slot.coach != null && slot.coach.toLowerCase().trim() === candidateFullName) {
        return true; // candidate is the coach of an already-placed student
      }
    }
    return false;
  }

  // candidate is a student — check if their coach is already placed
  const candidateCoach = candidate.coach.toLowerCase().trim();
  for (const slot of placedSlots) {
    if (slot == null) continue;
    const slotFullName = `${slot.firstName} ${slot.lastName}`.toLowerCase().trim();
    if (candidateCoach === slotFullName) {
      return true; // coach already in this block
    }
  }
  return false;
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
  // Phase B: Conflict-aware block assignment (1-lookahead swap to avoid COACH conflicts)
  //
  // Algorithm:
  // 1. Convert sorted array into a mutable queue.
  // 2. Walk through the queue front-to-back, filling numPlatforms slots per block.
  // 3. For each slot in a block, before placing the next queue entry, check if it creates
  //    a COACH conflict with entries already placed in THIS block.
  // 4. If conflict detected AND the next queue entry (cursor+1) would NOT conflict:
  //    swap queue[cursor] and queue[cursor+1], then place the (now front) entry.
  // 5. If no valid swap (end of queue, or next entry also conflicts): force-place anyway.
  //
  // This is a 1-lookahead swap only — does not do deep search. Preserves sort order
  // as much as possible (only adjacent swaps). Best-effort, not guaranteed zero conflicts.
  // ---------------------------------------------------------------------------
  const queue = [...sorted];
  const timeBlocks: TimeBlock[] = [];
  let cursor = 0;

  while (cursor < queue.length) {
    const blockIndex = timeBlocks.length;
    const startTime = startTimeMinutes + blockIndex * (blockDuration + transitionDuration);
    const endTime = startTime + blockDuration;

    const platforms: (PlatformSlot | null)[] = [];

    for (let p = 0; p < numPlatforms; p++) {
      if (cursor >= queue.length) {
        // Pad remaining slots with null
        platforms.push(null);
        continue;
      }

      const candidate = queue[cursor];

      // Check if placing candidate creates a COACH conflict with already-placed slots in this block
      const hasConflict = wouldCreateCoachConflict(candidate, platforms);

      if (hasConflict && cursor + 1 < queue.length) {
        // Try swapping with the next entry in queue
        const next = queue[cursor + 1];
        const nextHasConflict = wouldCreateCoachConflict(next, platforms);
        if (!nextHasConflict) {
          // Swap: place next now, candidate moves to cursor+1 position
          queue[cursor + 1] = candidate;
          queue[cursor] = next;
        }
        // If next also conflicts: fall through, force-place original candidate
      }

      platforms.push(buildPlatformSlot(queue[cursor]));
      cursor++;
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
  // Phase C: Detect conflicts (delegated to standalone pure function)
  // ---------------------------------------------------------------------------
  const conflicts = detectConflicts(timeBlocks, minRestBlocks);

  return {
    timeBlocks,
    conflicts,
    estimatedFinishTime,
  };
}
