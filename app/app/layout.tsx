import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { SectionTabs } from "@/components/section-tabs";
import { loadIntelConfig } from "@/lib/intel/config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defence in depth — middleware also guards /app.
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name)")
    .limit(1)
    .maybeSingle();

  // White-label wordmark: the configured company name, else the workspace name.
  let workspaceName =
    (membership?.workspaces as { name?: string } | null)?.name ??
    "Sales Intelligence";
  if (membership?.workspace_id) {
    const config = await loadIntelConfig(membership.workspace_id as string);
    workspaceName = config.company_profile.company_name || workspaceName;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar email={user.email ?? ""} workspaceName={workspaceName} />
      <main className="flex-1 overflow-y-auto">
        <SectionTabs />
        {children}
      </main>
    </div>
  );
}
