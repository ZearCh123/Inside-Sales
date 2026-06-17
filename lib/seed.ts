import { createAdminClient } from "@/lib/supabase/admin";

export type SeedResult = {
  workspaceId: string;
  created: boolean;
};

/**
 * Seeds the initial 'Chromologics' workspace and makes the given user its owner.
 *
 * Idempotent: if the workspace (slug 'chromologics') already exists, the user is
 * still ensured to be an owner. Uses the service-role client because there is no
 * data to read under RLS yet (the user has no workspace membership). It sets
 * workspace_id + owner_id explicitly, per the platform security rules.
 */
export async function seedChromologics(
  userId: string,
  fullName: string | null,
): Promise<SeedResult> {
  const admin = createAdminClient();

  // 1. Ensure a profile row exists (schema has no auto-create trigger).
  await admin
    .from("profiles")
    .upsert({ id: userId, full_name: fullName }, { onConflict: "id" });

  // 2. Ensure the Chromologics workspace exists (slug is unique).
  let created = false;
  const { data: existing } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "chromologics")
    .maybeSingle();

  let workspaceId = existing?.id as string | undefined;

  if (!workspaceId) {
    const { data: inserted, error } = await admin
      .from("workspaces")
      .insert({ name: "Chromologics", slug: "chromologics", plan: "standard" })
      .select("id")
      .single();
    if (error) throw error;
    workspaceId = inserted.id;
    created = true;
  }

  // 3. Make the user an owner of the workspace (idempotent on workspace+user).
  await admin.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
      team_visibility: true,
    },
    { onConflict: "workspace_id,user_id" },
  );

  // 4. Set the user's default workspace.
  await admin
    .from("profiles")
    .update({ default_workspace_id: workspaceId })
    .eq("id", userId);

  return { workspaceId: workspaceId!, created };
}
