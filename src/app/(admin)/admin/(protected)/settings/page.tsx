import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/primitives";

export default async function AdminSettingsPage() {
  const blogs = await db.blog.findMany();

  const aiProvider = process.env.AI_DEFAULT_PROVIDER ?? "mock";
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Providers & Config</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">AI providers</h2>
          <p className="mb-3 text-sm text-ink-700/70 dark:text-paper-100/60">
            Configured via environment variables (.env) — not editable from this UI for security (section 20: never
            expose API keys). Change AI_DEFAULT_PROVIDER and redeploy to switch.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Active provider</span>
              <Badge tone="accent">{aiProvider}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Anthropic key configured</span>
              <Badge tone={hasAnthropicKey ? "success" : "neutral"}>{hasAnthropicKey ? "yes" : "no"}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>OpenAI key configured</span>
              <Badge tone={hasOpenAiKey ? "success" : "neutral"}>{hasOpenAiKey ? "yes" : "no"}</Badge>
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Publishing settings per blog</h2>
          <p className="mb-3 text-sm text-ink-700/70 dark:text-paper-100/60">
            Auto Publish (section 6): when on, articles that pass the Quality Score gate (≥80, see section 24)
            publish automatically; otherwise every article waits for human approval on the Content tab.
          </p>
          <ul className="space-y-2 text-sm">
            {blogs.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.name}</span>
                <Badge tone={b.autoPublish ? "success" : "neutral"}>{b.autoPublish ? "Auto Publish ON" : "Manual review"}</Badge>
              </li>
            ))}
            {blogs.length === 0 && <li className="text-ink-700/60">No blogs yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-ink-700/50">
            Toggle via <code>PATCH /api/blogs/[id]</code> (not built in this scaffold's UI — quick to add).
          </p>
        </Card>
      </div>
    </div>
  );
}
