"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui/primitives";

interface KeywordRow {
  id: string;
  phrase: string;
  searchIntent: string;
  priorityScore: number | null;
  suggestedTitle: string | null;
}

export function TopicDiscoveryForm({ blogId }: { blogId: string }) {
  const [seedTopic, setSeedTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/topics/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, seedTopic, niche }),
    });
    const data = await res.json();
    setKeywords(data.keywords ?? []);
    setLoading(false);
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Topic Discovery</h2>
      <p className="mb-4 text-xs text-ink-700/60 dark:text-paper-100/50">
        Runs on the currently configured AI_DEFAULT_PROVIDER (falls back to the offline mock provider if no API key is set).
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 text-sm">
        <input
          required
          value={seedTopic}
          onChange={(e) => setSeedTopic(e.target.value)}
          placeholder="Seed topic, e.g. running shoes"
          className="flex-1 rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
        />
        <input
          required
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Niche, e.g. fitness gear"
          className="flex-1 rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {loading ? "Discovering..." : "Discover"}
        </button>
      </form>

      {keywords.length > 0 && (
        <ul className="mt-4 space-y-2">
          {keywords.map((k) => (
            <li key={k.id} className="flex items-center justify-between rounded-lg bg-paper-100 px-3 py-2 text-sm dark:bg-ink-800/60">
              <span>{k.phrase}</span>
              <span className="flex items-center gap-2">
                <Badge tone="neutral">{k.searchIntent}</Badge>
                <Badge tone="accent">P: {k.priorityScore}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
