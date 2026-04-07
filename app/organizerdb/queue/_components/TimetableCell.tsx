'use client'

import type { PlatformSlot, Conflict } from '@/lib/queue/types'

interface TimetableCellProps {
  slot: PlatformSlot
  conflicts: Conflict[]
}

export function TimetableCell({ slot, conflicts }: TimetableCellProps) {
  const eventLabel =
    slot.event === 'LC' ? 'LC' : slot.event === 'JERK' ? 'JK' : 'SN'

  const eventBorderClass =
    slot.event === 'LC'
      ? 'border-l-2 border-blue-500/60'
      : slot.event === 'JERK'
      ? 'border-l-2 border-amber-500/60'
      : 'border-l-2 border-green-500/60'

  return (
    <div className={`relative min-w-[140px] pl-2 ${eventBorderClass}`}>
      {/* Conflict pills — top-right float */}
      {conflicts.length > 0 && (
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {conflicts.map((c, i) => (
            <span
              key={i}
              className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                c.type === 'JUDGE'
                  ? 'bg-violet-950/40 text-violet-400'
                  : c.type === 'REST'
                  ? 'bg-red-950/40 text-red-400'
                  : 'bg-amber-950/40 text-amber-400'
              }`}
            >
              {c.type}
            </span>
          ))}
        </div>
      )}

      {/* Line 1: LAST, First (bold) */}
      <p className="text-sm font-bold text-parchment">
        {slot.lastName.toUpperCase()}, {slot.firstName}
      </p>

      {/* Line 2: Event · bellWeight · weightClass */}
      <p className="text-xs text-raw-steel">
        {eventLabel} · {slot.bellWeight} · {slot.weightClass}
      </p>

      {/* Line 3: Club and/or Coach (muted, conditional) */}
      {(slot.club || slot.coach) && (
        <p className="text-xs text-raw-steel/60">
          {[slot.club, slot.coach ? `(${slot.coach})` : null].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Line 4: Judge name (most muted) */}
      {slot.judge && (
        <p className="text-xs text-raw-steel/40">
          Judge: {slot.judge.lastName.toUpperCase()}, {slot.judge.firstName}
        </p>
      )}
    </div>
  )
}
