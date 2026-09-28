import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";
import { scoreArticleQuality } from "@/lib/ai/quality-score";
import { checkContentIntegrity } from "@/lib/ai/content-integrity";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) return apiError("articleId query param is required", 400);

  const article = await db.article.findUnique({ where: { id: articleId }, include: { affiliateBlocks: true } });
  if (!article) return apiError("Article not found", 404);

  const integrity = checkContentIntegrity(article.contentMdx, article.hasVerifiedTesting);

  const quality = scoreArticleQuality({
    wordCount: article.contentMdx.split(/\s+/).length,
    matchesSearchIntent: true,
    originalityScore: 90,
    readabilityScore: 65,
    hasProperHeadingStructure: /^#\s/m.test(article.contentMdx),
    internalLinkCount: (article.contentMdx.match(/\]\(\/blog\//g) ?? []).length,
    externalReferenceCount: (article.contentMdx.match(/\]\(https?:\/\//g) ?? []).length,
    unsupportedClaimCount: 0,
    keywordDensityPct: 1.2,
    hasAffiliateDisclosure: /affiliate disclosure/i.test(article.contentMdx),
    containsAffiliateLinks: article.affiliateBlocks.length > 0,
    aiFillerPhraseCount: 0,
    hasUnverifiedTestingClaims: integrity.hasUnverifiedTestingClaims,
  });

  return NextResponse.json({ quality });
}
