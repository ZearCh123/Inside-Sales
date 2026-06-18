import { createClient } from "@/lib/supabase/server";
import { createWorkspace } from "./actions";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Does the user belong to any workspace yet?
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .limit(1);

  const membership = memberships?.[0];

  if (!membership) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-xl font-bold text-foreground">
            Velkommen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Du er logget ind som {user?.email}, men er endnu ikke knyttet til et
            workspace. Opret dit workspace for at komme i gang.
          </p>
          <form action={createWorkspace} className="mt-6">
            <Button type="submit" className="w-full">
              Opret workspace
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Logget ind som {user?.email} · rolle: {membership.role}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.filter((m) => m.href !== "/app").map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.href}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-brand-crimson">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fase {m.phase}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
