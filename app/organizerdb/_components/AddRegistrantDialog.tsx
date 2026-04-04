'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { registerAthlete } from '@/lib/actions/registrations'

interface AddRegistrantDialogProps {
  competitionId: string
  allowedDurations: 'both' | '10' | '5'
  allowedBellWeights: string // JSON string from competition
  onAdded: () => void
}

const inputClass =
  'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'

const labelClass = 'block text-xs text-raw-steel mb-1'

type EventKey = 'LC' | 'JERK' | 'SNATCH'

interface EventEntry {
  bellWeight: string
  duration: string // '10' | '5'
}

export function AddRegistrantDialog({
  competitionId,
  allowedDurations,
  allowedBellWeights,
  onAdded,
}: AddRegistrantDialogProps) {
  const [open, setOpen] = useState(false)

  // Form fields
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('')
  const [bodyWeightKg, setBodyWeightKg] = useState('')
  const [country, setCountry] = useState('')
  const [isJudging, setIsJudging] = useState<'0' | '1' | '2'>('0')
  const [club, setClub] = useState('')
  const [coach, setCoach] = useState('')

  // Events
  const [lcChecked, setLcChecked] = useState(false)
  const [jerkChecked, setJerkChecked] = useState(false)
  const [snatchChecked, setSnatchChecked] = useState(false)
  const [eventEntries, setEventEntries] = useState<Record<EventKey, EventEntry>>({
    LC: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
    JERK: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
    SNATCH: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse bell weights from competition
  let parsedBellWeights: string[] = []
  try {
    parsedBellWeights = JSON.parse(allowedBellWeights) as string[]
  } catch {
    parsedBellWeights = []
  }
  const doubleBells = parsedBellWeights.filter(w => w.startsWith('2x'))
  const singleBells = parsedBellWeights.filter(w => w.startsWith('1x'))

  function getBellsForEvent(ev: EventKey): string[] {
    return ev === 'SNATCH' ? singleBells : doubleBells
  }

  function updateEventEntry(ev: EventKey, field: keyof EventEntry, value: string) {
    setEventEntries(prev => ({
      ...prev,
      [ev]: { ...prev[ev], [field]: value },
    }))
  }

  function resetForm() {
    setLastName('')
    setFirstName('')
    setGender('')
    setBodyWeightKg('')
    setCountry('')
    setIsJudging('0')
    setClub('')
    setCoach('')
    setLcChecked(false)
    setJerkChecked(false)
    setSnatchChecked(false)
    setEventEntries({
      LC: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
      JERK: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
      SNATCH: { bellWeight: '', duration: allowedDurations === '5' ? '5' : '10' },
    })
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  async function handleSubmit() {
    setError(null)
    setIsSaving(true)

    // Validate required fields
    if (!lastName.trim()) { setError('Last name is required'); setIsSaving(false); return }
    if (!firstName.trim()) { setError('First name is required'); setIsSaving(false); return }
    if (!gender) { setError('Gender is required'); setIsSaving(false); return }
    const bw = parseFloat(bodyWeightKg)
    if (isNaN(bw) || bw <= 0) { setError('Body weight must be a positive number'); setIsSaving(false); return }
    if (!country.trim()) { setError('Country is required'); setIsSaving(false); return }

    const isJudgingNum = parseInt(isJudging) as 0 | 1 | 2

    // Build events array (skip for judge-only)
    const events: Array<{ event: 'LC' | 'JERK' | 'SNATCH'; bellWeight: string; duration: number }> = []
    if (isJudgingNum !== 1) {
      const checks: Array<[boolean, EventKey]> = [
        [lcChecked, 'LC'],
        [jerkChecked, 'JERK'],
        [snatchChecked, 'SNATCH'],
      ]
      for (const [checked, ev] of checks) {
        if (!checked) continue
        const entry = eventEntries[ev]
        if (!entry.bellWeight) {
          setError(`Select a bell weight for ${ev}`)
          setIsSaving(false)
          return
        }
        events.push({ event: ev, bellWeight: entry.bellWeight, duration: parseInt(entry.duration) })
      }
      if (events.length === 0) {
        setError('Select at least one event (or set judging status to Judge only)')
        setIsSaving(false)
        return
      }
    }

    try {
      const result = await registerAthlete({
        competitionId,
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        gender: gender as 'Male' | 'Female',
        bodyWeightKg: bw,
        country: country.trim(),
        club: club.trim() || null,
        coach: coach.trim() || null,
        events,
        isJudging: isJudgingNum,
      })

      if ('error' in result) {
        setError(result.error)
        setIsSaving(false)
        return
      }

      setOpen(false)
      resetForm()
      onAdded()
    } catch {
      setError('Failed to add registrant. Please try again.')
      setIsSaving(false)
    }
  }

  const isJudgeOnly = isJudging === '1'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-raw-steel/30 px-3 py-1.5 text-xs text-raw-steel transition-colors hover:border-parchment/50 hover:text-parchment"
        >
          <UserPlus className="h-3 w-3" />
          Add Entry
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Registrant</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Last Name */}
          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              className={inputClass}
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>

          {/* First Name */}
          <div>
            <label className={labelClass}>First Name *</label>
            <input
              className={inputClass}
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </div>

          {/* Gender */}
          <div>
            <label className={labelClass}>Gender *</label>
            <Select value={gender} onValueChange={v => setGender(v as 'Male' | 'Female')}>
              <SelectTrigger className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment focus:border-patina-bronze focus:outline-none transition-colors h-auto">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Body Weight */}
          <div>
            <label className={labelClass}>Body Weight (kg) *</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              step={0.1}
              value={bodyWeightKg}
              onChange={e => setBodyWeightKg(e.target.value)}
              required
            />
          </div>

          {/* Country */}
          <div>
            <label className={labelClass}>Country *</label>
            <input
              className={inputClass}
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="e.g. Philippines"
              required
            />
          </div>

          {/* Judging Status */}
          <div>
            <label className={labelClass}>Judging Status</label>
            <Select value={isJudging} onValueChange={v => setIsJudging(v as '0' | '1' | '2')}>
              <SelectTrigger className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment focus:border-patina-bronze focus:outline-none transition-colors h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Not judging</SelectItem>
                <SelectItem value="1">Judge only</SelectItem>
                <SelectItem value="2">Competing + judging</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Club */}
          <div>
            <label className={labelClass}>Club</label>
            <input
              className={inputClass}
              value={club}
              onChange={e => setClub(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Coach */}
          <div>
            <label className={labelClass}>Coach</label>
            <input
              className={inputClass}
              value={coach}
              onChange={e => setCoach(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Events section — hidden for judge-only */}
        {!isJudgeOnly && (
          <div className="mt-2">
            <p className={`${labelClass} mb-2`}>Events *</p>
            <div className="space-y-3">
              {(
                [
                  { key: 'LC' as EventKey, label: 'LC (Long Cycle)', checked: lcChecked, setChecked: setLcChecked },
                  { key: 'JERK' as EventKey, label: 'Jerk', checked: jerkChecked, setChecked: setJerkChecked },
                  { key: 'SNATCH' as EventKey, label: 'Snatch', checked: snatchChecked, setChecked: setSnatchChecked },
                ] as const
              ).map(({ key, label, checked, setChecked }) => (
                <div key={key}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`ev-${key}`}
                      checked={checked}
                      onCheckedChange={v => setChecked(Boolean(v))}
                    />
                    <label htmlFor={`ev-${key}`} className="text-xs text-parchment cursor-pointer">
                      {label}
                    </label>
                  </div>
                  {checked && (
                    <div className="mt-2 ml-6 grid grid-cols-2 gap-3">
                      {/* Bell Weight */}
                      <div>
                        <label className={labelClass}>Bell Weight</label>
                        <Select
                          value={eventEntries[key].bellWeight}
                          onValueChange={v => updateEventEntry(key, 'bellWeight', v)}
                        >
                          <SelectTrigger className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-3 py-2 text-parchment focus:border-patina-bronze focus:outline-none transition-colors h-auto text-xs">
                            <SelectValue placeholder="Select weight" />
                          </SelectTrigger>
                          <SelectContent>
                            {getBellsForEvent(key).map(w => (
                              <SelectItem key={w} value={w}>{w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className={labelClass}>Duration</label>
                        {allowedDurations === 'both' ? (
                          <Select
                            value={eventEntries[key].duration}
                            onValueChange={v => updateEventEntry(key, 'duration', v)}
                          >
                            <SelectTrigger className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-3 py-2 text-parchment focus:border-patina-bronze focus:outline-none transition-colors h-auto text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 min</SelectItem>
                              <SelectItem value="5">5 min</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-raw-steel py-2">
                            {allowedDurations === '10' ? '10 min' : '5 min'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <button
            className="rounded-lg bg-patina-bronze px-4 py-2 text-sm font-medium text-parchment transition-colors hover:bg-patina-bronze/80 disabled:opacity-50"
            disabled={isSaving}
            onClick={handleSubmit}
          >
            {isSaving ? 'Adding...' : 'Add Registrant'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
