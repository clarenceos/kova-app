'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { updateRegistrant } from '@/lib/actions/dashboard'
import type { RegistrantWithEntries } from '@/lib/actions/dashboard'

interface EditRegistrantDialogProps {
  registrant: RegistrantWithEntries
  competitionId: string
  onSaved: () => void
}

const inputClass =
  'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'

const labelClass = 'block text-xs text-raw-steel mb-1'

export function EditRegistrantDialog({
  registrant,
  competitionId,
  onSaved,
}: EditRegistrantDialogProps) {
  const [lastName, setLastName] = useState(registrant.lastName)
  const [firstName, setFirstName] = useState(registrant.firstName)
  const [gender, setGender] = useState<'Male' | 'Female'>(registrant.gender as 'Male' | 'Female')
  const [bodyWeightKg, setBodyWeightKg] = useState(String(registrant.bodyWeightKg))
  const [country, setCountry] = useState(registrant.country)
  const [club, setClub] = useState(registrant.club ?? '')
  const [coach, setCoach] = useState(registrant.coach ?? '')
  const [isJudging, setIsJudging] = useState<'0' | '1' | '2'>(String(registrant.isJudging) as '0' | '1' | '2')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      onSaved()
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)

    const bw = parseFloat(bodyWeightKg)
    if (isNaN(bw) || bw <= 0) {
      setError('Body weight must be a positive number')
      setIsSaving(false)
      return
    }

    try {
      const result = await updateRegistrant({
        registrantId: registrant.id,
        competitionId,
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        gender,
        bodyWeightKg: bw,
        country: country.trim(),
        club: club.trim() || null,
        coach: coach.trim() || null,
        isJudging: parseInt(isJudging) as 0 | 1 | 2,
      })

      if ('error' in result) {
        setError(result.error)
        setIsSaving(false)
        return
      }

      onSaved()
    } catch {
      setError('Failed to save changes')
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit {registrant.lastName}, {registrant.firstName}
          </DialogTitle>
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
                <SelectValue />
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <DialogFooter>
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
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
