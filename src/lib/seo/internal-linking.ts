/**
 * Internal Linking Engine — section 8 of the spec.
 * Uses lightweight lexical overlap (shared topic cluster + keyword token
 * overlap) to rank candidate link targets — no embeddings/vector DB
 * required, so it runs anywhere. Swap in a real embedding-similarity
 * search later (e.g. pgvector) without changing the calling code, since
 * this only needs `ArticleForLinking[]` in and `LinkSuggestion[]` out.
 */

export interface ArticleForLinking {
  id: string;
  title: string;
  slug: string;
  clusterKey: string | null;
  primaryKeyword: string;
  publishedAt: Date | null;
}

export interface LinkSuggestion {
  targetArticleId: string;
  targetTitle: string;
  targetSlug: string;
  anchorText: string;
  relevanceScore: number; // 0-100
  reason: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "is", "are",
  "best", "top", "how", "what", "vs", "your", "with", "guide",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function suggestInternalLinks(
  source: ArticleForLinking,
  candidates: ArticleForLinking[],
  maxSuggestions = 5
): LinkSuggestion[] {
  const sourceTokens = tokenize(`${source.title} ${source.primaryKeyword}`);

  const scored = candidates
    .filter((c) => c.id !== source.id && c.publishedAt !== null)
    .map((c) => {
      const candidateTokens = tokenize(`${c.title} ${c.primaryKeyword}`);
      const lexicalScore = jaccardSimilarity(sourceTokens, candidateTokens) * 100;
      const clusterBonus = source.clusterKey && source.clusterKey === c.clusterKey ? 30 : 0;
      const relevanceScore = Math.min(100, Math.round(lexicalScore + clusterBonus));

      return {
        targetArticleId: c.id,
        targetTitle: c.title,
        targetSlug: c.slug,
        anchorText: c.primaryKeyword || c.title,
        relevanceScore,
        reason:
          clusterBonus > 0
            ? "Same topic cluster"
            : relevanceScore > 0
            ? "Shared keyword terms"
            : "No strong overlap",
      };
    })
    .filter((s) => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.slice(0, maxSuggestions);
}
