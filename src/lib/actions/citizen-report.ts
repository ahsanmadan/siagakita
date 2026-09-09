"use server";

import { headers } from "next/headers";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { RATE_LIMITS, checkRateLimit, getClientIdentifier } from "@/lib/cache/rate-limiter";
import { calculateConfidenceScore, type Coordinates } from "@/lib/geo-clustering";

export type CitizenReportInput = {
  category: "sar_evakuasi" | "jalan_jembatan" | "posko_logistik";
  reporterName: string;
  phoneNumber: string;
  locationDescription: string;
  coordinates?: Coordinates | null;
  gpsAccuracyMeters?: number;
  notes: string;
  hasPhoto?: boolean;
};

export type CitizenReportResult = {
  success: boolean;
  trackingCode?: string;
  confidenceScore?: number;
  confidenceGrade?: "tinggi" | "sedang" | "rendah";
  recommendation?: string;
  message: string;
};

const CATEGORY_LABELS: Record<CitizenReportInput["category"], string> = {
  sar_evakuasi: "🚨 EVAKUASI JIWA / ORANG TERTIMBUN",
  jalan_jembatan: "🚧 AKSES JALAN / JEMBATAN PUTUS",
  posko_logistik: "🏕️ PENGUNGSIAN / BUTUH LOGISTIK",
};

export async function submitCitizenReportAction(input: CitizenReportInput): Promise<CitizenReportResult> {
  try {
    const requestHeaders = await headers();
    const rateLimit = await checkRateLimit(RATE_LIMITS.publicReport, getClientIdentifier(requestHeaders));
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Pengiriman laporan terlalu sering. Coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      };
    }

    const supabase = createSupabasePublicServerClient();

    // 1. Validasi input dasar
    if ((!input.locationDescription && !input.coordinates) || !input.phoneNumber) {
      return {
        success: false,
        message: "Lokasi kejadian atau GPS, serta nomor telepon aktif wajib diisi.",
      };
    }

    // 2. Hitung skor kepercayaan awal
    // Cek apakah ada bencana aktif
    const { data: activeEvents } = await supabase
      .from("public_event_summary")
      .select("id, latitude, longitude")
      .limit(5);

    const reportCoordinates = input.coordinates ?? null;
    const isNearEvent = Boolean(reportCoordinates) && (activeEvents ?? []).some((evt) => {
      const dLat = Math.abs(evt.latitude - reportCoordinates!.latitude);
      const dLng = Math.abs(evt.longitude - reportCoordinates!.longitude);
      return dLat < 0.25 && dLng < 0.25; // dalam radius ~25km dari epicenter
    });

    const confidence = calculateConfidenceScore({
      hasGpsAccuracy: Boolean(reportCoordinates),
      gpsAccuracyMeters: input.gpsAccuracyMeters,
      hasPhoto: Boolean(input.hasPhoto),
      hasValidPhone: input.phoneNumber.length >= 10,
      nearbyReportCount: isNearEvent ? 2 : 0,
      isWithinKnownDisasterZone: isNearEvent,
    });

    // 3. Format kode pelaporan & ringkasan
    const rand = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `CIT-${Date.now().toString(36).toUpperCase()}-${rand}`;

    const severity =
      input.category === "sar_evakuasi"
        ? "critical"
        : input.category === "jalan_jembatan"
          ? "major"
          : "warning";

    const summaryText = [
      `[TRIASI: ${CATEGORY_LABELS[input.category]}]`,
      `[SKOR KEPERCAYAAN: ${confidence.score}% - ${confidence.grade.toUpperCase()}]`,
      `[KONTAK: ${input.phoneNumber}]`,
      reportCoordinates
        ? `[GPS: ${reportCoordinates.latitude.toFixed(5)}, ${reportCoordinates.longitude.toFixed(5)} (±${Math.round(input.gpsAccuracyMeters || 0)}m)]`
        : "[GPS: tidak tersedia - gunakan verifikasi telepon/lokasi manual]",
      input.notes ? `Pesan: "${input.notes}"` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // 4. Simpan ke database
    const { error: insertError } = await supabase.from("field_reports").insert({
      code: trackingCode,
      channel: "Web",
      reporter: input.reporterName || "Warga Terdampak",
      location: input.locationDescription,
      summary: summaryText,
      status: "baru",
      severity,
    });

    if (insertError) {
      console.error("Gagal menyimpan laporan warga:", insertError);
      return {
        success: false,
        message: `Gagal mengirim laporan: ${insertError.message}`,
      };
    }

    return {
      success: true,
      trackingCode,
      confidenceScore: confidence.score,
      confidenceGrade: confidence.grade,
      recommendation: confidence.recommendation,
      message: "Laporan darurat berhasil diterima sistem SiagaKita dan diteruskan ke triase komando.",
    };
  } catch (err) {
    console.error("Kesalahan sistem submitCitizenReportAction:", err);
    return {
      success: false,
      message: "Terjadi gangguan jaringan saat mengirim laporan. Silakan coba lagi.",
    };
  }
}
