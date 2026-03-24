import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const name = user?.publicMetadata?.name as string | undefined;

  if (!name) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10">
          <p className="text-sm text-zinc-500">Signed in as</p>
          <h1 className="mt-0.5 text-xl font-bold text-white">{name}</h1>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/record"
            className="flex flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-600 active:bg-zinc-800"
          >
            <span className="text-2xl">🏋️</span>
            <span className="mt-2 text-lg font-semibold text-white">Record a Lift</span>
            <span className="text-sm text-zinc-400">
              Record your set with authenticated overlays
            </span>
          </Link>

          <Link
            href="/judge"
            className="flex flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-600 active:bg-zinc-800"
          >
            <span className="text-2xl">✅</span>
            <span className="mt-2 text-lg font-semibold text-white">Judge a Lift</span>
            <span className="text-sm text-zinc-400">
              Count reps and submit a score
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
