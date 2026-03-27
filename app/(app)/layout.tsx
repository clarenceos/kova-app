import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'
import { OnboardingModal } from '@/components/profile/OnboardingModal'
import { ensureProfile } from '@/lib/actions/profile'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await ensureProfile()
  const showOnboarding = !profile || !profile.onboardingComplete

  const user = showOnboarding ? await currentUser() : null
  const clerkName = (user?.publicMetadata?.name as string) ?? undefined

  return (
    <>
      <GlobalHeader />
      <main className="pb-20">{children}</main>
      <BottomNav />
      {showOnboarding && <OnboardingModal isOpen={true} clerkName={clerkName} />}
    </>
  )
}
