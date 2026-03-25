"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAthleteName } from "@/lib/actions/onboarding";
import { KovaWordmark } from "@/components/ui/KovaWordmark";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveAthleteName(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
    // on success, the server action redirects to /dashboard
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-forge-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <KovaWordmark height={36} className="text-parchment" />
          <p className="mt-4 text-center text-sm text-raw-steel">
            Enter your name to begin.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-raw-steel">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="e.g. Alex Johnson"
              autoFocus
              className="rounded-lg border border-raw-steel/40 bg-charcoal px-4 py-3 text-base text-parchment placeholder:text-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors"
            />
            {error && (
              <p className="text-sm text-raw-steel">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-patina-bronze px-4 py-3 text-base font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
