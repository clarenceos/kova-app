'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertProfile } from '@/lib/actions/profile'
import type { Profile } from '@/lib/schema'

interface ProfileEditFormProps {
  profile: Profile
  onClose: () => void
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function ProfileEditForm({ profile, onClose }: ProfileEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const [bodyWeight, setBodyWeight] = useState(profile.bodyWeightKg?.toString() ?? '')
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setError('')
    if (!name.trim()) { setError('Name is required'); return }

    const weightNum = bodyWeight ? parseFloat(bodyWeight) : null
    if (weightNum != null && (isNaN(weightNum) || weightNum <= 0 || weightNum > 250)) {
      setError('Weight must be between 1 and 250 kg')
      return
    }

    setPending(true)
    const result = await upsertProfile({
      name: name.trim(),
      gender,
      bodyWeightKg: weightNum,
      experienceLevel,
      onboardingComplete: true,
    })

    if ('error' in result) {
      setError(result.error)
      setPending(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div className="rounded-2xl border border-raw-steel/20 bg-charcoal p-6">
      <h3 className="mb-4 text-lg font-bold text-parchment">Edit Profile</h3>

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-raw-steel">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-raw-steel/30 bg-forge-black px-4 py-3 text-parchment focus:border-patina-bronze focus:outline-none transition-colors"
          />
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-raw-steel">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  gender === opt.value
                    ? 'border-patina-bronze bg-patina-bronze/10 text-patina-bronze'
                    : 'border-raw-steel/20 text-parchment hover:border-raw-steel/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Weight */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-raw-steel">Body Weight (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              placeholder="e.g. 75"
              min="20"
              max="250"
              step="0.1"
              className="flex-1 rounded-xl border border-raw-steel/30 bg-forge-black px-4 py-3 text-parchment placeholder:text-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors"
            />
            <span className="text-sm text-raw-steel">kg</span>
          </div>
        </div>

        {/* Experience Level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-raw-steel">Experience Level</label>
          <div className="flex flex-col gap-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExperienceLevel(opt.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  experienceLevel === opt.value
                    ? 'border-patina-bronze bg-patina-bronze/10 text-patina-bronze'
                    : 'border-raw-steel/20 text-parchment hover:border-raw-steel/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-raw-steel/30 px-4 py-3 text-sm font-semibold text-raw-steel transition-colors hover:text-parchment"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 rounded-xl bg-patina-bronze px-4 py-3 text-sm font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:opacity-50"
        >
          {pending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
