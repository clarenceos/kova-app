'use client'

import { Pencil } from 'lucide-react'
import { AvatarUpload } from './AvatarUpload'
import type { Profile } from '@/lib/schema'

interface IdentityCardProps {
  profile: Profile
  clerkImageUrl?: string
  memberSince: Date
  submissionCount: number
  onEdit: () => void
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

const EXPERIENCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-raw-steel/20', text: 'text-raw-steel', border: 'border-raw-steel/40' },
  intermediate: { bg: 'bg-patina-bronze/20', text: 'text-patina-bronze', border: 'border-patina-bronze/40' },
  advanced: { bg: 'bg-bright-bronze/20', text: 'text-bright-bronze', border: 'border-bright-bronze/40' },
  elite: { bg: 'bg-bright-bronze/30', text: 'text-parchment', border: 'border-bright-bronze/60' },
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
}

export function IdentityCard({ profile, clerkImageUrl, memberSince, submissionCount, onEdit }: IdentityCardProps) {
  const genderLabel = GENDER_LABELS[profile.gender]
  const expStyle = EXPERIENCE_STYLES[profile.experienceLevel]
  const expLabel = EXPERIENCE_LABELS[profile.experienceLevel]
  const memberDate = memberSince instanceof Date
    ? memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : new Date(memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div className="relative rounded-2xl border border-raw-steel/20 bg-charcoal p-6">
      {/* Edit button */}
      <button
        type="button"
        onClick={onEdit}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-raw-steel/50 transition-colors hover:text-parchment hover:bg-raw-steel/10"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {/* Top row: avatar + identity */}
      <div className="flex items-center gap-4">
        <AvatarUpload
          currentUrl={profile.avatarUrl}
          clerkImageUrl={clerkImageUrl}
          name={profile.name}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-parchment">{profile.name}</h2>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {genderLabel && (
              <span className="text-xs text-raw-steel">{genderLabel}</span>
            )}
            {expLabel && expStyle && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${expStyle.bg} ${expStyle.text} ${expStyle.border}`}>
                {expLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 flex items-center gap-6 border-t border-raw-steel/10 pt-4">
        {profile.bodyWeightKg != null && profile.bodyWeightKg > 0 && (
          <div>
            <span className="text-lg font-bold text-parchment">{profile.bodyWeightKg}</span>
            <span className="ml-1 text-xs text-raw-steel">kg</span>
          </div>
        )}
        <div>
          <span className="text-lg font-bold text-parchment">{submissionCount}</span>
          <span className="ml-1 text-xs text-raw-steel">lifts</span>
        </div>
        <div>
          <span className="text-sm text-raw-steel">Since {memberDate}</span>
        </div>
      </div>
    </div>
  )
}
