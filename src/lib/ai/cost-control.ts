/**
 * AI Cost Control — section 22 of the spec.
 * Tracks estimated spend and picks the cheapest model capable of a task,
 * so simple tasks (meta descriptions, alt text) don't burn premium-model
 * tokens. Wire actual token counts from each provider's response usage
 * object into `estimateCost`.
 */

import type { AiTaskType } from "./provider";

// USD per 1M tokens — update these to match your actual provider pricing.
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-haiku-4-5-20251001": { inputPer1M: 1, outputPer1M: 5 },
  "claude-sonnet-4-6": { inputPer1M: 3, outputPer1M: 15 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  mock: { inputPer1M: 0, outputPer1M: 0 },
};

// Simple tasks route to the economy model; anything requiring real
// reasoning/quality (drafting, fact-checking) uses the premium model.
const SIMPLE_TASKS: AiTaskType[] = [
  "IMAGE_BRIEF",
  "SOCIAL_REPURPOSE",
  "SEO_OPTIMIZATION",
];

export function selectModelForTask(
  taskType: AiTaskType,
  models: { economy: string; premium: string }
): string {
  return SIMPLE_TASKS.includes(taskType) ? models.economy : models.premium;
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.mock;
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

export interface UsageRow {
  taskType: AiTaskType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  articleId: string | null;
  blogId: string | null;
  createdAt: Date;
}

export interface CostSummary {
  totalCostUsd: number;
  totalRequests: number;
  totalTokens: number;
  costByTaskType: Record<string, number>;
  costByBlog: Record<string, number>;
  costPerArticleUsd: number;
}

export function summarizeAiCost(rows: UsageRow[]): CostSummary {
  const totalCostUsd = Math.round(rows.reduce((s, r) => s + r.estimatedCostUsd, 0) * 10000) / 10000;
  const totalTokens = rows.reduce((s, r) => s + r.promptTokens + r.completionTokens, 0);

  const costByTaskType: Record<string, number> = {};
  const costByBlog: Record<string, number> = {};
  const articleIds = new Set<string>();

  for (const r of rows) {
    costByTaskType[r.taskType] = Math.round(((costByTaskType[r.taskType] ?? 0) + r.estimatedCostUsd) * 10000) / 10000;
    if (r.blogId) costByBlog[r.blogId] = Math.round(((costByBlog[r.blogId] ?? 0) + r.estimatedCostUsd) * 10000) / 10000;
    if (r.articleId) articleIds.add(r.articleId);
  }

  const costPerArticleUsd = articleIds.size === 0 ? 0 : Math.round((totalCostUsd / articleIds.size) * 10000) / 10000;

  return {
    totalCostUsd,
    totalRequests: rows.length,
    totalTokens,
    costByTaskType,
    costByBlog,
    costPerArticleUsd,
  };
}

// Simple in-memory de-dup cache keyed by a content hash, so re-running the
// same brief/keyword doesn't burn tokens twice in one process. Swap for
// Redis in production (see README "Scaling notes").
const generationCache = new Map<string, { result: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const hit = generationCache.get(key);
  if (!hit || hit.expiresAt < Date.now()) return null;
  return hit.result as T;
}

export function setCached(key: string, result: unknown, ttlMs = 1000 * 60 * 60 * 24): void {
  generationCache.set(key, { result, expiresAt: Date.now() + ttlMs });
}

/**
 * Budget Guard — Phase 19 (hard requirement): never let AI spend run
 * unbounded. Set AI_DAILY_BUDGET_USD / AI_MONTHLY_BUDGET_USD in .env.
 * At 80% of either budget: callers should log a SystemAlert (see
 * src/lib/monitoring/alerts.ts). At 100%: callers must skip non-essential
 * AI calls (automation jobs) — but the site itself, publishing already-
 * drafted content, and serving existing pages must never be affected by
 * this. Call `checkBudget()` at the top of every automation job.
 */
export type BudgetStatus = "ok" | "warning" | "exceeded";

export interface BudgetCheckResult {
  status: BudgetStatus;
  dailySpentUsd: number;
  dailyBudgetUsd: number;
  monthlySpentUsd: number;
  monthlyBudgetUsd: number;
}

export function evaluateBudget(params: {
  dailySpentUsd: number;
  monthlySpentUsd: number;
}): BudgetCheckResult {
  const dailyBudgetUsd = Number(process.env.AI_DAILY_BUDGET_USD ?? "5");
  const monthlyBudgetUsd = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "100");

  const dailyRatio = dailyBudgetUsd === 0 ? 1 : params.dailySpentUsd / dailyBudgetUsd;
  const monthlyRatio = monthlyBudgetUsd === 0 ? 1 : params.monthlySpentUsd / monthlyBudgetUsd;
  const worstRatio = Math.max(dailyRatio, monthlyRatio);

  const status: BudgetStatus = worstRatio >= 1 ? "exceeded" : worstRatio >= 0.8 ? "warning" : "ok";

  return {
    status,
    dailySpentUsd: params.dailySpentUsd,
    dailyBudgetUsd,
    monthlySpentUsd: params.monthlySpentUsd,
    monthlyBudgetUsd,
  };
}

/**
 * Convenience wrapper so every automation job can do:
 *   const budget = await getCurrentBudgetStatus();
 *   if (budget.status === "exceeded") { skip AI calls, log alert, return; }
 * without each job duplicating the aggregation query.
 */
export async function getCurrentBudgetStatus(): Promise<BudgetCheckResult> {
  const { db } = await import("@/lib/db");
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const [daily, monthly] = await Promise.all([
    db.aiGeneration.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { estimatedCostUsd: true } }),
    db.aiGeneration.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { estimatedCostUsd: true } }),
  ]);

  return evaluateBudget({
    dailySpentUsd: daily._sum.estimatedCostUsd ?? 0,
    monthlySpentUsd: monthly._sum.estimatedCostUsd ?? 0,
  });
}
