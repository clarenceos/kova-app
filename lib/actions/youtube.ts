'use server'

import { clerkClient, auth } from '@clerk/nextjs/server'

export async function getYouTubeToken(): Promise<{ token: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const client = await clerkClient()
    const tokens = await client.users.getUserOauthAccessToken(userId, 'oauth_google')

    if (!tokens.data || tokens.data.length === 0) {
      return { error: 'google_not_connected' }
    }

    return { token: tokens.data[0].token }
  } catch (err) {
    console.error('[getYouTubeToken] Failed:', err)
    return { error: 'Failed to retrieve Google token' }
  }
}
