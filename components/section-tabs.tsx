"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeGroup, activeHref } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** Horizontal tab bar for the active section's subtabs (top of the page). */
export function SectionTabs() {
  const pathname = usePathname();
  if (pathname.includes("/print")) return null;
  const group = activeGroup(pathname);
  if (!group) return null;
  const active = activeHref(pathname);

  return (
    <div className="border-b border-border bg-background px-6 print:hidden">
      <nav className="-mb-px flex flex-wrap gap-1">
        {group.items.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors",
                isActive
                  ? item.accent
                    ? "border-brand-tail font-medium text-brand-tail"
                    : "border-brand-crimson font-medium text-foreground"
                  : item.accent
                    ? "border-transparent text-brand-tail/80 hover:text-brand-tail"
                    : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
