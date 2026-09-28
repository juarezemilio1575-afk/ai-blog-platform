/**
 * Content integrity — Phase 12/20 requirement: "Don't create fake reviews
 * or fabricated personal experience. Don't claim you tested a product if
 * it wasn't actually tested." A system-prompt instruction alone doesn't
 * guarantee a model follows it, so this scans the actual output text and
 * blocks publish unless the article is explicitly marked as verified.
 */

const TESTING_CLAIM_PATTERNS: RegExp[] = [
  /\bwe tested\b/i,
  /\bour testing\b/i,
  /\bin our tests?\b/i,
  /\bour lab\b/i,
  /\bwe (personally )?tried\b/i,
  /\bafter (weeks|months|days) of (testing|using)\b/i,
  /\bwe've been using\b/i,
  /\bhands-on (review|testing|experience)\b/i,
  /\bour reviewer\b/i,
];

export interface ContentIntegrityResult {
  hasUnverifiedTestingClaims: boolean;
  matchedPhrases: string[];
}

export function checkContentIntegrity(contentMdx: string, hasVerifiedTesting: boolean): ContentIntegrityResult {
  if (hasVerifiedTesting) {
    return { hasUnverifiedTestingClaims: false, matchedPhrases: [] };
  }

  const matchedPhrases: string[] = [];
  for (const pattern of TESTING_CLAIM_PATTERNS) {
    const match = contentMdx.match(pattern);
    if (match) matchedPhrases.push(match[0]);
  }

  return { hasUnverifiedTestingClaims: matchedPhrases.length > 0, matchedPhrases };
}
