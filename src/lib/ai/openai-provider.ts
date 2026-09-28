/**
 * Real OpenAI provider — alternative backend behind the same AiProvider
 * interface. Requires OPENAI_API_KEY and the `openai` package. Cannot
 * execute in an offline sandbox, only in an environment with internet
 * access and `npm install` run.
 */

import type { AiProvider, AiCompletionRequest, AiCompletionResult } from "./provider";
import { getCached, setCached } from "./cost-control";
import crypto from "node:crypto";

export class OpenAiProvider implements AiProvider {
  name = "openai" as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const cacheKey = crypto
      .createHash("sha256")
      .update(`openai:${req.taskType}:${req.system ?? ""}:${req.prompt}`)
      .digest("hex");

    const cached = getCached<AiCompletionResult>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Simple tasks -> gpt-4o-mini, complex tasks -> gpt-4o. Mirrors the
    // economy/premium split used by the Anthropic provider.
    const simpleTasks: AiCompletionRequest["taskType"][] = ["IMAGE_BRIEF", "SOCIAL_REPURPOSE", "SEO_OPTIMIZATION"];
    const model = req.model ?? (simpleTasks.includes(req.taskType) ? "gpt-4o-mini" : "gpt-4o");

    const response = await client.chat.completions.create({
      model,
      max_tokens: req.maxTokens ?? 2000,
      messages: [
        ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
        { role: "user" as const, content: req.prompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

    const result: AiCompletionResult = {
      text,
      provider: "openai",
      model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      cached: false,
    };

    setCached(cacheKey, result);
    return result;
  }
}
