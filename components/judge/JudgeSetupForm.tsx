'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJudgeSession, DisciplineKey } from '@/lib/judge-context'
import { extractYouTubeId } from '@/lib/utils'

const DISCIPLINES: { value: DisciplineKey; label: string }[] = [
  { value: 'long_cycle', label: '10 Min. Long Cycle' },
  { value: 'jerk', label: '10 Min. Jerk' },
  { value: 'snatch', label: '10 Min. Snatch' },
]

export function JudgeSetupForm() {
  const router = useRouter()
  const { setSession } = useJudgeSession()

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [athleteName, setAthleteName] = useState('')
  const [discipline, setDiscipline] = useState<DisciplineKey | ''>('')
  const [weightKg, setWeightKg] = useState('')
  const [serial, setSerial] = useState('')
  const [urlError, setUrlError] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUrlError('')
    setFormError('')

    const videoId = extractYouTubeId(youtubeUrl.trim())
    if (!videoId) {
      setUrlError('Invalid YouTube URL. Paste a full youtube.com or youtu.be link.')
      return
    }

    if (!athleteName.trim()) {
      setFormError('Athlete name is required.')
      return
    }

    if (!discipline) {
      setFormError('Please select a discipline.')
      return
    }

    const weight = parseFloat(weightKg)
    if (!weightKg || isNaN(weight) || weight <= 0) {
      setFormError('Enter a valid kettlebell weight.')
      return
    }

    if (!serial.trim()) {
      setFormError('Serial number is required.')
      return
    }

    const normalizedSerial = serial.replace(/\s/g, '').toUpperCase()

    const disciplineLabel = DISCIPLINES.find(d => d.value === discipline)!.label

    setSession({
      youtubeUrl: youtubeUrl.trim(),
      videoId,
      athleteName: athleteName.trim(),
      discipline,
      disciplineLabel,
      weightKg: weight,
      serial: normalizedSerial,
    })

    router.push('/judge/session')
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
            Enter the submission details to begin judging.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* YouTube URL */}
          <div className="space-y-1">
            <label className={labelClass}>YouTube URL</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={e => { setYoutubeUrl(e.target.value); setUrlError('') }}
              placeholder="https://youtube.com/watch?v=..."
              className={inputClass}
            />
            {urlError && <p className="mt-1 text-xs text-raw-steel">{urlError}</p>}
          </div>

          {/* Athlete Name */}
          <div className="space-y-1">
            <label className={labelClass}>Athlete Name</label>
            <input
              type="text"
              value={athleteName}
              onChange={e => setAthleteName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          {/* Discipline */}
          <div className="space-y-1">
            <label className={labelClass}>Discipline</label>
            <select
              value={discipline}
              onChange={e => setDiscipline(e.target.value as DisciplineKey | '')}
              className={`${inputClass} appearance-none`}
            >
              <option value="">Select discipline…</option>
              {DISCIPLINES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Kettlebell Weight */}
          <div className="space-y-1">
            <label className={labelClass}>Kettlebell Weight (kg)</label>
            <input
              type="number"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
              placeholder="e.g. 16"
              min="1"
              step="0.5"
              className={inputClass}
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-1">
            <label className={labelClass}>Serial Number</label>
            <input
              type="text"
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="From the video description"
              className={`${inputClass} font-mono text-sm`}
            />
          </div>

          {formError && <p className="text-sm text-raw-steel">{formError}</p>}

          <button
            type="submit"
            className="mt-2 w-full rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
          >
            Start Judging
          </button>
        </form>
      </div>
    </div>
  )
}
