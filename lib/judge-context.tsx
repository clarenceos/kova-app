'use client'

import React, { createContext, useContext, useState } from 'react'

export type DisciplineKey = 'long_cycle' | 'jerk' | 'snatch'

export type JudgeSession = {
  youtubeUrl: string
  videoId: string
  athleteName: string
  discipline: DisciplineKey
  disciplineLabel: string
  weightKg: number
  serial: string
}

export type LastSubmission = JudgeSession & { reps: number }

type JudgeSessionContextValue = {
  session: JudgeSession | null
  setSession: (s: JudgeSession) => void
  lastSubmission: LastSubmission | null
  setLastSubmission: (s: LastSubmission) => void
}

const JudgeSessionContext = createContext<JudgeSessionContextValue | null>(null)

export function JudgeSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<JudgeSession | null>(null)
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null)

  const value: JudgeSessionContextValue = {
    session,
    setSession,
    lastSubmission,
    setLastSubmission,
  }

  return (
    <JudgeSessionContext.Provider value={value}>
      {children}
    </JudgeSessionContext.Provider>
  )
}

export function useJudgeSession(): JudgeSessionContextValue {
  const ctx = useContext(JudgeSessionContext)
  if (!ctx) {
    throw new Error('useJudgeSession must be used within a JudgeSessionProvider')
  }
  return ctx
}
