import {
  KpiCardsSkeleton,
  PageHeaderSkeleton,
  TabsSkeleton,
} from "@/app/(console)/_components/loading-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogistikLoading() {
  return (
    <div className="@container/main flex animate-in flex-col gap-6 fade-in duration-150 ease-out">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton />

      {/* Rekomendasi Alokasi AI */}
      <Card className="border-primary/20 bg-primary/[0.03] shadow-xs dark:bg-primary/[0.06]">
        <CardHeader className="py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-60 max-w-full" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-lg border bg-background/60 p-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <TabsSkeleton tabs={3} />

        {/* Kartu konvoi distribusi */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-5 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
