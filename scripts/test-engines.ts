/**
 * Engine self-test — actually runs the core business logic with realistic
 * demo data and prints results. Run with: `npm run engines:selftest`
 * (or `npx tsx scripts/test-engines.ts` directly).
 *
 * This does NOT require Next.js, Prisma, a database, or any API key — it
 * only exercises the pure TypeScript modules under src/lib/, which is why
 * it can run today, in an offline sandbox, and prove the scoring logic is
 * correct rather than merely asserted.
 */

import { analyzeNiche } from "../src/lib/ai/niche-analyzer";
import { rankKeywords } from "../src/lib/ai/keyword-scorer";
import { scoreArticleQuality } from "../src/lib/ai/quality-score";
import { detectDecay, rankByUrgency } from "../src/lib/ai/content-decay";
import { summarizeMonetization } from "../src/lib/affiliate/revenue-calc";
import { generateMeta, slugify } from "../src/lib/seo/meta-generator";
import { buildArticleSchema, buildFaqSchema } from "../src/lib/seo/schema-markup";
import { suggestInternalLinks } from "../src/lib/seo/internal-linking";
import { estimateCostUsd, summarizeAiCost } from "../src/lib/ai/cost-control";
import { checkContentIntegrity } from "../src/lib/ai/content-integrity";
import { discoverTopics, generateContentBrief, draftArticle, optimizeSeo } from "../src/lib/ai/content-engine";

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  // 1) Niche Analyzer (section 16) ------------------------------------------------
  section("1. Niche Analyzer");
  const niche = analyzeNiche({
    niche: "smart home security cameras",
    avgMonthlySearchVolume: 40000,
    serpCompetition: 62,
    affiliateProgramsFound: 7,
    avgCpcUsd: 2.1,
    contentAngleCount: 45,
    newSiteDifficulty: 55,
  });
  console.log(JSON.stringify(niche, null, 2));
  if (niche.overallScore < 0 || niche.overallScore > 100) throw new Error("Niche score out of range!");

  // 2) Keyword Priority Scorer (section 1) -----------------------------------------
  section("2. Keyword Priority Scorer (ranked)");
  const rankedKeywords = rankKeywords([
    { phrase: "best budget security camera for renters", monthlyVolume: 3200, difficulty: 28, cpcUsd: 2.4, hasBuyerModifier: true, isQuestion: false, wordCount: 6 },
    { phrase: "security camera", monthlyVolume: 90000, difficulty: 88, cpcUsd: 1.1, hasBuyerModifier: false, isQuestion: false, wordCount: 2 },
    { phrase: "does ring doorbell work without wifi", monthlyVolume: 1500, difficulty: 22, cpcUsd: 0.6, hasBuyerModifier: false, isQuestion: true, wordCount: 6 },
    { phrase: "arlo vs ring comparison", monthlyVolume: 4400, difficulty: 41, cpcUsd: 1.8, hasBuyerModifier: false, isQuestion: false, wordCount: 4 },
  ]);
  console.table(rankedKeywords.map((k) => ({ phrase: k.phrase, intent: k.searchIntent, priority: k.priorityScore, type: k.contentType })));

  // 3) Quality Score gate (section 24) ---------------------------------------------
  section("3. Editorial Quality Score (auto-publish gate)");
  const goodArticle = scoreArticleQuality({
    wordCount: 1400,
    matchesSearchIntent: true,
    originalityScore: 96,
    readabilityScore: 68,
    hasProperHeadingStructure: true,
    internalLinkCount: 3,
    externalReferenceCount: 2,
    unsupportedClaimCount: 0,
    keywordDensityPct: 1.1,
    hasAffiliateDisclosure: true,
    containsAffiliateLinks: true,
    aiFillerPhraseCount: 0,
    hasUnverifiedTestingClaims: false,
  });
  console.log("Well-optimized article ->", JSON.stringify(goodArticle, null, 2));
  if (!goodArticle.passesAutoPublishGate) throw new Error("Expected a well-optimized article to pass the gate!");

  const weakArticle = scoreArticleQuality({
    wordCount: 250,
    matchesSearchIntent: false,
    originalityScore: 70,
    readabilityScore: 40,
    hasProperHeadingStructure: false,
    internalLinkCount: 0,
    externalReferenceCount: 0,
    unsupportedClaimCount: 2,
    keywordDensityPct: 4.2,
    hasAffiliateDisclosure: false,
    containsAffiliateLinks: true,
    aiFillerPhraseCount: 5,
    hasUnverifiedTestingClaims: false,
  });
  console.log("\nThin/spammy article ->", JSON.stringify({ score: weakArticle.score, passesAutoPublishGate: weakArticle.passesAutoPublishGate, blockingIssues: weakArticle.blockingIssues }, null, 2));
  if (weakArticle.passesAutoPublishGate) throw new Error("Expected a thin/spammy article to FAIL the gate!");

  // 4) Content Decay Detector (section 7) -------------------------------------------
  section("4. Content Decay Detector");
  const decayResults = rankByUrgency([
    detectDecay({ articleId: "art_1", daysSinceLastUpdate: 420, clicksLast28d: 80, clicksPrevious28d: 210, avgPositionNow: 14.2, avgPositionPrevious: 6.8, impressionsLast28d: 5000, ctrLast28d: 0.016, expectedCtrForPosition: 0.04, competitorContentRefreshedRecently: true }),
    detectDecay({ articleId: "art_2", daysSinceLastUpdate: 30, clicksLast28d: 500, clicksPrevious28d: 480, avgPositionNow: 3.1, avgPositionPrevious: 3.4, impressionsLast28d: 12000, ctrLast28d: 0.041, expectedCtrForPosition: 0.038, competitorContentRefreshedRecently: false }),
  ]);
  console.table(decayResults.map((d) => ({ articleId: d.articleId, decayScore: d.decayScore, urgency: d.urgency, trafficTrendPct: d.trafficTrendPct })));
  if (decayResults[0].articleId !== "art_1") throw new Error("Expected the declining/stale article to rank most urgent!");

  // 5) Monetization Dashboard math (section 10) -------------------------------------
  section("5. Monetization summary");
  const monetization = summarizeMonetization({
    clicks: [{ productId: "p1", articleId: "art_1" }, { productId: "p1", articleId: "art_1" }, { productId: "p2", articleId: "art_2" }],
    conversions: [{ productId: "p1", commissionUsd: 12.5 }],
    revenue: [
      { articleId: "art_1", amountUsd: 12.5, source: "AFFILIATE" },
      { articleId: "art_1", amountUsd: 3.2, source: "ADSENSE" },
      { articleId: "art_2", amountUsd: 1.1, source: "ADSENSE" },
    ],
    totalPageviews: 8000,
  });
  console.log(JSON.stringify(monetization, null, 2));

  // 6) Meta generator + slug (section 5, items 11-13) -------------------------------
  section("6. Meta generator");
  const meta = generateMeta({
    title: "The Best Budget Security Cameras For Renters In 2026, Fully Reviewed And Compared",
    primaryKeyword: "best budget security camera for renters",
    siteName: "Demo Blog",
    rawDescription: "We tested every major budget security camera renters can install without drilling — here's what actually held up.",
  });
  console.log(JSON.stringify(meta, null, 2));
  if (meta.metaTitle.length > 60) throw new Error("Meta title exceeds 60 chars!");
  console.log("slugify test ->", slugify("Arlo vs Ring: Which One Should You Choose?"));

  // 7) Schema markup (section 18) ---------------------------------------------------
  section("7. Schema.org JSON-LD");
  const articleSchema = buildArticleSchema({
    headline: meta.metaTitle,
    description: meta.metaDescription,
    imageUrl: "https://example.com/hero.jpg",
    authorName: "Demo Author",
    publisherName: "Demo Blog",
    publisherLogoUrl: "https://example.com/logo.png",
    datePublished: "2026-01-10T00:00:00Z",
    dateModified: "2026-09-01T00:00:00Z",
    url: "https://example.com/blog/best-budget-security-camera",
  });
  console.log(JSON.stringify(articleSchema, null, 2));
  const faqSchema = buildFaqSchema([{ question: "Do these cameras need WiFi?", answer: "Most do, but a few models covered here support local-only storage." }]);
  console.log("FAQ schema present:", faqSchema !== null);

  // 8) Internal Linking Engine (section 8) ------------------------------------------
  section("8. Internal Linking Engine");
  const links = suggestInternalLinks(
    { id: "new_1", title: "Best Budget Security Camera For Renters", slug: "best-budget-security-camera", clusterKey: "security-cameras", primaryKeyword: "budget security camera renters", publishedAt: null },
    [
      { id: "old_1", title: "Arlo vs Ring Comparison Guide", slug: "arlo-vs-ring", clusterKey: "security-cameras", primaryKeyword: "arlo vs ring", publishedAt: new Date("2025-01-01") },
      { id: "old_2", title: "How To Choose A Slow Cooker", slug: "slow-cooker-guide", clusterKey: "kitchen", primaryKeyword: "best slow cooker", publishedAt: new Date("2025-02-01") },
    ]
  );
  console.table(links);
  if (links[0]?.targetArticleId !== "old_1") throw new Error("Expected the same-cluster article to be the top internal link suggestion!");

  // 9) AI Cost Control (section 22) --------------------------------------------------
  section("9. AI Cost Control");
  const cost1 = estimateCostUsd("claude-sonnet-4-6", 1200, 2400);
  console.log("Estimated cost for one article draft (Sonnet):", `$${cost1}`);
  const costSummary = summarizeAiCost([
    { taskType: "ARTICLE_DRAFT", model: "claude-sonnet-4-6", promptTokens: 1200, completionTokens: 2400, estimatedCostUsd: cost1, articleId: "art_1", blogId: "blog_1", createdAt: new Date() },
    { taskType: "SEO_OPTIMIZATION", model: "claude-haiku-4-5-20251001", promptTokens: 300, completionTokens: 150, estimatedCostUsd: estimateCostUsd("claude-haiku-4-5-20251001", 300, 150), articleId: "art_1", blogId: "blog_1", createdAt: new Date() },
  ]);
  console.log(JSON.stringify(costSummary, null, 2));

  // 10) Content Engine end-to-end using the MOCK provider (sections 4-5) ------------
  section("10. Content Engine pipeline (mock provider — no API key required)");
  const discovery = await discoverTopics("running shoes", "fitness gear");
  console.log("Discovered keywords:", discovery.keywords.length, "| provider:", discovery.usage.provider);

  const brief = await generateContentBrief({ primaryKeyword: "best running shoes for flat feet", searchIntent: "commercial" });
  console.log("Brief H1:", brief.brief.h1, "| outline sections:", brief.brief.outline.length);

  const draft = await draftArticle({ brief: brief.brief, primaryKeyword: "best running shoes for flat feet", secondaryKeywords: ["overpronation shoes", "stability running shoes"] });
  console.log("Draft length (chars):", draft.contentMdx.length, "| provider:", draft.usage.provider);

  const seo = await optimizeSeo({ title: brief.brief.h1, primaryKeyword: "best running shoes for flat feet", articleExcerpt: draft.contentMdx.slice(0, 200) });
  console.log("SEO ->", JSON.stringify({ metaTitle: seo.metaTitle, slug: seo.slug }, null, 2));

  // 11) Content Integrity Checker (Phase 12/20 — never fake testing claims) --------
  section("11. Content Integrity Checker");
  const fakeClaim = checkContentIntegrity("We tested this product for three weeks and loved it.", false);
  console.log("Unverified 'we tested' claim ->", JSON.stringify(fakeClaim, null, 2));
  if (!fakeClaim.hasUnverifiedTestingClaims) throw new Error("Expected an unverified testing claim to be flagged!");

  const verifiedClaim = checkContentIntegrity("We tested this product for three weeks and loved it.", true);
  if (verifiedClaim.hasUnverifiedTestingClaims) throw new Error("Expected a claim to pass when hasVerifiedTesting=true!");

  const honestCopy = checkContentIntegrity("Based on the manufacturer's spec sheet, this model supports 1080p night vision.", false);
  if (honestCopy.hasUnverifiedTestingClaims) throw new Error("Expected honest, non-testing-claim copy to pass!");
  console.log("Honest spec-based copy correctly passes ✅");

  section("ALL ENGINE SELF-TESTS PASSED ✅");
}

main().catch((err) => {
  console.error("\n❌ SELF-TEST FAILED:", err);
  process.exit(1);
});
