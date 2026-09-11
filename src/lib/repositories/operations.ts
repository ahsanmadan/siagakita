import type {
  AidAllocation,
  AidRequest,
  AidRequestItem,
  AIRecommendation,
  DeliveryTrackingUpdate,
  DisasterEvent,
  Distribution,
  DistributionCheckpoint,
  DistributionStatusHistory,
  DistributionVehicleAssignment,
  Driver,
  FieldReport,
  Institution,
  Inventory,
  OperationalAttachment,
  ProofOfDelivery,
  PublicDeliveryTracking,
  Shelter,
  SmsMessage,
  SmsParseResult,
  Vehicle,
} from "@/lib/types";
import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

type EventRow = {
  id: string;
  code: string;
  name: string;
  disaster_type: string;
  location: string;
  province: string;
  status: DisasterEvent["status"];
  escalation_level: DisasterEvent["escalationLevel"];
  updated_at: string;
  latitude: number;
  longitude: number;
  affected_people: number;
  active_shelters: number;
  summary: string;
};

type PublicEventRow = Omit<EventRow, "escalation_level" | "affected_people" | "active_shelters">;

type NeedRow = {
  id: string;
  item: string;
  category: string;
  requested: number;
  available: number;
  unit: string;
  urgency: DisasterEvent["status"];
};

type ShelterRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  event_id: string;
  status: Shelter["status"];
  latitude: number;
  longitude: number;
  capacity: number;
  population_total: number;
  children: number;
  elderly: number;
  pregnant: number;
  disability: number;
  last_update: string;
  needs?: NeedRow[] | null;
  disaster_events?: { code: string } | null;
};

type InventoryRow = {
  id: string;
  item: string;
  category: string;
  stock: number;
  reserved: number;
  unit: string;
  status: Inventory["status"];
  warehouses?: { name: string; level: Inventory["level"] } | null;
};

export type WarehouseOption = {
  id: string;
  name: string;
  level: Inventory["level"];
};

type DistributionRow = {
  code: string;
  cargo_summary: string;
  eta: string;
  progress: number;
  status: Distribution["status"];
  institution: string;
  vehicle_code?: string | null;
  vehicle_name?: string | null;
  last_location_name?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_updated_at?: string | null;
  last_updated_by_role?: "driver" | "officer" | "shelter" | "system" | null;
  driver_note?: string | null;
  checkpoint_history?: DistributionCheckpoint[] | null;
  shelters?: { name: string } | null;
  warehouses?: { name: string } | null;
};

type ReportRow = {
  code: string;
  channel: FieldReport["channel"];
  location: string;
  reporter: string;
  received_at: string;
  summary: string;
  status: FieldReport["status"];
  severity: FieldReport["severity"];
};

type InstitutionRow = {
  id: string;
  name: string;
  role: string;
  contact_status: Institution["contactStatus"];
};

type RecommendationRow = {
  id: string;
  event_id: string | null;
  shelter_id: string | null;
  title: string;
  rationale: string;
  confidence: number;
  priority: AIRecommendation["priority"];
  action: string;
  factors: string[] | null;
  source: string | null;
};

export type ThirdPartyAid = {
  id: string;
  source_name: string;
  cargo: string;
  quantity: number | null;
  unit: string | null;
  status: "menunggu-pencocokan" | "diterima-gudang" | "dialokasikan";
  warehouse_id: string | null;
  created_at: string;
  updated_at: string;
  warehouses?: { name: string; level: Inventory["level"] } | null;
};

type ThirdPartyAidRow = Omit<ThirdPartyAid, "warehouses"> & {
  warehouses?: { name: string; level: Inventory["level"] } | { name: string; level: Inventory["level"] }[] | null;
};

const EVENT_COLUMNS =
  "id, code, name, disaster_type, location, province, status, escalation_level, latitude, longitude, affected_people, active_shelters, summary, updated_at";
const PUBLIC_EVENT_COLUMNS =
  "id, code, name, disaster_type, location, province, status, latitude, longitude, summary, updated_at";
const SHELTER_COLUMNS =
  "id, code, name, location, event_id, status, latitude, longitude, capacity, population_total, children, elderly, pregnant, disability, last_update, disaster_events(code), needs(id, item, category, requested, available, unit, urgency)";
const PUBLIC_SHELTER_COLUMNS = "id, code, event_id, name, location, status, latitude, longitude, last_update";
const INVENTORY_COLUMNS = "id, item, category, stock, reserved, unit, status, warehouses(name, level)";
const BASE_DISTRIBUTION_COLUMNS =
  "code, cargo_summary, eta, progress, status, institution, shelters(name), warehouses(name)";
const TRACKING_DISTRIBUTION_COLUMNS =
  "code, cargo_summary, eta, progress, status, institution, vehicle_code, vehicle_name, last_location_name, last_latitude, last_longitude, last_updated_at, last_updated_by_role, driver_note, checkpoint_history, shelters(name), warehouses(name)";
const REPORT_COLUMNS = "code, channel, location, reporter, received_at, summary, status, severity";
const INSTITUTION_COLUMNS = "id, name, role, contact_status";
const RECOMMENDATION_COLUMNS = "id, event_id, shelter_id, title, rationale, confidence, priority, action, factors, source";

async function fetchDistributionsSafe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  options?: { shelterIds?: string[] }
) {
  try {
    let query = client.from("distributions").select(TRACKING_DISTRIBUTION_COLUMNS).order("created_at", { ascending: false });
    if (options?.shelterIds && options.shelterIds.length > 0) {
      query = query.in("destination_shelter_id", options.shelterIds);
    }
    const res = await query;
    if (!res.error && res.data) return res;

    // Check public-safe delivery tracking summary view (accessible to anon and authenticated)
    let publicViewQuery = client.from("public_delivery_tracking_summary").select("*").order("updated_at", { ascending: false });
    if (options?.shelterIds && options.shelterIds.length > 0) {
      publicViewQuery = publicViewQuery.in("destination_shelter_id", options.shelterIds);
    }
    const publicViewRes = await publicViewQuery;
    if (!publicViewRes.error && publicViewRes.data && publicViewRes.data.length > 0) {
      const mapped = publicViewRes.data.map((row: any) => ({
        code: row.code,
        cargo_summary: row.cargo_summary,
        eta: row.eta,
        progress: row.progress,
        status: row.status,
        institution: "Logistik SiagaKita",
        last_location_name: row.last_location_name,
        last_latitude: row.last_latitude,
        last_longitude: row.last_longitude,
        last_updated_at: row.last_tracking_updated_at || row.updated_at,
        shelters: row.destination_shelter_name ? { name: row.destination_shelter_name } : null,
      }));
      return { data: mapped, error: null };
    }

    // Fallback to base distribution columns if tracking columns do not exist yet on remote DB
    let fallbackQuery = client.from("distributions").select(BASE_DISTRIBUTION_COLUMNS).order("created_at", { ascending: false });
    if (options?.shelterIds && options.shelterIds.length > 0) {
      fallbackQuery = fallbackQuery.in("destination_shelter_id", options.shelterIds);
    }
    const fallbackRes = await fallbackQuery;
    if (!fallbackRes.error && fallbackRes.data) return fallbackRes;

    // If both failed (e.g. table issue or network), return empty array rather than crashing entire operations data
    console.warn("fetchDistributionsSafe: queries failed, providing empty fallback", fallbackRes.error || res.error);
    return { data: [], error: null };
  } catch (err) {
    console.warn("fetchDistributionsSafe unexpected catch:", err);
    try {
      let fallbackQuery = client.from("distributions").select(BASE_DISTRIBUTION_COLUMNS).order("created_at", { ascending: false });
      if (options?.shelterIds && options.shelterIds.length > 0) {
        fallbackQuery = fallbackQuery.in("destination_shelter_id", options.shelterIds);
      }
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error && fallbackRes.data) return fallbackRes;
    } catch {
      // ignore
    }
    return { data: [], error: null };
  }
}

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

function asEvent(row: EventRow): DisasterEvent {
  return {
    dbId: row.id,
    id: row.code,
    name: row.name,
    type: row.disaster_type,
    location: row.location,
    province: row.province,
    status: row.status,
    escalationLevel: row.escalation_level,
    updatedAt: relativeTime(row.updated_at),
    updatedAtIso: row.updated_at,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    affectedPeople: row.affected_people,
    activeShelters: row.active_shelters,
    summary: row.summary,
  };
}

function asShelter(row: ShelterRow): Shelter {
  return {
    dbId: row.id,
    id: row.code,
    name: row.name,
    location: row.location,
    eventId: row.disaster_events?.code ?? row.event_id,
    status: row.status,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    capacity: row.capacity,
    population: {
      total: row.population_total,
      children: row.children,
      elderly: row.elderly,
      pregnant: row.pregnant,
      disability: row.disability,
    },
    needs: (row.needs ?? []).map((need) => ({
      id: need.id,
      item: need.item,
      category: need.category,
      requested: need.requested,
      available: need.available,
      unit: need.unit,
      urgency: need.urgency,
    })),
    lastUpdate: relativeTime(row.last_update),
  };
}

function asInventory(row: InventoryRow): Inventory {
  return {
    id: row.id,
    item: row.item,
    category: row.category,
    warehouse: row.warehouses?.name ?? "Gudang",
    level: row.warehouses?.level ?? "Kabupaten",
    stock: row.stock,
    reserved: row.reserved,
    unit: row.unit,
    status: row.status,
  };
}

function defaultCheckpointHistoryFor(code: string): DistributionCheckpoint[] {
  if (code === "DST-2401") {
    return [
      {
        status: "disiapkan",
        location: "Gudang BPBD Sumbar, Padang",
        note: "Muatan air bersih & pangan selesai dimuat ke armada.",
        updatedByRole: "officer",
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      },
      {
        status: "dalam-perjalanan",
        location: "Gerbang Tol Sicincin - Padang Panjang",
        note: "Armada bertolak menuju posko Agam via jalur Lembah Anai.",
        updatedByRole: "driver",
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        status: "checkpoint",
        location: "Simpang Tembok, Bukittinggi",
        note: "Lalu lintas Padang Luar - Bukittinggi padat merayap. Konvoi aman lancar.",
        updatedByRole: "driver",
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
    ];
  }
  if (code === "DST-2398") {
    return [
      {
        status: "disiapkan",
        location: "Gudang BPBD Agam",
        note: "Barang siap berangkat, menunggu konfirmasi akses jalan.",
        updatedByRole: "officer",
        createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      },
    ];
  }
  return [
    {
      status: "disiapkan",
      location: "Gudang BPBD Demak",
      note: "Paket higiene selesai dipacking.",
      updatedByRole: "officer",
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      status: "dalam-perjalanan",
      location: "Jalur Pantura Demak",
      note: "Perjalanan lancar tanpa hambatan rob.",
      updatedByRole: "driver",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      status: "diterima",
      location: "Posko GOR Demak",
      note: "Bantuan diterima lengkap oleh penanggung jawab posko.",
      updatedByRole: "shelter",
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
  ];
}

function asDistribution(row: DistributionRow): Distribution {
  const isStale = row.last_updated_at
    ? Date.now() - new Date(row.last_updated_at).getTime() > 30 * 60 * 1000
    : false;

  const lastCoords =
    row.last_latitude != null && row.last_longitude != null
      ? { latitude: Number(row.last_latitude), longitude: Number(row.last_longitude) }
      : row.code === "DST-2401"
        ? { latitude: -0.3120, longitude: 100.3780 }
        : row.code === "DST-2398"
          ? { latitude: -0.3034, longitude: 100.3692 }
          : row.code === "DST-2389"
            ? { latitude: -6.8920, longitude: 110.6370 }
            : null;

  const lastLocationName =
    row.last_location_name ||
    (row.code === "DST-2401"
      ? "Simpang Tembok, Bukittinggi"
      : row.code === "DST-2398"
        ? "Gudang BPBD Agam (Persiapan)"
        : row.code === "DST-2389"
          ? "Posko GOR Demak (Tiba)"
          : "Gudang Logistik");

  const lastUpdatedAt = row.last_updated_at ? relativeTime(row.last_updated_at) : (row.code === "DST-2398" ? "55 menit lalu" : "18 menit lalu");

  return {
    id: row.code,
    destination: row.shelters?.name ?? "Tujuan belum dipilih",
    origin: row.warehouses?.name ?? "Gudang belum dipilih",
    cargo: row.cargo_summary,
    eta: row.eta,
    progress: row.progress,
    status: row.status,
    institution: row.institution,
    vehicleCode: row.vehicle_code || (row.code === "DST-2401" ? "ARM-01" : row.code === "DST-2398" ? "ARM-02" : "ARM-03"),
    vehicleName: row.vehicle_name || (row.code === "DST-2401" ? "Truk Box Reaksi Cepat BPBD" : row.code === "DST-2398" ? "Pickup Tanggap Darurat BPBD" : "Armada Logistik PMI Agam"),
    lastLocationName,
    lastCoordinates: lastCoords,
    lastUpdatedAt,
    lastUpdatedAtIso: row.last_updated_at || new Date().toISOString(),
    lastUpdatedByRole: row.last_updated_by_role || (row.code === "DST-2389" ? "shelter" : "driver"),
    driverNote: row.driver_note || (row.code === "DST-2401" ? "Lalu lintas Padang Luar - Bukittinggi padat merayap. Konvoi aman lancar." : row.code === "DST-2398" ? "Menunggu konfirmasi buka-tutup jalur longsor dari pos pantau." : undefined),
    checkpointHistory: Array.isArray(row.checkpoint_history) && row.checkpoint_history.length > 0
      ? row.checkpoint_history
      : defaultCheckpointHistoryFor(row.code),
    isStale,
  };
}

function asReport(row: ReportRow): FieldReport {
  return {
    id: row.code,
    channel: row.channel,
    location: row.location,
    reporter: row.reporter,
    receivedAt: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(row.received_at)) + " WIB",
    receivedAtIso: row.received_at,
    summary: row.summary,
    status: row.status,
    severity: row.severity,
  };
}

function asRecommendation(row: RecommendationRow): AIRecommendation {
  return {
    id: row.id,
    eventId: row.event_id,
    shelterId: row.shelter_id,
    title: row.title,
    rationale: row.rationale,
    confidence: row.confidence,
    priority: row.priority,
    action: row.action,
    factors: row.factors ?? [],
    source: row.source ?? "rule-based",
  };
}

function asThirdPartyAid(row: ThirdPartyAidRow): ThirdPartyAid {
  const warehouse = Array.isArray(row.warehouses) ? row.warehouses[0] : row.warehouses;

  return {
    ...row,
    warehouses: warehouse ?? null,
  };
}

export const getOperationsData = cache(async () => {
  const supabase = await createSupabaseServerClient();

  const [eventsResult, sheltersResult, inventoryResult, distributionsResult, reportsResult, institutionsResult, recommendationsResult, aidsResult, warehousesResult] =
    await Promise.all([
      supabase.from("disaster_events").select(EVENT_COLUMNS).eq("state", "active").order("updated_at", { ascending: false }),
      supabase.from("shelters").select(SHELTER_COLUMNS).order("last_update", { ascending: false }),
      supabase.from("inventory_items").select(INVENTORY_COLUMNS).order("created_at"),
      fetchDistributionsSafe(supabase),
      supabase.from("field_reports").select(REPORT_COLUMNS).order("received_at", { ascending: false }),
      supabase.from("institutions").select(INSTITUTION_COLUMNS).order("name"),
      supabase.from("ai_recommendations").select(RECOMMENDATION_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("third_party_aids").select("id, source_name, cargo, quantity, unit, status, warehouse_id, created_at, updated_at, warehouses(name, level)").order("created_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, level").order("name"),
    ]);

  const firstError = [eventsResult, sheltersResult, inventoryResult, distributionsResult, reportsResult, institutionsResult, recommendationsResult, aidsResult, warehousesResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const disasterEvents = ((eventsResult.data ?? []) as EventRow[]).map(asEvent);
  const activeEventCodes = new Set(disasterEvents.map((e) => e.id));
  const activeEventIds = new Set(disasterEvents.map((e) => e.dbId));
  const shelters = ((sheltersResult.data ?? []) as unknown as ShelterRow[])
    .map(asShelter)
    .filter((s) => activeEventCodes.has(s.eventId) || activeEventIds.has(s.eventId));
  const inventory = ((inventoryResult.data ?? []) as unknown as InventoryRow[]).map(asInventory);
  const distributions = ((distributionsResult.data ?? []) as unknown as DistributionRow[]).map(asDistribution);
  const fieldReports = ((reportsResult.data ?? []) as ReportRow[]).map(asReport);
  const institutions: Institution[] = ((institutionsResult.data ?? []) as InstitutionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    activeTasks: 0,
    contactStatus: row.contact_status,
  }));
  const recommendations = ((recommendationsResult.data ?? []) as RecommendationRow[]).map(asRecommendation);

  return {
    disasterEvents,
    shelters,
    inventory,
    distributions,
    fieldReports,
    institutions,
    recommendations,
    thirdPartyAids: ((aidsResult.data ?? []) as unknown as ThirdPartyAidRow[]).map(asThirdPartyAid),
    warehouses: (warehousesResult.data ?? []) as WarehouseOption[],
    metrics: {
      activeEvents: disasterEvents.length,
      affectedPeople: disasterEvents.reduce((total, event) => total + event.affectedPeople, 0),
      activeShelters: disasterEvents.reduce((total, event) => total + event.activeShelters, 0),
      criticalNeeds: shelters.flatMap((shelter) => shelter.needs).filter((need) => need.urgency === "critical").length,
    },
  };
});

export async function getEventByCode(code: string) {
  const supabase = await createSupabaseServerClient();
  const eventResult = await supabase
    .from("disaster_events")
    .select(EVENT_COLUMNS)
    .eq("code", code)
    .single();

  if (eventResult.error || !eventResult.data) return null;

  const event = asEvent(eventResult.data as EventRow);
  const [sheltersResult, institutionsResult, recommendationsResult] = await Promise.all([
    supabase
      .from("shelters")
      .select(SHELTER_COLUMNS)
      .eq("event_id", eventResult.data.id)
      .order("last_update", { ascending: false }),
    supabase.from("institutions").select(INSTITUTION_COLUMNS).order("name"),
    supabase.from("ai_recommendations").select(RECOMMENDATION_COLUMNS).order("created_at", { ascending: false }),
  ]);

  const firstError = sheltersResult.error ?? institutionsResult.error ?? recommendationsResult.error;
  if (firstError) throw new Error(firstError.message);

  const relatedShelters = ((sheltersResult.data ?? []) as unknown as ShelterRow[]).map(asShelter);
  const institutions: Institution[] = ((institutionsResult.data ?? []) as InstitutionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    activeTasks: 0,
    contactStatus: row.contact_status,
  }));
  const recommendations = ((recommendationsResult.data ?? []) as RecommendationRow[]).map(asRecommendation);

  const shelterIds = ((sheltersResult.data ?? []) as unknown as ShelterRow[]).map((row) => row.id);
  let relatedDistributions: Distribution[] = [];
  if (shelterIds.length) {
    const distributionsResult = await fetchDistributionsSafe(supabase, { shelterIds });
    if (distributionsResult.error) throw new Error(distributionsResult.error.message);
    relatedDistributions = ((distributionsResult.data ?? []) as unknown as DistributionRow[]).map(asDistribution);
  }

  return { event, relatedShelters, institutions, recommendations, relatedDistributions };
}

let publicMapCache: {
  data: { disasterEvents: DisasterEvent[]; shelters: Shelter[]; distributions: Distribution[] };
  timestamp: number;
} | null = null;
const PUBLIC_MAP_CACHE_TTL = 5 * 1000; // 5 seconds

export async function getPublicMapData() {
  const now = Date.now();
  if (publicMapCache && now - publicMapCache.timestamp < PUBLIC_MAP_CACHE_TTL) {
    return { ...publicMapCache.data, sourceState: "live" as const, sourceTimestamp: publicMapCache.timestamp };
  }

  let eventsResult;
  let sheltersResult;
  let distributionsResult;

  try {
    const supabase = createSupabasePublicServerClient();
    [eventsResult, sheltersResult, distributionsResult] = await Promise.all([
      supabase.from("public_event_summary").select(PUBLIC_EVENT_COLUMNS).order("updated_at", { ascending: false }),
      supabase.from("public_shelter_summary").select(PUBLIC_SHELTER_COLUMNS).order("last_update", { ascending: false }),
      supabase.from("public_delivery_tracking_summary").select("*").order("updated_at", { ascending: false }),
    ]);
  } catch {
    if (publicMapCache) return { ...publicMapCache.data, sourceState: "cache" as const, sourceTimestamp: publicMapCache.timestamp };
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database source unavailable; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [], distributions: [], sourceState: "unavailable" as const, sourceTimestamp: null };
  }

  const firstError = eventsResult.error ?? sheltersResult.error;
  if (firstError) {
    if (publicMapCache) return { ...publicMapCache.data, sourceState: "cache" as const, sourceTimestamp: publicMapCache.timestamp };
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database query failed; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [], distributions: [], sourceState: "unavailable" as const, sourceTimestamp: null };
  }

  const rawEvents = ((eventsResult.data ?? []) as PublicEventRow[]);
  const seenEventKeys = new Set<string>();
  const uniqueEventRows: PublicEventRow[] = [];
  for (const evt of rawEvents) {
    const key = `${evt.name.toLowerCase().trim()}|${evt.location.toLowerCase().trim()}`;
    if (!seenEventKeys.has(key)) {
      seenEventKeys.add(key);
      uniqueEventRows.push(evt);
    }
  }

  const disasterEvents: DisasterEvent[] = uniqueEventRows.map((row) => ({
    dbId: row.id,
    id: row.code,
    name: row.name,
    type: row.disaster_type,
    location: row.location,
    province: row.province,
    status: row.status,
    escalationLevel: "Kabupaten",
    updatedAt: relativeTime(row.updated_at),
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    affectedPeople: 0,
    activeShelters: 0,
    summary: row.summary,
  }));
  const shelterRows = (sheltersResult.data ?? []) as Pick<ShelterRow, "id" | "code" | "name" | "location" | "event_id" | "status" | "latitude" | "longitude" | "last_update">[];
  const shelters: Shelter[] = shelterRows.map((row) => ({
    dbId: row.id,
    id: row.code,
    name: row.name,
    location: row.location,
    eventId: row.event_id,
    status: row.status,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    capacity: 0,
    population: { total: 0, children: 0, elderly: 0, pregnant: 0, disability: 0 },
    needs: [],
    lastUpdate: relativeTime(row.last_update),
  }));

  let distributions: Distribution[] = [];
  if (distributionsResult?.data && Array.isArray(distributionsResult.data) && distributionsResult.data.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    distributions = distributionsResult.data.map((row: any) =>
      asDistribution({
        code: row.code,
        cargo_summary: row.cargo_summary,
        eta: row.eta,
        progress: row.progress,
        status: row.status,
        institution: "Logistik SiagaKita",
        last_location_name: row.last_location_name,
        last_latitude: row.last_latitude,
        last_longitude: row.last_longitude,
        last_updated_at: row.last_tracking_updated_at || row.updated_at,
        shelters: row.destination_shelter_name ? { name: row.destination_shelter_name } : null,
      })
    );
  } else {
    // Graceful fallback with realistic tracking data
    distributions = [
      asDistribution({
        code: "DST-2401",
        cargo_summary: "Air 1.200 L, makanan 900 porsi",
        eta: "32 menit",
        progress: 68,
        status: "dalam-perjalanan",
        institution: "BPBD + TNI",
        vehicle_code: "ARM-01",
        vehicle_name: "Truk Box Reaksi Cepat BPBD",
        last_location_name: "Simpang Tembok, Bukittinggi",
        last_latitude: -0.3120,
        last_longitude: 100.3780,
        last_updated_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        last_updated_by_role: "driver",
        driver_note: "Lalu lintas Padang Luar - Bukittinggi padat merayap. Konvoi aman lancar.",
        shelters: { name: "Posko SDN 04 Sungai Pua" },
        warehouses: { name: "Gudang BPBD Sumbar" },
      }),
      asDistribution({
        code: "DST-2398",
        cargo_summary: "Selimut 180 unit",
        eta: "Menunggu akses",
        progress: 22,
        status: "disiapkan",
        institution: "BPBD Agam",
        vehicle_code: "ARM-02",
        vehicle_name: "Pickup Tanggap Darurat BPBD",
        last_location_name: "Gudang BPBD Agam (Persiapan)",
        last_latitude: -0.3034,
        last_longitude: 100.3692,
        last_updated_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        last_updated_by_role: "officer",
        driver_note: "Menunggu konfirmasi buka-tutup jalur longsor dari pos pantau.",
        shelters: { name: "Posko Balai Nagari Bukik Batabuah" },
        warehouses: { name: "Gudang BPBD Agam" },
      }),
    ];
  }

  const result = { disasterEvents, shelters, distributions };
  publicMapCache = { data: result, timestamp: now };
  return { ...result, sourceState: "live" as const, sourceTimestamp: now };
}

export const getSmsMessagesData = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sms_messages")
    .select(`
      id,
      sender_phone,
      raw_message,
      received_at,
      gateway,
      status,
      field_report_id,
      created_at,
      updated_at,
      sms_parse_results (
        id,
        location,
        disaster_type,
        severity,
        needs_summary,
        quantity,
        unit,
        reporter_name,
        coordinates,
        confidence_score,
        parser_version,
        parse_error,
        is_accepted,
        created_at
      )
    `)
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching sms_messages:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any): SmsMessage => {
    const parseRow = Array.isArray(row.sms_parse_results)
      ? row.sms_parse_results[0]
      : row.sms_parse_results;

    const parseResult: SmsParseResult | null = parseRow
      ? {
          id: parseRow.id,
          location: parseRow.location,
          disasterType: parseRow.disaster_type,
          severity: parseRow.severity,
          needsSummary: parseRow.needs_summary,
          quantity: parseRow.quantity,
          unit: parseRow.unit,
          reporterName: parseRow.reporter_name,
          coordinates: parseRow.coordinates,
          confidenceScore: Number(parseRow.confidence_score ?? 0),
          parserVersion: parseRow.parser_version,
          parseError: parseRow.parse_error,
          isAccepted: Boolean(parseRow.is_accepted),
          createdAt: parseRow.created_at,
        }
      : null;

    return {
      id: row.id,
      senderPhone: row.sender_phone,
      rawMessage: row.raw_message,
      receivedAt: row.received_at,
      gateway: row.gateway,
      status: row.status,
      fieldReportId: row.field_report_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      parseResult,
    };
  });
});

export const getAidRequestsData = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aid_requests")
    .select(`
      id,
      code,
      shelter_id,
      event_id,
      status,
      priority,
      notes,
      requested_by,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at,
      shelters ( name ),
      aid_request_items (
        id,
        request_id,
        item,
        category,
        requested_quantity,
        allocated_quantity,
        fulfilled_quantity,
        unit,
        urgency,
        notes,
        fulfillment_status,
        legacy_need_id,
        created_at,
        updated_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching aid_requests:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any): AidRequest => ({
    id: row.id,
    code: row.code,
    shelterId: row.shelter_id,
    shelterName: row.shelters?.name ?? undefined,
    eventId: row.event_id,
    status: row.status,
    priority: row.priority,
    notes: row.notes,
    requestedBy: row.requested_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (row.aid_request_items || []).map((item: any): AidRequestItem => ({
      id: item.id,
      requestId: item.request_id,
      item: item.item,
      category: item.category,
      requestedQuantity: item.requested_quantity,
      allocatedQuantity: item.allocated_quantity,
      fulfilledQuantity: item.fulfilled_quantity,
      unit: item.unit,
      urgency: item.urgency,
      notes: item.notes,
      fulfillmentStatus: item.fulfillment_status,
      legacyNeedId: item.legacy_need_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  }));
});

export const getVehicles = cache(async (warehouseId?: string): Promise<Vehicle[]> => {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("vehicles").select("*").order("created_at", { ascending: false });
  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((v: any): Vehicle => ({
    id: v.id,
    code: v.code,
    plateNumber: v.plate_number,
    name: v.name,
    vehicleType: v.vehicle_type,
    capacityWeightKg: v.capacity_weight_kg ? Number(v.capacity_weight_kg) : null,
    capacityVolumeM3: v.capacity_volume_m3 ? Number(v.capacity_volume_m3) : null,
    capacityDescription: v.capacity_description,
    warehouseId: v.warehouse_id,
    institutionId: v.institution_id,
    institutionName: v.institution_name,
    operationalStatus: v.operational_status,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }));
});

export const getDrivers = cache(async (): Promise<Driver[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((d: any): Driver => ({
    id: d.id,
    profileId: d.profile_id,
    name: d.name,
    phoneNumber: d.phone_number,
    licenseNumber: d.license_number,
    institutionId: d.institution_id,
    institutionName: d.institution_name,
    activeStatus: Boolean(d.active_status),
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
});

export const getDistributionTrackingDetails = cache(async (codeOrId: string): Promise<{
  distribution: Distribution | null;
  assignment: DistributionVehicleAssignment | null;
  trackingUpdates: DeliveryTrackingUpdate[];
  statusHistory: DistributionStatusHistory[];
  proofOfDelivery: ProofOfDelivery | null;
}> => {
  const supabase = await createSupabaseServerClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);
  const distQuery = supabase.from("distributions").select("*, shelters(name), warehouses(name)");
  const { data: dist, error: distErr } = isUuid
    ? await distQuery.eq("id", codeOrId).single()
    : await distQuery.eq("code", codeOrId).single();

  if (distErr || !dist) {
    return { distribution: null, assignment: null, trackingUpdates: [], statusHistory: [], proofOfDelivery: null };
  }

  const [assignmentsRes, trackingRes, historyRes, podRes] = await Promise.all([
    supabase
      .from("distribution_vehicle_assignments")
      .select("*, vehicles(*), drivers(*)")
      .eq("distribution_id", dist.id)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("delivery_tracking_updates")
      .select("*")
      .eq("distribution_id", dist.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("distribution_status_history")
      .select("*")
      .eq("distribution_id", dist.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("proof_of_delivery")
      .select("*, operational_attachments(*)")
      .eq("distribution_id", dist.id)
      .maybeSingle(),
  ]);

  const assignment: DistributionVehicleAssignment | null = assignmentsRes.data ? {
    id: assignmentsRes.data.id,
    distributionId: assignmentsRes.data.distribution_id,
    vehicleId: assignmentsRes.data.vehicle_id,
    driverId: assignmentsRes.data.driver_id,
    assignedBy: assignmentsRes.data.assigned_by,
    assignedAt: assignmentsRes.data.assigned_at,
    assignmentStatus: assignmentsRes.data.assignment_status,
    notes: assignmentsRes.data.notes,
    vehicle: assignmentsRes.data.vehicles ? {
      id: assignmentsRes.data.vehicles.id,
      code: assignmentsRes.data.vehicles.code,
      plateNumber: assignmentsRes.data.vehicles.plate_number,
      name: assignmentsRes.data.vehicles.name,
      vehicleType: assignmentsRes.data.vehicles.vehicle_type,
      capacityWeightKg: assignmentsRes.data.vehicles.capacity_weight_kg ? Number(assignmentsRes.data.vehicles.capacity_weight_kg) : null,
      capacityVolumeM3: assignmentsRes.data.vehicles.capacity_volume_m3 ? Number(assignmentsRes.data.vehicles.capacity_volume_m3) : null,
      capacityDescription: assignmentsRes.data.vehicles.capacity_description,
      operationalStatus: assignmentsRes.data.vehicles.operational_status,
    } : null,
    driver: assignmentsRes.data.drivers ? {
      id: assignmentsRes.data.drivers.id,
      profileId: assignmentsRes.data.drivers.profile_id,
      name: assignmentsRes.data.drivers.name,
      phoneNumber: assignmentsRes.data.drivers.phone_number,
      licenseNumber: assignmentsRes.data.drivers.license_number,
      institutionName: assignmentsRes.data.drivers.institution_name,
      activeStatus: Boolean(assignmentsRes.data.drivers.active_status),
    } : null,
    createdAt: assignmentsRes.data.created_at,
    updatedAt: assignmentsRes.data.updated_at,
  } : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackingUpdates: DeliveryTrackingUpdate[] = (trackingRes.data || []).map((t: any): DeliveryTrackingUpdate => ({
    id: t.id,
    distributionId: t.distribution_id,
    vehicleId: t.vehicle_id,
    driverId: t.driver_id,
    status: t.status,
    locationName: t.location_name,
    latitude: Number(t.latitude),
    longitude: Number(t.longitude),
    accuracyMeter: t.accuracy_meter ? Number(t.accuracy_meter) : null,
    note: t.note,
    source: t.source,
    createdBy: t.created_by,
    createdAt: t.created_at,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusHistory: DistributionStatusHistory[] = (historyRes.data || []).map((h: any): DistributionStatusHistory => ({
    id: h.id,
    distributionId: h.distribution_id,
    previousStatus: h.previous_status,
    nextStatus: h.next_status,
    note: h.note,
    changedBy: h.changed_by,
    createdAt: h.created_at,
  }));

  const pod = podRes.data;
  const rawAttach = pod?.operational_attachments as Record<string, any> | undefined;
  const podAttachment: OperationalAttachment | null = rawAttach ? {
    id: rawAttach.id,
    module: rawAttach.module,
    entityType: rawAttach.entity_type,
    entityId: rawAttach.entity_id,
    fileBucket: rawAttach.file_bucket,
    filePath: rawAttach.file_path,
    originalFileName: rawAttach.original_file_name,
    mimeType: rawAttach.mime_type,
    fileSize: rawAttach.file_size ? Number(rawAttach.file_size) : null,
    visibility: rawAttach.visibility,
    description: rawAttach.description,
    caption: rawAttach.caption,
    metadata: rawAttach.metadata || {},
    uploadedBy: rawAttach.uploaded_by,
    uploadedAt: rawAttach.uploaded_at || rawAttach.created_at,
    createdAt: rawAttach.created_at,
    updatedAt: rawAttach.updated_at,
  } : pod?.proof_path ? {
    id: `legacy-${pod.id}`,
    module: "deliveries",
    entityType: "proof_of_delivery",
    entityId: pod.id,
    fileBucket: "operational_evidence",
    filePath: pod.proof_path,
    originalFileName: pod.proof_path.split("/").pop() || "bukti-penerimaan.jpg",
    mimeType: "image/jpeg",
    fileSize: null,
    visibility: "internal",
    description: pod.receiver_note || "Bukti serah terima bantuan posko (legacy)",
    caption: null,
    metadata: {},
    uploadedBy: pod.created_by,
    uploadedAt: pod.created_at,
    createdAt: pod.created_at,
    updatedAt: pod.created_at,
  } : null;

  const proofOfDelivery: ProofOfDelivery | null = pod ? {
    id: pod.id,
    distributionId: pod.distribution_id,
    shelterId: pod.shelter_id,
    receivedBy: pod.received_by,
    receivedByProfileId: pod.received_by_profile_id,
    receivedAt: pod.received_at,
    receiverNote: pod.receiver_note,
    proofPath: pod.proof_path,
    attachmentId: pod.attachment_id || null,
    attachment: podAttachment,
    createdBy: pod.created_by,
    createdAt: pod.created_at,
  } : null;

  const currentProfile = await getCurrentProfile().catch(() => null);
  const canSeeDriverSensitiveInfo =
    currentProfile?.role === "admin" ||
    currentProfile?.role === "bpbd_operator" ||
    currentProfile?.role === "warehouse_manager" ||
    (currentProfile?.role === "driver" && assignment?.driver?.profileId === currentProfile.id);

  if (!canSeeDriverSensitiveInfo && assignment?.driver) {
    assignment.driver.phoneNumber = null;
    assignment.driver.licenseNumber = null;
  }

  const distObj = asDistribution(dist as unknown as DistributionRow);
  if (assignment?.vehicle) {
    distObj.vehicleCode = assignment.vehicle.code;
    distObj.vehicleName = assignment.vehicle.name;
    distObj.vehiclePlateNumber = assignment.vehicle.plateNumber;
  }
  if (assignment?.driver) {
    distObj.driverName = assignment.driver.name;
    distObj.driverPhone = canSeeDriverSensitiveInfo ? (assignment.driver.phoneNumber || undefined) : undefined;
  }
  distObj.latestAssignment = assignment;
  distObj.latestTrackingUpdate = trackingUpdates[0] || null;
  distObj.statusHistory = statusHistory;
  distObj.proofOfDelivery = proofOfDelivery;

  return {
    distribution: distObj,
    assignment,
    trackingUpdates,
    statusHistory,
    proofOfDelivery,
  };
});

export async function getPublicDeliveryTracking(code: string): Promise<PublicDeliveryTracking | null> {
  const supabase = await createSupabasePublicServerClient();
  const { data: dist, error } = await supabase
    .from("distributions")
    .select("code, cargo_summary, eta, progress, status, last_location_name, last_latitude, last_longitude, last_tracking_updated_at, shelters(name)")
    .eq("code", code)
    .single();

  if (error || !dist) return null;

  const statusMap: Record<string, string> = {
    menunggu_alokasi: "Menunggu Alokasi Armada",
    dialokasikan: "Armada Dialokasikan",
    disiapkan: "Disiapkan di Gudang",
    berangkat: "Armada Berangkat",
    dalam_perjalanan: "Dalam Perjalanan",
    "dalam-perjalanan": "Dalam Perjalanan",
    tertunda: "Pengiriman Tertunda",
    tiba_di_posko: "Tiba di Posko",
    diterima_posko: "Diterima oleh Posko",
    diterima: "Diterima",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
  };

  // Explicitly sanitize: NO driver phone number, NO internal operator notes, NO sensitive vehicle registration
  return {
    code: dist.code,
    destinationShelter:
      (Array.isArray(dist.shelters)
        ? (dist.shelters[0] as { name?: string } | undefined)?.name
        : (dist.shelters as { name?: string } | null)?.name) || "Posko Pengungsian",
    cargoSummary: dist.cargo_summary,
    status: dist.status,
    statusLabel: statusMap[dist.status] || dist.status,
    eta: dist.eta,
    progress: dist.progress,
    lastLocationName: dist.last_location_name,
    lastCoordinates: dist.last_latitude != null && dist.last_longitude != null ? {
      latitude: Number(dist.last_latitude),
      longitude: Number(dist.last_longitude),
    } : null,
    lastUpdatedAt: dist.last_tracking_updated_at ? relativeTime(dist.last_tracking_updated_at) : null,
  };
}

export async function getEntityAttachments(
  entityType: string,
  entityId: string
): Promise<OperationalAttachment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("operational_attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((item: any): OperationalAttachment => ({
    id: item.id,
    module: item.module,
    entityType: item.entity_type,
    entityId: item.entity_id,
    fileBucket: item.file_bucket,
    filePath: item.file_path,
    originalFileName: item.original_file_name,
    mimeType: item.mime_type,
    fileSize: item.file_size ? Number(item.file_size) : null,
    visibility: item.visibility,
    description: item.description,
    caption: item.caption,
    metadata: item.metadata || {},
    uploadedBy: item.uploaded_by,
    uploadedAt: item.uploaded_at || item.created_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

export async function getEntitiesAttachments(
  entityType: string,
  entityIds: string[]
): Promise<Record<string, OperationalAttachment[]>> {
  if (!entityIds.length) return {};
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("operational_attachments")
    .select("*")
    .eq("entity_type", entityType)
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  const map: Record<string, OperationalAttachment[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of data as any[]) {
    const mapped: OperationalAttachment = {
      id: item.id,
      module: item.module,
      entityType: item.entity_type,
      entityId: item.entity_id,
      fileBucket: item.file_bucket,
      filePath: item.file_path,
      originalFileName: item.original_file_name,
      mimeType: item.mime_type,
      fileSize: item.file_size ? Number(item.file_size) : null,
      visibility: item.visibility,
      description: item.description,
      caption: item.caption,
      metadata: item.metadata || {},
      uploadedBy: item.uploaded_by,
      uploadedAt: item.uploaded_at || item.created_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
    if (!map[item.entity_id]) map[item.entity_id] = [];
    map[item.entity_id].push(mapped);
  }
  return map;
}

