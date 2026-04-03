'use client'

import type { Competition } from '@/lib/schema'
import type { RegistrantWithEntries } from '@/lib/actions/dashboard'

interface AnalyticsBarProps {
  competition: Competition
  registrants: RegistrantWithEntries[]
  totalCount: number
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-charcoal px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-bold text-parchment">{value}</span>
        <span className="text-xs text-raw-steel">{label}</span>
      </div>
    </div>
  )
}

function formatDeadlineCountdown(deadlineStr: string): string {
  const deadline = new Date(deadlineStr)
  const diff = deadline.getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  if (diff > 86400000) return Math.ceil(diff / 86400000) + ' days'
  return Math.ceil(diff / 3600000) + ' hours'
}

export function AnalyticsBar({ competition, registrants, totalCount }: AnalyticsBarProps) {
  const lcCount = registrants.filter(r => r.entries.some(e => e.event === 'LC')).length
  const jerkCount = registrants.filter(r => r.entries.some(e => e.event === 'JERK')).length
  const snatchCount = registrants.filter(r => r.entries.some(e => e.event === 'SNATCH')).length
  const maleCount = registrants.filter(r => r.gender === 'Male').length
  const femaleCount = registrants.filter(r => r.gender === 'Female').length

  return (
    <div className="flex flex-wrap gap-4">
      <StatCard value={totalCount} label="Total Registrations" />
      <StatCard value={lcCount} label="LC" />
      <StatCard value={jerkCount} label="Jerk" />
      <StatCard value={snatchCount} label="Snatch" />
      <StatCard value={maleCount} label="Male" />
      <StatCard value={femaleCount} label="Female" />

      {/* Spots Remaining: only shown if maxRegistrants is set (D-07) */}
      {competition.maxRegistrants != null && (
        <StatCard
          value={Math.max(0, competition.maxRegistrants - totalCount)}
          label="Spots Remaining"
        />
      )}

      {/* Deadline: only shown if registrationDeadline is set (D-07) */}
      {competition.registrationDeadline != null && (
        <StatCard
          value={formatDeadlineCountdown(competition.registrationDeadline)}
          label="Deadline"
        />
      )}
    </div>
  )
}
