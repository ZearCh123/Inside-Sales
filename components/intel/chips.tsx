import { CHIP } from "@/lib/intel/format";

/** A coloured pill matching the design prototype's chip styles. */
export function Chip({
  variant,
  children,
}: {
  variant: keyof typeof CHIP;
  children: React.ReactNode;
}) {
  const c = CHIP[variant];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}
