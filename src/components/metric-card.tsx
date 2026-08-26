import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "brand" | "critical" | "teal" | "warning";
}) {
  const tones = {
    brand: "bg-primary/10 text-primary",
    critical: "bg-status-critical/12 text-[var(--color-critical-deep)]",
    teal: "bg-secondary text-[var(--color-teal)]",
    warning: "bg-status-warning/16 text-[var(--color-ink)]",
  };

  return (
    <Card className="operational-surface group relative overflow-hidden py-0 shadow-none">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", {
        "bg-primary": tone === "brand",
        "bg-status-critical": tone === "critical",
        "bg-[var(--color-teal)]": tone === "teal",
        "bg-status-warning": tone === "warning",
      })} />
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="data-number mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
