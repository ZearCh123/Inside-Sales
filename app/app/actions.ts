"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { seedChromologics } from "@/lib/seed";

/** Signs the current user out and returns to the login page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Creates the Chromologics workspace and makes the current user its owner. */
export async function createWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null;
  await seedChromologics(user.id, fullName);
  revalidatePath("/app");
}
