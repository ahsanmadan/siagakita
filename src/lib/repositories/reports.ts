import { getOperationsData } from "@/lib/repositories/operations";

export async function getReportsRepositoryData() {
  const data = await getOperationsData();
  return {
    fieldReports: data.fieldReports,
    metrics: data.metrics,
  };
}
