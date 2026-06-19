"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parses the competitor textarea ("Navn | segment | land | prioritet" per line). */
function parseCompetitors(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, segment, country, priority] = line
        .split("|")
        .map((p) => p.trim());
      return {
        name,
        segment: segment || undefined,
        country: country || undefined,
        priority: priority || undefined,
      };
    })
    .filter((c) => c.name);
}

/** Saves the workspace's Market Intelligence scan configuration (admins only). */
export async function saveIntelConfig(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/app/market");

  const competitors = parseCompetitors(
    String(formData.get("competitors") ?? ""),
  );
  const categories = formData.getAll("categories").map(String);
  const promptOverrides = String(formData.get("prompt_overrides") ?? "").trim();

  const { error } = await supabase.from("intel_config").upsert(
    {
      workspace_id: membership.workspace_id,
      competitors,
      priority_set: splitList(String(formData.get("priority_set") ?? "")),
      categories: categories.length ? categories : ["competitor", "market", "regulatory", "ip"],
      target_products: splitList(String(formData.get("target_products") ?? "")),
      regions: splitList(String(formData.get("regions") ?? "")),
      sources: splitList(String(formData.get("sources") ?? "")),
      prompt_overrides: promptOverrides || null,
    },
    { onConflict: "workspace_id" },
  );

  if (error) {
    redirect(`/app/settings/intelligence?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/settings/intelligence");
  redirect("/app/settings/intelligence?saved=1");
}
