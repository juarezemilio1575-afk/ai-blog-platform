import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Multi-blog architecture (section 15): each Blog has its own `domain`.
 * In production you'd point multiple custom domains at the same Vercel
 * project; this resolves which Blog to render by matching the request's
 * Host header. Falls back to the first blog in the database so the demo
 * works immediately on localhost before any real domain is attached.
 */
export async function getActiveBlog() {
  const host = headers().get("host")?.split(":")[0];

  if (host) {
    const byDomain = await db.blog.findUnique({ where: { domain: host } });
    if (byDomain) return byDomain;
  }

  return db.blog.findFirst({ orderBy: { createdAt: "asc" } });
}
