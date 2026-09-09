import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Timeline({
  items,
  className,
}: {
  items: Array<{ time: string; title: string; detail: string; meta?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {items.map((item) => (
        <div
          key={`${item.time}-${item.title}`}
          className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4 hover:bg-muted/15 transition-colors"
        >
          {/* Stage Chip / Badge */}
          <div className="w-28 shrink-0 sm:pt-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border/70">
              {item.time}
            </span>
          </div>

          {/* Indicator Dot + Content via Clean Flex Flow */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="mt-1.5 size-2 rounded-full bg-primary shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                {item.meta}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
