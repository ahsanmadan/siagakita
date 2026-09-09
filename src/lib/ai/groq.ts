import type { CrisisStatus } from "@/lib/types";

export interface GroqConfig {
  apiKey: string;
  model: string;
  isAvailable: boolean;
}

export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY || "";
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  return {
    apiKey,
    model,
    isAvailable: Boolean(apiKey && apiKey.trim().length > 0),
  };
}

export interface OperationalContextForAI {
  events: Array<{
    id: string;
    name: string;
    location: string;
    status: string;
    escalationLevel: string;
  }>;
  shelters: Array<{
    id: string;
    name: string;
    capacity: number;
    occupancy: number;
    children: number;
    elderly: number;
    vulnerable: number;
    status: string;
  }>;
  criticalNeeds: Array<{
    item: string;
    shelterName: string;
    requested: number;
    available: number;
    unit: string;
    urgency: string;
  }>;
  criticalInventory: Array<{
    item: string;
    category: string;
    quantity: number;
    unit: string;
    status: string;
  }>;
  unverifiedReportsCount: number;
  recentUrgentReports?: Array<{
    reporter: string;
    location: string;
    summary: string;
    severity: string;
  }>;
  externalAlerts?: {
    latestEarthquake?: {
      title: string;
      location: string;
      magnitude: number;
      depth: string;
      potentialTsunami: boolean;
      time: string;
    } | null;
    activeVolcanoes?: Array<{
      name: string;
      province: string;
      statusLevel: string;
      dangerRadiusKm: number;
    }>;
  };
}

export interface GeneratedRecommendation {
  title: string;
  rationale: string;
  confidence: number;
  priority: CrisisStatus;
  action: string;
  factors: string[];
  shelterId?: string | null;
  eventId?: string | null;
  modelUsed: string;
}

/**
 * Memanggil API Groq untuk menghasilkan rekomendasi taktis tanggap darurat
 */
export async function generateDisasterRecommendationGroq(
  context: OperationalContextForAI,
): Promise<GeneratedRecommendation> {
  const config = getGroqConfig();

  if (!config.isAvailable) {
    throw new Error(
      "GROQ_API_KEY belum dikonfigurasi di file environment (.env / .env.local). Silakan periksa konfigurasi Anda.",
    );
  }

  const systemPrompt = `Anda adalah Sistem Pakar AI Intelijen Kebencanaan BNPB & BPBD Indonesia pada platform SiagaKita.
Tugas Anda adalah mengevaluasi data real-time operasi bencana (kejadian aktif, kapasitas posko pengungsian, kelompok rentan balita/lansia, defisit logistik mendesak, dan laporan triase lapangan).
Hasilkan 1 (satu) rekomendasi taktis operasional paling mendesak, realistis, dan berorientasi penyelamatan jiwa.

FORMAT KELUARAN HARUS HANYA JSON MURNI (tanpa tag markdown \`\`\`json atau teks pengantar/penutup apapun):
{
  "title": "Judul rekomendasi singkat dan tegas dalam Bahasa Indonesia (maksimal 10 kata)",
  "rationale": "Alasan strategis mengapa tindakan ini paling genting dan harus segera dieksekusi oleh komandan operasi (1-3 kalimat)",
  "confidence": <angka bulat 80 sampai 98>,
  "priority": "<salah satu dari: 'critical' | 'major' | 'warning'>",
  "action": "Langkah aksi nyata dan taktis yang dapat langsung dijalankan oleh petugas atau armada logistik",
  "factors": [
    "Faktor kunci 1 (misal: Okupansi Posko Balai Desa mencapai 112%)",
    "Faktor kunci 2 (misal: 35 balita dan lansia membutuhkan susu formula & selimut)",
    "Faktor kunci 3 (misal: Defisit pasokan air bersih 2.000 liter)"
  ],
  "shelterId": "<id posko yang paling terkait dari data input, atau null jika mencakup skala kejadian>",
  "eventId": "<id kejadian yang paling terkait dari data input, atau null jika lintas kejadian>"
}`;

  const userPrompt = `Data Operasi Lapangan Terkini:
- Kejadian Aktif: ${JSON.stringify(context.events, null, 2)}
- Posko Pengungsian & Okupansi: ${JSON.stringify(context.shelters, null, 2)}
- Kesenjangan Kebutuhan Kritis (Defisit): ${JSON.stringify(context.criticalNeeds, null, 2)}
- Stok Kritis di Gudang: ${JSON.stringify(context.criticalInventory, null, 2)}
- Laporan Belum Diverifikasi: ${context.unverifiedReportsCount} laporan
${context.recentUrgentReports && context.recentUrgentReports.length > 0 ? `- Laporan Darurat Terbaru: ${JSON.stringify(context.recentUrgentReports, null, 2)}\n` : ""}${context.externalAlerts ? `- Telemetri Eksternal (BMKG & PVMBG): ${JSON.stringify(context.externalAlerts, null, 2)}\n` : ""}
Berikan rekomendasi tanggap darurat terbaik Anda dalam format JSON sesuai spesifikasi.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Groq API error (${response.status}): ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        errorMessage = `Groq API (${config.model}): ${parsed.error.message}`;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  const jsonResult = await response.json();
  const rawContent = jsonResult.choices?.[0]?.message?.content?.trim() || "";

  // Membersihkan kemungkinan formatting markdown seperti ```json ... ```
  let cleaned = rawContent;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  try {
    const parsed = JSON.parse(cleaned);

    const validPriority: CrisisStatus =
      parsed.priority === "critical" || parsed.priority === "major" || parsed.priority === "warning"
        ? parsed.priority
        : "warning";

    const factors = Array.isArray(parsed.factors)
      ? parsed.factors.map((f: unknown) => String(f)).filter(Boolean)
      : ["Analisis data operasional real-time"];

    return {
      title: String(parsed.title || "Tingkatkan Koordinasi & Distribusi Logistik"),
      rationale: String(parsed.rationale || "Dibutuhkan percepatan penanganan berdasarkan data lapangan."),
      confidence: Math.min(99, Math.max(70, Number(parsed.confidence) || 90)),
      priority: validPriority,
      action: String(parsed.action || "Kerahkan tim asesmen cepat dan armada pendukung."),
      factors: factors.length > 0 ? factors : ["Kondisi lapangan memerlukan respon cepat"],
      shelterId: parsed.shelterId && typeof parsed.shelterId === "string" ? parsed.shelterId : null,
      eventId: parsed.eventId && typeof parsed.eventId === "string" ? parsed.eventId : null,
      modelUsed: config.model,
    };
  } catch (err) {
    console.error("Gagal mem-parsing keluaran JSON dari Groq:", rawContent, err);
    throw new Error(`Keluaran AI Groq (${config.model}) tidak dalam format JSON yang diharapkan.`);
  }
}

/**
 * Memanggil Groq untuk mengevaluasi laporan warga / SMS darurat
 */
export async function triageFieldReportGroq(report: {
  reporter: string;
  location: string;
  summary: string;
  channel: string;
}): Promise<{
  suggestedSeverity: CrisisStatus;
  urgencyScore: number;
  confidence: number;
  reason: string;
  recommendedImmediateAction: string;
}> {
  const config = getGroqConfig();
  if (!config.isAvailable) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi.");
  }

  const prompt = `Analisis laporan lapangan bencana berikut:
Pelapor: ${report.reporter}
Lokasi: ${report.location}
Kanal: ${report.channel}
Isi Laporan: "${report.summary}"

Tentukan tingkat keparahan (critical / major / warning / safe), skor urgensi (1-100), keyakinan (1-100), alasan singkat, dan aksi segera.
Kembalikan HANYA JSON murni:
{
  "suggestedSeverity": "critical" | "major" | "warning" | "safe",
  "urgencyScore": <1-100>,
  "confidence": <1-100>,
  "reason": "<penjelasan 1 kalimat>",
  "recommendedImmediateAction": "<tindakan segera petugas>"
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq Triage Error: ${response.statusText}`);
  }

  const resData = await response.json();
  const raw = resData.choices?.[0]?.message?.content?.trim() || "{}";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}
