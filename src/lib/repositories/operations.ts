import type {
  AIRecommendation,
  DisasterEvent,
  Distribution,
  FieldReport,
  Institution,
  Inventory,
  Shelter,
} from "@/lib/types";
import { cache } from "react";
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
const DISTRIBUTION_COLUMNS = "code, cargo_summary, eta, progress, status, institution, shelters(name), warehouses(name)";
const REPORT_COLUMNS = "code, channel, location, reporter, received_at, summary, status, severity";
const INSTITUTION_COLUMNS = "id, name, role, contact_status";
const RECOMMENDATION_COLUMNS = "id, event_id, shelter_id, title, rationale, confidence, priority, action, factors, source";

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

function asDistribution(row: DistributionRow): Distribution {
  return {
    id: row.code,
    destination: row.shelters?.name ?? "Tujuan belum dipilih",
    origin: row.warehouses?.name ?? "Gudang belum dipilih",
    cargo: row.cargo_summary,
    eta: row.eta,
    progress: row.progress,
    status: row.status,
    institution: row.institution,
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
      supabase.from("distributions").select(DISTRIBUTION_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("field_reports").select(REPORT_COLUMNS).order("received_at", { ascending: false }),
      supabase.from("institutions").select(INSTITUTION_COLUMNS).order("name"),
      supabase.from("ai_recommendations").select(RECOMMENDATION_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("third_party_aids").select("id, source_name, cargo, quantity, unit, status, warehouse_id, created_at, updated_at, warehouses(name, level)").order("created_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, level").order("name"),
    ]);

  const firstError = [eventsResult, sheltersResult, inventoryResult, distributionsResult, reportsResult, institutionsResult, recommendationsResult, aidsResult, warehousesResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const disasterEvents = ((eventsResult.data ?? []) as EventRow[]).map(asEvent);
  const shelters = ((sheltersResult.data ?? []) as unknown as ShelterRow[]).map(asShelter);
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
    const distributionsResult = await supabase
      .from("distributions")
      .select(DISTRIBUTION_COLUMNS)
      .in("destination_shelter_id", shelterIds)
      .order("created_at", { ascending: false });

    if (distributionsResult.error) throw new Error(distributionsResult.error.message);
    relatedDistributions = ((distributionsResult.data ?? []) as unknown as DistributionRow[]).map(asDistribution);
  }

  return { event, relatedShelters, institutions, recommendations, relatedDistributions };
}

let publicMapCache: {
  data: { disasterEvents: DisasterEvent[]; shelters: Shelter[] };
  timestamp: number;
} | null = null;
const PUBLIC_MAP_CACHE_TTL = 5 * 1000; // 5 seconds

export async function getPublicMapData() {
  const now = Date.now();
  if (publicMapCache && now - publicMapCache.timestamp < PUBLIC_MAP_CACHE_TTL) {
    return publicMapCache.data;
  }

  let eventsResult;
  let sheltersResult;

  try {
    const supabase = createSupabasePublicServerClient();
    [eventsResult, sheltersResult] = await Promise.all([
      supabase.from("public_event_summary").select(PUBLIC_EVENT_COLUMNS).order("updated_at", { ascending: false }),
      supabase.from("public_shelter_summary").select(PUBLIC_SHELTER_COLUMNS).order("last_update", { ascending: false }),
    ]);
  } catch {
    if (publicMapCache) return publicMapCache.data;
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database source unavailable; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [] };
  }

  const firstError = eventsResult.error ?? sheltersResult.error;
  if (firstError) {
    if (publicMapCache) return publicMapCache.data;
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database query failed; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [] };
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

  const result = { disasterEvents, shelters };
  publicMapCache = { data: result, timestamp: now };
  return result;
}
