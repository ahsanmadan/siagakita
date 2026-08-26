import { getOperationsData } from "@/lib/repositories/operations";

export async function getRecommendationsRepositoryData() {
  const data = await getOperationsData();
  return {
    recommendations: data.recommendations,
  };
}
