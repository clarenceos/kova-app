'use client'

import Link from 'next/link'
import type { Score } from '@/lib/schema'

const DISCIPLINE_LABELS: Record<string, string> = {
  long_cycle: 'Long Cycle',
  jerk: 'Jerk',
  snatch: 'Snatch',
}

interface EntryCardProps {
  entry: Score
}

export function EntryCard({ entry }: EntryCardProps) {
  const disciplineLabel = DISCIPLINE_LABELS[entry.discipline] ?? entry.discipline
  const isJudged = entry.status === 'judged'
  const dateStr =
    entry.createdAt instanceof Date
      ? entry.createdAt.toISOString().split('T')[0]
      : new Date(entry.createdAt).toISOString().split('T')[0]

  return (
    <Link
      href={`/profile/${entry.id}`}
      className="block rounded-2xl border border-raw-steel/20 bg-charcoal p-4 transition-all hover:border-patina-bronze/40 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {/* Serial — primary identifier */}
          <span className="font-mono text-lg font-bold text-parchment truncate">
            {entry.serial ?? '—'}
          </span>

          {/* Discipline + weight */}
          <span className="text-sm text-raw-steel">
            {disciplineLabel} &middot; {entry.weightKg} kg
          </span>

          {/* Date */}
          <span className="text-xs text-raw-steel/60">{dateStr}</span>
        </div>

        {/* Status badge + rep count */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isJudged ? (
            <span className="rounded-full border border-patina-bronze/40 bg-patina-bronze/20 px-3 py-1 text-xs font-semibold text-patina-bronze">
              JUDGED
            </span>
          ) : (
            <span className="rounded-full border border-raw-steel/40 bg-raw-steel/20 px-3 py-1 text-xs font-semibold text-raw-steel">
              PENDING
            </span>
          )}

          {isJudged && entry.reps > 0 && (
            <span className="text-sm font-bold text-patina-bronze">
              {entry.reps} reps
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
