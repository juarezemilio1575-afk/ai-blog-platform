/**
 * Niche Analyzer — section 16 of the spec.
 *
 * Pure scoring logic with no external dependencies, so it can run and be
 * verified today (via `npm run engines:selftest`) even before Next.js/Prisma
 * are installed. In production this would be fed real data from a keyword
 * API (Ahrefs/Semrush/Google Keyword Planner) and an affiliate network API —
 * see the `NicheSignals` shape below for exactly what to wire in.
 */

export interface NicheSignals {
  niche: string;
  /** Average monthly search volume across the niche's core keyword set. */
  avgMonthlySearchVolume: number;
  /** 0-100, how saturated the SERPs are (from real keyword-difficulty data). */
  serpCompetition: number;
  /** Number of viable affiliate programs/products found for this niche. */
  affiliateProgramsFound: number;
  /** Average CPC in USD across the niche's commercial keywords. */
  avgCpcUsd: number;
  /** How many distinct, non-overlapping content angles exist (pillar + supporting). */
  contentAngleCount: number;
  /** 0-100, how hard it would be for a new site to rank (domain-authority gap etc.). */
  newSiteDifficulty: number;
}

export interface NicheScoreResult {
  niche: string;
  searchDemandScore: number;
  competitionScore: number; // higher = LESS competitive (easier), so it adds to overallScore
  affiliateOpportunityScore: number;
  cpcPotentialScore: number;
  contentOpportunityScore: number;
  difficultyScore: number; // higher = easier
  overallScore: number; // 0-100
  verdict: "avoid" | "risky" | "viable" | "strong" | "excellent";
  reasons: string[];
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// Logarithmic scaling so a niche with 500k searches doesn't dwarf everything
// else on a linear 0-100 scale; tuned so ~50k avg monthly volume ≈ score 70.
function scoreSearchDemand(avgVolume: number): number {
  if (avgVolume <= 0) return 0;
  const score = (Math.log10(avgVolume + 1) / Math.log10(200_000)) * 100;
  return clamp(Math.round(score));
}

function scoreCompetition(serpCompetition: number): number {
  // Invert: low SERP competition -> high score (easier to rank)
  return clamp(Math.round(100 - serpCompetition));
}

function scoreAffiliateOpportunity(programsFound: number): number {
  // Diminishing returns after ~8 solid programs — more isn't linearly better.
  const score = (Math.min(programsFound, 12) / 12) * 100;
  return clamp(Math.round(score));
}

function scoreCpcPotential(avgCpc: number): number {
  // $3+ CPC is already very strong for AdSense/Ezoic-tier monetization.
  const score = (Math.min(avgCpc, 3) / 3) * 100;
  return clamp(Math.round(score));
}

function scoreContentOpportunity(angleCount: number): number {
  // Needs enough distinct angles to sustain a real content calendar (30+).
  const score = (Math.min(angleCount, 60) / 60) * 100;
  return clamp(Math.round(score));
}

function scoreDifficulty(newSiteDifficulty: number): number {
  return clamp(Math.round(100 - newSiteDifficulty));
}

// Weights sum to 1.0 — tune these in Settings > AI once you have real
// outcome data (which niches you launched actually monetized well).
const WEIGHTS = {
  searchDemand: 0.2,
  competition: 0.15,
  affiliateOpportunity: 0.2,
  cpcPotential: 0.15,
  contentOpportunity: 0.15,
  difficulty: 0.15,
};

export function analyzeNiche(signals: NicheSignals): NicheScoreResult {
  const searchDemandScore = scoreSearchDemand(signals.avgMonthlySearchVolume);
  const competitionScore = scoreCompetition(signals.serpCompetition);
  const affiliateOpportunityScore = scoreAffiliateOpportunity(signals.affiliateProgramsFound);
  const cpcPotentialScore = scoreCpcPotential(signals.avgCpcUsd);
  const contentOpportunityScore = scoreContentOpportunity(signals.contentAngleCount);
  const difficultyScore = scoreDifficulty(signals.newSiteDifficulty);

  const overallScore = clamp(
    Math.round(
      searchDemandScore * WEIGHTS.searchDemand +
        competitionScore * WEIGHTS.competition +
        affiliateOpportunityScore * WEIGHTS.affiliateOpportunity +
        cpcPotentialScore * WEIGHTS.cpcPotential +
        contentOpportunityScore * WEIGHTS.contentOpportunity +
        difficultyScore * WEIGHTS.difficulty
    )
  );

  let verdict: NicheScoreResult["verdict"];
  if (overallScore >= 85) verdict = "excellent";
  else if (overallScore >= 70) verdict = "strong";
  else if (overallScore >= 55) verdict = "viable";
  else if (overallScore >= 40) verdict = "risky";
  else verdict = "avoid";

  const reasons: string[] = [];
  if (searchDemandScore < 40) reasons.push("Search demand is thin — the niche may not sustain long-term traffic growth.");
  if (competitionScore < 40) reasons.push("SERPs look saturated with established, high-authority sites.");
  if (affiliateOpportunityScore < 40) reasons.push("Few solid affiliate programs found — monetization will lean on ads/sponsorships instead.");
  if (cpcPotentialScore < 40) reasons.push("Low CPC — ad revenue per pageview will likely be weak.");
  if (contentOpportunityScore < 40) reasons.push("Limited distinct content angles — you'll run out of non-overlapping article ideas quickly.");
  if (difficultyScore < 40) reasons.push("High difficulty for a new site to break into page 1.");
  if (reasons.length === 0) reasons.push("Balanced signals across demand, competition, monetization and content depth.");

  return {
    niche: signals.niche,
    searchDemandScore,
    competitionScore,
    affiliateOpportunityScore,
    cpcPotentialScore,
    contentOpportunityScore,
    difficultyScore,
    overallScore,
    verdict,
    reasons,
  };
}
