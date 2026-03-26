'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { scores } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function submitScore(input: {
  athleteName: string
  discipline: string
  weightKg: number
  reps: number
  serial: string
  repTaps: string
}): Promise<{ id: string } | { error: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'Unauthorized' }

    if (!input.athleteName?.trim()) return { error: 'Athlete name required' }
    if (!['long_cycle', 'jerk', 'snatch'].includes(input.discipline)) return { error: 'Invalid discipline' }
    if (!input.weightKg || input.weightKg <= 0) return { error: 'Invalid weight' }
    if (typeof input.reps !== 'number' || input.reps < 0) return { error: 'Invalid reps' }
    if (!input.serial?.trim()) return { error: 'Serial required' }

    const normalizedSerial = input.serial.trim()

    // Look up existing entry by serial
    const existing = await db
      .select()
      .from(scores)
      .where(eq(scores.serial, normalizedSerial))
      .limit(1)

    if (existing.length > 0) {
      // UPDATE existing entry created by athlete
      await db
        .update(scores)
        .set({
          reps: input.reps,
          repTaps: input.repTaps,
          status: 'judged',
        })
        .where(eq(scores.id, existing[0].id))

      revalidatePath('/leaderboard')
      revalidatePath('/profile')
      return { id: existing[0].id }
    }

    // Fallback: INSERT new row (backward compat — judge scoring without prior athlete upload)
    const id = crypto.randomUUID()

    try {
      await db.insert(scores).values({
        id,
        athleteName: input.athleteName.trim(),
        discipline: input.discipline,
        weightKg: input.weightKg,
        reps: input.reps,
        serial: normalizedSerial,
        repTaps: input.repTaps,
        status: 'judged',
        createdAt: new Date(),
      })
      revalidatePath('/leaderboard')
      revalidatePath('/profile')
      return { id }
    } catch (error) {
      console.error('[submitScore] DB insert failed:', error)
      return { error: 'Failed to save score. Please try again.' }
    }
  } catch (error) {
    console.error('[submitScore] Unexpected error:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
