import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { JudgeSessionProvider } from '@/lib/judge-context'

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.publicMetadata?.name as string | undefined

  if (!name) redirect('/onboarding')

  return <JudgeSessionProvider>{children}</JudgeSessionProvider>
}
