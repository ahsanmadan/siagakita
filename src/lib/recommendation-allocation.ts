import type { AIRecommendation, Inventory, Shelter } from "@/lib/types";

export type AllocationPrefill = {
  shelterCode: string;
  shelterName: string;
  inventoryItemId: string;
  inventoryLabel: string;
  quantity: number;
  unit: string;
  eta: string;
};

function haystackOf(recommendation: AIRecommendation) {
  return [recommendation.title, recommendation.rationale, recommendation.action, ...recommendation.factors]
    .join(" ")
    .toLowerCase();
}

function availableOf(item: Inventory) {
  return Math.max(0, item.stock - item.reserved);
}

function matchShelter(recommendation: AIRecommendation, shelters: Shelter[]) {
  const byId = shelters.find((shelter) => shelter.dbId === recommendation.shelterId);
  if (byId) return byId;

  const haystack = haystackOf(recommendation);
  const byName = shelters.find((shelter) => haystack.includes(shelter.name.toLowerCase()));
  if (byName) return byName;

  const critical = [...shelters].sort((a, b) => {
    const gap = (shelter: Shelter) =>
      shelter.needs.reduce((total, need) => total + Math.max(0, need.requested - need.available), 0);
    return gap(b) - gap(a);
  })[0];

  return critical ?? null;
}

function matchInventory(recommendation: AIRecommendation, inventory: Inventory[], shelter: Shelter | null) {
  const haystack = haystackOf(recommendation);
  const usable = inventory.filter((item) => availableOf(item) > 0);
  const pool = usable.length ? usable : inventory;

  const mentioned = pool.find((item) => haystack.includes(item.item.toLowerCase()));
  if (mentioned) return mentioned;

  const categoryMatch = pool.find((item) => haystack.includes(item.category.toLowerCase()));
  if (categoryMatch) return categoryMatch;

  if (shelter) {
    const topNeed = [...shelter.needs]
      .sort((a, b) => b.requested - b.available - (a.requested - a.available))
      .find((need) => pool.some((item) => item.item.toLowerCase() === need.item.toLowerCase()));

    if (topNeed) {
      const matched = pool.find((item) => item.item.toLowerCase() === topNeed.item.toLowerCase());
      if (matched) return matched;
    }
  }

  return pool[0] ?? null;
}

function matchQuantity(recommendation: AIRecommendation, shelter: Shelter | null, item: Inventory | null) {
  const need = shelter?.needs.find(
    (candidate) => item && candidate.item.toLowerCase() === item.item.toLowerCase(),
  );
  const gap = need ? Math.max(0, need.requested - need.available) : 0;
  const parsed = Number(haystackOf(recommendation).match(/(\d[\d.]*)\s*(paket|unit|liter|dus|kg|box)/)?.[1]?.replace(/\./g, "") ?? 0);
  const wanted = gap || parsed || 100;
  const ceiling = item ? availableOf(item) : wanted;

  return Math.max(1, ceiling > 0 ? Math.min(wanted, ceiling) : wanted);
}

export function buildAllocationPrefill(
  recommendation: AIRecommendation,
  shelters: Shelter[],
  inventory: Inventory[],
): AllocationPrefill | null {
  const shelter = matchShelter(recommendation, shelters);
  const item = matchInventory(recommendation, inventory, shelter);
  if (!shelter || !item) return null;

  return {
    shelterCode: shelter.id,
    shelterName: shelter.name,
    inventoryItemId: item.id,
    inventoryLabel: `${item.item} · ${item.warehouse}`,
    quantity: matchQuantity(recommendation, shelter, item),
    unit: item.unit,
    eta: "Hari ini 18.00 WIB",
  };
}
