'use client'

import Link from 'next/link'
import type { Score } from '@/lib/schema'

interface CompactEntryRowProps {
  entry: Score
  isLast: boolean
}

const DISCIPLINE_ABBR: Record<string, string> = {
  long_cycle: 'LC',
  jerk: 'JRK',
  snatch: 'SN',
}

export function CompactEntryRow({ entry, isLast }: CompactEntryRowProps) {
  const abbr = DISCIPLINE_ABBR[entry.discipline] ?? entry.discipline.slice(0, 3).toUpperCase()
  const isJudged = entry.status === 'judged'
  const serial = entry.serial ? entry.serial.slice(0, 6) : '—'
  const dateStr = entry.createdAt instanceof Date
    ? entry.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Link
      href={`/profile/${entry.id}`}
      className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-raw-steel/5 active:bg-raw-steel/10 ${
        !isLast ? 'border-b border-raw-steel/10' : ''
      }`}
    >
      {/* Left: discipline + weight */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-bold text-parchment">{abbr}</span>
        <span className="text-sm text-raw-steel">{entry.weightKg}kg</span>
      </div>

      {/* Right: reps + serial + date + badge */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {isJudged && entry.reps > 0 && (
          <span className="text-sm font-bold text-patina-bronze">{entry.reps}</span>
        )}
        <span className="font-mono text-xs text-raw-steel/60">{serial}</span>
        <span className="text-xs text-raw-steel/40">{dateStr}</span>
        {isJudged ? (
          <span className="rounded-full border border-patina-bronze/40 bg-patina-bronze/20 px-2 py-0.5 text-[10px] font-semibold text-patina-bronze">
            JUDGED
          </span>
        ) : (
          <span className="rounded-full border border-raw-steel/40 bg-raw-steel/20 px-2 py-0.5 text-[10px] font-semibold text-raw-steel">
            PENDING
          </span>
        )}
      </div>
    </Link>
  )
}
