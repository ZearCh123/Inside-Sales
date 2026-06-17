import {
  LayoutDashboard,
  LineChart,
  Radar,
  KanbanSquare,
  Headphones,
  GraduationCap,
  Inbox,
  Calendar,
  Send,
  type LucideIcon,
} from "lucide-react";

export type AppModule = {
  /** Route segment under /app */
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roadmap phase that builds this module (for context) */
  phase: number;
};

/**
 * The 9 modules shown in the left navigation. Order matches docs/00_START_HER.md.
 * Only Overview (the index) is built so far — the rest are placeholders.
 */
export const MODULES: AppModule[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, phase: 2 },
  { href: "/app/monthly", label: "Monthly assessment", icon: LineChart, phase: 1 },
  { href: "/app/radar", label: "Leads Radar", icon: Radar, phase: 4 },
  { href: "/app/projects", label: "Projects", icon: KanbanSquare, phase: 2 },
  { href: "/app/agent", label: "Sales Agent", icon: Headphones, phase: 3 },
  { href: "/app/coach", label: "Sales Coach", icon: GraduationCap, phase: 3 },
  { href: "/app/inbox", label: "Inbox", icon: Inbox, phase: 5 },
  { href: "/app/calendar", label: "Calendar", icon: Calendar, phase: 5 },
  { href: "/app/outreach", label: "Outreach flows", icon: Send, phase: 4 },
];
