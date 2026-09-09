"use client";

import { Download, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { RecentReportRow } from "./recent-reports-table/schema";
import { RecentReportsTable } from "./recent-reports-table/table";

export function ReportsOverview({ reports = [] }: { reports?: RecentReportRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">{reports.length} Laporan Situasi Terkini</CardTitle>
        <CardDescription>
          Feed antrean laporan warga, posko, dan SMS Zero-Grid yang memerlukan respon cepat.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/laporan">
              <Plus className="size-3.5" />
              Kelola Semua
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            Ekspor CSV
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <RecentReportsTable data={reports} />
      </CardContent>
    </Card>
  );
}
