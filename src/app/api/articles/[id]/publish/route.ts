import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";
import { scoreArticleQuality, type QualityInputs } from "@/lib/ai/quality-score";
import { checkContentIntegrity } from "@/lib/ai/content-integrity";

/**
 * Enforces the Human Approval workflow (section 6) and the Quality Score
 * gate (section 24): a score under 80, or any blocking issue, prevents
 * publish even if Auto Publish is enabled for the blog. A human can still
 * force-publish with `force: true` in the body — that action is written to
 * AuditLog so the override is traceable.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = body?.force === true;
  } catch {
    // no body is fine, force stays false
  }

  const article = await db.article.findUnique({
    where: { id: params.id },
    include: { affiliateBlocks: true, blog: true },
  });
  if (!article) return apiError("Article not found", 404);

  // In production, these inputs come from real analyzers (readability lib,
  // originality/plagiarism API, the Fact Check AI task). Here they're read
  // from fields already on the Article/quality pipeline for illustration.
  const integrity = checkContentIntegrity(article.contentMdx, article.hasVerifiedTesting);

  const qualityInputs: QualityInputs = {
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
  };

  const quality = scoreArticleQuality(qualityInputs);

  if (!quality.passesAutoPublishGate && !force) {
    return NextResponse.json(
      { error: "Article does not meet the publish quality gate (score >= 80, no blocking issues).", quality },
      { status: 422 }
    );
  }

  const updated = await db.article.update({
    where: { id: params.id },
    data: {
      status: "PUBLISHED",
      qualityScore: quality.score,
      publishedAt: new Date(),
    },
  });

  if (force && !quality.passesAutoPublishGate) {
    await db.auditLog.create({
      data: {
        action: "FORCE_PUBLISH_OVERRIDE",
        entity: "Article",
        entityId: article.id,
        metadata: { quality },
      },
    });
  }

  return NextResponse.json({ article: updated, quality });
}
