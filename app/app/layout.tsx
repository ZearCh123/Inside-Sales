import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";

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

  // Workspace name drives the (white-label) wordmark in the sidebar.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspaces(name)")
    .limit(1)
    .maybeSingle();
  const workspaceName =
    (membership?.workspaces as { name?: string } | null)?.name ??
    "Sales Intelligence";

  return (
    <div className="flex min-h-screen">
      <AppSidebar email={user.email ?? ""} workspaceName={workspaceName} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
