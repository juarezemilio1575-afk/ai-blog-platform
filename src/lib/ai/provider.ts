/**
 * AI Provider abstraction — section 3 ("AI: Anthropic API, with an
 * abstraction layer to add OpenAI/Gemini later") and section 22 (cost
 * control needs a uniform usage shape across providers).
 *
 * Every provider (Anthropic, OpenAI, Mock) implements this same interface,
 * so `content-engine.ts` and every API route never need to know which one
 * is actually running. Provider selection happens once, in `getProvider()`.
 */

export type AiTaskType =
  | "TOPIC_DISCOVERY"
  | "KEYWORD_CLUSTERING"
  | "CONTENT_BRIEF"
  | "ARTICLE_DRAFT"
  | "SEO_OPTIMIZATION"
  | "FACT_CHECK"
  | "IMAGE_BRIEF"
  | "SOCIAL_REPURPOSE"
  | "NEWSLETTER"
  | "NICHE_ANALYSIS"
  | "DECAY_ANALYSIS"
  | "QUALITY_SCORE";

export interface AiCompletionRequest {
  taskType: AiTaskType;
  system?: string;
  prompt: string;
  /** When set, the provider must return valid JSON matching this shape description (used for structured outputs). */
  jsonSchemaHint?: string;
  maxTokens?: number;
  model?: string; // override; otherwise cost-control picks one via selectModelForTask
}

export interface AiCompletionResult {
  text: string;
  provider: "anthropic" | "openai" | "mock";
  model: string;
  promptTokens: number;
  completionTokens: number;
  cached: boolean;
}

export interface AiProvider {
  name: "anthropic" | "openai" | "mock";
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
}

/**
 * Resolves which provider to use based on environment configuration:
 *   AI_DEFAULT_PROVIDER=anthropic|openai|mock
 * Falls back to the mock provider automatically if the configured
 * provider's API key is missing, so the app never hard-fails just because
 * a key hasn't been added yet — see README "Running without API keys".
 */
export async function getProvider(): Promise<AiProvider> {
  const configured = (process.env.AI_DEFAULT_PROVIDER ?? "mock").toLowerCase();

  if (configured === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import("./anthropic-provider");
    return new AnthropicProvider();
  }
  if (configured === "openai" && process.env.OPENAI_API_KEY) {
    const { OpenAiProvider } = await import("./openai-provider");
    return new OpenAiProvider();
  }

  const { MockProvider } = await import("./mock-provider");
  return new MockProvider();
}
