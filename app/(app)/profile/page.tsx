import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/actions/profile'
import { getAthleteEntries } from '@/lib/actions/entries'
import { ProfileClient } from '@/components/profile/ProfileClient'
import { SignOutButton } from '@/components/profile/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, entries, user] = await Promise.all([
    getProfile(userId),
    getAthleteEntries(),
    currentUser(),
  ])

  if (!profile) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-forge-black px-4 py-8 pb-24">
      <div className="mx-auto w-full max-w-3xl">
        <ProfileClient
          profile={profile}
          clerkImageUrl={user?.imageUrl}
          entries={entries}
          memberSince={profile.createdAt}
        />

        <div className="mt-12 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
