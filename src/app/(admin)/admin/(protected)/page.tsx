import { db } from "@/lib/db";
import { Card } from "@/components/ui/primitives";

export default async function AdminOverviewPage() {
  const [totalArticles, published, drafts, scheduled, totalRevenueAgg, blogs] = await Promise.all([
    db.article.count(),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { status: { in: ["IDEA", "RESEARCHING", "BRIEFED", "DRAFTED"] } } }),
    db.article.count({ where: { status: "SCHEDULED" } }),
    db.revenue.aggregate({ _sum: { amountUsd: true } }),
    db.blog.findMany({ select: { id: true, name: true } }),
  ]);

  const totalClicks = await db.affiliateClick.count();
  const totalConversions = await db.conversion.count();
  const conversionRate = totalClicks === 0 ? 0 : ((totalConversions / totalClicks) * 100).toFixed(1);

  const stats = [
    { label: "Total articles", value: totalArticles },
    { label: "Published", value: published },
    { label: "Drafts", value: drafts },
    { label: "Scheduled", value: scheduled },
    { label: "Total revenue", value: `$${(totalRevenueAgg._sum.amountUsd ?? 0).toFixed(2)}` },
    { label: "Affiliate clicks", value: totalClicks },
    { label: "Conversion rate", value: `${conversionRate}%` },
    { label: "Blogs managed", value: blogs.length },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-ink-700/60 dark:text-paper-100/50">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Blogs</h2>
        {blogs.length === 0 ? (
          <p className="text-sm text-ink-700/60">
            No blogs yet — run <code>npm run db:seed</code> to load demo data, or create one via POST /api/blogs.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {blogs.map((b) => (
              <li key={b.id}>
                <Card>{b.name}</Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
