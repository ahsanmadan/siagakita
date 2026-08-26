"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export type ReportTrendPoint = {
  time: string;
  reports: number;
};

const config = { reports: { label: "Laporan", color: "var(--color-brand)" } } satisfies ChartConfig;

export function DashboardTrend({ data }: { data: ReportTrendPoint[] }) {
  const hasReports = data.some((point) => point.reports > 0);

  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="h-32 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-rule)" />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area dataKey="reports" type="monotone" fill="url(#reportFill)" stroke="var(--color-brand)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
      <p className="text-[11px] leading-5 text-muted-foreground">
        {hasReports ? "Dihitung dari waktu laporan yang tersimpan di database." : "Belum ada laporan dalam rentang enam jam terakhir."}
      </p>
    </div>
  );
}
