"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui/primitives";

interface DecayRow {
  articleId: string;
  decayScore: number;
  urgency: string;
  trafficTrendPct: number;
  proposedActions: string[];
}

const URGENCY_TONE: Record<string, "neutral" | "accent" | "warning" | "danger"> = {
  none: "neutral",
  monitor: "accent",
  update: "warning",
  urgent: "danger",
};

export function DecayScanButton({ blogId }: { blogId: string }) {
  const [results, setResults] = useState<DecayRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runScan() {
    setLoading(true);
    const res = await fetch(`/api/ai/decay?blogId=${blogId}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Content Decay Detector</h2>
        <button
          onClick={runScan}
          disabled={loading}
          className="rounded-full bg-accent-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {loading ? "Scanning..." : "Run scan"}
        </button>
      </div>

      {results === null && (
        <p className="text-sm text-ink-700/60 dark:text-paper-100/50">
          Requires SeoMetric rows (from a real Search Console sync) to produce meaningful results.
        </p>
      )}

      {results !== null && results.length === 0 && (
        <p className="text-sm text-ink-700/60 dark:text-paper-100/50">No published articles with tracked SEO metrics yet.</p>
      )}

      {results && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.articleId} className="rounded-lg bg-paper-100 p-3 text-sm dark:bg-ink-800/60">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{r.articleId}</span>
                <Badge tone={URGENCY_TONE[r.urgency]}>{r.urgency}</Badge>
              </div>
              <p className="text-xs text-ink-700/60 dark:text-paper-100/50">
                Decay score {r.decayScore} · Traffic trend {r.trafficTrendPct}%
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-ink-700/70 dark:text-paper-100/60">
                {r.proposedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
