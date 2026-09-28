import { db } from "@/lib/db";
import { Card } from "@/components/ui/primitives";
import { summarizeMonetization } from "@/lib/affiliate/revenue-calc";

export default async function AdminMonetizationPage() {
  const blog = await db.blog.findFirst();
  if (!blog) {
    return <p className="text-ink-700/60">No blog yet — run <code>npm run db:seed</code> first.</p>;
  }

  const [clicks, conversions, revenue, pageviewAgg, products] = await Promise.all([
    db.affiliateClick.findMany({ where: { product: { blogId: blog.id } }, select: { productId: true, articleId: true } }),
    db.conversion.findMany({ where: { product: { blogId: blog.id } }, select: { productId: true, commissionUsd: true } }),
    db.revenue.findMany({ where: { blogId: blog.id }, select: { articleId: true, amountUsd: true, source: true } }),
    db.analyticsSnapshot.aggregate({ where: { blogId: blog.id }, _sum: { pageViews: true } }),
    db.product.findMany({ where: { blogId: blog.id }, include: { _count: { select: { clicks: true, conversions: true } } } }),
  ]);

  const summary = summarizeMonetization({
    clicks,
    conversions: conversions.map((c) => ({ productId: c.productId, commissionUsd: c.commissionUsd ?? 0 })),
    revenue,
    totalPageviews: pageviewAgg._sum.pageViews ?? 0,
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Revenue & Affiliate</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total revenue", value: `$${summary.totalRevenueUsd.toFixed(2)}` },
          { label: "Affiliate revenue", value: `$${summary.affiliateRevenueUsd.toFixed(2)}` },
          { label: "Ad revenue", value: `$${summary.adRevenueUsd.toFixed(2)}` },
          { label: "RPM", value: `$${summary.rpmUsd.toFixed(2)}` },
          { label: "EPC", value: `$${summary.epcUsd.toFixed(2)}` },
          { label: "Conversion rate", value: `${summary.conversionRatePct.toFixed(1)}%` },
          { label: "Total clicks", value: summary.totalClicks },
          { label: "Total conversions", value: summary.totalConversions },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase text-ink-700/60 dark:text-paper-100/50">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold">Top-earning products</h2>
          </div>
          <ul className="divide-y divide-paper-200 dark:divide-ink-800">
            {summary.topEarningProducts.map((p) => (
              <li key={p.productId} className="flex justify-between px-4 py-2 text-sm">
                <span>{p.productId}</span>
                <span className="font-medium">${p.revenueUsd.toFixed(2)}</span>
              </li>
            ))}
            {summary.topEarningProducts.length === 0 && <li className="px-4 py-4 text-sm text-ink-700/60">No conversions tracked yet.</li>}
          </ul>
        </Card>

        <Card className="p-0">
          <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold">Product database</h2>
          </div>
          <ul className="divide-y divide-paper-200 dark:divide-ink-800">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between px-4 py-2 text-sm">
                <span>{p.name}</span>
                <span className="text-xs text-ink-700/60 dark:text-paper-100/50">
                  {p._count.clicks} clicks · {p._count.conversions} conversions
                </span>
              </li>
            ))}
            {products.length === 0 && <li className="px-4 py-4 text-sm text-ink-700/60">No products yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
