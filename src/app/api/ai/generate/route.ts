import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseBody, requireAdminSession } from "@/lib/api-utils";
import { generateContentBrief, draftArticle, optimizeSeo } from "@/lib/ai/content-engine";
import { estimateCostUsd } from "@/lib/ai/cost-control";
import { slugify } from "@/lib/seo/meta-generator";

const bodySchema = z.object({
  blogId: z.string(),
  keywordId: z.string(),
});

async function logGeneration(params: {
  blogId: string;
  articleId?: string;
  taskType: "CONTENT_BRIEF" | "ARTICLE_DRAFT" | "SEO_OPTIMIZATION";
  usage: { provider: string; model: string; promptTokens: number; completionTokens: number; cached: boolean };
}) {
  await db.aiGeneration.create({
    data: {
      blogId: params.blogId,
      articleId: params.articleId,
      taskType: params.taskType,
      provider: params.usage.provider,
      model: params.usage.model,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      estimatedCostUsd: estimateCostUsd(params.usage.model, params.usage.promptTokens, params.usage.completionTokens),
      cached: params.usage.cached,
    },
  });
}

/**
 * Runs the Idea -> Research -> Brief -> AI Draft -> SEO Optimization steps
 * of the section 6 workflow in one call. Fact-check, Human Review and
 * Publish stay as separate, explicit actions (see /api/articles/[id]/publish)
 * so a human always has to approve before anything goes live, unless the
 * blog's Auto Publish setting is on AND the quality gate passes.
 */
export async function POST(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const parsed = await parseBody(req, bodySchema);
  if (!parsed.success) return parsed.response;
  const { blogId, keywordId } = parsed.data;

  const keyword = await db.keyword.findUnique({ where: { id: keywordId } });
  if (!keyword) return apiError("Keyword not found", 404);

  try {
    const briefResult = await generateContentBrief({
      primaryKeyword: keyword.phrase,
      searchIntent: keyword.searchIntent,
    });
    await logGeneration({ blogId, taskType: "CONTENT_BRIEF", usage: briefResult.usage });

    const brief = await db.contentBrief.create({
      data: {
        blogId,
        keywordId,
        searchIntent: keyword.searchIntent,
        outline: briefResult.brief.outline as never,
        primaryKeyword: keyword.phrase,
        secondaryKeywords: [] as never,
        relatedEntities: [] as never,
        faqs: briefResult.brief.faqs as never,
      },
    });

    const draftResult = await draftArticle({
      brief: briefResult.brief,
      primaryKeyword: keyword.phrase,
      secondaryKeywords: [],
    });

    const seoResult = await optimizeSeo({
      title: briefResult.brief.h1,
      primaryKeyword: keyword.phrase,
      articleExcerpt: draftResult.contentMdx.slice(0, 300),
    });

    const slug = seoResult.slug ? slugify(seoResult.slug) : slugify(keyword.phrase);

    const article = await db.article.create({
      data: {
        blogId,
        briefId: brief.id,
        keywordId,
        title: briefResult.brief.h1,
        slug,
        contentMdx: draftResult.contentMdx,
        metaTitle: seoResult.metaTitle,
        metaDescription: seoResult.metaDescription,
        status: "SEO_OPTIMIZED",
      },
    });

    await logGeneration({ blogId, articleId: article.id, taskType: "ARTICLE_DRAFT", usage: draftResult.usage });
    await logGeneration({ blogId, articleId: article.id, taskType: "SEO_OPTIMIZATION", usage: seoResult.usage });

    await db.keyword.update({ where: { id: keywordId }, data: { status: "used" } });

    return NextResponse.json({ article, brief }, { status: 201 });
  } catch (err) {
    return apiError("AI generation pipeline failed", 500, err instanceof Error ? err.message : undefined);
  }
}
