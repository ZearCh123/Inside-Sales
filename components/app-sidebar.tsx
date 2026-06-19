"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, ALL_NAV_ITEMS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/app/actions";
import { LogOut } from "lucide-react";

/** Returns the href of the most specific nav item matching the current path. */
function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ALL_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

export function AppSidebar({
  email,
  workspaceName,
}: {
  email: string;
  workspaceName: string;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-brand-ink text-brand-paper">
      <div className="px-6 py-5">
        <p className="font-display text-lg font-bold tracking-tight text-brand-paper">
          {workspaceName}
        </p>
        <p className="text-xs text-brand-paper/50">Sales Intelligence</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-paper/40">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? item.accent
                          ? "bg-brand-tail text-white"
                          : "bg-brand-crimson text-brand-paper"
                        : item.accent
                          ? "text-brand-tail/90 hover:bg-white/5"
                          : "text-brand-paper/70 hover:bg-white/5 hover:text-brand-paper",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <p className="truncate px-3 pb-2 text-xs text-brand-paper/50">{email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-brand-paper/70 transition-colors hover:bg-white/5 hover:text-brand-paper"
          >
            <LogOut className="size-4 shrink-0" />
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
