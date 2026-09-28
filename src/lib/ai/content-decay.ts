/**
 * Content Decay Detector — section 7 of the spec.
 * Analyzes traffic/ranking trends + article age to compute a decayScore
 * (stored on Article.decayScore) and propose concrete update actions.
 */

export interface DecaySignals {
  articleId: string;
  daysSinceLastUpdate: number;
  clicksLast28d: number;
  clicksPrevious28d: number; // the 28 days before that, for trend comparison
  avgPositionNow: number;
  avgPositionPrevious: number;
  impressionsLast28d: number;
  ctrLast28d: number; // 0-1
  expectedCtrForPosition: number; // 0-1, benchmark CTR curve for avgPositionNow
  competitorContentRefreshedRecently: boolean;
}

export interface DecayResult {
  articleId: string;
  decayScore: number; // 0-100, higher = more urgent
  trafficTrendPct: number; // negative = declining
  positionTrend: number; // positive = dropped further down the results
  proposedActions: string[];
  urgency: "none" | "monitor" | "update" | "urgent";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function detectDecay(s: DecaySignals): DecayResult {
  const trafficTrendPct =
    s.clicksPrevious28d === 0
      ? s.clicksLast28d === 0
        ? 0
        : 100
      : Math.round(((s.clicksLast28d - s.clicksPrevious28d) / s.clicksPrevious28d) * 100);

  const positionTrend = Math.round((s.avgPositionNow - s.avgPositionPrevious) * 10) / 10; // +ve = worse

  let decayScore = 0;

  // Traffic decline is the strongest signal.
  if (trafficTrendPct < 0) decayScore += clamp(Math.abs(trafficTrendPct)) * 0.4;

  // Ranking decline.
  if (positionTrend > 0) decayScore += clamp(positionTrend * 8) * 0.25;

  // Staleness by age, with diminishing marginal urgency after ~2 years.
  const ageScore = clamp((s.daysSinceLastUpdate / 730) * 100);
  decayScore += ageScore * 0.15;

  // Underperforming CTR relative to position benchmark.
  if (s.expectedCtrForPosition > 0) {
    const ctrGap = clamp(((s.expectedCtrForPosition - s.ctrLast28d) / s.expectedCtrForPosition) * 100);
    decayScore += ctrGap * 0.1;
  }

  if (s.competitorContentRefreshedRecently) decayScore += 10;

  decayScore = clamp(Math.round(decayScore));

  const proposedActions: string[] = [];
  if (trafficTrendPct < -20) proposedActions.push("Rewrite the introduction and refresh outdated sections — traffic has dropped sharply.");
  if (positionTrend > 3) proposedActions.push("Expand content depth and add missing subtopics competitors now cover.");
  if (s.daysSinceLastUpdate > 365) proposedActions.push("Update statistics, examples, and any year-specific references.");
  if (s.ctrLast28d < s.expectedCtrForPosition * 0.7) proposedActions.push("Rewrite the meta title/description — CTR is below benchmark for its ranking position.");
  if (s.competitorContentRefreshedRecently) proposedActions.push("A competitor recently refreshed their version — review for new angles or FAQs to add.");
  if (proposedActions.length === 0) proposedActions.push("Add 2-3 new FAQs and refresh internal links to newer articles.");

  let urgency: DecayResult["urgency"];
  if (decayScore >= 70) urgency = "urgent";
  else if (decayScore >= 45) urgency = "update";
  else if (decayScore >= 25) urgency = "monitor";
  else urgency = "none";

  return {
    articleId: s.articleId,
    decayScore,
    trafficTrendPct,
    positionTrend,
    proposedActions,
    urgency,
  };
}

export function rankByUrgency(results: DecayResult[]): DecayResult[] {
  return [...results].sort((a, b) => b.decayScore - a.decayScore);
}
