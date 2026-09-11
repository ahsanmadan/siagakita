import {
  KpiCardsSkeleton,
  PageHeaderSkeleton,
  SidePanelSkeleton,
  ToolbarSkeleton,
} from "@/app/(console)/_components/loading-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LaporanLoading() {
  return (
    <div className="@container/main flex animate-in flex-col gap-6 fade-in duration-150 ease-out">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Antrean triase laporan masuk */}
        <Card className="overflow-hidden shadow-xs">
          <CardHeader className="gap-3 py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-60 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <ToolbarSkeleton filters={3} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-4 border-y bg-muted/40 px-5 py-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-3.5 flex-1" />
              ))}
            </div>
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-[1.6] space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simulator SMS Zero-Grid */}
        <SidePanelSkeleton rows={3} />
      </div>

      {/* Alur pipeline verifikasi */}
      <Card className="shadow-xs">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-52 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
