import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalHeader />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  )
}
