'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KovaWordmark } from '@/components/ui/KovaWordmark'
import { upsertProfile } from '@/lib/actions/profile'

interface OnboardingModalProps {
  isOpen: boolean
  clerkName?: string
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just getting started' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years of training' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years, competing regularly' },
  { value: 'elite', label: 'Elite', desc: 'National/international level' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', desc: '' },
]

export function OnboardingModal({ isOpen, clerkName }: OnboardingModalProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(clerkName ?? '')
  const [gender, setGender] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!isOpen) return null

  function handleNext() {
    setError('')
    if (step === 1 && !name.trim()) {
      setError('Please enter your name')
      return
    }
    if (step === 2 && !gender) {
      setError('Please select an option')
      return
    }
    if (step === 4 && !experienceLevel) {
      setError('Please select your experience level')
      return
    }
    if (step < 4) {
      setStep(step + 1)
      return
    }
    handleFinish()
  }

  async function handleFinish() {
    setPending(true)
    setError('')
    const weightNum = bodyWeight ? parseFloat(bodyWeight) : null
    if (weightNum != null && (isNaN(weightNum) || weightNum <= 0 || weightNum > 250)) {
      setError('Please enter a valid weight (1-250 kg)')
      setPending(false)
      return
    }

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
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-forge-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <KovaWordmark height={32} className="text-parchment" />
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-6 bg-patina-bronze' : s < step ? 'w-2 bg-patina-bronze/40' : 'w-2 bg-raw-steel/30'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-raw-steel">Step 1 of 4</p>
                <h2 className="mt-1 text-xl font-bold text-parchment">What&apos;s your name?</h2>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoFocus
                className="rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-base text-parchment placeholder:text-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors"
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-raw-steel">Step 2 of 4</p>
                <h2 className="mt-1 text-xl font-bold text-parchment">Gender</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`rounded-xl border p-4 text-left text-sm font-medium transition-colors ${
                      gender === opt.value
                        ? 'border-patina-bronze bg-patina-bronze/10 text-patina-bronze'
                        : 'border-raw-steel/20 bg-charcoal text-parchment hover:border-raw-steel/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-raw-steel">Step 3 of 4</p>
                <h2 className="mt-1 text-xl font-bold text-parchment">Body weight</h2>
                <p className="mt-1 text-sm text-raw-steel">Optional — used for competition categories</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(e.target.value)}
                  placeholder="e.g. 75"
                  min="20"
                  max="250"
                  step="0.1"
                  className="flex-1 rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-base text-parchment placeholder:text-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors"
                />
                <span className="text-sm font-medium text-raw-steel">kg</span>
              </div>
              <button
                type="button"
                onClick={() => { setBodyWeight(''); setStep(4) }}
                className="text-sm text-raw-steel hover:text-parchment transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-raw-steel">Step 4 of 4</p>
                <h2 className="mt-1 text-xl font-bold text-parchment">Experience level</h2>
              </div>
              <div className="flex flex-col gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperienceLevel(opt.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      experienceLevel === opt.value
                        ? 'border-patina-bronze bg-patina-bronze/10'
                        : 'border-raw-steel/20 bg-charcoal hover:border-raw-steel/40'
                    }`}
                  >
                    <span className={`text-sm font-medium ${experienceLevel === opt.value ? 'text-patina-bronze' : 'text-parchment'}`}>
                      {opt.label}
                    </span>
                    {opt.desc && (
                      <span className="block mt-0.5 text-xs text-raw-steel">{opt.desc}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-center text-sm text-red-400">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(''); setStep(step - 1) }}
              className="flex-1 rounded-xl border border-raw-steel/30 px-4 py-3 text-sm font-semibold text-raw-steel transition-colors hover:text-parchment hover:border-raw-steel/50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={pending}
            className="flex-1 rounded-xl bg-patina-bronze px-4 py-3 text-sm font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:opacity-50"
          >
            {pending ? 'Saving...' : step === 4 ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
