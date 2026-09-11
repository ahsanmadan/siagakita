import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OperationalCard({
  children,
  className,
  emphasis = "default",
  density = "comfortable",
}: {
  children: ReactNode;
  className?: string;
  emphasis?: "default" | "critical" | "map";
  density?: "comfortable" | "compact";
}) {
  return (
    <Card
      className={cn(
        "bg-card text-card-foreground shadow-xs border",
        emphasis === "critical" && "border-destructive/30",
        emphasis === "map" && "overflow-clip border-border/55 bg-card/85",
        density === "compact" && "rounded-[var(--radius-md)]",
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
  label = "Prioritas aktif",
  icon: Icon = RadioTower,
  tone = "critical",
}: {
  title: string;
  detail: string;
  meta: string;
  action?: ReactNode;
  label?: string;
  icon?: LucideIcon;
  tone?: "critical" | "warning" | "info" | "safe";
}) {
  const toneClass = {
    critical: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20",
    info: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20",
    safe: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  }[tone];
  const dotClass = {
    critical: "bg-red-600 dark:bg-red-400",
    warning: "bg-amber-600 dark:bg-amber-400",
    info: "bg-blue-600 dark:bg-blue-400",
    safe: "bg-emerald-600 dark:bg-emerald-400",
  }[tone];

  return (
    <section className="command-strip flex min-w-0 flex-col gap-4 rounded-[var(--radius-lg)] border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", toneClass)}>
          <Icon className="size-5" aria-hidden="true" />
          <span className={cn("absolute right-1 top-1 size-2 rounded-full ring-2 ring-card", dotClass)} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <Badge variant="outline" className={toneClass}>{label}</Badge>
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

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p> : null}
        <h2 className="font-heading mt-1 text-base font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{action}</div> : null}
    </div>
  );
}

export function StatusStrip({
  items,
  className,
}: {
  items: Array<{
    label: string;
    value: string;
    detail?: string;
    tone?: "critical" | "warning" | "info" | "safe" | "neutral";
  }>;
  className?: string;
}) {
  const tones = {
    critical: "border-status-critical/24 bg-status-critical/8",
    warning: "border-status-warning/32 bg-status-warning/10",
    info: "border-status-info/24 bg-status-info/8",
    safe: "border-status-safe/24 bg-status-safe/8",
    neutral: "border-border/70 bg-background/52",
  };

  return (
    <section className={cn("grid gap-2 rounded-[var(--radius-lg)] border bg-card/70 p-2 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className={cn("rounded-xl border px-3 py-2.5", tones[item.tone ?? "neutral"])}>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
          <p className="data-number mt-1 text-lg font-semibold">{item.value}</p>
          {item.detail ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.detail}</p> : null}
        </div>
      ))}
    </section>
  );
}

export function FilterChipGroup<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<{ value: T; label: string; count?: number; icon?: LucideIcon }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;
        return (
          <Button
            key={item.value}
            type="button"
            variant={active ? "default" : "outline"}
            className={cn("h-9 shrink-0 rounded-full px-3 text-xs font-semibold", active ? "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]" : "bg-card/80")}
            onClick={() => onChange(item.value)}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {item.label}
            {typeof item.count === "number" ? <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[0.68rem]", active ? "bg-white/16 text-white" : "bg-muted text-muted-foreground")}>{item.count}</span> : null}
          </Button>
        );
      })}
    </div>
  );
}

export function EmptyStatePanel({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-dashed bg-muted/35 p-5 text-center", className)}>
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-secondary text-[var(--color-teal)]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
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
