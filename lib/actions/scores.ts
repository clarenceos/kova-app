'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { scores } from '@/lib/schema'

export async function submitScore(input: {
  athleteName: string
  discipline: string
  weightKg: number
  reps: number
  youtubeUrl: string
  serial: string
}): Promise<{ id: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  if (!input.athleteName?.trim()) return { error: 'Athlete name required' }
  if (!['long_cycle', 'jerk', 'snatch'].includes(input.discipline)) return { error: 'Invalid discipline' }
  if (!input.weightKg || input.weightKg <= 0) return { error: 'Invalid weight' }
  if (typeof input.reps !== 'number' || input.reps < 0) return { error: 'Invalid reps' }
  if (!input.youtubeUrl?.startsWith('http')) return { error: 'Invalid URL' }
  if (!input.serial?.trim()) return { error: 'Serial required' }

  const id = crypto.randomUUID()

  await db.insert(scores).values({
    id,
    athleteName: input.athleteName.trim(),
    discipline: input.discipline,
    weightKg: input.weightKg,
    reps: input.reps,
    youtubeUrl: input.youtubeUrl,
    serial: input.serial.trim(),
    createdAt: new Date(),
  })

  return { id }
}
