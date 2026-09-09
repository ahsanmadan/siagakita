import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiCardsSkeleton } from "@/app/(console)/_components/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="@container/main flex animate-in flex-col gap-4 fade-in duration-150 ease-out md:gap-6">
      <KpiCardsSkeleton />

      <Card className="@container/card shadow-xs">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-80 w-full items-end gap-2 rounded-lg border bg-muted/20 p-4">
            {[42, 68, 55, 82, 60, 74, 48, 90, 66, 58, 78, 52].map((height, index) => (
              <Skeleton key={index} className="w-full rounded-t-md" style={{ height: `${height}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-xs">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 border-y bg-muted/40 px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-3.5 flex-1" />
            ))}
          </div>
          <div className="divide-y">
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-4 px-4 py-4">
                <div className="flex flex-1 items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
