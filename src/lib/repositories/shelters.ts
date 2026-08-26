import { getOperationsData } from "@/lib/repositories/operations";

export async function getSheltersRepositoryData() {
  const data = await getOperationsData();
  return {
    shelters: data.shelters,
    recommendations: data.recommendations,
  };
}
