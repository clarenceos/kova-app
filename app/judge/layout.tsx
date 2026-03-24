import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { JudgeSessionProvider } from '@/lib/judge-context'

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <JudgeSessionProvider>{children}</JudgeSessionProvider>
}
