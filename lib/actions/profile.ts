'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles, type Profile } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const VALID_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const
const VALID_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite', 'prefer_not_to_say'] as const

export async function getProfile(userId?: string): Promise<Profile | null> {
  const id = userId ?? (await auth()).userId
  if (!id) return null

  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, id))
    .limit(1)

  return rows[0] ?? null
}

export async function upsertProfile(input: {
  name: string
  gender: string
  bodyWeightKg?: number | null
  experienceLevel: string
  onboardingComplete?: boolean
}): Promise<{ success: true } | { error: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'Unauthorized' }

    if (!input.name?.trim()) return { error: 'Name is required' }
    if (!VALID_GENDERS.includes(input.gender as typeof VALID_GENDERS[number])) {
      return { error: 'Invalid gender' }
    }
    if (!VALID_EXPERIENCE_LEVELS.includes(input.experienceLevel as typeof VALID_EXPERIENCE_LEVELS[number])) {
      return { error: 'Invalid experience level' }
    }
    if (input.bodyWeightKg != null && (input.bodyWeightKg <= 0 || input.bodyWeightKg > 250)) {
      return { error: 'Body weight must be between 1 and 250 kg' }
    }

    const now = new Date()
    const values = {
      userId,
      name: input.name.trim(),
      gender: input.gender,
      bodyWeightKg: input.bodyWeightKg ?? null,
      experienceLevel: input.experienceLevel,
      onboardingComplete: input.onboardingComplete ? 1 : 0,
      createdAt: now,
    }

    await db
      .insert(profiles)
      .values(values)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          name: values.name,
          gender: values.gender,
          bodyWeightKg: values.bodyWeightKg,
          experienceLevel: values.experienceLevel,
          onboardingComplete: values.onboardingComplete,
        },
      })

    // Keep Clerk publicMetadata.name in sync
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { name: values.name },
    })

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[upsertProfile] Failed:', error)
    return { error: 'Failed to save profile' }
  }
}

export async function updateAvatar(base64: string): Promise<{ success: true } | { error: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'Unauthorized' }

    if (!base64.startsWith('data:image/')) {
      return { error: 'Invalid image format' }
    }
    if (base64.length > 500_000) {
      return { error: 'Image too large. Please use a smaller photo.' }
    }

    await db
      .update(profiles)
      .set({ avatarUrl: base64 })
      .where(eq(profiles.userId, userId))

    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.error('[updateAvatar] Failed:', error)
    return { error: 'Failed to save avatar' }
  }
}

export async function ensureProfile(): Promise<Profile | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    // Check if profile already exists
    const existing = await getProfile(userId)
    if (existing) return existing

    // No profile row — check if Clerk has a name (existing user)
    const user = await currentUser()
    const clerkName = user?.publicMetadata?.name as string | undefined

    if (clerkName?.trim()) {
      // Auto-create profile for existing user with defaults
      const now = new Date()
      await db.insert(profiles).values({
        userId,
        name: clerkName.trim(),
        gender: 'prefer_not_to_say',
        experienceLevel: 'prefer_not_to_say',
        onboardingComplete: 1,
        createdAt: now,
      })

      return await getProfile(userId)
    }

    // No profile, no Clerk name — needs onboarding
    return null
  } catch (error) {
    console.error('[ensureProfile] Failed:', error)
    return null
  }
}
