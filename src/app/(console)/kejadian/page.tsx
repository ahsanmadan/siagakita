import Link from "next/link";
import { ArrowRight, RadioTower, Users, TentTree } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { MetricStrip, OperationalCard } from "@/components/operational-ui";
import { OperationalBrief } from "@/components/operational-brief";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOperationsData } from "@/lib/repositories/operations";

export default async function EventsPage() {
  const { disasterEvents, metrics } = await getOperationsData();
  const criticalEvents = disasterEvents.filter((event) => event.status === "critical").length;
  const escalatedEvents = disasterEvents.filter((event) => event.escalationLevel !== "Kabupaten").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kejadian Aktif"
        description="Daftar ruang operasi yang sedang berjalan. Pilih kejadian untuk melihat peta, eskalasi, posko, dan koordinasi lembaga."
      />

      <OperationalBrief
        items={[
          { label: "Prioritas kritis", value: `${criticalEvents} kejadian kritis`, detail: "Tampilkan dulu saat operator memilih ruang operasi.", tone: criticalEvents ? "critical" : "teal", icon: RadioTower },
          { label: "Eskalasi", value: `${escalatedEvents} lintas kabupaten`, detail: "Butuh koordinasi di atas level kejadian lokal.", tone: escalatedEvents ? "warning" : "neutral", icon: ArrowRight },
          { label: "Data terdampak", value: `${metrics.affectedPeople.toLocaleString("id-ID")} warga`, detail: "Akumulasi dari kejadian aktif yang tersimpan.", tone: "neutral", icon: Users },
          { label: "Posko terkait", value: `${metrics.activeShelters} posko aktif`, detail: "Masuk ke perhitungan kebutuhan dan distribusi.", tone: metrics.activeShelters ? "teal" : "neutral", icon: TentTree },
        ]}
      />

      <MetricStrip>
        <MetricCard label="Kejadian aktif" value={String(metrics.activeEvents)} note="Sedang dalam respons" icon={RadioTower} tone="critical" />
        <MetricCard label="Warga terdampak" value={metrics.affectedPeople.toLocaleString("id-ID")} note="Akumulasi semua kejadian" icon={Users} />
        <MetricCard label="Posko aktif" value={String(metrics.activeShelters)} note="Terhubung ke kejadian" icon={TentTree} tone="teal" />
      </MetricStrip>

      <OperationalCard className="overflow-clip">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Daftar kejadian</CardTitle>
          <CardDescription>Urut berdasarkan pembaruan terbaru dari database.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 p-4 md:hidden">
            {disasterEvents.map((event) => (
              <article key={event.id} className="rounded-xl border bg-background/72 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/kejadian/${event.id}`} className="inline-flex min-h-8 items-center font-semibold hover:text-primary">{event.name}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{event.location}, {event.province}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.summary}</p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/kejadian/${event.id}`}>Buka ruang operasi <ArrowRight /></Link>
                </Button>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kejadian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Eskalasi</TableHead>
                  <TableHead className="text-right">Terdampak</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disasterEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link href={`/kejadian/${event.id}`} className="inline-flex min-h-8 items-center font-medium hover:text-primary">{event.name}</Link>
                      <p className="mt-1 text-xs text-muted-foreground">{event.location}, {event.province} · {event.updatedAt}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={event.status} /></TableCell>
                    <TableCell>{event.escalationLevel}</TableCell>
                    <TableCell className="data-number text-right font-medium">{event.affectedPeople.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost">
                        <Link href={`/kejadian/${event.id}`}>Detail <ArrowRight /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </OperationalCard>
    </div>
  );
}
