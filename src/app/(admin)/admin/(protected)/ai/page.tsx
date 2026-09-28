import { db } from "@/lib/db";
import { Card } from "@/components/ui/primitives";
import { summarizeAiCost } from "@/lib/ai/cost-control";
import { NicheAnalyzerForm } from "./niche-analyzer-form";
import { TopicDiscoveryForm } from "./topic-discovery-form";

export default async function AdminAiPage() {
  const [blog, generations] = await Promise.all([
    db.blog.findFirst(),
    db.aiGeneration.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const costSummary = summarizeAiCost(
    generations.map((g) => ({
      taskType: g.taskType,
      model: g.model,
      promptTokens: g.promptTokens,
      completionTokens: g.completionTokens,
      estimatedCostUsd: g.estimatedCostUsd,
      articleId: g.articleId,
      blogId: g.blogId,
      createdAt: g.createdAt,
    }))
  );

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">AI Content Engine</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-ink-700/60 dark:text-paper-100/50">Total AI spend (tracked)</p>
          <p className="mt-1 font-display text-2xl font-semibold">${costSummary.totalCostUsd.toFixed(4)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-700/60 dark:text-paper-100/50">Requests logged</p>
          <p className="mt-1 font-display text-2xl font-semibold">{costSummary.totalRequests}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-700/60 dark:text-paper-100/50">Tokens used</p>
          <p className="mt-1 font-display text-2xl font-semibold">{costSummary.totalTokens.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-700/60 dark:text-paper-100/50">Cost / article</p>
          <p className="mt-1 font-display text-2xl font-semibold">${costSummary.costPerArticleUsd.toFixed(4)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NicheAnalyzerForm />
        {blog && <TopicDiscoveryForm blogId={blog.id} />}
      </div>

      {!blog && (
        <p className="mt-4 text-sm text-ink-700/60">
          No blog found yet — run <code>npm run db:seed</code> first so Topic Discovery has somewhere to save keywords.
        </p>
      )}
    </div>
  );
}
