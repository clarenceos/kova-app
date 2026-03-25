import { JudgeSetupForm } from '@/components/judge/JudgeSetupForm'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'

export default function JudgePage() {
  return (
    <div className="min-h-screen bg-forge-black">
      <GlobalHeader />
      <main className="pb-20">
        <JudgeSetupForm />
      </main>
      <BottomNav />
    </div>
  )
}
