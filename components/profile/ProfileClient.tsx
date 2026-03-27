'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, Trophy } from 'lucide-react'
import type { Profile, Score } from '@/lib/schema'
import { IdentityCard } from './IdentityCard'
import { ProfileEditForm } from './ProfileEditForm'
import { CompactEntryRow } from './CompactEntryRow'

interface ProfileClientProps {
  profile: Profile
  clerkImageUrl?: string
  entries: Score[]
  memberSince: Date
}

const STORAGE_KEY = 'kova-submissions-open'

export function ProfileClient({ profile, clerkImageUrl, entries, memberSince }: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false)

  // Restore collapsed/expanded state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setIsSubmissionsOpen(true)
  }, [])

  function toggleSubmissions() {
    const next = !isSubmissionsOpen
    setIsSubmissionsOpen(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identity card / edit form */}
      {isEditing ? (
        <ProfileEditForm profile={profile} onClose={() => setIsEditing(false)} />
      ) : (
        <IdentityCard
          profile={profile}
          clerkImageUrl={clerkImageUrl}
          memberSince={memberSince}
          submissionCount={entries.length}
          onEdit={() => setIsEditing(true)}
        />
      )}

      {/* Submissions accordion */}
      <div className="rounded-2xl border border-raw-steel/20 bg-charcoal overflow-hidden">
        <button
          type="button"
          onClick={toggleSubmissions}
          className="flex w-full items-center justify-between px-4 py-3.5"
        >
          <span className="text-sm font-semibold text-parchment">
            Submissions{' '}
            <span className="text-raw-steel font-normal">({entries.length})</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-raw-steel transition-transform duration-200 ${
              isSubmissionsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isSubmissionsOpen && (
          <div className="border-t border-raw-steel/10">
            {entries.length > 0 ? (
              entries.map((entry, i) => (
                <CompactEntryRow
                  key={entry.id}
                  entry={entry}
                  isLast={i === entries.length - 1}
                />
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-raw-steel">No submissions yet</p>
                <Link
                  href="/record"
                  className="mt-2 inline-block text-sm font-medium text-patina-bronze hover:text-bright-bronze transition-colors"
                >
                  Record a lift
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trophy Wall placeholder */}
      <div className="rounded-2xl border border-raw-steel/10 bg-charcoal/50 px-6 py-8 text-center">
        <Trophy className="mx-auto h-8 w-8 text-raw-steel/30" />
        <p className="mt-3 text-sm font-medium text-raw-steel/50">Trophy Wall</p>
        <p className="mt-1 text-xs text-raw-steel/30">Coming Soon</p>
      </div>
    </div>
  )
}
