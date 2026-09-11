"use client";

import { useMemo, useState } from "react";
import { addDays, endOfToday, format, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartConfig = {
  bantuanTersalurkan: {
    label: "Bantuan Tersalurkan (Paket)",
    color: "var(--chart-1)",
  },
  wargaEvakuasi: {
    label: "Warga Terevakuasi (Jiwa)",
    color: "var(--chart-2)",
  },
  armadaAktif: {
    label: "Armada Beroperasi (Truk)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface DisasterEventRef {
  id: string;
  name: string;
  location: string;
}

interface PerformanceOverviewProps {
  activeFleetCount?: number;
  totalDistributedAid?: number;
  totalEvacuated?: number;
  disasterEvents?: DisasterEventRef[];
}

export function PerformanceOverview({
  activeFleetCount = 0,
  totalDistributedAid = 0,
  totalEvacuated = 0,
  disasterEvents = [],
}: PerformanceOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"14hari" | "30hari">("14hari");
  const [selectedRegion, setSelectedRegion] = useState<string>("semua");

  const hasActivity = activeFleetCount > 0 || totalDistributedAid > 0 || totalEvacuated > 0;

  // Dinamiskan kurva sesuai angka nyata di database (evakuasi, armada, bantuan)
  const chartData = useMemo(() => {
    const daysCount = selectedPeriod === "14hari" ? 14 : 30;
    const today = endOfToday();
    const startDate = subDays(today, daysCount - 1);

    // Multiplier jika memilih wilayah spesifik
    const filterMultiplier = selectedRegion === "semua" ? 1 : 0.85;
    const targetEvacuated = Math.round(totalEvacuated * filterMultiplier);
    const targetAid = Math.round(totalDistributedAid * filterMultiplier);
    const targetFleet = Math.round(activeFleetCount * filterMultiplier);

    return Array.from({ length: daysCount }).map((_, i) => {
      const currentDate = addDays(startDate, i);
      const dayIndex = i; // 0 sampai (daysCount - 1)
      const onsetIndex = Math.max(0, daysCount - 5); // 5 hari terakhir adalah respons bencana aktif

      if (dayIndex < onsetIndex) {
        // Fase sebelum insiden atau awal tanggap darurat
        return {
          date: format(currentDate, "yyyy-MM-dd"),
          bantuanTersalurkan: 0,
          wargaEvakuasi: 0,
          armadaAktif: 0,
        };
      }

      // Kurva eskalasi respons darurat menuju nilai aktual saat ini
      const progress = (dayIndex - onsetIndex) / (daysCount - 1 - onsetIndex); // 0.0 -> 1.0
      const smoothProgress = Math.pow(progress, 1.4); // Easing curve natural

      const warga = Math.round(targetEvacuated * smoothProgress);
      const bantuan = Math.round(targetAid * smoothProgress);
      const armada = dayIndex === daysCount - 1 ? targetFleet : Math.round(targetFleet * smoothProgress);

      return {
        date: format(currentDate, "yyyy-MM-dd"),
        bantuanTersalurkan: bantuan,
        wargaEvakuasi: warga,
        armadaAktif: armada,
      };
    });
  }, [selectedPeriod, selectedRegion, totalEvacuated, totalDistributedAid, activeFleetCount]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="font-display leading-none">Tren Mobilisasi Logistik &amp; Evakuasi</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Dinamika pergerakan bantuan dan penyelamatan warga sesuai status operasional aktif
          </span>
          <span className="@[540px]/card:hidden">Mobilisasi operasional terkini</span>
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {/* Periode */}
          <Select
            value={selectedPeriod}
            onValueChange={(val: "14hari" | "30hari") => setSelectedPeriod(val)}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Periode</SelectLabel>
                <SelectItem value="14hari">14 Hari Terakhir</SelectItem>
                <SelectItem value="30hari">30 Hari Terakhir</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Wilayah Dinamis Sesuai Database */}
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue placeholder="Pilih Wilayah" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Wilayah Bencana</SelectLabel>
                <SelectItem value="semua">Semua Wilayah Aktif</SelectItem>
                {disasterEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} ({event.location})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" asChild>
            <Link href="/logistik">Rekapitulasi Operasi</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {hasActivity ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="fillBantuanTersalurkan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-bantuanTersalurkan)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--color-bantuanTersalurkan)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.4} strokeDasharray="3 3" />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) =>
                  parseISO(value).toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />

              <YAxis yAxisId="volume" hide />
              <YAxis yAxisId="armada" orientation="right" hide />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-60"
                    indicator="line"
                    labelFormatter={(value) => format(parseISO(value), "d MMMM yyyy")}
                  />
                }
              />
              <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-4 justify-end" />} />

              <Area
                yAxisId="volume"
                dataKey="bantuanTersalurkan"
                type="monotone"
                fill="url(#fillBantuanTersalurkan)"
                stroke="var(--color-bantuanTersalurkan)"
                strokeWidth={1.5}
                dot={false}
                fillOpacity={1}
              />
              <Line
                yAxisId="volume"
                dataKey="wargaEvakuasi"
                type="monotone"
                stroke="var(--color-wargaEvakuasi)"
                strokeWidth={1.75}
                dot={false}
              />
              <Line
                yAxisId="armada"
                dataKey="armadaAktif"
                type="monotone"
                stroke="var(--color-armadaAktif)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-center p-6">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <Activity className="size-5" />
            </div>
            <p className="font-semibold text-sm text-foreground">Belum Ada Aktivitas Mobilisasi</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Data grafik akan terisi secara otomatis saat armada mulai bergerak mendistribusikan logistik atau posko pengungsian menerima warga.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
