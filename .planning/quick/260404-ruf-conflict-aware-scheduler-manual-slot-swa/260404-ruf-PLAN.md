---
phase: quick
plan: 260404-ruf
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/queue/scheduler.ts
  - lib/queue/detectConflicts.ts
  - lib/queue/types.ts
  - lib/queue/scheduler.test.ts
  - app/organizerdb/queue/_components/TimetableGrid.tsx
  - app/organizerdb/queue/_components/TimetableCell.tsx
  - app/organizerdb/queue/_components/ConflictPanel.tsx
  - app/organizerdb/queue/page.tsx
autonomous: true
must_haves:
  truths:
    - "Scheduler proactively avoids coach-student same-block assignments during Phase B block-fill"
    - "When coach conflict is unavoidable (no valid swap candidate), entry is force-placed and conflict is flagged"
    - "Organizer can drag a cell and drop it onto another cell to swap two athletes between slots"
    - "After each manual swap, conflicts are recalculated and ConflictPanel updates live"
    - "Coach name is visible on each athlete card in the timetable grid"
    - "REST conflicts for biathlon/triathlon athletes are flagged but not prevented"
    - "All existing scheduler tests still pass"
  artifacts:
    - path: "lib/queue/detectConflicts.ts"
      provides: "Standalone conflict detection function usable from both scheduler.ts and TimetableGrid.tsx"
      exports: ["detectConflicts"]
    - path: "lib/queue/scheduler.ts"
      provides: "Conflict-aware Phase B block assignment with 1-lookahead swap"
    - path: "app/organizerdb/queue/_components/TimetableGrid.tsx"
      provides: "Drag-and-drop slot swapping with live conflict recalculation"
  key_links:
    - from: "lib/queue/scheduler.ts"
      to: "lib/queue/detectConflicts.ts"
      via: "import { detectConflicts }"
      pattern: "detectConflicts\\(timeBlocks"
    - from: "app/organizerdb/queue/_components/TimetableGrid.tsx"
      to: "lib/queue/detectConflicts.ts"
      via: "import { detectConflicts }"
      pattern: "detectConflicts\\(blocks"
    - from: "app/organizerdb/queue/page.tsx"
      to: "app/organizerdb/queue/_components/TimetableGrid.tsx"
      via: "initialTimeBlocks + initialConflicts props"
      pattern: "initialTimeBlocks.*initialConflicts"
---

<objective>
Add conflict-aware scheduling (proactive COACH avoidance during block assignment), manual drag-and-drop slot swapping for edge cases, and coach name display on athlete cells.

Purpose: Organizer gets a smarter auto-scheduler that minimizes coach conflicts out of the box, with a manual swap escape hatch for the remaining edge cases, and better visual information to spot conflicts.

Output: Modified scheduler with 1-lookahead conflict avoidance, extracted detectConflicts utility, interactive TimetableGrid with DnD swap, updated TimetableCell with coach name.
</objective>

<execution_context>
@/Users/clarence/kova-app/.claude/get-shit-done/workflows/execute-plan.md
@/Users/clarence/kova-app/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@QUEUE_SPEC.md
@lib/queue/scheduler.ts
@lib/queue/types.ts
@lib/queue/scheduler.test.ts
@app/organizerdb/queue/page.tsx
@app/organizerdb/queue/_components/TimetableGrid.tsx
@app/organizerdb/queue/_components/TimetableCell.tsx
@app/organizerdb/queue/_components/ConflictPanel.tsx
@.planning/phases/07-scheduling-pure-logic/07-CONTEXT.md

<interfaces>
<!-- Key types the executor needs -->

From lib/queue/types.ts:
```typescript
export interface TimeBlock {
  blockNumber: number;
  startTime: number;
  endTime: number;
  platforms: (PlatformSlot | null)[];
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
  weightClass: string;
  club: string | null;
  coach: string | null;
  country: string;
  serial: string;
}

export type Conflict = RestConflict | CoachConflict;
```

From lib/queue/scheduler.ts (Phase B — current greedy fill, lines 117-137):
```typescript
// Phase B: Assign to time blocks (greedy, fill numPlatforms slots per block)
const timeBlocks: TimeBlock[] = [];
for (let i = 0; i < sorted.length; i += numPlatforms) {
  const blockIndex = timeBlocks.length;
  const startTime = startTimeMinutes + blockIndex * (blockDuration + transitionDuration);
  const endTime = startTime + blockDuration;
  const platforms: (PlatformSlot | null)[] = [];
  for (let p = 0; p < numPlatforms; p++) {
    const entry = sorted[i + p];
    platforms.push(entry != null ? buildPlatformSlot(entry) : null);
  }
  timeBlocks.push({ blockNumber: blockIndex + 1, startTime, endTime, platforms });
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract detectConflicts and add conflict-aware block assignment</name>
  <files>lib/queue/detectConflicts.ts, lib/queue/scheduler.ts, lib/queue/scheduler.test.ts</files>
  <behavior>
    - Test: coach+student in same event/duration/gender group with 2 platforms -> conflict-aware scheduler separates them into different blocks (0 COACH conflicts)
    - Test: coach+student forced into same block when no valid swap exists (only 1 platform or all candidates conflict) -> COACH conflict is flagged (fallback works)
    - Test: 1-lookahead only swaps with the NEXT entry in sorted order, does not do deep search (keeps sort order disruption minimal)
    - Test: REST conflicts for biathlon athletes are still flagged (not prevented) — existing REST tests pass unchanged
    - Test: detectConflicts(timeBlocks, minRestBlocks) returns same conflicts as schedule() for identical block layout
    - All existing tests in scheduler.test.ts pass without modification
  </behavior>
  <action>
    **Step 1: Create lib/queue/detectConflicts.ts**

    Extract Phase C (conflict detection, lines 147-228) from scheduler.ts into a standalone pure function:

    ```typescript
    import type { TimeBlock, PlatformSlot, Conflict, RestConflict, CoachConflict } from './types';

    export function detectConflicts(timeBlocks: TimeBlock[], minRestBlocks: number = 2): Conflict[] {
      // REST conflict detection — identical logic from scheduler.ts Phase C lines 150-188
      // COACH conflict detection — identical logic from scheduler.ts Phase C lines 193-220
      // Return combined conflicts array
    }
    ```

    This function is pure (no DB imports, no server-only code). Safe to import from 'use client' components.

    **Step 2: Modify scheduler.ts Phase B — conflict-aware block fill**

    Replace the simple greedy loop (lines 117-137) with a conflict-aware version. The new algorithm:

    1. Keep the sorted array from Phase A unchanged.
    2. Track a `placed` boolean array (same length as `sorted`), all initially false.
    3. Walk through sorted entries. For each unplaced entry at index `i`:
       a. If it starts a new block (current block is full or first entry), create a new TimeBlock.
       b. Before placing entry `i` in the current block, check: does entry `i` have a `coach` field that matches (case-insensitive trimmed) the `firstName + " " + lastName` of any already-placed entry in THIS block? Or does any already-placed entry in this block have a `coach` field matching entry `i`'s full name?
       c. If YES (coach conflict detected) AND `i+1 < sorted.length` AND `sorted[i+1]` is not yet placed AND swapping `sorted[i+1]` into this slot would NOT create a coach conflict with the current block:
          - Place `sorted[i+1]` in this slot instead (mark `placed[i+1] = true`)
          - Push `sorted[i]` back by swapping indices: `sorted[i]` will be tried on the next iteration (do NOT mark `placed[i]`)
          - Decrement `i` by 1 (so the outer loop re-visits index `i` which now holds a different entry) — actually, easier approach: use a queue/index tracking rather than mutating `sorted`.
       d. If NO valid swap (either no next entry, or next entry also conflicts): force-place `sorted[i]` anyway (greedy fallback).

    SIMPLER implementation approach (recommended):
    - Convert sorted array into a mutable queue: `const queue = [...sorted]`
    - Process queue front-to-back. For each block of `numPlatforms` slots:
      - For each slot in the block, take the next entry from `queue[cursor]`
      - Check if it creates a coach conflict with entries already placed in THIS block
      - If conflict AND `cursor+1 < queue.length`: check `queue[cursor+1]`
        - If no conflict with swap candidate: swap `queue[cursor]` and `queue[cursor+1]`, then place `queue[cursor]` (the swapped-in entry)
        - If swap candidate also conflicts: force-place original `queue[cursor]`
      - Advance cursor

    This is a 1-lookahead swap. It preserves sort order as much as possible (only adjacent swaps). It does NOT guarantee zero coach conflicts — just best-effort avoidance.

    **Step 3: Replace Phase C with detectConflicts call**

    ```typescript
    import { detectConflicts } from './detectConflicts';
    // ... at end of schedule():
    const conflicts = detectConflicts(timeBlocks, minRestBlocks);
    return { timeBlocks, conflicts, estimatedFinishTime };
    ```

    **Step 4: Add new tests to scheduler.test.ts**

    Add a new `describe("conflict-aware scheduling")` block:

    1. Test: "scheduler separates coach and student into different blocks when possible"
       - 2 platforms, 3 entries: coach (Regine Sulit, Female 57kg LC 10min), student (Ana, Female 60kg LC 10min, coach="Regine Sulit"), filler (Jun, Male 80kg LC 10min)
       - Sort order puts females first: Regine (57kg) then Ana (60kg) then Jun (80kg)
       - Without conflict-awareness: block 1 = [Regine, Ana], block 2 = [Jun, null] -> COACH conflict
       - With conflict-awareness: when placing Ana in block 1 slot 2, detect coach conflict with Regine, lookahead to Jun, no conflict with Jun -> swap -> block 1 = [Regine, Jun], block 2 = [Ana, null] -> 0 COACH conflicts
       - Assert: 0 COACH conflicts. Regine and Ana are in different blocks.

    2. Test: "scheduler force-places when no valid swap candidate exists"
       - 1 platform, 2 entries: coach + student in same sort group, no other entries to swap with
       - Assert: COACH conflict IS flagged (can't avoid with only 1 platform)

    3. Test: "scheduler limits swap to 1-lookahead only"
       - 3 platforms, entries designed so that the immediate next entry also conflicts but entry+2 would not
       - Assert: the force-place happens (conflict flagged), not a deep search to entry+2

    Also add a test for detectConflicts standalone:
    4. Test: "detectConflicts returns same results as schedule() for identical layout"
       - Run schedule(), then call detectConflicts(result.timeBlocks) separately
       - Assert deep equality of conflicts arrays

    Keep all existing tests unchanged. The conflict-aware scheduling should not change sort order tests (sort order is Phase A, unchanged). Block assignment tests may see different slot arrangements in edge cases where coach conflicts exist — but the existing block assignment tests have no coach fields (all coach: null), so they are unaffected.
  </action>
  <verify>
    <automated>cd /Users/clarence/kova-app && npx vitest run lib/queue/scheduler.test.ts --reporter=verbose</automated>
  </verify>
  <done>
    - detectConflicts.ts exists as standalone pure function with no server imports
    - scheduler.ts Phase B does 1-lookahead swap to avoid COACH conflicts
    - scheduler.ts Phase C replaced with detectConflicts() call
    - All existing tests pass
    - New tests prove conflict-aware scheduling works: separates when possible, force-places when not
  </done>
</task>

<task type="auto">
  <name>Task 2: Drag-and-drop slot swap UI, coach name on cells, live conflict recalculation</name>
  <files>app/organizerdb/queue/page.tsx, app/organizerdb/queue/_components/TimetableGrid.tsx, app/organizerdb/queue/_components/TimetableCell.tsx, app/organizerdb/queue/_components/ConflictPanel.tsx</files>
  <action>
    **Step 1: Update TimetableCell — add coach name display**

    In TimetableCell.tsx, modify line 3 (the club line, lines 44-47) to show coach name alongside club:

    ```tsx
    {/* Line 3: Club and/or Coach (muted, conditional) */}
    {(slot.club || slot.coach) && (
      <p className="text-xs text-raw-steel/60">
        {[slot.club, slot.coach ? `(${slot.coach})` : null].filter(Boolean).join(' · ')}
      </p>
    )}
    ```

    Examples:
    - Club="Manila KB" coach="Regine Sulit" -> "Manila KB · (Regine Sulit)"
    - Club="Manila KB" coach=null -> "Manila KB"
    - Club=null coach="Regine Sulit" -> "(Regine Sulit)"
    - Club=null coach=null -> line not rendered

    **Step 2: Update page.tsx — pass initialTimeBlocks and initialConflicts**

    Change the TimetableGrid props from `timeBlocks` to `initialTimeBlocks` and from `conflicts` to `initialConflicts`. Also pass `minRestBlocks` (default 2) so the grid can re-run detectConflicts after swaps.

    ```tsx
    <TimetableGrid
      initialTimeBlocks={scheduleResult.timeBlocks}
      numPlatforms={competition.numPlatforms}
      initialConflicts={scheduleResult.conflicts}
      minRestBlocks={2}
    />
    ```

    Also update ConflictPanel usage: remove the direct `conflicts` prop from ConflictPanel in page.tsx. Instead, TimetableGrid will render ConflictPanel internally (or page.tsx will not render ConflictPanel at all — TimetableGrid manages it). Simpler approach: let TimetableGrid render ConflictPanel above the table, since TimetableGrid owns the mutable conflict state. Remove the `<ConflictPanel>` from page.tsx.

    **Step 3: Update TimetableGrid — stateful blocks + DnD swap + live conflicts**

    Rewrite TimetableGrid.tsx:

    a. **Props change:**
    ```tsx
    interface TimetableGridProps {
      initialTimeBlocks: TimeBlock[]
      numPlatforms: number
      initialConflicts: Conflict[]
      minRestBlocks: number
    }
    ```

    b. **State:**
    ```tsx
    const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks)
    const [conflicts, setConflicts] = useState(initialConflicts)
    ```

    c. **Conflict lookup:** Rebuild `conflictsByEntry` Map from `conflicts` state (same logic as current, just using state instead of props).

    d. **DnD state:**
    ```tsx
    const [dragSource, setDragSource] = useState<{ blockIdx: number; platformIdx: number } | null>(null)
    ```

    e. **DnD handlers on each `<td>` that contains a slot (not on empty cells, not on Time/Block columns):**

    ```tsx
    draggable={!!slot}
    onDragStart={(e) => {
      setDragSource({ blockIdx, platformIdx })
      e.dataTransfer.effectAllowed = 'move'
      // Optional: set drag image or data
    }}
    onDragOver={(e) => {
      e.preventDefault() // required to allow drop
      e.dataTransfer.dropEffect = 'move'
    }}
    onDrop={(e) => {
      e.preventDefault()
      if (!dragSource) return
      // Swap the two slots
      const newBlocks = structuredClone(timeBlocks)
      const srcBlock = newBlocks[dragSource.blockIdx]
      const dstBlock = newBlocks[blockIdx]
      const temp = srcBlock.platforms[dragSource.platformIdx]
      srcBlock.platforms[dragSource.platformIdx] = dstBlock.platforms[platformIdx]
      dstBlock.platforms[platformIdx] = temp
      setTimeBlocks(newBlocks)
      // Recalculate conflicts
      const newConflicts = detectConflicts(newBlocks, minRestBlocks)
      setConflicts(newConflicts)
      setDragSource(null)
    }}
    onDragEnd={() => setDragSource(null)}
    ```

    f. **Visual feedback during drag:**
    - When `dragSource` is set and user drags over a valid drop target, add a subtle border highlight: `border-2 border-dashed border-parchment/40` on the hovered cell.
    - On the source cell being dragged, apply `opacity-50`.
    - Track hover target with `onDragEnter`/`onDragLeave` using a `dragOver` state: `useState<{ blockIdx: number; platformIdx: number } | null>(null)`.

    g. **Render ConflictPanel inside TimetableGrid**, above the table:
    ```tsx
    import { ConflictPanel } from './ConflictPanel'
    // ...
    return (
      <>
        <ConflictPanel conflicts={conflicts} />
        <div className="overflow-x-auto">
          <table>...</table>
        </div>
      </>
    )
    ```

    h. **Allow dropping onto empty cells too** — this lets organizers move an athlete to an empty platform slot. The swap logic handles null gracefully (source gets null, target gets the slot).

    i. **Print behavior:** DnD state is irrelevant for print. The `print:hidden` classes on ConflictPanel toggle already handle print mode. No additional print changes needed. The current state of timeBlocks (including any manual swaps) is what prints.

    **Step 4: Update ConflictPanel — no changes needed**

    ConflictPanel already accepts `conflicts: Conflict[]` and renders them. No interface change required. It just needs to be rendered by TimetableGrid instead of page.tsx.

    **Important implementation notes:**
    - `structuredClone` is used for immutable state updates (TimeBlock contains nested arrays of objects)
    - `detectConflicts` import from `@/lib/queue/detectConflicts` — this is a pure function, safe in 'use client'
    - Do NOT persist swaps to the database. This is client-side only. Page refresh resets to the auto-scheduled arrangement.
    - Do NOT add any server actions for swapping.
    - The `cursor: grab` / `cursor: grabbing` CSS on draggable cells improves UX: add `cursor-grab` class on draggable cells, use onDragStart to not need cursor-grabbing (browser handles it).
  </action>
  <verify>
    <automated>cd /Users/clarence/kova-app && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - TimetableCell shows coach name in parentheses after club on line 3
    - TimetableGrid manages timeBlocks and conflicts in state
    - Dragging one cell onto another swaps their PlatformSlot contents
    - After each swap, detectConflicts runs and ConflictPanel updates in place
    - Empty cells are valid drop targets (move athlete to empty slot)
    - Visual feedback: dragged cell fades, drop target shows dashed border
    - Print still works (current swap state prints, DnD UI elements hidden)
    - page.tsx no longer renders ConflictPanel directly (TimetableGrid owns it)
    - Build succeeds with no type errors
  </done>
</task>

</tasks>

<verification>
1. `npx vitest run lib/queue/scheduler.test.ts` — all existing + new tests pass
2. `npx next build` — no type errors, successful build
3. Manual: navigate to /organizerdb/queue with a competition that has coach-student pairs. Verify coach conflicts are reduced vs. previous behavior. Verify coach name shows on cells. Verify drag-and-drop swap works and conflicts update live.
</verification>

<success_criteria>
- Scheduler proactively separates coaches from students during block assignment (0 COACH conflicts when avoidable)
- detectConflicts is a standalone importable pure function
- Drag-and-drop swap between any two cells (filled or empty) updates state and recalculates conflicts
- Coach name displayed as "(Coach Name)" on cell line 3
- All 15+ existing scheduler tests pass unchanged
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260404-ruf-conflict-aware-scheduler-manual-slot-swa/260404-ruf-SUMMARY.md`
</output>
