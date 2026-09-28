import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseBody, rateLimit } from "@/lib/api-utils";

const bodySchema = z.object({
  productId: z.string(),
  articleId: z.string().optional(),
  sessionId: z.string().optional(),
});

/**
 * Public-facing route hit by every "Check price" / "Buy now" button before
 * redirecting to the real affiliate URL — this is what makes clicks,
 * EPC and conversion-rate tracking possible in the Monetization Dashboard.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`affiliate-click:${ip}`, 60, 60_000)) {
    return apiError("Too many requests", 429);
  }

  const parsed = await parseBody(req, bodySchema);
  if (!parsed.success) return parsed.response;

  const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return apiError("Product not found", 404);

  await db.affiliateClick.create({
    data: {
      productId: parsed.data.productId,
      articleId: parsed.data.articleId,
      sessionId: parsed.data.sessionId,
      referrer: req.headers.get("referer") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  return NextResponse.json({ redirectUrl: product.affiliateUrl });
}
