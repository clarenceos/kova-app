'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCompetition } from '@/lib/actions/competitions'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Competition } from '@/lib/schema'

const ALL_DOUBLE_BELLS = ['2x8', '2x12', '2x16', '2x20', '2x24', '2x28', '2x32', '2x36', '2x40']
const ALL_SINGLE_BELLS = ['1x8', '1x12', '1x16', '1x20', '1x24', '1x28', '1x32']

const inputClass =
  'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'
const labelClass = 'block text-sm font-medium text-raw-steel'

interface EditCompetitionFormProps {
  competition: Competition
}

export function EditCompetitionForm({ competition }: EditCompetitionFormProps) {
  const router = useRouter()

  // Parse allowedBellWeights from JSON string
  const parsedWeights: string[] = (() => {
    try {
      return JSON.parse(competition.allowedBellWeights) as string[]
    } catch {
      return []
    }
  })()

  const [name, setName] = useState(competition.name)
  const [date, setDate] = useState(competition.date)
  const [numPlatforms, setNumPlatforms] = useState(competition.numPlatforms)
  const [status, setStatus] = useState<'draft' | 'open' | 'closed'>(
    competition.status as 'draft' | 'open' | 'closed'
  )
  const [maxRegistrants, setMaxRegistrants] = useState(
    competition.maxRegistrants != null ? String(competition.maxRegistrants) : ''
  )
  const [registrationDeadline, setRegistrationDeadline] = useState(
    competition.registrationDeadline ?? ''
  )
  const [allowedDurations, setAllowedDurations] = useState<'both' | '10' | '5'>(
    competition.allowedDurations as 'both' | '10' | '5'
  )
  const [doubleBellWeights, setDoubleBellWeights] = useState<string[]>(
    parsedWeights.filter(w => w.startsWith('2x'))
  )
  const [singleBellWeights, setSingleBellWeights] = useState<string[]>(
    parsedWeights.filter(w => w.startsWith('1x'))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
      const result = await updateCompetition(competition.id, {
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
      router.push('/organizerdb?compId=' + competition.id)
    } catch {
      setSubmitError('Failed to save competition. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
          className={`mt-1 ${inputClass}`}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Serial Prefix — read-only */}
      <div>
        <p className={labelClass}>Serial Prefix</p>
        <p className="mt-1 font-mono text-parchment">
          {competition.serialPrefix}
        </p>
        <p className="mt-0.5 text-xs text-raw-steel/60">
          Serial prefix is set at creation and cannot be changed.
        </p>
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
          onValueChange={val => setStatus(val as 'draft' | 'open' | 'closed')}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="draft" id="status-draft" />
            <label htmlFor="status-draft" className="cursor-pointer text-sm text-parchment">Draft</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="open" id="status-open" />
            <label htmlFor="status-open" className="cursor-pointer text-sm text-parchment">Open</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="closed" id="status-closed" />
            <label htmlFor="status-closed" className="cursor-pointer text-sm text-parchment">Closed</label>
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
            <label htmlFor="dur-both" className="cursor-pointer text-sm text-parchment">Both 5 and 10 min</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="10" id="dur-10" />
            <label htmlFor="dur-10" className="cursor-pointer text-sm text-parchment">10 min only</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="5" id="dur-5" />
            <label htmlFor="dur-5" className="cursor-pointer text-sm text-parchment">5 min only</label>
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
              {doubleBellWeights.length === ALL_DOUBLE_BELLS.length ? 'Deselect All' : 'Select All'}
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
                <label htmlFor={`double-${weight}`} className="cursor-pointer text-sm text-parchment">
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
              {singleBellWeights.length === ALL_SINGLE_BELLS.length ? 'Deselect All' : 'Select All'}
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
                <label htmlFor={`single-${weight}`} className="cursor-pointer text-sm text-parchment">
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
        {submitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
