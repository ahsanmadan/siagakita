import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "brand",
  meta,
  className,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "brand" | "critical" | "teal" | "warning" | "neutral";
  meta?: string;
  className?: string;
}) {
  const tones = {
    brand: "bg-primary/10 text-primary",
    critical: "bg-status-critical/12 text-[var(--color-critical-deep)]",
    teal: "bg-secondary text-[var(--color-teal)]",
    warning: "bg-status-warning/16 text-[var(--color-ink)]",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <Card className={cn("operational-surface group relative overflow-hidden py-0 shadow-none", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", {
        "bg-primary": tone === "brand",
        "bg-status-critical": tone === "critical",
        "bg-[var(--color-teal)]": tone === "teal",
        "bg-status-warning": tone === "warning",
        "bg-border": tone === "neutral",
      })} />
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {meta ? <span className="rounded-full bg-muted px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">{meta}</span> : null}
          </div>
          <p className="data-number font-kpi mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
