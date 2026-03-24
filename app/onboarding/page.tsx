import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { saveAthleteName } from "@/lib/actions/onboarding";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  if (user?.publicMetadata?.name) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to Kova
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your full name. It will appear on your recorded videos.
          </p>
        </div>

        <form action={saveAthleteName} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-zinc-300">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="e.g. Alex Johnson"
              required
              autoFocus
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-white px-4 py-3 text-base font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
