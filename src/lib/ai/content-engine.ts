/**
 * AI Content Engine — sections 4 & 5 of the spec.
 * Thin orchestration layer: builds task-specific prompts, calls whichever
 * provider is configured (mock/anthropic/openai) via getProvider(), parses
 * the result, and returns typed data for the API routes to persist with
 * Prisma. Business rules (scoring, gating) live in the sibling files
 * (niche-analyzer, keyword-scorer, quality-score) — this file only handles
 * the generative steps.
 */

import { getProvider } from "./provider";
import type { AiCompletionResult } from "./provider";

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // The mock provider and real models can both occasionally wrap JSON in
    // prose or code fences — strip a leading/trailing fence and retry once.
    const stripped = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    try {
      return JSON.parse(stripped) as T;
    } catch {
      return fallback;
    }
  }
}

export interface DiscoveredKeyword {
  phrase: string;
  intent: string;
  estimatedVolume: number;
}

export async function discoverTopics(seedTopic: string, blogNiche: string): Promise<{
  keywords: DiscoveredKeyword[];
  usage: AiCompletionResult;
}> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "TOPIC_DISCOVERY",
    system:
      "You are an SEO keyword researcher. Given a seed topic and niche, return realistic long-tail, commercial, informational, and comparison keyword opportunities as JSON.",
    prompt: `Seed topic: "${seedTopic}"\nNiche: "${blogNiche}"\nReturn JSON: { "keywords": [{ "phrase": string, "intent": string, "estimatedVolume": number }] }`,
    jsonSchemaHint: "{ keywords: { phrase: string; intent: string; estimatedVolume: number }[] }",
  });

  const parsed = safeJsonParse<{ keywords: DiscoveredKeyword[] }>(usage.text, { keywords: [] });
  return { keywords: parsed.keywords, usage };
}

export interface ClusterResult {
  pillar: string;
  supporting: string[];
}

export async function clusterKeywords(topic: string, relatedPhrases: string[]): Promise<{
  cluster: ClusterResult;
  usage: AiCompletionResult;
}> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "KEYWORD_CLUSTERING",
    system: "Group related keywords into one pillar article and several supporting articles, avoiding topic overlap.",
    prompt: `Main topic: "${topic}"\nRelated keywords: ${relatedPhrases.join(", ")}\nReturn JSON: { "pillar": string, "supporting": string[] }`,
  });

  const parsed = safeJsonParse<ClusterResult>(usage.text, { pillar: topic, supporting: [] });
  return { cluster: parsed, usage };
}

export interface BriefOutlineItem {
  h2: string;
  h3?: string[];
}

export interface GeneratedBrief {
  h1: string;
  outline: BriefOutlineItem[];
  faqs: { question: string; answer: string }[];
}

export async function generateContentBrief(params: {
  primaryKeyword: string;
  searchIntent: string;
  competitorNotes?: string;
}): Promise<{ brief: GeneratedBrief; usage: AiCompletionResult }> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "CONTENT_BRIEF",
    system:
      "You are a senior content strategist. Produce a content brief that fully satisfies the search intent and would rank for a featured snippet.",
    prompt: `Primary keyword: "${params.primaryKeyword}"\nSearch intent: ${params.searchIntent}\n${
      params.competitorNotes ? `Competitor notes: ${params.competitorNotes}\n` : ""
    }Return JSON: { "h1": string, "outline": [{ "h2": string, "h3"?: string[] }], "faqs": [{ "question": string, "answer": string }] }`,
    maxTokens: 1500,
  });

  const parsed = safeJsonParse<GeneratedBrief>(usage.text, { h1: params.primaryKeyword, outline: [], faqs: [] });
  return { brief: parsed, usage };
}

export async function draftArticle(params: {
  brief: GeneratedBrief;
  primaryKeyword: string;
  secondaryKeywords: string[];
  toneNotes?: string;
}): Promise<{ contentMdx: string; usage: AiCompletionResult }> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "ARTICLE_DRAFT",
    system: [
      "Write a natural, useful, human-sounding article in Markdown/MDX.",
      "Follow the given outline exactly. Do not keyword-stuff.",
      "Avoid generic AI filler phrases (\"in today's fast-paced world\", \"it's important to note\", etc.).",
      "Back factual claims with reasoning, not invented statistics.",
      "Never claim hands-on testing, personal experience, or a real review ('we tested', 'in our testing', 'our lab found') unless explicitly told this content is based on verified testing — write from specs and documented facts instead.",
      params.toneNotes ?? "",
    ]
      .filter(Boolean)
      .join(" "),
    prompt: `Primary keyword: "${params.primaryKeyword}"\nSecondary keywords: ${params.secondaryKeywords.join(
      ", "
    )}\nOutline: ${JSON.stringify(params.brief.outline)}\nFAQs to include: ${JSON.stringify(params.brief.faqs)}`,
    maxTokens: 4000,
  });

  return { contentMdx: usage.text, usage };
}

export async function optimizeSeo(params: {
  title: string;
  primaryKeyword: string;
  articleExcerpt: string;
}): Promise<{ metaTitle: string; metaDescription: string; slug: string; usage: AiCompletionResult }> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "SEO_OPTIMIZATION",
    prompt: `Title: "${params.title}"\nPrimary keyword: "${params.primaryKeyword}"\nExcerpt: "${params.articleExcerpt}"\nReturn JSON: { "metaTitle": string (<=60 chars), "metaDescription": string (<=155 chars), "slug": string }`,
  });

  const parsed = safeJsonParse(usage.text, { metaTitle: params.title, metaDescription: params.articleExcerpt, slug: "" });
  return { ...parsed, usage };
}

export async function factCheckArticle(contentMdx: string): Promise<{
  unsupportedClaims: string[];
  confidence: number;
  usage: AiCompletionResult;
}> {
  const provider = await getProvider();
  const usage = await provider.complete({
    taskType: "FACT_CHECK",
    system: "Identify any factual claims (statistics, dates, comparisons) that are not clearly supported or sourced within the text itself.",
    prompt: contentMdx,
  });

  const parsed = safeJsonParse<{ unsupportedClaims: string[]; confidence: number }>(usage.text, {
    unsupportedClaims: [],
    confidence: 50,
  });
  return { ...parsed, usage };
}
