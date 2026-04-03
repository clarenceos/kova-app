import { getCompetitions, getCompetitionDashboard } from '@/lib/actions/dashboard'
import { DashboardClient } from './_components/DashboardClient'

interface OrganizerPageProps {
  searchParams: Promise<{ compId?: string }>
}

export default async function OrganizerPage({ searchParams }: OrganizerPageProps) {
  const params = await searchParams
  const compId = params?.compId ?? null

  const allCompetitions = await getCompetitions()

  let dashboardData: Awaited<ReturnType<typeof getCompetitionDashboard>> | null = null
  if (compId) {
    const result = await getCompetitionDashboard(compId)
    dashboardData = result
  }

  // Normalize dashboardData: if error, treat as null (no competition selected)
  const resolvedDashboard =
    dashboardData && !('error' in dashboardData) ? dashboardData : null

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Page title */}
        <h1 className="mb-8 text-2xl font-bold text-parchment">Your Competitions</h1>

        <DashboardClient
          competitions={allCompetitions}
          selectedCompId={compId}
          dashboardData={resolvedDashboard}
        />
      </div>
    </div>
  )
}
