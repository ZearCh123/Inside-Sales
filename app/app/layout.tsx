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

  return (
    <div className="flex min-h-screen">
      <AppSidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
