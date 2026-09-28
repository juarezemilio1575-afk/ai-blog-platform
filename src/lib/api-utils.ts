import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Security fix from the production audit (Phase 5): every route that
 * creates/mutates data on behalf of the business (articles, products,
 * keywords, AI generation, social posts, schedule) must require an
 * authenticated admin session. Public-facing routes (affiliate click
 * tracking, newsletter signup) intentionally do NOT call this.
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

/**
 * Consistent error handling across every API route (section 20: input
 * validation + proper error handling; section 29: "use validation and
 * proper error handling").
 */
export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<
  { success: true; data: T } | { success: false; response: NextResponse }
> {
  try {
    const json = await req.json();
    const data = schema.parse(json);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, response: apiError("Validation failed", 422, err.flatten()) };
    }
    return { success: false, response: apiError("Invalid JSON body", 400) };
  }
}

/**
 * Checks the shared secret against CRON_SECRET (section 21). Vercel Cron
 * automatically sends `Authorization: Bearer $CRON_SECRET` on every
 * invocation once CRON_SECRET is set as an env var on the project — no
 * extra config needed. For manual/local testing, send the same header:
 *   curl -X POST http://localhost:3000/api/automation/discover-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const header = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && header === `Bearer ${process.env.CRON_SECRET}`;
}

/** Minimal in-memory rate limiter for demo purposes (section 20: rate limiting).
 *  Swap for `rate-limiter-flexible` + Redis in production — see README. */
const hits = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
