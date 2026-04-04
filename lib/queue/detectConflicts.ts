import type { TimeBlock, PlatformSlot, Conflict, RestConflict, CoachConflict, JudgeConflict } from './types';

/**
 * Pure conflict detection function — no DB imports, safe to use from 'use client' components.
 *
 * Detects:
 * - REST conflicts: same registrantId appears in two blocks with gap < minRestBlocks
 * - COACH conflicts: a student (entry with coach field) and their coach (entry whose full name
 *   matches the coach field) appear in the same block
 *
 * This is extracted from scheduler.ts Phase C so the same logic can be run after
 * manual drag-and-drop swaps in the UI without re-running the full schedule().
 */
export function detectConflicts(
  timeBlocks: TimeBlock[],
  minRestBlocks: number = 2,
  judgeConflicts: JudgeConflict[] = []
): Conflict[] {
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
            type: 'REST',
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
            type: 'COACH',
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

  // Merge judge conflicts from assignJudges (if provided)
  conflicts.push(...judgeConflicts);

  return conflicts;
}
