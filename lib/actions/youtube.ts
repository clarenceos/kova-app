'use server'

import { clerkClient, auth } from '@clerk/nextjs/server'

export async function getYouTubeToken(): Promise<{ token: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const client = await clerkClient()
    const tokenList = await client.users.getUserOauthAccessToken(userId, 'oauth_google')

    const token = tokenList.data?.[0]?.token ?? tokenList[0]?.token
    if (!token) {
      return { error: 'google_not_connected' }
    }

    return { token }
  } catch (error) {
    console.error('[getYouTubeToken] Full error:', JSON.stringify(error, null, 2))
    return { error: 'Failed to retrieve Google token' }
  }
}
