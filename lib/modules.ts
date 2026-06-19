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
  title: string;
  items: NavItem[];
};

/** Grouped left navigation. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Market Intelligence",
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
    title: "Customer Calling",
    items: [
      { href: "/app/agent", label: "Live call agent", icon: PhoneCall },
      { href: "/app/coach", label: "Sales Coach", icon: GraduationCap },
      { href: "/app/dashboard", label: "My dashboard", icon: LayoutDashboard },
      { href: "/app/rag", label: "RAG Database", icon: Database },
      { href: "/app/rag-ingestion", label: "RAG Ingestion", icon: Upload },
    ],
  },
  {
    title: "Other",
    items: [
      { href: "/app", label: "Overview", icon: Home },
      { href: "/app/projects", label: "Projects", icon: KanbanSquare },
      { href: "/app/inbox", label: "Inbox", icon: Inbox },
      { href: "/app/calendar", label: "Calendar", icon: Calendar },
      { href: "/app/outreach", label: "Outreach flows", icon: Send },
    ],
  },
];

/** Flat list of all nav hrefs + labels (used for finding the active item). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
