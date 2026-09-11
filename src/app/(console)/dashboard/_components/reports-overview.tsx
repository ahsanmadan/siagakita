"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { RecentReportRow } from "./recent-reports-table/schema";
import { RecentReportsTable } from "./recent-reports-table/table";

export function ReportsOverview({
  reports = [],
}: {
  reports?: RecentReportRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display leading-none">
          Laporan Situasi Terkini
        </CardTitle>
        <CardDescription>
          {reports.length} laporan warga, posko, dan SMS Zero-Grid dalam antrean
          operasional.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-11 sm:h-8" asChild>
            <Link href="/laporan">
              <Plus className="size-3.5" />
              Kelola Semua
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <RecentReportsTable data={reports} />
      </CardContent>
    </Card>
  );
}
