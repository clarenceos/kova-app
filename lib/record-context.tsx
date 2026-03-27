'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Discipline = 'long-cycle' | 'jerk' | 'snatch'

export interface RecordState {
  // Session identity
  serial: string
  setSerial: (s: string) => void
  // Discipline selection
  discipline: Discipline | null
  setDiscipline: (d: Discipline | null) => void
  disciplineLabel: string | null
  setDisciplineLabel: (label: string | null) => void
  // Athlete info (passed in via provider prop)
  athleteName: string
  // Setup fields
  weightKg: number | null
  setWeightKg: (w: number | null) => void
  countdownSeconds: number
  setCountdownSeconds: (s: number) => void
  beepEveryMinute: boolean
  setBeepEveryMinute: (b: boolean) => void
  autoStop: boolean
  setAutoStop: (a: boolean) => void
  selectedDeviceId: string | null
  setSelectedDeviceId: (id: string | null) => void
  // Recording output
  recordedBlob: Blob | null
  setRecordedBlob: (blob: Blob | null) => void
  mimeType: string
  setMimeType: (mime: string) => void
}

const RecordContext = createContext<RecordState | null>(null)

interface RecordProviderProps {
  athleteName: string
  serial: string
  children: React.ReactNode
}

export function RecordProvider({ athleteName, serial: initialSerial, children }: RecordProviderProps) {
  const [serial, setSerial] = useState<string>(initialSerial)
  const [discipline, setDiscipline] = useState<Discipline | null>(null)
  const [disciplineLabel, setDisciplineLabel] = useState<string | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(10)
  const [beepEveryMinute, setBeepEveryMinute] = useState<boolean>(false)
  const [autoStop, setAutoStop] = useState<boolean>(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [mimeType, setMimeType] = useState<string>('video/webm')

  const value: RecordState = {
    serial,
    setSerial,
    discipline,
    setDiscipline,
    disciplineLabel,
    setDisciplineLabel,
    athleteName,
    weightKg,
    setWeightKg,
    countdownSeconds,
    setCountdownSeconds,
    beepEveryMinute,
    setBeepEveryMinute,
    autoStop,
    setAutoStop,
    selectedDeviceId,
    setSelectedDeviceId,
    recordedBlob,
    setRecordedBlob,
    mimeType,
    setMimeType,
  }

  return <RecordContext.Provider value={value}>{children}</RecordContext.Provider>
}

export function useRecord(): RecordState {
  const ctx = useContext(RecordContext)
  if (!ctx) {
    throw new Error('useRecord must be used within a RecordProvider')
  }
  return ctx
}
