"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui/primitives";

interface NicheResult {
  overallScore: number;
  verdict: string;
  searchDemandScore: number;
  competitionScore: number;
  affiliateOpportunityScore: number;
  cpcPotentialScore: number;
  contentOpportunityScore: number;
  difficultyScore: number;
  reasons: string[];
}

const VERDICT_TONE: Record<string, "success" | "accent" | "warning" | "danger"> = {
  excellent: "success",
  strong: "success",
  viable: "accent",
  risky: "warning",
  avoid: "danger",
};

export function NicheAnalyzerForm() {
  const [form, setForm] = useState({
    niche: "",
    avgMonthlySearchVolume: 20000,
    serpCompetition: 50,
    affiliateProgramsFound: 5,
    avgCpcUsd: 1.5,
    contentAngleCount: 30,
    newSiteDifficulty: 50,
  });
  const [result, setResult] = useState<NicheResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ai/niche-analyzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data.result);
    setLoading(false);
  }

  return (
    <Card>
      <h2 className="mb-4 font-display text-lg font-semibold">Niche Analyzer</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2">
          Niche
          <input
            required
            value={form.niche}
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
            placeholder="e.g. smart home security cameras"
          />
        </label>
        <label>
          Avg. monthly search volume
          <input
            type="number"
            value={form.avgMonthlySearchVolume}
            onChange={(e) => setForm({ ...form, avgMonthlySearchVolume: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <label>
          SERP competition (0-100)
          <input
            type="number"
            value={form.serpCompetition}
            onChange={(e) => setForm({ ...form, serpCompetition: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <label>
          Affiliate programs found
          <input
            type="number"
            value={form.affiliateProgramsFound}
            onChange={(e) => setForm({ ...form, affiliateProgramsFound: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <label>
          Avg. CPC (USD)
          <input
            type="number"
            step="0.1"
            value={form.avgCpcUsd}
            onChange={(e) => setForm({ ...form, avgCpcUsd: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <label>
          Content angle count
          <input
            type="number"
            value={form.contentAngleCount}
            onChange={(e) => setForm({ ...form, contentAngleCount: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <label>
          New-site difficulty (0-100)
          <input
            type="number"
            value={form.newSiteDifficulty}
            onChange={(e) => setForm({ ...form, newSiteDifficulty: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-paper-200 px-3 py-1.5 dark:border-ink-800 dark:bg-ink-900"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="col-span-2 mt-2 rounded-full bg-accent-500 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Analyze niche"}
        </button>
      </form>

      {result && (
        <div className="mt-5 border-t border-paper-200 pt-4 dark:border-ink-800">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-semibold">{result.overallScore}</span>
            <Badge tone={VERDICT_TONE[result.verdict] ?? "neutral"}>{result.verdict}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-700/70 dark:text-paper-100/60">
            <div>Search demand: {result.searchDemandScore}</div>
            <div>Competition (ease): {result.competitionScore}</div>
            <div>Affiliate opportunity: {result.affiliateOpportunityScore}</div>
            <div>CPC potential: {result.cpcPotentialScore}</div>
            <div>Content opportunity: {result.contentOpportunityScore}</div>
            <div>Difficulty (ease): {result.difficultyScore}</div>
          </dl>
          <ul className="mt-3 list-inside list-disc text-xs text-ink-700/70 dark:text-paper-100/60">
            {result.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
