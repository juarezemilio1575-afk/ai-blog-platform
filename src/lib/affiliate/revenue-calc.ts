/**
 * Affiliate / Monetization math — section 10 of the spec.
 * Pure functions computing the dashboard metrics (RPM, EPC, CTR, conversion
 * rate) plus top-earner ranking. Feed it rows already pulled from
 * AffiliateClick / Conversion / Revenue via Prisma.
 */

export interface ClickRow {
  productId: string;
  articleId: string | null;
}

export interface ConversionRow {
  productId: string;
  commissionUsd: number;
}

export interface RevenueRow {
  articleId: string | null;
  amountUsd: number;
  source: "AFFILIATE" | "ADSENSE" | "SPONSORED" | "DIGITAL_PRODUCT" | "LEAD_GEN" | "OTHER";
}

export interface MonetizationSummary {
  totalRevenueUsd: number;
  affiliateRevenueUsd: number;
  adRevenueUsd: number;
  otherRevenueUsd: number;
  totalClicks: number;
  totalConversions: number;
  conversionRatePct: number;
  epcUsd: number; // earnings per click
  rpmUsd: number; // revenue per 1000 pageviews
  topEarningArticles: { articleId: string; revenueUsd: number }[];
  topEarningProducts: { productId: string; revenueUsd: number }[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function summarizeMonetization(params: {
  clicks: ClickRow[];
  conversions: ConversionRow[];
  revenue: RevenueRow[];
  totalPageviews: number;
}): MonetizationSummary {
  const { clicks, conversions, revenue, totalPageviews } = params;

  const totalRevenueUsd = round2(revenue.reduce((sum, r) => sum + r.amountUsd, 0));
  const affiliateRevenueUsd = round2(
    revenue.filter((r) => r.source === "AFFILIATE").reduce((sum, r) => sum + r.amountUsd, 0)
  );
  const adRevenueUsd = round2(
    revenue.filter((r) => r.source === "ADSENSE").reduce((sum, r) => sum + r.amountUsd, 0)
  );
  const otherRevenueUsd = round2(totalRevenueUsd - affiliateRevenueUsd - adRevenueUsd);

  const totalClicks = clicks.length;
  const totalConversions = conversions.length;
  const conversionRatePct = totalClicks === 0 ? 0 : round2((totalConversions / totalClicks) * 100);

  const conversionRevenue = conversions.reduce((sum, c) => sum + c.commissionUsd, 0);
  const epcUsd = totalClicks === 0 ? 0 : round2(conversionRevenue / totalClicks);
  const rpmUsd = totalPageviews === 0 ? 0 : round2((totalRevenueUsd / totalPageviews) * 1000);

  const revenueByArticle = new Map<string, number>();
  for (const r of revenue) {
    if (!r.articleId) continue;
    revenueByArticle.set(r.articleId, (revenueByArticle.get(r.articleId) ?? 0) + r.amountUsd);
  }
  const topEarningArticles = [...revenueByArticle.entries()]
    .map(([articleId, revenueUsd]) => ({ articleId, revenueUsd: round2(revenueUsd) }))
    .sort((a, b) => b.revenueUsd - a.revenueUsd)
    .slice(0, 10);

  const revenueByProduct = new Map<string, number>();
  for (const c of conversions) {
    revenueByProduct.set(c.productId, (revenueByProduct.get(c.productId) ?? 0) + c.commissionUsd);
  }
  const topEarningProducts = [...revenueByProduct.entries()]
    .map(([productId, revenueUsd]) => ({ productId, revenueUsd: round2(revenueUsd) }))
    .sort((a, b) => b.revenueUsd - a.revenueUsd)
    .slice(0, 10);

  return {
    totalRevenueUsd,
    affiliateRevenueUsd,
    adRevenueUsd,
    otherRevenueUsd,
    totalClicks,
    totalConversions,
    conversionRatePct,
    epcUsd,
    rpmUsd,
    topEarningArticles,
    topEarningProducts,
  };
}
