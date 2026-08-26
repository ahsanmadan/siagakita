"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RealtimeConnectionStatus = "connecting" | "live" | "disconnected" | "error";
type SupabaseSubscribeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" | string;

type RealtimeState = {
  status: RealtimeConnectionStatus;
  pendingUpdates: number;
  lastUpdateLabel: string;
  lastUpdateAt: Date | null;
  resetUpdates: () => void;
};

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

const realtimeTables = [
  "field_reports",
  "disaster_events",
  "shelters",
  "needs",
  "inventory_items",
  "distributions",
  "third_party_aids",
  "audit_logs",
] as const;

const tableLabels: Record<(typeof realtimeTables)[number], string> = {
  field_reports: "Laporan operasional berubah",
  disaster_events: "Data kejadian berubah",
  shelters: "Data posko berubah",
  needs: "Kebutuhan posko berubah",
  inventory_items: "Stok gudang berubah",
  distributions: "Distribusi berubah",
  third_party_aids: "Bantuan pihak ketiga berubah",
  audit_logs: "Audit log baru tercatat",
};

const eventLabels: Record<string, string> = {
  INSERT: "baru",
  UPDATE: "diperbarui",
  DELETE: "dihapus",
};

const RealtimeContext = createContext<RealtimeState>({
  status: "disconnected",
  pendingUpdates: 0,
  lastUpdateLabel: "Pembaruan belum aktif",
  lastUpdateAt: null,
  resetUpdates: () => {},
});

function getUpdateLabel(payload: RealtimePayload) {
  const table = payload.table as (typeof realtimeTables)[number] | undefined;
  const baseLabel = table ? tableLabels[table] : "Data operasional berubah";
  const eventLabel = eventLabels[payload.eventType] ?? "berubah";

  if (table === "field_reports" && payload.eventType === "INSERT") return "Laporan baru masuk";
  if (table === "audit_logs" && payload.eventType === "INSERT") return "Audit log baru tercatat";

  return `${baseLabel} (${eventLabel})`;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [lastUpdateLabel, setLastUpdateLabel] = useState("Menyiapkan pembaruan data");
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshSoon = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
      }, 1000);
    };

    const handleChange = (payload: RealtimePayload) => {
      setPendingUpdates((count) => count + 1);
      setLastUpdateLabel(getUpdateLabel(payload));
      setLastUpdateAt(new Date());
      refreshSoon();
    };

    const channel = realtimeTables.reduce(
      (currentChannel, table) =>
        currentChannel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          handleChange,
        ),
      supabase.channel("siagakita-console-realtime"),
    );

    void supabase.realtime.setAuth();
    channel.subscribe((nextStatus: SupabaseSubscribeStatus) => {
      if (!mounted) return;
      if (nextStatus === "SUBSCRIBED") {
        setStatus("live");
        setLastUpdateLabel("Pembaruan data aktif");
        return;
      }
      if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
        setStatus("error");
        setLastUpdateLabel("Pembaruan data bermasalah");
        return;
      }
      if (nextStatus === "CLOSED") {
        setStatus("disconnected");
        setLastUpdateLabel("Pembaruan data terputus");
        return;
      }
      setStatus("connecting");
    });

    return () => {
      mounted = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  const value = useMemo<RealtimeState>(
    () => ({
      status,
      pendingUpdates,
      lastUpdateLabel,
      lastUpdateAt,
      resetUpdates: () => setPendingUpdates(0),
    }),
    [lastUpdateAt, lastUpdateLabel, pendingUpdates, status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}
