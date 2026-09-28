import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireAdminSession } from "@/lib/api-utils";
import { summarizeMonetization } from "@/lib/affiliate/revenue-calc";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const blogId = searchParams.get("blogId");
  const days = Number(searchParams.get("days") ?? "30");
  if (!blogId) return apiError("blogId query param is required", 400);

  const since = new Date(Date.now() - days * 86_400_000);

  const [clicks, conversions, revenue, pageviewAgg] = await Promise.all([
    db.affiliateClick.findMany({ where: { product: { blogId }, clickedAt: { gte: since } }, select: { productId: true, articleId: true } }),
    db.conversion.findMany({ where: { product: { blogId }, convertedAt: { gte: since } }, select: { productId: true, commissionUsd: true } }),
    db.revenue.findMany({ where: { blogId, date: { gte: since } }, select: { articleId: true, amountUsd: true, source: true } }),
    db.analyticsSnapshot.aggregate({ where: { blogId, date: { gte: since } }, _sum: { pageViews: true } }),
  ]);

  const summary = summarizeMonetization({
    clicks,
    conversions: conversions.map((c) => ({ productId: c.productId, commissionUsd: c.commissionUsd ?? 0 })),
    revenue,
    totalPageviews: pageviewAgg._sum.pageViews ?? 0,
  });

  return NextResponse.json({ summary });
}
