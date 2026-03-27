import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Video, ClipboardCheck, BarChart2 } from "lucide-react";
import { getProfile } from "@/lib/actions/profile";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getProfile(userId);
  const name = profile?.name;

  return (
    <div className="flex min-h-screen flex-col bg-forge-black px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        {/* Greeting */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-raw-steel">Athlete</p>
          <h1 className="mt-1 text-2xl font-bold text-parchment">{name}</h1>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-4">
          <Link
            href="/record"
            className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-raw-steel/20 bg-charcoal p-6 transition-all hover:border-patina-bronze/40 active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forge-black to-transparent" />
            <Video className="h-7 w-7 text-patina-bronze" />
            <span className="mt-2 text-lg font-bold text-parchment">Record a Lift</span>
            <span className="text-sm text-raw-steel">
              Record your set with authenticated overlays
            </span>
          </Link>

          <Link
            href="/judge"
            className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-raw-steel/20 bg-charcoal p-6 transition-all hover:border-patina-bronze/40 active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forge-black to-transparent" />
            <ClipboardCheck className="h-7 w-7 text-patina-bronze" />
            <span className="mt-2 text-lg font-bold text-parchment">Judge a Lift</span>
            <span className="text-sm text-raw-steel">
              Count reps and submit a score
            </span>
          </Link>

          <Link
            href="/leaderboard"
            className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-raw-steel/20 bg-charcoal p-6 transition-all hover:border-patina-bronze/40 active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forge-black to-transparent" />
            <BarChart2 className="h-7 w-7 text-patina-bronze" />
            <span className="mt-2 text-lg font-bold text-parchment">Leaderboard</span>
            <span className="text-sm text-raw-steel">
              View all submitted scores
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
