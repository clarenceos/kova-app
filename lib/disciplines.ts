import type { Discipline } from '@/lib/record-context'

/** Duration in seconds for each discipline. */
export const DISCIPLINE_DURATION_SECONDS: Record<Discipline, number> = {
  'long-cycle': 600,
  'jerk': 600,
  'snatch': 600,
}
