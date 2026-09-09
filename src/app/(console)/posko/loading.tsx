import {
  KpiCardsSkeleton,
  PageHeaderSkeleton,
  SidePanelSkeleton,
  TableSkeleton,
} from "@/app/(console)/_components/loading-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PoskoLoading() {
  return (
    <div className="@container/main flex animate-in flex-col gap-6 fade-in duration-150 ease-out">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton />

      {/* Form cepat update kapasitas & kebutuhan */}
      <Card className="shadow-xs">
        <CardHeader className="py-4">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 pb-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <Skeleton className="h-4 w-40" />
              <div className="grid gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="grid gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Grid utama: daftar posko + rekomendasi kapasitas */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.6fr)]">
        <TableSkeleton rows={7} columns={4} />
        <SidePanelSkeleton rows={4} />
      </div>

      {/* Kesenjangan kebutuhan logistik lintas posko */}
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
