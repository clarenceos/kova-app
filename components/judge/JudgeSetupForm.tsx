'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJudgeSession, DisciplineKey } from '@/lib/judge-context'
import { lookupEntryBySerial } from '@/lib/actions/entries'
import { extractYouTubeId } from '@/lib/utils'

const DISCIPLINES: { value: DisciplineKey; label: string }[] = [
  { value: 'long_cycle', label: '10 Min. Long Cycle' },
  { value: 'jerk', label: '10 Min. Jerk' },
  { value: 'snatch', label: '10 Min. Snatch' },
]

export function JudgeSetupForm() {
  const router = useRouter()
  const { setSession } = useJudgeSession()

  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!serial.trim()) {
      setFormError('Serial number is required.')
      return
    }

    setLoading(true)
    try {
      const result = await lookupEntryBySerial(serial.trim())

      if ('error' in result) {
        if (result.error === 'not_found') {
          setFormError('No submission found for this serial')
        } else if (result.error === 'no_video') {
          setFormError('Video not yet uploaded by athlete')
        } else {
          setFormError('An error occurred. Please try again.')
        }
        return
      }

      const { entry } = result
      const videoId = extractYouTubeId(entry.youtubeUrl!)
      if (!videoId) {
        setFormError('Could not extract video ID from submission URL.')
        return
      }

      const disciplineMatch = DISCIPLINES.find(d => d.value === entry.discipline)
      const disciplineLabel = disciplineMatch?.label ?? entry.discipline

      setSession({
        youtubeUrl: entry.youtubeUrl!,
        videoId,
        athleteName: entry.athleteName,
        discipline: entry.discipline as DisciplineKey,
        disciplineLabel,
        weightKg: entry.weightKg,
        serial: entry.serial!,
        entryId: entry.id,
      })

      router.push('/judge/session')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'
  const labelClass = 'block text-sm font-medium text-raw-steel'

  return (
    <div className="px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-parchment">Judge a Submission</h1>
          <p className="mt-1 text-sm text-raw-steel">
            Enter the serial number from the athlete&#39;s submission.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Serial Number */}
          <div className="space-y-1">
            <label className={labelClass}>Serial Number</label>
            <input
              type="text"
              value={serial}
              onChange={e => { setSerial(e.target.value); setFormError('') }}
              placeholder="e.g. ABC-1234"
              className={`${inputClass} font-mono text-sm`}
              disabled={loading}
            />
          </div>

          {formError && <p className="text-sm text-raw-steel">{formError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Looking up...' : 'Look Up Entry'}
          </button>
        </form>
      </div>
    </div>
  )
}
