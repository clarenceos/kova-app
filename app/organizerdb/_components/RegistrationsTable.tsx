'use client'

import type { RegistrantWithEntries } from '@/lib/actions/dashboard'

export function RegistrationsTable({
  registrants,
  competitionId,
}: {
  registrants: RegistrantWithEntries[]
  competitionId: string
}) {
  if (registrants.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-raw-steel">
        No registrations yet — share the registration link or import a CSV to get started.
      </p>
    )
  }
  return (
    <div className="mt-6 rounded-lg border border-raw-steel/20 bg-charcoal p-4">
      <p className="text-sm text-raw-steel">
        Registrations table loading... ({registrants.length} registrants)
      </p>
    </div>
  )
}
