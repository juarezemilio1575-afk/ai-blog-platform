/**
 * Editorial Quality Score — section 24 of the spec.
 * Score < 80 blocks auto-publish (enforced by the caller, e.g. the
 * /api/articles/[id]/publish route), regardless of Auto Publish setting.
 */

export interface QualityInputs {
  wordCount: number;
  matchesSearchIntent: boolean;
  originalityScore: number; // 0-100, from a plagiarism/similarity check
  readabilityScore: number; // 0-100, e.g. Flesch reading ease normalized
  hasProperHeadingStructure: boolean; // H1 -> H2 -> H3, no skipped levels
  internalLinkCount: number;
  externalReferenceCount: number;
  unsupportedClaimCount: number; // sentences making factual claims with no source
  keywordDensityPct: number; // primary keyword occurrence rate
  hasAffiliateDisclosure: boolean; // required if the article contains affiliate blocks
  containsAffiliateLinks: boolean;
  aiFillerPhraseCount: number; // "in today's fast-paced world", "it's important to note", etc.
  hasUnverifiedTestingClaims: boolean; // from content-integrity.ts — Phase 12/20: never fake hands-on testing
}

export interface QualityScoreResult {
  score: number; // 0-100
  passesAutoPublishGate: boolean; // score >= 80
  breakdown: Record<string, number>;
  blockingIssues: string[];
  warnings: string[];
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

const AUTO_PUBLISH_THRESHOLD = 85; // raised from 80 per Phase 6 of the production business spec

export function scoreArticleQuality(i: QualityInputs): QualityScoreResult {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Thin content check (anti-spam, section 25)
  const lengthScore = i.wordCount < 300 ? 0 : clamp((Math.min(i.wordCount, 1800) / 1800) * 100);
  if (i.wordCount < 600) warnings.push("Article is shorter than the 600-word floor recommended for competitive intent.");
  if (i.wordCount < 300) blockingIssues.push("Thin content: under 300 words.");

  const intentScore = i.matchesSearchIntent ? 100 : 20;
  if (!i.matchesSearchIntent) blockingIssues.push("Content does not match the target keyword's search intent.");

  const originalityScore = clamp(i.originalityScore);
  if (originalityScore < 85) blockingIssues.push(`Originality below threshold (${originalityScore}/100) — possible duplicate/near-duplicate content.`);

  const readabilityScore = clamp(i.readabilityScore);
  if (readabilityScore < 50) warnings.push("Readability is low — consider shorter sentences and simpler wording.");

  const structureScore = i.hasProperHeadingStructure ? 100 : 40;
  if (!i.hasProperHeadingStructure) warnings.push("Heading structure skips levels or is missing an H1.");

  const internalLinkScore = clamp((Math.min(i.internalLinkCount, 4) / 4) * 100);
  if (i.internalLinkCount === 0) warnings.push("No internal links — the Internal Linking Engine should run before publish.");

  const externalRefScore = clamp((Math.min(i.externalReferenceCount, 3) / 3) * 100);

  const claimsScore = i.unsupportedClaimCount === 0 ? 100 : clamp(100 - i.unsupportedClaimCount * 20);
  if (i.unsupportedClaimCount > 0) blockingIssues.push(`${i.unsupportedClaimCount} unsupported factual claim(s) found — needs fact-check pass.`);

  const densityScore = i.keywordDensityPct > 3 ? 30 : i.keywordDensityPct < 0.3 ? 60 : 100;
  if (i.keywordDensityPct > 3) blockingIssues.push("Keyword stuffing detected (density > 3%).");

  const disclosureScore = i.containsAffiliateLinks && !i.hasAffiliateDisclosure ? 0 : 100;
  if (i.containsAffiliateLinks && !i.hasAffiliateDisclosure) blockingIssues.push("Contains affiliate links but no affiliate disclosure — required for compliance.");

  const fillerScore = clamp(100 - i.aiFillerPhraseCount * 15);
  if (i.aiFillerPhraseCount >= 3) warnings.push("Multiple generic AI filler phrases detected — rewrite for a more natural voice.");

  if (i.hasUnverifiedTestingClaims) {
    blockingIssues.push("Article claims hands-on testing/personal experience that isn't marked as verified — this is a hard block (never fabricate reviews, see Phase 12/20).");
  }

  const weighted =
    lengthScore * 0.12 +
    intentScore * 0.18 +
    originalityScore * 0.18 +
    readabilityScore * 0.1 +
    structureScore * 0.08 +
    internalLinkScore * 0.08 +
    externalRefScore * 0.06 +
    claimsScore * 0.1 +
    densityScore * 0.04 +
    disclosureScore * 0.04 +
    fillerScore * 0.02;

  const score = clamp(Math.round(weighted));

  return {
    score,
    passesAutoPublishGate: score >= AUTO_PUBLISH_THRESHOLD && blockingIssues.length === 0,
    breakdown: {
      length: Math.round(lengthScore),
      intentMatch: Math.round(intentScore),
      originality: Math.round(originalityScore),
      readability: Math.round(readabilityScore),
      structure: Math.round(structureScore),
      internalLinks: Math.round(internalLinkScore),
      externalReferences: Math.round(externalRefScore),
      unsupportedClaims: Math.round(claimsScore),
      keywordDensity: Math.round(densityScore),
      affiliateDisclosure: Math.round(disclosureScore),
      aiFillerLanguage: Math.round(fillerScore),
    },
    blockingIssues,
    warnings,
  };
}
