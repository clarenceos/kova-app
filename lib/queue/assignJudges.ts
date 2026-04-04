import type { TimeBlock, JudgeConflict, JudgeCandidate } from './types';

/**
 * Pure function — no DB imports. Assigns judges to platform slots using a
 * penalty-scored greedy algorithm.
 *
 * Penalties (lower score = more preferred):
 *   +2  same club as athlete (SAME_CLUB soft conflict)
 *   +5  judge name matches athlete's coach field (OWN_STUDENT soft conflict)
 *
 * Constraints (hard — candidate is ineligible):
 *   - isJudging must be 1 or 2 (available to judge)
 *   - must not be competing in this block
 *   - must not already be assigned to another platform in this block
 *
 * Clones timeBlocks internally — caller receives a new array.
 */
export function assignJudges(
  timeBlocks: TimeBlock[],
  candidates: JudgeCandidate[]
): { timeBlocks: TimeBlock[]; judgeConflicts: JudgeConflict[] } {
  const blocks = structuredClone(timeBlocks);
  const judgeConflicts: JudgeConflict[] = [];

  // Build competingBlocks map: registrantId -> Set<blockNumber>
  // Tracks which blocks each registrant is competing in.
  const competingBlocks = new Map<string, Set<number>>();
  for (const block of blocks) {
    for (const slot of block.platforms) {
      if (slot == null) continue;
      const existing = competingBlocks.get(slot.registrantId) ?? new Set<number>();
      existing.add(block.blockNumber);
      competingBlocks.set(slot.registrantId, existing);
    }
  }

  // Process each block
  for (const block of blocks) {
    // judgingAssignments: Set of registrantIds already assigned to judge in this block
    const judgingAssignments = new Set<string>();

    for (const slot of block.platforms) {
      if (slot == null) continue;

      // Build eligible candidate list
      const eligible = candidates.filter(c => {
        // Must be available to judge
        if (c.isJudging !== 1 && c.isJudging !== 2) return false;
        // Must not be competing in this block
        if (competingBlocks.get(c.registrantId)?.has(block.blockNumber)) return false;
        // Must not already be judging another platform in this block
        if (judgingAssignments.has(c.registrantId)) return false;
        return true;
      });

      if (eligible.length === 0) {
        judgeConflicts.push({
          type: 'JUDGE',
          judgeName: '',
          athleteName: `${slot.firstName} ${slot.lastName}`,
          blockNumber: block.blockNumber,
          reason: 'NO_JUDGE_AVAILABLE',
        });
        slot.judge = null;
        continue;
      }

      // Score each eligible candidate
      const scored = eligible.map(c => {
        let score = 0;
        let reason: 'OWN_STUDENT' | 'SAME_CLUB' | null = null;

        // +5 OWN_STUDENT: judge's full name matches athlete's coach field
        if (slot.coach != null) {
          const judgeName = `${c.firstName} ${c.lastName}`.toLowerCase().trim();
          const coachField = slot.coach.toLowerCase().trim();
          if (judgeName === coachField) {
            score += 5;
            reason = 'OWN_STUDENT';
          }
        }

        // +2 SAME_CLUB: same club as athlete (only if not already flagged as OWN_STUDENT)
        if (reason === null && c.club != null && c.club === slot.club) {
          score += 2;
          reason = 'SAME_CLUB';
        }

        return { candidate: c, score, reason };
      });

      // Sort by score ascending (lowest penalty first)
      scored.sort((a, b) => a.score - b.score);

      const best = scored[0];
      const { candidate, reason } = best;

      // Assign judge to slot
      slot.judge = {
        registrantId: candidate.registrantId,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
      };
      judgingAssignments.add(candidate.registrantId);

      // Emit conflict if soft penalty applied
      if (reason === 'OWN_STUDENT') {
        judgeConflicts.push({
          type: 'JUDGE',
          judgeName: `${candidate.firstName} ${candidate.lastName}`,
          athleteName: `${slot.firstName} ${slot.lastName}`,
          blockNumber: block.blockNumber,
          reason: 'OWN_STUDENT',
        });
      } else if (reason === 'SAME_CLUB') {
        judgeConflicts.push({
          type: 'JUDGE',
          judgeName: `${candidate.firstName} ${candidate.lastName}`,
          athleteName: `${slot.firstName} ${slot.lastName}`,
          blockNumber: block.blockNumber,
          reason: 'SAME_CLUB',
        });
      }
    }
  }

  return { timeBlocks: blocks, judgeConflicts };
}
