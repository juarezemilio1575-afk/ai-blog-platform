import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui/primitives";
import { PublishButton } from "./publish-button";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  PUBLISHED: "success",
  SEO_OPTIMIZED: "accent",
  IN_REVIEW: "warning",
  NEEDS_UPDATE: "danger",
  APPROVED: "accent",
};

export default async function AdminContentPage() {
  const articles = await db.article.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { blog: true, category: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Articles & Media</h1>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-100 dark:bg-ink-800/60">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Blog</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-t border-paper-200 dark:border-ink-800">
                <td className="px-4 py-3 font-medium">{a.title}</td>
                <td className="px-4 py-3 text-ink-700/70 dark:text-paper-100/60">{a.blog.name}</td>
                <td className="px-4 py-3 text-ink-700/70 dark:text-paper-100/60">{a.category?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
                </td>
                <td className="px-4 py-3">{a.qualityScore ?? "—"}</td>
                <td className="px-4 py-3 text-ink-700/70 dark:text-paper-100/60">{a.updatedAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">{a.status !== "PUBLISHED" && <PublishButton articleId={a.id} />}</td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-700/60">
                  No articles yet — trigger AI generation from the AI tab, or run <code>npm run db:seed</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
