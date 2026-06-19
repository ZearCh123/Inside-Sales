import {
  FileText,
  Crosshair,
  Scale,
  Table2,
  Radar,
  PhoneCall,
  GraduationCap,
  LayoutDashboard,
  Database,
  Upload,
  Home,
  KanbanSquare,
  Inbox,
  Calendar,
  Send,
  LineChart,
  Headset,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Render with an accent colour (a different type of market intelligence). */
  accent?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

/** Grouped left navigation. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "market",
    title: "Market Intelligence",
    icon: LineChart,
    items: [
      { href: "/app/market", label: "Executive summary", icon: FileText },
      { href: "/app/market/competitor", label: "Competitor", icon: Crosshair },
      {
        href: "/app/market/regulatory",
        label: "Market trends & regulatory",
        icon: Scale,
      },
      { href: "/app/market/findings", label: "Findings tracker", icon: Table2 },
      { href: "/app/radar", label: "Leads Radar", icon: Radar, accent: true },
    ],
  },
  {
    id: "calling",
    title: "Customer Calling",
    icon: Headset,
    items: [
      { href: "/app/agent", label: "Live call agent", icon: PhoneCall },
      { href: "/app/coach", label: "Sales Coach", icon: GraduationCap },
      { href: "/app/dashboard", label: "My dashboard", icon: LayoutDashboard },
      { href: "/app/rag", label: "RAG Database", icon: Database },
      { href: "/app/rag-ingestion", label: "RAG Ingestion", icon: Upload },
    ],
  },
  {
    id: "other",
    title: "Other",
    icon: LayoutGrid,
    items: [
      { href: "/app", label: "Overview", icon: Home },
      { href: "/app/projects", label: "Projects", icon: KanbanSquare },
      { href: "/app/inbox", label: "Inbox", icon: Inbox },
      { href: "/app/calendar", label: "Calendar", icon: Calendar },
      { href: "/app/outreach", label: "Outreach flows", icon: Send },
    ],
  },
];

/** Flat list of all nav items (used to find the best path match). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Returns the href of the most specific nav item matching the path. */
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ALL_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

/** Returns the nav group that owns the given path (for the in-page tab bar). */
export function activeGroup(pathname: string): NavGroup | null {
  const href = activeHref(pathname);
  if (!href) return null;
  return NAV_GROUPS.find((g) => g.items.some((i) => i.href === href)) ?? null;
}
