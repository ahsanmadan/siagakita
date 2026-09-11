import { z } from "zod";

export const recentReportSchema = z.object({
  id: z.string(),
  reporterName: z.string(),
  location: z.string(),
  disasterType: z.string(),
  urgency: z.enum(["Darurat", "Mendesak", "Waspada", "Terkendali"]),
  status: z.enum([
    "Baru",
    "Perlu Verifikasi",
    "Diverifikasi",
    "Ditindaklanjuti",
    "Dibuka Jadi Kejadian",
    "Duplikat",
    "Ditolak",
  ]),
  channel: z.enum(["Web App", "SMS Zero-Grid", "Radio Lapangan"]),
  createdAt: z.string(),
  coordinates: z.string().optional(),
  phone: z.string().optional(),
});

export type RecentReportRow = z.infer<typeof recentReportSchema>;
