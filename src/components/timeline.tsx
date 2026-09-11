import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Timeline({
  items,
  className,
}: {
  items: Array<{
    time: string;
    title: string;
    detail: string;
    status?: "selesai" | "berjalan" | "perlu-aksi";
    nextAction?: string;
    meta?: ReactNode;
  }>;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/15 sm:flex-row sm:items-start sm:gap-4">
          <div className="w-28 shrink-0 sm:pt-0.5">
            <span className="inline-flex items-center rounded border border-border/70 bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {item.time}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {item.status ? (
                    <span className={cn(
                      "inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium",
                      item.status === "selesai" && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                      item.status === "berjalan" && "border-blue-500/50 text-blue-700 dark:text-blue-400",
                      item.status === "perlu-aksi" && "border-amber-500/60 text-amber-700 dark:text-amber-400",
                    )}>
                      {item.status === "selesai" ? "Selesai" : item.status === "berjalan" ? "Berjalan" : "Perlu tindak lanjut"}
                    </span>
                  ) : null}
                  {item.meta}
                </div>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              {item.nextAction ? <p className="mt-2 text-xs leading-5 text-foreground"><span className="font-semibold">Tindak lanjut:</span> {item.nextAction}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
