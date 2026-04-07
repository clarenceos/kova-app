'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCompetition } from '@/lib/actions/competitions'
import { deriveSerialPrefix } from '@/lib/queue/serial-prefix'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'

const ALL_DOUBLE_BELLS = ['2x8', '2x12', '2x16', '2x20', '2x24', '2x28', '2x32', '2x36', '2x40']
const ALL_SINGLE_BELLS = ['1x8', '1x12', '1x16', '1x20', '1x24', '1x28', '1x32']

const inputClass =
  'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'
const labelClass = 'block text-sm font-medium text-raw-steel'

export default function CreateCompetitionPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [numPlatforms, setNumPlatforms] = useState(3)
  const [status, setStatus] = useState<'draft' | 'open'>('draft')
  const [maxRegistrants, setMaxRegistrants] = useState('')
  const [registrationDeadline, setRegistrationDeadline] = useState('')
  const [allowedDurations, setAllowedDurations] = useState<'both' | '10' | '5'>('both')
  const [doubleBellWeights, setDoubleBellWeights] = useState<string[]>([...ALL_DOUBLE_BELLS])
  const [singleBellWeights, setSingleBellWeights] = useState<string[]>([...ALL_SINGLE_BELLS])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const serialPrefix = name.trim() ? deriveSerialPrefix(name) : ''

  function toggleDoubleBell(weight: string) {
    setDoubleBellWeights(prev =>
      prev.includes(weight) ? prev.filter(w => w !== weight) : [...prev, weight]
    )
  }

  function toggleSingleBell(weight: string) {
    setSingleBellWeights(prev =>
      prev.includes(weight) ? prev.filter(w => w !== weight) : [...prev, weight]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Competition name is required'
    if (!date) newErrors.date = 'Date is required'
    if (numPlatforms < 1 || numPlatforms > 10 || !Number.isInteger(numPlatforms))
      newErrors.numPlatforms = 'Enter a value between 1 and 10'
    const allBellWeights = [...doubleBellWeights, ...singleBellWeights]
    if (allBellWeights.length === 0) newErrors.bellWeights = 'Select at least one bell weight'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const result = await createCompetition({
        name: name.trim(),
        date,
        numPlatforms,
        status,
        maxRegistrants: maxRegistrants ? parseInt(maxRegistrants, 10) : null,
        registrationDeadline: registrationDeadline || null,
        allowedDurations,
        allowedBellWeights: allBellWeights,
      })
      if ('error' in result) {
        setSubmitError(result.error)
        return
      }
      router.push('/organizerdb')
    } catch {
      setSubmitError('Failed to create competition. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-12 text-2xl font-bold text-parchment">Create Competition</h1>

        <div className="rounded-xl bg-card p-8 ring-1 ring-foreground/10">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Competition Name */}
            <div>
              <label className={labelClass} htmlFor="comp-name">
                Competition Name
              </label>
              <input
                id="comp-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Girya Pilipinas Cup"
                className={`mt-1 ${inputClass}`}
              />
              {serialPrefix && (
                <p className="mt-1 text-xs text-bright-bronze">
                  Serial prefix: {serialPrefix}
                </p>
              )}
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={labelClass} htmlFor="comp-date">
                Date
              </label>
              <input
                id="comp-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
              {errors.date && (
                <p className="mt-1 text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            {/* Number of Platforms */}
            <div>
              <label className={labelClass} htmlFor="comp-platforms">
                Number of Platforms
              </label>
              <input
                id="comp-platforms"
                type="number"
                min={1}
                max={10}
                value={numPlatforms}
                onChange={e => setNumPlatforms(parseInt(e.target.value, 10) || 1)}
                className={`mt-1 ${inputClass}`}
              />
              {errors.numPlatforms && (
                <p className="mt-1 text-xs text-destructive">{errors.numPlatforms}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <p className={`${labelClass} mb-2`}>Status</p>
              <RadioGroup
                value={status}
                onValueChange={val => setStatus(val as 'draft' | 'open')}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="draft" id="status-draft" />
                  <label htmlFor="status-draft" className="cursor-pointer text-sm text-parchment">
                    Draft
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="open" id="status-open" />
                  <label htmlFor="status-open" className="cursor-pointer text-sm text-parchment">
                    Open
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Max Registrants */}
            <div>
              <label className={labelClass} htmlFor="comp-max">
                Max Registrants
              </label>
              <input
                id="comp-max"
                type="number"
                min={1}
                value={maxRegistrants}
                onChange={e => setMaxRegistrants(e.target.value)}
                placeholder="e.g. 100"
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-raw-steel">Leave blank for unlimited</p>
            </div>

            {/* Registration Deadline */}
            <div>
              <label className={labelClass} htmlFor="comp-deadline">
                Registration Deadline
              </label>
              <input
                id="comp-deadline"
                type="datetime-local"
                value={registrationDeadline}
                onChange={e => setRegistrationDeadline(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-raw-steel">Leave blank for no deadline</p>
            </div>

            {/* Duration Rule */}
            <div>
              <p className={`${labelClass} mb-2`}>Duration Rule</p>
              <RadioGroup
                value={allowedDurations}
                onValueChange={val => setAllowedDurations(val as 'both' | '10' | '5')}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="both" id="dur-both" />
                  <label htmlFor="dur-both" className="cursor-pointer text-sm text-parchment">
                    Both 5 and 10 min
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="10" id="dur-10" />
                  <label htmlFor="dur-10" className="cursor-pointer text-sm text-parchment">
                    10 min only
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="5" id="dur-5" />
                  <label htmlFor="dur-5" className="cursor-pointer text-sm text-parchment">
                    5 min only
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Allowed Bell Weights */}
            <div>
              <p className={`${labelClass} mb-4`}>Allowed Bell Weights</p>

              {/* Double Bell Section */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-raw-steel">Double Bell — LC &amp; Jerk</p>
                  <button
                    type="button"
                    className="text-xs text-bright-bronze cursor-pointer hover:underline"
                    onClick={() =>
                      doubleBellWeights.length === ALL_DOUBLE_BELLS.length
                        ? setDoubleBellWeights([])
                        : setDoubleBellWeights([...ALL_DOUBLE_BELLS])
                    }
                  >
                    {doubleBellWeights.length === ALL_DOUBLE_BELLS.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_DOUBLE_BELLS.map(weight => (
                    <div key={weight} className="flex items-center gap-2">
                      <Checkbox
                        id={`double-${weight}`}
                        checked={doubleBellWeights.includes(weight)}
                        onCheckedChange={() => toggleDoubleBell(weight)}
                      />
                      <label
                        htmlFor={`double-${weight}`}
                        className="cursor-pointer text-sm text-parchment"
                      >
                        {weight}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Single Bell Section */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-raw-steel">Single Bell — Snatch</p>
                  <button
                    type="button"
                    className="text-xs text-bright-bronze cursor-pointer hover:underline"
                    onClick={() =>
                      singleBellWeights.length === ALL_SINGLE_BELLS.length
                        ? setSingleBellWeights([])
                        : setSingleBellWeights([...ALL_SINGLE_BELLS])
                    }
                  >
                    {singleBellWeights.length === ALL_SINGLE_BELLS.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_SINGLE_BELLS.map(weight => (
                    <div key={weight} className="flex items-center gap-2">
                      <Checkbox
                        id={`single-${weight}`}
                        checked={singleBellWeights.includes(weight)}
                        onCheckedChange={() => toggleSingleBell(weight)}
                      />
                      <label
                        htmlFor={`single-${weight}`}
                        className="cursor-pointer text-sm text-parchment"
                      >
                        {weight}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {errors.bellWeights && (
                <p className="mt-2 text-xs text-destructive">{errors.bellWeights}</p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="text-sm text-raw-steel">{submitError}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Competition'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
