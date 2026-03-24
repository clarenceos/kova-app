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

    const disciplineLabel = DISCIPLINES.find(d => d.value === discipline)!.label

    setSession({
      youtubeUrl: youtubeUrl.trim(),
      videoId,
      athleteName: athleteName.trim(),
      discipline,
      disciplineLabel,
      weightKg: weight,
      serial: serial.trim(),
    })

    router.push('/judge/session')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Judge a Submission</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Enter the submission details to begin judging.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* YouTube URL */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              YouTube URL
            </label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={e => { setYoutubeUrl(e.target.value); setUrlError('') }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
            />
            {urlError && (
              <p className="text-red-400 text-xs mt-1">{urlError}</p>
            )}
          </div>

          {/* Athlete Name */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Athlete Name
            </label>
            <input
              type="text"
              value={athleteName}
              onChange={e => setAthleteName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Discipline */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Discipline
            </label>
            <select
              value={discipline}
              onChange={e => setDiscipline(e.target.value as DisciplineKey | '')}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-zinc-500 focus:outline-none transition-colors appearance-none"
            >
              <option value="" className="text-zinc-500">Select discipline…</option>
              {DISCIPLINES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Kettlebell Weight */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Kettlebell Weight (kg)
            </label>
            <input
              type="number"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
              placeholder="e.g. 16"
              min="1"
              step="0.5"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Serial Number
            </label>
            <input
              type="text"
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="From the video description"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors font-mono text-sm"
            />
          </div>

          {formError && (
            <p className="text-red-400 text-sm">{formError}</p>
          )}

          <button
            type="submit"
            className="w-full bg-white text-zinc-950 font-semibold rounded-2xl py-3 mt-2 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
          >
            Start Judging
          </button>
        </form>
      </div>
    </div>
  )
}
