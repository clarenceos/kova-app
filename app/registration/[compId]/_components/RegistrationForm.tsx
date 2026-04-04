'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAthlete } from '@/lib/actions/registrations'
import { COUNTRIES } from '@/lib/constants/countries'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Check, ChevronsUpDown } from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'
const labelClass = 'block text-sm font-semibold text-raw-steel'

interface EventState {
  checked: boolean
  bellWeight: string
  duration: number | null
}

interface RegistrationFormProps {
  competitionId: string
  allowedDurations: 'both' | '10' | '5'
  doubleBells: string[]
  singleBells: string[]
}

const EVENT_KEYS = ['LC', 'JERK', 'SNATCH'] as const
type EventKey = (typeof EVENT_KEYS)[number]

const EVENT_LABELS: Record<EventKey, string> = {
  LC: 'Long Cycle',
  JERK: 'Jerk',
  SNATCH: 'Snatch',
}

export function RegistrationForm({
  competitionId,
  allowedDurations,
  doubleBells,
  singleBells,
}: RegistrationFormProps) {
  const router = useRouter()

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [country, setCountry] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [events, setEvents] = useState<Record<EventKey, EventState>>({
    LC: { checked: false, bellWeight: '', duration: null },
    JERK: { checked: false, bellWeight: '', duration: null },
    SNATCH: { checked: false, bellWeight: '', duration: null },
  })
  const [isJudgeOnly, setIsJudgeOnly] = useState(false)
  const [isAlsoJudging, setIsAlsoJudging] = useState(false)
  const [club, setClub] = useState('')
  const [coach, setCoach] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function toggleEvent(key: EventKey, checked: boolean) {
    setEvents(prev => ({
      ...prev,
      [key]: checked
        ? { ...prev[key], checked: true }
        : { checked: false, bellWeight: '', duration: null },
    }))
  }

  function updateEventBellWeight(key: EventKey, bellWeight: string) {
    setEvents(prev => ({ ...prev, [key]: { ...prev[key], bellWeight } }))
  }

  function updateEventDuration(key: EventKey, duration: number) {
    setEvents(prev => ({ ...prev, [key]: { ...prev[key], duration } }))
  }

  function getBellOptions(key: EventKey): string[] {
    return key === 'SNATCH' ? singleBells : doubleBells
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    const newErrors: Record<string, string> = {}
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    if (!gender) newErrors.gender = 'Gender is required'
    if (!bodyWeight || parseFloat(bodyWeight) <= 0) newErrors.bodyWeight = 'Body weight is required'
    if (!country) newErrors.country = 'Country is required'

    const checkedEvents = Object.entries(events).filter(([, v]) => v.checked) as [
      EventKey,
      EventState,
    ][]
    if (!isJudgeOnly && checkedEvents.length === 0) newErrors.events = 'Select at least one event'

    for (const [key, val] of checkedEvents) {
      if (!val.bellWeight) {
        const eventName = EVENT_LABELS[key]
        newErrors[`${key}_bellWeight`] = `Select a bell weight for ${eventName}`
      }
      if (allowedDurations === 'both' && !val.duration) {
        const eventName = EVENT_LABELS[key]
        newErrors[`${key}_duration`] = `Select a duration for ${eventName}`
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const isJudging = isJudgeOnly ? 1 : isAlsoJudging ? 2 : 0
      const eventPayload = isJudgeOnly
        ? []
        : checkedEvents.map(([key, val]) => ({
            event: key as 'LC' | 'JERK' | 'SNATCH',
            bellWeight: val.bellWeight,
            duration: allowedDurations === 'both' ? val.duration! : parseInt(allowedDurations),
          }))
      const result = await registerAthlete({
        competitionId,
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        gender: gender as 'Male' | 'Female',
        bodyWeightKg: parseFloat(bodyWeight),
        country,
        club: club.trim() || null,
        coach: coach.trim() || null,
        events: eventPayload,
        isJudging,
      })
      if ('error' in result) {
        setSubmitError(result.error)
        return
      }
      router.push(`/registration/${competitionId}/success?registrantId=${result.registrantId}`)
    } catch {
      setSubmitError('Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCountry = COUNTRIES.find(c => c.name === country)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Last Name */}
      <div>
        <label className={labelClass} htmlFor="reg-last-name">
          Last Name
        </label>
        <input
          id="reg-last-name"
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
        {errors.lastName && (
          <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
        )}
      </div>

      {/* First Name */}
      <div>
        <label className={labelClass} htmlFor="reg-first-name">
          First Name
        </label>
        <input
          id="reg-first-name"
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-raw-steel">
          If you go by a single name (e.g. Suharto), enter it in both fields.
        </p>
        {errors.firstName && (
          <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <p className={`${labelClass} mb-2`}>Gender</p>
        <RadioGroup
          value={gender}
          onValueChange={val => setGender(val as 'Male' | 'Female')}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Male" id="gender-male" />
            <label htmlFor="gender-male" className="cursor-pointer text-sm text-parchment">
              Male
            </label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Female" id="gender-female" />
            <label htmlFor="gender-female" className="cursor-pointer text-sm text-parchment">
              Female
            </label>
          </div>
        </RadioGroup>
        {errors.gender && (
          <p className="mt-1 text-xs text-destructive">{errors.gender}</p>
        )}
      </div>

      {/* Body Weight */}
      <div>
        <label className={labelClass} htmlFor="reg-body-weight">
          Body Weight
        </label>
        <input
          id="reg-body-weight"
          type="number"
          step="0.1"
          min="0"
          value={bodyWeight}
          onChange={e => setBodyWeight(e.target.value)}
          placeholder="e.g. 72.5 kg"
          className={`mt-1 ${inputClass}`}
        />
        {errors.bodyWeight && (
          <p className="mt-1 text-xs text-destructive">{errors.bodyWeight}</p>
        )}
      </div>

      {/* Country */}
      <div>
        <p className={`${labelClass} mb-1`}>Country</p>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={countryOpen}
              className={`mt-1 flex items-center justify-between ${inputClass}`}
            >
              {selectedCountry ? (
                <span className="text-parchment">
                  {selectedCountry.flag} {selectedCountry.name}
                </span>
              ) : (
                <span className="text-raw-steel/50">Select country</span>
              )}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 text-raw-steel/50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map(c => (
                    <CommandItem
                      key={c.name}
                      value={c.name}
                      onSelect={() => {
                        setCountry(c.name)
                        setCountryOpen(false)
                      }}
                      data-checked={country === c.name ? 'true' : undefined}
                    >
                      <span>
                        {c.flag} {c.name}
                      </span>
                      {country === c.name && (
                        <Check className="ml-auto size-4 text-patina-bronze" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.country && (
          <p className="mt-1 text-xs text-destructive">{errors.country}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <p className="mb-3 text-base font-semibold text-parchment">Role</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="role-judge-only"
              checked={isJudgeOnly}
              onCheckedChange={(checked) => {
                const val = checked === true
                setIsJudgeOnly(val)
                if (val) {
                  setIsAlsoJudging(false)
                  // Clear all event selections
                  setEvents({
                    LC: { checked: false, bellWeight: '', duration: null },
                    JERK: { checked: false, bellWeight: '', duration: null },
                    SNATCH: { checked: false, bellWeight: '', duration: null },
                  })
                }
              }}
            />
            <label htmlFor="role-judge-only" className="cursor-pointer text-sm text-parchment">
              I am judging only (not competing in any event)
            </label>
          </div>
          {!isJudgeOnly && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="role-also-judging"
                checked={isAlsoJudging}
                onCheckedChange={(checked) => setIsAlsoJudging(checked === true)}
              />
              <label htmlFor="role-also-judging" className="cursor-pointer text-sm text-parchment">
                I am also available to judge
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Events */}
      <div>
        <p className="mb-4 text-base font-semibold text-parchment">
          {isJudgeOnly ? 'Events (not applicable — judge only)' : 'Events'}
        </p>
        <div className="space-y-3">
          {EVENT_KEYS.map(key => {
            const ev = events[key]
            const bellOptions = getBellOptions(key)
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${key}`}
                    checked={ev.checked}
                    disabled={isJudgeOnly}
                    onCheckedChange={(checked) => toggleEvent(key, checked === true)}
                  />
                  <label
                    htmlFor={`event-${key}`}
                    className="cursor-pointer text-sm text-parchment"
                  >
                    {EVENT_LABELS[key]}
                  </label>
                </div>

                {/* Inline expand area */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    ev.checked ? 'max-h-96' : 'max-h-0'
                  }`}
                  aria-hidden={!ev.checked}
                >
                  <div className="pl-6 pt-4 pb-4 space-y-4">
                    {/* Bell Weight */}
                    <div>
                      <label
                        className={`${labelClass} mb-1`}
                        htmlFor={`bell-${key}`}
                      >
                        Bell Weight
                      </label>
                      <select
                        id={`bell-${key}`}
                        value={ev.bellWeight}
                        onChange={e => updateEventBellWeight(key, e.target.value)}
                        className={`mt-1 ${inputClass}`}
                      >
                        <option value="" disabled>
                          Select bell weight
                        </option>
                        {bellOptions.map(w => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      {errors[`${key}_bellWeight`] && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors[`${key}_bellWeight`]}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <p className={`${labelClass} mb-2`}>Duration</p>
                      {allowedDurations === 'both' ? (
                        <>
                          <RadioGroup
                            value={ev.duration?.toString() ?? ''}
                            onValueChange={val => updateEventDuration(key, parseInt(val))}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                value="10"
                                id={`dur-${key}-10`}
                              />
                              <label
                                htmlFor={`dur-${key}-10`}
                                className="cursor-pointer text-sm text-parchment"
                              >
                                10 min
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                value="5"
                                id={`dur-${key}-5`}
                              />
                              <label
                                htmlFor={`dur-${key}-5`}
                                className="cursor-pointer text-sm text-parchment"
                              >
                                5 min
                              </label>
                            </div>
                          </RadioGroup>
                          {errors[`${key}_duration`] && (
                            <p className="mt-1 text-xs text-destructive">
                              {errors[`${key}_duration`]}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-parchment">
                          Duration: {allowedDurations} min
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {errors.events && (
          <p className="mt-2 text-xs text-destructive">{errors.events}</p>
        )}
      </div>

      {/* Club */}
      <div>
        <label className={labelClass} htmlFor="reg-club">
          Club{' '}
          <span className="font-normal text-raw-steel/70">(optional)</span>
        </label>
        <input
          id="reg-club"
          type="text"
          value={club}
          onChange={e => setClub(e.target.value)}
          placeholder="e.g. Girya Manila"
          className={`mt-1 ${inputClass}`}
        />
      </div>

      {/* Coach */}
      <div>
        <label className={labelClass} htmlFor="reg-coach">
          Coach{' '}
          <span className="font-normal text-raw-steel/70">(optional)</span>
        </label>
        <input
          id="reg-coach"
          type="text"
          value={coach}
          onChange={e => setCoach(e.target.value)}
          placeholder="e.g. Juan dela Cruz"
          className={`mt-1 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-raw-steel">
          Only fill in if your coach will be present on competition day.
        </p>
      </div>

      {/* Submit error */}
      {submitError && <p className="text-sm text-raw-steel">{submitError}</p>}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Registering...' : 'Register'}
      </button>

    </form>
  )
}
