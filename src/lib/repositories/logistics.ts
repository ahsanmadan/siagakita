import { getOperationsData } from "@/lib/repositories/operations";

export async function getLogisticsRepositoryData() {
  const data = await getOperationsData();
  return {
    distributions: data.distributions,
    inventory: data.inventory,
    shelters: data.shelters,
    thirdPartyAids: data.thirdPartyAids,
  };
}
