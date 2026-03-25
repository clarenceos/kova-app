"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function saveAthleteName(formData: FormData): Promise<{ error: string } | void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const fullName = formData.get("fullName");
  if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
    return { error: "Name is required" };
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { name: fullName.trim() },
  });

  redirect("/dashboard");
}
