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
      supabase.from("disaster_events").select("*").eq("state", "active").order("updated_at", { ascending: false }),
      supabase.from("shelters").select("*, disaster_events(code), needs(*)").order("last_update", { ascending: false }),
      supabase.from("inventory_items").select("*, warehouses(name, level)").order("created_at"),
      supabase.from("distributions").select("*, shelters(name), warehouses(name)").order("created_at", { ascending: false }),
      supabase.from("field_reports").select("*").order("received_at", { ascending: false }),
      supabase.from("institutions").select("*").order("name"),
      supabase.from("ai_recommendations").select("*").order("created_at", { ascending: false }),
      supabase.from("third_party_aids").select("id, source_name, cargo, quantity, unit, status, warehouse_id, created_at, updated_at, warehouses(name, level)").order("created_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, level").order("name"),
    ]);

  const firstError = [eventsResult, sheltersResult, inventoryResult, distributionsResult, reportsResult, institutionsResult, recommendationsResult, aidsResult, warehousesResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const disasterEvents = ((eventsResult.data ?? []) as EventRow[]).map(asEvent);
  const shelters = ((sheltersResult.data ?? []) as ShelterRow[]).map(asShelter);
  const inventory = ((inventoryResult.data ?? []) as InventoryRow[]).map(asInventory);
  const distributions = ((distributionsResult.data ?? []) as DistributionRow[]).map(asDistribution);
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
    .select("*")
    .eq("code", code)
    .single();

  if (eventResult.error || !eventResult.data) return null;

  const event = asEvent(eventResult.data as EventRow);
  const [sheltersResult, institutionsResult, recommendationsResult] = await Promise.all([
    supabase
      .from("shelters")
      .select("*, disaster_events(code), needs(*)")
      .eq("event_id", eventResult.data.id)
      .order("last_update", { ascending: false }),
    supabase.from("institutions").select("*").order("name"),
    supabase.from("ai_recommendations").select("*").order("created_at", { ascending: false }),
  ]);

  const firstError = sheltersResult.error ?? institutionsResult.error ?? recommendationsResult.error;
  if (firstError) throw new Error(firstError.message);

  const relatedShelters = ((sheltersResult.data ?? []) as ShelterRow[]).map(asShelter);
  const institutions: Institution[] = ((institutionsResult.data ?? []) as InstitutionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    activeTasks: 0,
    contactStatus: row.contact_status,
  }));
  const recommendations = ((recommendationsResult.data ?? []) as RecommendationRow[]).map(asRecommendation);

  return { event, relatedShelters, institutions, recommendations };
}

export async function getPublicMapData() {
  let eventsResult;
  let sheltersResult;

  try {
    const supabase = createSupabasePublicServerClient();
    [eventsResult, sheltersResult] = await Promise.all([
      supabase.from("public_event_summary").select("*").order("updated_at", { ascending: false }),
      supabase.from("public_shelter_summary").select("*").order("last_update", { ascending: false }),
    ]);
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database source unavailable; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [] };
  }

  const firstError = eventsResult.error ?? sheltersResult.error;
  if (firstError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Public map database query failed; showing public fallback data.");
    }
    return { disasterEvents: [], shelters: [] };
  }

  const disasterEvents = ((eventsResult.data ?? []) as EventRow[]).map(asEvent);
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

  return { disasterEvents, shelters };
}
