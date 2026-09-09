import {
  KpiCardsSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/app/(console)/_components/loading-skeletons";

export default function ConsoleLoading() {
  return (
    <div className="@container/main flex animate-in flex-col gap-6 fade-in duration-150 ease-out">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
