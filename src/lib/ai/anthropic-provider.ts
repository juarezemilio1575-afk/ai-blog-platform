/**
 * Real Anthropic provider. Requires ANTHROPIC_API_KEY and the
 * @anthropic-ai/sdk package (already listed in package.json) — this file
 * cannot execute in an offline sandbox, only in an environment with
 * internet access and `npm install` run.
 */

import type { AiProvider, AiCompletionRequest, AiCompletionResult } from "./provider";
import { selectModelForTask, estimateCostUsd, getCached, setCached } from "./cost-control";
import crypto from "node:crypto";

export class AnthropicProvider implements AiProvider {
  name = "anthropic" as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${req.taskType}:${req.system ?? ""}:${req.prompt}`)
      .digest("hex");

    const cached = getCached<AiCompletionResult>(cacheKey);
    if (cached) return { ...cached, cached: true };

    // Lazy import so the SDK is only required when this provider is actually used.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const model =
      req.model ??
      selectModelForTask(req.taskType, {
        economy: process.env.AI_ECONOMY_MODEL ?? "claude-haiku-4-5-20251001",
        premium: process.env.AI_PREMIUM_MODEL ?? "claude-sonnet-4-6",
      });

    const response = await client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 2000,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    const result: AiCompletionResult = {
      text,
      provider: "anthropic",
      model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      cached: false,
    };

    setCached(cacheKey, result);
    // Cost is computed by the caller (which has blogId/articleId context) via
    // estimateCostUsd(model, result.promptTokens, result.completionTokens)
    // and persisted to the AiGeneration table.
    void estimateCostUsd; // referenced for callers importing from this module
    return result;
  }
}
