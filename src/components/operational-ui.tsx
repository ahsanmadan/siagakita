import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OperationalCard({
  children,
  className,
  emphasis = "default",
}: {
  children: ReactNode;
  className?: string;
  emphasis?: "default" | "critical" | "map";
}) {
  return (
    <Card
      className={cn(
        "operational-surface py-0 shadow-none",
        emphasis === "critical" && "border-status-critical/25",
        emphasis === "map" && "overflow-clip border-white/55 bg-card/82",
        className,
      )}
    >
      {children}
    </Card>
  );
}
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("metric-strip grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</section>;
}

export function CommandStrip({
  title,
  detail,
  meta,
  action,
}: {
  title: string;
  detail: string;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <section className="command-strip flex min-w-0 flex-col gap-4 rounded-[var(--radius-lg)] border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-status-critical/12 text-[var(--color-critical-deep)]">
          <RadioTower className="size-5" aria-hidden="true" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-status-critical ring-2 ring-card" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <Badge variant="outline" className="border-status-critical/25 bg-status-critical/10 text-[var(--color-critical-deep)]">Prioritas aktif</Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:ml-auto">
        <span className="text-xs font-medium text-muted-foreground">{meta}</span>
        {action}
      </div>
    </section>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("filter-bar flex min-w-0 flex-col gap-3 rounded-xl border bg-card/72 p-3 sm:flex-row sm:items-center", className)}>{children}</div>;
}

export function MapOverlay({
  icon: Icon,
  eyebrow,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("map-overlay absolute inset-x-3 bottom-3 z-10 rounded-2xl border p-4 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[21rem]", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
          <p className="mt-1 text-sm font-semibold leading-5">{title}</p>
          {children ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{children}</div> : null}
        </div>
      </div>
    </aside>
  );
}
