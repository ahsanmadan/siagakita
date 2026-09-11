import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BriefTone = "critical" | "warning" | "teal" | "neutral";

export type OperationalBriefItem = {
  label: string;
  value: string;
  detail: string;
  tone?: BriefTone;
  icon?: LucideIcon;
};

const toneClass: Record<BriefTone, string> = {
  critical: "border-status-critical/30 bg-status-critical/10 text-[var(--color-critical-deep)]",
  warning: "border-status-warning/40 bg-status-warning/15 text-[var(--color-ink)]",
  teal: "border-primary/15 bg-secondary text-[var(--color-teal)]",
  neutral: "border-border bg-background/70 text-muted-foreground",
};

const defaultIcons: Record<BriefTone, LucideIcon> = {
  critical: AlertTriangle,
  warning: CircleDot,
  teal: CheckCircle2,
  neutral: CircleDot,
};

export function OperationalBrief({
  title = "Status operasional",
  items,
  className,
}: {
  title?: string;
  items: OperationalBriefItem[];
  className?: string;
}) {
  return (
    <Card className={cn("operational-surface py-0 shadow-none", className)}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-display text-sm font-semibold">{title}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Berdasarkan data yang tersimpan</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const tone = item.tone ?? "neutral";
            const Icon = item.icon ?? defaultIcons[tone];

            return (
              <div key={item.label} className="min-w-0 rounded-xl border bg-background/60 p-3">
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", toneClass[tone])}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-5">{item.value}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
