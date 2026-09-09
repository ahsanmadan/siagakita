import { z } from "zod";

export const recentReportSchema = z.object({
  id: z.string(),
  reporterName: z.string(),
  location: z.string(),
  disasterType: z.string(),
  urgency: z.enum(["Darurat", "Mendesak", "Waspada", "Terkendali"]),
  status: z.enum(["Belum Diverifikasi", "Diverifikasi", "Ditangani", "Selesai"]),
  channel: z.enum(["Web App", "SMS Zero-Grid", "Radio Lapangan"]),
  createdAt: z.string(),
});

export type RecentReportRow = z.infer<typeof recentReportSchema>;
