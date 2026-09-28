import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/primitives";
import { DecayScanButton } from "./decay-scan-button";

export default async function AdminSeoPage() {
  const blog = await db.blog.findFirst();
  const keywords = blog
    ? await db.keyword.findMany({ where: { blogId: blog.id }, orderBy: { priorityScore: "desc" }, take: 30 })
    : [];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">SEO: Keywords & Decay</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-paper-200 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold">Keyword priority queue</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 dark:bg-ink-800/60">
              <tr>
                <th className="px-4 py-2">Phrase</th>
                <th className="px-4 py-2">Intent</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id} className="border-t border-paper-200 dark:border-ink-800">
                  <td className="px-4 py-2">{k.phrase}</td>
                  <td className="px-4 py-2">
                    <Badge tone="neutral">{k.searchIntent}</Badge>
                  </td>
                  <td className="px-4 py-2">{k.priorityScore ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-ink-700/60 dark:text-paper-100/50">{k.status}</td>
                </tr>
              ))}
              {keywords.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-700/60">
                    No keywords yet — run Topic Discovery from the AI tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {blog && <DecayScanButton blogId={blog.id} />}
      </div>
    </div>
  );
}
