import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";

/**
 * Returns internally-tracked analytics snapshots. To show real Google
 * Analytics / Search Console numbers instead, implement
 * src/lib/analytics/google-analytics.ts and src/lib/analytics/search-console.ts
 * using GOOGLE_SERVICE_ACCOUNT_* env vars (see .env.example) and merge their
 * output here — this route's shape stays the same either way.
 */
export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const blogId = searchParams.get("blogId");
  const days = Number(searchParams.get("days") ?? "30");
  if (!blogId) return apiError("blogId query param is required", 400);

  const since = new Date(Date.now() - days * 86_400_000);

  const [snapshots, topArticlesBySeo] = await Promise.all([
    db.analyticsSnapshot.findMany({ where: { blogId, date: { gte: since } }, orderBy: { date: "asc" } }),
    db.seoMetric.groupBy({
      by: ["articleId"],
      where: { blogId, date: { gte: since }, articleId: { not: null } },
      _sum: { clicks: true, impressions: true },
      orderBy: { _sum: { clicks: "desc" } },
      take: 10,
    }),
  ]);

  return NextResponse.json({ snapshots, topArticlesBySeo });
}
