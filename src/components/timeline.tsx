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
    <div className={cn("divide-y", className)}>
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="grid gap-3 p-4 sm:grid-cols-[5.5rem_1fr]">
          <span className="data-number text-sm font-semibold text-primary">{item.time}</span>
          <div className="relative">
            <span className="absolute -left-6 top-1 hidden size-2 rounded-full bg-primary ring-4 ring-primary/12 sm:block" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.meta}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
