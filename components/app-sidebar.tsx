"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/app/actions";
import { LogOut } from "lucide-react";

export function AppSidebar({
  email,
  workspaceName,
}: {
  email: string;
  workspaceName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-brand-ink text-brand-paper">
      <div className="px-6 py-5">
        <p className="font-display text-lg font-bold tracking-tight text-brand-paper">
          {workspaceName}
        </p>
        <p className="text-xs text-brand-paper/50">Sales Intelligence</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {MODULES.map((m) => {
          const active =
            m.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(m.href);
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-crimson text-brand-paper"
                  : "text-brand-paper/70 hover:bg-white/5 hover:text-brand-paper",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{m.label}</span>
            </Link>
          );
        })}
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
