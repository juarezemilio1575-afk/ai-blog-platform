import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";
import { detectDecay, rankByUrgency } from "@/lib/ai/content-decay";

/**
 * In production, clicksLast28d / avgPosition / ctr come from the Google
 * Search Console integration (section 23) and are stored in SeoMetric.
 * This reads whatever SeoMetric rows already exist for each article; run
 * the GSC sync job first (see src/lib/automation/jobs) so the numbers are
 * real rather than the demo-seeded placeholders.
 */
export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const blogId = searchParams.get("blogId");
  if (!blogId) return apiError("blogId query param is required", 400);

  const articles = await db.article.findMany({
    where: { blogId, status: "PUBLISHED" },
    include: {
      seoMetrics: { orderBy: { date: "desc" }, take: 60 }, // ~2 periods of 28-30 days
    },
  });

  const results = articles
    .filter((a) => a.seoMetrics.length > 0)
    .map((a) => {
      const recent = a.seoMetrics.slice(0, 28);
      const previous = a.seoMetrics.slice(28, 56);

      const sum = (rows: typeof recent, key: "clicks" | "impressions") => rows.reduce((s, r) => s + r[key], 0);
      const avg = (rows: typeof recent, key: "avgPosition") =>
        rows.length === 0 ? 0 : rows.reduce((s, r) => s + (r[key] ?? 0), 0) / rows.length;

      const clicksLast28d = sum(recent, "clicks");
      const clicksPrevious28d = sum(previous, "clicks");
      const impressionsLast28d = sum(recent, "impressions");
      const avgPositionNow = avg(recent, "avgPosition");
      const avgPositionPrevious = avg(previous, "avgPosition") || avgPositionNow;
      const ctrLast28d = impressionsLast28d === 0 ? 0 : clicksLast28d / impressionsLast28d;

      return detectDecay({
        articleId: a.id,
        daysSinceLastUpdate: Math.round((Date.now() - (a.lastOptimizedAt ?? a.publishedAt ?? a.createdAt).getTime()) / 86_400_000),
        clicksLast28d,
        clicksPrevious28d,
        avgPositionNow: avgPositionNow || 50,
        avgPositionPrevious: avgPositionPrevious || 50,
        impressionsLast28d,
        ctrLast28d,
        expectedCtrForPosition: 0.28 / Math.max(avgPositionNow || 10, 1), // rough position-CTR curve
        competitorContentRefreshedRecently: false,
      });
    });

  const ranked = rankByUrgency(results);

  // Persist the freshest decayScore back onto each Article for dashboard sorting.
  await Promise.all(ranked.map((r) => db.article.update({ where: { id: r.articleId }, data: { decayScore: r.decayScore } })));

  return NextResponse.json({ results: ranked });
}
