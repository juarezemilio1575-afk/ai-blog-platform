/**
 * Keyword Priority Scorer — section 1 (Topic Discovery) of the spec.
 * Turns raw keyword signals into: intent classification input, difficulty,
 * commercial value, content type suggestion, and a single Priority Score
 * used to sort the discovery queue.
 */

export type SearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "comparison";

export interface KeywordSignals {
  phrase: string;
  monthlyVolume: number;
  difficulty: number; // 0-100, from SERP analysis
  cpcUsd: number;
  hasBuyerModifier: boolean; // "best", "buy", "vs", "review", "cheap", "top"
  isQuestion: boolean;
  wordCount: number;
}

export interface ScoredKeyword {
  phrase: string;
  searchIntent: SearchIntent;
  estimatedDifficulty: number;
  commercialValue: number; // 0-100
  contentType: "listicle" | "comparison" | "guide" | "review" | "faq-page";
  priorityScore: number; // 0-100, higher = do this one first
  suggestedTitle: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function classifyIntent(s: KeywordSignals): SearchIntent {
  const p = s.phrase.toLowerCase();
  if (/\bvs\b|\bversus\b|\bor\b.*\bwhich\b/.test(p)) return "comparison";
  if (/\bbuy\b|\bprice\b|\bcoupon\b|\bdiscount\b|\bdeal\b/.test(p)) return "transactional";
  if (s.hasBuyerModifier) return "commercial";
  if (s.isQuestion || /^(how|what|why|when|where|who|does|is|are|can)\b/.test(p)) return "informational";
  return "informational";
}

function scoreCommercialValue(s: KeywordSignals): number {
  const cpcScore = clamp((s.cpcUsd / 4) * 100);
  const modifierBonus = s.hasBuyerModifier ? 25 : 0;
  return clamp(Math.round(cpcScore * 0.7 + modifierBonus));
}

function suggestContentType(intent: SearchIntent, s: KeywordSignals): ScoredKeyword["contentType"] {
  if (intent === "comparison") return "comparison";
  if (s.isQuestion) return "faq-page";
  if (intent === "commercial" || intent === "transactional") {
    return /\bbest\b|\btop\b/.test(s.phrase.toLowerCase()) ? "listicle" : "review";
  }
  return "guide";
}

function suggestTitle(intent: SearchIntent, contentType: ScoredKeyword["contentType"], phrase: string): string {
  const capitalized = phrase.replace(/\b\w/g, (c) => c.toUpperCase());
  switch (contentType) {
    case "listicle":
      return `${capitalized}: Our Top Picks (Updated ${new Date().getFullYear()})`;
    case "comparison":
      return `${capitalized}: Which One Should You Choose?`;
    case "review":
      return `${capitalized} — Honest Review & Verdict`;
    case "faq-page":
      return `${capitalized}? Here's the Full Answer`;
    default:
      return `${capitalized}: The Complete Guide`;
  }
}

/**
 * Priority Score blends demand, achievability and monetization potential.
 * A high-volume, low-difficulty, high-CPC keyword should always bubble to
 * the top of the queue over a high-volume-but-brutal-difficulty one.
 */
export function scoreKeyword(s: KeywordSignals): ScoredKeyword {
  const searchIntent = classifyIntent(s);
  const commercialValue = scoreCommercialValue(s);
  const contentType = suggestContentType(searchIntent, s);

  const volumeScore = clamp((Math.log10(s.monthlyVolume + 1) / Math.log10(50_000)) * 100);
  const achievability = clamp(100 - s.difficulty);
  const longTailBonus = s.wordCount >= 4 ? 10 : 0;

  const priorityScore = clamp(
    Math.round(
      volumeScore * 0.35 +
        achievability * 0.3 +
        commercialValue * 0.25 +
        longTailBonus
    )
  );

  return {
    phrase: s.phrase,
    searchIntent,
    estimatedDifficulty: Math.round(s.difficulty),
    commercialValue,
    contentType,
    priorityScore,
    suggestedTitle: suggestTitle(searchIntent, contentType, s.phrase),
  };
}

export function rankKeywords(signals: KeywordSignals[]): ScoredKeyword[] {
  return signals.map(scoreKeyword).sort((a, b) => b.priorityScore - a.priorityScore);
}
