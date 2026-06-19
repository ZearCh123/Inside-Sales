"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { seedJuneIntel } from "@/lib/intel/seed-june";

/** Seeds the June 2026 report for the current user's workspace. */
export async function seedJuneData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/app");

  await seedJuneIntel(membership.workspace_id as string, user.id);
  revalidatePath("/app/market");
}
