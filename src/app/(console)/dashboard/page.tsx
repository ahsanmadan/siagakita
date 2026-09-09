import { getOperationsData } from "@/lib/repositories/operations";
import { requireRole } from "@/lib/auth";
import { pickSystemRecommendation } from "@/lib/recommendation-context";
import { RecommendationCard } from "@/components/recommendation-card";
import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { ReportsOverview } from "./_components/reports-overview";
import type { RecentReportRow } from "./_components/recent-reports-table/schema";
import type { CrisisStatus, FieldReport, ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapFieldReportToRow(report: FieldReport): RecentReportRow {
  const urgencyMap: Record<CrisisStatus, RecentReportRow["urgency"]> = {
    critical: "Darurat",
    major: "Mendesak",
    warning: "Waspada",
    safe: "Terkendali",
  };
  const statusMap: Record<ReportStatus, RecentReportRow["status"]> = {
    baru: "Belum Diverifikasi",
    diverifikasi: "Diverifikasi",
    ditindaklanjuti: "Ditangani",
    ditolak: "Selesai",
  };
  const channelMap: Record<FieldReport["channel"], RecentReportRow["channel"]> = {
    Web: "Web App",
    "SMS Zero-Grid": "SMS Zero-Grid",
    Petugas: "Radio Lapangan",
  };

  return {
    id: report.id,
    reporterName: report.reporter || "Warga",
    location: report.location || "Wilayah Lapangan",
    disasterType: report.summary || "Laporan Lapangan",
    urgency: urgencyMap[report.severity] ?? "Waspada",
    status: statusMap[report.status] ?? "Belum Diverifikasi",
    channel: channelMap[report.channel] ?? "Web App",
    createdAt: report.receivedAtIso || new Date().toISOString(),
  };
}

export default async function DashboardPage() {
  await requireRole(["admin", "bpbd_operator", "field_officer", "shelter_manager", "warehouse_manager"], "/peta-publik");
  const { disasterEvents, shelters, inventory, fieldReports, distributions, recommendations } = await getOperationsData();
  const primaryRecommendation = pickSystemRecommendation(recommendations);

  const criticalEvents = disasterEvents.filter((e) => e.status === "critical").length;
  const warningEvents = disasterEvents.filter((e) => e.status === "warning" || e.status === "major").length;
  const totalRefugees = shelters.reduce((acc, s) => acc + (s.population?.total || 0), 0);
  const criticalItems = inventory.filter((item) => item.status === "critical");
  const unverifiedReports = fieldReports.filter((r) => r.status === "baru").length;

  const eventsDetail =
    disasterEvents.length === 0
      ? "Seluruh wilayah aman"
      : `${criticalEvents} tanggap darurat, ${warningEvents} waspada`;

  const suppliesDetail =
    criticalItems.length === 0
      ? "Stok kebutuhan terpenuhi"
      : criticalItems.slice(0, 3).map((i) => i.item).join(", ");

  // Saring laporan ditolak / duplikat dan cegah tampilan ganda
  const activeReports = fieldReports.filter((r) => r.status !== "ditolak");
  const seenKeys = new Set<string>();
  const uniqueReports: typeof fieldReports = [];
  for (const rep of activeReports) {
    const key = `${rep.reporter.toLowerCase().trim()}|${rep.location.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueReports.push(rep);
    }
  }

  const mappedReports = uniqueReports.map(mapFieldReportToRow);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards
        activeEventsCount={disasterEvents.length}
        eventsDetail={eventsDetail}
        totalSheltersCount={shelters.length}
        totalRefugeesCount={totalRefugees}
        criticalSuppliesCount={criticalItems.length}
        suppliesDetail={suppliesDetail}
        unverifiedReportsCount={unverifiedReports}
      />
      <PerformanceOverview
        activeFleetCount={distributions.filter((d) => d.status === "dalam-perjalanan").length}
        totalDistributedAid={distributions.length > 0 ? 625 : 0}
        totalEvacuated={totalRefugees}
        disasterEvents={disasterEvents.map((e) => ({ id: e.id, name: e.name, location: e.location }))}
      />
      {primaryRecommendation && (
        <RecommendationCard
          recommendation={primaryRecommendation}
          title="Saran Taktis Operasional (Groq AI)"
        />
      )}
      <ReportsOverview reports={mappedReports} />
    </div>
  );
}
