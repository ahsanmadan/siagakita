import { getEventByCode, getOperationsData } from "@/lib/repositories/operations";

export async function getEventsRepositoryData() {
  const data = await getOperationsData();
  return {
    disasterEvents: data.disasterEvents,
    institutions: data.institutions,
    metrics: data.metrics,
  };
}

export { getEventByCode };
