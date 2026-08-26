import type { AIRecommendation, Shelter } from "@/lib/types";

const priorityScore: Record<AIRecommendation["priority"], number> = {
  critical: 4,
  major: 3,
  warning: 2,
  safe: 1,
};

function byPriority(a: AIRecommendation, b: AIRecommendation) {
  return priorityScore[b.priority] - priorityScore[a.priority] || b.confidence - a.confidence;
}

function includesAny(recommendation: AIRecommendation, keywords: string[]) {
  const haystack = [
    recommendation.title,
    recommendation.rationale,
    recommendation.action,
    ...recommendation.factors,
  ].join(" ").toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
}

export function pickSystemRecommendation(recommendations: AIRecommendation[]) {
  return [...recommendations].sort(byPriority)[0] ?? null;
}

export function pickShelterRecommendation(recommendations: AIRecommendation[], shelters: Shelter[]) {
  const shelterIds = new Set(shelters.map((shelter) => shelter.dbId));
  const contextual = recommendations.filter((recommendation) => {
    if (recommendation.shelterId && shelterIds.has(recommendation.shelterId)) return true;
    return includesAny(recommendation, ["posko", "pengungsi", "rentan", "kebutuhan"]);
  });

  return contextual.sort(byPriority)[0] ?? null;
}

export function pickEventRecommendation(recommendations: AIRecommendation[], eventDbId: string, shelters: Shelter[]) {
  const shelterIds = new Set(shelters.map((shelter) => shelter.dbId));
  const contextual = recommendations.filter((recommendation) => {
    if (recommendation.eventId === eventDbId) return true;
    if (recommendation.shelterId && shelterIds.has(recommendation.shelterId)) return true;
    return false;
  });

  return contextual.sort(byPriority)[0] ?? null;
}

export function pickLogisticsRecommendation(recommendations: AIRecommendation[]) {
  const contextual = recommendations.filter((recommendation) =>
    includesAny(recommendation, ["logistik", "stok", "gudang", "alokasi", "distribusi", "pengiriman"])
  );

  return contextual.sort(byPriority)[0] ?? null;
}
