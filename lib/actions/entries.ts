'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { scores, type Score } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function createEntry(input: {
  athleteName: string
  discipline: string
  weightKg: number
  serial: string
  youtubeUrl: string
  youtubeId: string
}): Promise<{ id: string } | { error: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'Unauthorized' }

    if (!input.athleteName?.trim()) return { error: 'Athlete name required' }
    if (!['long_cycle', 'jerk', 'snatch'].includes(input.discipline)) return { error: 'Invalid discipline' }
    if (!input.weightKg || input.weightKg <= 0) return { error: 'Invalid weight' }
    if (!input.serial?.trim()) return { error: 'Serial required' }
    if (!input.youtubeUrl?.startsWith('http')) return { error: 'Invalid YouTube URL' }
    if (!input.youtubeId?.trim()) return { error: 'YouTube video ID required' }

    const id = crypto.randomUUID()

    console.log('[createEntry] Attempting insert with:', JSON.stringify({
      athleteName: input.athleteName,
      discipline: input.discipline,
      weightKg: input.weightKg,
      serial: input.serial,
      youtubeId: input.youtubeId,
      youtubeUrl: input.youtubeUrl,
      userId,
    }, null, 2))

    try {
      await db.insert(scores).values({
        id,
        athleteName: input.athleteName.trim(),
        discipline: input.discipline,
        weightKg: input.weightKg,
        reps: 0,
        youtubeUrl: input.youtubeUrl,
        youtubeId: input.youtubeId.trim(),
        serial: input.serial.trim(),
        status: 'pending',
        athleteId: userId,
        createdAt: new Date(),
      })
    } catch (dbError) {
      console.error('[createEntry] DB insert failed:', (dbError as Error)?.message, (dbError as Error)?.cause)
      throw dbError
    }

    try {
      revalidatePath('/leaderboard')
      revalidatePath('/profile')
    } catch (revalidateError) {
      console.error('[createEntry] revalidatePath failed:', String(revalidateError))
    }
    console.log('[createEntry] Insert succeeded, returning id:', id)
    return { id }
  } catch (error) {
    console.error('[createEntry] Full error:', JSON.stringify(error, null, 2), (error as Error)?.message, (error as Error)?.cause)
    return { error: 'Failed to create entry. Please try again.' }
  }
}

export async function lookupEntryBySerial(serial: string): Promise<
  { entry: { id: string; athleteName: string; discipline: string; weightKg: number; youtubeUrl: string | null; youtubeId: string | null; serial: string | null; status: string | null } }
  | { error: 'not_found' | 'no_video' }
> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'not_found' }

    const normalized = serial.replace(/\s/g, '').toUpperCase()

    const rows = await db
      .select()
      .from(scores)
      .where(eq(scores.serial, normalized))
      .limit(1)

    if (rows.length === 0) return { error: 'not_found' }

    const row = rows[0]
    if (!row.youtubeUrl) return { error: 'no_video' }

    return {
      entry: {
        id: row.id,
        athleteName: row.athleteName,
        discipline: row.discipline,
        weightKg: row.weightKg,
        youtubeUrl: row.youtubeUrl,
        youtubeId: row.youtubeId ?? null,
        serial: row.serial ?? null,
        status: row.status ?? null,
      },
    }
  } catch (error) {
    console.error('[lookupEntryBySerial] Failed:', error)
    return { error: 'not_found' }
  }
}

export async function getAthleteEntries(): Promise<Score[]> {
  const { userId } = await auth()
  if (!userId) return []

  return db
    .select()
    .from(scores)
    .where(eq(scores.athleteId, userId))
    .orderBy(desc(scores.createdAt))
}

export async function getEntryById(id: string): Promise<Score | null> {
  const { userId } = await auth()
  if (!userId) return null

  const rows = await db
    .select()
    .from(scores)
    .where(and(eq(scores.id, id), eq(scores.athleteId, userId)))
    .limit(1)

  return rows[0] ?? null
}
