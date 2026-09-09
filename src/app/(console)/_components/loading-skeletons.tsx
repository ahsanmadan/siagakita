import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  withAction = true,
  className,
}: {
  readonly withAction?: boolean;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-9 w-40 shrink-0 rounded-md" />}
    </div>
  );
}

export function KpiCardsSkeleton({ count = 4 }: { readonly count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="shadow-xs">
          <CardHeader>
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-4 w-36 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-44 max-w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ToolbarSkeleton({ filters = 3 }: { readonly filters?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-9 w-full max-w-72 rounded-md" />
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: filters }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function TabsSkeleton({ tabs = 3 }: { readonly tabs?: number }) {
  return (
    <div className="flex h-9 w-fit max-w-full items-center gap-1 rounded-lg bg-muted/60 p-1">
      {Array.from({ length: tabs }).map((_, index) => (
        <Skeleton key={index} className="h-7 w-28 rounded-md" />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  title = true,
}: {
  readonly rows?: number;
  readonly columns?: number;
  readonly title?: boolean;
}) {
  return (
    <Card className="overflow-hidden shadow-xs">
      {title && (
        <CardHeader className="py-4">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="flex items-center gap-4 border-y bg-muted/40 px-5 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className={cn("h-3.5 flex-1", index === 0 && "flex-[1.6]")} />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className={cn("flex-1 space-y-2", colIndex === 0 && "flex-[1.6]")}>
                  <Skeleton className="h-4 w-full" />
                  {colIndex === 0 && <Skeleton className="h-3 w-2/3" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SidePanelSkeleton({
  rows = 4,
  className,
}: {
  readonly rows?: number;
  readonly className?: string;
}) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHeader className="py-4">
        <Skeleton className="h-5 w-44 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
