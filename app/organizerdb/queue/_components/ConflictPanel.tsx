'use client'

import { useState } from 'react'
import type { Conflict, RestConflict, CoachConflict } from '@/lib/queue/types'

interface ConflictPanelProps {
  conflicts: Conflict[]
}

export function ConflictPanel({ conflicts }: ConflictPanelProps) {
  const [expanded, setExpanded] = useState(true)

  const restConflicts = conflicts.filter((c): c is RestConflict => c.type === 'REST')
  const coachConflicts = conflicts.filter((c): c is CoachConflict => c.type === 'COACH')
  const totalCount = conflicts.length

  return (
    <div className="mb-6 rounded-lg border border-raw-steel/20 bg-charcoal">
      {/* Toggle header — hidden in print */}
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-parchment hover:bg-charcoal/80 transition-colors print:hidden"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs">{expanded ? '▼' : '►'}</span>
        {totalCount === 0 ? (
          <span className="text-green-400">No conflicts</span>
        ) : (
          <span>
            {totalCount} conflict{totalCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Conflict list — on screen: collapsible; in print: always visible */}
      <div
        className={`px-4 pb-3 space-y-1 ${expanded ? 'block' : 'hidden'} print:block`}
      >
        {totalCount === 0 && (
          <p className="text-sm text-green-400">No conflicts</p>
        )}

        {restConflicts.map((c, i) => (
          <p key={`rest-${i}`} className="text-sm text-red-400 print:text-black">
            <span className="font-bold">REST:</span> {c.athleteName} — blocks{' '}
            {c.blockNumbers[0]} and {c.blockNumbers[1]} (gap:{' '}
            {c.gap} block{c.gap !== 1 ? 's' : ''})
          </p>
        ))}

        {coachConflicts.map((c, i) => (
          <p key={`coach-${i}`} className="text-sm text-amber-400 print:text-black">
            <span className="font-bold">COACH:</span> {c.coachName} coaching{' '}
            {c.studentName} in block {c.blockNumber}
          </p>
        ))}
      </div>
    </div>
  )
}
