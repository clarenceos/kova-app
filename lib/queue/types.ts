// SchedulerEntry — the flattened join of registrant + registration_entry fields
// the scheduler needs. Caller constructs this from a DB query join.
export interface SchedulerEntry {
  // From registrant
  registrantId: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  bodyWeightKg: number;
  country: string;
  club: string | null;
  coach: string | null;

  // From registration_entry
  entryId: string;
  event: 'LC' | 'JERK' | 'SNATCH';
  bellWeight: string;  // e.g. '2x16' or '1x16'
  duration: number;    // 10 or 5
  serial: string;
}

export interface SchedulerInput {
  entries: SchedulerEntry[];
  numPlatforms: number;
  startTimeMinutes: number; // minutes since midnight (9am = 540)
  blockDuration?: number;   // default 10
  transitionDuration?: number; // default 5
  minRestBlocks?: number;   // default 2
}

export interface PlatformSlot {
  entryId: string;
  registrantId: string;
  firstName: string;
  lastName: string;
  event: 'LC' | 'JERK' | 'SNATCH';
  bellWeight: string;
  duration: number;
  gender: 'Male' | 'Female';
  bodyWeightKg: number;
  weightClass: string; // derived, e.g. '80kg' or '95+kg'
  club: string | null;
  coach: string | null;
  country: string;
  serial: string;
  judge: { registrantId: string; firstName: string; lastName: string } | null;
}

export interface TimeBlock {
  blockNumber: number;   // 1-indexed
  startTime: number;     // minutes since midnight
  endTime: number;       // minutes since midnight
  platforms: (PlatformSlot | null)[]; // null = empty slot
}

// Per D-05: rich conflict objects
export interface RestConflict {
  type: 'REST';
  athleteName: string;
  blockNumbers: [number, number];
  gap: number;
  minRequired: number;
  event: string;
  bellWeight: string;
}

export interface CoachConflict {
  type: 'COACH';
  coachName: string;
  studentName: string;
  blockNumber: number;
  event: string;
  bellWeight: string;
}

export interface JudgeConflict {
  type: 'JUDGE';
  judgeName: string;
  athleteName: string;
  blockNumber: number;
  reason: 'OWN_STUDENT' | 'SAME_CLUB' | 'NO_JUDGE_AVAILABLE';
}

export interface JudgeCandidate {
  registrantId: string;
  firstName: string;
  lastName: string;
  club: string | null;
  coach: string | null;
  isJudging: number; // 0=no, 1=judge-only, 2=competing+judging
}

export type Conflict = RestConflict | CoachConflict | JudgeConflict;

export interface ScheduleResult {
  timeBlocks: TimeBlock[];
  conflicts: Conflict[];
  estimatedFinishTime: number; // minutes since midnight
}
