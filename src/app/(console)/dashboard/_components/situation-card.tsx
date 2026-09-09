"use client";

import { useMemo, useState } from "react";
import { Activity, MapPinned } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { MapLegendDrawer } from "@/components/map-legend-drawer";
import { MapOverlay } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ReportTrendPoint } from "@/lib/dashboard-metrics";

const chartConfig = {
  kritis: { label: "Kritis & berat", color: "var(--color-critical)" },
  waspada: { label: "Waspada & aman", color: "var(--color-brand)" },
} satisfies ChartConfig;

const RANGE_OPTIONS = [
  { value: "90d", label: "90 hari terakhir", days: 90 },
  { value: "30d", label: "30 hari terakhir", days: 30 },
  { value: "7d", label: "7 hari terakhir", days: 7 },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

function rangeDays(value: RangeValue) {
  return RANGE_OPTIONS.find((option) => option.value === value)?.days ?? 90;
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function SituationCard({
  trend,
  points,
  activeEvents,
  isCoordinator,
}: {
  trend: ReportTrendPoint[];
  points: MapPoint[];
  activeEvents: number;
  isCoordinator: boolean;
}) {
  const isMobile = useIsMobile();
  const [selectedRange, setSelectedRange] = useState<RangeValue | null>(null);
  const [tab, setTab] = useState("tren");
  const [mapMounted, setMapMounted] = useState(false);
  const range = selectedRange ?? (isMobile ? "7d" : "90d");

  const setRange = (value: RangeValue) => setSelectedRange(value);

  const handleTabChange = (value: string) => {
    setTab(value);
    if (value === "peta") setMapMounted(true);
  };

  const filteredTrend = useMemo(() => trend.slice(-rangeDays(range)), [range, trend]);
  const totalReports = filteredTrend.reduce((total, point) => total + point.kritis + point.waspada, 0);
  const firstPoint = points[0];

  return (
    <Card className="operational-surface @container/card py-0 shadow-none">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <CardHeader className="gap-3 pt-5">
          <CardTitle className="text-base">Situasi operasional</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Tren laporan lapangan dari data tersimpan dan peta krisis untuk orientasi lokasi
            </span>
            <span className="@[540px]/card:hidden">Tren laporan dan peta krisis</span>
          </CardDescription>
          <CardAction className="flex flex-col items-end gap-2">
            <TabsList variant="line">
              <TabsTrigger value="tren">Tren</TabsTrigger>
              <TabsTrigger value="peta">Peta</TabsTrigger>
            </TabsList>
            {tab === "tren" ? (
              <>
                <ToggleGroup
                  type="single"
                  value={range}
                  onValueChange={(value) => value && setRange(value as RangeValue)}
                  variant="outline"
                  className="hidden @[767px]/card:flex"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <ToggleGroupItem key={option.value} value={option.value} className="px-3">
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Select value={range} onValueChange={(value) => setRange(value as RangeValue)}>
                  <SelectTrigger className="flex w-44 @[767px]/card:hidden" size="sm" aria-label="Pilih rentang waktu">
                    <SelectValue placeholder="90 hari terakhir" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      {RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="rounded-lg">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <MapLegendDrawer />
                <Badge variant="outline" className="hidden rounded-full sm:flex">
                  <Activity /> Data aktif
                </Badge>
              </div>
            )}
          </CardAction>
        </CardHeader>

        <TabsContent value="tren">
          <CardContent className="px-2 pb-5 pt-4 sm:px-6">
            {totalReports > 0 ? (
              <ChartContainer config={chartConfig} className="aspect-auto h-62 w-full">
                <AreaChart data={filteredTrend}>
                  <defs>
                    <linearGradient id="fillKritis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-kritis)" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="var(--color-kritis)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillWaspada" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-waspada)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="var(--color-waspada)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-rule)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={formatDay}
                  />
                  <ChartTooltip
                    cursor={false}
                    defaultIndex={isMobile ? -1 : undefined}
                    content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} indicator="dot" />}
                  />
                  <Area
                    dataKey="waspada"
                    type="natural"
                    fill="url(#fillWaspada)"
                    stroke="var(--color-waspada)"
                    stackId="a"
                  />
                  <Area
                    dataKey="kritis"
                    type="natural"
                    fill="url(#fillKritis)"
                    stroke="var(--color-kritis)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-62 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/35 px-6 text-center">
                <p className="font-semibold">Belum ada laporan pada rentang ini</p>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Grafik dihitung dari waktu laporan yang tersimpan di database. Perluas rentang waktu atau tunggu laporan
                  lapangan berikutnya.
                </p>
              </div>
            )}
            <p className="mt-3 px-2 text-xs text-muted-foreground sm:px-0">
              {totalReports} laporan pada {RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase()}.
            </p>
          </CardContent>
        </TabsContent>

        <TabsContent value="peta" forceMount className="data-[state=inactive]:hidden">
          <CardContent className="relative p-0">
            {mapMounted ? (
              <>
                <CrisisMap
                  points={points}
                  center={firstPoint ? [firstPoint.longitude, firstPoint.latitude] : undefined}
                  className="h-[26rem] rounded-none border-0 @[767px]/card:h-[32rem]"
                />
                <MapOverlay
                  icon={MapPinned}
                  eyebrow={isCoordinator ? "Command center" : "Operational context"}
                  title={isCoordinator ? "Fokus operasi kejadian aktif" : `${activeEvents} kejadian aktif`}
                >
                  {isCoordinator
                    ? "Marker insiden, posko, kebutuhan kritis, dan distribusi aktif menjadi pusat orientasi keputusan BPBD."
                    : "Crisis Situation Map membantu membaca lokasi kejadian dan posko tanpa membuka modul lain."}
                </MapOverlay>
              </>
            ) : (
              <div className="h-[26rem] @[767px]/card:h-[32rem]" />
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
